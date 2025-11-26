# Deployment Guide (Render Free Tier)

The API deploys to Render via the `render.yaml` blueprint and the Dockerfile at the repository root.
Render automatically builds and runs the container whenever you push to `main` or click **Manual
Deploy** in the Render dashboard.

## Prerequisites

- Render account with GitHub access enabled.
- This repository connected to Render (click **Add New > Blueprint** and point Render to the GitHub
  repo URL).
- Optional: custom domain managed through Render.

## Provision the Web Service

1. After importing the repo as a Blueprint, Render detects `render.yaml` and shows the `compound-interest-api`
   service definition.
2. Choose the **Free** plan and your preferred region (the file defaults to `oregon`, you can change this
   in the dashboard before creating the service).
3. Confirm the Dockerfile path (`./Dockerfile`) and health check (`/health/ready`).
4. Create the resources. Render builds the container, runs `dotnet publish`, and boots the API bound to the
   platform-provided `$PORT`.

## Environment Configuration

Environment variables live in the Render dashboard under **Environment**. The blueprint sets
`ASPNETCORE_ENVIRONMENT=Production`. Add any custom settings there (for example, feature flags or
logging tweaks). Changing an environment variable triggers a rolling deploy.

## Deployments

- Pushing to `main` automatically kicks off a new deploy because the Render service is linked to GitHub.
- Manual redeploys are available from the Render dashboard (**Deploys > Manual Deploy**).
- Watch build logs in Render to verify restore/build/test/publish succeeded inside the container.

## CI/CD Workflow

- `.github/workflows/ci_build.yml` runs for every push/PR, restoring dependencies, building in Release,
  running the tests, and checking formatting.
- When the workflow runs on `main`, the `deploy` job calls the Render Deploy Hook stored in the
  `RENDER_DEPLOY_HOOK` repository secret. Configure the hook URL from the Render dashboard
  (**Deploy Hooks > Manual Deploy Hook**) and paste it into the secret so production deployments stay automated.

## Post-Deployment Checks

- `GET https://<your-service>.onrender.com/health/ready` returns `Healthy` plus version metadata.
- `POST https://<your-service>.onrender.com/api/v1/calculations` exercises the API end-to-end.
- Render streams container logs; use them to confirm correlation IDs appear for the requests above.
