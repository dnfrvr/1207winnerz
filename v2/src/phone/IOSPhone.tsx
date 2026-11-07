import { Suspense, useEffect, useRef, useState, type CSSProperties } from "react";
import { Route, Routes, useLocation, useNavigate, useParams, type Location } from "react-router-dom";
import { useCanEdit, useValue } from "../data/hooks";
import { AppFrame, BackButton, NavDirCtx, SlideToUnlock, StatusBar, useClock, useLoreDate, type NavDir } from "./IOSChrome";
import { APP_META } from "../../../src/shared/app-meta.js";
import { APPS, preloadApps } from "../apps/registry";

type Profile = { name?: string; wallpaper?: string; appIcons?: Record<string, string>; appNames?: Record<string, string>; badges?: Record<string, number>; phoneColor?: string };
type Home = { apps?: string[]; dock?: string[] };

const META = APP_META as Record<string, { label?: string; iosIcon?: string }>;

export function IOSPhone() {
  const { pid = "" } = useParams();
  const profile = useValue<Profile>(`phones/${pid}/profile`) ?? {};
  const canEdit = useCanEdit(pid);
  const fit = useFullscreenFit();
  return (
    <div className={`stage-root ${fit ? "fullscreen" : ""}`}>
    <div className="stage">
      <div className={`device ${profile.phoneColor === "black" ? "dark" : ""}`}>
        <div className="screen-fit" style={fit ? { width: SCREEN_W * fit, height: SCREEN_H * fit } : { width: SCREEN_W, height: SCREEN_H }}>
        <div className="screen" style={fit ? { transform: `scale(${fit})` } : undefined}>
          <PhoneScreen pid={pid} profile={profile} />
          {!canEdit && <div className="readonly-tag">Lecture seule · téléphone de {profile.name ?? pid}</div>}
        </div>
        </div>
        <HomeButton pid={pid} />
      </div>
    </div>
    </div>
  );
}

// Taille logique de l'écran (iPhone 5) — identique sur ordinateur et en plein écran.
const SCREEN_W = 320, SCREEN_H = 568;
const FULLSCREEN_QUERY = "(max-width: 520px), (pointer: coarse) and (max-width: 900px)";

/** En plein écran : facteur d'échelle qui fait tenir 320×568 dans la fenêtre sans déformer. */
function useFullscreenFit(): number | null {
  const compute = () => {
    if (!window.matchMedia(FULLSCREEN_QUERY).matches) return null;
    const vv = window.visualViewport;
    const w = vv?.width ?? window.innerWidth, h = vv?.height ?? window.innerHeight;
    return Math.min(w / SCREEN_W, h / SCREEN_H);
  };
  const [fit, setFit] = useState(compute);
  useEffect(() => {
    const on = () => setFit(compute());
    window.addEventListener("resize", on);
    window.visualViewport?.addEventListener("resize", on);
    return () => { window.removeEventListener("resize", on); window.visualViewport?.removeEventListener("resize", on); };
  }, []);
  return fit;
}

// ─── Couches & animations façon iOS 6 ──────────────────────────────────────
// Le springboard reste monté sous les apps : ouvrir une app le fait reculer (zoom + fondu)
// pendant que l'app grandit depuis son icône ; fermer joue l'inverse (l'app rétrécit vers
// son icône). Animations uniquement en transform/opacity → fluides, calculées par le GPU.
const ANIM_MS = 380;
const iconOrigins: Record<string, { x: number; y: number }> = {};
const originStyle = (app: string): CSSProperties => {
  const o = iconOrigins[app] ?? { x: SCREEN_W / 2, y: SCREEN_H / 2 };
  return { transformOrigin: `${o.x}px ${o.y}px` };
};

