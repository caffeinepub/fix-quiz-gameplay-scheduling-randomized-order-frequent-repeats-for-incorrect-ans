// Deployment diagnostics collector
// Captures and formats errors for inspection during deployment troubleshooting

import { getBuildInfo } from './buildStamp';
import { getActorConnectionInfo } from './actorConnectionInfo';

export interface DiagnosticError {
  message: string;
  stack?: string;
  timestamp: string;
  context?: string;
  type: 'error' | 'unhandledRejection' | 'actorInit' | 'runtime' | 'retry';
  metadata?: {
    host?: string;
    canisterId?: string | null;
    network?: string;
  };
}

class DeploymentDiagnostics {
  private errors: DiagnosticError[] = [];
  private maxErrors = 50;
  private storageKey = 'deployment-diagnostics';

  constructor() {
    this.loadFromStorage();
  }

  captureError(error: Error | string, context?: string, type: DiagnosticError['type'] = 'error'): void {
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
      },
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

CONNECTION CONFIGURATION:
- Agent Host: ${connectionInfo.host}
- Network: ${connectionInfo.network}
- Backend Canister ID: ${connectionInfo.canisterId || '(not found)'}

LOCATION:
- Origin: ${window.location.origin}
- Pathname: ${window.location.pathname}
- Hash: ${window.location.hash || '(none)'}
- Full URL: ${currentLocation}

${'='.repeat(80)}
`;

    if (this.errors.length === 0) {
      return header + '\nNo errors captured.\n';
    }

    const errorLog = this.errors
      .map((err, idx) => {
        const metadataStr = err.metadata 
          ? `\nConnection: ${err.metadata.network} (${err.metadata.host})\nCanister ID: ${err.metadata.canisterId || '(not found)'}`
          : '';
        return `
Error #${idx + 1} [${err.type}] - ${err.timestamp}
${err.context ? `Context: ${err.context}\n` : ''}Message: ${err.message}${metadataStr}
${err.stack ? `Stack:\n${err.stack}\n` : ''}
${'-'.repeat(80)}`;
      })
      .join('\n');

    return header + '\nCAPTURED ERRORS:\n' + errorLog;
  }
}

export const diagnostics = new DeploymentDiagnostics();
