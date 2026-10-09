import type { Catalog } from "../../types";

/** Marketing copy registered with the homepage's lazy chunk. */
export const home = {
  // Search copy describes the classroom activity rather than leading on price.
  "meta.title": "Classroom Roleplay Chat Activities",
  "meta.description":
    "Get your class excited to learn through roleplay. Chaverola gets students talking, collaborating, and thinking about what they're learning.",

  "hero.intro":
    "A classroom activity that gets students talking, collaborating, and thinking about what they're learning.",
  "hero.title": "Get your class excited to learn",
  "hero.pitch":
    "You pick a topic and assign characters. Students explore your lesson through conversation, without knowing who's playing whom.",
  "hero.chatCaption": "Student chat preview",
  "hero.chatPeerSuffix": " · played by a classmate",
  "hero.stepsLabel": "Setup takes about a minute:",
  "hero.step1": "Create an activity and pick your characters.",
  "hero.step2":
    "Put the join code on the board. Students join from their phones or laptops.",
  "hero.step3":
    "Watch every chat live, with students' real names beside their characters.",
  "hero.step4": "Reveal who was who, then get the class transcripts by email.",

  "cta.host": "Host an Activity",

  "teacherView.eyebrow": "The teacher's view",
  "teacherView.caption": "Teacher chat preview",

  "demo.heading": "Try the demo",
  "demo.body": "Explore as a teacher or student, with simulated classmates.",
  "demo.teacherTitle": "Teacher view",
  "demo.teacherBody": "Pair students and watch their chats.",
  "demo.teacherCta": "Try as a teacher",
  "demo.studentTitle": "Student view",
  "demo.studentBody": "Get a secret character and chat with a classmate.",
  "demo.studentCta": "Try as a student",

  "plans.eyebrow": "Plans",
  "plans.free.name": "Free",
  "plans.free.tagline": "Everything you need to run a classroom activity.",
  "plans.free.bullet1": "Create activities and assign characters",
  "plans.free.bullet2":
    "Students join from phones or laptops, with no accounts or downloads",
  "plans.free.bullet3": "See how students participate in every chat",
  "plans.free.bullet4": "Reveal who played each character",
  "plans.free.bullet5": "Review student chats with transcripts emailed to you",
  "plans.complete.name": "Complete Implementation",
  "plans.complete.tagline":
    "More tools for your classroom, with help from our team.",
  "plans.complete.bullet1": "Training to fit activities into your curriculum",
  // <1> wraps the logo and the product name so they can't break across lines.
  "plans.complete.bullet2":
    "Connect with <1>Google Classroom</1> and your school's tools",
  "plans.complete.bullet3":
    "Save your characters and activity settings to reuse again later",
  "plans.complete.bullet4":
    "Keep discussions focused with questions and instructions sent during the activity",
  "plans.complete.cta": "Write to Moshe",
  "plans.dialog.title": "More tools and support for your classroom",
  "plans.dialog.body":
    "Get help fitting activities into your curriculum, save time with reusable settings, and guide student chats with prepared questions. Tell Moshe what your classroom or school needs, and he'll help you explore the options.",
  "plans.dialog.emailCta": "Email Moshe",
  "plans.dialog.copyLabel": "Or copy the address:",
  "plans.mailto.subject": "Chaverola Complete Implementation",
  "plans.mailto.body": "Hi Moshe,\n\n",

  "founder.heading": "A note from the founder",
  "founder.p1":
    "I'm Moshe, and I volunteer in the English department at a high school in Beit Shemesh, Israel.",
  "founder.p2":
    "I've always loved multiplayer games like Warcraft and Brawl Stars. They get people involved, and I wondered how to bring that same excitement into my classroom.",
  "founder.p3":
    "That's why I built Chaverola for my students. So they could take on characters and talk with classmates about what they're learning. My students loved it and kept asking to play again. They got more involved and learned more.",
  "founder.p4":
    "The name combines two Hebrew words: Chaver, meaning friend, and Olah, meaning rising up. Friends helping each other grow. That's what Chaverola brings to the classroom.",
  "founder.p5":
    "If you have questions, ideas, or just want to say hi, I'd love to hear from you.",
  "founder.signoff": "Sincerely,",
  "founder.name": "Moshe Siegel",
  "founder.initials": "MS",
  "founder.photoPlaceholder": "Placeholder for Moshe Siegel's photo",
  "founder.photoAlt": "Moshe Siegel, founder of Chaverola",
  "founder.photoSoon": "photo coming soon",
  "founder.mailto.subject": "Thoughts on Chaverola",
  "founder.mailto.body": "Hi Moshe,\n\n",
} as const satisfies Catalog;

export type HomeCatalog = typeof home;
