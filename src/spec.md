# Specification

## Summary
**Goal:** Prevent the Quiz Editor from losing in-progress question edits when the browser tab/window loses focus, when questions refetch/update in the background (including after JPG attachment flows), and after accidental reloads—by avoiding overwriting unsaved local edits and adding draft persistence per quiz.

**Planned changes:**
- Disable refetch-on-window-focus (and any similar focus-driven refetch) for the questions query used by the Quiz Editor so tab switching does not trigger a refetch that overwrites local edits.
- Guard the “sync localQuestions from server questions” logic so server updates/refetches do not overwrite local edits while unsaved changes exist; allow syncing again after a successful Save.
- Ensure any explicit user-triggered refresh/reload action (if present) requires confirmation before discarding unsaved edits.
- Add draft persistence for in-progress edits in browser storage keyed by quizId; restore on returning to the editor, prompt in English to resume/discard when server data differs, and clear the draft after successful Save.
- Include draft fields for question text, answers, correctAnswer, and attached JPG data needed to continue; if an image cannot be restored, show clear UI messaging without breaking other draft fields.

**User-visible outcome:** While editing questions (with or without a JPG), switching tabs or background updates won’t erase unsaved inputs; refreshes can restore a per-quiz draft, and users can choose to resume or discard it with English prompts.
