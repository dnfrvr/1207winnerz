// Doublons de comptes suivis (Twitter, Facebook, Instagram, Tumblr) : le même compte présent plusieurs
// fois sur un téléphone (ancien compte « décor » + compte créé par la régie, deux envois avec une
// orthographe différente…) ou avec un profil différent d'un téléphone à l'autre.
// Fusion d'un groupe :
//  - un seul profil partagé `shared/follows/{net}/{S}` (champs : premier non vide trouvé, abonnés = max) ;
//  - sur chaque téléphone concerné, une seule entrée `follows/{net}/{S}` qui reprend tous les posts
//    des anciennes entrées (supprimées) et garde `match` vers les anciens posts décor ;
//  - posts au texte identique sur un même téléphone : un seul gardé, les autres à la corbeille
//    (`deleted: true`, récupérables) ;
//  - les notifs qui pointaient vers une ancienne entrée pointent vers la nouvelle.
// Tout part en une écriture (historique compris : annulable chemin par chemin).
import { makeId, type Json, type Patches } from "../data/store";
import { NETS, type Acc, type FPost, type Net } from "../apps/follows";

export const DEDUPE_NETS: Net[] = ["twitter", "facebook", "instagram", "tumblr"];
type Map_<T> = Record<string, T> | undefined;
export type PhoneSrc = { follows: Map_<Acc>; decor: Map_<FPost>; notifs: Map_<{ link?: string }> };
export type Src = { shared: Map_<Acc>; phones: Record<string, PhoneSrc> };

type Node =
  | { kind: "acc"; pid: string; id: string; acc: Acc; prof: Acc; decorPosts: [string, FPost][] }
  | { kind: "decor"; pid: string; key: string; seed: Acc; posts: [string, FPost][] }
  | { kind: "shared"; id: string; prof: Acc };

export type Group = {
  net: Net; label: string;
  nodes: Node[];
  /** Résumé lisible par téléphone : nombre de comptes affichés. */
  perPhone: Record<string, number>;
  dupPosts: number;
};

const norm = (s?: string) => (s ?? "").trim().toLowerCase().normalize("NFKC").replace(/^@/, "").replace(/[\s_.-]+/g, "");
/** Comparaison de l'app (useFollows) pour `match` ↔ posts décor : casse et espaces autour seulement. */
const appNorm = (s?: string) => (s ?? "").trim().toLowerCase();
const PROFILE_FIELDS = ["name", "handle", "avatar", "bannerImg", "bio", "color"] as const;
const postText = (p: FPost) => norm(p.text || p.body || p.caption || p.title || "") + "|" + (p.img || p.src || "");
const alive = <T,>(m: Map_<T>) => Object.entries(m ?? {}).filter(([, v]) => v && typeof v === "object" && !(v as { deleted?: boolean }).deleted) as [string, T][];

