import { ICON } from "./icons";
import { estadoOf, refugioAgeDays, timeAgo, REFUGIO_STALE_DAYS } from "./helpers";
import { ESTADO_META, type Lang, type Refugio, type Strings } from "./data";

// Operating status + data freshness for a help point — the two things AcopioVE shows on
// its card ("Activo" / "Actualizado hace 28 días") that we were importing but not
// surfacing. Both matter for the same reason: a refugio or acopio that closed, or a
// record nobody has touched in weeks, sends people on a wasted (or unsafe) trip.
// Rendered in the needs card, the needs list and the shared /c/[id] page.

export function EstadoBadge({ r, lang }: { r: Refugio | null | undefined; lang: Lang }) {
  const e = estadoOf(r);
  if (!e) return null; // unknown → say nothing rather than imply "open"
  return <span className={"estbadge " + ESTADO_META[e].cls}>{ESTADO_META[e][lang]}</span>;
}

// "Actualizado hace 3 d" + a warning tone once the record goes stale.
export function UpdatedLine({ r, t, lang }: { r: Refugio | null | undefined; t: Strings; lang: Lang }) {
  const iso = r?.updated_at || r?.last_confirmed_at;
  if (!iso) return null;
  const days = refugioAgeDays(r);
  const old = days != null && days >= REFUGIO_STALE_DAYS;
  return (
    <span className={"refupd" + (old ? " refupd-old" : "")}>
      {ICON.clock}
      {t.refUpdated} {timeAgo(iso, lang)}
    </span>
  );
}

// The full block for a card: status note (closed/full), then the freshness hint.
// (No `lang` — the copy already comes localized in `t`.)
export function RefugioStatusNote({ r, t }: { r: Refugio | null | undefined; t: Strings }) {
  const e = estadoOf(r);
  const days = refugioAgeDays(r);
  const stale = days != null && days >= REFUGIO_STALE_DAYS;
  if (!e && !stale) return null;
  if (e === "cerrado") return <p className="refwarn refwarn-closed">{t.refClosedNote}</p>;
  if (e === "lleno") return <p className="refwarn">{t.refFullNote}</p>;
  return stale ? <p className="refwarn refwarn-soft">{t.refUpdatedOld}</p> : null;
}
