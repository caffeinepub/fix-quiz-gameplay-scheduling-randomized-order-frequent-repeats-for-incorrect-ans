# Specification

## Summary
**Goal:** Replace placeholder Study articles with substantive generated/stored article content, persist articles per question, and ensure the frontend reliably displays the real article (with clear errors on failure).

**Planned changes:**
- Update backend `generateArticle(questionText)` to return a non-placeholder study article with a title and multi-section content suitable for studying the specific question.
- Add backend persistence so generated articles are stored per question and returned consistently on subsequent requests, including across canister upgrades.
- Update the frontend Study article flow (Wrong Answers Review → Study Article View) to display the backend-returned article content and show a clear error state if generation fails (no placeholder-only fallback).

**User-visible outcome:** When reviewing wrong answers, clicking **Study** shows a readable, scrollable, substantive study article (title + multiple sections) for that question, and the article remains the same when revisited; if generation fails, the user sees an explicit error instead of placeholder text.
