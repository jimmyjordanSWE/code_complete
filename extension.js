const path = require("path");
const vscode = require("vscode");

let previewLineDecorationType;
let lockedLineDecorationType;
let statusBarItem;

const braceIndexCache = new Map();

let currentPreview = null;
let lockedScope = null;
let lastRenderSignature = null;

function activate(context) {
  previewLineDecorationType = vscode.window.createTextEditorDecorationType({
    isWholeLine: true,
    backgroundColor: "rgba(40, 160, 255, 0.16)",
    overviewRulerColor: "rgba(58, 168, 255, 0.9)",
    overviewRulerLane: vscode.OverviewRulerLane.Right,
    rangeBehavior: vscode.DecorationRangeBehavior.ClosedClosed
  });

  lockedLineDecorationType = vscode.window.createTextEditorDecorationType({
    isWholeLine: true,
    backgroundColor: "rgba(49, 214, 144, 0.16)",
    overviewRulerColor: "rgba(49, 214, 144, 0.95)",
    overviewRulerLane: vscode.OverviewRulerLane.Right,
    rangeBehavior: vscode.DecorationRangeBehavior.ClosedClosed
  });

  const clearCommand = vscode.commands.registerCommand("scopeHover.clearPreview", () => {
    clearAllDecorations();
    currentPreview = null;
  });

  const lockCommand = vscode.commands.registerCommand("scopeHover.lockScope", async () => {
    if (!isEnabled()) {
      vscode.window.showInformationMessage("Scope Hover is OFF. Turn it on from the status bar first.");
      return;
    }

    if (lockedScope) {
      unlockScope();
      return;
    }

    const scope = getCurrentScopeCandidate();
    if (!scope) {
      vscode.window.showInformationMessage("Scope Hover: no scope to lock.");
      return;
    }

    lockedScope = scope;
    renderCurrentEditor();

    if (shouldCopyOnLock()) {
      await copyScopeToClipboard(scope);
      vscode.window.setStatusBarMessage("Scope locked and copied. Click chat and press Ctrl+V.", 2800);
    } else {
      vscode.window.setStatusBarMessage("Scope locked", 1800);
    }

    updateStatusBar();
  });

  const unlockCommand = vscode.commands.registerCommand("scopeHover.unlockScope", () => {
    unlockScope();
  });

  const copyLockedCommand = vscode.commands.registerCommand("scopeHover.copyLockedScope", async () => {
    if (!lockedScope) {
      vscode.window.showInformationMessage("Scope Hover: no locked scope to copy.");
      return;
    }
    await copyScopeToClipboard(lockedScope);
    vscode.window.setStatusBarMessage("Locked scope copied to clipboard", 1800);
  });

  const toggleCommand = vscode.commands.registerCommand("scopeHover.toggleEnabled", async () => {
    const next = !isEnabled();
    await setEnabled(next);

    if (!next) {
      lockedScope = null;
      currentPreview = null;
      clearAllDecorations();
    } else {
      updatePreviewFromActiveEditor();
    }

    updateStatusBar();
  });

  const openSettingsUiCommand = vscode.commands.registerCommand("scopeHover.openSettingsUI", async () => {
    openSettingsUi(context);
  });

  statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  statusBarItem.command = "scopeHover.toggleEnabled";
  statusBarItem.tooltip = "Toggle scope hover";
  statusBarItem.show();
  updateStatusBar();

  const selector = [
    { language: "c", scheme: "file" },
    { language: "cpp", scheme: "file" }
  ];

  const hoverProvider = vscode.languages.registerHoverProvider(selector, {
    provideHover(document, position) {
      if (!isEnabled() || lockedScope) {
        return undefined;
      }

      const editor = vscode.window.activeTextEditor;
      if (!editor || editor.document.uri.toString() !== document.uri.toString()) {
        return undefined;
      }

      updatePreviewForPosition(editor, position);
      return undefined;
    }
  });

  const onSelectionChange = vscode.window.onDidChangeTextEditorSelection((event) => {
    if (!isEnabled()) {
      return;
    }
    if (lockedScope) {
      return;
    }

    const editor = event.textEditor;
    const active = event.selections[0]?.active;
    if (!active) {
      return;
    }

    updatePreviewForPosition(editor, active);
  });

  const onEditorChange = vscode.window.onDidChangeActiveTextEditor(() => {
    if (!isEnabled()) {
      clearAllDecorations();
      return;
    }
    renderCurrentEditor();
  });

  const onDocChange = vscode.workspace.onDidChangeTextDocument((event) => {
    braceIndexCache.delete(event.document.uri.toString());

    if (lockedScope && lockedScope.editorUri === event.document.uri.toString()) {
      const startOk = lockedScope.range.start.line < event.document.lineCount;
      const endOk = lockedScope.range.end.line < event.document.lineCount;
      if (!startOk || !endOk) {
        unlockScope();
        return;
      }
    }

    const editor = vscode.window.activeTextEditor;
    if (!editor || editor.document.uri.toString() !== event.document.uri.toString()) {
      return;
    }

    renderCurrentEditor();
  });

  const onDocClose = vscode.workspace.onDidCloseTextDocument((document) => {
    braceIndexCache.delete(document.uri.toString());
    if (lockedScope && lockedScope.editorUri === document.uri.toString()) {
      unlockScope();
    }
  });

  const onConfigChange = vscode.workspace.onDidChangeConfiguration((event) => {
    if (!event.affectsConfiguration("scopeHover.enabled")) {
      return;
    }

    if (!isEnabled()) {
      lockedScope = null;
      currentPreview = null;
      clearAllDecorations();
    } else {
      renderCurrentEditor();
    }

    updateStatusBar();
  });

  updatePreviewFromActiveEditor();

  context.subscriptions.push(
    previewLineDecorationType,
    lockedLineDecorationType,
    clearCommand,
    lockCommand,
    unlockCommand,
    copyLockedCommand,
    toggleCommand,
    openSettingsUiCommand,
    statusBarItem,
    hoverProvider,
    onSelectionChange,
    onEditorChange,
    onDocChange,
    onDocClose,
    onConfigChange
  );
}

