import http from 'node:http';
import crypto from 'node:crypto';
import { GoogleAuth } from 'google-auth-library';

const PORT = Number(process.env.PORT || 8080);
const PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT;
const REGION = process.env.GOOGLE_CLOUD_LOCATION || 'us-central1';
const JOB_NAME = process.env.CLOUD_RUN_JOB_NAME || 'armybuilder-ai-fixer';
const TRIGGER_LABEL = (process.env.TRIGGER_LABEL || 'ai-fix').trim();
const GITHUB_WEBHOOK_SECRET = (process.env.GITHUB_WEBHOOK_SECRET || '').trim();

const auth = new GoogleAuth({
  scopes: ['https://www.googleapis.com/auth/cloud-platform']
});

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

const server = http.createServer(async (req, res) => {
  if (req.method === 'GET' && req.url === '/healthz') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true }));
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
    res.writeHead(401, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Invalid webhook signature' }));
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
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ pong: true }));
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
      res.writeHead(202, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ triggered: true, issueNumber, execution: execution.name }));
    } catch (err) {
      console.error('Failed to trigger job:', err);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ ignored: true, event, action: payload?.action }));
});

server.listen(PORT, () => {
  console.log(`Webhook listener running on port ${PORT}`);
});
