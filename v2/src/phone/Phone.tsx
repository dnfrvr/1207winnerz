// Téléphone complet (iOS 6 ou Android 4 selon le perso) : cadre, écran à proportions fixes,
// couches accueil/app animées, boutons physiques.
import { Suspense, useEffect, useRef, useState, type CSSProperties } from "react";
import { Route, Routes, useLocation, useNavigate, useParams, type Location } from "react-router-dom";
import { useCanEdit, useValue } from "../data/hooks";
import { AppFrame, BackButton, NavDirCtx, RingUnlock, SlideToUnlock, StatusBar, useClock, useLoreDate, type NavDir } from "./IOSChrome";
import { OSCtx, useNow, type OS } from "./common";
import { APP_META } from "../../../src/shared/app-meta.js";
import { APPS, preloadApps } from "../apps/registry";
import { img } from "../lib/img";
import "./android.css";

type Profile = {
  name?: string; os?: string; wallpaper?: string; appIcons?: Record<string, string>; appNames?: Record<string, string>;
  badges?: Record<string, number>; phoneColor?: string; chassisPng?: string; accentColor?: string;
  screenInset?: { top: number; left: number; right: number; bottom: number };
};
type Home = { apps?: string[]; dock?: string[] };
const META = APP_META as Record<string, { label?: string; iosIcon?: string; droidLabel?: string }>;

// Taille logique de l'écran — identique sur ordinateur et en plein écran (seule l'échelle change).
const SCREENS: Record<OS, { w: number; h: number }> = { ios: { w: 320, h: 568 }, android: { w: 320, h: 533 } };
const FULLSCREEN_QUERY = "(max-width: 520px), (pointer: coarse) and (max-width: 900px)";
const KEYBAR = 52; // place réservée sous l'écran en plein écran pour les boutons physiques

// Coque Samsung (image SVG d'origine) : 500×966, écran 414×690 à (43,141).
const CHASSIS = { vw: 500, vh: 966, width: 360 };

export function Phone() {
  const { pid = "" } = useParams();
  const profile = useValue<Profile>(`phones/${pid}/profile`) ?? {};
  const os: OS = profile.os === "android" ? "android" : "ios";
  const scr = SCREENS[os];
  const canEdit = useCanEdit(pid);
  const fit = useFullscreenFit(scr);
  const hasChassis = os === "android" && !!profile.chassisPng?.startsWith("/");

  const screen = (scale: number | null) => (
    <div className="screen-fit" style={{ width: scr.w * (scale ?? 1), height: scr.h * (scale ?? 1) }}>
      <div className={`screen os-${os}`} style={{ width: scr.w, height: scr.h, transform: scale ? `scale(${scale})` : undefined, ["--accent" as string]: profile.accentColor ?? "#33b5e5" }}>
        <PhoneScreen pid={pid} profile={profile} os={os} />
        {!canEdit && <div className="readonly-tag">Lecture seule · téléphone de {profile.name ?? pid}</div>}
      </div>
    </div>
  );

  return (
    <OSCtx.Provider value={os}>
      <div className={`stage-root ${fit ? "fullscreen" : ""}`}>
        <div className="stage">
          {fit ? (
            <div className="fs-wrap">
              {screen(fit)}
              <HardwareKeys pid={pid} os={os} />
            </div>
          ) : hasChassis ? (
            <ChassisDevice pid={pid} profile={profile} render={screen} />
          ) : (
            <div className={`device ${os === "android" ? "android" : ""} ${profile.phoneColor === "black" || os === "android" ? "dark" : ""}`}>
              {screen(null)}
              {os === "ios" ? <HomeButton pid={pid} /> : <HardwareKeys pid={pid} os={os} inline />}
              {profile.chassisPng === "__iphone4__" && <Scratches />}
            </div>
          )}
        </div>
      </div>
    </OSCtx.Provider>
  );
}

