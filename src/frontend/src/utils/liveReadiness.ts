// Live readiness evaluation for deployment diagnostics
// Determines if the app is ready for live/production use

import type { HealthCheckResult } from '../backend';

const PLACEHOLDER_CANISTER_ID = 'PLACEHOLDER_BACKEND_CANISTER_ID';

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
 * Returns a UI-friendly status model with explicit placeholder detection.
 */
export function evaluateReadiness(
  canisterId: string | null,
  canisterIdSource: string,
  canisterIdError: string | undefined,
  healthCheckResult: HealthCheckResult | null,
  healthCheckError: string | null
): ReadinessStatus {
  const details: string[] = [];

  // Check 1: Canister ID must be resolved
  if (!canisterId) {
    return {
      ready: false,
      summary: 'Not Ready - Backend canister ID not resolved',
      details: [
        'The backend canister ID could not be resolved from any source.',
        canisterIdError || 'No canister ID available.',
        'Required: /env.json must contain a non-empty, non-placeholder CANISTER_ID_BACKEND value.',
        `Example of correct /env.json: { "CANISTER_ID_BACKEND": "your-actual-canister-id" }`,
        `Example of incorrect /env.json: { "CANISTER_ID_BACKEND": "${PLACEHOLDER_CANISTER_ID}" }`,
        'Solution: Publish via the Caffeine editor to automatically inject the correct canister ID.',
      ],
      error: canisterIdError,
    };
  }

  // Check 2: Canister ID must not be the placeholder value
  if (canisterId === PLACEHOLDER_CANISTER_ID) {
    return {
      ready: false,
      summary: `Not Ready - Backend canister ID is placeholder value "${PLACEHOLDER_CANISTER_ID}"`,
      details: [
        `The resolved canister ID is the placeholder value "${PLACEHOLDER_CANISTER_ID}".`,
        'This placeholder must be replaced with your actual backend canister ID.',
        'The /env.json file was not properly configured during deployment.',
        'Solution: Publish via the Caffeine editor to automatically replace the placeholder.',
        'The Caffeine editor will inject the correct canister ID during the publish process.',
        'After publishing, use the "Verify /env.json" button to confirm the real canister ID was injected.',
      ],
      error: 'Placeholder canister ID detected',
    };
  }

  details.push(`Backend canister ID resolved: ${canisterId}`);
  details.push(`Source: ${canisterIdSource}`);

  // Check 3: For production verification, prefer runtime env.json source
  if (canisterIdSource !== 'window.__ENV__.CANISTER_ID_BACKEND') {
    details.push(
      `⚠️ Warning: Canister ID was not resolved from runtime env.json (window.__ENV__.CANISTER_ID_BACKEND).`
    );
    details.push(
      'For production deployments, the canister ID should come from /env.json injected by the Caffeine editor.'
    );
  }

  // Check 4: Health check result
  if (healthCheckError) {
    return {
      ready: false,
      summary: 'Not Ready - Backend health check failed',
      details: [
        ...details,
        'The backend canister could not be reached or did not respond correctly.',
        `Error: ${healthCheckError}`,
        'Verify that the canister is deployed and accessible from this network.',
        'Check that the canister ID is correct and the canister is running.',
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
        'Click "Run Health Check" in the Backend Connection section.',
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
      'All deployment verification checks passed.',
    ],
    healthCheckResult: {
      backendVersion: healthCheckResult.backendVersion.toString(),
      systemTime: new Date(Number(healthCheckResult.systemTime) / 1_000_000).toISOString(),
    },
  };
}
