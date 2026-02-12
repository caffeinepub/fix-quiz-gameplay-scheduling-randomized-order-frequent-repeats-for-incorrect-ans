import type { BuildInfo } from './buildStamp';
import { getActorConnectionInfoAsync } from './actorConnectionInfo';

const PLACEHOLDER_CANISTER_ID = 'PLACEHOLDER_BACKEND_CANISTER_ID';

/**
 * Formats a comprehensive plain-text publish checklist in English including current build metadata,
 * resolved backend canister ID with full resolution details,
 * explicit statement that the app cannot self-publish,
 * runtime env.json guidance requiring non-placeholder CANISTER_ID_BACKEND,
 * and detailed step-by-step instructions for publishing to a live canister via the Caffeine editor
 * with concrete post-publish in-app verification steps.
 */
export async function formatPublishChecklist(buildInfo: BuildInfo): Promise<string> {
  const connectionInfo = await getActorConnectionInfoAsync();
  
  const lines: string[] = [];
  
  lines.push('═══════════════════════════════════════════════════════════');
  lines.push('                   PUBLISH CHECKLIST                       ');
  lines.push('═══════════════════════════════════════════════════════════');
  lines.push('');
  
  lines.push('📦 CURRENT BUILD INFORMATION');
  lines.push('─────────────────────────────────────────────────────────');
  lines.push(`Version:        ${buildInfo.version}`);
  lines.push(`Timestamp:      ${buildInfo.timestamp}`);
  lines.push(`Deployment ID:  ${buildInfo.deploymentId}`);
  lines.push(`Environment:    ${buildInfo.environment}`);
  lines.push(`Build ID:       ${buildInfo.buildId}`);
  lines.push('');
  
  lines.push('🔌 BACKEND CANISTER CONFIGURATION');
  lines.push('─────────────────────────────────────────────────────────');
  lines.push(`Current Canister ID: ${connectionInfo.canisterId || '(not resolved)'}`);
  lines.push(`Resolution Source:   ${connectionInfo.canisterIdSource}`);
  lines.push(`Sources Attempted:   ${connectionInfo.canisterIdSourcesAttempted.join(', ')}`);
  if (connectionInfo.canisterIdResolutionError) {
    lines.push(`Resolution Error:    ${connectionInfo.canisterIdResolutionError}`);
  }
  lines.push('');
  
  lines.push('⚠️  IMPORTANT: This app cannot self-publish');
  lines.push('─────────────────────────────────────────────────────────');
  lines.push('Publishing MUST be done through the Caffeine editor.');
  lines.push('The app provides diagnostics to verify deployment, but');
  lines.push('the actual publish action happens in the editor.');
  lines.push('');
  
  lines.push('📋 STEP-BY-STEP PUBLISH INSTRUCTIONS');
  lines.push('─────────────────────────────────────────────────────────');
  lines.push('');
  
  lines.push('1️⃣  PREPARE FOR PUBLISH');
  lines.push('   • Ensure all changes are saved and tested in draft mode');
  lines.push('   • Verify the backend canister is running and accessible');
  lines.push('   • Note your backend canister ID (required for verification)');
  lines.push('   • Test core functionality before publishing');
  lines.push('');
  
  lines.push('2️⃣  RETURN TO CAFFEINE EDITOR');
  lines.push('   • Navigate back to the Caffeine editor interface');
  lines.push('   • Locate the "Publish to Live" or similar deployment button');
  lines.push('   • Ensure you are ready to deploy the current version');
  lines.push('');
  
  lines.push('3️⃣  INITIATE PUBLISH VIA EDITOR');
  lines.push('   • Click the publish button in the Caffeine editor');
  lines.push('   • Follow any prompts or confirmations');
  lines.push('   • Wait for the deployment to complete');
  lines.push('   • The editor will automatically configure /env.json with your backend canister ID');
  lines.push('   • Note the live frontend canister ID provided by the editor');
  lines.push('');
  
  lines.push('4️⃣  VERIFY LIVE DEPLOYMENT (IN-APP CHECKS)');
  lines.push('   • Open the live URL in a new browser tab (incognito mode recommended)');
  lines.push('   • Log in with Internet Identity');
  lines.push('   • Click "Deployment Checklist" button to open diagnostics panel');
  lines.push('   • Verify the following in the diagnostics panel:');
  lines.push('');
  lines.push('   ✓ Build Identity section shows:');
  lines.push('     - Version matches your latest changes');
  lines.push('     - Timestamp reflects the publish time');
  lines.push('     - Deployment ID is present');
  lines.push('     - Build ID matches the new deployment');
  lines.push('');
  lines.push('   ✓ Backend Canister Resolution section shows:');
  lines.push('     - Backend Canister ID displays your actual canister');
  lines.push('     - NOT "(not resolved)" or placeholder value');
  lines.push('     - Resolution Source shows "window.__ENV__.CANISTER_ID_BACKEND"');
  lines.push('');
  lines.push('   ✓ Runtime env.json Status section shows:');
  lines.push('     - Status: "Configured"');
  lines.push('     - Message confirms correctly configured');
  lines.push('');
  lines.push('   ✓ Backend Health Check section:');
  lines.push('     - Click "Run Health Check" button');
  lines.push('     - Status shows "Passed"');
  lines.push('     - Backend Version and System Time are displayed');
  lines.push('');
  lines.push('   ✓ Overall Readiness Status section shows:');
  lines.push('     - Status: "Ready for Live"');
  lines.push('');
  
  lines.push('5️⃣  TEST CORE FUNCTIONALITY');
  lines.push('   • Test quiz gameplay (select questions, answer, view results)');
  lines.push('   • Verify admin features work (if applicable)');
  lines.push('   • Check that all interactive elements respond correctly');
  lines.push('   • Ensure no console errors in browser developer tools');
  lines.push('');
  
  lines.push('🔧 TROUBLESHOOTING');
  lines.push('─────────────────────────────────────────────────────────');
  lines.push('If the live deployment fails to connect to the backend:');
  lines.push('');
  lines.push(`• Verify /env.json contains your actual backend canister ID (not "${PLACEHOLDER_CANISTER_ID}")`);
  lines.push('• Ensure the Caffeine editor publish process completed successfully');
  lines.push('• Check that the backend canister is deployed and running');
  lines.push('• Ensure the backend canister ID matches your actual backend');
  lines.push('• Clear browser cache and hard reload (Ctrl+Shift+R or Cmd+Shift+R)');
  lines.push('• Check browser console for detailed error messages');
  lines.push('• Use the "Copy Verification Info" button to share diagnostics');
  lines.push('• Review the PUBLISHING.md file for detailed troubleshooting steps');
  lines.push('');
  
  lines.push('📊 POST-PUBLISH VERIFICATION CHECKLIST');
  lines.push('─────────────────────────────────────────────────────────');
  lines.push('After publishing, confirm in the diagnostics panel:');
  lines.push('');
  lines.push('✓ Build Identity: Version, Timestamp, Deployment ID, Build ID are current');
  lines.push('✓ Backend Canister ID: Resolved (not placeholder or "(not resolved)")');
  lines.push('✓ Runtime env.json Status: Shows "Configured"');
  lines.push('✓ Backend Health Check: Shows "Passed"');
  lines.push('✓ Overall Readiness: Shows "Ready for Live"');
  lines.push('✓ Quiz questions load correctly');
  lines.push('✓ Quiz gameplay functions properly');
  lines.push('✓ Score tracking works');
  lines.push('✓ Admin features accessible (if applicable)');
  lines.push('✓ No console errors in browser developer tools');
  lines.push('');
  
  lines.push('═══════════════════════════════════════════════════════════');
  lines.push('                    END OF CHECKLIST                       ');
  lines.push('═══════════════════════════════════════════════════════════');
  lines.push('');
  lines.push('💡 TIP: Use the "Copy Verification Info" button in the');
  lines.push('   diagnostics panel to generate a detailed status report');
  lines.push('   that you can share for troubleshooting.');
  lines.push('');
  lines.push('📖 For detailed instructions, see PUBLISHING.md');
  
  return lines.join('\n');
}
