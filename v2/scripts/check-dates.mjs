// Vérifie le sélecteur de date : chaque format lu puis réécrit tel quel, et un changement de jour
// garde le format. Lancer : node scripts/check-dates.mjs
import assert from "node:assert/strict";
import { dateAfterLore, formatDateField, loreToMs, newestFirst, parseDateField } from "../src/lib/loreTime.ts";

const same = ["18 sep, 5:10pm", "13 Sep 2012", "1 fév", "14 août", "Aug 6, 8:04pm", "Oct 1 at 12:14PM", "1 Sep, 12:47pm",
  "Sep 30", "08/04/2012 11:00am", "May 12 2010, 6:04pm", "Sep 30 · 5:48pm", "6 oct 2012", "1 oct · 03:41", "17 Oct, 3:00pm"];
for (const s of same) {
  const f = parseDateField(s);
  assert.ok(f, `non lu : ${s}`);
  assert.equal(formatDateField(f, f.value), s, `réécriture de ${s}`);
}
assert.equal(parseDateField("4 hours ago"), null);
assert.equal(parseDateField("8:02 AM"), null);
assert.equal(parseDateField("Hier"), null);
const oct = parseDateField("Oct 2012");
assert.equal(formatDateField(oct, "2012-10-14"), "14 Oct 2012");
const lore = parseDateField("18 sep, 5:10pm");
assert.equal(lore.value, "2012-09-18T17:10");
assert.equal(formatDateField(lore, "2012-12-03T09:05"), "3 dec, 9:05am");
assert.equal(formatDateField(parseDateField("1 fév"), "2012-08-20"), "20 août");
assert.equal(formatDateField(parseDateField("14 janv, 12:11am"), "2012-01-20T12:11"), "20 janv, 12:11pm");
assert.equal(formatDateField(parseDateField(""), "2012-10-06"), "6 oct");
// Tri du plus récent au plus ancien (formats variés, sans date à la fin) et détection d'une date après la lore.
assert.deepEqual(newestFirst(["1 oct", "Hier", "27 oct", "Jul 13, 8:00pm"], (x) => x), ["27 oct", "1 oct", "Jul 13, 8:00pm", "Hier"]);
assert.ok(loreToMs("Sep 30 2012") > 0);
assert.equal(dateAfterLore({ "phones/x/data/calls/i1": { time: "27 oct, 4:00pm" } }, "2012-10-17"), "2012-10-27");
assert.equal(dateAfterLore({ "phones/x/data/calls/i1/time": "17 oct, 11:00pm" }, "2012-10-17"), null);
assert.equal(dateAfterLore({ "phones/x/data/reminders/i1/due": "30 oct" }, "2012-10-17"), null);
console.log("dates : ok");
