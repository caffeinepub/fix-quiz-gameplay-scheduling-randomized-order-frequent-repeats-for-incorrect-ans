import { useState, useEffect } from 'react';
import { useInternetIdentity } from './hooks/useInternetIdentity';
import { useGetCallerUserProfile, useIsAdmin } from './hooks/useQueries';
import { useActor } from './hooks/useActor';
import LoginButton from './components/LoginButton';
import ProfileSetup from './components/ProfileSetup';
import QuizEditor from './quiz/QuizEditor';
import DeploymentDiagnosticsPanel from './components/DeploymentDiagnosticsPanel';
import { Loader2, AlertCircle, RefreshCw, Copy, CheckCircle2, ClipboardCheck } from 'lucide-react';
import { Button } from './components/ui/button';
import { Alert, AlertDescription, AlertTitle } from './components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/card';
import { Separator } from './components/ui/separator';
import PendingUpdateBanner from './components/PendingUpdateBanner';
import BuildIdentityFooter from './components/BuildIdentityFooter';
import AppHeaderBrand from './components/AppHeaderBrand';
import { ManualBackendCanisterIdOverridePanel } from './components/ManualBackendCanisterIdOverridePanel';
import { getRuntimeEnvStatus } from './utils/runtimeEnvStatus';
import { reloadRuntimeEnv } from './utils/runtimeEnvReload';
import { shareLiveVerificationInfo } from './utils/shareLiveVerificationInfo';
import { getBuildInfo } from './utils/buildStamp';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { HealthCheckResult } from './backend';

function App() {
  const { identity, isInitializing: authInitializing } = useInternetIdentity();
  const { actor, isFetching: actorFetching } = useActor();
  const queryClient = useQueryClient();
  const isAuthenticated = !!identity;

  const {
    data: userProfile,
    isLoading: profileLoading,
    isFetched: profileFetched,
  } = useGetCallerUserProfile();

  const { data: isAdmin, isLoading: isAdminLoading } = useIsAdmin();

  const [actorInitError, setActorInitError] = useState<Error | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);
  const [isReloadingEnv, setIsReloadingEnv] = useState(false);
  const [reloadEnvMessage, setReloadEnvMessage] = useState<string | null>(null);
  const [diagnosticsReport, setDiagnosticsReport] = useState<string | null>(null);
  const [isCopyingReport, setIsCopyingReport] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [showDiagnosticsPanel, setShowDiagnosticsPanel] = useState(false);

  // Health check query for diagnostics
  const healthCheckQuery = useQuery<HealthCheckResult>({
    queryKey: ['healthCheck'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.healthCheck();
    },
    enabled: false, // Only run manually
    retry: false,
  });

  // Capture actor initialization errors
  useEffect(() => {
    if (actorFetching) {
      setActorInitError(null);
    }
  }, [actorFetching]);

  useEffect(() => {
    if (!actorFetching && !actor) {
      const runtimeEnvStatus = getRuntimeEnvStatus();
      if (runtimeEnvStatus.status === 'loading') {
        // Don't set error while runtime env is loading
        return;
      }
      setActorInitError(new Error('Actor initialization failed'));
    }
  }, [actor, actorFetching]);

  // Auto-retry when runtime env.json transitions to loaded
  useEffect(() => {
    const runtimeEnvStatus = getRuntimeEnvStatus();
    if (
      actorInitError &&
      runtimeEnvStatus.status === 'loaded' &&
      !runtimeEnvStatus.isPlaceholder &&
      runtimeEnvStatus.canisterId
    ) {
      console.log('[App] Runtime env.json is now valid, triggering auto-retry...');
      handleRetry();
    }
  }, [actorInitError]);

  const handleRetry = () => {
    setIsRetrying(true);
    setActorInitError(null);
    setReloadEnvMessage(null);
    
    // Force actor re-initialization by reloading the page
    // This is the most reliable way to ensure all state is reset
    setTimeout(() => {
      window.location.reload();
    }, 100);
  };

  const handleReloadRuntimeEnv = async () => {
    setIsReloadingEnv(true);
    setReloadEnvMessage(null);
    
    try {
      const result = await reloadRuntimeEnv();
      setReloadEnvMessage(result.message);
      
      if (result.success) {
        // If reload succeeded, trigger retry after a short delay
        setTimeout(() => {
          handleRetry();
        }, 1000);
      }
    } catch (error: any) {
      setReloadEnvMessage(`Error: ${error.message || 'Unknown error'}`);
    } finally {
      setIsReloadingEnv(false);
    }
  };

  const handleCopyDiagnostics = async () => {
    setIsCopyingReport(true);
    setCopySuccess(false);
    
    try {
      const buildInfo = getBuildInfo();
      const report = await shareLiveVerificationInfo(
        buildInfo,
        healthCheckQuery.data || null,
        healthCheckQuery.error ? String(healthCheckQuery.error) : null
      );
      
      setDiagnosticsReport(report);
      await navigator.clipboard.writeText(report);
      setCopySuccess(true);
      
      setTimeout(() => {
        setCopySuccess(false);
      }, 3000);
    } catch (error) {
      console.error('Failed to copy diagnostics:', error);
    } finally {
      setIsCopyingReport(false);
    }
  };

  const handleProfileSetupComplete = () => {
    // Invalidate profile query to refetch
    queryClient.invalidateQueries({ queryKey: ['currentUserProfile'] });
  };

  // Show loading while auth or actor is initializing
  const isInitializing = authInitializing || actorFetching;

  // Check runtime env status
  const runtimeEnvStatus = getRuntimeEnvStatus();
  const isRuntimeEnvLoading = runtimeEnvStatus.status === 'loading';

  // Prioritize runtime env loading state
  if (isRuntimeEnvLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              Loading Configuration
            </CardTitle>
            <CardDescription>
              Loading runtime environment configuration...
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Please wait while the application loads its configuration from the server.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show configuration error screen if actor failed to initialize
  if (actorInitError && !isRetrying) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-2xl space-y-4">
          <Card className="border-destructive">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <AlertCircle className="h-5 w-5" />
                Configuration Error
              </CardTitle>
              <CardDescription>
                The backend canister ID could not be resolved from the runtime configuration.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>What's happening?</AlertTitle>
                <AlertDescription className="space-y-2">
                  <p>{runtimeEnvStatus.message}</p>
                  {runtimeEnvStatus.troubleshooting.length > 0 && (
                    <div className="mt-2">
                      <p className="font-semibold">How to fix this:</p>
                      <ul className="list-disc list-inside space-y-1 mt-1">
                        {runtimeEnvStatus.troubleshooting.map((step, idx) => (
                          <li key={idx} className="text-sm">{step}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </AlertDescription>
              </Alert>

              <Separator />

              <div className="space-y-3">
                <h3 className="font-semibold text-sm">Quick Actions</h3>
                
                <div className="flex flex-wrap gap-2">
                  <Button onClick={handleReloadRuntimeEnv} disabled={isReloadingEnv} variant="default">
                    {isReloadingEnv ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Reloading...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Reload Runtime Config
                      </>
                    )}
                  </Button>

                  <Button onClick={handleRetry} disabled={isRetrying} variant="outline">
                    {isRetrying ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Retrying...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Retry Connection
                      </>
                    )}
                  </Button>

                  <Button 
                    onClick={handleCopyDiagnostics} 
                    disabled={isCopyingReport}
                    variant="outline"
                  >
                    {isCopyingReport ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : copySuccess ? (
                      <>
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4 mr-2" />
                        Copy Diagnostics
                      </>
                    )}
                  </Button>
                </div>

                {reloadEnvMessage && (
                  <Alert variant={reloadEnvMessage.includes('Error') ? 'destructive' : 'default'}>
                    <AlertDescription>{reloadEnvMessage}</AlertDescription>
                  </Alert>
                )}
              </div>

              <Separator />

              <ManualBackendCanisterIdOverridePanel onRetry={handleRetry} />

              {diagnosticsReport && (
                <div className="mt-4">
                  <details className="text-xs">
                    <summary className="cursor-pointer font-semibold mb-2">
                      View Full Diagnostics Report
                    </summary>
                    <pre className="bg-muted p-3 rounded overflow-x-auto whitespace-pre-wrap break-words">
                      {diagnosticsReport}
                    </pre>
                  </details>
                </div>
              )}
            </CardContent>
          </Card>

          <BuildIdentityFooter />
        </div>
      </div>
    );
  }

  // Show loading screen during initialization
  if (isInitializing) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Initializing application...</p>
        </div>
      </div>
    );
  }

  // Show profile setup if authenticated but no profile
  const showProfileSetup = isAuthenticated && !profileLoading && profileFetched && userProfile === null;

  if (showProfileSetup) {
    return (
      <div className="min-h-screen bg-background">
        <ProfileSetup onComplete={handleProfileSetupComplete} />
      </div>
    );
  }

  // Main application
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <PendingUpdateBanner />
      
      <header className="border-b border-border bg-card/50 backdrop-blur supports-[backdrop-filter]:bg-card/50">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <AppHeaderBrand />
          <div className="flex items-center gap-2">
            {isAuthenticated && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDiagnosticsPanel(true)}
                className="hidden sm:flex"
              >
                <ClipboardCheck className="h-4 w-4 mr-2" />
                Deployment Checklist
              </Button>
            )}
            <LoginButton />
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-6">
        {!isAuthenticated ? (
          <Card className="max-w-md mx-auto mt-12">
            <CardHeader>
              <CardTitle>Welcome to Quiz Master</CardTitle>
              <CardDescription>
                Please log in to access the quiz editor and management features.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                This application requires authentication to ensure secure access to quiz content and user data.
              </p>
              <LoginButton />
            </CardContent>
          </Card>
        ) : isAdminLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : isAdmin ? (
          <QuizEditor quizId="default" onStartQuiz={() => {}} />
        ) : (
          <Card className="max-w-md mx-auto mt-12">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-destructive" />
                Access Denied
              </CardTitle>
              <CardDescription>
                You do not have permission to access this application.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                This application is restricted to administrators only. If you believe you should have access, please contact the application administrator.
              </p>
            </CardContent>
          </Card>
        )}
      </main>

      <BuildIdentityFooter />

      {/* Deployment Diagnostics Panel */}
      {showDiagnosticsPanel && (
        <DeploymentDiagnosticsPanel onClose={() => setShowDiagnosticsPanel(false)} />
      )}
    </div>
  );
}

export default App;
