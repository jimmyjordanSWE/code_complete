# Scope Hover Coder (MVP)

Fast MVP extension for C/C++:
- Hover code to preview a logical scope highlight.
- Brace blocks (`{ ... }`) are highlighted as a unit.
- If no brace scope is found, the current line is highlighted.
- Lock scope and copy payload for chat-driven edits.

## Run
1. Open this folder in VS Code.
2. Press `F5` to launch Extension Development Host.
3. Open a `.c` or `.cpp` file in the dev host window.
4. Hover code to see scope highlight.

## Commands
- `Scope Hover: Clear Preview`
- `Scope Hover: Lock Scope (Toggle)`
- `Scope Hover: Unlock Scope`
- `Scope Hover: Copy Locked Scope`

## Settings
- `scopeHover.enabled` (default: `true`)
- `scopeHover.copyOnLock` (default: `true`)

## Lock Workflow (MVP)
1. Hover until desired scope is highlighted.
2. Run lock (`Ctrl+Alt+L`) to freeze scope (color changes to locked state).
3. Scope payload is copied to clipboard (file + line range + code block).
4. Paste into Codex/Copilot chat and write your instruction.
5. Press `Ctrl+Alt+L` again to unlock.
