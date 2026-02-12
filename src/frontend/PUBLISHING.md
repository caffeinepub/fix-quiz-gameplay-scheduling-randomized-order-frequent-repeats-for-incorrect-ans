# Publishing Checklist

This document provides a step-by-step guide for publishing the Quiz Master app to a live Internet Computer canister via the Caffeine editor.

## ⚠️ Critical: Publishing Must Be Done Via Caffeine Editor

**This app cannot self-publish.** Publishing must be performed through the **Caffeine editor**, which automatically:
- Deploys your frontend to a live canister
- Injects the correct backend canister ID into `/env.json`
- Configures the runtime environment for production

**Do NOT manually edit `frontend/public/env.json`** - the Caffeine editor manages this file during publish.

## Prerequisites

- Backend canister deployed and running on the Internet Computer
- Backend canister ID available (you'll need this for verification)
- Access to the Caffeine editor for publishing
- All draft changes saved in the editor

## Publishing Steps

### 1. Prepare for Publish

Before publishing, ensure:
- ✓ All changes are saved in the Caffeine editor
- ✓ Backend canister is running and accessible
- ✓ You have noted your backend canister ID for verification
- ✓ Core functionality tested in draft mode (login, quiz gameplay, admin features)
- ✓ No unsaved draft changes remain

### 2. Publish Via Caffeine Editor

1. Navigate to the Caffeine editor interface
2. Locate the **"Publish to Live"** button (or similar deployment action)
3. Click the publish button
4. Wait for the deployment to complete
5. The editor will automatically:
   - Deploy your frontend to a live canister
   - Create/update `/env.json` with your backend canister ID
   - Provide you with the live frontend URL
6. Copy the live frontend URL provided by the editor

### 3. Open Live Deployment

1. Open the live URL in a **new browser tab** (incognito mode recommended for clean verification)
2. Log in with Internet Identity
3. Once logged in, you'll have access to the in-app diagnostics panel

### 4. Verify Deployment Using In-App Diagnostics

After logging in to the live deployment, open the **Deployment Diagnostics** panel to verify the configuration:

#### How to Access Diagnostics Panel

- Look for a "Deployment Checklist" or "Diagnostics" button in the app interface
- Click to open the comprehensive diagnostics panel

#### Verification Checklist

Complete the following verification steps in order:

##### ✓ Build Identity Section

Confirm:
- **Build ID** matches the new deployment (stable identifier)
- **Version** reflects your latest changes
- **Timestamp** shows the publish time
- **Deployment ID** is present
- **Environment** shows the correct deployment environment

##### ✓ Runtime Environment (/env.json) Section

**Critical verification:**
1. Check the displayed status:
   - **Load Status** shows "Loaded" (green checkmark)
   - **Canister ID** displays your actual backend canister ID (NOT "PLACEHOLDER_BACKEND_CANISTER_ID")
   - **Is Placeholder** shows "No"
   - **Message** confirms successful configuration
   - **No troubleshooting steps** are displayed

2. Click the **"Verify /env.json"** button to perform a cache-busting fetch:
   - This fetches `/env.json` directly from the server with no-store cache policy
   - Confirm the verification message shows: `✓ /env.json contains valid backend canister ID: [your-canister-id]`
   - **If you see a placeholder warning**, the publish process did not inject the real canister ID - republish via Caffeine editor

##### ✓ Backend Connection Section

Confirm:
- **Resolved ID** displays your actual backend canister ID (NOT "(not resolved)" or "PLACEHOLDER_BACKEND_CANISTER_ID")
- **Source** shows **"window.__ENV__.CANISTER_ID_BACKEND"** (this confirms runtime config is being used)
- **Network** shows the correct network (mainnet or local)
- **Host** shows the correct IC host
- **No resolution errors** displayed

##### ✓ Backend Health Check

1. Click the **"Run Health Check"** button in the Backend Connection section
2. Confirm:
   - Status shows **"Backend is responding"** (green background)
   - **Backend Version** is displayed
   - **System Time** is displayed
3. If health check fails, verify:
   - Backend canister is running
   - Canister ID is correct
   - Network connectivity is working

##### ✓ Overall Readiness Status

At the top of the diagnostics panel, confirm:
- Overall status shows **"Ready - Backend is reachable and responding"**
- Summary indicates all checks passed
- No critical warnings or errors displayed
- Health check results are shown (backend version and system time)

### 5. Test Core Functionality

After verifying diagnostics, test the app functionality:
- ✓ Quiz gameplay (select questions, answer, view results)
- ✓ Admin features work (if applicable)
- ✓ All interactive elements respond correctly
- ✓ No console errors in browser developer tools
- ✓ Images and assets load correctly
- ✓ Navigation works as expected

## Troubleshooting

### Issue: Placeholder Canister ID Detected

**Symptoms:**
- Runtime Environment section shows "Is Placeholder: ⚠️ Yes - Publish required"
- "Verify /env.json" button shows: `⚠️ /env.json contains placeholder value "PLACEHOLDER_BACKEND_CANISTER_ID"`
- Backend Connection section shows "(not resolved)" or "PLACEHOLDER_BACKEND_CANISTER_ID"

**Solution:**
1. The `/env.json` file was not properly configured during publish
2. **Republish via the Caffeine editor** - this is the only correct solution
3. The editor will automatically inject the real backend canister ID
4. After republishing, verify again using the diagnostics panel

**Do NOT:**
- Manually edit `frontend/public/env.json` - this file is managed by the Caffeine editor
- Use manual override features for production deployments

### Issue: /env.json Not Found

**Symptoms:**
- Runtime Environment section shows "Load Status: missing"
- Error message: "/env.json file not found or not accessible"

**Solution:**
1. The app was not published via the Caffeine editor
2. **Publish via the Caffeine editor** to create the `/env.json` file
3. The editor will automatically create and configure this file during publish

### Issue: Health Check Fails

**Symptoms:**
- Health check shows error message
- Backend Connection section shows "Health check failed"

**Possible causes and solutions:**
1. **Backend canister is stopped:**
   - Check canister status in dfx or IC dashboard
   - Restart the backend canister if needed

2. **Wrong canister ID:**
   - Verify the canister ID in diagnostics matches your backend canister
   - If incorrect, republish via Caffeine editor

3. **Network connectivity:**
   - Check browser console for network errors
   - Verify you can access the IC network
   - Try from a different network/device

4. **Backend not deployed:**
   - Ensure backend canister is deployed to the correct network
   - Verify backend canister is accessible from the frontend's network

### Issue: Wrong Source for Canister ID

**Symptoms:**
- Backend Connection section shows source other than "window.__ENV__.CANISTER_ID_BACKEND"
- Warning message about canister ID not from runtime env.json

**Solution:**
1. This indicates the app is using a fallback or manual override
2. For production deployments, the canister ID should come from `/env.json`
3. **Republish via the Caffeine editor** to ensure proper configuration
4. Clear any manual overrides (localStorage, URL parameters)

## Post-Publish Verification Summary

Use this quick checklist after each publish:

1. ✓ Open live URL in new browser tab (incognito recommended)
2. ✓ Log in with Internet Identity
3. ✓ Open Deployment Diagnostics panel
4. ✓ Verify Build Identity (Build ID, Version, Timestamp)
5. ✓ Verify Runtime Environment (Load Status: loaded, Canister ID: real value, Is Placeholder: No)
6. ✓ Click "Verify /env.json" button and confirm valid canister ID message
7. ✓ Verify Backend Connection (Resolved ID: real value, Source: window.__ENV__.CANISTER_ID_BACKEND)
8. ✓ Run Health Check and confirm success (Backend Version and System Time displayed)
9. ✓ Verify Overall Readiness shows "Ready"
10. ✓ Test core app functionality

## Required /env.json Format

The Caffeine editor automatically creates this file during publish. For reference, the correct format is:

