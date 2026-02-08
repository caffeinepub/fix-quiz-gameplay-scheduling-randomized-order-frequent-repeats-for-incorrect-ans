import { useState, useEffect } from 'react';
import { useInternetIdentity } from './hooks/useInternetIdentity';
import { useGetCallerUserProfile } from './hooks/useQueries';
import { useQueryClient } from '@tanstack/react-query';
import LoginButton from './components/LoginButton';
import ProfileSetup from './components/ProfileSetup';
import QuizEditor from './quiz/QuizEditor';
import QuizGameplay from './quiz/QuizGameplay';
import QuizResults from './quiz/QuizResults';
import DeploymentDiagnosticsPanel from './components/DeploymentDiagnosticsPanel';
import { BookOpen, Edit, Play, Bug, AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from './components/ui/button';
import { Toaster } from './components/ui/sonner';
import { Alert, AlertDescription, AlertTitle } from './components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/card';
import { diagnostics } from './utils/deploymentDiagnostics';
import { getBuildInfo } from './utils/buildStamp';
import { getActorConnectionInfo } from './utils/actorConnectionInfo';

type View = 'editor' | 'gameplay' | 'results';

const ACTIVE_QUIZ_ID = 'TN intelligence Quiz';

export default function App() {
  const { identity } = useInternetIdentity();
  const queryClient = useQueryClient();
  const isAuthenticated = !!identity;

  const {
    data: userProfile,
    isLoading: profileLoading,
    isFetched,
  } = useGetCallerUserProfile();

  const [currentView, setCurrentView] = useState<View>('gameplay');
  const [sessionScore, setSessionScore] = useState({ correct: 0, total: 0 });
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);

  // Check for debug flag in URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('debug') === 'true' || params.get('diagnostics') === 'true') {
      setShowDiagnostics(true);
    }
  }, []);

  // Monitor actor initialization state
  const actorQuery = queryClient.getQueryState(['actor', identity?.getPrincipal().toString()]);
  const actorError = actorQuery?.error as Error | undefined;
  const actorFailed = actorQuery?.status === 'error';

  // Capture actor initialization failures for diagnostics
  useEffect(() => {
    if (actorFailed && actorError) {
      const buildInfo = getBuildInfo();
      diagnostics.captureError(
        actorError,
        `Actor initialization failed at ${new Date().toISOString()} | Build: ${buildInfo.version} (${buildInfo.deploymentId}) | Environment: ${buildInfo.environment}`,
        'actorInit'
      );
    }
  }, [actorFailed, actorError]);

  const showProfileSetup = isAuthenticated && !profileLoading && isFetched && userProfile === null;

  const handleProfileComplete = () => {
    queryClient.invalidateQueries({ queryKey: ['currentUserProfile'] });
  };

  const handleStartQuiz = () => {
    setSessionScore({ correct: 0, total: 0 });
    setCurrentView('gameplay');
  };

  const handleQuizComplete = (correct: number, total: number) => {
    setSessionScore({ correct, total });
    setCurrentView('results');
  };

  const handleBackToEditor = () => {
    setCurrentView('editor');
  };

  const handlePlayAgain = () => {
    setSessionScore({ correct: 0, total: 0 });
    setCurrentView('gameplay');
  };

  const handleRetryConnection = async () => {
    setIsRetrying(true);
    
    // Capture retry attempt in diagnostics
    diagnostics.captureRetryAttempt(`User-initiated retry at ${new Date().toISOString()}`);
    
    // Clear the actor query cache to force re-initialization
    const actorQueryKey = ['actor', identity?.getPrincipal().toString()];
    queryClient.removeQueries({ queryKey: actorQueryKey });
    
    // Wait a moment for the query to be removed
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Invalidate to trigger refetch
    await queryClient.invalidateQueries({ queryKey: actorQueryKey });
    
    setIsRetrying(false);
  };

  // Render actor initialization error banner
  if (actorFailed) {
    const buildInfo = getBuildInfo();
    const connectionInfo = getActorConnectionInfo();
    
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <header className="border-b bg-card">
          <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <BookOpen className="h-5 w-5 sm:h-6 sm:w-6 text-primary shrink-0" />
              <h1 className="text-base sm:text-xl font-bold truncate">TN intelligence Quiz</h1>
            </div>
          </div>
        </header>
        <main className="flex-1 flex items-center justify-center p-4">
          <Card className="w-full max-w-2xl border-destructive">
            <CardHeader>
              <div className="flex items-start gap-3">
                <div className="rounded-full bg-destructive/10 p-2 shrink-0">
                  <AlertTriangle className="h-6 w-6 text-destructive" />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-destructive">Canister Connection Failed</CardTitle>
                  <CardDescription className="mt-2">
                    The application cannot connect to the backend canister on the Internet Computer network.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>What happened?</AlertTitle>
                <AlertDescription className="mt-2 space-y-2">
                  <p>
                    The gateway could not resolve the canister ID for this application. This typically means:
                  </p>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li>The canister was not successfully deployed to the network</li>
                    <li>The domain mapping is not yet propagated</li>
                    <li>There is a network connectivity issue</li>
                  </ul>
                </AlertDescription>
              </Alert>

              <div className="bg-muted/50 rounded-lg p-4 space-y-2 text-sm">
                <div className="font-semibold text-foreground">Technical Details:</div>
                <div className="space-y-1 text-muted-foreground font-mono text-xs">
                  <div><span className="text-foreground">Error:</span> {actorError?.message || 'Unknown error'}</div>
                  <div><span className="text-foreground">Time:</span> {new Date().toLocaleString()}</div>
                  <div><span className="text-foreground">Network:</span> {connectionInfo.network}</div>
                  <div><span className="text-foreground">Agent Host:</span> {connectionInfo.host}</div>
                  <div><span className="text-foreground">Backend Canister ID:</span> {connectionInfo.canisterId || '(not found)'}</div>
                  <div><span className="text-foreground">Build:</span> {buildInfo.version}</div>
                  <div><span className="text-foreground">Deployment ID:</span> {buildInfo.deploymentId}</div>
                  <div><span className="text-foreground">Environment:</span> {buildInfo.environment}</div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  onClick={handleRetryConnection}
                  disabled={isRetrying}
                  className="flex-1"
                >
                  {isRetrying ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Retrying...
                    </>
                  ) : (
                    'Retry Connection'
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowDiagnostics(true)}
                  className="flex-1"
                >
                  <Bug className="h-4 w-4 mr-2" />
                  View Diagnostics
                </Button>
              </div>

              <div className="text-xs text-muted-foreground text-center pt-2">
                If this error persists, the deployment may need to be restarted with a fresh canister ID.
              </div>
            </CardContent>
          </Card>
        </main>
        <footer className="border-t py-4 sm:py-6 text-center text-xs sm:text-sm text-muted-foreground px-4">
          © 2026. Built with ❤️ using{' '}
          <a href="https://caffeine.ai" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">
            caffeine.ai
          </a>
        </footer>
        <Toaster />
        {showDiagnostics && <DeploymentDiagnosticsPanel onClose={() => setShowDiagnostics(false)} />}
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col">
        <header className="border-b bg-card">
          <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <BookOpen className="h-5 w-5 sm:h-6 sm:w-6 text-primary shrink-0" />
              <h1 className="text-base sm:text-xl font-bold truncate">TN intelligence Quiz</h1>
            </div>
            <LoginButton />
          </div>
        </header>
        <main className="flex-1 flex items-center justify-center p-4">
          <div className="text-center max-w-md w-full">
            <div className="mb-6 inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-primary/10">
              <BookOpen className="h-8 w-8 sm:h-10 sm:w-10 text-primary" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold mb-4">Welcome to TN intelligence Quiz</h2>
            <p className="text-sm sm:text-base text-muted-foreground mb-8">
              Questions you get wrong will appear more often to help you learn.
            </p>
            <LoginButton />
          </div>
        </main>
        <footer className="border-t py-4 sm:py-6 text-center text-xs sm:text-sm text-muted-foreground px-4">
          © 2026. Built with ❤️ using{' '}
          <a href="https://caffeine.ai" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">
            caffeine.ai
          </a>
        </footer>
        <Toaster />
        {showDiagnostics && <DeploymentDiagnosticsPanel onClose={() => setShowDiagnostics(false)} />}
      </div>
    );
  }

  if (showProfileSetup) {
    return <ProfileSetup onComplete={handleProfileComplete} />;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b bg-card sticky top-0 z-10">
        <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <BookOpen className="h-5 w-5 sm:h-6 sm:w-6 text-primary shrink-0" />
            <h1 className="text-base sm:text-xl font-bold truncate">TN intelligence Quiz</h1>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            {userProfile && (
              <span className="text-xs sm:text-sm text-muted-foreground hidden sm:inline truncate max-w-[120px]">
                Welcome, {userProfile.name}
              </span>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowDiagnostics(true)}
              className="h-8 w-8"
              title="Open diagnostics"
            >
              <Bug className="h-4 w-4" />
            </Button>
            <LoginButton />
          </div>
        </div>
      </header>

      <nav className="border-b bg-card/50 sticky top-[57px] sm:top-[65px] z-10">
        <div className="container mx-auto px-3 sm:px-4">
          <div className="flex gap-1 items-center">
            <Button
              variant={currentView === 'editor' ? 'default' : 'ghost'}
              onClick={() => setCurrentView('editor')}
              className="rounded-b-none flex-1 sm:flex-none text-sm sm:text-base h-10 sm:h-auto"
              size="sm"
            >
              <Edit className="h-3.5 w-3.5 sm:h-4 sm:w-4 sm:mr-2" />
              <span className="hidden sm:inline">Admin</span>
            </Button>
            <Button
              variant={currentView === 'gameplay' ? 'default' : 'ghost'}
              onClick={handleStartQuiz}
              className="rounded-b-none flex-1 sm:flex-none text-sm sm:text-base h-10 sm:h-auto"
              size="sm"
            >
              <Play className="h-3.5 w-3.5 sm:h-4 sm:w-4 sm:mr-2" />
              <span className="hidden sm:inline">Play Quiz</span>
            </Button>
          </div>
        </div>
      </nav>

      <main className="flex-1 container mx-auto px-3 sm:px-4 py-4 sm:py-8">
        {currentView === 'editor' && <QuizEditor quizId={ACTIVE_QUIZ_ID} onStartQuiz={handleStartQuiz} />}
        {currentView === 'gameplay' && (
          <QuizGameplay 
            quizId={ACTIVE_QUIZ_ID} 
            onComplete={handleQuizComplete} 
            onBack={handleBackToEditor}
            isAdmin={true}
          />
        )}
        {currentView === 'results' && (
          <QuizResults
            score={sessionScore}
            onPlayAgain={handlePlayAgain}
            onBackToEditor={handleBackToEditor}
            isAdmin={true}
          />
        )}
      </main>

      <footer className="border-t py-4 sm:py-6 text-center text-xs sm:text-sm text-muted-foreground px-4">
        © 2026. Built with ❤️ using{' '}
        <a href="https://caffeine.ai" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">
          caffeine.ai
        </a>
      </footer>
      
      <Toaster />
      {showDiagnostics && <DeploymentDiagnosticsPanel onClose={() => setShowDiagnostics(false)} />}
    </div>
  );
}
