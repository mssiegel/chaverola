import type { ChatScenario, Participant } from "@/types/chat";

/*
  The homepage hero's live sample chat. A visitor lands as "the Moon" mid-chat
  with Neil Armstrong — short, funny, classroom-appropriate lines that show the
  roleplay format at a glance. Played by the same demo engine as the student
  chatbox demo (`useChatDemo`), so typing in the hero gets a reply.

  Two deliberate limits (see DECISIONS.md → "The hero demo goes quiet after
  two Armstrong lines"):
  - After the Moon's "you could've knocked first 😤", Armstrong sends exactly
    two one-sentence lines. The teacher preview mirrors this same feed and
    always shows its newest lines, so a longer script buries the Moon's zinger
    in both views.
  - `ambientLines` is empty on purpose — no idle chatter. Once the script
    ends, the room waits for the visitor to answer.

  Names: the demo's fiction is that the visitor is borrowing Dana K's seat.
  The teacher card names the Moon "Dana K", never "You" — the teacher assigns
  chats and is not a player. Real names stay short ("Sam A") to keep the card
  header tight. See DECISIONS.md → "Demo students have short names, and the
  teacher is never one of them".

  Coupling: "the Moon", "Neil"/"Neil Armstrong", and "Dana K" appear verbatim
  in homepage copy (HomePage.tsx and TeacherViewSection.tsx). Renaming anyone
  here is a coordinated copy change across those files — and copy changes go
  through the humanizer pass (see AGENTS.md).
*/

const moon: Participant = {
  id: "self-moon",
  character: { id: "moon", name: "the Moon", emoji: "🌕" },
  realName: "Dana K",
};

const armstrong: Participant = {
  id: "peer-armstrong",
  character: { id: "armstrong", name: "Neil Armstrong", emoji: "🚀" },
  realName: "Sam A",
};

export const heroChatScenario: ChatScenario = {
  id: "hero",
  self: moon,
  peers: [armstrong],
  seedMessages: [
    { senderId: armstrong.id, text: "that's one small step for man…" },
    { senderId: moon.id, text: "HEY. watch where you're stepping" },
    { senderId: armstrong.id, text: "oh. sorry. kind of a big moment for me" },
    { senderId: moon.id, text: "you could've knocked first 😤" },
  ],
  script: [
    {
      senderId: armstrong.id,
      // No flag emoji here: Windows renders 🇺🇸 as the letters "US".
      text: "i brought you a very nice flag tho",
      delayMs: 4200,
    },
    {
      senderId: armstrong.id,
      text: "also like 600 million people are watching us rn, so maybe act natural 📺",
      delayMs: 4200,
    },
  ],
  ambientLines: [],
  replyLines: [
    "haha ok fair",
    "that's exactly what a moon would say",
    "wait till mission control hears this 😂",
    "noted. adding it to the mission report 📋",
    "you're pretty chatty for a rock",
    "10/10 would land here again",
  ],
};