/** Coque image (Samsung de Drew) : l'écran est placé dans le rectangle prévu et mis à l'échelle. */
function ChassisDevice({ pid, profile, render }: { pid: string; profile: Profile; render: (s: number | null) => React.ReactNode }) {
  const inset = profile.screenInset ?? { top: 141, left: 43, right: 43, bottom: 135 };
  const k = CHASSIS.width / CHASSIS.vw;
  const H = Math.round(CHASSIS.vh * k);
  const rect = { left: inset.left * k, top: inset.top * k, width: (CHASSIS.vw - inset.left - inset.right) * k };
  const keys = useKeys(pid, "android");
  return (
    <div className="chassis" style={{ width: CHASSIS.width, height: H }}>
      <div className="chassis-screen" style={{ left: rect.left, top: rect.top }}>{render(rect.width / SCREENS.android.w)}</div>
      {/* L'image de la coque contient un écran noir opaque : on le découpe avec un masque. */}
      {/* (masque CSS : tout sauf la « content-box », réglée sur le rectangle de l'écran) */}
      <div className="chassis-img" aria-hidden style={{
        backgroundImage: `url(${profile.chassisPng})`,
        padding: `${inset.top * k}px ${inset.right * k}px ${inset.bottom * k}px ${inset.left * k}px`,
      }} />
      <button className="hotspot" aria-label="Accueil" style={{ left: "39.7%", top: "88.2%", width: "20.6%", height: "6.9%", borderRadius: "50%" }} onClick={keys.home} />
      <button className="hotspot" aria-label="Retour" style={{ left: "70%", top: "89.3%", width: "14%", height: "4.6%" }} onClick={keys.back} />
      <button className="hotspot" aria-label="Menu" style={{ left: "16%", top: "89.3%", width: "14%", height: "4.6%" }} onClick={() => {}} />
    </div>
  );
}

// Rayures « d'occasion » de l'iPhone d'Elias (reprises de la v1, repère 223.6×412.6 de l'ancienne coque).
// [x1, y1, x2, y2, opacité, épaisseur] — coque d'abord, puis verre de l'écran (plus discret).
const CHASSIS_SCRATCHES = [[18,42,27,68,.55,.4],[96,38,103,43,.4,.3],[200,155,206,178,.35,.35],[202,160,207,168,.25,.25],[88,360,102,368,.45,.4],
  [140,372,148,378,.3,.3],[16,210,20,218,.3,.25],[14,213,17,220,.2,.2],[192,385,204,396,.5,.45],[195,388,201,393,.3,.25],[155,34,162,40,.35,.3],
  [22,310,26,325,.4,.3],[19,140,24,152,.3,.25],[198,280,208,290,.4,.35],[60,375,72,380,.35,.3],[170,390,176,398,.3,.25]];
const GLASS_SCRATCHES = [[55,110,72,118,.9,.35],[130,155,141,160,.8,.3],[80,220,88,230,.85,.25],[160,240,170,248,.7,.3],[45,290,58,296,.8,.25],[110,305,116,312,.6,.2]];
function Scratches() {
  const lines = (list: number[][]) => list.map(([x1, y1, x2, y2, o, w], i) => <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={`rgba(255,255,255,${o})`} strokeWidth={w} strokeLinecap="round" />);
  return (
    <svg className="scratches" viewBox="0 0 223.591 412.584" preserveAspectRatio="none" aria-hidden>
      <g opacity=".6">{lines(CHASSIS_SCRATCHES)}</g>
      <g opacity=".18">{lines(GLASS_SCRATCHES)}</g>
    </svg>
  );
}

function useKeys(pid: string, os: OS) {
  const nav = useNavigate();
  const loc = useLocation();
  const seg = loc.pathname.split("/").filter(Boolean);
  return {
    home: () => nav(`/${pid}/home`),
    back: () => {
      if (seg.length <= 1) return;
      if (seg[1] === "home") { nav(`/${pid}`); return; }
      if (seg.length === 2) nav(`/${pid}/home`); else nav(-1);
    },
    os,
  };
}

