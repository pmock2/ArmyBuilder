param(
  [Parameter(Mandatory = $true)]
  [string]$ProjectId,

  [string]$Region = "us-central1",
  [string]$GithubRepo = "pmock2/ArmyBuilder",
  [string]$BaseBranch = "staging"
)

$ErrorActionPreference = "Stop"

$gcloud = "$env:LOCALAPPDATA\Google\Cloud SDK\google-cloud-sdk\bin\gcloud.cmd"
if (-not (Test-Path $gcloud)) {
  $gcloud = "gcloud"
}

Write-Host "==> Using project: $ProjectId ($Region)"
& $gcloud config set project $ProjectId

Write-Host "==> Enabling required GCP APIs..."
& $gcloud services enable `
  run.googleapis.com `
  aiplatform.googleapis.com `
  secretmanager.googleapis.com `
  cloudbuild.googleapis.com `
  artifactregistry.googleapis.com

$saName = "armybuilder-ai-worker"
$saEmail = "$saName@$ProjectId.iam.gserviceaccount.com"

Write-Host "==> Creating service account $saEmail (if missing)..."
$existingSa = & $gcloud iam service-accounts list --filter="email=$saEmail" --format="value(email)"
if (-not $existingSa) {
  & $gcloud iam service-accounts create $saName --display-name="ArmyBuilder AI Issue Fixer"
}

Write-Host "==> Granting least-privilege IAM roles..."
foreach ($role in @("roles/aiplatform.user", "roles/secretmanager.secretAccessor", "roles/run.developer")) {
  & $gcloud projects add-iam-policy-binding $ProjectId `
    --member="serviceAccount:$saEmail" `
    --role="$role" `
    --quiet | Out-Null
}

$projNum = & $gcloud projects describe $ProjectId --format="value(projectNumber)"
$cbSa = "$projNum-compute@developer.gserviceaccount.com"
foreach ($role in @("roles/cloudbuild.builds.builder", "roles/storage.objectAdmin", "roles/artifactregistry.writer")) {
  & $gcloud projects add-iam-policy-binding $ProjectId `
    --member="serviceAccount:$cbSa" `
    --role="$role" `
    --quiet | Out-Null
}

$repoName = "armybuilder-automation"
$repoExists = & $gcloud artifacts repositories list --location=$Region --filter="name~/$repoName$" --format="value(name)"
if (-not $repoExists) {
  Write-Host "==> Creating Artifact Registry repository $repoName..."
  & $gcloud artifacts repositories create $repoName --repository-format=docker --location=$Region
}

$imageUri = "$Region-docker.pkg.dev/$ProjectId/$repoName/ai-fixer:latest"
Write-Host "==> Building container image via Cloud Build: $imageUri"
& $gcloud builds submit "$PSScriptRoot" --tag $imageUri

Write-Host "==> Checking required Secret Manager secrets..."
foreach ($secret in @("github-token", "github-webhook-secret")) {
  $secExists = & $gcloud secrets list --filter="name~/$secret$" --format="value(name)"
  if (-not $secExists) {
    $val = Read-Host "Enter value for secret '$secret'" -AsSecureString
    $plain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($val))
    $plain | & $gcloud secrets create $secret --data-file=-
  }
}

Write-Host "==> Deploying Cloud Run Job: armybuilder-ai-fixer"
& $gcloud run jobs deploy armybuilder-ai-fixer `
  --image $imageUri `
  --region $Region `
  --service-account $saEmail `
  --tasks 1 `
  --max-retries 0 `
  --task-timeout 15m `
  --cpu 2 `
  --memory 2Gi `
  --set-env-vars "GOOGLE_CLOUD_PROJECT=$ProjectId,GOOGLE_CLOUD_LOCATION=$Region,GITHUB_REPO=$GithubRepo,BASE_BRANCH=$BaseBranch" `
  --set-secrets "GITHUB_TOKEN=github-token:latest" `
  --command "node" `
  --args "src/worker.js"

Write-Host "==> Deploying Cloud Run Webhook Service: armybuilder-ai-webhook"
& $gcloud run deploy armybuilder-ai-webhook `
  --image $imageUri `
  --region $Region `
  --service-account $saEmail `
  --allow-unauthenticated `
  --cpu 1 `
  --memory 512Mi `
  --set-env-vars "GOOGLE_CLOUD_PROJECT=$ProjectId,GOOGLE_CLOUD_LOCATION=$Region,CLOUD_RUN_JOB_NAME=armybuilder-ai-fixer" `
  --set-secrets "GITHUB_WEBHOOK_SECRET=github-webhook-secret:latest" `
  --command "node" `
  --args "src/webhook.js"

$serviceUrl = & $gcloud run services describe armybuilder-ai-webhook --region $Region --format="value(status.url)"
Write-Host ""
Write-Host "Deployment complete!"
Write-Host "GitHub Webhook Payload URL: $serviceUrl/webhook"
Write-Host "Content type: application/json | Events: Issues (labeled)"
