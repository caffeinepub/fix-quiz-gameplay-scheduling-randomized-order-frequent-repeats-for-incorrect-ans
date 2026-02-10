# Specification

## Summary
**Goal:** Remove the in-app “Software update” / “Update Available” pop-up/banner so it is never shown anywhere in the app, without changing any other UI or behavior.

**Planned changes:**
- Remove all render/use of the `PendingUpdateBanner` across all app entry states (unauthenticated view, actor initialization error view, profile setup view, and main authenticated view).
- Clean up related imports/usages so the frontend builds successfully without unused-import, lint, or type errors.

**User-visible outcome:** No update-related pop-up/banner appears on any screen or app state; everything else works the same as before.
