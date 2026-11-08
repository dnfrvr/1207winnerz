// Kik et Vine : réseaux sociaux de 2012-2013 (à compléter par la revue design).
import { AppFrame, BackButton } from "../phone/IOSChrome";
import { Empty } from "../kit/kit";

export function KikApp({ pid }: { pid: string }) {
  return <AppFrame title="kik." left={<BackButton to={`/${pid}/home`} label="Accueil" />}><Empty>Kik</Empty></AppFrame>;
}

export function VineApp({ pid }: { pid: string }) {
  return <AppFrame title="Vine" left={<BackButton to={`/${pid}/home`} label="Accueil" />}><Empty>Vine</Empty></AppFrame>;
}
