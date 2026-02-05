import { useState } from 'react';
import { useInternetIdentity } from './hooks/useInternetIdentity';
import { useGetCallerUserProfile } from './hooks/useQueries';
import { useQueryClient } from '@tanstack/react-query';
import LoginButton from './components/LoginButton';
import ProfileSetup from './components/ProfileSetup';
import QuizEditor from './quiz/QuizEditor';
import QuizGameplay from './quiz/QuizGameplay';
import QuizResults from './quiz/QuizResults';
import { BookOpen, Edit, Play } from 'lucide-react';
import { Button } from './components/ui/button';
import { Toaster } from './components/ui/sonner';

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

  const [currentView, setCurrentView] = useState<View>('editor');
  const [sessionScore, setSessionScore] = useState({ correct: 0, total: 0 });

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

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col">
        <header className="border-b bg-card">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="h-6 w-6 text-primary" />
              <h1 className="text-xl font-bold">TN intelligence Quiz</h1>
            </div>
            <LoginButton />
          </div>
        </header>
        <main className="flex-1 flex items-center justify-center p-4">
          <div className="text-center max-w-md">
            <div className="mb-6 inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10">
              <BookOpen className="h-10 w-10 text-primary" />
            </div>
            <h2 className="text-3xl font-bold mb-4">Welcome to TN intelligence Quiz</h2>
            <p className="text-muted-foreground mb-8">
              Create your own quiz sets and master them through adaptive learning.
              Questions you get wrong will appear more often to help you learn.
            </p>
            <LoginButton />
          </div>
        </main>
        <footer className="border-t py-6 text-center text-sm text-muted-foreground">
          © 2026. Built with ❤️ using{' '}
          <a href="https://caffeine.ai" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">
            caffeine.ai
          </a>
        </footer>
        <Toaster />
      </div>
    );
  }

  if (showProfileSetup) {
    return <ProfileSetup onComplete={handleProfileComplete} />;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b bg-card sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-bold">TN intelligence Quiz</h1>
          </div>
          <div className="flex items-center gap-4">
            {userProfile && (
              <span className="text-sm text-muted-foreground hidden sm:inline">
                Welcome, {userProfile.name}
              </span>
            )}
            <LoginButton />
          </div>
        </div>
      </header>

      <nav className="border-b bg-card/50">
        <div className="container mx-auto px-4">
          <div className="flex gap-1">
            <Button
              variant={currentView === 'editor' ? 'default' : 'ghost'}
              onClick={() => setCurrentView('editor')}
              className="rounded-b-none"
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit Questions
            </Button>
            <Button
              variant={currentView === 'gameplay' ? 'default' : 'ghost'}
              onClick={handleStartQuiz}
              className="rounded-b-none"
            >
              <Play className="h-4 w-4 mr-2" />
              Play Quiz
            </Button>
          </div>
        </div>
      </nav>

      <main className="flex-1 container mx-auto px-4 py-8">
        {currentView === 'editor' && <QuizEditor quizId={ACTIVE_QUIZ_ID} onStartQuiz={handleStartQuiz} />}
        {currentView === 'gameplay' && (
          <QuizGameplay quizId={ACTIVE_QUIZ_ID} onComplete={handleQuizComplete} onBack={handleBackToEditor} />
        )}
        {currentView === 'results' && (
          <QuizResults
            score={sessionScore}
            onPlayAgain={handlePlayAgain}
            onBackToEditor={handleBackToEditor}
          />
        )}
      </main>

      <footer className="border-t py-6 text-center text-sm text-muted-foreground">
        © 2026. Built with ❤️ using{' '}
        <a href="https://caffeine.ai" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">
          caffeine.ai
        </a>
      </footer>
      <Toaster />
    </div>
  );
}
