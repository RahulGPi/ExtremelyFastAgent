# SOLO

SOLO is a local chat agent that remembers past conversations and uses web search to check current information. This version runs on **Node.js**. It is designed for questions like “What did I ask last Tuesday?” and “Has the pricing changed since then?”

## Requirements

- Node.js **22.13 or newer** and npm. SOLO uses Node's built-in experimental SQLite module; no database server is needed.
- A Groq API key and a Tavily API key. An OpenRouter key is optional as a model-provider fallback.
- Internet access for model inference and web search.

## Start

From the project directory:

```bash
npm install
npm run dev
```

Open **http://127.0.0.1:3000** in your browser. On the first run, create a `.env` file from `.env.example` and fill in the required API keys. On Linux or macOS:

```bash
cp .env.example .env
```

On Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

If `.env` already exists, edit it instead of replacing it. Restart the server after changing it. The `.env` file is ignored by Git; never share or commit your keys. Environment variables take precedence over `.env` values.

## Using SOLO

Type a question and press Enter; Shift+Enter adds a line. Use **New chat** to start another session. The session panel supports search, rename, and delete. The app starts a new session when the browser page opens. Earlier messages remain available for cross-session recall.

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
| `SOLO_SKIP_LEGACY` | Set to any non-empty value to skip importing the earlier app's database |

SOLO binds to `127.0.0.1` and stores chat history and retrieved sources in SQLite. The database and `.env` are **not encrypted**. On Unix the app restricts database permissions; Windows ACL behavior has not been tested. Do not expose the local server to untrusted networks. Conversations and retrieved evidence are sent to the selected model provider; search queries are sent to Tavily. OpenRouter may route requests to another provider, and paid model choices can incur charges.

If an earlier Rust/Tauri `mim.db` is present in the project directory, its sessions, messages, timestamps, and saved sources are imported once into `solo-node.db`; the old database is left intact. Use `SOLO_SKIP_LEGACY=1` to disable this. The older Rust code remains in the repository for reference; **it is not needed to run this Node app**.

## Checks and limitations

```bash
npm test
```

Tests cover cross-session keyword recall, local date-range retrieval including a daylight-saving transition, source URL matching, and legacy import. Common day-month dates and past weekdays are interpreted locally; other dates rely on the model. Paraphrases, ambiguous dates, or missing records can still cause errors. Source URL matching is not claim-by-claim verification, and the app does not guarantee it checks every product in a shortlist. Provider rate limits and unavailable search results can prevent an answer. There are no hard monetary budgets yet.

The Node implementation was tested locally on Linux. macOS and Windows have not been tested. See [design.md](design.md) for the architecture and [WORKLOG.md](WORKLOG.md) for development notes.
