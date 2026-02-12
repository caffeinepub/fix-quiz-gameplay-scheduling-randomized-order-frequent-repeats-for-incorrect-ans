// Deployment diagnostics collector
// Captures and formats errors for inspection during deployment troubleshooting

import { getBuildInfo } from './buildStamp';
import { getActorConnectionInfo } from './actorConnectionInfo';

export interface DiagnosticError {
  message: string;
  stack?: string;
  timestamp: string;
  context?: string;
  type: 'error' | 'unhandledRejection' | 'actorInit' | 'runtime' | 'retry' | 'forceRefresh' | 'hardRefresh';
  metadata?: {
    host?: string;
    canisterId?: string | null;
    network?: string;
    canisterIdSource?: string;
    canisterIdSourcesAttempted?: string[];
  };
  detectedIssue?: 'canisterStopped';
  detectedCanisterId?: string;
}

class DeploymentDiagnostics {
  private errors: DiagnosticError[] = [];
  private maxErrors = 50;
  private storageKey = 'deployment-diagnostics';

  constructor() {
    this.loadFromStorage();
  }

  captureError(
    error: Error | string, 
    context?: string, 
    type: DiagnosticError['type'] = 'error',
    detectedIssue?: 'canisterStopped',
    detectedCanisterId?: string
  ): void {
    const connectionInfo = getActorConnectionInfo();
    
    const diagnosticError: DiagnosticError = {
      message: typeof error === 'string' ? error : error.message,
      stack: typeof error === 'object' && error.stack ? error.stack : undefined,
      timestamp: new Date().toISOString(),
      context,
      type,
      metadata: {
        host: connectionInfo.host,
        canisterId: connectionInfo.canisterId,
        network: connectionInfo.network,
        canisterIdSource: connectionInfo.canisterIdSource,
        canisterIdSourcesAttempted: connectionInfo.canisterIdSourcesAttempted,
      },
      detectedIssue,
      detectedCanisterId,
    };

    this.errors.unshift(diagnosticError);
    
    // Keep only the most recent errors
    if (this.errors.length > this.maxErrors) {
      this.errors = this.errors.slice(0, this.maxErrors);
    }

    this.saveToStorage();
    
    // Also log to console for immediate visibility
    console.error(`[Deployment Diagnostics] ${type}:`, diagnosticError);
  }

  captureRetryAttempt(context?: string): void {
    this.captureError('Connection retry initiated', context, 'retry');
  }

  captureForceRefresh(context?: string): void {
    this.captureError('Force refresh initiated', context, 'forceRefresh');
  }

  getErrors(): DiagnosticError[] {
    return [...this.errors];
  }

  clearErrors(): void {
    this.errors = [];
    this.saveToStorage();
  }

  private saveToStorage(): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.errors));
    } catch (e) {
      console.warn('Failed to save diagnostics to localStorage:', e);
    }
  }

  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        this.errors = JSON.parse(stored);
      }
    } catch (e) {
      console.warn('Failed to load diagnostics from localStorage:', e);
    }
  }

  getFormattedReport(): string {
    const buildInfo = getBuildInfo();
    const connectionInfo = getActorConnectionInfo();
    const currentLocation = `${window.location.origin}${window.location.pathname}${window.location.hash ? ` (${window.location.hash})` : ''}`;
    
    const header = `
DEPLOYMENT DIAGNOSTICS REPORT
Generated: ${new Date().toISOString()}

BUILD INFORMATION:
- Version: ${buildInfo.version}
- Timestamp: ${buildInfo.timestamp}
- Environment: ${buildInfo.environment}
- Deployment ID: ${buildInfo.deploymentId}

CONNECTION INFORMATION:
- Current Location: ${currentLocation}
- Network: ${connectionInfo.network}
- Host: ${connectionInfo.host}
- Backend Canister ID: ${connectionInfo.canisterId || '(not resolved)'}
- Canister ID Source: ${connectionInfo.canisterIdSource}
- Sources Attempted: ${connectionInfo.canisterIdSourcesAttempted.join(', ')}
${connectionInfo.canisterIdResolutionError ? `- Resolution Error: ${connectionInfo.canisterIdResolutionError}` : ''}

ERROR LOG (${this.errors.length} entries):
${this.errors.length === 0 ? '(No errors recorded)' : ''}
`;

    const errorEntries = this.errors.map((error, index) => {
      let entry = `
[${index + 1}] ${error.type.toUpperCase()}
Timestamp: ${error.timestamp}
${error.context ? `Context: ${error.context}` : ''}
${error.detectedIssue === 'canisterStopped' ? `⚠️  DETECTED ISSUE: Canister Stopped (IC0508)` : ''}
${error.detectedCanisterId ? `Stopped Canister ID: ${error.detectedCanisterId}` : ''}
Message: ${error.message}
${error.stack ? `\nStack Trace:\n${error.stack}` : ''}
${error.metadata ? `
Connection Details:
- Network: ${error.metadata.network}
- Host: ${error.metadata.host}
- Canister ID: ${error.metadata.canisterId || '(not resolved)'}
- Source: ${error.metadata.canisterIdSource}
` : ''}
${'─'.repeat(80)}`;
      return entry;
    }).join('\n');

    return header + errorEntries;
  }
}

export const diagnostics = new DeploymentDiagnostics();
