import type { Catalog } from "../../types";

/**
 * Student surfaces: the join flow, the lobby, and the chat-ended screens.
 * Registered from `i18n/ns/student.ts`, so it rides that page's chunk.
 *
 * Everything a STUDENT alone sees. The chatbox chrome around it — header,
 * feed, composer, banners — is mounted by the homepage and the teacher's
 * pages too, so it lives in `chat`.
 */
export const student = {
  "title.join": "Join an Activity",
  "title.reconnecting": "Reconnecting",
  "title.lobby": "Waiting Lobby",
  "title.chatting": "Chatting",
  "title.ended": "Chat Ended",
  "title.activityGone": "Activity Ended",

  // The gate's SEO pair. It's a separate key from `title.join` precisely
  // because that one is also the card's h1 (JoinGateCard) — a title written
  // for a search result would rewrite the heading a student reads.
  "join.meta.title": "Join the Activity with Your 4-Digit Code",
  "join.meta.description":
    "Got a code from your teacher? Type it in, then add your name. You'll wait a moment for a classmate to pair up with, and you never need an account.",

  // /activity/join/1234 — where /demo/student lands. A teacher sizing the
  // activity up from a link, not a student holding a code, so it says what
  // they're about to see. It never promises a real classmate: the demo's
  // peers are simulated (the same reason `demo.studentBody` hedges).
  "join.demo.meta.title": "Student Demo: Get a Secret Character",
  "join.demo.meta.description":
    "Sit where your students sit in the demo class. You're dealt a secret character and dropped into a live in-character chat, with no code to type in.",

  // The one form serving both gate stages. `title.join` doubles as the h1,
  // which is why the SEO title above is its own key — don't merge them.
  "gate.hostedBy": "Hosted by ",
  "gate.code": "code",
  "gate.codePrompt": "Enter your activity's code.",
  "gate.removed": "Your teacher removed you from the activity. ",
  "gate.reenterName": "Enter your name to join again.",
  "gate.yourName": "Your name",
  "gate.joinCode": "Join code",
  "gate.notFound": "Activity was not found. Recheck the Join Code you entered.",
  "gate.unreachable":
    "We can't reach Chaverola right now. Check your internet, then try again.",
  "gate.finding": "Finding your activity…",
  "gate.join": "Join Activity",
  "gate.continue": "Continue",

  "gone.title": "This activity is over",
  "gone.body":
    "Your class wrapped up. Thanks for playing! If class is still going, something cut the activity short. Ask your teacher for a fresh code.",
  "gone.cta": "Enter a new code",

  "full.title": "This activity is full",
  "full.body":
    "An activity holds up to {{max}} students, and every spot is taken right now. If someone leaves, their spot opens up.",
  "full.checking": "Checking for a spot…",
  "full.retry": "Try again",
  "full.otherCode": "Use a different code",

  "reconnecting.title": "Hang tight, {{name, bidi}}",
  "reconnecting.body":
    "We can't reach Chaverola right now. Your spot is saved, and this screen opens back into your lobby as soon as we get through.",
  /** The amber pill, shared by this card and the lobby — same event, same
   *  sentence, wherever the student is standing. */
  "reconnecting.pill": "Reconnecting you…",
  "reconnecting.tryNow": "Try now",

  "lobby.title": "You're in, {{name, bidi}}! 🎉",
  // The body line moves as the wait stretches, so a long wait reads
  // differently from a short one without promising a time.
  "lobby.waiting":
    "{{hostName, bidi}} is picking who chats with who. When it's your turn, the chat opens right here.",
  "lobby.waitingStill":
    "Still finding you a partner. Hang tight, your chat opens right here.",
  "lobby.waitingLong":
    "You're still in line. Your chat will open here when you're matched.",
  "lobby.paused":
    "Your teacher hit pause for a moment. When things start back up, your chat opens right here.",
  // "Can't reach" rather than "your teacher stepped away": all the server
  // knows is that no teacher device is connected.
  "lobby.teacherAway":
    "We can't reach your teacher's screen right now, so nobody's getting matched. When they're back, your chat opens right here.",
  "lobby.pillPaused": "Class is paused",
  "lobby.pillTeacherAway": "Waiting for your teacher",
  "lobby.pillWaiting": "Waiting for your match",
  "lobby.hostedBy": "Hosted by",
  "lobby.characters": "Characters in this activity",
  "lobby.instructions": "Instructions",
  "lobby.leave": "Leave the activity",
  "lobby.leaveTitle": "Leave the activity?",
  "lobby.leaveBody":
    "Your teacher will see you've left. You can rejoin with the same code, but you'd start waiting again.",
  "lobby.leaveConfirm": "Leave activity",
  "lobby.leaveCancel": "Keep waiting",

  // The mid-chat exit. The 1:1 half reuses `common`'s endChat.title /
  // endChat.confirm — the teacher's card asks the same question.
  "exit.leave": "Leave",
  "exit.end": "End chat",
  /** The phone-width label for the same button. */
  "exit.endShort": "End",
  "exit.endBody":
    "This ends the chat for everyone in it, and there's no reopening it. You can head back to the lobby whenever you're ready.",
  "exit.leaveTitle": "Leave this chat?",
  "exit.leaveBody":
    "The chat keeps going without you, and there's no coming back in. You can head back to the lobby whenever you're ready.",
  "exit.keepChatting": "Keep chatting",

  /*
    The wrap-up screen — one title and body per way a chat can end. The emoji
    tiles stay in code beside them, on purpose: they're art, not copy, and a
    translator changing 🎬 to something else would break the visual language
    the eight endings share.
  */
  "ended.student.title": "And… scene!",
  "ended.student.body": "You ended this chat. Nicely played! 👏",
  "ended.student.bodyGroup":
    "You ended this chat for the whole group. Nicely played! 👏",
  /** An older server sends no `endedBy`, so the wrap-up can't name a
   *  character. `chat` has the same string for its banner; a namespace-hop
   *  would cost `endedCopy` its typed key union for one word. */
  "ended.partner": "Your partner",
  "ended.peer.title": "{{name, bidi}} ended the chat",
  "ended.peer.body": "That's a wrap for this one. Nicely played! 👏",
  "ended.teacher.title": "Your teacher ended the chat",
  "ended.teacher.body": "Time for what's next in class. Nicely played! 👏",
  "ended.peerTimeout.title": "Your partner lost connection",
  "ended.peerTimeout.body":
    "They couldn't get back in, so this chat ended. Not your fault!",
  "ended.selfTimeout.title": "You lost connection",
  "ended.selfTimeout.body":
    "You couldn't get back in time, so this chat ended for you. It happens!",
  "ended.selfLeft.title": "You left the chat",
  "ended.selfLeft.body":
    "The others are still chatting away. Nicely played! 👏",
  // No applause on this one: it's the only ending the student neither chose
  // nor lost to the wifi.
  "ended.removed.title": "Your teacher took you out of the activity",
  "ended.removed.body":
    "That ends this chat too. You can join again with your name.",
  "ended.fallback.title": "Great roleplay!",
  "ended.fallback.body": "That chat has ended. Nicely played. 👏",

  "ended.secretLeft":
    "Names stay secret. This chat is still going without you.",
  "ended.secretDefault":
    "Names stay secret. Your teacher hasn't revealed them.",
  /** The live room's replacement: there is no reveal setting to blame yet. */
  "ended.secretLive": "Names stay secret. That's the whole game.",
  "ended.revealTitle": "You were really chatting with",
  "ended.joinAgain": "Join again",
  "ended.done": "Done",
  "ended.again": "Ready for another round? 🚀",
  "ended.backToLobby": "Back to the lobby",

  // The demo steering panels — permanent furniture on the demo activity, and
  // the visitor's only way to drive the story.
  "demo.lobbyCaption": "In a real activity, your teacher does this part.",
  "demo.chatCaption": "In a real chat these happen on their own.",
  "demo.pairDuo": "Pair me 1-on-1",
  "demo.pairGroup": "Put me in a group of 3",
  "demo.pause": "Teacher pauses the class",
  "demo.resume": "Teacher resumes the class",
  "demo.wifiBlip": "Your wifi blips",
  "demo.removeMe": "Teacher removes you",
  "demo.reveal": "Your teacher reveals names when the chat ends",
  "demo.makeSomethingHappen": "Make something happen",
  "demo.peerDrops": "Partner drops off",
  "demo.peerReturns": "Partner comes back",
  "demo.skipWait": "Skip the wait",
  "demo.makeThemTalk": "Make them talk",
  "demo.peerEndsChat": "Partner ends chat",
  "demo.peerLeavesChat": "Partner leaves chat",
  "demo.youDropOff": "You drop off (2 min pass)",
  "demo.teacherEndsChat": "Teacher ends chat",
  "demo.teacherEndsActivity": "Teacher ends the activity",
} as const satisfies Catalog;

export type StudentCatalog = typeof student;
