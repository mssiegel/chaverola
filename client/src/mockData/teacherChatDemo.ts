import type { Participant, TeacherChatScenario } from "@/types/chat";

/*
  Demo chats for the teacher chat cards. One mocked activity round: three chats
  still going (the demo engine drips their `upcomingLines` in over time) and two
  already finished. Content is classroom appropriate and leans into famous
  characters, same as the student demo.
*/

// ---- Chat 1: Cleopatra vs. Julius Caesar ------------------------------------

const maya: Participant = {
  id: "t1-maya",
  character: { id: "cleopatra", name: "Cleopatra", emoji: "👑" },
  realName: "Maya Chen",
};

const leo: Participant = {
  id: "t1-leo",
  character: { id: "caesar", name: "Julius Caesar", emoji: "🏛️" },
  realName: "Leo Rivera",
};

const nileNegotiations: TeacherChatScenario = {
  id: "teacher-chat-1",
  participants: [maya, leo],
  status: "active",
  seedMessages: [
    { senderId: leo.id, text: "Rome says hi. We want your grain." },
    { senderId: maya.id, text: "Egypt is NOT sharing snacks with Rome" },
    { senderId: leo.id, text: "I have ten legions that say otherwise 🗡️" },
    {
      senderId: maya.id,
      text: "and I have the entire Nile. good luck marching through it",
    },
    { senderId: leo.id, text: "…fair point" },
    { senderId: leo.id, text: "what if we team up instead" },
    { senderId: maya.id, text: "keep talking" },
    {
      senderId: leo.id,
      text: "you rule Egypt, I rule Rome, we split the sea",
    },
    { senderId: maya.id, text: "deal. but I'm keeping the crown 👑" },
    { senderId: leo.id, text: "obviously. it suits you" },
  ],
  upcomingLines: [
    { senderId: maya.id, text: "wait. who gets Cyprus?" },
    { senderId: leo.id, text: "Rome. definitely Rome." },
    { senderId: maya.id, text: "absolutely not 😤" },
    { senderId: leo.id, text: "fine, we flip a coin for it" },
    { senderId: maya.id, text: "do you even HAVE coins yet" },
    { senderId: leo.id, text: "I'll put my face on one just for this" },
  ],
};

// ---- Chat 2: the Round Table (group of 3) -----------------------------------

const ava: Participant = {
  id: "t2-ava",
  character: { id: "arthur", name: "King Arthur", emoji: "🛡️" },
  realName: "Ava Thompson",
};

const noah: Participant = {
  id: "t2-noah",
  character: { id: "merlin", name: "Merlin", emoji: "🧙" },
  realName: "Noah Park",
};

const sofia: Participant = {
  id: "t2-sofia",
  character: { id: "robin", name: "Robin Hood", emoji: "🏹" },
  realName: "Sofia Alvarez",
};

const roundTable: TeacherChatScenario = {
  id: "teacher-chat-2",
  participants: [ava, noah, sofia],
  status: "active",
  seedMessages: [
    { senderId: ava.id, text: "Round table meeting. NOW." },
    { senderId: noah.id, text: "I foresaw this meeting 🔮" },
    { senderId: sofia.id, text: "did you foresee me taking the last chair" },
    { senderId: ava.id, text: "Robin. that's MY chair." },
    { senderId: sofia.id, text: "it's a ROUND table, they're all the same" },
    { senderId: noah.id, text: "she's got you there, sire" },
    { senderId: ava.id, text: "fine. new rule: no outlaws at the table" },
    { senderId: sofia.id, text: "make me a knight then 😏" },
    { senderId: ava.id, text: "absolutely not" },
  ],
  upcomingLines: [
    { senderId: noah.id, text: "the prophecy says she becomes a knight btw" },
    { senderId: ava.id, text: "the prophecy is WRONG" },
    { senderId: sofia.id, text: "Sir Robin. has a nice ring to it" },
    { senderId: noah.id, text: "🔮✨" },
    { senderId: ava.id, text: "I need a new wizard" },
    { senderId: sofia.id, text: "and I'll take a sword too, thanks" },
  ],
};

// ---- Chat 3: Socrates vs. Alexander the Great -------------------------------

