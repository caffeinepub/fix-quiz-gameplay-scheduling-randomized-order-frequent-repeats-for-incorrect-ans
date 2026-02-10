// Publish checklist formatter
// Generates plain-text checklist for publishing draft to live canister

import type { BuildStamp } from './buildStamp';
import type { ConnectionInfo } from './actorConnectionInfo';

export interface PublishChecklistInput {
  buildInfo: BuildStamp;
  connectionInfo: ConnectionInfo;
}

/**
 * Formats publish checklist as plain text for clipboard/manual copy.
 * Includes current build metadata, resolved canister ID, and step-by-step publish instructions.
 */
export function formatPublishChecklist(input: PublishChecklistInput): string {
  const lines: string[] = [];

  // Header
  lines.push('=== Publish to Live Canister - Checklist ===');
  lines.push('');
  lines.push('IMPORTANT: This app cannot publish itself. Publishing is done via the Caffeine editor.');
  lines.push('');

  // Current Build Info
  lines.push('Current Build:');
  lines.push(`  Version: ${input.buildInfo.version}`);
  lines.push(`  Timestamp: ${input.buildInfo.timestamp}`);
  lines.push(`  Deployment ID: ${input.buildInfo.deploymentId}`);
  lines.push(`  Environment: ${input.buildInfo.environment}`);
  lines.push('');

  // Backend Canister Info
  lines.push('Backend Canister Resolution:');
  lines.push(`  Canister ID: ${input.connectionInfo.canisterId || '(not resolved)'}`);
  lines.push(`  Source: ${input.connectionInfo.canisterIdSource}`);
  lines.push(`  Network: ${input.connectionInfo.network}`);
  lines.push(`  Host: ${input.connectionInfo.host}`);
  if (input.connectionInfo.canisterIdResolutionError) {
    lines.push(`  Resolution Error: ${input.connectionInfo.canisterIdResolutionError}`);
  }
  lines.push('');

  // Publish Steps
  lines.push('How to Publish Draft to Live:');
  lines.push('');
  lines.push('1. Verify Prerequisites:');
  lines.push('   • Check that Live Readiness shows "Ready" status in Deployment Diagnostics');
  lines.push('   • Ensure all testing is complete on your draft version');
  lines.push('   • Confirm backend canister ID is resolved correctly');
  lines.push('');
  lines.push('2. Prepare Runtime Configuration (CRITICAL):');
  lines.push('   • Your live deployment must include a file named /env.json in the frontend assets');
  lines.push('   • The file must contain a NON-EMPTY CANISTER_ID_BACKEND value:');
  lines.push('     {');
  lines.push('       "CANISTER_ID_BACKEND": "your-live-backend-canister-id"');
  lines.push('     }');
  lines.push('   • This configuration is loaded into window.__ENV__ at runtime');
  lines.push('   • Without a non-empty value, the frontend cannot connect to the backend');
  lines.push('');
  lines.push('3. Publish via Caffeine Editor:');
  lines.push('   • Open your project in the Caffeine editor');
  lines.push('   • Navigate to the "Live" tab');
  lines.push('   • Click "Publish" to deploy your frontend assets to the live canister');
  lines.push('   • Ensure /env.json is included in the deployment');
  lines.push('   • Wait for the deployment to complete successfully');
  lines.push('');
  lines.push('4. Post-Publish Verification:');
  lines.push('   • Open your live URL in a browser');
  lines.push('   • Open Deployment Diagnostics panel (click the bug icon)');
  lines.push('   • Click "Run Backend Health Check" to verify connectivity');
  lines.push('   • Verify the health check returns success');
  lines.push('   • Click "Copy Live Verification Info" to capture deployment details');
  lines.push('   • Verify Live Readiness shows "Ready" status');
  lines.push('   • Test core application functionality');
  lines.push('');

  // Footer
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push(`From: ${window.location.origin}${window.location.pathname}`);

  return lines.join('\n');
}
