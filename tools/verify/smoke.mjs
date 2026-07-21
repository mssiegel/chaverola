// The everyday driver and the deployed-build smoke: one full activity end
// to end. Local against `pnpm verify:up` (seconds at scale 10), or
// `node tools/verify/smoke.mjs --prod` against the deployed build.
//
// Flow: create activity → open teacher → join two students → both rows in
// the queue → Pair everyone 1:1 → both seated → one message each way →
// teacher transcript shows both → End all chats → both students on ended
// screens.
import {
  API,
  check,
  createActivity,
  endedHeading,
  exitWith,
  inRoom,
  joinStudent,
  launch,
  liveCard,
  note,
  openTeacher,
  rail,
  seated,
  waitForQueueRows,
} from "./lib.mjs";

const browser = await launch();
const { joinCode, hostKey } = await createActivity({ hostName: "Ms. Smoke" });
note(`activity ${joinCode} on ${API}`);

const teacher = await openTeacher(browser, hostKey);
const ana = await joinStudent(browser, joinCode, "Ana Smoke");
const boaz = await joinStudent(browser, joinCode, "Boaz Smoke");

await waitForQueueRows(teacher.page, 2);
check(true, "both students landed in the teacher queue");

await rail(teacher.page)
  .getByRole("button", { name: "Pair everyone 1:1" })
  .click();
check(await inRoom(ana.page, 25000), "Ana seated after Pair everyone");
check(await inRoom(boaz.page, 25000), "Boaz seated after Pair everyone");

// One message each way; the peer seeing it proves the whole socket loop.
await seated(ana.page).fill("hello from Ana");
await seated(ana.page).press("Enter");
await boaz.page.getByText("hello from Ana").waitFor({ timeout: 10000 });
check(true, "Boaz sees Ana's message");

await seated(boaz.page).fill("hi back from Boaz");
await seated(boaz.page).press("Enter");
await ana.page.getByText("hi back from Boaz").waitFor({ timeout: 10000 });
check(true, "Ana sees Boaz's reply");

const card = liveCard(teacher.page, "hello from Ana", "hi back from Boaz");
await card.waitFor({ timeout: 10000 });
check(true, "teacher transcript shows both messages");

await teacher.page.getByRole("button", { name: "End all chats" }).click();
const dlg = teacher.page
  .getByRole("dialog")
  .filter({ hasText: "End all chats?" });
await dlg.getByRole("button", { name: "End all chats" }).click();

await endedHeading(ana.page).waitFor({ timeout: 15000 });
await endedHeading(boaz.page).waitFor({ timeout: 15000 });
check(true, "both students see the ended screen after End all");

await browser.close();
exitWith("smoke");
