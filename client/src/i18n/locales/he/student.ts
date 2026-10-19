import type { HebrewOf } from "../../types";
import type { StudentCatalog } from "../en/student";

/**
 * Hebrew — masculine second person throughout; see `he/common.ts` for the
 * house style this folder follows. This namespace talks to teenagers, so it
 * reads at upper-middle/high-school level and sounds like the game it is.
 *
 * One rule beyond the house style, because these screens talk ABOUT the
 * teacher constantly: prefer a phrasing that names no actor
 * ("הוצאת מהפעילות", "הצ׳אט נסגר") over one that has to guess the teacher's
 * gender. Where the sentence is *about* what a teacher does — the demo
 * steering buttons — masculine, like everything else here. See DECISIONS.md →
 * "Hebrew talks about the teacher without guessing their gender".
 */
export const student: HebrewOf<StudentCatalog> = {
  "title.join": "הצטרפות לפעילות",
  "title.reconnecting": "מתחבר מחדש",
  "title.lobby": "חדר המתנה",
  "title.chatting": "בצ׳אט",
  "title.ended": "הצ׳אט נגמר",
  "title.activityGone": "הפעילות נגמרה",

  // The gate's SEO pair, separate from `title.join` above because that one
  // is also the card's h1 (JoinGateCard). "שיבוץ" is the word the Hebrew
  // lobby itself uses, and an Israeli student reads it as an ordinary school
  // word where a literal "בן זוג לצ׳אט" reads as translated.
  "join.meta.title": "הצטרפות לפעילות עם קוד בן 4 ספרות",
  "join.meta.description":
    "קיבלת קוד מהמורה? מקלידים אותו כאן ואז מוסיפים שם. מחכים רגע לשיבוץ עם מישהו מהכיתה, ולא צריך חשבון ולא צריך להתקין כלום.",

  // /activity/join/1234 — where /demo/student lands. Addressed to the
  // teacher trying the student's seat, so masculine second person here,
  // unlike the gate above. Names no classmate: the demo's peers are
  // simulated, the same hedge `demo.studentBody` makes.
  "join.demo.meta.title": "דמו לתלמיד: לקבל דמות סודית",
  "join.demo.meta.description":
    "כאן אתה יושב בדיוק במקום של התלמידים שלך, בכיתת הדמו. מקבל דמות סודית ונכנס איתה לצ׳אט חי, בלי להקליד קוד ובלי להירשם.",

  // "מנחה:" is a label rather than a verb — the same call the teacher's host
  // page and the transcript email make, and it sidesteps agreement entirely.
  "gate.hostedBy": "מנחה: ",
  "gate.code": "קוד",
  "gate.codePrompt": "מקלידים כאן את הקוד של הפעילות.",
  "gate.removed": "הוצאת מהפעילות. ",
  "gate.reenterName": "מקלידים את השם כדי להצטרף שוב.",
  "gate.yourName": "השם שלך",
  "gate.joinCode": "קוד הצטרפות",
  "gate.notFound": "לא מצאנו את הפעילות. כדאי לבדוק שוב את קוד ההצטרפות.",
  "gate.unreachable":
    "אנחנו לא מצליחים להגיע לחברולה כרגע. כדאי לבדוק את האינטרנט ולנסות שוב.",
  "gate.finding": "מחפשים את הפעילות שלך…",
  "gate.join": "להצטרף לפעילות",
  "gate.continue": "להמשיך",

  "gone.title": "הפעילות נגמרה",
  "gone.body":
    "הכיתה סיימה. תודה ששיחקת! אם השיעור עדיין רץ, משהו קטע את הפעילות באמצע. אפשר לבקש מהמורה קוד חדש.",
  "gone.cta": "להקליד קוד חדש",

  "full.title": "הפעילות מלאה",
  "full.body":
    "בפעילות אחת יש מקום ל־{{max}} תלמידים, וכרגע כל המקומות תפוסים. אם מישהו יוצא, מתפנה מקום.",
  "full.checking": "בודקים אם התפנה מקום…",
  "full.retry": "לנסות שוב",
  "full.otherCode": "להשתמש בקוד אחר",

  "reconnecting.title": "רגע אחד, {{name, bidi}}",
  "reconnecting.body":
    "אנחנו לא מצליחים להגיע לחברולה כרגע. המקום שלך שמור, והמסך הזה ייפתח בחזרה לחדר ההמתנה ברגע שנצליח.",
  "reconnecting.pill": "מתחבר מחדש…",
  "reconnecting.tryNow": "לנסות עכשיו",

  "lobby.title": "אתה בפנים, {{name, bidi}}! 🎉",
  "lobby.waiting":
    "{{hostName, bidi}} בוחר מי מדבר עם מי. כשיגיע תורך, הצ׳אט ייפתח בדיוק כאן.",
  "lobby.waitingStill": "עוד מחפשים לך שותף. רגע אחד, הצ׳אט ייפתח בדיוק כאן.",
  "lobby.waitingLong": "אתה עדיין בתור. הצ׳אט ייפתח כאן כשתשובץ לשיחה.",
  "lobby.paused": "יש הפסקה קצרה. כשחוזרים, הצ׳אט ייפתח בדיוק כאן.",
  "lobby.teacherAway":
    "אנחנו לא מצליחים להגיע למסך של המורה, אז אף אחד לא משובץ כרגע. כשהחיבור יחזור, הצ׳אט ייפתח בדיוק כאן.",
  "lobby.pillPaused": "השיעור מושהה",
  "lobby.pillTeacherAway": "מחכים למורה",
  "lobby.pillWaiting": "מחכים לשיבוץ",
  "lobby.hostedBy": "מנחה",
  "lobby.characters": "הדמויות בפעילות",
  "lobby.instructions": "הוראות",
  "lobby.leave": "לצאת מהפעילות",
  "lobby.leaveTitle": "לצאת מהפעילות?",
  "lobby.leaveBody":
    "היציאה שלך תופיע אצל המורה. אפשר להצטרף שוב עם אותו קוד, אבל תתחיל לחכות מהתחלה.",
  "lobby.leaveConfirm": "לצאת",
  "lobby.leaveCancel": "להמשיך לחכות",

  "exit.leave": "לצאת",
  "exit.end": "לסיים את הצ׳אט",
  "exit.endShort": "לסיים",
  "exit.endBody":
    "זה מסיים את הצ׳אט לכל מי שנמצא בו, ואין דרך לפתוח אותו מחדש. אפשר לחזור לחדר ההמתנה מתי שרוצים.",
  "exit.leaveTitle": "לצאת מהצ׳אט?",
  "exit.leaveBody":
    "הצ׳אט ימשיך בלעדיך, ואין דרך לחזור אליו. אפשר לחזור לחדר ההמתנה מתי שרוצים.",
  "exit.keepChatting": "להמשיך לדבר",

  // "קאט!" is what an Israeli set actually shouts — the Hebrew twin of
  // "And… scene!", not a translation of it.
  "ended.student.title": "ו… קאט!",
  "ended.student.body": "סיימת את הצ׳אט. כל הכבוד! 👏",
  "ended.student.bodyGroup": "סיימת את הצ׳אט לכל הקבוצה. כל הכבוד! 👏",
  "ended.partner": "השותף שלך",
  "ended.peer.title": "{{name, bidi}} סיים את הצ׳אט",
  "ended.peer.body": "זהו לסיבוב הזה. כל הכבוד! 👏",
  "ended.teacher.title": "הצ׳אט נסגר",
  "ended.teacher.body": "ממשיכים לדבר הבא בשיעור. כל הכבוד! 👏",
  "ended.peerTimeout.title": "לשותף שלך נפל החיבור",
  "ended.peerTimeout.body": "הוא לא הצליח לחזור, אז הצ׳אט נגמר. לא אשמתך!",
  "ended.selfTimeout.title": "נפל לך החיבור",
  "ended.selfTimeout.body": "לא הספקת לחזור בזמן, אז הצ׳אט נסגר בשבילך. קורה!",
  "ended.selfLeft.title": "יצאת מהצ׳אט",
  "ended.selfLeft.body": "השאר ממשיכים לדבר. כל הכבוד! 👏",
  "ended.removed.title": "הוצאת מהפעילות",
  "ended.removed.body": "זה סוגר גם את הצ׳אט הזה. אפשר להצטרף שוב עם השם שלך.",
  "ended.fallback.title": "משחק תפקידים מעולה!",
  "ended.fallback.body": "הצ׳אט הזה נגמר. כל הכבוד. 👏",

  "ended.secretLeft": "השמות נשארים בסוד. הצ׳אט ממשיך בלעדיך.",
  "ended.secretDefault": "השמות נשארים בסוד. הם לא נחשפו הפעם.",
  "ended.secretLive": "השמות נשארים בסוד. זה כל המשחק.",
  "ended.revealTitle": "באמת דיברת עם",
  "ended.joinAgain": "להצטרף שוב",
  "ended.done": "סיימתי",
  "ended.again": "מוכן לסיבוב נוסף? 🚀",
  "ended.backToLobby": "חזרה לחדר ההמתנה",

  "demo.lobbyCaption": "בפעילות אמיתית זה החלק של המורה.",
  "demo.chatCaption": "בצ׳אט אמיתי הדברים האלה קורים מעצמם.",
  "demo.pairDuo": "לשבץ אותי לשיחה זוגית",
  "demo.pairGroup": "לשבץ אותי לקבוצה של שלושה",
  "demo.pause": "המורה עוצר את השיעור",
  "demo.resume": "המורה ממשיך את השיעור",
  "demo.wifiBlip": "הוויי-פיי שלך מקרטע",
  "demo.removeMe": "המורה מוציא אותך",
  "demo.reveal": "המורה חושף שמות בסוף הצ׳אט",
  "demo.makeSomethingHappen": "שיקרה משהו",
  "demo.peerDrops": "השותף מתנתק",
  "demo.peerReturns": "השותף חוזר",
  "demo.skipWait": "לדלג על ההמתנה",
  "demo.makeThemTalk": "שידברו",
  "demo.peerEndsChat": "השותף מסיים את הצ׳אט",
  "demo.peerLeavesChat": "השותף יוצא מהצ׳אט",
  "demo.youDropOff": "אתה מתנתק (עוברות שתי דקות)",
  "demo.teacherEndsChat": "המורה מסיים את הצ׳אט",
  "demo.teacherEndsActivity": "המורה מסיים את הפעילות",
};
