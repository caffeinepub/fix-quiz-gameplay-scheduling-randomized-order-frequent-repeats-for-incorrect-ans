import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useSingleRefreshAttempt } from '../hooks/useSingleRefreshAttempt';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Separator } from './ui/separator';
import { Alert, AlertDescription } from './ui/alert';
import { ScrollArea } from './ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';
import {
  X,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Copy,
  ChevronDown,
  ChevronUp,
  Activity,
  Server,
  FileJson,
  Package,
  Network,
  ClipboardCheck,
} from 'lucide-react';
import { toast } from 'sonner';
import { getBuildInfo } from '../utils/buildStamp';
import { getActorConnectionInfoAsync } from '../utils/actorConnectionInfo';
import { getRuntimeEnvStatus } from '../utils/runtimeEnvStatus';
import { evaluateReadiness } from '../utils/liveReadiness';
import { formatPublishChecklist } from '../utils/formatPublishChecklist';
import { shareLiveVerificationInfo } from '../utils/shareLiveVerificationInfo';
import { diagnostics } from '../utils/deploymentDiagnostics';
import { reloadRuntimeEnv } from '../utils/runtimeEnvReload';
import type { HealthCheckResult } from '../backend';

interface DeploymentDiagnosticsPanelProps {
  onClose?: () => void;
  focusPublishSection?: boolean;
}

