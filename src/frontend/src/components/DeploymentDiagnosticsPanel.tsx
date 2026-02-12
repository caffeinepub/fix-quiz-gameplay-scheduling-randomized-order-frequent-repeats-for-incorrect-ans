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
import { AlertCircle, Download, Trash2, X, Activity, CheckCircle, XCircle, Loader2, RefreshCw, Share2, Copy, Rocket, ExternalLink, Info } from 'lucide-react';
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
  const [connectionInfo, setConnectionInfo] = useState(getActorConnectionInfo());
  const [isLoadingConnectionInfo, setIsLoadingConnectionInfo] = useState(false);
  const [runtimeEnvStatus, setRuntimeEnvStatus] = useState(getRuntimeEnvStatusSync());
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copying' | 'success' | 'error'>('idle');
  const [copyChecklistStatus, setCopyChecklistStatus] = useState<'idle' | 'copying' | 'success' | 'error'>('idle');
  const [fallbackText, setFallbackText] = useState<string | null>(null);
  const [fallbackChecklistText, setFallbackChecklistText] = useState<string | null>(null);
  const publishSectionRef = useRef<HTMLDivElement>(null);

  const buildInfo = getBuildInfo();

  // Load async connection info on mount
  useEffect(() => {
    let mounted = true;
    setIsLoadingConnectionInfo(true);
    
    getActorConnectionInfoAsync().then(info => {
      if (mounted) {
        setConnectionInfo(info);
        setIsLoadingConnectionInfo(false);
      }
    });

    return () => { mounted = false; };
  }, []);

  // Load async runtime env status
  useEffect(() => {
    let mounted = true;
    
    inspectRuntimeEnv().then(status => {
      if (mounted) {
        setRuntimeEnvStatus({
          canisterIdPresent: status.canisterIdPresent,
          message: status.message,
        });
      }
    });

    return () => { mounted = false; };
  }, []);

  // Scroll to publish section if requested
  useEffect(() => {
    if (focusPublishSection && publishSectionRef.current) {
      setTimeout(() => {
        publishSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  }, [focusPublishSection]);

  const handleRunHealthCheck = async () => {
    setHealthCheckStatus('testing');
    setHealthCheckError(null);
    setHealthCheckResult(null);

    try {
      const actor = await createActorWithConfig();
      const result = await actor.healthCheck();
      setHealthCheckResult(result);
      setHealthCheckStatus('success');
    } catch (error: any) {
      const stoppedInfo = detectStoppedCanister(error);
      if (stoppedInfo.isStopped) {
        setHealthCheckError(formatStoppedCanisterMessage(stoppedInfo));
      } else {
        setHealthCheckError(error.message || 'Unknown error');
      }
      setHealthCheckStatus('error');
    }
  };

  const handleClearErrors = () => {
    diagnostics.clearErrors();
    setErrors([]);
  };

  const handleDownloadReport = () => {
    const report = diagnostics.getFormattedReport();
    const blob = new Blob([report], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `diagnostics-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleHardRefresh = () => {
    refreshToLatestBuild();
  };

  const handleCopyVerificationInfo = async () => {
    setCopyStatus('copying');
    setFallbackText(null);

    try {
      const verificationInfo = await shareLiveVerificationInfo(buildInfo, healthCheckResult, healthCheckError);
      
      // Try clipboard API first
      if (navigator.clipboard && navigator.clipboard.writeText) {
        try {
          await navigator.clipboard.writeText(verificationInfo);
          setCopyStatus('success');
          setTimeout(() => setCopyStatus('idle'), 2000);
          return;
        } catch (clipboardError) {
          // Clipboard failed, fall through to fallback
        }
      }

      // Fallback: show textarea
      setFallbackText(verificationInfo);
      setCopyStatus('idle');
    } catch (error) {
      setCopyStatus('error');
      setTimeout(() => setCopyStatus('idle'), 2000);
    }
  };

  const handleCopyPublishChecklist = async () => {
    setCopyChecklistStatus('copying');
    setFallbackChecklistText(null);

    try {
      const checklist = await formatPublishChecklist(buildInfo);
      
      // Try clipboard API first
      if (navigator.clipboard && navigator.clipboard.writeText) {
        try {
          await navigator.clipboard.writeText(checklist);
          setCopyChecklistStatus('success');
          setTimeout(() => setCopyChecklistStatus('idle'), 2000);
          return;
        } catch (clipboardError) {
          // Clipboard failed, fall through to fallback
        }
      }

      // Fallback: show textarea
      setFallbackChecklistText(checklist);
      setCopyChecklistStatus('idle');
    } catch (error) {
      setCopyChecklistStatus('error');
      setTimeout(() => setCopyChecklistStatus('idle'), 2000);
    }
  };

  const readinessStatus = evaluateReadiness(
    connectionInfo.canisterId,
    connectionInfo.canisterIdSource,
    connectionInfo.canisterIdResolutionError,
    healthCheckStatus === 'success' ? healthCheckResult : null,
    healthCheckStatus === 'error' ? healthCheckError : null
  );

  return (
    <Card className="w-full max-w-4xl mx-auto shadow-cyber">
      <CardHeader className="border-b border-border">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-2xl mb-2">Deployment Diagnostics & Publishing</CardTitle>
            <CardDescription>
              View deployment status, verify configuration, and access publishing instructions
            </CardDescription>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>
      </CardHeader>

      <ScrollArea className="max-h-[70vh]">
        <CardContent className="space-y-6 pt-6">
          {/* Build Information */}
          <div>
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Build Information
            </h3>
            <div className="bg-muted/50 p-4 rounded-lg space-y-2 text-sm font-mono">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Version:</span>
                <span className="font-semibold">{buildInfo.version}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Timestamp:</span>
                <span>{buildInfo.timestamp}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Deployment ID:</span>
                <span>{buildInfo.deploymentId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Environment:</span>
                <span>{buildInfo.environment}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Build ID:</span>
                <span className="text-xs">{buildInfo.buildId}</span>
              </div>
            </div>
          </div>

          {/* Backend Connection */}
          <div>
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Backend Connection
            </h3>
            <div className="bg-muted/50 p-4 rounded-lg space-y-2 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Backend Canister ID:</span>
                <span className="font-mono font-semibold">
                  {isLoadingConnectionInfo ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Loading...
                    </span>
                  ) : (
                    connectionInfo.canisterId || '(not resolved)'
                  )}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Resolution Source:</span>
                <span className="font-mono text-xs">{connectionInfo.canisterIdSource}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Network:</span>
                <Badge variant={connectionInfo.network === 'mainnet' ? 'default' : 'secondary'}>
                  {connectionInfo.network}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Host:</span>
                <span className="font-mono text-xs">{connectionInfo.host}</span>
              </div>
              {connectionInfo.canisterIdResolutionError && (
                <div className="pt-2 border-t border-border">
                  <span className="text-destructive text-xs">
                    Error: {connectionInfo.canisterIdResolutionError}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Runtime Environment Status */}
          <div>
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Runtime Environment Status
            </h3>
            <Alert variant={runtimeEnvStatus.canisterIdPresent ? 'default' : 'destructive'}>
              {runtimeEnvStatus.canisterIdPresent ? (
                <CheckCircle className="h-4 w-4" />
              ) : (
                <AlertCircle className="h-4 w-4" />
              )}
              <AlertTitle>
                {runtimeEnvStatus.canisterIdPresent ? 'Configured' : 'Configuration Issue'}
              </AlertTitle>
              <AlertDescription className="text-sm">
                {runtimeEnvStatus.message}
              </AlertDescription>
            </Alert>
          </div>

          {/* Backend Health Check */}
          <div>
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Backend Health Check
            </h3>
            <div className="space-y-3">
              <div className="flex gap-2">
                <Button
                  onClick={handleRunHealthCheck}
                  disabled={healthCheckStatus === 'testing'}
                  size="sm"
                  variant="outline"
                >
                  {healthCheckStatus === 'testing' ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Testing...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Run Health Check
                    </>
                  )}
                </Button>
                {healthCheckStatus !== 'idle' && (
                  <Badge variant={healthCheckStatus === 'success' ? 'default' : 'destructive'}>
                    {healthCheckStatus === 'success' ? 'Passed' : 'Failed'}
                  </Badge>
                )}
              </div>

              {healthCheckStatus === 'success' && healthCheckResult && (
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertTitle>Health Check Passed</AlertTitle>
                  <AlertDescription className="text-sm space-y-1">
                    <div>Backend Version: {healthCheckResult.backendVersion.toString()}</div>
                    <div>System Time: {new Date(Number(healthCheckResult.systemTime) / 1_000_000).toLocaleString()}</div>
                  </AlertDescription>
                </Alert>
              )}

              {healthCheckStatus === 'error' && healthCheckError && (
                <Alert variant="destructive">
                  <XCircle className="h-4 w-4" />
                  <AlertTitle>Health Check Failed</AlertTitle>
                  <AlertDescription className="text-sm">
                    {healthCheckError}
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </div>

          {/* Live Readiness */}
          <div ref={publishSectionRef}>
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Rocket className="h-5 w-5" />
              Publishing & Live Readiness
            </h3>
            
            <Alert variant={readinessStatus.ready ? 'default' : 'destructive'} className="mb-4">
              {readinessStatus.ready ? (
                <CheckCircle className="h-4 w-4" />
              ) : (
                <AlertCircle className="h-4 w-4" />
              )}
              <AlertTitle className="font-semibold">
                {readinessStatus.ready ? 'Ready for Live' : 'Not Ready for Live'}
              </AlertTitle>
              <AlertDescription className="space-y-2">
                <p className="text-sm">{readinessStatus.summary}</p>
                {readinessStatus.details && readinessStatus.details.length > 0 && (
                  <ul className="text-sm space-y-1 pl-4 list-disc">
                    {readinessStatus.details.map((detail, idx) => (
                      <li key={idx}>{detail}</li>
                    ))}
                  </ul>
                )}
              </AlertDescription>
            </Alert>

            <Alert className="mb-4 border-primary/50 bg-primary/5">
              <Info className="h-4 w-4" />
              <AlertTitle className="font-semibold">Important: Publishing via Caffeine Editor</AlertTitle>
              <AlertDescription className="space-y-2 text-sm">
                <p>
                  This app <strong>cannot self-publish</strong>. Publishing must be done through the <strong>Caffeine editor</strong>.
                </p>
                <p>
                  This panel provides diagnostics and verification tools to help you confirm a successful deployment, 
                  but the actual publish action happens in the editor.
                </p>
              </AlertDescription>
            </Alert>

            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={handleCopyPublishChecklist}
                  disabled={copyChecklistStatus === 'copying'}
                  size="sm"
                  variant="default"
                >
                  {copyChecklistStatus === 'copying' ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Copying...
                    </>
                  ) : copyChecklistStatus === 'success' ? (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4 mr-2" />
                      Copy Publishing Checklist
                    </>
                  )}
                </Button>

                <Button
                  onClick={handleCopyVerificationInfo}
                  disabled={copyStatus === 'copying'}
                  size="sm"
                  variant="outline"
                >
                  {copyStatus === 'copying' ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Copying...
                    </>
                  ) : copyStatus === 'success' ? (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Share2 className="h-4 w-4 mr-2" />
                      Copy Verification Info
                    </>
                  )}
                </Button>

                <Button
                  onClick={() => window.open('/PUBLISHING.md', '_blank')}
                  size="sm"
                  variant="outline"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View Full Guide
                </Button>
              </div>

              {fallbackChecklistText && (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Clipboard unavailable. Copy the checklist manually:
                  </p>
                  <Textarea
                    value={fallbackChecklistText}
                    readOnly
                    className="font-mono text-xs h-64"
                    onClick={(e) => e.currentTarget.select()}
                  />
                </div>
              )}

              {fallbackText && (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Clipboard unavailable. Copy the verification info manually:
                  </p>
                  <Textarea
                    value={fallbackText}
                    readOnly
                    className="font-mono text-xs h-64"
                    onClick={(e) => e.currentTarget.select()}
                  />
                </div>
              )}

              <div className="bg-muted/30 p-4 rounded-lg space-y-3 text-sm">
                <h4 className="font-semibold">Quick Publishing Steps:</h4>
                <ol className="space-y-2 pl-5 list-decimal">
                  <li>Return to the <strong>Caffeine editor</strong></li>
                  <li>Click the <strong>"Publish to Live"</strong> button</li>
                  <li>Ensure <code className="bg-muted px-1 py-0.5 rounded text-xs">/env.json</code> is configured with your backend canister ID (not placeholder)</li>
                  <li>Wait for deployment to complete</li>
                  <li>Open the live URL and verify functionality</li>
                  <li>Use this diagnostics panel to confirm readiness</li>
                </ol>
                <p className="text-muted-foreground pt-2">
                  For detailed instructions, copy the publishing checklist above or view the full guide.
                </p>
              </div>
            </div>
          </div>

          {/* Error Log */}
          {errors.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-destructive" />
                Error Log ({errors.length})
              </h3>
              <div className="space-y-3">
                <div className="flex gap-2">
                  <Button onClick={handleDownloadReport} size="sm" variant="outline">
                    <Download className="h-4 w-4 mr-2" />
                    Download Report
                  </Button>
                  <Button onClick={handleClearErrors} size="sm" variant="outline">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Clear Errors
                  </Button>
                </div>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {errors.map((error, idx) => (
                    <Alert key={idx} variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle className="text-sm font-semibold">
                        {error.context || 'Error'}
                        {error.detectedIssue && (
                          <Badge variant="destructive" className="ml-2">
                            {error.detectedIssue}
                          </Badge>
                        )}
                      </AlertTitle>
                      <AlertDescription className="text-xs font-mono mt-1">
                        {error.message}
                        {error.detectedCanisterId && (
                          <div className="mt-1 text-xs">
                            Canister: {error.detectedCanisterId}
                          </div>
                        )}
                      </AlertDescription>
                    </Alert>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-4 border-t border-border">
            <Button onClick={handleHardRefresh} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Hard Refresh
            </Button>
            <Button onClick={onClose} variant="default" size="sm">
              Close
            </Button>
          </div>
        </CardContent>
      </ScrollArea>
    </Card>
  );
}
