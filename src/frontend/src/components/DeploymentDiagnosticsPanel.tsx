import { useState, useEffect, useRef } from 'react';
import { diagnostics } from '../utils/deploymentDiagnostics';
import { getBuildInfo } from '../utils/buildStamp';
import { getActorConnectionInfo } from '../utils/actorConnectionInfo';
import { refreshToLatestBuild } from '../utils/refreshToLatestBuild';
import { evaluateReadiness } from '../utils/liveReadiness';
import { inspectRuntimeEnv, getRuntimeEnvStatusSync } from '../utils/runtimeEnvStatus';
import { formatVerificationInfo } from '../utils/shareLiveVerificationInfo';
import { formatPublishChecklist } from '../utils/formatPublishChecklist';
import { createActorWithConfig } from '../config';
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
  const buildInfo = getBuildInfo();
  const connectionInfo = getActorConnectionInfo();
  const publishSectionRef = useRef<HTMLDivElement>(null);

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
      setHealthCheckError(error.message || 'Unknown error occurred');
      diagnostics.captureError(
        error,
        'DeploymentDiagnosticsPanel - Backend health check failed',
        'runtime'
      );
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

    const verificationText = formatVerificationInfo({
      buildInfo,
      connectionInfo,
      healthCheckResult,
      healthCheckError,
    });

    try {
      await navigator.clipboard.writeText(verificationText);
      // Success - could show a toast here
      alert('Live verification info copied to clipboard!');
    } catch (error: any) {
      // Clipboard write failed - show fallback
      setShareError('Could not copy to clipboard. Please copy the text below manually:');
      setShareFallbackText(verificationText);
    }
  };

  const handleCopyPublishChecklist = async () => {
    setPublishChecklistError(null);
    setPublishChecklistFallbackText(null);

    const checklistText = formatPublishChecklist({
      buildInfo,
      connectionInfo,
    });

    try {
      await navigator.clipboard.writeText(checklistText);
      alert('Publish checklist copied to clipboard!');
    } catch (error: any) {
      // Clipboard write failed - show fallback
      setPublishChecklistError('Could not copy to clipboard. Please copy the text below manually:');
      setPublishChecklistFallbackText(checklistText);
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
            <Button variant="outline" size="sm" onClick={handleClear} disabled={errors.length === 0}>
              <Trash2 className="h-4 w-4 mr-2" />
              Clear Errors
            </Button>
            <div className="ml-auto flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {errors.length} error{errors.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>

          {/* Live Readiness Section */}
          <div className="mb-4">
            <Alert className={readiness.ready ? 'border-success bg-success/10' : 'border-destructive bg-destructive/10'}>
              {readiness.ready ? (
                <CheckCircle className="h-4 w-4 text-success" />
              ) : (
                <XCircle className="h-4 w-4 text-destructive" />
              )}
              <AlertTitle className={readiness.ready ? 'text-success' : 'text-destructive'}>
                Live Readiness: {readiness.ready ? 'Ready' : 'Not Ready'}
              </AlertTitle>
              <AlertDescription className="mt-2 space-y-1 text-sm">
                <div className="font-semibold">{readiness.summary}</div>
                {readiness.details.map((detail, idx) => (
                  <div key={idx} className="text-xs">{detail}</div>
                ))}
                {readiness.healthCheckResult && (
                  <div className="mt-2 pt-2 border-t border-success/20">
                    <div className="text-xs">Backend Version: {readiness.healthCheckResult.backendVersion}</div>
                    <div className="text-xs">System Time: {readiness.healthCheckResult.systemTime}</div>
                  </div>
                )}
              </AlertDescription>
            </Alert>
          </div>

          {/* Publish to Live Canister Section */}
          <div className="mb-4" ref={publishSectionRef}>
            <Card className="border-primary/30 bg-primary/5">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Rocket className="h-4 w-4 text-primary" />
                  Publish to Live Canister
                </CardTitle>
                <CardDescription className="text-xs mt-1">
                  This app cannot publish itself. Publishing is done via the Caffeine editor.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-sm space-y-3">
                  <div>
                    <div className="font-semibold mb-2">How to Publish Draft to Live:</div>
                    <ol className="list-decimal list-inside space-y-2 text-xs ml-2">
                      <li>
                        <strong>Verify Prerequisites:</strong> Check that the Live Readiness result above shows <span className="font-mono bg-background/50 px-1 rounded">"Ready"</span> status. Ensure all testing is complete on your draft version.
                      </li>
                      <li>
                        <strong>Prepare Runtime Configuration:</strong> Your live deployment must include a file named <span className="font-mono bg-background/50 px-1 rounded">/env.json</span> in the frontend assets with a <strong>non-empty</strong> <span className="font-mono bg-background/50 px-1 rounded">CANISTER_ID_BACKEND</span> value:
                        <div className="mt-1 font-mono text-xs bg-background/50 p-2 rounded">
                          {'{ "CANISTER_ID_BACKEND": "your-live-backend-canister-id" }'}
                        </div>
                        <div className="mt-1 text-muted-foreground">
                          This configuration is loaded into <span className="font-mono">window.__ENV__</span> at runtime. Without a non-empty value, the frontend cannot connect to the backend.
                        </div>
                      </li>
                      <li>
                        <strong>Publish via Caffeine Editor:</strong> In the Caffeine editor, navigate to the <span className="font-semibold">Live</span> tab and click <span className="font-semibold">Publish</span>. This will deploy your frontend assets (including <span className="font-mono bg-background/50 px-1 rounded">/env.json</span>) to your live canister.
                      </li>
                      <li>
                        <strong>Verify Post-Publish:</strong> After publishing, open your live URL in a browser. Open this Deployment Diagnostics panel and:
                        <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
                          <li>Click <span className="font-mono bg-background/50 px-1 rounded">"Run Backend Health Check"</span> to verify connectivity</li>
                          <li>Verify the health check returns success</li>
                          <li>Click <span className="font-mono bg-background/50 px-1 rounded">"Copy Live Verification Info"</span> to capture deployment details</li>
                          <li>Verify Live Readiness shows <span className="font-mono bg-background/50 px-1 rounded">"Ready"</span> status</li>
                          <li>Test core application functionality</li>
                        </ul>
                      </li>
                    </ol>
                  </div>
                </div>
                <div className="pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopyPublishChecklist}
                    className="w-full sm:w-auto"
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copy Publish Checklist
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Publish Checklist Fallback */}
          {publishChecklistError && publishChecklistFallbackText && (
            <div className="mb-4">
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>{publishChecklistError}</AlertTitle>
                <AlertDescription className="mt-2">
                  <Textarea
                    value={publishChecklistFallbackText}
                    readOnly
                    className="mt-2 font-mono text-xs h-48"
                    onClick={(e) => (e.target as HTMLTextAreaElement).select()}
                  />
                </AlertDescription>
              </Alert>
            </div>
          )}

          {/* Share Fallback */}
          {shareError && shareFallbackText && (
            <div className="mb-4">
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>{shareError}</AlertTitle>
                <AlertDescription className="mt-2">
                  <Textarea
                    value={shareFallbackText}
                    readOnly
                    className="mt-2 font-mono text-xs h-48"
                    onClick={(e) => (e.target as HTMLTextAreaElement).select()}
                  />
                </AlertDescription>
              </Alert>
            </div>
          )}

          {/* Runtime Configuration Issue */}
          {runtimeEnvMessage && runtimeEnvMessage.includes('missing') && (
            <div className="mb-4">
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Runtime Configuration Issue</AlertTitle>
                <AlertDescription className="mt-2 text-xs">
                  {runtimeEnvMessage}
                </AlertDescription>
              </Alert>
            </div>
          )}

          {/* Errors List */}
          <ScrollArea className="flex-1">
            <div className="space-y-2 pr-4">
              {errors.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  No errors captured yet
                </div>
              ) : (
                errors.map((error, index) => (
                  <Card key={`${error.timestamp}-${index}`} className="border-destructive/50">
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant={getTypeColor(error.type)} className="shrink-0">
                              {error.type}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {new Date(error.timestamp).toLocaleString()}
                            </span>
                          </div>
                          <CardTitle className="text-sm break-words">{error.context}</CardTitle>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="space-y-2">
                        <div className="text-sm font-mono bg-muted p-2 rounded break-words">
                          {error.message}
                        </div>
                        {error.detectedIssue && (
                          <Alert className="border-warning bg-warning/10">
                            <Power className="h-4 w-4 text-warning" />
                            <AlertTitle className="text-warning text-sm">
                              🔴 Detected Issue: {error.detectedIssue}
                            </AlertTitle>
                            {error.detectedCanisterId && (
                              <AlertDescription className="text-xs mt-1">
                                Canister ID: {error.detectedCanisterId}
                              </AlertDescription>
                            )}
                          </Alert>
                        )}
                        {error.stack && (
                          <details className="text-xs">
                            <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                              Stack trace
                            </summary>
                            <pre className="mt-2 p-2 bg-muted rounded overflow-x-auto text-[10px] whitespace-pre-wrap break-words">
                              {error.stack}
                            </pre>
                          </details>
                        )}
                        {error.metadata && (
                          <details className="text-xs">
                            <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                              Connection details
                            </summary>
                            <div className="mt-2 p-2 bg-muted rounded space-y-1">
                              <div>Network: {error.metadata.network}</div>
                              <div>Host: {error.metadata.host}</div>
                              <div>Canister ID: {error.metadata.canisterId || '(not resolved)'}</div>
                              <div>Source: {error.metadata.canisterIdSource}</div>
                            </div>
                          </details>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
