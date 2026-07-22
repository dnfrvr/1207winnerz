// Mécanisme de feed social partagé entre les 4 téléphones.
// Twitter, Tumblr et Facebook fonctionnent sur le même principe : un feed unique
// (posts, avatars, relations de follow) stocké dans data.sharedThreads._shared*,
// visible par tous les persos et mis à jour via onUpdateShared(clé, valeur).
// Cette logique est écrite ici une seule fois, au lieu d'être dupliquée par écran.

// Dérive la clé du perso courant ("glinda"|"eoghan"|"drew"|"elias") depuis son username.
export const getCharKey = (data) =>
  data?.username?.includes("glinda") ? "glinda"
  : data?.username?.includes("eoghan") ? "eoghan"
  : data?.username?.includes("drew") ? "drew"
  : "elias";

// Avatars partagés entre les 4 persos (la photo de profil d'un perso est visible
// sur ses posts dans le feed des autres).
export const getSharedAvatars = (data) => data?.sharedThreads?._sharedAvatars || {};

// Relations de follow partagées entre les 4 persos (Twitter / Tumblr).
// followsKey = "_twitterFollows" ou "_tumblrFollows". Renvoie le même trio de helpers
// que chaque écran redéfinissait à l'identique.
export const makeSharedFollows = (data, onUpdateShared, followsKey) => {
  const charKey = getCharKey(data);
  const follows = data?.sharedThreads?.[followsKey] || {};
  return {
    follows,
    iFollow:   (key) => (follows[charKey] || []).includes(key),
    followsMe: (key) => (follows[key] || []).includes(charKey),
    toggleFollow: (key) => {
      const mine = follows[charKey] || [];
      const next = mine.includes(key) ? mine.filter(k => k !== key) : [...mine, key];
      onUpdateShared(followsKey, { ...follows, [charKey]: next });
    },
  };
};
