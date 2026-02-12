import type { BuildInfo } from './buildStamp';
import type { HealthCheckResult } from '../backend';
import { getActorConnectionInfoAsync } from './actorConnectionInfo';
import { getRuntimeEnvStatus } from './runtimeEnvStatus';

/**
 * Formatter that generates comprehensive plain-text "Live Verification Info" report in English
 * including live URL, complete build metadata, backend canister resolution details with manual override sources,
 * runtime env.json status with presence check, network/host configuration,
 * and clear health-check status/result section with async connection info loading.
 */
export async function shareLiveVerificationInfo(
  buildInfo: BuildInfo,
  healthCheckResult: HealthCheckResult | null,
  healthCheckError: string | null
): Promise<string> {
  const connectionInfo = await getActorConnectionInfoAsync();
  const runtimeEnvStatus = getRuntimeEnvStatus();
  
  const lines: string[] = [];
  
  lines.push('═══════════════════════════════════════════════════════════');
  lines.push('              LIVE VERIFICATION REPORT                     ');
  lines.push('═══════════════════════════════════════════════════════════');
  lines.push('');
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push('');
  
  lines.push('🌐 DEPLOYMENT URL');
  lines.push('─────────────────────────────────────────────────────────');
  lines.push(`Live URL:  ${window.location.origin}${window.location.pathname}`);
  if (window.location.hash) {
    lines.push(`Hash:      ${window.location.hash}`);
  }
  if (window.location.search) {
    lines.push(`Query:     ${window.location.search}`);
  }
  lines.push('');
  
  lines.push('📦 BUILD METADATA');
  lines.push('─────────────────────────────────────────────────────────');
  lines.push(`Version:        ${buildInfo.version}`);
  lines.push(`Timestamp:      ${buildInfo.timestamp}`);
  lines.push(`Deployment ID:  ${buildInfo.deploymentId}`);
  lines.push(`Environment:    ${buildInfo.environment}`);
  lines.push(`Build ID:       ${buildInfo.buildId}`);
  lines.push('');
  
  lines.push('🔌 BACKEND CANISTER RESOLUTION');
  lines.push('─────────────────────────────────────────────────────────');
  lines.push(`Canister ID:       ${connectionInfo.canisterId || '(not resolved)'}`);
  
  // Explicitly label manual override sources
  let sourceLabel = connectionInfo.canisterIdSource;
  if (sourceLabel === 'manual-override:url') {
    sourceLabel = 'Manual Override (URL query parameter)';
  } else if (sourceLabel === 'manual-override:localStorage') {
    sourceLabel = 'Manual Override (Saved in browser)';
  }
  lines.push(`Resolution Source: ${sourceLabel}`);
  
  const sourcesAttemptedLabels = connectionInfo.canisterIdSourcesAttempted.map(s => {
    if (s === 'manual-override:url') return 'Manual Override (URL)';
    if (s === 'manual-override:localStorage') return 'Manual Override (localStorage)';
    return s;
  });
  lines.push(`Sources Attempted: ${sourcesAttemptedLabels.join(', ')}`);
  
  if (connectionInfo.canisterIdResolutionError) {
    lines.push(`Resolution Error:  ${connectionInfo.canisterIdResolutionError}`);
  }
  lines.push('');
  
  lines.push('⚙️  RUNTIME ENVIRONMENT STATUS');
  lines.push('─────────────────────────────────────────────────────────');
  lines.push(`Load Status:              ${runtimeEnvStatus.status}`);
  lines.push(`CANISTER_ID_BACKEND Set:  ${runtimeEnvStatus.canisterId ? 'Yes' : 'No'}`);
  lines.push(`Is Placeholder:           ${runtimeEnvStatus.isPlaceholder ? 'Yes' : 'No'}`);
  lines.push(`Message: ${runtimeEnvStatus.message}`);
  if (runtimeEnvStatus.troubleshooting.length > 0) {
    lines.push('');
    lines.push('Troubleshooting Steps:');
    runtimeEnvStatus.troubleshooting.forEach((step, idx) => {
      lines.push(`  ${idx + 1}. ${step}`);
    });
  }
  lines.push('');
  
  lines.push('🌍 NETWORK CONFIGURATION');
  lines.push('─────────────────────────────────────────────────────────');
  lines.push(`Network:  ${connectionInfo.network}`);
  lines.push(`Host:     ${connectionInfo.host}`);
  lines.push('');
  
  lines.push('🏥 BACKEND HEALTH CHECK');
  lines.push('─────────────────────────────────────────────────────────');
  if (healthCheckResult) {
    lines.push('Status: ✅ PASSED');
    lines.push('');
    lines.push(`Backend Version:  ${healthCheckResult.backendVersion.toString()}`);
    lines.push(`System Time:      ${new Date(Number(healthCheckResult.systemTime) / 1000000).toISOString()}`);
    lines.push(`Local Time:       ${new Date(Number(healthCheckResult.systemTime) / 1000000).toLocaleString()}`);
  } else if (healthCheckError) {
    lines.push('Status: ❌ FAILED');
    lines.push('');
    lines.push('Error Details:');
    lines.push(healthCheckError);
  } else {
    lines.push('Status: ⏸️  NOT RUN');
    lines.push('');
    lines.push('Run the health check from the diagnostics panel to test backend connectivity.');
  }
  lines.push('');
  
  lines.push('📊 OVERALL READINESS');
  lines.push('─────────────────────────────────────────────────────────');
  const isReady = 
    runtimeEnvStatus.status === 'loaded' &&
    !runtimeEnvStatus.isPlaceholder &&
    connectionInfo.canisterId && 
    !connectionInfo.canisterIdResolutionError &&
    healthCheckResult !== null;
  
  if (isReady) {
    lines.push('Status: ✅ READY');
    lines.push('');
    lines.push('The app is properly configured and connected to the backend.');
    lines.push('All systems are operational.');
  } else {
    lines.push('Status: ⚠️  NOT READY');
    lines.push('');
    lines.push('Issues detected:');
    if (runtimeEnvStatus.status !== 'loaded' || runtimeEnvStatus.isPlaceholder) {
      lines.push('  • Runtime environment not properly configured (check /env.json)');
    }
    if (!connectionInfo.canisterId || connectionInfo.canisterIdResolutionError) {
      lines.push('  • Backend canister ID not resolved');
    }
    if (!healthCheckResult) {
      lines.push('  • Backend health check not passed');
    }
    lines.push('');
    lines.push('Review the sections above for detailed troubleshooting steps.');
  }
  lines.push('');
  
  lines.push('═══════════════════════════════════════════════════════════');
  lines.push('                    END OF REPORT                          ');
  lines.push('═══════════════════════════════════════════════════════════');
  lines.push('');
  lines.push('💡 Share this report when requesting support or troubleshooting');
  lines.push('   deployment issues. It contains all relevant diagnostic information.');
  
  return lines.join('\n');
}
