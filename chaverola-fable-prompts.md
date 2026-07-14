# Chaverola — Fable Prompt Series

How to use this document: Each prompt stage below is meant to be given to Fable separately, in order, once the previous stage is working well. **Always paste the "Shared Project Context" section at the top of every prompt**, followed by the stage-specific prompt.

---

## SHARED PROJECT CONTEXT (include in every prompt)

### What Chaverola is

Chaverola is a multiplayer classroom activity for middle/high school students. A teacher creates an activity, chooses characters (e.g., "Caesar's ghost 👻" and "Brutus 🔪"), and shares a 4-digit join code. Students join, get assigned characters, and chat with each other in real time — but they don't know who they're really chatting with. Only the teacher sees students' real names, and can reveal them at the end. It should feel fun, fast, and game-like — inspired by the energy of multiplayer games, not like a messaging app.

You may take loose inspiration from Frempco.com, but do not copy it.

### Scope of this project

- UI and UX only, with animations/transitions. **No backend logic.**
- All pages, buttons, and clickable elements must be functional using demo events, mock data, and real navigation — nothing should be a dead end.
- All mock/demo data lives in dedicated mockData files (e.g., `client/src/mockData/`). You decide the mock content (student names, chat messages, etc.), keeping it classroom-appropriate and fun. The demo join code `1234` always works.
- Everything must be fully mobile friendly. Design mobile-first; verify every screen at phone width.

### Tech stack & repo structure

- React 19, TypeScript, Vite, ShadCN, PNPM.
- Use the latest stable npm versions of all libraries unless there's a good reason not to.
- Monorepo using pnpm workspaces. Root contains:
  - `client/` — the app (a workspace package)
  - `server/` — empty for now except a `.gitkeep`
- Prettier with a `.prettierrc` at the root:

```json
{
  "useTabs": false,
  "tabWidth": 2,
  "printWidth": 80,
  "singleQuote": false,
  "trailingComma": "es5",
  "semi": true,
  "arrowParens": "always"
}
```

- Code must be clean, well structured, and loosely coupled. Reuse components, apply DRY where sensible, and define a default color theme (design tokens / CSS variables) used across the app.

### Routes (canonical — do not invent others)

| Route                      | Purpose                                                                                                          |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `/`                        | Homepage                                                                                                         |
| `/activity/join`           | Student enters 4-digit join code                                                                                 |
| `/activity/join/:joinCode` | Student enters name → waiting lobby → chatting → chat ended (same route through all stages; UI changes by stage) |
| `/activity/create`         | Teacher sets up an activity                                                                                      |
| `/activity/host/:joinCode` | Teacher's live activity page                                                                                     |

Hebrew variant: every route also exists with an `/he` prefix (e.g., `/he/activity/join`). For now, `/he` routes render the same English text — no translation and no RTL yet. That comes later.

### Branding

- Should look like it belongs in a middle school / high school: fun, friendly, energetic, but clean.
- Font: **Fredoka** (fallback: Nunito). Hebrew will use Rubik later — do not add it now.
- Logo & favicon: generate an SVG — one large rounded speech bubble with a friendly face (two dot eyes and a small smile) filling most of the tile, tail at the bottom left. Flat and minimal, no sparkles. Set on a rounded-square app-icon tile. Use the same mark for navbar logo and favicon.

### Chatbox conventions (apply to BOTH student and teacher views)

The chatbox intentionally feels like a real-time video-game-style chat, NOT a messaging app like WhatsApp — messages flow as a smooth, immediate conversation.

- Message format: `<characterName>: <message>` on a single line.
- Consecutive messages from the same character: **0px** vertical margin between rows. When the speaker changes: add **4px** extra vertical space to imply a new speaker.
- Teacher's view exception — each line shows the student's real name in parentheses first: `(studentRealName) <characterName>: <message>`
- Chatbox structure: header on top → conversation → bottom section.
  - Student view bottom section: message input.
  - Teacher view bottom section: buttons to expand the chat or end the chat.
- Teachers never send messages (they talk to the class verbally), so the teacher view has no input.

---

## PROMPT 1 — Project scaffold + Student Chatbox

Set up the monorepo, tooling, theme, and routing scaffold per the Shared Project Context. Then build the **student chatbox** as a fully working demo (mount it on a temporary demo route for now, e.g., `/demo/student-chat`; it will be wired into the real student flow in a later prompt).

