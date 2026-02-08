import { useState, useEffect } from 'react';
import { diagnostics } from '../utils/deploymentDiagnostics';
import { getBuildInfo } from '../utils/buildStamp';
import { useActor } from '../hooks/useActor';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { ScrollArea } from './ui/scroll-area';
import { AlertCircle, Download, Trash2, X, Activity, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { Badge } from './ui/badge';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';

interface DeploymentDiagnosticsPanelProps {
  onClose: () => void;
}

export default function DeploymentDiagnosticsPanel({ onClose }: DeploymentDiagnosticsPanelProps) {
  const [errors, setErrors] = useState(diagnostics.getErrors());
  const [healthCheckStatus, setHealthCheckStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [healthCheckResult, setHealthCheckResult] = useState<{ backendVersion: string; systemTime: string } | null>(null);
  const [healthCheckError, setHealthCheckError] = useState<string | null>(null);
  const buildInfo = getBuildInfo();
  const { actor } = useActor();

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

  const handleTestBackend = async () => {
    if (!actor) {
      setHealthCheckStatus('error');
      setHealthCheckError('Actor not available - cannot test backend connection');
      diagnostics.captureError(
        'Backend health check failed: Actor not available',
        'DeploymentDiagnosticsPanel - Test Backend Connection',
        'actorInit'
      );
      return;
    }

    setHealthCheckStatus('testing');
    setHealthCheckError(null);
    setHealthCheckResult(null);

    try {
      const result = await actor.healthCheck();
      setHealthCheckStatus('success');
      setHealthCheckResult({
        backendVersion: result.backendVersion.toString(),
        systemTime: new Date(Number(result.systemTime) / 1_000_000).toISOString(),
      });
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

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'actorInit':
        return 'destructive';
      case 'runtime':
        return 'default';
      case 'unhandledRejection':
        return 'secondary';
      default:
        return 'outline';
    }
  };

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
              onClick={handleTestBackend}
              disabled={healthCheckStatus === 'testing'}
            >
              {healthCheckStatus === 'testing' ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Activity className="h-4 w-4 mr-2" />
              )}
              Test Backend Connection
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

          {/* Health Check Result */}
          {healthCheckStatus !== 'idle' && (
            <div className="mb-4">
              {healthCheckStatus === 'success' && healthCheckResult && (
                <Alert className="border-success bg-success/10">
                  <CheckCircle className="h-4 w-4 text-success" />
                  <AlertTitle className="text-success">Backend Connection Successful</AlertTitle>
                  <AlertDescription className="mt-2 space-y-1 text-sm">
                    <div>Backend Version: {healthCheckResult.backendVersion}</div>
                    <div>System Time: {healthCheckResult.systemTime}</div>
                    <div className="text-xs text-muted-foreground mt-2">
                      The backend canister is reachable and responding correctly.
                    </div>
                  </AlertDescription>
                </Alert>
              )}
              {healthCheckStatus === 'error' && (
                <Alert variant="destructive">
                  <XCircle className="h-4 w-4" />
                  <AlertTitle>Backend Connection Failed</AlertTitle>
                  <AlertDescription className="mt-2">
                    <div className="font-semibold">{healthCheckError}</div>
                    <div className="text-xs mt-2">
                      This indicates the canister cannot be reached or is not responding to queries.
                    </div>
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          {errors.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="font-medium">No errors captured</p>
                <p className="text-sm mt-2">Errors will appear here when they occur</p>
                <p className="text-xs mt-4 text-muted-foreground/70">
                  Build info is available for download even with no errors
                </p>
              </div>
            </div>
          ) : (
            <ScrollArea className="flex-1 border rounded-md">
              <div className="p-4 space-y-4">
                {errors.map((error, idx) => (
                  <div key={idx} className="border-l-4 border-destructive pl-4 py-2 bg-muted/30 rounded-r">
                    <div className="flex items-start justify-between mb-2 gap-2">
                      <div className="flex items-center gap-2">
                        <Badge variant={getTypeColor(error.type)} className="text-xs">
                          {error.type}
                        </Badge>
                        <span className="font-mono text-xs text-muted-foreground">
                          Error #{idx + 1}
                        </span>
                      </div>
                      <div className="font-mono text-xs text-muted-foreground">
                        {new Date(error.timestamp).toLocaleString()}
                      </div>
                    </div>
                    {error.context && (
                      <div className="text-sm text-muted-foreground mb-2 bg-background/50 p-2 rounded">
                        <strong>Context:</strong> {error.context}
                      </div>
                    )}
                    <div className="text-sm font-semibold mb-2">{error.message}</div>
                    {error.stack && (
                      <details className="mt-2">
                        <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                          Show stack trace
                        </summary>
                        <pre className="text-xs bg-background p-2 rounded overflow-x-auto mt-2 border">
                          {error.stack}
                        </pre>
                      </details>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
