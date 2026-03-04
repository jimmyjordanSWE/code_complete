# Platform Decision: VS Code Extension vs Standalone Editor

## Recommendation
Build as a VS Code extension first.

Reason: it is the fastest path to validate your core idea (scope selection + lock + LLM edit) with the least engineering overhead.

## Decision Matrix
| Criterion | VS Code Extension | Standalone Editor (Electron/Monaco) |
|---|---|---|
| Time to MVP | Fast (days) | Slower (weeks) |
| Scope highlight + lock | Native decorations/events | Must build editor glue from scratch |
| File/project integration | Already solved | Must implement open/save/watch/workspace |
| Language services | Reuse existing providers | Must integrate LSP/parsers yourself |
| Build/run/debug features | Can ignore initially | Must intentionally exclude/guard |
| Distribution | VSIX | Full app packaging/updater |

## Practical Path
1. Ship extension MVP first (single-language C, single locked scope, prompt box, apply edit).
2. Keep core logic editor-agnostic (`scope engine`, `LLM client`, `edit engine` in separate module).
3. If the concept works, wrap the same core in a standalone shell later (Electron + Monaco or Tauri + Monaco).

## If You Still Want Standalone Now
Use:
- Electron
- Monaco Editor
- Node worker for scope detection + LLM calls

But expect extra work for:
- file tree/workspace model
- settings and secrets storage
- undo/redo consistency across programmatic edits
- packaging and auto-update

## Bottom Line
If the goal is proving "code-at-thought-speed with structural control", extension-first is lower risk and faster.  
Standalone is a phase-2 productization step, not the MVP.

