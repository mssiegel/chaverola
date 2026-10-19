import type { HebrewOf } from "../../types";
import type { TeacherCatalog } from "../en/teacher";

/**
 * Hebrew — masculine second person throughout; see `he/common.ts` for the
 * house style this folder follows. This namespace talks to a teacher, so the
 * register is a colleague's rather than a manual's.
 *
 * Three places where this is a localization rather than a translation, on
 * purpose. The character placeholders are re-cast for an Israeli classroom
 * (they are example content, not copy). "Hosted by" is `מנחה:` — a label
 * rather than a verb, which sidesteps gender agreement with the teacher's
 * name entirely, the same call the transcript email makes. And no sentence
 * ever glues a prefix letter onto an interpolated name or address (`ש{{name}}`,
 * `ל{{email}}`), because a Latin value turns that into `שRachel`.
 */
export const teacher: HebrewOf<TeacherCatalog> = {
  // ---------------------------------------------------------------------
  // /activity/create — the setup page and its form

  // Impersonal plural, like the setup form's other copy — the English "you"
  // isn't carried over, because matching the neighbouring Hebrew beats
  // matching the source.
  "setup.meta.title": "הקמת פעילות כיתתית בצ׳אט",
  "setup.meta.description":
    "נותנים שם לדמויות שהתלמידים יגלמו וכותבים על מה הם ידברו. ההקמה לוקחת בערך דקה, ואז מקבלים קוד בן 4 ספרות לכיתה.",

  "setup.badge": "למורים",
  "setup.title": "מקימים את הפעילות",
  "setup.body": "ההקמה לוקחת בערך דקה.",

  "setup.characters.title": "דמויות",
  "setup.characters.hint":
    "אלה הדמויות שהתלמידים מגלמים כשאתה משבץ אותם. שתיים מספיקות, אבל אפשר להוסיף כמה שתרצה.",
  "setup.aboutYou.title": "עליך",
  "setup.instructions.title": "הוראות לתלמידים",
  "setup.instructions.hint":
    "תגיד לתלמידים מה לעשות: סצנה לשחק או שאלה להתווכח עליה. הם קוראים את זה בלובי בזמן שהם מחכים.",
  "setup.optional": "רשות",
  "setup.optionalTag": "(רשות)",

  "setup.failure.unreachable":
    "אי אפשר להגיע לחברולה כרגע. תבדוק את החיבור לאינטרנט ותנסה שוב. כל מה שכתבת עדיין כאן.",
  "setup.failure.server":
    "משהו השתבש אצלנו והפעילות לא נוצרה. תן לזה שנייה ותנסה שוב.",
  "setup.hosting": "מקימים את הפעילות שלך…",
  "setup.host": "להקים את הפעילות",

  // The 1948 cast, the same one the Hebrew demo activity uses.
  "characters.placeholder1": "הרוח של הרצל 👻",
  "characters.placeholder2": "בן־גוריון 📜",
  "characters.placeholder3": "גולדה 🕊️",
  "characters.placeholder4": "זאב שרף",
  "characters.placeholderExtra": "עוד דמות",
  "characters.nameLabel": "שם דמות {{number}}",
  "characters.emojiLabel": "להוסיף אימוג׳י לדמות {{number}}",
  "characters.removeLabel": "להסיר את דמות {{number}}",
  "characters.add": "להוסיף דמות",

  // "לפי הסדר" / "באקראי" rather than adjectives — both read as answers to
  // the label's question, and the shipped `pairing.tapHint` already says
  // "הדמויות מתחלקות אקראית", so the vocabulary is the teacher's already.
  "characters.mode.label": "איך הדמויות מתחלקות",
  "characters.mode.inOrder.title": "לפי הסדר",
  "characters.mode.inOrder.body":
    "זוג מקבל את שתי הדמויות הראשונות ברשימה, שלישייה את שלוש הדמויות הראשונות, וכן הלאה.",
  "characters.mode.shuffled.title": "באקראי",
  "characters.mode.shuffled.body":
    "כל שיחה מקבלת דמויות באקראי מתוך רשימת הדמויות שלך. שני תלמידים באותה שיחה אף פעם לא מקבלים את אותה דמות.",

  "aboutYou.name.label": "השם שלך",
  "aboutYou.name.placeholder": "המורה כהן",
  "aboutYou.email.label": "המייל שלך",
  "aboutYou.email.placeholder": "you@school.org",
  "aboutYou.email.hint": "כשהפעילות נגמרת נשלח לך במייל את כל השיחות.",

  "instructions.placeholder": "תל אביב, ה׳ באייר תש״ח, השעות שלפני ההכרזה…",

  "preview.label": "מה שהתלמידים רואים",
  "preview.waiting": "ממתין לשיבוץ",
  "preview.hostedBy": "מנחה",
  "preview.characters": "הדמויות בפעילות",
  "preview.charactersEmpty": "הדמויות שלך יופיעו כאן ברגע שתיתן להן שמות.",
  "preview.instructions": "הוראות",
  "preview.caption": "זה הלובי שהכיתה מחכה בו. הוא מתמלא תוך כדי שאתה כותב.",

  // "עברית" is written out rather than interpolated — the preposition glues
  // onto it ("בעברית"), and a slot would take an endonym that doesn't inflect.
  "language.title": "הגדרות שפה - להשאיר את התלמידים בעברית",
  "language.lock.body":
    "כל תלמיד שמצטרף קורא את האתר בעברית ואי אפשר להחליף שפה. כדאי להשאיר את זה דלוק אם אתה מלמד עברית כשפה שנייה.",

  "settings.title": "הגדרות",
  "settings.hint":
    "אלה ההגדרות שאנחנו ממליצים עליהן. אפשר לשנות כל אחת מהן גם בזמן שהפעילות רצה.",
  "settings.reveal.title": "לחשוף שמות בסוף שיחה",
  "settings.reveal.body":
    "השיחות אנונימיות כל עוד הן רצות. כשאחת נגמרת, התלמידים שבה מגלים עם מי באמת דיברו.",
  "settings.rematch.title": "להזהיר לפני שיבוץ חוזר",
  "settings.rematch.body":
    "אתה מקבל התראה כששיבוץ עומד להחזיר את אותם תלמידים זה לזה.",
  "settings.autoMatch.title": "לשבץ תלמידים בזוגות אוטומטית",
  "settings.autoMatch.bodyPaused":
    "השיבוץ האוטומטי בהמתנה כל עוד השיחות מושהות. כשתחדש אותן, שני תלמידים שחיכו מספיק זמן ישובצו לבד.",
  "settings.autoMatch.body":
    "ברגע ששני תלמידים חיכו מספיק זמן, הם משובצים לבד. אף אחד לא חוזר ישר לבן השיח הקודם שלו.",
  "settings.autoMatch.wait": "התלמידים מחכים",
  "settings.autoMatch.seconds": "{{seconds}} שניות",
  "settings.autoMatch.less": "חמש שניות פחות",
  "settings.autoMatch.more": "חמש שניות יותר",

  "problem.needTwoCharacters":
    "תן שם לשתי דמויות לפחות, כדי שיהיו לתלמידים תפקידים.",
  "problem.duplicateCharacter":
    "לשתי דמויות אי אפשר לתת את אותו שם. תשנה אחת מהן.",
  "problem.hostName": "תוסיף את השם שלך כדי שהתלמידים ידעו מי מנחה.",
  "problem.email":
    "המייל הזה לא נראה תקין. תתקן אותו, או תנקה את השדה אם אתה לא רוצה לקבל את השיחות.",
  "problem.characterInUse":
    "הדמות הזאת צריכה שם. אפשר להסיר דמויות אחרי שתי הראשונות בעזרת כפתור ה־×.",

  // ---------------------------------------------------------------------
  // /activity/host/:hostKey — the live dashboard

  "host.meta.title": "הפעילות שלך",
  // A localization, not a translation: the English pair names a Roman
  // history class, but /he runs a different production entirely (תל אביב,
  // ה׳ באייר תש״ח — see DECISIONS.md → "The Hebrew demo is re-cast, never
  // translated"), so this quotes that demo's own studentInstructions.
  // "אין שום הרשמה" over a calque of "nothing to sign up for"; the shipped
  // `home.plans` line already says it that way.
  "host.demo.meta.title": "דמו למורה: לצפות בכיתה חיה",
  "host.demo.meta.description":
    "כאן כיתת היסטוריה כבר באמצע פעילות על השעות שלפני ההכרזה, ואין שום הרשמה. לכל צ׳אט יש כרטיס חי עם שם אמיתי ליד כל דמות.",

  "host.badge": "למורים",
  "host.loading": "מחפשים את הפעילות שלך…",
  "host.unreachable.title": "אי אפשר להגיע לחברולה",
  "host.unreachable.body":
    "יכול להיות שהפעילות שלך עדיין רצה. תבדוק את החיבור לאינטרנט ותנסה שוב.",
  "host.notFound.title": "הפעילות הזאת לא רצה",
  "host.notFound.body":
    "פעילויות נשארות באוויר רק בזמן השיעור, והקישור הזה לא מתאים לאף פעילות שרצה עכשיו. אם הקלדת או הדבקת אותו, כדאי לבדוק שוב. הקמת פעילות חדשה לוקחת בערך דקה.",
  "host.newActivity": "להקים פעילות חדשה",

  "host.title": "הפעילות שלך באוויר",
  "host.hostedBy": "מנחה: {{name, bidi}}",
  "host.waitingToChat": "ממתינים לשיחה",
  "host.pairThemUp": "תשבץ אותם למטה, או תיתן לשיבוץ האוטומטי לעשות את זה.",
  "host.sharePin": "תשתף את הקוד שלמטה והם יופיעו כאן.",
  "host.queueRefills": "התור מתמלא מחדש ככל שהשיחות נגמרות.",
  "host.reconnecting_one": "עוד תלמיד אחד מנסה להתחבר, אז הוא לא יכול להשתבץ.",
  "host.reconnecting_two":
    "עוד שני תלמידים מנסים להתחבר, אז הם לא יכולים להשתבץ.",
  "host.reconnecting_other":
    "עוד {{count}} תלמידים מנסים להתחבר, אז הם לא יכולים להשתבץ.",
  "host.pin": "קוד",

  "host.offline.title": "מתחברים מחדש לכיתה שלך…",
  "host.offline.body":
    "כל מה שלמטה הוא מהרגע שלפני שהחיבור נפל. זה יתעדכן ברגע שתחזור.",

  "host.hint.waiting_one": "תלמיד אחד ממתין",
  "host.hint.waiting_two": "שני תלמידים ממתינים",
  "host.hint.waiting_other": "{{count}} תלמידים ממתינים",
  "host.hint.stalled": "אף אחד לא יכול להשתבץ עדיין. מחכים שתלמידים יתחברו",
  "host.hint.noStudents": "עוד אין תלמידים. תשתף את הקוד כדי שייכנסו",
  "host.hint.allChatting": "כולם בשיחה. התור מתמלא ככל שהשיחות נגמרות",

  "host.rematchWarning.pair":
    "{{names}} דיברו ביניהם ממש עכשיו. עדיין אפשר לשבץ אותם, זו רק התראה.",
  "host.rematchWarning.group":
    "{{names}} דיברו יחד ממש עכשיו. עדיין אפשר לשבץ אותם, זו רק התראה.",

  "host.demo.caption": "בכיתה אמיתית כל זה קורה מעצמו.",
  "host.demo.join": "תלמיד מצטרף",
  "host.demo.wifi": "לתלמיד נופל האינטרנט",

  "host.wrapUp.title": "לסגור את הפעילות",
  "host.wrapUp.demo": "מסיים כל שיחה. הדמו לא שולח מייל לאף אחד.",
  "host.wrapUp.email": "מסיים כל שיחה ושולח את התמליל למייל {{email, bidi}}.",
  "host.wrapUp.noEmail": "מסיים כל שיחה. לא הוגדר מייל, אז לא יישלח כלום.",
  "host.wrapUp.cta": "לסיים את הפעילות",

  "joining.title": "הוראות הצטרפות לתלמידים",
  "joining.hint.pin": "קוד {{code}}",
  "joining.hint.site": "התלמידים נכנסים דרך",
  "joining.pinLabel": "קוד הפעילות",
  "joining.tellClass": "תגיד לכיתה:",
  "joining.step1": "להיכנס אל",
  "joining.step2": "ללחוץ על",
  "joining.step3": "להקליד את הקוד",
  "joining.body":
    "תגיד את הקוד בקול או תכתוב אותו על הלוח. תשמור את המסך שלך לעצמך, כי כל תלמיד שרואה אותו יידע עם מי הוא עומד לדבר.",
  "joining.copy": "להעתיק את קישור ההצטרפות",
  "joining.copied": "הועתק!",

  "pairing.title": "שיבוץ התלמידים",
  "pairing.hold.none":
    "השיבוץ האוטומטי כבוי. התלמידים חוזרים לכאן ככל שהשיחות שלהם נגמרות.",
  "pairing.hold.waiting_one": "תלמיד אחד ממתין, והשיבוץ האוטומטי כבוי.",
  "pairing.hold.waiting_two": "שני תלמידים ממתינים, והשיבוץ האוטומטי כבוי.",
  "pairing.hold.waiting_other":
    "{{count}} תלמידים ממתינים, והשיבוץ האוטומטי כבוי.",
  "pairing.hold.turnOn": "להחזיר את השיבוץ האוטומטי",
  "pairing.empty.noStudents.title": "עוד אין תלמידים",
  "pairing.empty.noStudents.body": "תקריא את הקוד והם יופיעו כאן כשייכנסו.",
  "pairing.empty.chatting.title": "כולם בשיחה",
  "pairing.empty.chatting.body": "התלמידים חוזרים לכאן כשהשיחות שלהם נגמרות.",
  "pairing.pairEveryone": "לשבץ את כולם בזוגות",
  "pairing.start": "להתחיל את השיחה",
  "pairing.startWithCount": "להתחיל את השיחה ({{selected}})",
  "pairing.parked": "{{names}} מתחברים מחדש, אז מחכים להם.",
  "pairing.tapHint":
    "תלחץ על שני תלמידים כדי לשבץ אותם. הדמויות מתחלקות אקראית.",
  "pairing.tapHintGroup":
    "תלחץ על שני תלמידים כדי לשבץ אותם, או עד {{max}} לקבוצה. הדמויות מתחלקות אקראית.",
  // הודעת הפס. השרת שולח את סוג ההודעה ואת השמות או המספרים; הניסוח כאן.
  // שני המספרים תמיד 2 ומעלה, ולכן אין להם צורות ריבוי נפרדות.
  "pairing.notice.stuckInLine.pair":
    "{{names}} דיברו ביניהם ממש עכשיו, אז הם עדיין בתור.",
  "pairing.notice.stuckInLine.group":
    "{{names}} דיברו יחד ממש עכשיו, אז הם עדיין בתור.",
  "pairing.notice.tooFewCharacters":
    "בחרת {{studentCount}} תלמידים, אבל יש לך רק {{characterCount}} דמויות, אז השיחה לא התחילה. תרענן את הדף כדי לראות את הדמויות המעודכנות.",
  "pairing.firstInLine": "ראשון בתור",
  "pairing.remove": "להוציא את {{name, bidi}} מהפעילות",
  "pairing.wait.seconds": "{{value}} שנ׳",
  "pairing.wait.minutes": "{{value}} דק׳",
  "pairing.autoMatch.off":
    "השיבוץ האוטומטי כבוי: התלמידים מחכים כאן עד שתשבץ אותם.",
  "pairing.autoMatch.paused": "השיבוץ האוטומטי בהמתנה כל עוד השיחות מושהות.",
  "pairing.autoMatch.on":
    "השיבוץ האוטומטי דולק: התלמידים משתבצים לבד אחרי {{seconds}} שניות המתנה.",

  "chats.title": "שיחות שרצות עכשיו",
  "chats.hint.none": "אין שיחות כרגע",
  "chats.hint.paused_one": "מושהה: תלמיד אחד באמצע שיחה",
  "chats.hint.paused_two": "מושהה: שני תלמידים באמצע שיחה",
  "chats.hint.paused_other": "מושהה: {{count}} תלמידים באמצע שיחה",
  "chats.hint.active_one": "תלמיד אחד מדבר עכשיו",
  "chats.hint.active_two": "שני תלמידים מדברים עכשיו",
  "chats.hint.active_other": "{{count}} תלמידים מדברים עכשיו",
  "chats.empty.paused.title": "עדיין מושהה",
  "chats.empty.paused.body":
    "השיחות נגמרו, אבל הכיתה עדיין מושהית. אף אחד לא ישובץ שוב עד שתחדש.",
  "chats.empty.none.title": "עוד אין שיחות",
  "chats.empty.none.body":
    "תשבץ שני תלמידים מהתור, או תתחיל את כל הסבב בלחיצה אחת.",
  "chats.chatting_one": "<1>תלמיד אחד</1> מדבר",
  "chats.chatting_two": "<1>שני תלמידים</1> מדברים",
  "chats.chatting_other": "<1>{{count}}</1> תלמידים מדברים",
  "chats.resume": "לחדש",
  "chats.pauseAll": "להשהות את כל השיחות",
  "chats.endAll": "לסיים את כל השיחות",
  "chats.pausedNotice":
    "השיחות מושהות. התלמידים יכולים לקרוא את השיחה שלהם, אבל לא לשלוח הודעות חדשות עד שתחדש.",
  "chats.emptyHint": "עוד אין הודעות. הן יופיעו כאן ככל שהתלמידים כותבים.",

  "completed.title": "שיחות שהסתיימו",
  "completed.hint.none": "שיחות שנגמרו נוחתות כאן",
  "completed.hint.count_one": "שיחה אחת הסתיימה",
  "completed.hint.count_two": "שתי שיחות הסתיימו",
  "completed.hint.count_other": "{{count}} שיחות הסתיימו",
  "completed.empty": "עוד אין כאן כלום. כששיחה נגמרת, הכרטיס שלה יורד לכאן.",
  "completed.emptyHint": "השיחה הזאת נגמרה לפני שמישהו הספיק לכתוב.",

  "liveSettings.title": "עריכת הגדרות הפעילות",
  "liveSettings.hint.set": "עדכן את הפעילות בזמן שהיא רצה",
  "liveSettings.hint.noEmail":
    "תוסיף את המייל שלך ונשלח לך את כל השיחות כשהפעילות נגמרת",
  "liveSettings.body":
    "השם שלך, ההוראות, הדמויות, ההגדרות והמייל נשמרים ברגע שאתה עוצר להקליד, והתלמידים שמחכים בלובי רואים את השינוי מיד. שיחה שכבר רצה שומרת על הדמויות שאיתן התחילה, כך שאף אחד לא מוחלף באמצע. שיחות חדשות מקבלות את הצוות העדכני.",

  "confirm.cancel": "לא משנה",
  "confirm.removeStudent.title": "להוציא את {{name, bidi}}?",
  "confirm.removeStudent.body":
    "הוא ינותק ויוחזר למסך ההצטרפות, עם הודעה שאתה הוצאת אותו. הוא יכול להיכנס שוב, עם שם יותר מוצלח אם זו הייתה הבעיה.",
  "confirm.remove": "להוציא אותו",
  "confirm.removeFromChat.title": "להוציא את {{name, bidi}} מהשיחה שלו?",
  "confirm.removeFromChat.group":
    "הוא ינותק ויוחזר למסך ההצטרפות. שאר הקבוצה ממשיכה לדבר, והחברים לכיתה רואים רק שהדמות עזבה, לא שהוצאת מישהו.",
  "confirm.removeFromChat.pair":
    "הוא ינותק ויוחזר למסך ההצטרפות, והשיחה של בן השיח שלו תיגמר. לאף אחד לא נאמר שזאת הייתה הוצאה.",
  "confirm.pause.title": "להשהות את כל השיחות?",
  "confirm.pause.body":
    "השיחה נשארת על המסך, אבל התלמידים לא יכולים לשלוח הודעות עד שתחדש.",
  "confirm.pause.confirm": "להשהות",
  "confirm.endActivity.title": "לסיים את הפעילות לכולם?",
  "confirm.endActivity.consequences":
    "כל שיחה נגמרת עכשיו והתלמידים רואים שהפעילות הסתיימה. קוד ההצטרפות מפסיק לעבוד, אז אף אחד לא יכול להיכנס יותר.",
  "confirm.endActivity.demo": "זה הדמו, אז לא נשלח שום מייל.",
  "confirm.endActivity.noEmail":
    "לא הוגדר מייל, אז לא יישלח כלום. השיחות יישארו רק כאן בדף.",
  "confirm.endActivity.noChats":
    "עוד לא הייתה אף שיחה, אז אין מה לשלוח למייל {{email, bidi}}.",
  "confirm.endActivity.send_one": "נשלח את השיחה למייל {{email, bidi}}.",
  "confirm.endActivity.send_two": "נשלח את שתי השיחות למייל {{email, bidi}}.",
  "confirm.endActivity.send_other":
    "נשלח את כל {{count}} השיחות למייל {{email, bidi}}.",
  "confirm.endActivity.confirm": "לסיים את הפעילות",
  "confirm.endActivity.cancel": "להשאיר אותה רצה",
  "confirm.endAll.title": "לסיים את כל השיחות?",
  "confirm.endAll.hold":
    "כל שיחה פעילה תיגמר עכשיו לכל מי שנמצא בה. גם השיבוץ האוטומטי יעבור להמתנה, אז התלמידים יחכו בלובי עד שתשבץ אותם או תדליק אותו בחזרה.",
  "confirm.endAll.body":
    "כל שיחה פעילה תיגמר עכשיו לכל מי שנמצא בה. התלמידים יראו שהשיחה נגמרה ויוכלו לחזור ללובי לסבב נוסף.",
  "confirm.endAll.confirm": "לסיים את כולן",
  "confirm.endAll.cancel": "שימשיכו לדבר",

  "wrapped.demo.title": "זהו, סיימנו",
  "wrapped.demo.body":
    "זה הדמו, אז לא נשלח שום מייל. בפעילות אמיתית כל שיחה נשלחת לתיבה שלך ברגע שאתה מסיים.",
  "wrapped.sending.title": "שולחים לך את התמלילים…",
  "wrapped.sending.body": "שולחים כל שיחה למייל {{to, bidi}}. זה לוקח רגע.",
  "wrapped.unconfirmed.title": "לא קיבלנו אישור על המייל",
  "wrapped.unconfirmed.body":
    "יכול להיות שההודעה בכל זאת יצאה אל {{to, bidi}}, אבל לא קיבלנו תשובה לכאן ולכאן. תבדוק את התיבה בעוד כמה דקות. השיחות שלך למטה, אז תעתיק כל מה שאתה רוצה לשמור לפני שתסגור את הלשונית.",
  "wrapped.sent.title": "נשלח אל {{to, bidi}}",
  "wrapped.sent.body": "כל שיחה מהכיתה הזאת בדרך לתיבה שלך. תן לזה דקה לנחות.",
  "wrapped.failed.title": "לא הצלחנו לשלוח את המייל",
  "wrapped.failed.body":
    "ההודעה אל {{to, bidi}} לא עברה. השיחות שלך עדיין למטה, אז תעתיק כל מה שאתה רוצה לשמור לפני שתסגור את הלשונית.",
  "wrapped.empty.title": "זהו, סיימנו",
  "wrapped.empty.noMessages":
    "בשיחות האלה לא נכתבה אף הודעה, אז לא היה מה לשלוח. הן למטה אם בא לך להסתכל.",
  "wrapped.empty.noEmail":
    "לא הגדרת מייל לפעילות הזאת, אז לא נשלח כלום. השיחות שלך למטה אם בא לך לקרוא אותן שוב.",
};
