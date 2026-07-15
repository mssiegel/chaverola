# Shared Project Context — Chaverola

This file records the project brief for **Chaverola**. It is the shared source of truth
for all contributors and AI agents. Keep it accurate; update it when the brief changes.

---

## What Chaverola Is

Chaverola is a multiplayer classroom activity for middle/high school students.

- A teacher creates an activity, chooses characters (e.g., "Caesar's ghost 👻" and
  "Brutus 🔪"), and shares a 4-digit join code.
- Students join, get assigned characters, and chat with each other in real time — but
  they don't know who they're really chatting with.
- Only the teacher sees students' real names, and can reveal them at the end.
- It should feel **fun, fast, and game-like** — inspired by the energy of multiplayer
  games, not like a messaging app.

You may take **loose** inspiration from Frempco.com, but do **not** copy it.

---

## Scope of This Project

- **UI and UX only, with animations/transitions. No backend logic.**
- All pages, buttons, and clickable elements must be functional using demo events, mock
  data, and real navigation — **nothing should be a dead end.**
- All mock/demo data lives in dedicated mockData files (e.g., `client/src/mockData/`).
  You decide the mock content (student names, chat messages, etc.), keeping it
  classroom-appropriate and fun. **The demo join code `1234` always works.**
- Everything must be **fully mobile friendly. Design mobile-first; verify every screen at
  phone width.**

---

## Tech Stack & Repo Structure

- **React 19, TypeScript, Vite, ShadCN, PNPM.**
- Use the latest stable npm versions of all libraries unless there's a good reason not to.
- **Monorepo using pnpm workspaces.** Root contains:
  - `client/` — the app (a workspace package)
  - `server/` — empty for now except a `.gitkeep`

- Prettier config lives at [`.prettierrc`](.prettierrc) in the repo root — that
  file is the single source of truth for formatting.
- Code must be **clean, well structured, and loosely coupled.** Reuse components, apply
  DRY where sensible, and define a **default color theme (design tokens / CSS variables)**
  used across the app.

---

## Routes (Canonical — Do Not Invent Others)

| Route                      | Purpose                                                                                                          |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `/`                        | Homepage                                                                                                         |
| `/activity/join`           | Student enters 4-digit join code                                                                                 |
| `/activity/join/:joinCode` | Student enters name → waiting lobby → chatting → chat ended (same route through all stages; UI changes by stage) |
| `/activity/create`         | Teacher sets up an activity                                                                                      |
| `/activity/host/:joinCode` | Teacher's live activity page                                                                                     |

### Hebrew variant

Every route also exists with an `/he` prefix (e.g., `/he/activity/join`).

For now, `/he` routes render the **same English text** — no translation and no RTL yet.
That comes later.

---

## Branding

- Should look like it belongs in a middle school / high school: **fun, friendly,
  energetic, but clean.**
- **Font: Fredoka** (fallback: **Nunito**). Hebrew will use Rubik later — **do not add it
  now.**
- **Logo & favicon:** generate an SVG — one large rounded speech bubble with a friendly
  face (two dot eyes and a small smile) filling most of the tile, tail at the bottom left.
  Flat and minimal, **no sparkles.** Set on a rounded-square app-icon tile. **Use the same
  mark for navbar logo and favicon.**

---

## Chatbox Conventions (Apply to BOTH Student and Teacher Views)

The chatbox intentionally feels like a **real-time video-game-style chat, NOT a messaging
app like WhatsApp** — messages flow as a smooth, immediate conversation.

- **Message format:** `<characterName>: <message>` on a single line.
- **Consecutive messages from the same character:** `0px` vertical margin between rows.
  When the speaker changes: add `4px` extra vertical space to imply a new speaker.
- **Teacher's view exception** — each line shows the student's real name in parentheses
  first: `(studentRealName) <characterName>: <message>`
- **Chatbox structure:** header on top → conversation → bottom section.
  - **Student view bottom section:** message input.
  - **Teacher view bottom section:** buttons to expand the chat or end the chat.
- Teachers never send messages (they talk to the class verbally), so the teacher view has
  **no input.**
