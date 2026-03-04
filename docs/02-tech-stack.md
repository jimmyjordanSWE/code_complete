# Tech Stack and Architecture (MVP -> V1)

## 1) Core Stack
- Language: TypeScript
- Runtime: VS Code Extension Host (Node.js)
- UI: VS Code `WebviewView` (side panel)
- Build: `esbuild` (fast extension bundling)
- Validation: `zod` for strict LLM response schemas
- Testing: `@vscode/test-electron` + `vitest`

## 2) VS Code APIs to Use
- `window.createTextEditorDecorationType` for hover/lock visuals
- `TextEditor.setDecorations` for live highlighting
- `window.registerHoverProvider` as hover entry signal
- `window.onDidChangeTextEditorSelection` for click/lock tracking
- `commands.registerCommand` for explicit actions
- `WorkspaceEdit` + `workspace.applyEdit` for safe patch apply
- `window.registerWebviewViewProvider` for prompt UI

## 3) Scope Detection Strategy
Use a pluggable `ScopeProvider` interface:
- `getScopeAt(document, position): ScopeRange | null`

MVP provider chain:
1. `DocumentSymbolScopeProvider`
  - Uses `vscode.executeDocumentSymbolProvider` to map position to nearest symbol.
2. `BracketBlockScopeProvider`
  - Lightweight block detection around cursor for `if/for/while/switch` and `{...}` regions.
3. `LineFallbackScopeProvider`
  - Last-resort single-line range.

Future provider:
- `TreeSitterScopeProvider` (C grammar) for precise AST scopes.

## 4) LLM Integration
- Transport: direct HTTPS from extension host (provider adapters).
- Adapters: `GeminiAdapter`, `OpenAIAdapter`, local adapter placeholder.
- Settings-driven provider/model selection in `package.json` contributes.

Recommended MVP response format (JSON):
```json
{
  "replacement_code": "string",
  "summary": "optional string"
}
```

Schema-validate every response before applying edits.

## 5) Prompting Contract
- System prompt enforces:
  - Return code replacement for locked range only.
  - Preserve language syntax.
  - No markdown fences.
- User payload includes:
  - file path
  - language id
  - locked code
  - small surrounding context
  - instruction text

## 6) Edit Application Pipeline
1. Build single-range replacement from locked range.
2. Show inline diff/preview (MVP can be explicit confirm dialog + preview text).
3. Apply with `WorkspaceEdit`.
4. Keep undo stack intact via native editor operations.

## 7) Suggested Repo Layout
```text
src/
  extension.ts
  core/
    state.ts
    scope-provider.ts
    scope-types.ts
  scope/
    document-symbol-provider.ts
    bracket-provider.ts
    line-provider.ts
  llm/
    llm-client.ts
    adapters/
      gemini.ts
      openai.ts
  ui/
    panel-provider.ts
    panel/
      index.html
      panel.ts
  edits/
    apply-edit.ts
    preview.ts
```

## 8) Security and Privacy
- API keys stored in VS Code `SecretStorage`.
- Never send full file by default; send locked range + bounded context.
- Configurable telemetry off by default for MVP.

## 9) Why This Stack
- Fast implementation in native VS Code extension model.
- Clean path from "simple scope highlight" to AST-grade selection later.
- Keeps architecture ready for very fast model backends without UI rewrite.

