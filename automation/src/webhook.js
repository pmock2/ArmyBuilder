import http from 'node:http';
import crypto from 'node:crypto';
import { GoogleAuth } from 'google-auth-library';

const PORT = Number(process.env.PORT || 8080);
const PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT;
const REGION = process.env.GOOGLE_CLOUD_LOCATION || 'us-central1';
const JOB_NAME = process.env.CLOUD_RUN_JOB_NAME || 'armybuilder-ai-fixer';
const TRIGGER_LABEL = (process.env.TRIGGER_LABEL || 'ai-fix').trim();
const THREAD_LABEL = (process.env.THREAD_LABEL || 'ai-thread').trim();
const IN_PROGRESS_LABEL = 'ai-fix-in-progress';
const BOT_COMMENT_PREFIX = '🤖';
const TRUSTED_ASSOCIATIONS = new Set(['OWNER', 'MEMBER', 'COLLABORATOR']);
const GITHUB_WEBHOOK_SECRET = (process.env.GITHUB_WEBHOOK_SECRET || '').trim();
const GITHUB_TOKEN = (process.env.GITHUB_TOKEN || '').trim();
const GITHUB_REPO = (process.env.GITHUB_REPO || 'pmock2/ArmyBuilder').trim();
const PROMOTE_SECRET = (process.env.PROMOTE_SECRET || '').trim();

const ALLOWED_ORIGINS = new Set([
  'https://pmock2.github.io',
  'http://localhost:5173',
  'http://127.0.0.1:5173'
]);
const VALID_ISSUE_CATEGORIES = new Set(['bug', 'enhancement', 'question']);
const ISSUE_RATE_WINDOW_MS = 60 * 60 * 1000;
const ISSUE_RATE_LIMIT_PUBLIC = 5;
const ISSUE_RATE_LIMIT_ADMIN = 30;
const issueSubmissionsByIp = new Map();

const auth = new GoogleAuth({
  scopes: ['https://www.googleapis.com/auth/cloud-platform']
});

function setCorsHeaders(req, res) {
  const origin = req.headers.origin;
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Promote-Secret');
}

function sendJson(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

function verifyGithubSignature(rawBody, signatureHeader) {
  if (!GITHUB_WEBHOOK_SECRET) return false;
  if (!signatureHeader || !signatureHeader.startsWith('sha256=')) return false;

  const expected =
    'sha256=' +
    crypto.createHmac('sha256', GITHUB_WEBHOOK_SECRET).update(rawBody).digest('hex');

  const sigBuf = Buffer.from(signatureHeader);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length) return false;
  return crypto.timingSafeEqual(sigBuf, expBuf);
}