const liam: Participant = {
  id: "t3-liam",
  character: { id: "socrates", name: "Socrates", emoji: "🏺" },
  realName: "Liam O'Connor",
};

const emma: Participant = {
  id: "t3-emma",
  character: { id: "alexander", name: "Alexander the Great", emoji: "⚔️" },
  realName: "Emma Davis",
};

const endlessQuestions: TeacherChatScenario = {
  id: "teacher-chat-3",
  participants: [liam, emma],
  status: "active",
  seedMessages: [
    {
      senderId: emma.id,
      text: "I conquered half the world before I turned 30 ⚔️",
    },
    { senderId: liam.id, text: "but do you truly KNOW what conquering is?" },
    { senderId: emma.id, text: "yes. it's when the land becomes mine" },
    { senderId: liam.id, text: 'and what is "mine", really?' },
    { senderId: emma.id, text: "not this again" },
    { senderId: liam.id, text: "I only ask questions 🏺" },
    { senderId: emma.id, text: "that's literally ALL you do" },
    { senderId: liam.id, text: "is it? interesting. why do you think that?" },
  ],
  upcomingLines: [
    {
      senderId: emma.id,
      text: "I'm going to conquer somewhere you can't follow",
    },
    { senderId: liam.id, text: "can anyone truly escape a question?" },
    { senderId: emma.id, text: "watch me" },
    { senderId: liam.id, text: "but what IS watching?" },
    { senderId: emma.id, text: "GUARDS" },
    { senderId: liam.id, text: "the unexamined chat is not worth having" },
  ],
};

// ---- Chat 4 (ended): Leonardo da Vinci and the Mona Lisa --------------------

const priya: Participant = {
  id: "t4-priya",
  character: { id: "davinci", name: "Leonardo da Vinci", emoji: "🎨" },
  realName: "Priya Patel",
};

const grace: Participant = {
  id: "t4-grace",
  character: { id: "monalisa", name: "Mona Lisa", emoji: "🖼️" },
  realName: "Grace Kim",
};

const sittingStill: TeacherChatScenario = {
  id: "teacher-chat-4",
  participants: [priya, grace],
  status: "ended",
  seedMessages: [
    { senderId: priya.id, text: "hold still, I'm almost done" },
    { senderId: grace.id, text: "you said that THREE HUNDRED years ago" },
    { senderId: priya.id, text: "art takes time" },
    { senderId: grace.id, text: "my smile hurts, Leo" },
    {
      senderId: priya.id,
      text: "that half-smile is going to be famous, trust me",
    },
    {
      senderId: grace.id,
      text: "famous enough to get me a chair with a back?",
    },
    { senderId: priya.id, text: "…I'll sketch you one" },
    {
      senderId: grace.id,
      text: "you'll sketch it and never build it. classic",
    },
  ],
  upcomingLines: [],
};

// ---- Chat 5 (ended): Amelia Earhart and Neil Armstrong ----------------------

const omar: Participant = {
  id: "t5-omar",
  character: { id: "earhart", name: "Amelia Earhart", emoji: "✈️" },
  realName: "Omar Haddad",
};

const ella: Participant = {
  id: "t5-ella",
  character: { id: "armstrong", name: "Neil Armstrong", emoji: "🚀" },
  realName: "Ella Johnson",
};

const flyingContest: TeacherChatScenario = {
  id: "teacher-chat-5",
  participants: [omar, ella],
  status: "ended",
  seedMessages: [
    { senderId: omar.id, text: "race you around the planet 🌍" },
    { senderId: ella.id, text: "cute. I went around the MOON" },
    {
      senderId: omar.id,
      text: "landing on it is cheating, there's no weather up there",
    },
    { senderId: ella.id, text: "no weather?? there's no AIR" },
    { senderId: omar.id, text: "exactly. sounds easy" },
    { senderId: ella.id, text: "ok you fly the rocket next time" },
    { senderId: omar.id, text: "deal 🚀" },
  ],
  upcomingLines: [],
};

export const teacherChatScenarios: TeacherChatScenario[] = [
  nileNegotiations,
  roundTable,
  endlessQuestions,
  sittingStill,
  flyingContest,
];
