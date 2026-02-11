import type { BuildInfo } from './buildStamp';
import type { HealthCheckResult } from '../backend';
import { getActorConnectionInfoAsync } from './actorConnectionInfo';
import { inspectRuntimeEnv } from './runtimeEnvStatus';

/**
 * Formatter that generates comprehensive plain-text "Live Verification Info" report in English
 * including live URL, complete build metadata, backend canister resolution details,
 * runtime env.json status, network/host configuration,
 * and clear health-check status/result section with async connection info loading.
 */
export async function shareLiveVerificationInfo(
  buildInfo: BuildInfo,
  healthCheckResult: HealthCheckResult | null,
  healthCheckError: string | null
): Promise<string> {
  const connectionInfo = await getActorConnectionInfoAsync();
  const runtimeEnvStatus = await inspectRuntimeEnv();
  
  const lines: string[] = [];
  
  lines.push('═══════════════════════════════════════════════════════════');
  lines.push('              LIVE VERIFICATION REPORT                     ');
  lines.push('═══════════════════════════════════════════════════════════');
  lines.push('');
  
  lines.push('🌐 DEPLOYMENT URL');
  lines.push('─────────────────────────────────────────────────────────');
  lines.push(`Live URL:  ${window.location.origin}${window.location.pathname}`);
  if (window.location.hash) {
    lines.push(`Hash:      ${window.location.hash}`);
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
  lines.push(`Resolution Source: ${connectionInfo.canisterIdSource}`);
  lines.push(`Sources Attempted: ${connectionInfo.canisterIdSourcesAttempted.join(', ')}`);
  if (connectionInfo.canisterIdResolutionError) {
    lines.push(`Resolution Error:  ${connectionInfo.canisterIdResolutionError}`);
  }
  lines.push('');
  
  lines.push('⚙️  RUNTIME ENVIRONMENT STATUS');
  lines.push('─────────────────────────────────────────────────────────');
  lines.push(`/env.json Accessible:     ${runtimeEnvStatus.envJsonAccessible ? 'Yes' : 'No'}`);
  lines.push(`CANISTER_ID_BACKEND Set:  ${runtimeEnvStatus.canisterIdPresent ? 'Yes' : 'No'}`);
  lines.push(`Status: ${runtimeEnvStatus.message}`);
  if (runtimeEnvStatus.troubleshootingSteps.length > 0) {
    lines.push('');
    lines.push('Troubleshooting Steps:');
    runtimeEnvStatus.troubleshootingSteps.forEach((step, idx) => {
      lines.push(`  ${idx + 1}. ${step}`);
    });
  }
  lines.push('');
  
  lines.push('🌍 NETWORK CONFIGURATION');
  lines.push('─────────────────────────────────────────────────────────');
  lines.push(`Host:      ${connectionInfo.host}`);
  lines.push(`Network:   ${connectionInfo.network}`);
  lines.push('');
  
  lines.push('🏥 BACKEND HEALTH CHECK');
  lines.push('─────────────────────────────────────────────────────────');
  if (healthCheckResult) {
    lines.push('Status: ✅ SUCCESS');
    lines.push('');
    lines.push(`Backend Version: ${healthCheckResult.backendVersion}`);
    lines.push(`System Time:     ${healthCheckResult.systemTime}`);
    lines.push(`Timestamp:       ${new Date(Number(healthCheckResult.systemTime) / 1_000_000).toISOString()}`);
  } else if (healthCheckError) {
    lines.push('Status: ❌ FAILED');
    lines.push('');
    lines.push(`Error: ${healthCheckError}`);
  } else {
    lines.push('Status: ⏳ NOT RUN');
    lines.push('');
    lines.push('Health check has not been executed yet.');
  }
  lines.push('');
  
  lines.push('═══════════════════════════════════════════════════════════');
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push('═══════════════════════════════════════════════════════════');
  
  return lines.join('\n');
}