function verifyPromoteSecret(provided) {
  if (!PROMOTE_SECRET || typeof provided !== 'string') return false;
  const a = Buffer.from(provided.trim());
  const b = Buffer.from(PROMOTE_SECRET);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

async function ghApi(endpoint, options = {}) {
  if (!GITHUB_TOKEN) throw new Error('GITHUB_TOKEN is not configured on webhook service.');
  const res = await fetch(`https://api.github.com${endpoint}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  return { status: res.status, ok: res.ok, data };
}

async function triggerCloudRunJob(issueNumber, { triggerReason = 'label' } = {}) {
  const client = await auth.getClient();
  const accessTokenResponse = await client.getAccessToken();
  const token = accessTokenResponse?.token;
  if (!token) {
    throw new Error('Failed to acquire GCP access token via ADC.');
  }

  const url = `https://run.googleapis.com/v2/projects/${PROJECT_ID}/locations/${REGION}/jobs/${JOB_NAME}:run`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      overrides: {
        containerOverrides: [
          {
            env: [
              { name: 'ISSUE_NUMBER', value: String(issueNumber) },
              { name: 'TRIGGER_REASON', value: String(triggerReason) }
            ]
          }
        ]
      }
    })
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Cloud Run Job trigger failed (${res.status}): ${errText}`);
  }
  return res.json();
}

async function checkCanPromote() {
  const cmp = await ghApi(`/repos/${GITHUB_REPO}/compare/master...staging`);
  if (!cmp.ok) {
    throw new Error(cmp.data?.message || `GitHub compare failed (${cmp.status})`);
  }

  const { status, ahead_by: aheadBy = 0, behind_by: behindBy = 0, commits = [] } = cmp.data;
  if (aheadBy === 0) {
    return {
      canMerge: false,
      aheadBy,
      behindBy,
      status,
      reason: 'staging has no new commits ahead of master.'
    };
  }

  // Check if any deployment / merge conflicts would block merging staging -> master
  // If behindBy === 0, fast-forward / clean merge is guaranteed
  return {
    canMerge: true,
    aheadBy,
    behindBy,
    status,
    commits: commits.slice(-5).map(c => ({
      sha: c.sha?.slice(0, 7),
      message: (c.commit?.message || '').split('\n')[0]
    }))
  };
}

function getClientIp(req) {
  const forwarded = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  return forwarded || req.socket?.remoteAddress || 'unknown';
}

function checkIssueRateLimit(ip, limit) {
  const now = Date.now();
  const cutoff = now - ISSUE_RATE_WINDOW_MS;
  const recent = (issueSubmissionsByIp.get(ip) || []).filter((ts) => ts > cutoff);
  if (recent.length >= limit) {
    issueSubmissionsByIp.set(ip, recent);
    const oldest = recent[0] || now;
    return { allowed: false, retryAfterSec: Math.max(1, Math.ceil((oldest + ISSUE_RATE_WINDOW_MS - now) / 1000)) };
  }
  recent.push(now);
  issueSubmissionsByIp.set(ip, recent);
  if (issueSubmissionsByIp.size > 500) {
    for (const [key, timestamps] of issueSubmissionsByIp.entries()) {
      const active = timestamps.filter((ts) => ts > cutoff);
      if (active.length === 0) issueSubmissionsByIp.delete(key);
      else issueSubmissionsByIp.set(key, active);
    }
  }
  return { allowed: true };
}

async function readRawBody(req, maxBytes = 64 * 1024) {
  const chunks = [];
  let total = 0;
  for await (const chunk of req) {
    total += chunk.length;
    if (total > maxBytes) {
      const err = new Error('Payload too large');
      err.statusCode = 413;
      throw err;
    }
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

async function handleCreateIssue(req, res) {
  let payload;
  try {
    const rawBody = await readRawBody(req, 32 * 1024);
    payload = JSON.parse(rawBody.toString('utf8'));
  } catch (err) {
    sendJson(res, err?.statusCode || 400, { error: err?.statusCode === 413 ? 'Payload too large.' : 'Invalid JSON payload.' });
    return;
  }

  if (typeof payload?.website === 'string' && payload.website.trim().length > 0) {
    sendJson(res, 400, { error: 'Invalid submission.' });
    return;
  }

  const title = typeof payload?.title === 'string' ? payload.title.trim() : '';
  const body = typeof payload?.body === 'string' ? payload.body.trim() : '';
  const category = typeof payload?.category === 'string' ? payload.category.trim() : 'bug';
  const requestAiFix = Boolean(payload?.requestAiFix);

  if (title.length < 3 || title.length > 200) {
    sendJson(res, 400, { error: 'Issue title must be between 3 and 200 characters.' });
    return;
  }
  if (body.length < 5 || body.length > 12000) {
    sendJson(res, 400, { error: 'Issue description must be between 5 and 12,000 characters.' });
    return;
  }
  if (!VALID_ISSUE_CATEGORIES.has(category)) {
    sendJson(res, 400, { error: 'Invalid issue category.' });
    return;
  }

  const isAdmin = verifyPromoteSecret(req.headers['x-promote-secret']);
  if (requestAiFix && !isAdmin) {
    sendJson(res, 401, { error: 'Invalid or missing admin key for AI Auto-Fix.' });
    return;
  }

  const rate = checkIssueRateLimit(
    getClientIp(req),
    isAdmin ? ISSUE_RATE_LIMIT_ADMIN : ISSUE_RATE_LIMIT_PUBLIC
  );
  if (!rate.allowed) {
    res.setHeader('Retry-After', String(rate.retryAfterSec));
    sendJson(res, 429, { error: 'Too many issue submissions from this address. Please try again later.' });
    return;
  }

  const labels = requestAiFix ? [category, TRIGGER_LABEL] : [category];
  try {
    const issueRes = await ghApi(`/repos/${GITHUB_REPO}/issues`, {
      method: 'POST',
      body: JSON.stringify({ title, body, labels })
    });
    if (!issueRes.ok) {
      sendJson(res, 502, { error: issueRes.data?.message || `GitHub issue creation failed (${issueRes.status})` });
      return;
    }
    sendJson(res, 201, {
      number: issueRes.data.number,
      url: issueRes.data.html_url,
      title: issueRes.data.title,
      labels,
      aiFixTriggered: requestAiFix
    });
  } catch (err) {
    console.error('Create issue error:', err);
    sendJson(res, 500, { error: err.message });
  }
}

const server = http.createServer(async (req, res) => {
  setCorsHeaders(req, res);

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method === 'GET' && req.url === '/healthz') {
    sendJson(res, 200, { ok: true });
    return;
  }

  if (req.method === 'POST' && (req.url === '/promote/check' || req.url === '/promote/merge')) {
    const providedSecret = req.headers['x-promote-secret'];
    if (!verifyPromoteSecret(providedSecret)) {
      sendJson(res, 401, { error: 'Invalid promote secret.' });
      return;
    }

    try {
      const check = await checkCanPromote();
      if (req.url === '/promote/check') {
        sendJson(res, 200, check);
        return;
      }

      if (!check.canMerge) {
        sendJson(res, 200, { merged: false, ...check });
        return;
      }

      const mergeRes = await ghApi(`/repos/${GITHUB_REPO}/merges`, {
        method: 'POST',
        body: JSON.stringify({
          base: 'master',
          head: 'staging',
          commit_message: `Promote staging to master (${check.aheadBy} commit${check.aheadBy === 1 ? '' : 's'})`
        })
      });

      if (mergeRes.status === 201) {
        sendJson(res, 200, {
          merged: true,
          sha: mergeRes.data?.sha?.slice(0, 7),
          aheadBy: check.aheadBy,
          message: 'Merged staging into master. Production deployment has been triggered.'
        });
        return;
      }

      if (mergeRes.status === 204) {
        sendJson(res, 200, {
          merged: false,
          reason: 'master already contains all commits from staging.'
        });
        return;
      }

      if (mergeRes.status === 409) {
        sendJson(res, 409, {
          merged: false,
          error: 'Merge conflict between staging and master. Resolve conflicts on a PR before promoting.'
        });
        return;
      }

      sendJson(res, 502, {
        merged: false,
        error: mergeRes.data?.message || `GitHub merge failed (${mergeRes.status})`
      });
    } catch (err) {
      console.error('Promote error:', err);
      sendJson(res, 500, { error: err.message });
    }
    return;
  }

  if (req.method === 'POST' && req.url === '/issues') {
    await handleCreateIssue(req, res);
    return;
  }

  if (req.method !== 'POST' || req.url !== '/webhook') {
    res.writeHead(404);
    res.end('Not found');
    return;
  }

  let rawBody;
  try {
    rawBody = await readRawBody(req, 512 * 1024);
  } catch (err) {
    sendJson(res, err?.statusCode || 400, { error: err.message });
    return;
  }

  const sig = req.headers['x-hub-signature-256'];
  if (!verifyGithubSignature(rawBody, sig)) {
    sendJson(res, 401, { error: 'Invalid webhook signature' });
    return;
  }

  const event = req.headers['x-github-event'];
  let payload;
  try {
    payload = JSON.parse(rawBody.toString('utf8'));
  } catch {
    res.writeHead(400);
    res.end('Invalid JSON');
    return;
  }

  if (event === 'ping') {
    sendJson(res, 200, { pong: true });
    return;
  }

  if (
    event === 'issues' &&
    payload?.action === 'labeled' &&
    payload?.label?.name === TRIGGER_LABEL &&
    payload?.issue?.number
  ) {
    const issueNumber = payload.issue.number;
    try {
      const execution = await triggerCloudRunJob(issueNumber, { triggerReason: 'label' });
      sendJson(res, 202, { triggered: true, issueNumber, execution: execution.name });
    } catch (err) {
      console.error('Failed to trigger job:', err);
      sendJson(res, 500, { error: err.message });
    }
    return;
  }

  if (
    event === 'issue_comment' &&
    payload?.action === 'created' &&
    payload?.issue?.number &&
    !payload?.issue?.pull_request &&
    payload?.issue?.state === 'open'
  ) {
    const commentBody = (payload?.comment?.body || '').trim();
    const authorAssoc = payload?.comment?.author_association || '';
    const issueLabels = (payload?.issue?.labels || []).map((l) => l.name);

    if (!commentBody || commentBody.startsWith(BOT_COMMENT_PREFIX)) {
      sendJson(res, 200, { ignored: true, reason: 'bot or empty comment' });
      return;
    }
    if (!TRUSTED_ASSOCIATIONS.has(authorAssoc)) {
      sendJson(res, 200, { ignored: true, reason: 'untrusted author_association', authorAssoc });
      return;
    }
    if (issueLabels.includes(IN_PROGRESS_LABEL)) {
      sendJson(res, 200, { ignored: true, reason: 'issue already in progress' });
      return;
    }

    const explicitlyMentioned = /(^|\s)(@ai|\/ai)\b/i.test(commentBody);
    const inAiThread = issueLabels.includes(THREAD_LABEL) || issueLabels.includes(TRIGGER_LABEL);
    if (!inAiThread && !explicitlyMentioned) {
      sendJson(res, 200, { ignored: true, reason: 'issue not in ai-thread and no @ai mention' });
      return;
    }

    const issueNumber = payload.issue.number;
    try {
      const execution = await triggerCloudRunJob(issueNumber, { triggerReason: 'comment' });
      sendJson(res, 202, { triggered: true, reason: 'comment', issueNumber, execution: execution.name });
    } catch (err) {
      console.error('Failed to trigger job from comment:', err);
      sendJson(res, 500, { error: err.message });
    }
    return;
  }

  sendJson(res, 200, { ignored: true, event, action: payload?.action });
});

server.listen(PORT, () => {
  console.log(`Webhook listener running on port ${PORT}`);
});
