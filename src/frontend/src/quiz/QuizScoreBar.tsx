interface QuizScoreBarProps {
  correct: number;
  answered: number;
}

export default function QuizScoreBar({ correct, answered }: QuizScoreBarProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border shadow-lg z-10 safe-area-pb">
      <div className="max-w-3xl mx-auto px-4 py-3">
        <div className="text-center text-sm font-medium">
          Score: <span className="text-primary">{correct}</span> / {answered} correct
        </div>
      </div>
    </div>
  );
}
