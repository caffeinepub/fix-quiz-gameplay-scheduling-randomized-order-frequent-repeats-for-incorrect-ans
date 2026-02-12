# Specification

## Summary
**Goal:** Remove Study Article access from the Wrong Answers Review flow and fix the configuration issue blocking successful build/deploy.

**Planned changes:**
- Remove all UI affordances and click-to-open behavior for Study Articles from `frontend/src/quiz/WrongAnswersReview.tsx`.
- Remove the `studyArticle` field from wrong-answer review data structures and assembly flow (update `frontend/src/quiz/wrongAnswerTypes.ts` and the wrong-answers creation logic in `frontend/src/quiz/QuizGameplay.tsx`).
- Remove now-unused state/handlers/imports and view routing that enables opening `StudyArticleView` from wrong-answers review in `frontend/src/App.tsx` (including the `studyArticle` view branch), without impacting other views.
- Fix the project runtime/build configuration so builds succeed and deployed preview can initialize the backend actor; ensure the UI clearly surfaces a misconfigured `frontend/public/env.json` placeholder canister id (`PLACEHOLDER_BACKEND_CANISTER_ID`) as an actionable configuration problem.

**User-visible outcome:** Users can review wrong answers without any option to open Study Articles, and the app builds/deploys successfully with clear feedback if runtime canister configuration is still a placeholder.