/** Repère les groupes de comptes à fusionner pour un réseau. */
export function findGroups(net: Net, src: Src): Group[] {
  const cfg = NETS[net];
  const nodes: Node[] = [];
  const shared = src.shared ?? {};
  const refd = new Set<string>();
  for (const [pid, ph] of Object.entries(src.phones)) {
    const accs = alive(ph.follows);
    const matched = new Set(Object.values(ph.follows ?? {}).filter((a) => a?.match).map((a) => appNorm(a.match)));
    const decorAlive = alive(ph.decor);
    for (const [id, acc] of accs) {
      const prof: Acc = acc.shared ? { ...shared[acc.shared] } : acc;
      if (acc.shared) refd.add(acc.shared);
      // Anciens posts décor déjà repris par ce compte (`match`).
      const decorPosts = cfg.decor && acc.match ? decorAlive.filter(([, p]) => appNorm(cfg.decor!.key(p)) === appNorm(acc.match)) : [];
      nodes.push({ kind: "acc", pid, id, acc, prof, decorPosts });
    }
    // Comptes décor implicites (posts décor dont le compte n'a pas été repris par un `match`).
    if (cfg.decor) {
      const byKey = new Map<string, Node & { kind: "decor" }>();
      for (const [id, p] of decorAlive) {
        const k = cfg.decor.key(p);
        if (!k || matched.has(appNorm(k))) continue;
        let n = byKey.get(appNorm(k));
        if (!n) { n = { kind: "decor", pid, key: k, seed: cfg.decor.seed(p), posts: [] }; byKey.set(appNorm(k), n); nodes.push(n); }
        n.posts.push([id, p]);
      }
    }
  }
  for (const [id, prof] of Object.entries(shared)) if (prof && !refd.has(id)) nodes.push({ kind: "shared", id, prof });

  // Regroupement : même nom ou même pseudo (sans @, casse, espaces, _ . -).
  const parent = nodes.map((_, i) => i);
  const find = (i: number): number => (parent[i] === i ? i : (parent[i] = find(parent[i])));
  const seen = new Map<string, number>();
  nodes.forEach((n, i) => {
    const p = n.kind === "decor" ? n.seed : n.prof;
    const keys = [p.name, p.handle, n.kind === "decor" ? n.key : n.kind === "acc" ? n.acc.match : undefined].map(norm).filter(Boolean);
    for (const k of keys) { const j = seen.get(k); if (j === undefined) seen.set(k, i); else parent[find(i)] = find(j); }
  });
  const groups = new Map<number, Node[]>();
  nodes.forEach((n, i) => { const r = find(i); groups.set(r, [...(groups.get(r) ?? []), n]); });

  const out: Group[] = [];
  for (const g of groups.values()) {
    const perPhone: Record<string, number> = {};
    for (const n of g) if (n.kind !== "shared") perPhone[n.pid] = (perPhone[n.pid] ?? 0) + 1;
    const sharedIds = new Set(g.flatMap((n) => (n.kind === "acc" && n.acc.shared ? [n.acc.shared] : n.kind === "shared" ? [n.id] : [])));
    const accs = g.filter((n) => n.kind === "acc");
    const allSameShared = sharedIds.size === 1 && accs.every((n) => n.kind === "acc" && n.acc.shared);
    const dupPosts = countDupPosts(g);
    // Profils différents d'un téléphone à l'autre : seulement entre vrais comptes (un compte décor est
    // identique partout par construction).
    const accPhones = new Set(accs.map((n) => (n.kind === "acc" ? n.pid : "")));
    const several = Object.values(perPhone).some((c) => c > 1) || (!allSameShared && accPhones.size > 1) || sharedIds.size > 1;
    if (!several && !dupPosts) continue;
    const named = g.map((n) => (n.kind === "decor" ? n.seed : n.prof)).find((p) => p.name || p.handle);
    out.push({ net, label: named?.name || named?.handle || "?", nodes: g, perPhone, dupPosts });
  }
  return out.sort((a, b) => a.label.localeCompare(b.label));
}

function countDupPosts(g: Node[]) {
  let n = 0;
  for (const pid of new Set(g.flatMap((x) => (x.kind === "shared" ? [] : [x.pid])))) {
    const seen = new Set<string>();
    for (const x of g) {
      if (x.kind === "shared" || x.pid !== pid) continue;
      const posts = x.kind === "decor" ? x.posts : [...x.decorPosts, ...alive(x.acc.posts)];
      for (const [, p] of posts) { const k = postText(p); if (k === "|") continue; if (seen.has(k)) n++; else seen.add(k); }
    }
  }
  return n;
}