### Component structure

Place components in `client/src/components/Student/Chatbox/` (you may adjust names/structure if you have a clearly cleaner approach):

- `index.tsx`
- `Conversation.tsx`
- `SendMessageSection.tsx`
- `PeerIsTyping.tsx`
- `PeerReconnectBanner.tsx`
- `EndChatConfirmationModal.tsx`
- `ChatEndedSection.tsx`

### Behavior

- **Header:** shows the student's own character, the character(s) they're speaking with, and an "End chat" button. Clicking End chat opens a confirmation modal; confirming ends the chat and shows the ChatEndedSection.
- **Conversation:** follows the shared chatbox conventions (format, spacing, game-like feel). Auto-scrolls to the newest message.
- **Send message input:** single-row input with the send button inside at the right. If typed text overflows one row, the input expands to two lines and the send button moves to the side/bottom while keeping the same button size.
- **Character limit:** hard-block input at 75 characters. Show a character counter only once the student has typed more than 60 characters.
- **Emoji picker:** the input has a button to open an emoji picker. Emojis only — no stickers, no GIFs (teachers must be able to read chats at a glance).
- **Typing indicator:** at the bottom of the conversation show "X is typing…" (X = peer's character name). In a group chat (3–4 participants) show "someone is typing…" instead.
- **PeerReconnectBanner:** a banner shown when the peer disconnects / reconnects (simulate with mock events).
- **ChatEndedSection:** shown whenever the chat ends, regardless of who ended it (the student, the teacher, or an auto-end timer). If the "reveal names" setting is on (mock a toggle for the demo), show the revealed real names of who they were chatting with. Show an encouraging prompt with a button to go back to the waiting lobby for a rematch. The student is NEVER returned to the lobby automatically — they must actively click the button, because returning to the lobby puts them back in the queue to be matched again (stub the navigation for now).

### Mock/demo behavior

- Simulate a peer who sends messages and triggers the typing indicator on a timer, so the chat feels alive without a backend.
- Include a way to trigger demo events (peer disconnect/reconnect, chat end) — e.g., small dev-only buttons.

### Acceptance checklist

- [ ] pnpm monorepo with `client/` and empty `server/` (.gitkeep), Prettier configured
- [ ] Fredoka font, color theme tokens, logo/favicon SVG in place
- [ ] Same-speaker rows have 0px gap; speaker change adds 4px
- [ ] Input blocks at 75 chars; counter appears only after 60
- [ ] Input grows to two lines on overflow, send button keeps its size
- [ ] Emoji picker works, no GIFs/stickers
- [ ] End chat → confirm modal → ChatEndedSection with reveal-names state and "back to lobby" button
- [ ] Everything works at mobile width

---

## PROMPT 2 — Teacher Chatbox (chat cards)

Build the **teacher's chat card** component used to monitor a single chat, reusing the conversation rendering from the student chatbox where sensible. Mount it on a temporary demo route (e.g., `/demo/teacher-chat`) showing a few mock chats; it will be wired into the teacher activity page later.

### Behavior

- **Header:** shows each participant as their real name followed by their character name.
- **Conversation:** shared conventions, but each line is `(studentRealName) <characterName>: <message>`.
- **Collapsed by default:** shows only the previous 5 lines of the chat. A button expands to the full chat; once expanded, the same button becomes a minimize button.
- **Bottom section:** expand/minimize button and an "End chat" button. Clicking End chat opens a confirmation modal for the teacher to confirm they want to end the chat; the chat only ends on confirmation.
- **Completed variant:** a visually muted version of the same card (slightly desaturated colors) used for completed chats, with the same expand/minimize behavior but no End chat button.

### Acceptance checklist

- [ ] Real name + character shown in header and per message line
- [ ] Collapsed shows last 5 lines; expand ↔ minimize toggles on the same button
- [ ] End chat button (in-progress variant only) opens a confirmation modal; chat ends only on confirm
- [ ] Muted completed variant reuses the same component
- [ ] Mobile friendly

---

## PROMPT 3 — Navbar + Hero section

Build the site navbar and the homepage hero at `/`.

### Navbar

- Logo (the speech-bubble mark) + "Chaverola" wordmark, links to `/`.
- **Language dropdown** at the top: shows the international/globe language icon and the initials "EN". Clicking it shows two options: "EN" and "עב". Clicking "עב" switches every route to include the `/he` prefix (e.g., `/activity/join` → `/he/activity/join`) and the prefix persists across navigation; clicking "EN" removes it. Do NOT change any text or direction yet — English text in both modes for now.
- CTAs in the navbar: "Join an Activity" (primary, → `/activity/join`) and "Host an Activity" (→ `/activity/create`).

### Hero

- When a teacher lands here, the instant impression must be: "This is a fun, educational, multiplayer activity my students will love — and it's super quick and easy to set up."
- Communicate the loop in seconds: teacher clicks a button → creates the activity → assigns characters → students join with a code.
- Convey the student-side hook: it's a mystery — you don't know who you're chatting with; only the teacher knows, and reveals it at the end.
- **Primary CTA: student "Join an Activity"** (→ `/activity/join`). Secondary CTA: teacher "Host an Activity" (→ `/activity/create`).
- Fun, energetic, animated — but fast-loading and not cluttered.

### Meta title

- `/` → `Chaverola | A Classroom Activity That Students Love`

### Acceptance checklist

- [ ] Language dropdown toggles `/he` prefix on all routes and persists while navigating; text unchanged
- [ ] Both CTAs navigate correctly; student CTA is visually primary
- [ ] Hero reads instantly on mobile

---

## PROMPT 4 — Rest of the Homepage

Complete the homepage below the hero.

### Sections (in order)

1. **What it looks like for students:** an embedded, animated preview of the student chatbox (reuse the real components with mock data) showing a mystery chat in progress — character names only, playful messages, typing indicator. Make it clearly feel like the student experience.
2. **What it looks like for teachers:** an animated preview of the teacher view showing the same chat but with real student names visible next to character names — make it obvious that ONLY the teacher sees who's who.
3. **How it works for teachers:** 3–4 quick steps emphasizing speed — create the activity, choose characters, share the 4-digit code, students join instantly.
4. **Founder's story** (at the bottom), with a rounded placeholder avatar (real photo will be attached later — mark it clearly as a placeholder) and this exact text:

> I'm Moshe, and I volunteer in the English department at a high school in Beit Shemesh, Israel.
>
> I've always loved multiplayer games like Warcraft and Brawl Stars, where people are active, curious, and fully inside the experience. That made me wonder: could a classroom activity feel that alive?
>
> I wanted to create a multiplayer learning activity for students, the kind of game I would have loved to play in high school, where students step into characters, talk with classmates, and experience what they're studying in a more active and memorable way.
>
> The name Chaverola comes from two words: Chaver, the Hebrew word for friend, and Crayola, a name that represents creativity and imagination. That's what Chaverola is meant to be: a friendly, creative space where students bring characters to life together.
>
> If you have questions, ideas, or just want to say hi, I'd love to hear from you.
>
> Sincerely,
> Moshe Siegel

5. **Contact:** siegel.moshes@gmail.com (as a mailto link near the founder's story).

Do NOT include a testimonials section.

### Acceptance checklist

- [ ] Student preview and teacher preview reuse real chatbox components
- [ ] Teacher preview visibly shows real names; student preview does not
- [ ] Founder story verbatim, placeholder avatar, contact email present
- [ ] No testimonials section
- [ ] All sections mobile friendly

---

## PROMPT 5 — Student side A: Join flow + Waiting lobby

Build the student join flow and waiting lobby. (The chat itself is wired in the next prompt.)

### Student name display (all student pages)

- As soon as a student enters their name in the join flow, their real name should be visibly persisted on screen from that point on, across all student stages — so they always feel signed in. How and where you show it is up to you; it does not have to be in a header.
- One suggested approach (not a requirement): a header with the student's name on the left and their current stage on the right (e.g., "Waiting in lobby", "Chatting with Brutus 🔪", "Chat ended") on desktop, and just the name centered on mobile. Showing the current stage is optional — use your judgment on what feels cleanest, as long as the name is persistently visible and works well at mobile widths.

### Join flow — `/activity/join`

- Title: "Join an Activity". Subtext: "Enter the activity's code".
- Input for a 4-digit join code (all join codes are 4-digit numbers). Continue button.
- If the code isn't found: show "Activity was not found. Recheck the Join Code you entered." (Mock: only `1234` is valid.)
- On a valid code: the code input is replaced in-place by a name input, the route updates to `/activity/join/:joinCode`, "hosted by X" appears (X = teacher's name from mock data), and the button label changes to "Join Activity".
- Students arriving directly via a shared link `/activity/join/:joinCode` skip the code entry and land on the name input.
- Clicking "Join Activity" takes the student to the waiting lobby (same route, new stage).

### Waiting lobby

- Welcomes the student by name; message that they're waiting for the teacher to match them with another student.
- Shows the activity's character list, the teacher's name, and the scenario if one was set.
- Should feel exciting and pump the student up (playful animation is welcome).
- If the teacher removed the student (mock event), they land back here logged out, seeing a message that the teacher removed them and they need to sign in again.

### Meta titles (dynamic by stage on the student route)

- `/activity/join` → `Chaverola | Join an Activity`
- Lobby stage → `Chaverola | Waiting Lobby`

### Acceptance checklist

- [ ] Wrong code shows the exact error message; `1234` works
- [ ] In-place transition from code input → name input, route + button label + "hosted by" update
- [ ] Direct link skips code entry
- [ ] Student's real name is persistently visible from the moment it's entered, on desktop and mobile
- [ ] Join → lobby flow works end to end with mock data
- [ ] Mobile friendly throughout

---

## PROMPT 6 — Student side B: Chat + Chat ended

Wire the student chatbox from Prompt 1 into the student flow built in Prompt 5, all on the same route `/activity/join/:joinCode` (UI changes by stage). The chatting and ended stages render inside the same purple student world as the rest of the join flow. Before changing any existing behavior, skim DECISIONS.md — several rules below come from it — and record the new rules from this prompt there as you implement them.

### Behavior

- When the student is matched (mock event triggered from the lobby's demo panel), they enter the chatbox from Prompt 1 on the same route. The chatting stage shows the student identity bar that was deliberately kept out of the lobby (see DECISIONS.md "The lobby shows no identity bar"), with the student's name and stage (e.g., "Chatting with Brutus 🔪"). The lobby itself stays bar-free.
- Simulated peer messages and typing indicators keep the demo chat feeling alive.
- **Back-swipe guard:** browser back must never silently kill a live chat (see the lobby-only rule in DECISIONS.md "Landing on code entry signs the student out"). During the chatting stage, intercept back navigation and route it through the end-chat confirmation modal; only a confirmed end leaves the chat.
- A refresh mid-chat may land the student back in the lobby — chat state is mock-only; don't build persistence for it.

### Peer disconnect & the 2-minute reconnect window (new product rule)

- When a peer loses connection, the student sees the reconnect banner from Prompt 1 with a **live countdown**: the peer has **2 minutes** to reconnect (e.g., "Brutus 🔪 lost connection — 1:43 for them to come back"; exact copy is yours).
- If the peer reconnects in time: the existing reconnecting → "is back! 🎉" states play, the countdown clears, and the chat continues.
- If the window expires in a **1:1 chat**: the chat ends, and ChatEndedSection shows **reason-aware copy** (e.g., "Your partner lost connection, so this chat ended" — not the standard congratulatory copy). Reveal-names behavior and the back-to-lobby button are unchanged.
- If the window expires in a **group chat (3–4 participants)**: the chat does NOT end. The disconnected student is dropped — a brief notice appears in the conversation, they disappear from the header's peer list, and the remaining students keep chatting. This deliberately differs from the "Ending a chat ends it for everyone" rule: dropping a member is not ending the chat. Record the distinction in DECISIONS.md.
- Give ChatEndedSection an end-reason input so the disconnect-timeout copy differs from a normal end; every other end source keeps the existing copy.
- Put the window/countdown logic in the shared demo engine (`useChatDemo`) so `/demo/student-chat` inherits it too.

### Chat end sources

- When the chat ends — the student ends it via the confirm modal, the teacher ends it (mock event), the activity auto-end timer fires (mock event), or a 1:1 disconnect window expires — show ChatEndedSection: revealed names if the reveal setting is on, plus the encouraging prompt with a button to return to the waiting lobby for a rematch. The student is never taken back to the lobby automatically; they must actively click the button, since returning to the lobby puts them back in the queue to be matched again.
- Returning to the lobby resets the stage and the student can be matched again (mock).

### Mock/demo behavior

- Lobby demo panel gains match triggers next to the existing "Teacher removes you" — one for a 1:1 match and one for a group of 3, so the group drop behavior is demoable.
- The chat stage gets its own dev-only demo panel (the demo kit with the `onWorld` glass theme, like the lobby's): peer drops, peer reconnects, teacher ends chat, auto-end timer fires, make peer talk — plus a **"skip the wait"** control that fast-forwards the 2-minute window so the timeout path can be tested without standing around.

### Meta titles (dynamic by stage on the student route)

- Chatting stage → `Chaverola | Chatting`
- Chat ended stage → `Chaverola | Chat Ended`

### Acceptance checklist

- [ ] Lobby → chat via mock match trigger; identity bar appears with stage text; lobby remains bar-free
- [ ] Full loop works: join → lobby → chat → ended → back to lobby on click → rematchable
- [ ] Browser back during a live chat opens the end-chat confirmation instead of silently leaving
- [ ] Peer drop shows the banner with a live 2:00 countdown; reconnecting in time clears it and the chat continues
- [ ] 1:1 timeout ends the chat with disconnect-specific ended copy; group timeout drops the peer and the chat continues
- [ ] Ending from any source (student, teacher mock, auto-end mock, 1:1 disconnect timeout) shows ChatEndedSection; return to lobby only by clicking
- [ ] Reveal-names state reflected in ChatEndedSection
- [ ] New rules (2-minute window with visible countdown, group drop-not-end, back-swipe guard) recorded in DECISIONS.md
- [ ] Mobile friendly throughout

---

## PROMPT 7 — Teacher side A: Activity setup

Build the teacher's activity setup page. Before changing any existing behavior, skim DECISIONS.md — the "Characters & rosters" section governs how characters are modeled — and record new product rules from this prompt there as you implement them.

### Setup page — `/activity/create`

Meta title: `Chaverola | Teachers View`

Fields:

- **Characters (required, 2–4):** two character rows by default. A character is a **name plus an optional single emoji, stored as separate fields** — see `Character` in `client/src/types/chat.ts` and DECISIONS.md → "A character's emoji is optional, and labels simply drop it". Each row is a name input with an emoji slot button beside it. Name placeholders: "Caesar's ghost" for the first, "Brutus" for the second; emoji slots start empty. The emoji slot opens the emoji picker (emojis only — no stickers or GIFs; reuse the emoji picker from the student chatbox); picking sets or replaces the row's single emoji, and it can be cleared. A character with no emoji is valid and renders name-only everywhere. Labels shown to students always compose via `characterLabel` — never parse emojis out of the name. **Character names hard-block at 30 characters**, with a quiet counter appearing only near the limit (same spirit as the chat input's 75-char cap) — names prefix every chat line, so they must stay short. An "add character" action allows up to 4 total. Show a note: starting with two characters (1:1 chats) is recommended; a 3rd character is only used when a group of 3 students is paired, and a 4th only for a group of 4. At least two characters are required to start.
- **Hosted by (required):** the teacher's name as students will see it.
- **Teacher email (optional):** to later get emailed all the chats from the activity.
- **Scenario (optional, max 20 words):** sets the scene for students. Placeholder: "Caesar's ghost meets Brutus after the assassination."

Settings (4 toggles — make clear that keeping them on is recommended, and that all of these can be edited during the activity itself, since Chaverola is really a series of activities with the same students):

1. **Reveal names after chat ends** — students never know who they're chatting with during the chat; turn this on to reveal names at the end. Default: on.
2. **Auto-end all chats after a set time** — default 7 minutes, adjustable up/down. Default: on.
3. **Show a visual warning when the same students are about to be rematched.** Default: on.
4. **Auto-match students 1:1** — when at least two students are waiting, have waited at least 20 seconds (adjustable), and weren't recently matched together. Default: on.

A "Host the Activity" button becomes enabled once all required fields are filled, and navigates to `/activity/host/:joinCode` (mock-generate a code; the live activity page is built in the next prompt, so stub the destination for now if needed).

### Acceptance checklist

- [ ] Host button disabled until characters (≥2) + hosted-by are filled
- [ ] Emoji slot on each character row sets/replaces/clears the optional emoji; a character without one is valid
- [ ] Character names hard-block at 30 chars, counter only near the limit
- [ ] Up to 4 characters can be added, with the group-of-3/4 note shown
- [ ] Scenario capped at 20 words; placeholder text correct
- [ ] All 4 toggles present with correct defaults and adjustable values
- [ ] Mobile friendly throughout

---

## PROMPT 8 — Teacher side B: Live activity page

Build the teacher's live activity page and wire in the teacher chat cards from Prompt 2. Before changing any existing behavior, skim DECISIONS.md — the chat-end, reveal, and removal rules govern several behaviors below — and record new product rules from this prompt there as you implement them.

### Live activity page — `/activity/host/:joinCode`

Meta title: `Chaverola | Teachers View`

- **Sticky header:** shows how many students are waiting to chat. Top right shows "Activity in Progress" on desktop only (hidden on mobile).
- **Student instructions (minimizable):** tells the teacher to write on the blackboard or another highly visible spot: students go to www.chaverola.com, click Join an Activity, and enter the activity pin — showing the pin prominently. Also show a copyable direct link: `www.chaverola.com/activity/join/:joinCode`.
- **Edit activity settings (accordion, minimizable):** all setup fields/toggles from Prompt 7 editable live (including character names and their optional emoji slots). If the teacher's email was not set, the closed accordion shows a subtext nudging them to add it.
- **Pair your students (accordion, minimizable):** closed accordion subtext shows how many students are waiting to start.
  - Clicking a student opens a confirmation modal to remove them (teachers typically remove students who joined with a made-up or inappropriate name). A removed student lands back on the **name step** at `/activity/join/:joinCode`, signed out, seeing a message that the teacher removed them and they need to sign in again (already implemented on the student side — see DECISIONS.md → "Student sign-in lives in the tab, and removal sends you to the name step").
  - The teacher can pair two students to chat (they get the two characters). With 3 characters defined, groups of 3 can be paired; with 4 characters, groups of 4.
  - A button pairs up ALL waiting students into 1:1 chats.
  - Per setting #3, show a visual warning when a proposed pairing would rematch the same students.
- **Chats in progress (accordion):** accordion title shows the number of chats in progress. Inside: a toggle to reveal real names to the students, a count of how many students are chatting, and an "End all chats" button (opens a confirmation modal before ending all chats). Each chat renders as the teacher chat card from Prompt 2 (last 5 lines, expand/minimize, and end chat with its confirmation modal). When the teacher ends a chat (individually or via End all), the affected students are NOT sent back to the lobby — they see their ChatEndedSection with the teacher-specific copy: chat ends carry a `ChatEndReason` (see DECISIONS.md → "Every chat end explains itself"), so teacher ends fire with reason `"teacher"` ("Your teacher ended the chat") and an auto-end timer expiry fires with `"timer"` ("Time's up!"), never the generic copy. Students only re-enter the lobby/match queue when they click the return button themselves. So on the teacher's side, those students don't appear in the "waiting to chat" count until they've clicked back to the lobby.
- **Completed chats (accordion):** accordion title shows the number completed; inside, a count plus the muted completed-chat cards with expand/minimize.
- If the accordions share similar code, refactor them into one reusable accordion template — use your judgment.

### Mock/demo behavior

- The host page's demo data hosts the **same activity as the student side**: join code `1234`, hosted by Ms. Cohen, the Rome scenario and its four characters from `client/src/mockData/activityDemo.ts` — including the deliberately emoji-less Marc Antony, so teacher chat cards and pairing UI exercise name-only labels. The pin shown on screen is therefore the one that actually works on `/activity/join` in another tab. There is no cross-tab sync — both sides stay independently mocked; they just agree on the story. (If the teacher arrives from Prompt 7's create flow with their own mock activity state, show that instead; Rome is the default seed for direct visits.)
- Seed ~6 fake students in the lobby, 2 chats in progress with live-updating mock messages, and 2 completed chats.
- Simulate students joining over time so the waiting count changes.

### Acceptance checklist

- [ ] Sticky header count updates; "Activity in Progress" hidden on mobile
- [ ] Direct visits host the Rome demo activity with pin `1234`, matching the student side
- [ ] Closed accordions show the specified subtexts/counts
- [ ] Remove-student confirm modal works; pair, pair-all, group pairing per character count
- [ ] Reveal-names toggle works; end-all and per-chat end both require confirmation via modal; expand/minimize works with mock data
- [ ] Teacher-initiated ends and timer expiries reach students with reasons `"teacher"` / `"timer"`, showing the reason-aware ended copy
- [ ] Mobile friendly throughout
