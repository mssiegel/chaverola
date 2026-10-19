import type { Catalog } from "../../types";

/**
 * Teacher surfaces: activity setup and the live host dashboard. Registered
 * from `i18n/ns/teacher.ts`, so it rides those pages' chunks.
 *
 * The monitoring chat card's strings are deliberately NOT here — it renders on
 * the homepage too, so they live in `common`.
 *
 * Everything a teacher TYPED (the host name, character names, the student
 * instructions, an email address, a student's real name) arrives as an
 * interpolation and is never translated. Names and addresses come through
 * `{{x, bidi}}` so a Latin run inside a Hebrew sentence can't drag the
 * punctuation to the wrong end.
 */
export const teacher = {
  // ---------------------------------------------------------------------
  // /activity/create — the setup page and its form

  // The meta pair is written for a search result and doesn't have to match
  // `setup.title` below, which is the page's own h1.
  "setup.meta.title": "Create a Classroom Roleplay Activity",
  "setup.meta.description":
    "Name the characters your students will play and write what they should talk about. Setup takes about a minute, then you get the 4-digit join code.",

  "setup.badge": "For teachers",
  "setup.title": "Set up your activity",
  "setup.body": "Setup takes about a minute.",

  "setup.characters.title": "Characters",
  "setup.characters.hint":
    "Students play these characters when you pair them up. Two is all you need, but you can add as many as you like.",
  "setup.aboutYou.title": "About you",
  "setup.instructions.title": "Student instructions",
  "setup.instructions.hint":
    "Tell students what to do, whether that's a scene to play or a question to debate. They read it in the lobby while they wait.",
  "setup.optional": "optional",
  "setup.optionalTag": "(optional)",

  "setup.failure.unreachable":
    "We can't reach Chaverola right now. Check your internet, then try again. Everything you typed is still here.",
  "setup.failure.server":
    "Something went wrong on our end and the activity wasn't created. Give it a second, then try again.",
  "setup.hosting": "Setting up your activity…",
  "setup.host": "Host the Activity",

  // The placeholder cast is example content, not copy to translate — each
  // locale gets the roster its own classroom would recognise.
  "characters.placeholder1": "Caesar's ghost",
  "characters.placeholder2": "Brutus",
  "characters.placeholder3": "Cleopatra",
  "characters.placeholder4": "Marc Antony",
  "characters.placeholderExtra": "Another character",
  "characters.nameLabel": "Character {{number}} name",
  "characters.emojiLabel": "Add an emoji to character {{number}}",
  "characters.removeLabel": "Remove character {{number}}",
  "characters.add": "Add a character",

  // How the cast gets dealt into a chat. These two bodies carry the first-N
  // rule, which is why the section hint above stays short.
  "characters.mode.label": "How characters get handed out",
  "characters.mode.inOrder.title": "In order",
  "characters.mode.inOrder.body":
    "A pair uses your first two character names, a trio the first three character names, etc.",
  "characters.mode.shuffled.title": "Shuffled",
  "characters.mode.shuffled.body":
    "Each chat gets its characters at random from your character list. No two students in a chat get the same character.",

  "aboutYou.name.label": "Your name",
  "aboutYou.name.placeholder": "Ms. Cohen",
  "aboutYou.email.label": "Your email",
  "aboutYou.email.placeholder": "you@school.org",
  "aboutYou.email.hint":
    "We'll email you every chat from the activity once it wraps up.",

  "instructions.placeholder":
    "Rome, 44 BC, the night before the Ides of March…",

  "preview.label": "What students see",
  "preview.waiting": "Waiting for your match",
  "preview.hostedBy": "Hosted by",
  "preview.characters": "Characters in this activity",
  "preview.charactersEmpty": "Your characters show up here once you name them.",
  "preview.instructions": "Instructions",
  "preview.caption":
    "This is the lobby your class waits in. It fills in as you type.",

  // The activity's language. Spelled out rather than interpolated from the
  // locale list: Hebrew glues its preposition onto the word ("בעברית"), so an
  // endonym dropped into a slot would read wrong. A third language writes its
  // own two strings.
  //
  // One setting in the section, so the heading carries both halves and the
  // switch sits on that same row. No separate row title, and no hint above
  // it — the body below is the only prose.
  "language.title": "Language Settings - Keep students in English",
  "language.lock.body":
    "Every student who joins reads the website in English and they can't switch the language. It's worth keeping on if you teach English as a second language.",

  "settings.title": "Settings",
  "settings.hint":
    "These start out the way we recommend. You can change any of them while the activity runs.",
  "settings.reveal.title": "Reveal names when a chat ends",
  "settings.reveal.body":
    "Chats are anonymous while they run. When one ends, the students in it find out who they were really talking to.",
  "settings.rematch.title": "Warn before a rematch",
  "settings.rematch.body":
    "You get a heads-up when a pairing would put the same students together again.",
  "settings.autoMatch.title": "Match students 1:1 automatically",
  "settings.autoMatch.bodyPaused":
    "Auto-match is on hold while chats are paused. When you resume, two students who have each waited long enough get paired up on their own.",
  "settings.autoMatch.body":
    "Once two students have each waited long enough, they get paired up on their own. Nobody lands right back with their last partner.",
  "settings.autoMatch.wait": "Students wait",
  // Not a plural key: the stepper steps by 5 from 5, so 1 and 2 are
  // unreachable. `{{seconds}}` rather than `{{count}}` keeps i18next's plural
  // resolver out of it entirely.
  "settings.autoMatch.seconds": "{{seconds}} seconds",
  "settings.autoMatch.less": "Five seconds less",
  "settings.autoMatch.more": "Five seconds more",

  // Validation. `lib/activitySetup.ts` and `lib/hostActivity.ts` are pure
  // modules, so they name these keys and the form calls `t`.
  "problem.needTwoCharacters":
    "Name at least two characters so students have parts to play.",
  "problem.duplicateCharacter":
    "Two characters can't share a name. Change one of them.",
  "problem.hostName": "Add your name so students know who's hosting.",
  "problem.email":
    "That email doesn't look right. Fix it, or clear the field if you don't want the chats emailed.",
  "problem.characterInUse":
    "Your class already has this character, so it needs a name. To drop a character, use the remove button on rows 3 and 4.",

  // ---------------------------------------------------------------------
  // /activity/host/:hostKey — the live dashboard

  "host.meta.title": "Your Live Activity",
  // `1234` is the one host URL anyone is meant to share: it's what /demo and
  // /demo/teacher redirect into, and what gets pasted into an email to a
  // principal. So it gets a pair written for that reader, where a real
  // session — unguessable and never indexed — gets the private title above.
  "host.demo.meta.title": "Teacher Dashboard Demo: Watch a Live Class",
  "host.demo.meta.description":
    "A Roman history class is already running here, and there's nothing to sign up for. Every chat is a live card with a real name beside every character.",

  "host.badge": "For teachers",
  "host.loading": "Finding your activity…",
  "host.unreachable.title": "We can't reach Chaverola",
  "host.unreachable.body":
    "Your activity may well still be running. Check your internet, then try again.",
  "host.notFound.title": "That activity isn't running",
  "host.notFound.body":
    "Activities only stay up while class is happening, and this link doesn't match any that are live right now. If you typed or pasted it, double-check it. Setting up a new activity takes about a minute.",
  "host.newActivity": "Set up a new activity",

  "host.title": "Your activity is live",
  "host.hostedBy": "Hosted by {{name, bidi}}",
  "host.waitingToChat": "waiting to chat",
  "host.pairThemUp": "Pair them up below, or let auto-match handle it.",
  "host.sharePin": "Share the pin below and they'll pop up here.",
  "host.queueRefills": "The queue refills as chats wrap up.",
  "host.reconnecting_one":
    "+{{count}} reconnecting, so they can't pair up yet.",
  "host.reconnecting_other":
    "+{{count}} reconnecting, so they can't pair up yet.",
  "host.pin": "pin",

  "host.offline.title": "Reconnecting to your class…",
  "host.offline.body":
    "Everything below is from right before you lost connection. It catches up as soon as you're back.",

  "host.hint.waiting_one": "{{count}} student waiting",
  "host.hint.waiting_other": "{{count}} students waiting",
  "host.hint.stalled": "No one can pair yet. Waiting on students to reconnect",
  "host.hint.noStudents": "No students yet. Share the pin to let them in",
  "host.hint.allChatting":
    "Everyone's chatting. The queue refills as chats end",

  "host.rematchWarning.pair":
    "{{names}} just chatted with each other. You can still pair them, this is only a heads-up.",
  "host.rematchWarning.group":
    "{{names}} just chatted together. You can still pair them, this is only a heads-up.",

  "host.demo.caption": "A real class does all this by itself.",
  "host.demo.join": "A student joins",
  "host.demo.wifi": "A student's wifi blips",

  "host.wrapUp.title": "Wrap up the activity",
  "host.wrapUp.demo": "Ends every chat. The demo doesn't email anyone.",
  "host.wrapUp.email":
    "Ends every chat and emails the transcript to {{email, bidi}}.",
  "host.wrapUp.noEmail":
    "Ends every chat. No email is set, so nothing will be sent.",
  "host.wrapUp.cta": "End activity",

  // The joining instructions
  "joining.title": "Student joining instructions",
  "joining.hint.pin": "Pin {{code}}",
  "joining.hint.site": "students join at",
  "joining.pinLabel": "Activity pin",
  "joining.tellClass": "Tell your class:",
  "joining.step1": "Go to",
  "joining.step2": "Tap",
  "joining.step3": "Type in the pin",
  "joining.body":
    "Say the pin out loud or write it on the board. Keep your screen to yourself, because any student who sees your screen will know who they're about to chat with.",
  "joining.copy": "Copy the student join link",
  "joining.copied": "Copied!",

  // The pairing rail
  "pairing.title": "Pair your students",
  "pairing.hold.none":
    "Auto-match is off. Students land back here as their chats wrap up.",
  "pairing.hold.waiting_one": "1 student is waiting, and auto-match is off.",
  "pairing.hold.waiting_other":
    "{{count}} students are waiting, and auto-match is off.",
  "pairing.hold.turnOn": "Turn auto-match back on",
  "pairing.empty.noStudents.title": "No students yet",
  "pairing.empty.noStudents.body":
    "Read out the pin and they'll show up here as they join.",
  "pairing.empty.chatting.title": "Everyone's chatting",
  "pairing.empty.chatting.body":
    "Students come back here once their chats end.",
  "pairing.pairEveryone": "Pair everyone 1:1",
  "pairing.start": "Start their chat",
  // `{{selected}}`, not `{{count}}`: this is never a plural — it's the tally
  // on the button — and `count` would send i18next hunting for suffixed keys.
  "pairing.startWithCount": "Start their chat ({{selected}})",
  "pairing.parked": "Waiting on {{names}} to reconnect.",
  "pairing.tapHint":
    "Tap two students to pair them. Characters get dealt out randomly.",
  "pairing.tapHintGroup":
    "Tap two students to pair them, or up to {{max}} for a group. Characters get dealt out randomly.",
  // The dismissible rail notice. The server sends the KIND and its names or
  // counts; the wording is here. Both counts below are always 2 or more — a
  // chat needs two students, and the first two roster rows can't be removed —
  // so neither needs a plural form.
  "pairing.notice.stuckInLine.pair":
    "{{names}} just chatted with each other, so they're still in line.",
  "pairing.notice.stuckInLine.group":
    "{{names}} just chatted together, so they're still in line.",
  "pairing.notice.tooFewCharacters":
    "You picked {{studentCount}} students, but your cast only has {{characterCount}} characters, so no chat started. Refresh this page to see the current cast.",
  "pairing.firstInLine": "first in line",
  "pairing.remove": "Remove {{name, bidi}} from the activity",
  "pairing.wait.seconds": "{{value}}s",
  "pairing.wait.minutes": "{{value}}m",
  "pairing.autoMatch.off":
    "Auto-match is off: students wait here until you pair them.",
  "pairing.autoMatch.paused": "Auto-match is on hold while chats are paused.",
  "pairing.autoMatch.on":
    "Auto-match is on: students pair up on their own after waiting {{seconds}} seconds.",

  // Chats in progress
  "chats.title": "Chats in progress",
  "chats.hint.none": "No chats going right now",
  "chats.hint.paused_one": "Paused: {{count}} student mid-chat",
  "chats.hint.paused_other": "Paused: {{count}} students mid-chat",
  "chats.hint.active_one": "{{count}} student chatting right now",
  "chats.hint.active_other": "{{count}} students chatting right now",
  "chats.empty.paused.title": "Still paused",
  "chats.empty.paused.body":
    "The chats are over, but the class is still paused. Nobody gets matched again until you resume.",
  "chats.empty.none.title": "No chats yet",
  "chats.empty.none.body":
    "Pair two students in the queue, or start the whole round in one tap.",
  // <1> is the bold count. One <Trans>, not a number glued to a key, because
  // where the number lands in the sentence is a word-order decision.
  "chats.chatting_one": "<1>{{count}}</1> student chatting",
  "chats.chatting_other": "<1>{{count}}</1> students chatting",
  "chats.resume": "Resume",
  "chats.pauseAll": "Pause all chats",
  "chats.endAll": "End all chats",
  "chats.pausedNotice":
    "Chats are paused. Students can read their chat but can't type until you resume.",
  "chats.emptyHint": "No messages yet. They'll show up here as students type.",

  // Completed chats
  "completed.title": "Completed chats",
  "completed.hint.none": "Ended chats land here",
  "completed.hint.count_one": "{{count}} wrapped up",
  "completed.hint.count_other": "{{count}} wrapped up",
  "completed.empty":
    "Nothing here yet. When a chat ends, its card moves down here.",
  "completed.emptyHint": "This chat ended before anyone said anything.",

  // The live settings panel
  "liveSettings.title": "Edit activity settings",
  "liveSettings.hint.set":
    "Everything from setup, still editable while the activity runs",
  "liveSettings.hint.noEmail":
    "Add your email and we'll send you every chat when the activity wraps up",
  "liveSettings.body":
    "Your name, the instructions, the characters, settings, and your email all save as soon as you pause typing, and students waiting in the lobby see the changes right away. A chat that's already running keeps the characters it started with, so nobody gets renamed mid-conversation. New chats use your latest cast.",

  // Confirmations
  "confirm.cancel": "Never mind",
  "confirm.removeStudent.title": "Remove {{name, bidi}}?",
  "confirm.removeStudent.body":
    "They'll be signed out and sent back to the join screen, with a note that you removed them. They can sign in again, with a better name if that was the problem.",
  "confirm.remove": "Remove them",
  "confirm.removeFromChat.title": "Remove {{name, bidi}} from their chat?",
  "confirm.removeFromChat.group":
    "They'll be signed out and sent back to the join screen. The rest of the group keeps chatting, and classmates only see that the character left, not that you removed anyone.",
  "confirm.removeFromChat.pair":
    "They'll be signed out and sent back to the join screen, and their partner's chat ends. Nobody is told it was a removal.",
  "confirm.pause.title": "Pause all chats?",
  "confirm.pause.body":
    "Students keep their chat on screen but can't send anything until you resume.",
  "confirm.pause.confirm": "Pause chats",
  "confirm.endActivity.title": "End the activity for everyone?",
  "confirm.endActivity.consequences":
    "Every chat ends right now and your students see the activity is over. The join code stops working, so nobody else can join.",
  "confirm.endActivity.demo": "This is the demo, so nothing gets emailed.",
  "confirm.endActivity.noEmail":
    "No email is set, so nothing will be emailed. The chats will only be here on this page.",
  // Zero is its own sentence rather than a plural form — i18next honours a
  // `_zero` branch only for languages whose CLDR set has one, and neither en
  // nor he does.
  "confirm.endActivity.noChats":
    "No chats have happened yet, so there's nothing to email to {{email, bidi}}.",
  "confirm.endActivity.send_one": "We'll email the chat to {{email, bidi}}.",
  "confirm.endActivity.send_other":
    "We'll email all {{count}} chats to {{email, bidi}}.",
  "confirm.endActivity.confirm": "End activity",
  "confirm.endActivity.cancel": "Keep it running",
  "confirm.endAll.title": "End all chats?",
  "confirm.endAll.hold":
    "Every active chat will end right now for everyone in it. Auto-match goes on hold too, so students wait in the lobby until you pair them or turn it back on.",
  "confirm.endAll.body":
    "Every active chat will end right now for everyone in it. Students will see the chat is over and can head back to the lobby for another round.",
  "confirm.endAll.confirm": "End all chats",
  "confirm.endAll.cancel": "Let them keep chatting",

  // The wrapped-up screen. The emoji tiles stay in code — they're art.
  "wrapped.demo.title": "That's a wrap",
  "wrapped.demo.body":
    "This is the demo, so nothing gets emailed. In a real activity, every chat is sent to your inbox the moment you end it.",
  "wrapped.sending.title": "Sending your transcripts…",
  "wrapped.sending.body":
    "We're emailing every chat to {{to, bidi}}. This only takes a moment.",
  "wrapped.unconfirmed.title": "We didn't hear back about the email",
  "wrapped.unconfirmed.body":
    "The message to {{to, bidi}} may still have gone out, but we never heard back either way. Check your inbox in a few minutes. Your chats are below, so copy anything you want to keep before you close this tab.",
  "wrapped.sent.title": "Sent to {{to, bidi}}",
  "wrapped.sent.body":
    "Every chat from this class is on its way to your inbox. Give it a minute to land.",
  "wrapped.failed.title": "We couldn't send the email",
  "wrapped.failed.body":
    "The message to {{to, bidi}} didn't go through. Your chats are still below, so copy anything you want to keep before you close this tab.",
  "wrapped.empty.title": "That's a wrap",
  "wrapped.empty.noMessages":
    "These chats had no messages, so there was nothing to email. They're below if you want to look back.",
  "wrapped.empty.noEmail":
    "You didn't set an email for this activity, so nothing was sent. Your chats are below if you want to reread them.",
} as const satisfies Catalog;

export type TeacherCatalog = typeof teacher;
