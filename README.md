<div align="center">

<img src="images/icon.png" alt="Git Time Machine" width="128" height="128" />

# Git Time Machine

**Travel through any file's Git history**

![VS Code](https://img.shields.io/badge/VS%20Code-%5E1.125.0-007ACC?logo=visualstudiocode&logoColor=white)
![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)

</div>

---

## See it in action

![Git Time Machine demo](https://raw.githubusercontent.com/farengeyt451/git-time-machine/master/images/demo/demo.gif)

## Why Git Time Machine?

I liked the **File History Travel** feature in the GitLens extension, until GitLens became bloatware. This is a reimplementation of that small but useful feature.

## A closer look

...

## Installation

### From a release (`.vsix`)

1. Download the latest `git-time-machine-vX.Y.Z.vsix` from the [Releases page](https://github.com/farengeyt451/git-time-machine/releases).
2. In VS Code, open the **Extensions** view (`Ctrl+Shift+X` / `Cmd+Shift+X`).
3. Click the **⋯** menu → **Install from VSIX…** and select the downloaded file.

> Or from the terminal: `code --install-extension git-time-machine-vX.Y.Z.vsix`

### From source

Build a `.vsix` straight from the source and install it into VS Code:

```bash
git clone https://github.com/farengeyt451/git-time-machine.git
cd git-time-machine
npm install
npm run package:vsix                                   # produces git-time-machine-<version>.vsix
code --install-extension git-time-machine-*.vsix       # install the built package
```

## Requirements

- [Git](https://git-scm.com/) installed and available on your `PATH`.
- The file you're viewing must be inside a Git repository.

## Development

Run `npm run watch` and press **F5** to launch the Extension Development Host.

## Known limitations

- Opening a revision from _before_ a rename may fail, because the revision is read using the file's current path.
- History is read once per file and refreshed when the file is saved.

## License

Released under the [MIT License](LICENSE).
