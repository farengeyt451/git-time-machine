import * as path from 'path';
import * as vscode from 'vscode';
import {
  CommitInfo,
  getFileAtRevision,
  getFileHistory,
  getRepoRoot,
  hasUncommittedChanges,
  toRelativePath,
} from './git';

/** Custom URI scheme used for read-only historical file revisions. */
const SCHEME = 'gtm-timemachine';

/**
 * A time-travel session for a single working file.
 *
 * `position` is the index into the timeline:
 *   - 0            -> the current working file on disk (no diff)
 *   - k (k >= 1)   -> diff of `timeline[k - 1]` (left/older) vs the working file (right/newer)
 *
 * `timeline` holds the revisions worth comparing against the working file. When the
 * working tree is clean its content equals the newest commit, so that commit is
 * dropped to avoid an empty first diff; the first `prev` then lands on the genuinely
 * previous version.
 */
interface Session {
  fileFsPath: string;
  repoRoot: string;
  relPath: string;
  timeline: CommitInfo[];
  position: number;
}

const sessions = new Map<string, Session>();
const repoRootCache = new Map<string, string | undefined>();
let lastFileFsPath: string | undefined;

/** Resolves the contents of a `gtm-timemachine:` URI by asking Git for that revision. */
class RevisionContentProvider implements vscode.TextDocumentContentProvider {
  async provideTextDocumentContent(uri: vscode.Uri): Promise<string> {
    const { repoRoot, sha } = JSON.parse(decodeURIComponent(uri.query)) as {
      repoRoot: string;
      sha: string;
    };
    const relPath = uri.path.replace(/^\//, '');
    try {
      return await getFileAtRevision(repoRoot, sha, relPath);
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      return `// Git Time Machine: could not load "${relPath}" at ${sha.slice(0, 7)}.\n// ${message}`;
    }
  }
}

function revisionUri(repoRoot: string, sha: string, relPath: string): vscode.Uri {
  return vscode.Uri.from({
    scheme: SCHEME,
    // Keep the real path so the basename and language mode are detected correctly.
    path: '/' + relPath,
    query: encodeURIComponent(JSON.stringify({ repoRoot, sha })),
  });
}

/**
 * Determines which working file the buttons should act on. Works for plain file
 * editors and for the diff editors this extension opens (whose modified side is the
 * working file). Falls back to the most recently active file editor.
 */
function activeFilePath(): string | undefined {
  const editor = vscode.window.activeTextEditor;
  if (editor && editor.document.uri.scheme === 'file') {
    return editor.document.uri.fsPath;
  }

  const input = vscode.window.tabGroups.activeTabGroup.activeTab?.input;
  if (input instanceof vscode.TabInputTextDiff) {
    if (input.modified.scheme === 'file') {
      return input.modified.fsPath;
    }
    if (input.original.scheme === 'file') {
      return input.original.fsPath;
    }
  }

  return lastFileFsPath;
}

async function resolveRepoRoot(fileFsPath: string): Promise<string | undefined> {
  const dir = path.dirname(fileFsPath);
  if (repoRootCache.has(dir)) {
    return repoRootCache.get(dir);
  }
  const root = await getRepoRoot(fileFsPath);
  repoRootCache.set(dir, root);
  return root;
}

/** Loads (and caches) the session for a file, preserving the position if already tracked. */
async function ensureSession(fileFsPath: string): Promise<Session | undefined> {
  const root = await resolveRepoRoot(fileFsPath);
  if (!root) {
    return undefined;
  }

  const existing = sessions.get(fileFsPath);
  if (existing) {
    return existing;
  }

  const relPath = toRelativePath(root, fileFsPath);
  const commits = await getFileHistory(root, relPath);

  // If the working tree matches HEAD, the newest commit is identical to the file on
  // disk, so drop it; otherwise the working file is itself a distinct "newest" state
  // and we keep every commit (the first `prev` shows the uncommitted changes).
  let timeline = commits;
  if (commits.length > 0) {
    const dirty = await hasUncommittedChanges(root, relPath);
    if (!dirty) {
      timeline = commits.slice(1);
    }
  }

  const session: Session = { fileFsPath, repoRoot: root, relPath, timeline, position: 0 };
  sessions.set(fileFsPath, session);
  return session;
}

function setContext(enabled: boolean, canPrev: boolean, canCurrent: boolean, canNext: boolean): void {
  void vscode.commands.executeCommand('setContext', 'gtm:enabled', enabled);
  void vscode.commands.executeCommand('setContext', 'gtm:canPrev', canPrev);
  void vscode.commands.executeCommand('setContext', 'gtm:canCurrent', canCurrent);
  void vscode.commands.executeCommand('setContext', 'gtm:canNext', canNext);
}

async function updateContext(): Promise<void> {
  const fileFsPath = activeFilePath();
  if (!fileFsPath) {
    setContext(false, false, false, false);
    return;
  }

  const session = await ensureSession(fileFsPath);
  if (!session) {
    setContext(false, false, false, false);
    return;
  }

  const canPrev = session.position < session.timeline.length;
  const canCurrent = session.position > 0;
  const canNext = session.position > 0;
  setContext(true, canPrev, canCurrent, canNext);
}

/** Opens the editor view that matches the session's current position. */
async function showView(session: Session): Promise<void> {
  const fileUri = vscode.Uri.file(session.fileFsPath);

  if (session.position === 0) {
    await vscode.window.showTextDocument(fileUri, { preview: false });
    return;
  }

  const commit = session.timeline[session.position - 1];
  const left = revisionUri(session.repoRoot, commit.sha, session.relPath);
  const base = path.basename(session.relPath);
  const title = `${base} (${commit.sha.slice(0, 7)}) \u2194 ${base}`;
  await vscode.commands.executeCommand('vscode.diff', left, fileUri, title, { preview: true });
}

async function withSession(action: (session: Session) => void): Promise<void> {
  const fileFsPath = activeFilePath();
  if (!fileFsPath) {
    return;
  }

  const session = await ensureSession(fileFsPath);
  if (!session) {
    void vscode.window.showInformationMessage('Git Time Machine: this file is not in a Git repository.');
    return;
  }

  action(session);
  await showView(session);
  await updateContext();
}

async function goPrevious(): Promise<void> {
  await withSession((session) => {
    if (session.timeline.length === 0) {
      void vscode.window.showInformationMessage('Git Time Machine: no previous revision for this file.');
      return;
    }
    if (session.position < session.timeline.length) {
      session.position++;
    }
  });
}

async function goCurrent(): Promise<void> {
  await withSession((session) => {
    session.position = 0;
  });
}

async function goNext(): Promise<void> {
  await withSession((session) => {
    if (session.position > 0) {
      session.position--;
    }
  });
}

export function activate(context: vscode.ExtensionContext): void {
  const initial = vscode.window.activeTextEditor;
  if (initial?.document.uri.scheme === 'file') {
    lastFileFsPath = initial.document.uri.fsPath;
  }

  context.subscriptions.push(
    vscode.workspace.registerTextDocumentContentProvider(SCHEME, new RevisionContentProvider()),
    vscode.commands.registerCommand('gtm.prev', goPrevious),
    vscode.commands.registerCommand('gtm.current', goCurrent),
    vscode.commands.registerCommand('gtm.next', goNext),
    vscode.window.onDidChangeActiveTextEditor((editor) => {
      if (editor?.document.uri.scheme === 'file') {
        lastFileFsPath = editor.document.uri.fsPath;
      }
      void updateContext();
    }),
    vscode.window.tabGroups.onDidChangeTabs(() => void updateContext()),
    vscode.workspace.onDidSaveTextDocument((doc) => {
      // History may have changed; drop the cached session so it reloads on next use.
      sessions.delete(doc.uri.fsPath);
      void updateContext();
    }),
  );

  void updateContext();
}

export function deactivate(): void {
  sessions.clear();
  repoRootCache.clear();
}
