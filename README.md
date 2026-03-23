<div align="center">
  <img src="assets/skuoty.png" alt="Skuoty Logo" width="96" />
  <h1>Skuoty</h1>
  <p><strong>AI-powered text processor triggered by a double Ctrl+C</strong></p>

  <p>
    <a href="https://github.com/LeonardoCiaccio/Skuoty/releases/latest"><img src="https://img.shields.io/github/v/release/LeonardoCiaccio/Skuoty?style=flat-square&color=6366f1" alt="Latest Release" /></a>
    <a href="https://github.com/LeonardoCiaccio/Skuoty/blob/main/LICENSE"><img src="https://img.shields.io/github/license/LeonardoCiaccio/Skuoty?style=flat-square&color=6366f1" alt="License" /></a>
    <a href="https://github.com/LeonardoCiaccio/Skuoty/actions"><img src="https://img.shields.io/github/actions/workflow/status/LeonardoCiaccio/Skuoty/build.yml?style=flat-square&color=6366f1" alt="Build Status" /></a>
    <a href="https://skuoty.com"><img src="https://img.shields.io/badge/website-skuoty.com-6366f1?style=flat-square" alt="Website" /></a>
  </p>

  <br />

  <!-- DEMO GIF PLACEHOLDER -->
  <!-- Place your demo GIF at: assets/demo.gif -->
  <!-- Then uncomment the line below -->
  <!-- <img src="assets/demo.gif" alt="Skuoty in action" width="680" /> -->

  <br />
</div>

---

## What is Skuoty?

Skuoty is a lightweight desktop application that intercepts your clipboard with a **double Ctrl+C** and lets you instantly transform the selected text using AI — without leaving the application you are working in.

Select any text, press Ctrl+C twice, choose a transformation plugin, and get the result back in under a second. No browser tab, no copy-pasting between windows.

It lives in the system tray and stays out of your way until you need it.

---

## Features

- **Double Ctrl+C trigger** — captures your selected text from any application via a global keyboard hook
- **Multiple AI providers** — Gemini, OpenAI, Anthropic, OpenRouter, and Ollama (local, no API key required)
- **Plugin system** — define your own text transformations with a simple JSON structure and prompt templates
- **Encrypted sessions** — all settings and API keys are stored encrypted on disk with AES-256-GCM + PBKDF2; no data is ever sent except to the AI provider you choose
- **Multi-session support** — create multiple profiles, each protected by its own password
- **Export / Import** — back up and restore your configuration with password encryption
- **Paste-back** — the result is pasted directly into the original window (Windows)
- **5 languages** — English, Italiano, Español, Français, Deutsch
- **Light & dark theme**
- **Runs in the system tray** — minimal footprint, always ready

---

## Demo

> **📌 GIF placeholder** — add your demo recording at `assets/demo.gif` and uncomment the `<img>` tag at the top of this file.

---

## Supported AI Providers

