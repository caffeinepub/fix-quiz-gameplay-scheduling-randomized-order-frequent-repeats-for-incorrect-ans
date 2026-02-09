# Specification

## Summary
**Goal:** Roll back the app’s UI/UX to match Version 56 and label the build as v56.

**Planned changes:**
- Revert UI styling and layout changes introduced after Version 56 to restore a neutral Shadcn/Tailwind look across the app shell and key quiz screens (PreGameQuestionCountView, PreQuizSummaryView, QuizResults).
- Restore Version 56 header navigation behavior so “Play” and (admin) “Edit” are shown in start flow and non-game views, and hidden only during active in-game question answering.
- Update the displayed build/version identity in the UI to consistently show v56 (including the BuildIdentityFooter and any diagnostics build info).

**User-visible outcome:** The app looks and behaves like Version 56 again (including consistent styling and correct header action visibility), and the UI clearly reports the build as v56.