function PhoneScreen({ pid, profile }: { pid: string; profile: Profile }) {
  const loc = useLocation();
  const seg = loc.pathname.split("/").filter(Boolean)[1]; // undefined = verrouillé
  const appId = seg && seg !== "home" ? seg : null;
  const [exiting, setExiting] = useState<{ location: Location; app: string } | null>(null);
  const prev = useRef<{ location: Location; app: string | null } | null>(null);

  useEffect(() => {
    const p = prev.current;
    prev.current = { location: loc, app: appId };
    if (p?.app && p.app !== appId) {
      setExiting({ location: p.location, app: p.app });
      const t = setTimeout(() => setExiting(null), ANIM_MS);
      return () => { clearTimeout(t); setExiting(null); };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loc.pathname]);

  if (!seg) return <Lock pid={pid} profile={profile} />;
  return (
    <>
      <div className={`home-layer ${appId ? "behind" : ""}`}><Springboard pid={pid} profile={profile} /></div>
      {appId && (
        <div key={appId} className="app-layer open" style={originStyle(appId)}>
          <AppStack pid={pid} />
        </div>
      )}
      {exiting && exiting.app !== appId && (
        <div className="app-layer exit" style={originStyle(exiting.app)}>
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
      {/* Suspense local : charger une app ne masque jamais le springboard (sinon l'animation saute). */}
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

function Lock({ pid, profile }: { pid: string; profile: Profile }) {
  const nav = useNavigate();
  const time = useClock();
  const lore = useLoreDate();
  const day = lore.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
  return (
    <div className="lock" style={{ backgroundImage: profile.wallpaper ? `url(${profile.wallpaper})` : undefined }}>
      <StatusBar variant="clear" />
      <div className="lock-clock"><div className="t">{time}</div><div className="d">{day}</div></div>
      <div className="lock-bottom"><SlideToUnlock onUnlock={() => nav(`/${pid}/home`)} /></div>
    </div>
  );
}

function AppIcon({ pid, id, profile }: { pid: string; id: string; profile: Profile }) {
  const nav = useNavigate();
  const meta = META[id] ?? {};
  const img = profile.appIcons?.[id];
  const label = profile.appNames?.[id] || meta.label || id;
  const badge = profile.badges?.[id];
  return (
    <button className="icon" onClick={(e) => {
      // Mémorise le centre de l'icône (coordonnées logiques de l'écran) : l'app s'ouvrira depuis là.
      const screen = (e.currentTarget as HTMLElement).closest(".screen") as HTMLElement | null;
      const tile = (e.currentTarget as HTMLElement).querySelector(".tile")?.getBoundingClientRect();
      const r = screen?.getBoundingClientRect();
      if (r && tile && screen) {
        const k = r.width / screen.offsetWidth;
        iconOrigins[id] = { x: (tile.left + tile.width / 2 - r.left) / k, y: (tile.top + tile.height / 2 - r.top) / k };
      }
      nav(`/${pid}/${id}`);
    }}>
      <span className="icon-wrap">
        <span className={`tile ${img ? "flat" : ""}`}>{img ? <img src={img} alt="" loading="lazy" /> : (meta.iosIcon ?? "📱")}</span>
        {!!badge && <span className="badge">{badge}</span>}
      </span>
      <span className="name">{label}</span>
    </button>
  );
}

const PER_PAGE = 20;

function Springboard({ pid, profile }: { pid: string; profile: Profile }) {
  const home = useValue<Home>(`phones/${pid}/home`) ?? {};
  const dock = home.dock ?? [];
  const apps = (home.apps ?? []).filter((a) => !dock.includes(a));
  const pages = Array.from({ length: Math.max(1, Math.ceil(apps.length / PER_PAGE)) }, (_, i) => apps.slice(i * PER_PAGE, (i + 1) * PER_PAGE));
  const [page, setPage] = useState(0);
  useEffect(preloadApps, []);
  return (
    <div className="springboard" style={{ backgroundImage: profile.wallpaper ? `url(${profile.wallpaper})` : undefined }}>
      <StatusBar variant="translucent" />
      <div className="pages" onScroll={(e) => setPage(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))}>
        {pages.map((ids, i) => (
          <div className="page" key={i}>{ids.map((id) => <AppIcon key={id} pid={pid} id={id} profile={profile} />)}</div>
        ))}
      </div>
      {pages.length > 1 && <div className="dots">{pages.map((_, i) => <i key={i} className={i === page ? "on" : ""} />)}</div>}
      <div className="dock">{dock.map((id) => <AppIcon key={id} pid={pid} id={id} profile={profile} />)}</div>
    </div>
  );
}

function AppRoute({ pid }: { pid: string }) {
  const { app = "" } = useParams();
  const Impl = APPS[app];
  if (Impl) return <Impl pid={pid} />;
  const label = META[app]?.label ?? app;
  return (
    <AppFrame title={label} left={<BackButton to={`/${pid}/home`} label="Accueil" />} bodyClass="pinstripe">
      <div className="soon">{META[app]?.iosIcon ?? "📱"}<br />{label}<small>Cette app n'est pas encore portée dans la v2.</small></div>
    </AppFrame>
  );
}