| Provider | Requires | Default Model |
|----------|----------|---------------|
| [Ollama](https://ollama.com) | Local server running | `llama3.2` |
| [Google Gemini](https://ai.google.dev) | API key | `gemini-2.0-flash` |
| [OpenAI](https://platform.openai.com) | API key | `gpt-4o-mini` |
| [Anthropic](https://console.anthropic.com) | API key | `claude-haiku-4-5-20251001` |
| [OpenRouter](https://openrouter.ai) | API key | `openai/gpt-4o-mini` |

Ollama is the recommended provider for fully local, private usage.

---

## Installation

### Pre-built binaries

Download the latest release from the [Releases page](https://github.com/LeonardoCiaccio/Skuoty/releases/latest).

| Platform | File |
|----------|------|
| Windows | `Skuoty Setup x.x.x.exe` (installer) or `Skuoty x.x.x.exe` (portable) |
| Linux (Debian/Ubuntu) | `skuoty_x.x.x_amd64.deb` |
| Linux (universal) | `Skuoty-x.x.x.AppImage` |
| macOS | `Skuoty-x.x.x.dmg` |

### Linux — AppImage

```bash
chmod +x Skuoty-*.AppImage
./Skuoty-*.AppImage
```

### Linux — deb

```bash
sudo dpkg -i skuoty_*_amd64.deb
```

---

## Requirements

### All platforms
- No runtime dependencies for API-based providers (Gemini, OpenAI, Anthropic, OpenRouter)

### For local AI (Ollama)
- [Ollama](https://ollama.com) installed and running
- At least one model pulled, e.g. `ollama pull llama3.2`

### Windows only
- PowerShell (required for paste-back functionality — included in all modern Windows versions)

---

## Getting Started

1. **Launch Skuoty** — a splash screen will ask you to create your first session
2. **Create a session** — give it a name and a password (min. 6 characters); your settings will be encrypted with this password
3. **Configure an AI provider** — go to ⚙ Settings → AI and enter your API key or configure Ollama
4. **Select text** in any application and **press Ctrl+C twice**
5. **Choose a plugin** from the toolbar and wait for the AI response
6. **Copy or paste** the result back

---

## Plugin System

Plugins are JSON objects that define a text transformation task. They are fully user-defined.

### Structure

```json
{
  "name": "my-plugin",
  "label": [{ "en": "My Plugin", "it": "Il Mio Plugin" }],
  "prompt": "Transform the following text: {{context}}",
  "options": "fixed value",
  "enabled": true
}
```

| Field | Type | Description |
|-------|------|-------------|
| `name` | `string` | Unique internal identifier |
| `label` | `{ [lang]: string }[]` | Localized display name |
| `prompt` | `string` | AI prompt template; use `{{context}}` for the selected text and `{{option}}` for the selected option |
| `options` | `string \| PluginOption[]` | Static string or dropdown options array |
| `enabled` | `boolean` | Whether the plugin is shown in the toolbar |

### Dropdown options example

```json
{
  "name": "translator",
  "label": [{ "en": "Translate", "it": "Traduci" }],
  "prompt": "Translate the following text to {{option}}: {{context}}",
  "options": [
    { "label": [{ "en": "English" }], "value": "English" },
    { "label": [{ "en": "Italian" }], "value": "Italian" }
  ],
  "enabled": true
}
```

Add plugins from **Settings → Plugins** by pasting the JSON directly.

---

## Sessions & Security

Skuoty stores all data — settings, API keys, plugins — in **encrypted session files** located at:

| Platform | Path |
|----------|------|
| Windows | `%APPDATA%\skuoty\sessions\<id>.skuoty` |
| Linux | `~/.config/skuoty/sessions/<id>.skuoty` |
| macOS | `~/Library/Application Support/skuoty/sessions/<id>.skuoty` |

### Encryption details

- Key derivation: **PBKDF2** (SHA-256, 100 000 iterations, random 16-byte salt)
- Encryption: **AES-256-GCM** (random 12-byte IV per write)
- Authentication: GCM tag detects any tampering
- The password is **never stored** — only used transiently to derive the key

---

## Export & Import

Back up your entire configuration from **Settings → Backup → Export to file**.

The exported file is a self-contained encrypted JSON blob protected by a separate password of your choice. Import it on any machine running Skuoty.

---

## Development

### Prerequisites

- [Node.js](https://nodejs.org) ≥ 20
- npm ≥ 10
- [Git](https://git-scm.com)
- For Linux builds on Windows: WSL with Ubuntu

### Clone and install

```bash
git clone https://github.com/LeonardoCiaccio/Skuoty.git
cd Skuoty
npm install
```

### Run in development mode

```bash
npm run dev
```

This starts the Vite dev server, the TypeScript watcher for the main process, and Electron with hot reload.

### Tech stack

| Layer | Technology |
|-------|-----------|
| Desktop framework | [Electron](https://electronjs.org) 33 |
| UI framework | [Vue](https://vuejs.org) 3 + Composition API |
| Build tool | [Vite](https://vitejs.dev) 6 |
| Language | [TypeScript](https://typescriptlang.org) 5 |
| Styling | [Tailwind CSS](https://tailwindcss.com) 3 |
| Icons | [Heroicons](https://heroicons.com) |
| Global hotkey | [uiohook-napi](https://github.com/kwhat/libuiohook) |

### Project structure

```
src/
├── main/                   # Electron main process
│   ├── index.ts            # App entry point, window management, IPC handlers
│   ├── hotkey.ts           # Global keyboard hook (double Ctrl+C)
│   ├── preload.ts          # Preload script for renderer ↔ main bridge
│   └── splash-preload.ts   # Preload script for splash window
├── renderer/               # Vue 3 frontend
│   ├── App.vue             # Root component
│   ├── components/         # UI components
│   ├── composables/        # Reusable logic (AI, sessions, crypto, i18n, settings)
│   ├── plugins/            # Built-in plugins (e.g. translator)
│   └── public/
│       └── splash.html     # Standalone splash / auth screen
└── shared/
    └── types.ts            # Shared TypeScript interfaces
```

### Build

```bash
npm run dist:win    # Windows (.exe installer + portable)
npm run dist:linux  # Linux (.AppImage + .deb) — uses WSL on Windows
npm run dist:mac    # macOS (.dmg) — must run on macOS or via CI
```

### Release via GitHub Actions

Push a version tag to trigger an automated build for all platforms:

```bash
git tag v0.2.2
git push origin v0.2.2
```

The workflow builds Windows, Linux, and macOS in parallel and publishes a GitHub Release with all installers attached.

---

## Contributing

Contributions are welcome. Please follow these steps:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Commit your changes following the existing commit style
4. Push the branch and open a Pull Request against `main`

Please make sure:
- All new code is written in **TypeScript**
- Comments and documentation are in **English**
- The project builds without errors (`npm run typecheck`)

### Reporting issues

Open an issue on [GitHub](https://github.com/LeonardoCiaccio/Skuoty/issues) with:
- OS and version
- Skuoty version
- Steps to reproduce
- Expected vs actual behaviour

---

## License

[MIT](LICENSE) © [Leonardo Ciaccio](https://skuoty.com)

---

<div align="center">
  <a href="https://skuoty.com">skuoty.com</a>
</div>
