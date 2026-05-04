# Agile Effort Estimation — Jira Cloud Forge App

A lightweight **Planning Poker** tool that lives directly inside a Jira issue panel.  
No external tools, no external backend — everything runs on the **Atlassian Forge** platform.

---

## Features

| Feature | Description |
|---|---|
| **Start Session** | Creates a voting session tied to the Jira issue |
| **Voting Cards** | `0 1 2 3 5 8 13 21 ?` — click to vote |
| **Hidden Votes** | Votes stay hidden until the facilitator reveals them |
| **Reveal** | Shows all votes, average, and the most-common suggestion |
| **Set Story Points** | Writes the suggested value to the Jira Story Points field |
| **Reset** | Clears all votes for a new round |
| **Live Polling** | Frontend polls every 3 s — no WebSockets needed |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Platform | Atlassian Forge (Custom UI) |
| Backend | `@forge/resolver` + `@forge/api` (storage + Jira REST) |
| Frontend | React 18 · TypeScript · Vite 5 |
| Bridge | `@forge/bridge` (`invoke` / `view.getContext`) |
| Storage | Forge Storage API (key-value, scoped per app) |

---

## Project Structure

```
Jira Poker/
├── manifest.yml                 # Forge app manifest
├── package.json                 # Backend dependencies (Forge functions)
├── tsconfig.json                # Backend TypeScript config
├── .gitignore
│
├── src/
│   └── resolvers/
│       └── index.ts             # All Forge resolver functions
│
└── static/
    └── frontend/
        ├── package.json         # Frontend dependencies
        ├── tsconfig.json        # Frontend TypeScript config
        ├── vite.config.ts       # Vite build config
        ├── index.html           # HTML entry point
        └── src/
            ├── main.tsx         # React entry
            ├── App.tsx          # Main app component + all logic
            ├── App.css          # Component styles
            ├── index.css        # Global reset
            └── types/
                └── index.ts     # Shared TypeScript interfaces
```

---

## Prerequisites

- **Node.js** ≥ 18
- **Atlassian Forge CLI** installed globally:
  ```bash
  npm install -g @forge/cli
  ```
- A **Jira Cloud development site** — get one free at https://go.atlassian.com/cloud-dev
- Login to Forge:
  ```bash
  forge login
  ```

---

## Setup & Installation

### 1 — Install dependencies

```bash
# From the project root ("Jira Poker/")

# Install backend dependencies
npm install

# Install frontend dependencies
npm install --prefix static/frontend

# Or use the convenience script:
npm run install:all
```

### 2 — Register the app with Atlassian

```bash
forge register
```

This writes your App ID into `manifest.yml`. Commit the updated file.

### 3 — Build the frontend

```bash
npm run build:frontend
# equivalent to:
npm run build --prefix static/frontend
```

This outputs the built assets to `static/frontend/dist/`, which is what Forge serves.

### 4 — Deploy to your development environment

```bash
forge deploy
```

### 5 — Install the app on your Jira site

```bash
forge install
```

Select your Jira Cloud development site when prompted.

---

## Development Workflow (Hot Reload)

The Forge tunnel proxies `@forge/bridge` calls to your local machine, so you get fast
iteration without a full deploy cycle.

### Terminal 1 — Start the Vite dev server

```bash
cd "static/frontend"
npm run dev
# → http://localhost:5173
```

### Terminal 2 — Start the Forge tunnel

```bash
# From the project root
forge tunnel
```

Forge now forwards:
- **Frontend** requests → your local Vite server on port 5173
- **Backend** `invoke()` calls → your local TypeScript resolver

Open any Jira issue on your dev site and click the **Agile Effort Estimation** panel tab.  
Changes to both frontend and backend are reflected immediately.

---

## Resolver Reference

| Resolver | Payload | Description |
|---|---|---|
| `createSession` | `{ issueId }` | Creates a new session (idempotent) |
| `getSession` | `{ issueId }` | Returns the current session or `null` |
| `submitVote` | `{ issueId, value }` | Records the current user's vote |
| `revealVotes` | `{ issueId }` | Sets `revealed = true` |
| `resetVotes` | `{ issueId }` | Clears all votes, sets `revealed = false` |
| `setStoryPoints` | `{ issueId, points }` | Updates the Jira Story Points field |

---

## Story Points Field

Jira has two common Story Points field IDs depending on project type:

| Project type | Field ID |
|---|---|
| Team-managed (next-gen) | `story_points` |
| Company-managed (classic) | `customfield_10016` |

The resolver tries `story_points` first, then falls back to `customfield_10016` automatically.

---

## Permissions

Declared in `manifest.yml`:

```yaml
permissions:
  scopes:
    - read:jira-work    # GET /rest/api/3/user, GET issue data
    - write:jira-work   # PUT /rest/api/3/issue/{id} (story points)
```

Forge Storage is automatically available to all Forge apps — no extra scope needed.

---

## Deploying to Production

When you're ready to publish to the Atlassian Marketplace or a production site:

```bash
# Build frontend
npm run build:frontend

# Deploy to production environment
forge deploy --environment production

# Install on the target site
forge install --environment production
```

---

## Troubleshooting

| Problem | Solution |
|---|---|
| "No active session" error | Click **Start Estimation** first |
| Story Points not updating | Check that the Jira project has a Story Points field configured |
| Panel not appearing | Run `forge install` again and refresh the Jira issue |
| TypeScript errors in frontend | Run `npm run typecheck --prefix static/frontend` |
| Tunnel disconnects | Restart `forge tunnel` |

---

## License

MIT
