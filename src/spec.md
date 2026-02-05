# Specification

## Summary
**Goal:** Let users organize quiz questions into named 100-question blocks (“patterns”) in the editor and select a block to practice in gameplay.

**Planned changes:**
- Add backend storage and APIs to fetch and set per-user, per-quiz block (100-question chunk) names by 0-based blockIndex.
- Update the Edit Questions (QuizEditor) UI with a 100-question block selector that filters the question list to the selected block range.
- Add UI to view/edit/save the name for the currently selected block, and show saved names in the block selector (range fallback when unnamed).
- Adjust “Add Question” in the editor so new questions are added within the currently selected 100-question block context.
- Update gameplay to prompt for a block selection before starting and run the quiz session only on questions in the selected block.
- Add/extend React Query hooks to (1) fetch question chunks (chunkSize=100, chunkIndex=N) and (2) fetch/update block names, with proper cache invalidation.

**User-visible outcome:** In the question editor, users can switch between 100-question blocks, name each block, and add questions within a chosen block. In gameplay, users can choose a named block to practice and only questions from that block are used.
