# Implementation Plan (MVP)

## Phase 0: Bootstrap (0.5 day)
1. Create extension scaffold in TypeScript.
2. Add command skeletons:
   - `scopeCoder.lockScope`
   - `scopeCoder.clearLock`
   - `scopeCoder.sendInstruction`
3. Add side-panel webview with prompt textbox + send button.

Done criteria:
- Extension activates and panel renders.

## Phase 1: Scope Highlighting (1-2 days)
1. Implement `ScopeProvider` interface and fallback chain.
2. Hook hover/selection events to compute active scope.
3. Render two decorations:
   - hover preview
   - locked scope
4. Add lock-on-click behavior.

Done criteria:
- In C files, hovering/clicking reliably highlights function/block/line scope.

## Phase 2: LLM Request/Response (1 day)
1. Add provider-agnostic LLM client + one adapter (Gemini Flash recommended first).
2. Build prompt payload from locked range + context window.
3. Validate response with schema.
4. Surface errors in panel.

Done criteria:
- Sending instruction returns replacement code string from model.

## Phase 3: Apply Edit Safely (0.5-1 day)
1. Build single-range replacement edit.
2. Show pre-apply preview in panel.
3. Apply via `WorkspaceEdit` on confirmation.
4. Keep lock state after apply for iterative edits.

Done criteria:
- Locked range is replaced and undo works correctly.

## Phase 4: Reliability Pass (1 day)
1. Add debounce and cancellation tokens for rapid hover changes.
2. Add stale-state protection (document version checks before apply).
3. Add basic tests:
   - scope resolution
   - response validation
   - edit range correctness

Done criteria:
- No incorrect edit outside lock range in tested scenarios.

## MVP Acceptance Test Script
1. Open C file with functions + nested loops.
2. Hover each scope type and verify visual preview.
3. Click one block to lock.
4. Enter instruction: "extract this loop body into helper function".
5. Receive replacement code.
6. Apply and verify only locked span changed.
7. Undo and confirm editor returns to original state.

## Known Tradeoffs for MVP
- Hover updates are event-driven, not continuous raw mouse tracking.
- Scope accuracy is good but not perfect until Tree-sitter phase.
- Single locked range only.

## Post-MVP Roadmap (Ordered)
1. Tree-sitter C provider for precise scope boundaries.
2. Voice input and push-to-talk.
3. Multiple proposals with numeric accept (`1/2/3/4`).
4. Multi-range selection.
5. Cross-file refactor mode.

