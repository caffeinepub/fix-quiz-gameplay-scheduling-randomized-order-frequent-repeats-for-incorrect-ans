import { useState, useEffect, useRef } from 'react';
import { diagnostics } from '../utils/deploymentDiagnostics';
import { getBuildInfo } from '../utils/buildStamp';
import { getActorConnectionInfo, getActorConnectionInfoAsync } from '../utils/actorConnectionInfo';
import { refreshToLatestBuild } from '../utils/refreshToLatestBuild';
import { evaluateReadiness } from '../utils/liveReadiness';
import { inspectRuntimeEnv, getRuntimeEnvStatusSync } from '../utils/runtimeEnvStatus';
import { shareLiveVerificationInfo } from '../utils/shareLiveVerificationInfo';
import { formatPublishChecklist } from '../utils/formatPublishChecklist';
import { createActorWithConfig } from '../config';
import { detectStoppedCanister, formatStoppedCanisterMessage } from '../utils/stoppedCanisterDetection';
import type { HealthCheckResult } from '../backend';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { ScrollArea } from './ui/scroll-area';
import { AlertCircle, Download, Trash2, X, Activity, CheckCircle, XCircle, Loader2, RefreshCw, Share2, AlertTriangle, Copy, Rocket, Power } from 'lucide-react';
import { Badge } from './ui/badge';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { Textarea } from './ui/textarea';

interface DeploymentDiagnosticsPanelProps {
  onClose: () => void;
  focusPublishSection?: boolean;
}

