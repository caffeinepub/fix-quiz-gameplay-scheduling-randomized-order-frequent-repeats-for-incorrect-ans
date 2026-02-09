// Utility to detect and parse stopped-canister rejection errors (IC0508)

export interface StoppedCanisterInfo {
  isStopped: boolean;
  canisterId: string | null;
  originalError: string;
}

/**
 * Detects if an error is a "canister stopped" rejection (IC0508, reject code 5)
 * and attempts to extract the canister ID from the error message.
 */
export function detectStoppedCanister(error: unknown): StoppedCanisterInfo {
  const errorString = typeof error === 'string' 
    ? error 
    : error instanceof Error 
      ? error.message 
      : String(error);

  const lowerError = errorString.toLowerCase();

  // Check for stopped-canister indicators
  const isStopped = 
    lowerError.includes('ic0508') ||
    lowerError.includes('is stopped') ||
    (lowerError.includes('reject code: 5') && lowerError.includes('canister'));

  if (!isStopped) {
    return {
      isStopped: false,
      canisterId: null,
      originalError: errorString,
    };
  }

  // Try to extract canister ID from the error message
  // Common patterns:
  // - "Canister <canister-id> is stopped"
  // - "canister_id": "<canister-id>"
  // - Canister ID format: xxxxx-xxxxx-xxxxx-xxxxx-xxx
  const canisterIdPattern = /([a-z0-9]{5}-[a-z0-9]{5}-[a-z0-9]{5}-[a-z0-9]{5}-[a-z0-9]{3})/i;
  const match = errorString.match(canisterIdPattern);

  return {
    isStopped: true,
    canisterId: match ? match[1] : null,
    originalError: errorString,
  };
}

/**
 * Formats a user-friendly explanation for a stopped-canister error.
 */
export function formatStoppedCanisterMessage(info: StoppedCanisterInfo): string {
  if (!info.isStopped) {
    return 'Connection error occurred';
  }

  if (info.canisterId) {
    return `Backend canister ${info.canisterId} is stopped`;
  }

  return 'Backend canister is stopped';
}

/**
 * Provides actionable recovery steps for a stopped canister.
 */
export function getStoppedCanisterRecoverySteps(isLocal: boolean): string[] {
  if (isLocal) {
    return [
      'Open a terminal in your project directory',
      'Run: dfx canister start <canister-name>',
      'Or run: dfx canister start --all',
      'Click "Retry Connection" below once the canister is running',
    ];
  }

  return [
    'Contact the canister controller or administrator',
    'The canister must be started using: dfx canister start <canister-id> --network ic',
    'This requires controller privileges for the canister',
    'Click "Retry Connection" below once the canister has been started',
  ];
}