/** Boutons physiques : bouton rond (iOS) ou retour / accueil / récents (Android). */
function HardwareKeys({ pid, os, inline = false }: { pid: string; os: OS; inline?: boolean }) {
  const keys = useKeys(pid, os);
  if (os === "ios") return <div className="fs-keys"><button className="fs-home" aria-label="Bouton principal" onClick={keys.home} /></div>;
  return (
    <div className={inline ? "softkeys" : "fs-keys and"}>
      <button aria-label="Retour" onClick={keys.back}><svg width="20" height="16" viewBox="0 0 18 16" fill="none"><path d="M6 1 L1 8 L6 15 M1 8 L17 8" stroke="#9a9a9a" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg></button>
      <button aria-label="Accueil" onClick={keys.home}><svg width="20" height="18" viewBox="0 0 20 18" fill="none"><path d="M2 9 L10 2 L18 9 M5 7 V16 H15 V7" stroke="#9a9a9a" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg></button>
      <button aria-label="Récents"><svg width="18" height="16" viewBox="0 0 18 16" fill="none"><rect x="1" y="4" width="12" height="11" rx="1" stroke="#9a9a9a" strokeWidth="1.4" /><path d="M5 1 H17 V12" stroke="#9a9a9a" strokeWidth="1.4" /></svg></button>
    </div>
  );
}