/** Écriture qui fusionne un groupe. */
export function mergePatches(group: Group, src: Src, decorPath: (pid: string) => string | null): Patches {
  const { net, nodes } = group;
  const base = (pid: string) => `phones/${pid}/data/follows/${net}`;
  const sharedBase = `shared/follows/${net}`;
  const patches: Patches = {};
  const keys = new Set(nodes.flatMap((n) => {
    const p = n.kind === "decor" ? n.seed : n.prof;
    return [p.name, p.handle, n.kind === "decor" ? n.key : n.kind === "acc" ? n.acc.match : ""].map(norm).filter(Boolean);
  }));

  // Profil partagé gardé : le plus référencé, sinon un nouveau.
  const counts = new Map<string, number>();
  for (const n of nodes) {
    const id = n.kind === "acc" ? n.acc.shared : n.kind === "shared" ? n.id : undefined;
    if (id) counts.set(id, (counts.get(id) ?? 0) + (n.kind === "acc" ? 1 : 0));
  }
  const S = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? makeId("f");

  // Profil fusionné : profils partagés d'abord, puis comptes du téléphone, puis décor.
  const sources: Acc[] = [
    ...(src.shared?.[S] ? [src.shared[S]] : []),
    ...nodes.filter((n) => n.kind === "shared").map((n) => n.prof),
    ...nodes.filter((n) => n.kind === "acc").map((n) => n.prof),
    ...nodes.filter((n) => n.kind === "decor").map((n) => n.seed),
  ];
  const prof: Record<string, Json> = {};
  for (const f of PROFILE_FIELDS) { const v = sources.map((s) => s[f]).find((x) => typeof x === "string" && x.trim()); prof[f] = v ?? ""; }
  prof.followers = Math.max(0, ...sources.map((s) => Number(s.followers ?? 0)));
  prof.following = Math.max(0, ...sources.map((s) => Number(s.following ?? 0)));
  if (!prof.name) prof.name = group.label;
  patches[`${sharedBase}/${S}`] = prof;
  // Anciens profils partagés du groupe : plus personne ne les utilise.
  for (const n of nodes) {
    const id = n.kind === "acc" ? n.acc.shared : n.kind === "shared" ? n.id : undefined;
    if (id && id !== S) patches[`${sharedBase}/${id}`] = null;
  }

  for (const pid of new Set(nodes.flatMap((n) => (n.kind === "shared" ? [] : [n.pid])))) {
    const mine = nodes.filter((n) => n.kind !== "shared" && n.pid === pid);
    const accs = mine.filter((n): n is Node & { kind: "acc" } => n.kind === "acc");
    const decors = mine.filter((n): n is Node & { kind: "decor" } => n.kind === "decor");
    // Posts réunis (ordre chronologique : on garde le premier d'un texte, les suivants vont à la corbeille).
    const posts: Record<string, FPost> = {};
    for (const a of accs) Object.assign(posts, a.acc.posts ?? {});
    // Décor d'abord (posts d'origine, gardés en priorité), puis posts des comptes.
    const items: { text: string; own?: string; decor?: string }[] = [
      ...[...decors.flatMap((d) => d.posts), ...accs.flatMap((a) => a.decorPosts)].map(([id, p]) => ({ text: postText(p), decor: id })),
      ...Object.entries(posts).filter(([, p]) => p && !p.deleted).map(([id, p]) => ({ text: postText(p), own: id })),
    ];
    const seen = new Set<string>();
    const dp = decorPath(pid);
    for (const it of items) {
      if (it.text === "|" ) continue;
      if (!seen.has(it.text)) { seen.add(it.text); continue; }
      if (it.own) posts[it.own] = { ...posts[it.own], deleted: true };
      else if (it.decor && dp) patches[`${dp}/${it.decor}/deleted`] = true;
    }
    // `match` : la clé des posts décor de ce compte (un seul nom possible ; décor implicite en priorité).
    const match = decors[0]?.key ?? accs.find((a) => a.decorPosts.length)?.acc.match ?? accs.map((a) => a.acc.match).find(Boolean) ?? "";
    const order = Math.min(...accs.map((a) => Number(a.acc.order ?? 0)), accs.length ? Infinity : 0);
    // Entrées remplacées (y compris un ancien abonnement « désabonné » du même compte, qui masquerait les posts décor).
    const old = Object.entries(src.phones[pid]?.follows ?? {}).filter(([id, a]) => id !== S && a && (accs.some((x) => x.id === id) ||
      (a.deleted && [a.match, a.name, a.handle, a.shared ? src.shared?.[a.shared]?.name : ""].some((k) => !!k && keys.has(norm(k))))));
    for (const [id] of old) patches[`${base(pid)}/${id}`] = null;
    patches[`${base(pid)}/${S}`] = { shared: S, match, order: Number.isFinite(order) ? order : 0, posts: posts as Json } as Json;
    // Notifs vers une ancienne entrée.
    for (const [nid, n] of Object.entries(src.phones[pid]?.notifs ?? {})) {
      const link = n?.link ?? "";
      for (const [id] of old) if (link === `${net}/f/${id}` || link.startsWith(`${net}/f/${id}?`)) patches[`phones/${pid}/notifs/${nid}/link`] = `${net}/f/${S}`;
    }
  }
  return patches;
}
