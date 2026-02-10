# Specification

## Summary
**Goal:** Make the current build live-publish ready by ensuring build/version diagnostics are accurate and runtime backend canister configuration via `/env.json` is clearly validated and reflected in the UI.

**Planned changes:**
- Update build/version metadata display and build info generation so the shown version always comes from build metadata (e.g., `VITE_APP_VERSION`) and is never hardcoded to a specific historic value (like `56`), using a clearly dynamic fallback (e.g., `dev`) when missing.
- Align Deployment Diagnostics and any other build info surfaces (e.g., footer/build info) to show consistent version values after rebuild.
- Validate and document runtime backend canister configuration loaded from `/env.json`, and make “Live Readiness” unambiguous when `/env.json` is missing or when `CANISTER_ID_BACKEND` is empty.
- Update Deployment Diagnostics “Publish to Live Canister” instructions and “Copy Publish Checklist” output to require a non-empty `CANISTER_ID_BACKEND`, showing the resolved ID when available and “(not resolved)” when not.

**User-visible outcome:** The app’s Diagnostics panel (and any build info UI) shows the correct build/version for the current build, and the live readiness state clearly indicates whether the backend canister ID is properly resolved from `/env.json`, with accurate publishing instructions and checklist output.
