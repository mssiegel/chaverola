# Characters & rosters

Part of the [Product & UX Decisions](../../DECISIONS.md) index — one file per
area. Entries are newest-first; add new ones at the top, and add a matching line
to the index in the same change. Replaced decisions move to Superseded at the
bottom of this file.

### A character's emoji is optional, and labels simply drop it

_2026-07-14_

**Decision:** Whether a character gets an emoji next to its name is the
teacher's call, per character — the data model does not require one. Every
surface that shows a character (chat header, conversation lines, lobby
roster chips, reconnect banner, roster popover, end-of-chat reveal, composer
placeholder) renders "Name emoji" when there is one and plain "Name" when
there isn't: no placeholder glyph, no reserved gap, no trailing space.
`characterLabel` in [characterLabel](../../client/src/lib/characterLabel.ts) is
the single formatter — nothing may hand-roll `name + emoji` (ConversationLines
used to; it no longer does). The demo data keeps the path visibly exercised:
Marc Antony in the join-flow roster and Julius Caesar on `/demo/student-chat`
have no emoji on purpose.

**Why:** Product-owner call (2026-07-14). Requiring an emoji forces teachers
to decorate characters that don't want decorating (try picking one for
"Brutus's conscience"), and a stock fallback glyph or initials avatar would
invent identity the teacher didn't author — plus a repeated fallback makes
distinct characters look like the same one. This rule is also why
[the chat header summarizes the room](chat-behavior.md#the-chat-header-summarizes-the-room-and-tapping-it-shows-everyone)
uses a count pill rather than emoji-chip avatars: chips can't be counted on
when some characters have no emoji.

_Implemented in [chat types](../../client/src/types/chat.ts) and
[characterLabel](../../client/src/lib/characterLabel.ts)._
