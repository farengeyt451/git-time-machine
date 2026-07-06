<div align="center">

<img src="images/icon.png" alt="Git Time Machine" width="128" height="128" />

# Git Time Machine

**Travel through any file's Git history**

Three toolbar buttons — **◄ Previous · ⟳ History · Next ►** — let you step backward and forward through a file's commits and instantly diff each revision against your working copy.

![VS Code](https://img.shields.io/badge/VS%20Code-%5E1.125.0-007ACC?logo=visualstudiocode&logoColor=white)
![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)

</div>

---

## Why Git Time Machine?

See how any file changed over time - without leaving the editor. Open a file, then use the **◄ ⟳ ►** buttons in the title bar to jump backward and forward through its history and diff each revision against your current copy.

## Features

| Button | Icon | What it does |
| --- | :---: | --- |
| **Previous** | ◄ | Diffs your file against an ever-older revision. Each click steps one commit further back in time. |
| **History** | ⟳ | Opens a picker showing where you are in the file's history — jump straight to any revision, copy its full SHA, and see how far behind HEAD you are. |
| **Next** | ► | Steps one revision forward through history. Disabled until you've travelled back. |

- **Status-bar position** — an ambient `⟳ 3 behind HEAD (3/12)` readout shows where you are at a glance; click it to open the history picker.
- **Closing a diff resets** — shut the diff tab and the next **Previous** click starts one commit back again, not from where you left off.
- **Side-by-side diffs** — the historical revision (`filename (sha)`) on the left, your current file on the right.
- **Smart first step** — with a clean working tree, the first **Previous** click lands on the genuinely previous version (it skips the commit that's identical to your file). With uncommitted changes, it compares them against `HEAD` first.
- **Rename-aware history** — file history is collected with `git log --follow`, so renames are tracked.
- **Zero configuration** — no settings, no setup. It just works in any Git repository.

## Installation

### From a release (`.vsix`)

1. Download the latest `git-time-machine-vX.Y.Z.vsix` from the [Releases page](https://github.com/farengeyt451/git-time-machine/releases).
2. In VS Code, open the **Extensions** view (`Ctrl+Shift+X` / `Cmd+Shift+X`).
3. Click the **⋯** menu → **Install from VSIX…** and select the downloaded file.

> Or from the terminal: `code --install-extension git-time-machine-vX.Y.Z.vsix`

### From source

```bash
git clone https://github.com/farengeyt451/git-time-machine.git
cd git-time-machine
npm install
npm run watch     # then press F5 to launch the Extension Development Host
```

## Requirements

- [Git](https://git-scm.com/) installed and available on your `PATH`.
- The file you're viewing must be inside a Git repository.

## Known limitations

- Opening a revision from *before* a rename may fail, because the revision is read using the file's current path.
- History is read once per file and refreshed when the file is saved.

## License

Released under the [MIT License](LICENSE).