/** En plein écran : échelle qui fait tenir l'écran (+ la barre de boutons) sans déformer. */
function useFullscreenFit(scr: { w: number; h: number }): number | null {
  const compute = () => {
    if (!window.matchMedia(FULLSCREEN_QUERY).matches) return null;
    const vv = window.visualViewport;
    const w = vv?.width ?? window.innerWidth, h = vv?.height ?? window.innerHeight;
    return Math.min(w / scr.w, (h - KEYBAR) / scr.h);
  };
  const [fit, setFit] = useState(compute);
  useEffect(() => {
    const on = () => setFit(compute());
    on();
    window.addEventListener("resize", on);
    window.visualViewport?.addEventListener("resize", on);
    return () => { window.removeEventListener("resize", on); window.visualViewport?.removeEventListener("resize", on); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scr.w, scr.h]);
  return fit;
}

// ─── Couches & animations ──────────────────────────────────────────────────
// L'accueil reste monté sous les apps : ouvrir une app le fait reculer pendant que l'app grandit
// depuis son icône ; fermer joue l'inverse. Uniquement transform/opacity → fluide (GPU).
const ANIM_MS = 380;
const iconOrigins: Record<string, { x: number; y: number }> = {};
const originStyle = (app: string, os: OS): CSSProperties => {
  const o = iconOrigins[app] ?? { x: SCREENS[os].w / 2, y: SCREENS[os].h / 2 };
  return { transformOrigin: `${o.x}px ${o.y}px` };
};

function PhoneScreen({ pid, profile, os }: { pid: string; profile: Profile; os: OS }) {
  const loc = useLocation();
  const seg = loc.pathname.split("/").filter(Boolean)[1]; // undefined = verrouillé
  const appId = seg && seg !== "home" ? seg : null;
  const [exiting, setExiting] = useState<{ location: Location; app: string } | null>(null);
  const prev = useRef<{ location: Location; app: string | null } | null>(null);

  useEffect(() => {
    const p = prev.current;
    prev.current = { location: loc, app: appId };
    // Animation de fermeture seulement au sein du même téléphone (sinon la route d'origine n'existe plus ici).
    if (p?.app && p.app !== appId && p.location.pathname.split("/")[1] === loc.pathname.split("/")[1]) {
      setExiting({ location: p.location, app: p.app });
      const t = setTimeout(() => setExiting(null), ANIM_MS);
      return () => { clearTimeout(t); setExiting(null); };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loc.pathname]);

  if (!seg) return os === "android" ? <AndroidLock pid={pid} profile={profile} /> : <Lock pid={pid} profile={profile} />;
  return (
    <>
      <div className={`home-layer ${appId ? "behind" : ""}`}>
        {os === "android" ? <AndroidHome pid={pid} profile={profile} /> : <Springboard pid={pid} profile={profile} />}
      </div>
      {appId && (
        <div key={appId} className="app-layer open" style={originStyle(appId, os)}>
          <AppStack pid={pid} />
        </div>
      )}
      {exiting && exiting.app !== appId && exiting.location.pathname.split("/")[1] === pid && (
        <div className="app-layer exit" style={originStyle(exiting.app, os)}>
          <Suspense fallback={<div className="app" />}>
            <Routes location={exiting.location}><Route path=":app/*" element={<AppRoute pid={pid} />} /></Routes>
          </Suspense>
        </div>
      )}
    </>
  );
}

/** Navigation interne d'une app : glisse depuis la droite en avançant, depuis la gauche en revenant. */
function AppStack({ pid }: { pid: string }) {
  const loc = useLocation();
  const depth = loc.pathname.split("/").filter(Boolean).length;
  const last = useRef({ path: loc.pathname, depth, dir: "none" as NavDir });
  if (last.current.path !== loc.pathname) {
    last.current = { path: loc.pathname, depth, dir: depth > last.current.depth ? "push" : depth < last.current.depth ? "pop" : "none" };
  }
  return (
    <NavDirCtx.Provider value={last.current.dir}>
      {/* Suspense local : charger une app ne masque jamais l'accueil (sinon l'animation saute). */}
      <Suspense fallback={<div className="app" />}>
        <Routes><Route path=":app/*" element={<AppRoute pid={pid} />} /></Routes>
      </Suspense>
    </NavDirCtx.Provider>
  );
}

function HomeButton({ pid }: { pid: string }) {
  const nav = useNavigate();
  return <button className="device-home" aria-label="Bouton principal" onClick={() => nav(`/${pid}/home`)} />;
}

const bg = (wallpaper?: string): CSSProperties | undefined => {
  if (!wallpaper) return undefined;
  return /^(\/|https?:|data:)/.test(wallpaper) ? { backgroundImage: `url(${img(wallpaper)})` } : { background: wallpaper };
};

// ─── iOS 6 ─────────────────────────────────────────────────────────────────
function Lock({ pid, profile }: { pid: string; profile: Profile }) {
  const nav = useNavigate();
  const time = useClock();
  const lore = useLoreDate();
  const day = lore.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
  return (
    <div className="lock" style={bg(profile.wallpaper)}>
      <StatusBar variant="clear" />
      <div className="lock-clock"><div className="t">{time}</div><div className="d">{day}</div></div>
      <div className="lock-bottom"><SlideToUnlock onUnlock={() => nav(`/${pid}/home`)} /></div>
    </div>
  );
}

/** Mémorise le centre de l'icône touchée (coordonnées logiques) : l'app s'ouvrira depuis là. */
const rememberOrigin = (id: string, el: HTMLElement) => {
  const screen = el.closest(".screen") as HTMLElement | null;
  const tile = el.querySelector(".tile")?.getBoundingClientRect();
  const r = screen?.getBoundingClientRect();
  if (r && tile && screen) {
    const k = r.width / screen.offsetWidth;
    iconOrigins[id] = { x: (tile.left + tile.width / 2 - r.left) / k, y: (tile.top + tile.height / 2 - r.top) / k };
  }
};

function AppIcon({ pid, id, src, label, badge }: { pid: string; id: string; src?: string; label: string; badge?: number }) {
  const nav = useNavigate();
  const meta = META[id] ?? {};
  return (
    <button className="icon" onClick={(e) => { rememberOrigin(id, e.currentTarget); nav(`/${pid}/${id}`); }}>
      <span className="icon-wrap">
        <span className={`tile ${src ? "flat" : ""}`}>{src ? <img src={img(src)} alt="" loading="lazy" draggable={false} /> : (meta.iosIcon ?? "📱")}</span>
        {!!badge && <span className="badge">{badge}</span>}
      </span>
      <span className="name">{label}</span>
    </button>
  );
}

const PER_PAGE = { ios: 20, android: 20 };

function useHomeApps(pid: string) {
  const home = useValue<Home>(`phones/${pid}/home`) ?? {};
  const dock = home.dock ?? [];
  const apps = (home.apps ?? []).filter((a) => !dock.includes(a));
  return { dock, apps };
}

function Pages({ ids, per, render }: { ids: string[]; per: number; render: (id: string) => React.ReactNode }) {
  const pages = Array.from({ length: Math.max(1, Math.ceil(ids.length / per)) }, (_, i) => ids.slice(i * per, (i + 1) * per));
  const [page, setPage] = useState(0);
  return (
    <>
      <div className="pages" onScroll={(e) => setPage(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))}>
        {pages.map((p, i) => <div className="page" key={i}>{p.map(render)}</div>)}
      </div>
      {pages.length > 1 && <div className="dots">{pages.map((_, i) => <i key={i} className={i === page ? "on" : ""} />)}</div>}
    </>
  );
}

function Springboard({ pid, profile }: { pid: string; profile: Profile }) {
  const { dock, apps } = useHomeApps(pid);
  useEffect(preloadApps, []);
  const icon = (id: string) => (
    <AppIcon key={id} pid={pid} id={id} src={profile.appIcons?.[id]} badge={profile.badges?.[id]}
      label={profile.appNames?.[id] || META[id]?.label || id} />
  );
  return (
    <div className="springboard" style={bg(profile.wallpaper)}>
      <StatusBar variant="translucent" />
      <Pages ids={apps} per={PER_PAGE.ios} render={icon} />
      <div className="dock">{dock.map(icon)}</div>
    </div>
  );
}

// ─── Android 4 ─────────────────────────────────────────────────────────────
function AndroidLock({ pid, profile }: { pid: string; profile: Profile }) {
  const nav = useNavigate();
  const now = useNow();
  const lore = useLoreDate();
  const time = now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  const day = lore.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
  return (
    <div className="and-lock" style={bg(profile.wallpaper)}>
      <StatusBar variant="clear" />
      <div className="and-lock-clock"><div className="t">{time}</div><div className="d">{day}</div></div>
      <RingUnlock onUnlock={() => nav(`/${pid}/home`)} />
      <div className="carrier">AT&amp;T</div>
    </div>
  );
}

function AndroidHome({ pid, profile }: { pid: string; profile: Profile }) {
  const { dock, apps } = useHomeApps(pid);
  const icons = useValue<Record<string, string>>("shared/androidIcons") ?? {};
  useEffect(preloadApps, []);
  const icon = (id: string) => (
    <AppIcon key={id} pid={pid} id={id} src={icons[id]} badge={profile.badges?.[id]}
      label={profile.appNames?.[id] || META[id]?.droidLabel || META[id]?.label || id} />
  );
  return (
    <div className="and-home" style={bg(profile.wallpaper)}>
      <StatusBar variant="translucent" />
      <Pages ids={apps} per={PER_PAGE.android} render={icon} />
      <div className="and-dock">{dock.map(icon)}</div>
    </div>
  );
}

function AppRoute({ pid }: { pid: string }) {
  const { app = "" } = useParams();
  const Impl = APPS[app];
  if (Impl) return <Impl pid={pid} />;
  const label = META[app]?.droidLabel ?? META[app]?.label ?? app;
  return (
    <AppFrame title={label} left={<BackButton to={`/${pid}/home`} label="Accueil" />} bodyClass="pinstripe">
      <div className="soon">{META[app]?.iosIcon ?? "📱"}<br />{label}<small>Cette app n'est pas encore portée dans la v2.</small></div>
    </AppFrame>
  );
}
