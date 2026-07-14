import type { ChatScenario, Participant } from "@/types/chat";

/*
  The chats a student gets matched into on the join flow (`/activity/join`).
  They play inside the demo activity's scene — Rome, 44 BC, the night before
  the Ides of March — using characters from that activity's roster, so the
  lobby's "Characters in this activity" chips and the chat agree with each
  other. Unlike the standalone demo scenarios, these start with NO seed
  messages: a fresh match begins as an empty room where the peer starts
  typing within a couple of seconds.
*/

const cleopatra: Participant = {
  id: "self-cleopatra",
  character: { id: "cleopatra", name: "Cleopatra", emoji: "👑" },
  // Placeholder — the join flow swaps in the signed-in student's real name.
  realName: "You",
};

const brutus: Participant = {
  id: "peer-brutus",
  character: { id: "brutus", name: "Brutus", emoji: "🔪" },
  realName: "Daniel Katz",
};

const caesarsGhost: Participant = {
  id: "peer-caesars-ghost",
  character: { id: "caesars-ghost", name: "Caesar's ghost", emoji: "👻" },
  realName: "Ella Peretz",
};

// ---- 1:1 match: Cleopatra & Brutus ------------------------------------------

export const activityDuoScenario: ChatScenario = {
  id: "activity-duo",
  self: cleopatra,
  peers: [brutus],
  seedMessages: [],
  script: [
    {
      senderId: brutus.id,
      text: "psst… Cleopatra. you made it 👀",
      delayMs: 1800,
    },
    {
      senderId: brutus.id,
      text: "The whole forum is whispering about tomorrow.",
      delayMs: 3600,
    },
    {
      senderId: brutus.id,
      text: "Whatever you've heard, I had nothing to do with it 😅",
      delayMs: 4400,
    },
  ],
  ambientLines: [
    "The senate is acting SO weird today.",
    "Trust no one. Seriously.",
    "Did Caesar seem… off to you at dinner?",
    "I keep hearing my name in the crowd 😬",
    "Tomorrow is a totally normal day. Right?",
  ],
  replyLines: [
    "Interesting… go on 👀",
    "Shh, not so loud!",
    "That's what everyone in the forum keeps saying.",
    "Bold of you to say that out loud 🗡️",
    "Caesar must never hear of this.",
    "Ha! You sound just like Marc Antony.",
  ],
};

// ---- Group match (3): Cleopatra, Brutus & Caesar's ghost ---------------------

export const activityGroupScenario: ChatScenario = {
  id: "activity-group",
  self: cleopatra,
  peers: [brutus, caesarsGhost],
  seedMessages: [],
  script: [
    {
      senderId: caesarsGhost.id,
      text: "BOO 👻 …sorry. Force of habit.",
      delayMs: 1800,
    },
    {
      senderId: brutus.id,
      text: "How are you ALREADY a ghost?? It's still the 14th!",
      delayMs: 3800,
    },
    {
      senderId: caesarsGhost.id,
      text: "Spoilers, Brutus. Spoilers. 🔮",
      delayMs: 4200,
    },
  ],
  ambientLines: [
    "The forum is packed tonight.",
    "beware the Ides of March… just saying 👻",
    "Why is everyone bringing knives to a senate meeting??",
    "I miss being alive. The snacks were better.",
    "Antony's speech tomorrow is going to be SO dramatic.",
  ],
  replyLines: [
    "Cleopatra has a point.",
    "The rumors say the same thing 👀",
    "ok THAT was suspicious.",
    "Say it louder for the senators in the back!",
    "History will remember this chat.",
    "👻 agreed.",
  ],
};

export const activityChatScenarios = {
  duo: activityDuoScenario,
  group: activityGroupScenario,
} as const;

export type ActivityChatScenarioKey = keyof typeof activityChatScenarios;