export default function DeploymentDiagnosticsPanel({ onClose, focusPublishSection = false }: DeploymentDiagnosticsPanelProps) {
  const [errors, setErrors] = useState(diagnostics.getErrors());
  const [healthCheckStatus, setHealthCheckStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [healthCheckResult, setHealthCheckResult] = useState<HealthCheckResult | null>(null);
  const [healthCheckError, setHealthCheckError] = useState<string | null>(null);
  const [runtimeEnvMessage, setRuntimeEnvMessage] = useState<string>('');
  const [shareError, setShareError] = useState<string | null>(null);
  const [shareFallbackText, setShareFallbackText] = useState<string | null>(null);
  const [publishChecklistError, setPublishChecklistError] = useState<string | null>(null);
  const [publishChecklistFallbackText, setPublishChecklistFallbackText] = useState<string | null>(null);
  const [connectionInfo, setConnectionInfo] = useState(getActorConnectionInfo());
  const buildInfo = getBuildInfo();
  const publishSectionRef = useRef<HTMLDivElement>(null);

  // Load async connection info on mount
  useEffect(() => {
    getActorConnectionInfoAsync().then(setConnectionInfo);
  }, []);

  // Auto-run health check on mount
  useEffect(() => {
    runHealthCheck();
    // Also check runtime env status
    const syncStatus = getRuntimeEnvStatusSync();
    setRuntimeEnvMessage(syncStatus.message);
    
    // Async detailed check
    inspectRuntimeEnv().then(status => {
      if (status.troubleshootingSteps.length > 0) {
        setRuntimeEnvMessage(status.message);
      }
    });
  }, []);

  // Focus publish section when requested
  useEffect(() => {
    if (focusPublishSection && publishSectionRef.current) {
      // Small delay to ensure DOM is ready
      setTimeout(() => {
        publishSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  }, [focusPublishSection]);

  useEffect(() => {
    // Refresh errors every second
    const interval = setInterval(() => {
      setErrors(diagnostics.getErrors());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const handleClear = () => {
    diagnostics.clearErrors();
    setErrors([]);
  };

  const handleDownload = () => {
    const report = diagnostics.getFormattedReport();

    const blob = new Blob([report], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `deployment-diagnostics-${new Date().toISOString().replace(/[:.]/g, '-')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const runHealthCheck = async () => {
    setHealthCheckStatus('testing');
    setHealthCheckError(null);
    setHealthCheckResult(null);

    try {
      // Create an anonymous actor for health check (doesn't require authentication)
      const anonymousActor = await createActorWithConfig();
      const result = await anonymousActor.healthCheck();
      setHealthCheckStatus('success');
      setHealthCheckResult(result);
    } catch (error: any) {
      setHealthCheckStatus('error');
      const stoppedInfo = detectStoppedCanister(error);
      
      if (stoppedInfo.isStopped) {
        const stoppedMessage = formatStoppedCanisterMessage(stoppedInfo);
        setHealthCheckError(stoppedMessage);
        diagnostics.captureError(
          error,
          'DeploymentDiagnosticsPanel - Backend health check failed (canister stopped)',
          'runtime',
          'canisterStopped',
          stoppedInfo.canisterId || undefined
        );
      } else {
        setHealthCheckError(error.message || 'Unknown error occurred');
        diagnostics.captureError(
          error,
          'DeploymentDiagnosticsPanel - Backend health check failed',
          'runtime'
        );
      }
    }
  };

  const handleRunHealthCheck = async () => {
    await runHealthCheck();
  };

  const handleForceRefresh = () => {
    diagnostics.captureForceRefresh('User-initiated force refresh from Diagnostics Panel');
    refreshToLatestBuild();
  };

  const handleCopyLiveVerificationInfo = async () => {
    setShareError(null);
    setShareFallbackText(null);

    try {
      const verificationText = await shareLiveVerificationInfo(
        buildInfo,
        healthCheckResult,
        healthCheckError
      );

      await navigator.clipboard.writeText(verificationText);
      // Success - could show a toast here
      alert('Live verification info copied to clipboard!');
    } catch (error: any) {
      // Either generation or clipboard write failed
      try {
        const verificationText = await shareLiveVerificationInfo(
          buildInfo,
          healthCheckResult,
          healthCheckError
        );
        setShareError('Could not copy to clipboard. Please copy the text below manually:');
        setShareFallbackText(verificationText);
      } catch (genError: any) {
        setShareError('Failed to generate verification info: ' + genError.message);
      }
    }
  };

  const handleCopyPublishChecklist = async () => {
    setPublishChecklistError(null);
    setPublishChecklistFallbackText(null);

    try {
      const checklistText = await formatPublishChecklist(buildInfo);
      await navigator.clipboard.writeText(checklistText);
      alert('Publish checklist copied to clipboard!');
    } catch (error: any) {
      // Either generation or clipboard write failed
      try {
        const checklistText = await formatPublishChecklist(buildInfo);
        setPublishChecklistError('Could not copy to clipboard. Please copy the text below manually:');
        setPublishChecklistFallbackText(checklistText);
      } catch (genError: any) {
        setPublishChecklistError('Failed to generate checklist: ' + genError.message);
      }
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'actorInit':
        return 'destructive';
      case 'runtime':
        return 'default';
      case 'unhandledRejection':
        return 'secondary';
      case 'forceRefresh':
        return 'outline';
      default:
        return 'outline';
    }
  };

  // Evaluate readiness
  const readiness = evaluateReadiness(
    connectionInfo.canisterId,
    connectionInfo.canisterIdSource,
    connectionInfo.canisterIdResolutionError,
    healthCheckResult,
    healthCheckError
  );

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] flex flex-col">
        <CardHeader className="shrink-0">
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-primary" />
                Deployment Diagnostics
              </CardTitle>
              <CardDescription className="mt-2 space-y-1">
                <div>Version: {buildInfo.version} | Environment: {buildInfo.environment}</div>
                <div className="text-xs">Build: {buildInfo.timestamp}</div>
                <div className="text-xs">Deployment ID: {buildInfo.deploymentId}</div>
                <div className="text-xs">
                  Location: {window.location.origin}{window.location.pathname}
                  {window.location.hash && ` (${window.location.hash})`}
                </div>
                <div className="text-xs">
                  Backend Canister ID: {connectionInfo.canisterId || '(not resolved)'} 
                  {' '}(source: {connectionInfo.canisterIdSource})
                </div>
                <div className="text-xs">
                  Sources Attempted: {connectionInfo.canisterIdSourcesAttempted.join(', ')}
                </div>
                {connectionInfo.canisterIdResolutionError && (
                  <div className="text-xs text-destructive">
                    Resolution Error: {connectionInfo.canisterIdResolutionError}
                  </div>
                )}
              </CardDescription>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="flex-1 overflow-hidden flex flex-col">
          <div className="flex flex-wrap gap-2 mb-4">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRunHealthCheck}
              disabled={healthCheckStatus === 'testing'}
            >
              {healthCheckStatus === 'testing' ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Activity className="h-4 w-4 mr-2" />
              )}
              Run Backend Health Check
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyLiveVerificationInfo}
            >
              <Share2 className="h-4 w-4 mr-2" />
              Copy Live Verification Info
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={handleForceRefresh}
              className="bg-primary hover:bg-primary/90"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Force Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={handleDownload}>
              <Download className="h-4 w-4 mr-2" />
              Download Report
            </Button>
            <Button variant="outline" size="sm" onClick={handleClear}>
              <Trash2 className="h-4 w-4 mr-2" />
              Clear Errors
            </Button>
          </div>

          <ScrollArea className="flex-1 pr-4">
            <div className="space-y-6">
              {/* Live Readiness Section */}
              <div>
                <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                  {readiness.ready ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <XCircle className="h-5 w-5 text-destructive" />
                  )}
                  Live Readiness
                </h3>
                <Alert variant={readiness.ready ? 'default' : 'destructive'}>
                  <AlertTitle>{readiness.summary}</AlertTitle>
                  <AlertDescription className="mt-2">
                    <ul className="list-disc list-inside space-y-1 text-sm">
                      {readiness.details.map((detail, idx) => (
                        <li key={idx}>{detail}</li>
                      ))}
                    </ul>
                    {readiness.healthCheckResult && (
                      <div className="mt-3 text-xs font-mono bg-muted p-2 rounded">
                        <div>Backend Version: {readiness.healthCheckResult.backendVersion}</div>
                        <div>System Time: {readiness.healthCheckResult.systemTime}</div>
                      </div>
                    )}
                    {!connectionInfo.canisterId && (
                      <div className="mt-3 p-3 bg-destructive/10 rounded border border-destructive/20">
                        <div className="font-semibold text-sm mb-2">Required Configuration:</div>
                        <div className="text-xs mb-2">
                          Your /env.json file must contain a non-empty CANISTER_ID_BACKEND value:
                        </div>
                        <pre className="text-xs bg-background p-2 rounded border overflow-x-auto">
{`{
  "CANISTER_ID_BACKEND": "your-backend-canister-id"
}`}
                        </pre>
                      </div>
                    )}
                  </AlertDescription>
                </Alert>
              </div>

              {/* Runtime Configuration Section */}
              <div>
                <h3 className="text-lg font-semibold mb-2">Runtime Configuration</h3>
                <Alert>
                  <AlertDescription>
                    <div className="text-sm space-y-2">
                      <div>{runtimeEnvMessage}</div>
                      {!connectionInfo.canisterId && (
                        <div className="mt-2 p-2 bg-muted rounded">
                          <div className="font-semibold mb-1">Troubleshooting:</div>
                          <ul className="list-disc list-inside space-y-1 text-xs">
                            <li>Ensure /env.json exists in your deployed frontend assets</li>
                            <li>Verify /env.json contains a non-empty CANISTER_ID_BACKEND value</li>
                            <li>Check browser network tab to confirm /env.json is accessible</li>
                          </ul>
                        </div>
                      )}
                    </div>
                  </AlertDescription>
                </Alert>
              </div>

              {/* Publish Guidance Section */}
              <div ref={publishSectionRef}>
                <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                  <Rocket className="h-5 w-5 text-primary" />
                  Publish to Live Canister
                </h3>
                <Alert>
                  <AlertDescription>
                    <div className="text-sm space-y-3">
                      <p>
                        This application cannot self-publish. To deploy to a live canister on the Internet Computer:
                      </p>
                      <ol className="list-decimal list-inside space-y-2 ml-2">
                        <li>Copy the publish checklist using the button below</li>
                        <li>Return to the Caffeine editor</li>
                        <li>Follow the checklist instructions to publish via the editor</li>
                        <li>After publishing, update /env.json with your backend canister ID</li>
                      </ol>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleCopyPublishChecklist}
                        className="w-full"
                      >
                        <Copy className="h-4 w-4 mr-2" />
                        Copy Publish Checklist
                      </Button>
                      {publishChecklistError && (
                        <div className="mt-2">
                          <div className="text-xs text-destructive mb-1">{publishChecklistError}</div>
                          {publishChecklistFallbackText && (
                            <Textarea
                              value={publishChecklistFallbackText}
                              readOnly
                              className="text-xs font-mono h-32"
                            />
                          )}
                        </div>
                      )}
                    </div>
                  </AlertDescription>
                </Alert>
              </div>

              {/* Share Verification Info Fallback */}
              {shareError && (
                <div>
                  <h3 className="text-lg font-semibold mb-2">Live Verification Info</h3>
                  <Alert variant="destructive">
                    <AlertDescription>
                      <div className="text-sm space-y-2">
                        <div>{shareError}</div>
                        {shareFallbackText && (
                          <Textarea
                            value={shareFallbackText}
                            readOnly
                            className="text-xs font-mono h-32"
                          />
                        )}
                      </div>
                    </AlertDescription>
                  </Alert>
                </div>
              )}

              {/* Captured Errors Section */}
              <div>
                <h3 className="text-lg font-semibold mb-2">Captured Errors ({errors.length})</h3>
                {errors.length === 0 ? (
                  <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>No errors captured</AlertDescription>
                  </Alert>
                ) : (
                  <div className="space-y-2">
                    {errors.map((error, idx) => {
                      const key = `${error.timestamp}-${idx}`;
                      const stoppedInfo = error.detectedIssue === 'canisterStopped';
                      
                      return (
                        <Alert key={key} variant={stoppedInfo ? 'destructive' : 'default'}>
                          <div className="flex items-start gap-2">
                            {stoppedInfo ? (
                              <Power className="h-4 w-4 mt-0.5 text-destructive" />
                            ) : (
                              <AlertCircle className="h-4 w-4 mt-0.5" />
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <Badge variant={getTypeColor(error.type)}>{error.type}</Badge>
                                <span className="text-xs text-muted-foreground">
                                  {new Date(error.timestamp).toLocaleString()}
                                </span>
                              </div>
                              {stoppedInfo && error.detectedCanisterId && (
                                <div className="mb-2 p-2 bg-destructive/10 rounded">
                                  <div className="text-xs font-semibold">Canister Stopped</div>
                                  <div className="text-xs font-mono mt-1">
                                    {error.detectedCanisterId}
                                  </div>
                                </div>
                              )}
                              <AlertDescription className="text-xs">
                                <div className="font-semibold mb-1">{error.context}</div>
                                <div className="font-mono bg-muted p-2 rounded overflow-x-auto whitespace-pre-wrap break-words">
                                  {error.message}
                                </div>
                                {error.stack && (
                                  <details className="mt-2">
                                    <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                                      Stack trace
                                    </summary>
                                    <div className="mt-1 font-mono text-[10px] bg-muted p-2 rounded overflow-x-auto whitespace-pre-wrap break-words">
                                      {error.stack}
                                    </div>
                                  </details>
                                )}
                              </AlertDescription>
                            </div>
                          </div>
                        </Alert>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
