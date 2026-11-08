// Toutes les apps de la v2. Une même app peut servir plusieurs identifiants (iOS / Android).
import { lazy, type ComponentType } from "react";

type AppModule = { default: ComponentType<{ pid: string }> };
const named = <K extends string>(load: () => Promise<Record<K, ComponentType<{ pid: string }>>>, key: K) => () => load().then((m) => ({ default: m[key] }) as AppModule);

const loaders: Record<string, () => Promise<AppModule>> = {
  notes: () => import("./Notes"),
  messages: () => import("./Messages"),
  photos: () => import("./Photos"),
  gallery: () => import("./Photos"),
  music: () => import("./Music"),
  phone: () => import("./Phone"),
  contacts: named(() => import("./Phone"), "ContactsApp"),
  calendar: () => import("./Calendar"),
  clock: () => import("./Clock"),
  weather: () => import("./Weather"),
  settings: () => import("./Settings"),
  insta: () => import("./Instagram"),
  twitter: () => import("./Twitter"),
  facebook: () => import("./Facebook"),
  tumblr: () => import("./Tumblr"),
  pinterest: () => import("./Pinterest"),
  youtube: () => import("./YouTube"),
  gmail: () => import("./Mail"),
  safari: () => import("./Browser"),
  browser: () => import("./Browser"),
  maps: () => import("./Maps"),
  snapchat: named(() => import("./Lifestyle"), "SnapchatApp"),
  groupme: named(() => import("./Lifestyle"), "GroupMeApp"),
  starbucks: named(() => import("./Lifestyle"), "StarbucksApp"),
  files: named(() => import("./Lifestyle"), "FilesApp"),
  grindr: named(() => import("./Personal"), "GrindrApp"),
  nikeplus: named(() => import("./Personal"), "NikeApp"),
  soundcloud: named(() => import("./Personal"), "SoundCloudApp"),
  inaturalist: named(() => import("./Personal"), "INaturalistApp"),
  kindle: named(() => import("./Personal"), "KindleApp"),
  wikipedia: named(() => import("./Personal"), "WikipediaApp"),
  reddit: named(() => import("./Personal"), "RedditApp"),
  vpn: named(() => import("./Personal"), "VpnApp"),
  camera: named(() => import("./System"), "CameraApp"),
  compass: named(() => import("./System"), "CompassApp"),
  facetime: named(() => import("./System"), "FaceTimeApp"),
  passbook: named(() => import("./System"), "PassbookApp"),
  reminders: named(() => import("./System"), "RemindersApp"),
  messenger: named(() => import("./System"), "MessengerApp"),
  candycrush: () => import("./Games"),
  templerun: () => import("./Games"),
  angrybirds: () => import("./Games"),
  subwaysurf: () => import("./Games"),
  pou: () => import("./Games"),
  wordswfriends: () => import("./Games"),
  vine: named(() => import("./SocialExtra"), "VineApp"),
  polyvore: () => import("./Games"),
  kik: named(() => import("./SocialExtra"), "KikApp"),
  askfm: () => import("./Games"),
  espn: () => import("./Games"),
  shazam: () => import("./Games"),
};

export const registerApps = (more: Record<string, () => Promise<AppModule>>) => Object.assign(loaders, more);

const cache = new Map<string, ComponentType<{ pid: string }>>();
export const APPS = new Proxy({} as Record<string, ComponentType<{ pid: string }>>, {
  get: (_, k: string) => {
    if (!loaders[k]) return undefined;
    if (!cache.has(k)) cache.set(k, lazy(loaders[k]));
    return cache.get(k);
  },
});

/** Précharge le code des apps quand le téléphone est au repos → ouverture sans attente ni saccade. */
let preloaded = false;
export const preloadApps = () => {
  if (preloaded) return;
  preloaded = true;
  const run = () => Object.values(loaders).forEach((l) => l().catch(() => { preloaded = false; }));
  const w = window as Window & { requestIdleCallback?: (cb: () => void) => void };
  if (w.requestIdleCallback) w.requestIdleCallback(run); else setTimeout(run, 300);
};
