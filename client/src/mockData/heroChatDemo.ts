import type { Locale } from "@/lib/locale";
import type { ChatScenario, Participant } from "@/types/chat";

/*
  The homepage hero's live sample chat. A visitor lands mid-argument with a
  partner who is very badly keeping a secret — short, funny,
  classroom-appropriate lines that show the roleplay format at a glance.
  Played by the same demo engine as the student chatbox demo (`useChatDemo`),
  so typing in the hero gets a reply.

  Both casts are people a teacher would actually assign: English casts
  Cleopatra against Brutus the night before the Ides of March, Hebrew casts
  גולדה against בן־גוריון in the hours before the Declaration. Same joke, same
  beat structure, no shared sentence — see DECISIONS.md → "The hero demo is
  cast from the lesson, and it shares the demo activity's world" and "The
  Hebrew demo is re-cast, never translated".

  Each language's hero plays inside the same setting as that language's demo
  activity (`activityDemo.ts`), so the homepage promises the world the demo
  then delivers. It is a different room, though, not a preview of the demo's
  own chat: different students, a different moment, no shared line.

  Two deliberate limits, in both languages (see DECISIONS.md → "The hero demo
  goes quiet after two Armstrong lines", which named the old cast but caps
  this one):
  - After the visitor's zinger, the partner sends exactly two one-sentence
    lines. The teacher preview mirrors this same feed and always shows its
    newest lines, so a longer script buries the zinger in both views.
  - `ambientLines` is empty on purpose — no idle chatter. Once the script
    ends, the room waits for the visitor to answer.

  Names: the demo's fiction is that the visitor is borrowing a student's seat.
  The teacher card names that student, never "You" — the teacher assigns
  chats and is not a player. Real names stay short to keep the card header
  tight. See DECISIONS.md → "Demo students have short names, and the teacher
  is never one of them".

*/

const cleopatra: Participant = {
  id: "self-cleopatra",
  character: { id: "cleopatra", name: "Cleopatra 👑" },
  realName: "Dana K",
};

// No emoji, and no 🔪 in particular: the hero is the first roster a visitor
// ever sees, so one plain name in it says a teacher doesn't have to add one,
// and a knife is a poor first impression on a page pitched to schools. The
// demo activity's own roster still carries "Brutus 🔪".
const brutus: Participant = {
  id: "peer-brutus",
  character: { id: "brutus", name: "Brutus" },
  realName: "Sam A",
};

const golda: Participant = {
  id: "self-golda",
  character: { id: "golda", name: "גולדה 🕊️" },
  realName: "דנה",
};

// Plain for the same reason as Brutus above; the demo activity's roster
// carries "בן־גוריון 📜".
const benGurion: Participant = {
  id: "peer-ben-gurion",
  character: { id: "ben-gurion", name: "בן־גוריון" },
  realName: "יובל",
};

export const heroChatScenarios: Record<Locale, ChatScenario> = {
  en: {
    id: "hero",
    self: cleopatra,
    peers: [brutus],
    seedMessages: [
      {
        senderId: brutus.id,
        text: "tomorrow's senate meeting is completely normal btw",
      },
      {
        senderId: cleopatra.id,
        text: "nobody has ever said that about a normal meeting",
      },
      { senderId: brutus.id, text: "i'm saying it. that's how normal it is." },
      {
        senderId: cleopatra.id,
        text: "you are the least subtle man in Rome 😤",
      },
    ],
    script: [
      {
        senderId: brutus.id,
        text: "i brought you dates from the market tho",
        delayMs: 4200,
      },
      {
        senderId: brutus.id,
        text: "also half the forum is listening in rn, so maybe act natural 👀",
        delayMs: 4200,
      },
    ],
    ambientLines: [],
    replyLines: [
      "ok, that's fair",
      "spoken like a queen",
      "wait till the senate hears that one 😂",
      "noted. and i'll deny you said it 📜",
      "you're very calm for someone in Rome this week",
      "you'd have made a terrifying senator",
    ],
  },
  he: {
    id: "hero",
    self: golda,
    peers: [benGurion],
    // Ben-Gurion addresses Golda in the feminine throughout. That is
    // character dialogue, not app copy, so it sits outside the
    // masculine-second-person house style.
    seedMessages: [
      {
        senderId: benGurion.id,
        text: "גולדה, ההזמנה אומרת ארבע. ואל תספרי לאף אחד.",
      },
      { senderId: golda.id, text: "רגע. הזמנת אנשים לטקס סודי בפתק?" },
      { senderId: benGurion.id, text: "כתבתי עליו סודי. עם קו מתחת." },
      { senderId: golda.id, text: "יופי. עכשיו כל תל אביב יודעת 😤" },
    ],
    script: [
      {
        senderId: benGurion.id,
        text: "הבאתי לך את הנוסח לקרוא, אם זה עוזר",
        delayMs: 4200,
      },
      {
        // Radio, not television: the ceremony went out live on קול ישראל.
        senderId: benGurion.id,
        text: "וגם, הרדיו מחכה לנו בארבע, אז תתנהגי רגיל 📻",
        delayMs: 4200,
      },
    ],
    ambientLines: [],
    replyLines: [
      "טוב, מקובל עליי",
      "רק את יכולה להגיד דבר כזה",
      "חכי שהוועד ישמע את זה 😂",
      "רשמתי. ואני אכחיש שאמרת 📜",
      "את רגועה מדי בשביל הערב הזה",
      "היית מנהלת את הישיבה הזאת יותר טוב ממני",
    ],
  },
};
