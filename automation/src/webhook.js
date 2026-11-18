import http from 'node:http';
import crypto from 'node:crypto';
import { GoogleAuth } from 'google-auth-library';

const PORT = Number(process.env.PORT || 8080);
const PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT;
const REGION = process.env.GOOGLE_CLOUD_LOCATION || 'us-central1';
const JOB_NAME = process.env.CLOUD_RUN_JOB_NAME || 'armybuilder-ai-fixer';
const TRIGGER_LABEL = (process.env.TRIGGER_LABEL || 'ai-fix').trim();
const GITHUB_WEBHOOK_SECRET = (process.env.GITHUB_WEBHOOK_SECRET || '').trim();
const GITHUB_TOKEN = (process.env.GITHUB_TOKEN || '').trim();
const GITHUB_REPO = (process.env.GITHUB_REPO || 'pmock2/ArmyBuilder').trim();
const PROMOTE_SECRET = (process.env.PROMOTE_SECRET || '').trim();

const ALLOWED_ORIGINS = new Set([
  'https://pmock2.github.io',
  'http://localhost:5173',
  'http://127.0.0.1:5173'
]);

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

async function triggerCloudRunJob(issueNumber) {
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
            env: [{ name: 'ISSUE_NUMBER', value: String(issueNumber) }]
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

  if (req.method !== 'POST' || req.url !== '/webhook') {
    res.writeHead(404);
    res.end('Not found');
    return;
  }

  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const rawBody = Buffer.concat(chunks);

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
      const execution = await triggerCloudRunJob(issueNumber);
      sendJson(res, 202, { triggered: true, issueNumber, execution: execution.name });
    } catch (err) {
      console.error('Failed to trigger job:', err);
      sendJson(res, 500, { error: err.message });
    }
    return;
  }

  sendJson(res, 200, { ignored: true, event, action: payload?.action });
});

server.listen(PORT, () => {
  console.log(`Webhook listener running on port ${PORT}`);
});
