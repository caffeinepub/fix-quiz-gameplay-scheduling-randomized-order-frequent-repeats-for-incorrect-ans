import { BookOpen } from 'lucide-react';

export default function AppHeaderBrand() {
  return (
    <div className="flex items-center gap-3">
      <BookOpen className="h-8 w-8 text-primary" />
      <div className="flex flex-col">
        <h1 className="text-2xl font-bold text-foreground leading-tight">Quiz Master</h1>
        <div className="text-xs text-muted-foreground leading-tight mt-0.5">
          <div>Einbürgerungstest Kanton Aargau</div>
          <div>gültig ab 29.09.2025</div>
        </div>
      </div>
    </div>
  );
}