function deactivate() {
  clearAllDecorations();
  braceIndexCache.clear();
  lastRenderSignature = null;
}

function isEnabled() {
  return vscode.workspace.getConfiguration().get("scopeHover.enabled", true);
}

async function setEnabled(value) {
  const hasWorkspace = Array.isArray(vscode.workspace.workspaceFolders) && vscode.workspace.workspaceFolders.length > 0;
  const target = hasWorkspace ? vscode.ConfigurationTarget.Workspace : vscode.ConfigurationTarget.Global;
  await vscode.workspace.getConfiguration().update("scopeHover.enabled", value, target);
}

function getConfigTarget() {
  const hasWorkspace = Array.isArray(vscode.workspace.workspaceFolders) && vscode.workspace.workspaceFolders.length > 0;
  return hasWorkspace ? vscode.ConfigurationTarget.Workspace : vscode.ConfigurationTarget.Global;
}

async function updateConfigValue(key, value) {
  await vscode.workspace.getConfiguration().update(key, value, getConfigTarget());
}

function shouldCopyOnLock() {
  return vscode.workspace.getConfiguration().get("scopeHover.copyOnLock", true);
}

function updateStatusBar() {
  if (!statusBarItem) {
    return;
  }

  if (!isEnabled()) {
    statusBarItem.text = "$(eye-closed) Scope Hover: OFF";
    statusBarItem.backgroundColor = new vscode.ThemeColor("statusBarItem.warningBackground");
    return;
  }

  const lockSuffix = lockedScope ? " | LOCKED" : "";
  statusBarItem.text = `$(eye) Scope Hover: ON${lockSuffix}`;
  statusBarItem.backgroundColor = undefined;
}

