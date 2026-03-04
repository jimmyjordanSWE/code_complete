# Scope-First Voice/Prompt Coding for VS Code (MVP Design)

## 1) Product Goal
Enable developers to edit code by intent, not typing, while still staying close to code structure.

The core loop is:
1. Hover to preview a logical code unit.
2. Click to lock selection.
3. Speak or type instruction.
4. LLM returns code edit for only that locked scope.
5. User applies edit.

## 2) Problem Statement
Current workflows are split:
- Manual coding: precise but slow.
- Full "vibe coding": fast but weak control over exact structure and quality.

This extension targets the middle ground: high control, low typing.

## 3) MVP Scope
MVP includes:
- Real-time visual highlight of hovered logical scope.
- Click-to-lock selected scope.
- Side-panel prompt box (typed input first; voice later).
- LLM call using locked scope + user instruction.
- Apply returned edit to the file.

MVP excludes:
- Auto-copy to clipboard.
- Multi-selection.
- Numbered multi-proposal accept (`1/2/3/4`).
- Cross-file refactor planning.
- Perfect AST accuracy for all edge cases.

## 4) Interaction Model
## 4.1 States
- `Idle`: no hover target.
- `HoverPreview`: scope under pointer is highlighted.
- `Locked`: clicked scope is frozen and highlighted differently.
- `Generating`: LLM request in progress.
- `Review`: proposed edit shown; user applies or rejects.

## 4.2 User Flow
1. User moves mouse in editor.
2. Extension computes best scope at position.
3. Scope gets preview highlight.
4. User clicks to lock it.
5. User types instruction in side panel and presses Send.
6. Extension calls LLM and receives code-only replacement.
7. Extension previews edit and applies on confirm.

## 5) Logical Unit Definition (MVP)
Priority order for C:
1. Function definition
2. Control block (`if`, `else`, `for`, `while`, `switch`, `do`)
3. Statement/block body
4. Single line fallback

Rules:
- Formatting should not change selected boundaries.
- Selection is structural where possible, line-based only as fallback.
- Comments are handled as nearest statement/block for MVP.

## 6) UX Requirements
- Hover preview must be visually clear (border + subtle background).
- Locked scope must be distinct from preview style.
- Latency target for scope highlight update: under 120 ms on normal files.
- LLM interaction must always indicate active locked range (file + line span).

## 7) LLM Contract (MVP)
Input:
- File path
- Language
- Locked range text
- Surrounding context window
- User instruction

Output:
- Replacement code for locked range only
- Optional short rationale

Hard constraint:
- No edits outside locked range in MVP.

## 8) Risks and Decisions (Early)
- No raw mousemove API in stable VS Code extension API for continuous tracking.
  - Decision: use hover/selection-driven updates and fast recompute on editor events.
- Scope detection quality may vary without dedicated parser.
  - Decision: ship with provider abstraction and improve parser later.
- Ambiguous instructions can produce low-quality edits.
  - Decision: include prompt guardrails and "show diff before apply."

## 9) Acceptance Criteria
- User can hover C code and see a structural scope highlight.
- User can click-lock a scope and keep it stable while typing prompt.
- User can send instruction and get a proposed edit for that scope.
- User can apply edit and see only locked range changed.

