import type { ChatScenario, Participant } from "@/types/chat";

/*
  The homepage hero's live sample chat. A visitor lands as "the Moon" mid-chat
  with Neil Armstrong — short, funny, classroom-appropriate lines that show the
  roleplay format at a glance. Played by the same demo engine as the student
  chatbox demo (`useChatDemo`), so typing in the hero gets a reply.
*/

const moon: Participant = {
  id: "self-moon",
  character: { id: "moon", name: "the Moon", emoji: "🌕" },
  realName: "You",
  isSelf: true,
};

const armstrong: Participant = {
  id: "peer-armstrong",
  character: { id: "armstrong", name: "Neil Armstrong", emoji: "🚀" },
  realName: "Sam Alvarez",
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
      text: "i brought you a flag tho. it's very nice",
      delayMs: 4200,
    },
    {
      senderId: armstrong.id,
      text: "also like 600 million people are watching us rn 📺",
      delayMs: 3800,
    },
    { senderId: armstrong.id, text: "so maybe act natural", delayMs: 4200 },
  ],
  ambientLines: [
    "the view of earth from here is unreal 🌍",
    "my boots are SO dusty",
    "one sec, houston keeps calling",
    "is it cool if i take a rock home?",
    "buzz says hi btw",
  ],
  replyLines: [
    "haha ok fair",
    "that's exactly what a moon would say",
    "wait till mission control hears this 😂",
    "noted. adding it to the mission report 📋",
    "you're pretty chatty for a rock",
    "10/10 would land here again",
  ],
};
