# Specification

## Summary
**Goal:** Replace the quiz translation help/flag control with a funny, bold “Plan-B” sign-style text while keeping the existing press-and-hold translation behavior.

**Planned changes:**
- Update the translation press-and-hold control UI in `frontend/src/quiz/QuizGameplay.tsx` to render a visually distinct, sign-like “Plan-B” text instead of the English flag icon and the “hilfe” label.
- Preserve all existing interaction and state behavior for translation (press/hold shows translation, release hides; loading/disabled behavior and indicator remain unchanged).
- Ensure any user-facing text for the control (e.g., tooltip/title/aria-label) is in English and communicates “press and hold to translate to English,” reflecting the new “Plan-B” presentation.

**User-visible outcome:** The translation control appears as a funny, bold “Plan-B” sign on the right side of the question header, remains press-and-hold usable to show/hide English translation, and no longer shows the flag icon or German “hilfe” text.
