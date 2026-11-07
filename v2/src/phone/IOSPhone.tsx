import { useState } from "react";
import { Route, Routes, useNavigate, useParams } from "react-router-dom";
import { useCanEdit, useValue } from "../data/hooks";
import { AppFrame, BackButton, SlideToUnlock, StatusBar, useClock, useLoreDate } from "./IOSChrome";
import { APP_META } from "../../../src/shared/app-meta.js";
import { APPS } from "../apps/registry";

type Profile = { name?: string; wallpaper?: string; appIcons?: Record<string, string>; appNames?: Record<string, string>; badges?: Record<string, number>; phoneColor?: string };
type Home = { apps?: string[]; dock?: string[] };

const META = APP_META as Record<string, { label?: string; iosIcon?: string }>;

export function IOSPhone() {
  const { pid = "" } = useParams();
  const profile = useValue<Profile>(`phones/${pid}/profile`) ?? {};
  const canEdit = useCanEdit(pid);
  return (
    <div className="stage">
      <div className={`device ${profile.phoneColor === "black" ? "dark" : ""}`}>
        <div className="screen">
          <Routes>
            <Route index element={<Lock pid={pid} profile={profile} />} />
            <Route path="home" element={<Springboard pid={pid} profile={profile} />} />
            <Route path=":app/*" element={<AppRoute pid={pid} />} />
          </Routes>
          {!canEdit && <div className="readonly-tag">Lecture seule · téléphone de {profile.name ?? pid}</div>}
        </div>
        <HomeButton pid={pid} />
      </div>
    </div>
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
    <button className="icon" onClick={() => nav(`/${pid}/${id}`)}>
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
