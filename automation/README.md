# ArmyBuilder GitHub Issue Auto-Fixer (GCP Cloud Run + Vertex AI)

ToS-compliant, scale-to-zero GCP pipeline that picks up GitHub issues labeled `ai-fix`, implements fixes via **Vertex AI Gemini** using a dedicated **GCP Service Account**, verifies `npm run build --prefix client`, and opens a **Draft PR targeting `staging`**.

## Architecture
- **Webhook Receiver (`src/webhook.js`)** — Cloud Run Service verifying GitHub's `X-Hub-Signature-256` HMAC and triggering the Cloud Run Job when an issue receives the `ai-fix` label.
- **Worker Job (`src/worker.js`)** — Ephemeral Cloud Run Job that clones `staging`, runs the Vertex AI Gemini tool-calling loop, verifies the production build, pushes `fix/issue-<N>`, and opens a Draft PR targeting `staging`.
- **Pro Tier (Optional)** — Add both `ai-fix` and `ai-fix-pro` labels to use `gemini-2.5-pro` instead of `gemini-2.5-flash`.

## Prerequisites
1. A GCP project with billing enabled.
2. A fine-grained GitHub Personal Access Token (or GitHub App token) scoped to `pmock2/ArmyBuilder` with **Contents (Read & Write)**, **Issues (Read & Write)**, and **Pull requests (Read & Write)**.
3. A random webhook secret string (e.g. `openssl rand -hex 32`).

## Deploy
```powershell
.\deploy.ps1 -ProjectId "<your-gcp-project-id>"
```

## Configure GitHub Webhook
1. In `pmock2/ArmyBuilder` → **Settings → Webhooks → Add webhook**:
   - **Payload URL**: `<cloud-run-url>/webhook`
   - **Content type**: `application/json`
   - **Secret**: your `github-webhook-secret` value
   - **Events**: Select **Issues**
2. Label any issue `ai-fix` (or check **Request AI Auto-Fix** in the app's Feedback modal).
3. Review the generated Draft PR and merge into `staging` to test at `https://pmock2.github.io/ArmyBuilder/staging/`.