export default function DeploymentDiagnosticsPanel({
  onClose,
  focusPublishSection = false,
}: DeploymentDiagnosticsPanelProps) {
  const queryClient = useQueryClient();
  const { isRefreshing, triggerRefresh } = useSingleRefreshAttempt();
  const [healthCheckResult, setHealthCheckResult] = useState<HealthCheckResult | null>(null);
  const [healthCheckError, setHealthCheckError] = useState<string | null>(null);
  const [isCheckingHealth, setIsCheckingHealth] = useState(false);
  const [connectionInfo, setConnectionInfo] = useState<Awaited<ReturnType<typeof getActorConnectionInfoAsync>> | null>(null);
  const [publishSectionOpen, setPublishSectionOpen] = useState(focusPublishSection);
  const [buildSectionOpen, setBuildSectionOpen] = useState(true);
  const [runtimeSectionOpen, setRuntimeSectionOpen] = useState(true);
  const [backendSectionOpen, setBackendSectionOpen] = useState(true);
  const [errorsSectionOpen, setErrorsSectionOpen] = useState(true);
  const [isVerifyingEnvJson, setIsVerifyingEnvJson] = useState(false);
  const [envJsonVerification, setEnvJsonVerification] = useState<{
    canisterId: string | null;
    isPlaceholder: boolean;
    isEmpty: boolean;
    message: string;
  } | null>(null);

  const buildInfo = getBuildInfo();
  const runtimeEnvStatus = getRuntimeEnvStatus();

  // Load connection info on mount
  useEffect(() => {
    getActorConnectionInfoAsync().then(setConnectionInfo);
  }, []);

  // Focus publish section when requested
  useEffect(() => {
    if (focusPublishSection) {
      setPublishSectionOpen(true);
    }
  }, [focusPublishSection]);

  const handleHealthCheck = async () => {
    setIsCheckingHealth(true);
    setHealthCheckError(null);
    setHealthCheckResult(null);

    try {
      // Refresh connection info to get latest canister ID
      const latestConnectionInfo = await getActorConnectionInfoAsync();
      setConnectionInfo(latestConnectionInfo);

      if (!latestConnectionInfo.canisterId) {
        throw new Error('Backend canister ID not resolved. Cannot perform health check.');
      }

      const actorQuery = queryClient.getQueryState(['actor']);
      const actor = actorQuery?.data as any;

      if (!actor) {
        throw new Error('Backend actor not initialized. Cannot perform health check.');
      }

      const result = await actor.healthCheck();
      setHealthCheckResult(result);
      toast.success('Health check passed');
    } catch (error: any) {
      const errorMessage = error.message || 'Unknown error';
      setHealthCheckError(errorMessage);
      toast.error('Health check failed');
    } finally {
      setIsCheckingHealth(false);
    }
  };

  const handleVerifyEnvJson = async () => {
    setIsVerifyingEnvJson(true);
    setEnvJsonVerification(null);

    try {
      const result = await reloadRuntimeEnv();
      
      const PLACEHOLDER = 'PLACEHOLDER_BACKEND_CANISTER_ID';
      const canisterId = result.canisterId || null;
      const isPlaceholder = canisterId === PLACEHOLDER;
      const isEmpty = !canisterId || canisterId.trim() === '';

      let message = '';
      if (result.success && canisterId && !isPlaceholder && !isEmpty) {
        message = `✓ /env.json contains valid backend canister ID: ${canisterId}`;
      } else if (isPlaceholder) {
        message = `⚠️ /env.json contains placeholder value "${PLACEHOLDER}" - Publish via Caffeine editor required`;
      } else if (isEmpty) {
        message = `⚠️ /env.json loaded but CANISTER_ID_BACKEND is not set - Publish via Caffeine editor required`;
      } else {
        message = `❌ ${result.message}`;
      }

      setEnvJsonVerification({
        canisterId,
        isPlaceholder,
        isEmpty,
        message,
      });

      if (result.success && canisterId && !isPlaceholder && !isEmpty) {
        toast.success('Runtime configuration verified');
      } else {
        toast.warning('Configuration issue detected');
      }
    } catch (error: any) {
      setEnvJsonVerification({
        canisterId: null,
        isPlaceholder: false,
        isEmpty: true,
        message: `❌ Failed to verify /env.json: ${error.message || 'Unknown error'}`,
      });
      toast.error('Verification failed');
    } finally {
      setIsVerifyingEnvJson(false);
    }
  };

  const handleReloadRuntimeConfig = async () => {
    try {
      const result = await reloadRuntimeEnv();
      
      if (result.success) {
        toast.success('Runtime configuration reloaded');
        // Refresh connection info
        const latestConnectionInfo = await getActorConnectionInfoAsync();
        setConnectionInfo(latestConnectionInfo);
        // Trigger actor reconnection
        queryClient.invalidateQueries({ queryKey: ['actor'] });
      } else {
        toast.error(result.message);
      }
    } catch (error: any) {
      toast.error(`Failed to reload: ${error.message || 'Unknown error'}`);
    }
  };

  const handleCopyChecklist = async () => {
    try {
      const checklist = await formatPublishChecklist(buildInfo);
      await navigator.clipboard.writeText(checklist);
      toast.success('Publish checklist copied to clipboard');
    } catch (error) {
      toast.error('Failed to copy checklist');
    }
  };

  const handleCopyVerificationInfo = async () => {
    try {
      const report = await shareLiveVerificationInfo(
        buildInfo,
        healthCheckResult,
        healthCheckError
      );
      await navigator.clipboard.writeText(report);
      toast.success('Verification info copied to clipboard');
    } catch (error) {
      toast.error('Failed to copy verification info');
    }
  };

  const readinessStatus = evaluateReadiness(
    connectionInfo?.canisterId || null,
    connectionInfo?.canisterIdSource || 'unknown',
    connectionInfo?.canisterIdResolutionError,
    healthCheckResult,
    healthCheckError
  );

  const capturedErrors = diagnostics.getErrors();

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] flex flex-col">
        <CardHeader className="flex-shrink-0">
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <ClipboardCheck className="h-5 w-5" />
                Deployment Diagnostics & Checklist
              </CardTitle>
              <CardDescription>
                Verify your live deployment configuration and backend connectivity
              </CardDescription>
            </div>
            {onClose && (
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CardHeader>

        <ScrollArea className="flex-1">
          <CardContent className="space-y-4">
            {/* Overall Readiness Status */}
            <Alert variant={readinessStatus.ready ? 'default' : 'destructive'}>
              <div className="flex items-start gap-2">
                {readinessStatus.ready ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                )}
                <div className="flex-1">
                  <div className="font-semibold">{readinessStatus.summary}</div>
                  <div className="text-sm mt-1 space-y-1">
                    {readinessStatus.details.map((detail, idx) => (
                      <div key={idx}>{detail}</div>
                    ))}
                  </div>
                  {readinessStatus.healthCheckResult && (
                    <div className="text-sm mt-2 space-y-1">
                      <div>Backend Version: {readinessStatus.healthCheckResult.backendVersion}</div>
                      <div>System Time: {readinessStatus.healthCheckResult.systemTime}</div>
                    </div>
                  )}
                </div>
              </div>
            </Alert>

            {/* Publish Checklist Section */}
            <Collapsible open={publishSectionOpen} onOpenChange={setPublishSectionOpen}>
              <Card>
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2 text-base">
                        <Package className="h-4 w-4" />
                        Publish Checklist
                      </CardTitle>
                      {publishSectionOpen ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="space-y-3">
                    <Alert>
                      <AlertDescription className="text-sm space-y-2">
                        <p className="font-semibold">Publishing must be done via the Caffeine editor:</p>
                        <ol className="list-decimal list-inside space-y-1 ml-2">
                          <li>Save all draft changes in the editor</li>
                          <li>Click "Publish to Live" in the Caffeine editor</li>
                          <li>Wait for deployment to complete</li>
                          <li>Open the live URL in a new browser tab</li>
                          <li>Use this diagnostics panel to verify the deployment</li>
                        </ol>
                        <p className="mt-2 text-muted-foreground">
                          The editor automatically injects the backend canister ID into /env.json during publish.
                        </p>
                      </AlertDescription>
                    </Alert>
                    <Button onClick={handleCopyChecklist} variant="outline" className="w-full">
                      <Copy className="h-4 w-4 mr-2" />
                      Copy Full Publish Checklist
                    </Button>
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>

            {/* Build Identity Section */}
            <Collapsible open={buildSectionOpen} onOpenChange={setBuildSectionOpen}>
              <Card>
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2 text-base">
                        <Package className="h-4 w-4" />
                        Build Identity
                      </CardTitle>
                      {buildSectionOpen ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="space-y-2 text-sm">
                    <div className="grid grid-cols-[120px_1fr] gap-2">
                      <span className="text-muted-foreground">Build ID:</span>
                      <span className="font-mono">{buildInfo.buildId}</span>
                      
                      <span className="text-muted-foreground">Version:</span>
                      <span className="font-mono">{buildInfo.version}</span>
                      
                      <span className="text-muted-foreground">Timestamp:</span>
                      <span className="font-mono">{buildInfo.timestamp}</span>
                      
                      <span className="text-muted-foreground">Deployment ID:</span>
                      <span className="font-mono">{buildInfo.deploymentId || 'N/A'}</span>
                      
                      <span className="text-muted-foreground">Environment:</span>
                      <span className="font-mono">{buildInfo.environment || 'N/A'}</span>
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>

            {/* Runtime Environment Section */}
            <Collapsible open={runtimeSectionOpen} onOpenChange={setRuntimeSectionOpen}>
              <Card>
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2 text-base">
                        <FileJson className="h-4 w-4" />
                        Runtime Environment (/env.json)
                      </CardTitle>
                      {runtimeSectionOpen ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="space-y-3">
                    <div className="space-y-2 text-sm">
                      <div className="grid grid-cols-[120px_1fr] gap-2">
                        <span className="text-muted-foreground">Load Status:</span>
                        <span className="flex items-center gap-2">
                          {runtimeEnvStatus.status === 'loaded' ? (
                            <>
                              <CheckCircle2 className="h-4 w-4 text-green-600" />
                              <span className="text-green-600 font-semibold">Loaded</span>
                            </>
                          ) : (
                            <>
                              <XCircle className="h-4 w-4 text-destructive" />
                              <span className="text-destructive font-semibold capitalize">{runtimeEnvStatus.status}</span>
                            </>
                          )}
                        </span>
                        
                        <span className="text-muted-foreground">Canister ID:</span>
                        <span className="font-mono">
                          {runtimeEnvStatus.canisterId || (
                            <span className="text-destructive font-semibold">(not set)</span>
                          )}
                        </span>
                        
                        <span className="text-muted-foreground">Is Placeholder:</span>
                        <span>
                          {runtimeEnvStatus.isPlaceholder ? (
                            <span className="text-destructive font-semibold">⚠️ Yes - Publish required</span>
                          ) : (
                            <span className="text-green-600">No</span>
                          )}
                        </span>
                        
                        <span className="text-muted-foreground">Message:</span>
                        <span>{runtimeEnvStatus.message}</span>
                      </div>

                      {runtimeEnvStatus.troubleshooting.length > 0 && (
                        <Alert variant="destructive" className="mt-3">
                          <AlertTriangle className="h-4 w-4" />
                          <AlertDescription>
                            <div className="font-semibold mb-1">Action Required:</div>
                            <ul className="list-disc list-inside space-y-1">
                              {runtimeEnvStatus.troubleshooting.map((step, idx) => (
                                <li key={idx} className="text-sm">{step}</li>
                              ))}
                            </ul>
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>

                    <Separator />

                    <div className="space-y-2">
                      <Button
                        onClick={handleVerifyEnvJson}
                        disabled={isVerifyingEnvJson}
                        variant="outline"
                        className="w-full"
                      >
                        {isVerifyingEnvJson ? (
                          <>
                            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                            Verifying...
                          </>
                        ) : (
                          <>
                            <FileJson className="h-4 w-4 mr-2" />
                            Verify /env.json (Cache-Busting Fetch)
                          </>
                        )}
                      </Button>

                      {envJsonVerification && (
                        <Alert variant={envJsonVerification.isPlaceholder || envJsonVerification.isEmpty ? 'destructive' : 'default'}>
                          <AlertDescription className="text-sm">
                            {envJsonVerification.message}
                            {(envJsonVerification.isPlaceholder || envJsonVerification.isEmpty) && (
                              <div className="mt-2 font-semibold">
                                → Solution: Publish via Caffeine editor to inject the real backend canister ID
                              </div>
                            )}
                          </AlertDescription>
                        </Alert>
                      )}

                      <Button
                        onClick={handleReloadRuntimeConfig}
                        variant="outline"
                        className="w-full"
                      >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Reload Runtime Config & Reconnect
                      </Button>
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>

            {/* Backend Connection Section */}
            <Collapsible open={backendSectionOpen} onOpenChange={setBackendSectionOpen}>
              <Card>
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2 text-base">
                        <Server className="h-4 w-4" />
                        Backend Connection
                      </CardTitle>
                      {backendSectionOpen ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="space-y-3">
                    <div className="space-y-2 text-sm">
                      <div className="grid grid-cols-[120px_1fr] gap-2">
                        <span className="text-muted-foreground">Resolved ID:</span>
                        <span className="font-mono break-all">
                          {connectionInfo?.canisterId || (
                            <span className="text-destructive font-semibold">(not resolved)</span>
                          )}
                        </span>
                        
                        <span className="text-muted-foreground">Source:</span>
                        <span className="font-mono">
                          {connectionInfo?.canisterIdSource || 'unknown'}
                          {connectionInfo?.canisterIdSource === 'window.__ENV__.CANISTER_ID_BACKEND' && (
                            <span className="ml-2 text-green-600 font-semibold">✓ Runtime config</span>
                          )}
                        </span>
                        
                        <span className="text-muted-foreground">Network:</span>
                        <span className="font-mono">{connectionInfo?.network || 'unknown'}</span>
                        
                        <span className="text-muted-foreground">Host:</span>
                        <span className="font-mono break-all">{connectionInfo?.host || 'unknown'}</span>
                      </div>

                      {connectionInfo?.canisterIdResolutionError && (
                        <Alert variant="destructive">
                          <AlertTriangle className="h-4 w-4" />
                          <AlertDescription className="text-sm">
                            <div className="font-semibold">Resolution Error:</div>
                            <div>{connectionInfo.canisterIdResolutionError}</div>
                          </AlertDescription>
                        </Alert>
                      )}

                      {connectionInfo?.canisterIdSourcesAttempted && connectionInfo.canisterIdSourcesAttempted.length > 0 && (
                        <div className="text-xs text-muted-foreground">
                          <div>Sources attempted: {connectionInfo.canisterIdSourcesAttempted.join(', ')}</div>
                        </div>
                      )}
                    </div>

                    <Separator />

                    <div className="space-y-2">
                      <Button
                        onClick={handleHealthCheck}
                        disabled={isCheckingHealth || !connectionInfo?.canisterId}
                        className="w-full"
                      >
                        {isCheckingHealth ? (
                          <>
                            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                            Checking...
                          </>
                        ) : (
                          <>
                            <Activity className="h-4 w-4 mr-2" />
                            Run Health Check
                          </>
                        )}
                      </Button>

                      {healthCheckResult && (
                        <Alert className="bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800">
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                          <AlertDescription className="text-sm">
                            <div className="font-semibold text-green-600">Backend is responding</div>
                            <div className="mt-1 space-y-1">
                              <div>Backend Version: {healthCheckResult.backendVersion.toString()}</div>
                              <div>System Time: {new Date(Number(healthCheckResult.systemTime) / 1_000_000).toISOString()}</div>
                            </div>
                          </AlertDescription>
                        </Alert>
                      )}

                      {healthCheckError && (
                        <Alert variant="destructive">
                          <XCircle className="h-4 w-4" />
                          <AlertDescription className="text-sm">
                            <div className="font-semibold">Health check failed</div>
                            <div className="mt-1">{healthCheckError}</div>
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>

            {/* Captured Errors Section */}
            {capturedErrors.length > 0 && (
              <Collapsible open={errorsSectionOpen} onOpenChange={setErrorsSectionOpen}>
                <Card className="border-destructive">
                  <CollapsibleTrigger asChild>
                    <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                      <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2 text-base text-destructive">
                          <AlertTriangle className="h-4 w-4" />
                          Captured Errors ({capturedErrors.length})
                        </CardTitle>
                        {errorsSectionOpen ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent>
                      <ScrollArea className="h-[200px]">
                        <div className="space-y-2">
                          {capturedErrors.map((error, idx) => (
                            <Alert key={idx} variant="destructive">
                              <AlertDescription className="text-xs">
                                <div className="font-semibold">{error.type}</div>
                                <div className="mt-1">{error.message}</div>
                                <div className="mt-1 text-muted-foreground">
                                  {new Date(error.timestamp).toLocaleString()}
                                </div>
                              </AlertDescription>
                            </Alert>
                          ))}
                        </div>
                      </ScrollArea>
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2 pt-2">
              <Button onClick={handleCopyVerificationInfo} variant="outline" className="flex-1">
                <Copy className="h-4 w-4 mr-2" />
                Copy Verification Info
              </Button>
              {isRefreshing ? (
                <Button disabled className="flex-1">
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Refreshing...
                </Button>
              ) : (
                <Button onClick={triggerRefresh} variant="outline" className="flex-1">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Hard Refresh
                </Button>
              )}
            </div>
          </CardContent>
        </ScrollArea>
      </Card>
    </div>
  );
}
