// Live readiness evaluation for deployment diagnostics
// Determines if the app is ready for live/production use

import type { HealthCheckResult } from '../backend';

export interface ReadinessStatus {
  ready: boolean;
  summary: string;
  details: string[];
  healthCheckResult?: {
    backendVersion: string;
    systemTime: string;
  };
  error?: string;
}

/**
 * Evaluates live readiness based on canister ID resolution and health check result.
 * Returns a UI-friendly status model.
 */
export function evaluateReadiness(
  canisterId: string | null,
  canisterIdSource: string,
  canisterIdError: string | undefined,
  healthCheckResult: HealthCheckResult | null,
  healthCheckError: string | null
): ReadinessStatus {
  const details: string[] = [];

  // Check 1: Canister ID resolution
  if (!canisterId) {
    return {
      ready: false,
      summary: 'Not Ready - Backend canister ID not resolved',
      details: [
        'The backend canister ID could not be resolved.',
        canisterIdError || 'No canister ID available from any source.',
        'Required: /env.json must contain a non-empty CANISTER_ID_BACKEND value.',
        'Example: { "CANISTER_ID_BACKEND": "your-backend-canister-id" }',
      ],
      error: canisterIdError,
    };
  }

  details.push(`Backend canister ID resolved: ${canisterId}`);
  details.push(`Source: ${canisterIdSource}`);

  // Check 2: Health check result
  if (healthCheckError) {
    return {
      ready: false,
      summary: 'Not Ready - Backend health check failed',
      details: [
        ...details,
        'The backend canister could not be reached or did not respond correctly.',
        `Error: ${healthCheckError}`,
        'Verify that the canister is deployed and accessible from this network.',
      ],
      error: healthCheckError,
    };
  }

  if (!healthCheckResult) {
    return {
      ready: false,
      summary: 'Readiness unknown - Health check not performed',
      details: [
        ...details,
        'Run the health check to verify backend connectivity.',
      ],
    };
  }

  // All checks passed
  return {
    ready: true,
    summary: 'Ready - Backend is reachable and responding',
    details: [
      ...details,
      'The backend canister is accessible and responding to queries.',
    ],
    healthCheckResult: {
      backendVersion: healthCheckResult.backendVersion.toString(),
      systemTime: new Date(Number(healthCheckResult.systemTime) / 1_000_000).toISOString(),
    },
  };
}
