# Specification

## Summary
**Goal:** Publish the current draft to the live (production) deployment and confirm the production runtime is using a real backend canister ID (not a placeholder).

**Planned changes:**
- Publish the current draft build to production via the Caffeine editor publish flow.
- Verify the live deployment’s `/env.json` contains a non-placeholder `CANISTER_ID_BACKEND` injected during publish (no manual edits to `frontend/public/env.json`).
- Run the in-app Deployment Diagnostics / Deployment Checklist in the live deployment to confirm backend connectivity and readiness (canister ID resolution + successful health check).

**User-visible outcome:** The app is live in production with backend connectivity working, and diagnostics confirm `CANISTER_ID_BACKEND` is correctly resolved and health checks pass.