function openSettingsUi(context) {
  const panel = vscode.window.createWebviewPanel(
    "scopeHoverSettings",
    "Scope Hover Settings",
    vscode.ViewColumn.Beside,
    { enableScripts: true }
  );

  const render = () => {
    const cfg = vscode.workspace.getConfiguration();
    const enabled = cfg.get("scopeHover.enabled", true);
    const copyOnLock = cfg.get("scopeHover.copyOnLock", true);
    const hoverDelay = cfg.get("editor.hover.delay", 0);
    const hoverSticky = cfg.get("editor.hover.sticky", false);

    panel.webview.html = getSettingsHtml({
      enabled,
      copyOnLock,
      hoverDelay,
      hoverSticky
    });
  };

  panel.webview.onDidReceiveMessage(async (msg) => {
    if (!msg || msg.type !== "save") {
      return;
    }

    await Promise.all([
      updateConfigValue("scopeHover.enabled", !!msg.payload.enabled),
      updateConfigValue("scopeHover.copyOnLock", !!msg.payload.copyOnLock),
      updateConfigValue("editor.hover.delay", Number.isFinite(msg.payload.hoverDelay) ? msg.payload.hoverDelay : 0),
      updateConfigValue("editor.hover.sticky", !!msg.payload.hoverSticky)
    ]);

    updateStatusBar();
    renderCurrentEditor();
    vscode.window.setStatusBarMessage("Scope Hover settings saved", 1600);
    render();
  });

  panel.onDidDispose(() => {
    // no-op
  });

  render();
}

