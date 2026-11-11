# SOLO

SOLO is a local chat agent that remembers past conversations and uses web search to check current information. This version runs on **Node.js**. It is designed for questions like “What did I ask last Tuesday?” and “Has the pricing changed since then?”

## Requirements

- Node.js **24 or newer** and npm. SOLO uses Node's built-in experimental SQLite module; no database server is needed.
- A Groq API key and a Tavily API key. An OpenRouter key is optional as a model-provider fallback.
- Internet access for model inference and web search.

On Ubuntu/Pop!_OS, install the native webview libraries before `npm install`:

```bash
sudo apt install libwebkit2gtk-4.1-0 libgtk-3-0 libsoup-3.0-0 libxdo3
```

On Windows, WebView2 is required; macOS uses the system WebKit. Native window behavior on Windows and macOS has not yet been tested.

## Start

From the project directory, select Node 24 first if you use nvm:

```bash
nvm use 24
npm install
npm run dev
```

If you do not use nvm, activate your Node 24 installation instead.

SOLO opens in a native WebviewJS window. On the first run, create a `.env` file from `.env.example` and fill in the required API keys. On Linux or macOS:

```bash
cp .env.example .env
```

On Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

If `.env` already exists, edit it instead of replacing it. Restart the server after changing it. The `.env` file is ignored by Git; never share or commit your keys. Environment variables take precedence over `.env` values.

## Using SOLO

Type a question and press Enter; Shift+Enter adds a line. Use **New chat** to start another session. The session panel supports search, rename, and delete. The app starts a new session when the window opens. Earlier messages remain available for cross-session recall.

Use the minus button to collapse SOLO into a small floating button; click it to reopen chat. Alt+A also toggles it while the window is focused. For a system-wide shortcut, bind your desktop environment's Alt+A shortcut to `node /absolute/path/to/mim_agent/node-app/toggle.js` to toggle SOLO or start it if needed. The shortcut uses `PORT` from its environment or `.env`, defaulting to 3000. The Wayland compositor controls floating and positioning; top-center placement cannot be guaranteed. Use × to quit; Alt+A can start the app again. You can also stop SOLO with Ctrl+C in its terminal.

When you ask about a date or earlier topic, SOLO searches its local conversation history and includes matching questions and answers as context. For update requests it searches the web and compares current results with those records. Date interpretation uses the computer's local time zone; optionally set `TZ` in `.env` to an IANA time zone such as `Asia/Kolkata`. The exact time-zone behavior on Windows has not been tested.

Click the source links under an answer to inspect them. A citation does **not** prove the corresponding claim is correct. If the agent cannot find prior history or verify current details, it should say so; retrieval and factual accuracy are not guaranteed.

## Configuration and data

| Variable | Purpose |
| --- | --- |
| `GROQ_API_KEY` | Primary model provider key; required unless using OpenRouter |
| `TAVILY_API_KEY` | Required for web search |
| `OPENROUTER_API_KEY` | Optional backup model provider key |
| `GROQ_MODEL` | Optional; defaults to `qwen/qwen3.8-27b` |
| `OPENROUTER_MODEL` | Optional; defaults to `openrouter/free` |
| `TZ` | Optional IANA time zone for interpreting dates |
| `PORT` | Optional local server port; defaults to `3000` |
| `SOLO_DB` | Optional SQLite database path; defaults to `solo-node.db` |
| `SOLO_NO_WINDOW` | Set to `1` to run only the local server, without opening a native window |
| `SOLO_SKIP_LEGACY` | Set to any non-empty value to skip importing the earlier app's database |

SOLO binds to `127.0.0.1` and stores chat history and retrieved sources in SQLite. The database and `.env` are **not encrypted**. On Unix the app restricts database permissions; Windows ACL behavior has not been tested. Do not expose the local server to untrusted networks. Conversations and retrieved evidence are sent to the selected model provider; search queries are sent to Tavily. OpenRouter may route requests to another provider, and paid model choices can incur charges.

If an earlier Rust/Tauri `mim.db` is present in the project directory, its sessions, messages, timestamps, and saved sources are imported once into `solo-node.db`; the old database is left intact. Use `SOLO_SKIP_LEGACY=1` to disable this. The older Rust code remains in the repository for reference; **it is not needed to run this Node app**.

## Checks and limitations

```bash
npm test
```

Tests cover cross-session keyword recall, local date-range retrieval including a daylight-saving transition, source URL matching, and legacy import. Common day-month dates and past weekdays are interpreted locally; other dates rely on the model. Paraphrases, ambiguous dates, or missing records can still cause errors. Source URL matching is not claim-by-claim verification, and the app does not guarantee it checks every product in a shortlist. Provider rate limits and unavailable search results can prevent an answer. There are no hard monetary budgets yet.

The Node implementation was tested locally on Linux. macOS and Windows have not been tested. See [design.md](design.md) for the architecture and [WORKLOG.md](WORKLOG.md) for development notes.
