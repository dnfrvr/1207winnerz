// netlify/functions/spotify-playlist.js
//
// Fonction serverless : récupère les morceaux d'une playlist Spotify publique à partir de
// son lien/URI/ID, en s'authentifiant côté serveur (Client Credentials flow). Le Client Secret
// Spotify ne transite JAMAIS côté navigateur — seul le résultat (titres/artistes/covers) est
// renvoyé au front.
//
// Variables d'env Netlify requises (Site settings → Environment variables) :
//   SPOTIFY_CLIENT_ID
//   SPOTIFY_CLIENT_SECRET
// (À créer gratuitement sur https://developer.spotify.com/dashboard → Create app.
//  Aucune "Redirect URI" n'est nécessaire pour le Client Credentials flow.)

const extractPlaylistId = (input) => {
  if (!input) return null;
  const trimmed = input.trim();
  // https://open.spotify.com/playlist/ID?si=...  |  spotify:playlist:ID  |  ID brut
  const match = trimmed.match(/playlist[\/:]([a-zA-Z0-9]+)/);
  if (match) return match[1];
  if (/^[a-zA-Z0-9]{10,}$/.test(trimmed)) return trimmed;
  return null;
};

const getAccessToken = async (clientId, clientSecret) => {
  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Authorization": "Basic " + Buffer.from(`${clientId}:${clientSecret}`).toString("base64"),
    },
    body: "grant_type=client_credentials",
  });
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Auth Spotify échouée (${res.status}) : ${detail}`);
  }
  const data = await res.json();
  return data.access_token;
};

const msToDuration = (ms) => {
  if (!ms && ms !== 0) return "";
  const totalSec = Math.round(ms / 1000);
  const mins = Math.floor(totalSec / 60);
  const secs = String(totalSec % 60).padStart(2, "0");
  return `${mins}:${secs}`;
};

exports.handler = async (event) => {
  const cors = {
    "Access-Control-Allow-Origin": "*",
    "Content-Type": "application/json",
  };

  try {
    const rawUrl = event.queryStringParameters?.url;
    const playlistId = extractPlaylistId(rawUrl);
    if (!playlistId) {
      return { statusCode: 400, headers: cors, body: JSON.stringify({ error: "Lien de playlist Spotify invalide ou introuvable dans l'URL fournie." }) };
    }

    const clientId = process.env.SPOTIFY_CLIENT_ID;
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
      return { statusCode: 500, headers: cors, body: JSON.stringify({ error: "SPOTIFY_CLIENT_ID / SPOTIFY_CLIENT_SECRET manquants dans les variables d'environnement Netlify." }) };
    }

    const accessToken = await getAccessToken(clientId, clientSecret);
    const authHeaders = { Authorization: `Bearer ${accessToken}` };

    // Métadonnées de la playlist (nom + cover)
    const metaRes = await fetch(
      `https://api.spotify.com/v1/playlists/${playlistId}?fields=name,images`,
      { headers: authHeaders }
    );
    if (!metaRes.ok) {
      const detail = await metaRes.text();
      return { statusCode: metaRes.status, headers: cors, body: JSON.stringify({ error: `Playlist introuvable ou privée (${metaRes.status}).`, detail }) };
    }
    const meta = await metaRes.json();

    // Morceaux, paginés (max 100 par page côté Spotify)
    const tracks = [];
    let nextUrl = `https://api.spotify.com/v1/playlists/${playlistId}/tracks?limit=100&fields=items(track(name,artists(name),album(name,images),duration_ms)),next`;
    let safety = 0;
    while (nextUrl && safety < 50) {
      safety++;
      const res = await fetch(nextUrl, { headers: authHeaders });
      if (!res.ok) {
        const detail = await res.text();
        return { statusCode: res.status, headers: cors, body: JSON.stringify({ error: `Échec de récupération des morceaux (${res.status}).`, detail }) };
      }
      const page = await res.json();
      (page.items || []).forEach((item) => {
        const t = item.track;
        if (!t) return; // morceau supprimé/local track sans metadata
        tracks.push({
          title: t.name || "",
          artist: (t.artists || []).map((a) => a.name).join(", "),
          album: t.album?.name || "",
          duration: msToDuration(t.duration_ms),
          cover: t.album?.images?.[0]?.url || null,
        });
      });
      nextUrl = page.next || null;
    }

    return {
      statusCode: 200,
      headers: cors,
      body: JSON.stringify({
        name: meta.name || "",
        cover: meta.images?.[0]?.url || null,
        tracks,
      }),
    };
  } catch (e) {
    return { statusCode: 500, headers: cors, body: JSON.stringify({ error: e.message }) };
  }
};