function getSettingsHtml(values) {
  const enabledChecked = values.enabled ? "checked" : "";
  const copyOnLockChecked = values.copyOnLock ? "checked" : "";
  const hoverStickyChecked = values.hoverSticky ? "checked" : "";
  const safeHoverDelay = Number.isFinite(values.hoverDelay) ? values.hoverDelay : 0;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Scope Hover Settings</title>
  <style>
    body { font-family: var(--vscode-font-family); color: var(--vscode-editor-foreground); background: var(--vscode-editor-background); padding: 18px; }
    h2 { margin: 0 0 16px 0; font-size: 18px; }
    .row { margin-bottom: 14px; }
    label { display: flex; align-items: center; gap: 10px; font-size: 13px; }
    input[type="number"] { width: 120px; padding: 5px; background: var(--vscode-input-background); color: var(--vscode-input-foreground); border: 1px solid var(--vscode-input-border); }
    button { margin-top: 12px; padding: 7px 12px; border: 0; color: white; background: #0e639c; cursor: pointer; }
    .hint { opacity: 0.8; font-size: 12px; margin-top: 4px; }
    .kbd { background: rgba(128,128,128,0.2); border-radius: 4px; padding: 2px 5px; }
  </style>
</head>
<body>
  <h2>Scope Hover Settings</h2>

  <div class="row">
    <label><input id="enabled" type="checkbox" ${enabledChecked} /> Enable scope preview</label>
  </div>

  <div class="row">
    <label><input id="copyOnLock" type="checkbox" ${copyOnLockChecked} /> Copy scope to clipboard on lock</label>
    <div class="hint">Lock toggle hotkey: <span class="kbd">Ctrl+Alt+L</span></div>
  </div>

  <div class="row">
    <label for="hoverDelay">Editor hover delay (ms)</label>
    <input id="hoverDelay" type="number" min="0" step="1" value="${safeHoverDelay}" />
  </div>

  <div class="row">
    <label><input id="hoverSticky" type="checkbox" ${hoverStickyChecked} /> Sticky hover</label>
  </div>

  <button id="saveBtn">Save</button>

  <script>
    const vscode = acquireVsCodeApi();
    document.getElementById("saveBtn").addEventListener("click", () => {
      const payload = {
        enabled: document.getElementById("enabled").checked,
        copyOnLock: document.getElementById("copyOnLock").checked,
        hoverDelay: parseInt(document.getElementById("hoverDelay").value, 10) || 0,
        hoverSticky: document.getElementById("hoverSticky").checked
      };
      vscode.postMessage({ type: "save", payload });
    });
  </script>
</body>
</html>`;
}

function unlockScope() {
  lockedScope = null;
  renderCurrentEditor();
  updateStatusBar();
}

function updatePreviewFromActiveEditor() {
  const editor = vscode.window.activeTextEditor;
  if (!editor || !isEnabled()) {
    clearAllDecorations();
    return;
  }

  if (lockedScope) {
    renderCurrentEditor();
    return;
  }

  updatePreviewForPosition(editor, editor.selection.active);
}

function updatePreviewForPosition(editor, position) {
  const scope = getLogicalScope(editor.document, position);
  if (!scope) {
    if (currentPreview) {
      currentPreview = null;
      renderCurrentEditor();
    }
    return;
  }

  const nextPreview = {
    editorUri: editor.document.uri.toString(),
    range: scope.range
  };

  if (isSameScope(currentPreview, nextPreview)) {
    return;
  }

  currentPreview = nextPreview;
  renderCurrentEditor();
}

function renderCurrentEditor() {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    lastRenderSignature = null;
    return;
  }

  const editorUri = editor.document.uri.toString();
  let mode = "none";
  let range = null;

  if (isEnabled()) {
    if (lockedScope && lockedScope.editorUri === editorUri) {
      mode = "locked";
      range = lockedScope.range;
    } else if (currentPreview && currentPreview.editorUri === editorUri) {
      mode = "preview";
      range = currentPreview.range;
    }
  }

  const signature = buildRenderSignature(editorUri, mode, range);
  if (signature === lastRenderSignature) {
    return;
  }

  editor.setDecorations(previewLineDecorationType, []);
  editor.setDecorations(lockedLineDecorationType, []);

  if (mode === "none") {
    lastRenderSignature = signature;
    return;
  }

  if (mode === "locked") {
    editor.setDecorations(lockedLineDecorationType, makeLineHighlightRanges(range));
    lastRenderSignature = signature;
    return;
  }

  editor.setDecorations(previewLineDecorationType, makeLineHighlightRanges(range));
  lastRenderSignature = signature;
}

function clearAllDecorations() {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    lastRenderSignature = null;
    return;
  }
  editor.setDecorations(previewLineDecorationType, []);
  editor.setDecorations(lockedLineDecorationType, []);
  lastRenderSignature = null;
}

function isSameScope(a, b) {
  if (!a && !b) {
    return true;
  }
  if (!a || !b) {
    return false;
  }
  return buildRenderSignature(
    a.editorUri,
    "preview",
    a.range
  ) === buildRenderSignature(
    b.editorUri,
    "preview",
    b.range
  );
}

function buildRenderSignature(editorUri, mode, range) {
  if (!range) {
    return `${editorUri}|${mode}|none`;
  }
  return `${editorUri}|${mode}|${range.start.line}:${range.start.character}-${range.end.line}:${range.end.character}`;
}

function makeLineHighlightRanges(range) {
  const ranges = [];
  for (let line = range.start.line; line <= range.end.line; line += 1) {
    ranges.push(new vscode.Range(line, 0, line, 0));
  }
  return ranges;
}

function getCurrentScopeCandidate() {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    return null;
  }

  if (currentPreview && currentPreview.editorUri === editor.document.uri.toString()) {
    return currentPreview;
  }

  const scope = getLogicalScope(editor.document, editor.selection.active);
  if (!scope) {
    return null;
  }

  return {
    editorUri: editor.document.uri.toString(),
    range: scope.range
  };
}

async function copyScopeToClipboard(scope) {
  const uri = vscode.Uri.parse(scope.editorUri);
  const document = await vscode.workspace.openTextDocument(uri);
  const payload = buildClipboardPayload(document, scope.range);
  await vscode.env.clipboard.writeText(payload);
}

function buildClipboardPayload(document, range) {
  const workspaceFolder = vscode.workspace.getWorkspaceFolder(document.uri);
  const displayPath = workspaceFolder
    ? path.relative(workspaceFolder.uri.fsPath, document.uri.fsPath)
    : document.uri.fsPath;

  const startLine = range.start.line + 1;
  const endLine = range.end.line + 1;

  return [
    "You are a code review quality checker, bug finder, and refactor agent.",
    "Prioritize correctness first, then readability and performance.",
    "Use repository search/tools for missing context.",
    "",
    `TARGET_FILE: ${displayPath}`,
    `TARGET_LINES: ${startLine}-${endLine}`,
    "",
    "PROCESS_RULES:",
    "1) Infer intent from USER_REQUEST_LAST.",
    "2) Intent must be one of: performance | simplify | explain | refactor_pattern | bug_risk | other",
    "3) If ambiguous, ask 1 clarifying question before edits.",
    "4) First analyze only TARGET_FILE + TARGET_LINES.",
    "5) If more context is needed, name exact files/symbols.",
    "6) Edit boundary rules (strict):",
    "   - ONLY edit TARGET_FILE.",
    "   - ONLY edit lines inside TARGET_LINES.",
    "   - Any edit outside TARGET_LINES is FORBIDDEN.",
    "   - Do not rename/move symbols outside TARGET_LINES.",
    "7) Output format:",
    "   - Unified diff patch only for TARGET_FILE",
    "   - If no change needed, output exactly: NO_CHANGES",
    "8) Diff requirements:",
    "   - Use standard unified diff with @@ hunks",
    "   - Keep hunks anchored to TARGET_LINES",
    "   - Do not include explanations outside the diff",
    "",
    "USER_REQUEST_LAST:"
  ].join("\n");
}

function getLogicalScope(document, position) {
  const anchorLine = resolveAnchorLineForScope(document, position.line);
  const anchorPos = new vscode.Position(anchorLine, 0);
  const braceIndex = getBraceIndex(document);
  const containingScopes = getContainingBraceScopesByLine(braceIndex, anchorLine);

  if (containingScopes.length > 0) {
    return {
      range: rangeFromBracePairCached(braceIndex, document, containingScopes[0])
    };
  }

  const text = braceIndex.text;
  const forwardHeaderScope = findForwardHeaderBraceScope(document, text, anchorPos);
  if (forwardHeaderScope) {
    return {
      range: forwardHeaderScope
    };
  }

  return {
    range: fullLineRange(document, anchorLine, anchorLine)
  };
}

function resolveAnchorLineForScope(document, lineNumber) {
  const safeLine = Math.max(0, Math.min(lineNumber, document.lineCount - 1));
  if (!document.lineAt(safeLine).isEmptyOrWhitespace) {
    return safeLine;
  }

  const maxProbe = 24;
  for (let delta = 1; delta <= maxProbe; delta += 1) {
    const up = safeLine - delta;
    if (up >= 0 && !document.lineAt(up).isEmptyOrWhitespace) {
      return up;
    }

    const down = safeLine + delta;
    if (down < document.lineCount && !document.lineAt(down).isEmptyOrWhitespace) {
      return down;
    }
  }

  return safeLine;
}

function getBraceIndex(document) {
  const cacheKey = document.uri.toString();
  const existing = braceIndexCache.get(cacheKey);
  if (existing && existing.version === document.version) {
    return existing;
  }

  const text = document.getText();
  const pairs = findBracePairsWithLines(text);
  const next = {
    version: document.version,
    text,
    pairs,
    byLine: new Map(),
    pairRangeCache: new Map()
  };
  braceIndexCache.set(cacheKey, next);
  return next;
}

function findBracePairsWithLines(text) {
  const pairs = [];
  const stack = [];
  let state = "code";
  let stringQuote = null;
  let lineNumber = 0;

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    const next = text[i + 1];

    if (state === "line-comment") {
      if (ch === "\n") {
        state = "code";
        lineNumber += 1;
      }
      continue;
    }

    if (state === "block-comment") {
      if (ch === "*" && next === "/") {
        state = "code";
        i += 1;
      }
      if (ch === "\n") {
        lineNumber += 1;
      }
      continue;
    }

    if (state === "string") {
      if (ch === "\\") {
        i += 1;
        continue;
      }
      if (ch === stringQuote) {
        state = "code";
        stringQuote = null;
      }
      if (ch === "\n") {
        lineNumber += 1;
      }
      continue;
    }

    if (ch === "/" && next === "/") {
      state = "line-comment";
      i += 1;
      continue;
    }

    if (ch === "/" && next === "*") {
      state = "block-comment";
      i += 1;
      continue;
    }

    if (ch === "\"" || ch === "'") {
      state = "string";
      stringQuote = ch;
      continue;
    }

    if (ch === "{") {
      stack.push({ open: i, openLine: lineNumber });
    } else if (ch === "}" && stack.length > 0) {
      const open = stack.pop();
      pairs.push({
        open: open.open,
        close: i,
        openLine: open.openLine,
        closeLine: lineNumber,
        span: i - open.open
      });
    }

    if (ch === "\n") {
      lineNumber += 1;
    }
  }

  return pairs;
}

function getContainingBraceScopesByLine(braceIndex, lineNumber) {
  if (braceIndex.byLine.has(lineNumber)) {
    return braceIndex.byLine.get(lineNumber);
  }

  const containing = braceIndex.pairs
    .filter((pair) => pair.openLine <= lineNumber && lineNumber <= pair.closeLine)
    .sort((a, b) => a.span - b.span);

  braceIndex.byLine.set(lineNumber, containing);
  return containing;
}

function rangeFromBracePairCached(braceIndex, document, pair) {
  const key = `${pair.open}:${pair.close}`;
  if (braceIndex.pairRangeCache.has(key)) {
    return braceIndex.pairRangeCache.get(key);
  }

  const openPos = document.positionAt(pair.open);
  const closePos = document.positionAt(pair.close);
  const blockStartLine = findBlockStartLine(document, openPos.line);
  const range = fullLineRange(document, blockStartLine, closePos.line);

  braceIndex.pairRangeCache.set(key, range);
  return range;
}

function findForwardHeaderBraceScope(document, text, position) {
  const startLine = Math.max(0, position.line);
  const maxForwardLines = 30;
  const endLine = Math.min(document.lineCount - 1, startLine + maxForwardLines);
  const endOffset = document.offsetAt(new vscode.Position(endLine, document.lineAt(endLine).text.length));

  const startOffset = document.offsetAt(position);
  let parenDepth = 0;

  for (let i = startOffset; i <= endOffset; i += 1) {
    const ch = text[i];

    if (ch === "(") {
      parenDepth += 1;
      continue;
    }

    if (ch === ")" && parenDepth > 0) {
      parenDepth -= 1;
      continue;
    }

    if (ch === ";" && parenDepth === 0) {
      return null;
    }

    if (ch === "{") {
      const closeIndex = findMatchingBrace(text, i);
      if (closeIndex < 0) {
        return null;
      }

      const closePos = document.positionAt(closeIndex);
      const blockStartLine = findBlockStartLine(document, startLine);
      return fullLineRange(document, blockStartLine, closePos.line);
    }
  }

  return null;
}

function findMatchingBrace(text, openIndex) {
  let depth = 0;
  for (let i = openIndex; i < text.length; i += 1) {
    const ch = text[i];
    if (ch === "{") {
      depth += 1;
    } else if (ch === "}") {
      depth -= 1;
      if (depth === 0) {
        return i;
      }
    }
  }
  return -1;
}

function findBlockStartLine(document, fromLine) {
  let line = fromLine;
  const maxBackLines = 15;
  let inspected = 0;

  while (line > 0 && inspected < maxBackLines) {
    const previous = document.lineAt(line - 1).text.trim();
    if (!previous) {
      break;
    }
    if (previous.endsWith(";") || previous.endsWith("}") || previous.includes("{")) {
      break;
    }
    line -= 1;
    inspected += 1;
  }

  return line;
}

function fullLineRange(document, startLine, endLine) {
  const safeStart = Math.max(0, Math.min(startLine, document.lineCount - 1));
  const safeEnd = Math.max(0, Math.min(endLine, document.lineCount - 1));
  const from = Math.min(safeStart, safeEnd);
  const to = Math.max(safeStart, safeEnd);

  const start = new vscode.Position(from, 0);
  const endLineObj = document.lineAt(to);
  const end = new vscode.Position(to, endLineObj.text.length);
  return new vscode.Range(start, end);
}

module.exports = {
  activate,
  deactivate
};
