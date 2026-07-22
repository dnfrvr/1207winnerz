// ─── UTILITAIRES DE DIFF / PATCH D'OBJETS IMBRIQUÉS ──────────────────────────
// Servent à ne renvoyer à Firebase que ce qui a réellement changé, et à ré-appliquer
// proprement des patches de chemins profonds.

// Compare deux objets champ par champ (niveau racine uniquement) et renvoie un patch ne
// contenant que les clés dont la valeur a réellement changé. Utilisé pour éviter de renvoyer
// à Firebase des champs volumineux (photos, galerie...) qui n'ont pas bougé — sans ça, éditer
// n'importe quel petit champ d'un perso (ex: un badge) réenvoyait TOUT l'objet, y compris
// chaque image encore en base64, ce qui pouvait dépasser la limite d'écriture Firebase
// ("Write too large") et faire échouer silencieusement la sauvegarde.
const shallowDiffPatch = (oldObj = {}, newObj = {}) => {
  const patch = {};
  const keys = new Set([...Object.keys(oldObj || {}), ...Object.keys(newObj || {})]);
  keys.forEach(k => {
    const a = oldObj?.[k], b = newObj?.[k];
    if (a === b) return;
    let changed;
    try { changed = JSON.stringify(a) !== JSON.stringify(b); }
    catch (e) { changed = true; }
    if (changed) patch[k] = (b === undefined ? null : b);
  });
  return patch;
};

// Compare deux objets récursivement et renvoie un patch de chemins Firebase ("a/b/c": val) ne
// contenant que les valeurs qui ont réellement changé, en descendant dans les objets/tableaux
// jusqu'à trouver le champ précis modifié. Beaucoup plus fin que shallowDiffPatch : par exemple, si
// seule une photo de la galerie change, seul "gallery/3/src" est renvoyé — pas tout le tableau
// gallery. C'est ce qui permet à l'outil de migration de ne renvoyer que les URLs d'images
// remplacées, sans jamais réécrire le reste (potentiellement volumineux) de l'objet.
const deepDiffPatch = (oldObj, newObj, path = []) => {
  const patch = {};
  const isPlainObj = v => v !== null && typeof v === "object" && !Array.isArray(v);
  if (Array.isArray(newObj) && Array.isArray(oldObj)) {
    const len = Math.max(oldObj.length, newObj.length);
    for (let i = 0; i < len; i++) {
      Object.assign(patch, deepDiffPatch(oldObj[i], newObj[i], [...path, i]));
    }
    return patch;
  }
  if (isPlainObj(newObj) && isPlainObj(oldObj)) {
    const keys = new Set([...Object.keys(oldObj), ...Object.keys(newObj)]);
    keys.forEach(k => Object.assign(patch, deepDiffPatch(oldObj[k], newObj[k], [...path, k])));
    return patch;
  }
  // Feuille (string/number/bool/null/undefined, ou changement de type de structure) : comparer directement.
  let changed;
  try { changed = JSON.stringify(oldObj) !== JSON.stringify(newObj); }
  catch (e) { changed = true; }
  if (changed && path.length > 0) patch[path.join("/")] = (newObj === undefined ? null : newObj);
  return patch;
};

// Écrit `value` à un chemin arbitrairement profond dans un objet/tableau imbriqué, en respectant
// la structure déjà présente (index numérique + tableau existant → mise à jour de tableau ;
// sinon → objet). Nécessaire pour ré-appliquer proprement des patches Firebase multi-niveaux
// (ex: "glinda/gallery/12/dateISO") — une simple déstructuration à 1-2 niveaux tronquerait le
// chemin et écraserait des structures entières (ex: tout le tableau "gallery") avec une valeur
// censée n'être qu'un champ isolé d'un de ses éléments.
const setDeepPath = (root, pathParts, value) => {
  const set = (obj, parts) => {
    if (parts.length === 0) return value;
    const [head, ...rest] = parts;
    const isIndex = /^\d+$/.test(head);
    if (isIndex && Array.isArray(obj)) {
      const arr = [...obj];
      const idx = Number(head);
      arr[idx] = set(arr[idx], rest);
      return arr;
    }
    const base = (obj && typeof obj === "object" && !Array.isArray(obj)) ? obj : {};
    return { ...base, [head]: set(base[head], rest) };
  };
  return set(root, pathParts);
};

export { shallowDiffPatch, deepDiffPatch, setDeepPath };
