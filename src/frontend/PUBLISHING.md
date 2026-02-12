# Publishing Checklist

This document provides a step-by-step guide for publishing the Quiz Master app to a live Internet Computer canister via the Caffeine editor.

## ⚠️ Important: This App Cannot Self-Publish

Publishing must be done through the **Caffeine editor**. The app includes diagnostics and verification tools to help you confirm a successful deployment, but the actual publish action happens in the editor.

## Prerequisites

- Backend canister deployed and running on the Internet Computer
- Backend canister ID available (you'll need this for step 4)
- Access to the Caffeine editor for publishing

## Publishing Steps

### 1. Prepare for Publish

- Ensure all changes are saved and tested in draft mode
- Verify the backend canister is running and accessible
- Note your backend canister ID (required for step 4)
- Test core functionality in draft mode (login, quiz gameplay, admin features)

### 2. Return to Caffeine Editor

- Navigate back to the Caffeine editor interface
- Locate the "Publish to Live" or similar deployment button
- Ensure you're ready to deploy the current version

### 3. Initiate Publish via Editor

- Click the publish button in the Caffeine editor
- Follow any prompts or confirmations
- Wait for the deployment to complete
- Note the live frontend canister ID provided by the editor

### 4. Configure Runtime Environment (CRITICAL)

After publishing, the runtime configuration file `/env.json` **must** be updated with your backend canister ID.

**Required Configuration:**

The file `frontend/public/env.json` must contain a valid, non-placeholder `CANISTER_ID_BACKEND` value.

**Before (placeholder - will NOT work):**

