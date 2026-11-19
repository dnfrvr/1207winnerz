// Vérifie les fonctions qui décident de ce qui est écrit en base (chemins, patches, ordre, ids).
// Lancer : node scripts/check-store.mjs   (ou npm test)
import assert from "node:assert/strict";
import { getIn, setIn, split, related, makeId } from "../src/data/store.ts";
import { orderBetween, byOrder, ORDER_STEP } from "../src/data/order.ts";

// getIn : lecture par chemin, undefined si un maillon manque ou n'est pas un objet.
const tree = { phones: { glinda: { name: "Glinda", tags: ["a"] } } };
assert.equal(getIn(tree, "phones/glinda/name"), "Glinda");
assert.equal(getIn(tree, "/phones//glinda/name/"), "Glinda");
assert.equal(getIn(tree, "phones/drew/name"), undefined);
assert.equal(getIn(tree, "phones/glinda/name/x"), undefined);
assert.equal(getIn(tree, "phones/glinda/tags/0"), undefined); // les tableaux ne sont pas parcourus
assert.deepEqual(getIn(tree, ""), tree);

// setIn : copie, jamais de mutation de l'original.
const before = JSON.stringify(tree);
const t2 = setIn(tree, split("phones/glinda/name"), "G.");
assert.equal(JSON.stringify(tree), before);
assert.equal(getIn(t2, "phones/glinda/name"), "G.");
assert.equal(t2.phones.glinda.tags, tree.phones.glinda.tags); // branches non touchées partagées
assert.deepEqual(setIn(undefined, split("a/b"), 1), { a: { b: 1 } });
assert.deepEqual(setIn({ a: "texte" }, split("a/b"), 1), { a: { b: 1 } }); // une feuille remplacée par un objet

// null / undefined suppriment, et les parents vidés disparaissent (comme Firebase).
assert.deepEqual(setIn({ a: { b: 1 }, c: 2 }, split("a/b"), null), { c: 2 });
assert.equal(setIn({ a: { b: 1 } }, split("a/b"), undefined), undefined);
assert.deepEqual(setIn({ a: { b: 1, c: 2 } }, split("a/b"), null), { a: { c: 2 } });
assert.equal(setIn({ a: 1 }, [], null), undefined);

// related : un chemin et son ancêtre sont liés, deux frères non.
assert.ok(related("phones/glinda", "phones/glinda/data/notes"));
assert.ok(related("phones/glinda/data", "phones/glinda"));
assert.ok(!related("phones/glinda", "phones/glindaX"));
assert.ok(!related("phones/glinda/a", "phones/glinda/b"));

// makeId : unique, jamais purement numérique, et trié dans l'ordre de création même en rafale.
const ids = Array.from({ length: 2000 }, () => makeId("i"));
assert.equal(new Set(ids).size, ids.length);
assert.ok(ids.every((id) => id.startsWith("i_") && !/^\d+$/.test(id.slice(2))));
assert.deepEqual([...ids].sort(), ids, "ids non triés dans l'ordre de création");

// orderBetween / byOrder : insertion au début, à la fin, entre deux ; tri stable par id à égalité.
assert.equal(orderBetween(), ORDER_STEP);
assert.equal(orderBetween(undefined, 1000), 0);
assert.equal(orderBetween(1000), 2000);
const mid = orderBetween(1000, 2000);
assert.ok(mid > 1000 && mid < 2000);
const list = [["b", { order: 2000 }], ["c", {}], ["a", { order: 2000 }], ["d", { order: mid }]];
assert.deepEqual(list.sort(byOrder).map(([id]) => id), ["c", "d", "a", "b"]);

console.log("stockage : ok");
