import type { BuildInfo } from './buildStamp';
import { getActorConnectionInfoAsync } from './actorConnectionInfo';

/**
 * Formats a comprehensive plain-text publish checklist in English including current build metadata,
 * resolved backend canister ID with full resolution details or '(not resolved)',
 * explicit statement that the app cannot self-publish,
 * runtime env.json guidance requiring non-empty CANISTER_ID_BACKEND,
 * and detailed step-by-step instructions for publishing to a live canister via the Caffeine editor
 * with post-publish verification steps.
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
  lines.push('Publishing must be done through the Caffeine editor.');
  lines.push('');
  
  lines.push('📋 STEP-BY-STEP PUBLISH INSTRUCTIONS');
  lines.push('─────────────────────────────────────────────────────────');
  lines.push('');
  
  lines.push('1️⃣  PREPARE FOR PUBLISH');
  lines.push('   • Ensure all changes are saved and tested in draft mode');
  lines.push('   • Verify the backend canister is running and accessible');
  lines.push('   • Note your backend canister ID (required for step 4)');
  lines.push('');
  
  lines.push('2️⃣  RETURN TO CAFFEINE EDITOR');
  lines.push('   • Navigate back to the Caffeine editor interface');
  lines.push('   • Locate the "Publish to Live" or similar deployment button');
  lines.push('');
  
  lines.push('3️⃣  INITIATE PUBLISH VIA EDITOR');
  lines.push('   • Click the publish button in the Caffeine editor');
  lines.push('   • Follow any prompts or confirmations');
  lines.push('   • Wait for the deployment to complete');
  lines.push('   • Note the live canister ID provided by the editor');
  lines.push('');
  
  lines.push('4️⃣  CONFIGURE RUNTIME ENVIRONMENT (CRITICAL)');
  lines.push('   • After publishing, update /env.json in your live deployment');
  lines.push('   • The file MUST contain a non-empty CANISTER_ID_BACKEND value');
  lines.push('   • Example /env.json content:');
  lines.push('');
  lines.push('     {');
  lines.push('       "CANISTER_ID_BACKEND": "your-backend-canister-id-here"');
  lines.push('     }');
  lines.push('');
  lines.push('   ⚠️  Replace "your-backend-canister-id-here" with your actual');
  lines.push('      backend canister ID (not the frontend canister ID)');
  lines.push('');
  lines.push('   ⚠️  Empty string or placeholder values will cause connection failures');
  lines.push('');
  
  lines.push('5️⃣  VERIFY LIVE DEPLOYMENT');
  lines.push('   • Open the live URL in a new browser tab');
  lines.push('   • Check that the app loads without configuration errors');
  lines.push('   • Open browser DevTools → Network tab');
  lines.push('   • Verify /env.json is accessible and contains correct canister ID');
  lines.push('   • Test backend connectivity (e.g., run health check)');
  lines.push('   • Verify authentication works (if applicable)');
  lines.push('   • Test core functionality to ensure everything works');
  lines.push('');
  
  lines.push('6️⃣  POST-PUBLISH CHECKLIST');
  lines.push('   ✓ Live URL loads successfully');
  lines.push('   ✓ /env.json contains non-empty CANISTER_ID_BACKEND');
  lines.push('   ✓ Backend health check passes');
  lines.push('   ✓ Authentication works (if enabled)');
  lines.push('   ✓ Core features are functional');
  lines.push('   ✓ No console errors related to configuration');
  lines.push('');
  
  lines.push('🔧 TROUBLESHOOTING');
  lines.push('─────────────────────────────────────────────────────────');
  lines.push('If the live deployment fails to connect to the backend:');
  lines.push('');
  lines.push('• Check /env.json is accessible (browser network tab)');
  lines.push('• Verify CANISTER_ID_BACKEND is not empty or placeholder');
  lines.push('• Ensure backend canister ID is correct (not frontend ID)');
  lines.push('• Confirm backend canister is running (not stopped)');
  lines.push('• Check browser console for specific error messages');
  lines.push('• Use Deployment Diagnostics panel for detailed info');
  lines.push('');
  
  lines.push('═══════════════════════════════════════════════════════════');
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push('═══════════════════════════════════════════════════════════');
  
  return lines.join('\n');
}
