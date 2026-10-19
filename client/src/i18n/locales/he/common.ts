import type { HebrewOf } from "../../types";
import type { CommonCatalog } from "../en/common";

/*
  Hebrew — the house style for every catalog in this folder.

  - Second person is MASCULINE, always. Never slash forms ("אתה/את",
    "הצטרף/י"): this is a game-like product for teenagers and the slashes read
    like a permission slip. Founder call — see DECISIONS.md → "Hebrew is
    written in masculine second person".
  - Conversational, not institutional. Teacher surfaces talk to a colleague;
    student surfaces read at upper-middle/high-school level.
  - The brand is חברולה. The domain (chaverola.com) stays Latin.
  - Teacher-typed content — character names, the host's name, instructions,
    student names, every message — is NEVER translated, in any locale.
*/
export const common: HebrewOf<CommonCatalog> = {
  "brand.name": "חברולה",
  "brand.home": "חברולה, לדף הבית",

  "share.cardAlt":
    "הלוגו של חברולה, בועת דיבור לבנה עם פרצוף מחייך, על רקע סגול.",

  // Third person because the fallback also serves student session URLs.
  "shell.description":
    "פעילות כיתתית שבה תלמידים מדברים מתוך דמות על החומר שהם לומדים. כל שיחה גלויה למורה בשידור חי.",

  "nav.joinLong": "להצטרף לפעילות",
  "nav.joinShort": "להצטרף",

  "language.change": "החלפת שפה",

  "student.signedInAs": "מחובר בשם ",

  "dialog.close": "סגירה",
  "dialog.dismiss": "סגירה",

  "debug.input.button": "דוח מקלדת",
  "debug.input.title": "אירועי מקלדת",
  "debug.input.instructions":
    "הקלד מילה קצרה, לחץ פעם אחת על Return ואז העתק את הדוח.",
  "debug.input.copy": "העתק דוח",
  "debug.input.copied": "הועתק",
  "debug.input.copyFallback": "לחץ לחיצה ארוכה על הדוח כדי לבחור ולהעתיק אותו.",

  // "בתפקיד" is the playbill connective, the same one the transcript email
  // uses. "בתור" was rejected: תור also means queue, and the pairing rail
  // already owns that word.
  "card.as": " בתפקיד ",
  "card.live": "חי",
  "card.paused": "מושהה",
  "card.ended": "הסתיים",
  "card.fullChat": "כל השיחה",
  "card.minimize": "לכווץ",
  "card.remove": "להוציא את {{name, bidi}} מהשיחה",

  lostConnection: "החיבור נפל",

  "demo.banner": "זה שיעור הדמו. התלמידים מדומים.",
  "demo.bannerStudent": "זה הדמו. שאר התלמידים מדומים.",
  "demo.startYourOwn": "להקים אחד משלך",
  "demo.driving": "אתה מנהל את הדמו",

  "endChat.title": "לסיים את השיחה?",
  "endChat.confirm": "לסיים",
  "endChat.hostBody":
    "התלמידים יראו שהשיחה נגמרה ויוכלו לחזור ללובי. אין דרך לפתוח אותה מחדש.",
  "endChat.hostCancel": "שימשיכו לדבר",

  "notFound.pageTitle": "הדף לא נמצא",
  "notFound.eyebrow": "404",
  "notFound.title": "אין כאן כלום 🫥",
  "notFound.body": "הדף הזה הלך לאיבוד. יש לך קוד מהמורה?",
  "notFound.backHome": "חזרה לדף הבית",

  "error.title": "זה לא נטען 🫠",
  "error.body": "משהו נתקע בדרך. עוד ניסיון בדרך כלל פותר את זה.",
  "error.retry": "לנסות שוב",
};
