import type { ChatScenario, Participant } from "@/types/chat";

/*
  Demo scenarios for the student chatbox. Fully backend-free: the chat engine
  plays these out on timers so the room feels alive. Content is classroom
  appropriate and leans into famous characters for a fun, game-like vibe.
*/

// ---- Duo scenario (1:1) — shows "<name> is typing…" ------------------------

const cleopatra: Participant = {
  id: "self-cleopatra",
  character: { id: "cleopatra", name: "Cleopatra", emoji: "👑" },
  realName: "You",
};

const caesar: Participant = {
  id: "peer-caesar",
  // No emoji on purpose: the default demo chat keeps the name-only label
  // exercised across the header, feed, banner, and reveal.
  character: { id: "caesar", name: "Julius Caesar" },
  realName: "Leo Rivera",
};

export const duoScenario: ChatScenario = {
  id: "duo",
  self: cleopatra,
  peers: [caesar],
  seedMessages: [
    {
      senderId: caesar.id,
      text: "Well well, if it isn't the Queen of the Nile 👑",
    },
    { senderId: cleopatra.id, text: "Julius! You're late to my court." },
    { senderId: caesar.id, text: "I was busy conquering Gaul, obviously." },
    { senderId: cleopatra.id, text: "Excuses, excuses 🙄" },
  ],
  script: [
    {
      senderId: caesar.id,
      text: "Fine. I brought you a gift 🎁",
      delayMs: 4200,
    },
    { senderId: caesar.id, text: "…all of Rome 🏛️", delayMs: 3200 },
    {
      senderId: caesar.id,
      text: "too much? 😅 ok maybe just a grape 🍇",
      delayMs: 4200,
    },
  ],
  ambientLines: [
    "History is watching us 👀",
    "Cross the Rubicon with me?",
    "Beware the Ides of March…",
    "I came, I saw, I chatted.",
    "The senate is going to hear about this 📜",
  ],
  replyLines: [
    "Bold words for a mortal 😏",
    "Ha! The senate would love that.",
    "You always did have a way with words.",
    "Say that to my legions 🗡️",
    "🤔 interesting…",
    "Agreed. To Rome! 🍇",
  ],
};

// ---- Group scenario (3 participants) — shows "someone is typing…" ----------

const robin: Participant = {
  id: "self-robin",
  character: { id: "robin", name: "Robin Hood", emoji: "🏹" },
  realName: "You",
};

const arthur: Participant = {
  id: "peer-arthur",
  character: { id: "arthur", name: "King Arthur", emoji: "🛡️" },
  realName: "Ava Thompson",
};

const merlin: Participant = {
  id: "peer-merlin",
  character: { id: "merlin", name: "Merlin", emoji: "🧙" },
  realName: "Noah Park",
};

export const groupScenario: ChatScenario = {
  id: "group",
  self: robin,
  peers: [arthur, merlin],
  seedMessages: [
    { senderId: arthur.id, text: "Knights, assemble! We ride at dawn." },
    { senderId: merlin.id, text: "The stars foretell great chaos today 🔮" },
    { senderId: robin.id, text: "i'm just here for the treasure tbh" },
    { senderId: arthur.id, text: "Robin! Show some respect 😤" },
  ],
  script: [
    {
      senderId: merlin.id,
      text: "Someone will betray us before noon 👀",
      delayMs: 4200,
    },
    { senderId: arthur.id, text: "Not on my watch. 🛡️", delayMs: 3400 },
    { senderId: merlin.id, text: "…the prophecy never lies ✨", delayMs: 3800 },
  ],
  ambientLines: [
    "For Camelot! 🛡️",
    "The prophecy stirs…",
    "🔮✨",
    "Who took the last of the mead?",
    "To the Round Table!",
  ],
  replyLines: [
    "A likely story 😏",
    "The realm agrees with you.",
    "Ha! Spoken like a true outlaw.",
    "The stars did not predict THAT 🔮",
    "Careful, Sheriff's listening 👀",
    "Aye, well said.",
  ],
};

export const studentChatScenarios = {
  duo: duoScenario,
  group: groupScenario,
} as const;

export type StudentChatScenarioKey = keyof typeof studentChatScenarios;
