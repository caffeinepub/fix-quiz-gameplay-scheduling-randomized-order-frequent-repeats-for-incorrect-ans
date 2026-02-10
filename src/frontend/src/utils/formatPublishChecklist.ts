import { getActorConnectionInfoAsync } from './actorConnectionInfo';
import type { BuildInfo } from './buildStamp';

export async function formatPublishChecklist(buildInfo: BuildInfo): Promise<string> {
  const connectionInfo = await getActorConnectionInfoAsync();
  
  const lines: string[] = [];
  
  lines.push('='.repeat(60));
  lines.push('PUBLISH CHECKLIST');
  lines.push('='.repeat(60));
  lines.push('');
  
  lines.push('Current Build Information:');
  lines.push(`  Version: ${buildInfo.version}`);
  lines.push(`  Timestamp: ${buildInfo.timestamp}`);
  lines.push(`  Deployment ID: ${buildInfo.deploymentId}`);
  lines.push(`  Environment: ${buildInfo.environment}`);
  lines.push('');
  
  lines.push('Backend Canister Configuration:');
  if (connectionInfo.canisterId) {
    lines.push(`  Resolved Canister ID: ${connectionInfo.canisterId}`);
    lines.push(`  Resolution Method: ${connectionInfo.canisterIdSource}`);
  } else {
    lines.push('  Resolved Canister ID: (not resolved)');
    if (connectionInfo.canisterIdResolutionError) {
      lines.push(`  Error: ${connectionInfo.canisterIdResolutionError}`);
    }
  }
  lines.push('');
  
  lines.push('IMPORTANT: This application cannot self-publish.');
  lines.push('You must publish it through the Caffeine editor.');
  lines.push('');
  
  lines.push('Runtime Configuration (env.json):');
  lines.push('  Your /env.json file MUST contain a non-empty CANISTER_ID_BACKEND value.');
  lines.push('  Example:');
  lines.push('  {');
  lines.push('    "CANISTER_ID_BACKEND": "your-backend-canister-id-here"');
  lines.push('  }');
  lines.push('');
  
  lines.push('Publishing Steps:');
  lines.push('  1. Open the Caffeine editor');
  lines.push('  2. Navigate to your project');
  lines.push('  3. Click "Publish" or "Deploy to Live"');
  lines.push('  4. Wait for the deployment to complete');
  lines.push('  5. The editor will provide you with a live URL');
  lines.push('');
  
  lines.push('Post-Publish Verification:');
  lines.push('  1. Visit the live URL provided by the editor');
  lines.push('  2. Check that the app loads without errors');
  lines.push('  3. Verify that the backend connection works');
  lines.push('  4. Test core functionality (login, data operations)');
  lines.push('  5. Open browser DevTools and check for console errors');
  lines.push('');
  
  lines.push('Troubleshooting:');
  lines.push('  - If the app shows "Configuration Error", check /env.json');
  lines.push('  - If backend calls fail, verify the canister ID is correct');
  lines.push('  - If you see CORS errors, ensure the backend allows the frontend origin');
  lines.push('  - Use the Diagnostics panel (bug icon) for detailed connection info');
  lines.push('');
  
  lines.push('='.repeat(60));
  
  return lines.join('\n');
}
