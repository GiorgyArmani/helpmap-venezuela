import { ICON, TYPE_ICON } from "./icons";
import { mapsDirectionsUrl } from "./share";
import { EstadoBadge, RefugioStatusNote, UpdatedLine } from "./RefugioStatus";
import { ayudaKeys } from "./helpers";
import { AYUDA_META, STATE_LABEL, TYPE_META, type Lang, type Location, type Refugio, type Strings } from "./data";

// "Refugios · cómo colaborar" needs list — surfaces every place that reported a need so
// people can act (visibilizar necesidades). Presentational; needs come in as props. The
// list mixes refugios, puntos de acopio AND civic initiatives, so each row is labelled
// with its type.
export function RefugiosView({
  t,
  lang,
  refugioNeeds,
  onShare,
  onClose,
}: {
  t: Strings;
  lang: Lang;
  refugioNeeds: { r: Refugio; loc: Location }[];
  onShare: (loc: Location, r: Refugio) => void;
  onClose: () => void;
}) {
  return (
    <div className="overlay">
      <div className="ovhead">
        <button className="oicon" onClick={onClose}>
          {ICON.back}
        </button>
        <span className="ohtitle">{t.refListTitle}</span>
      </div>
      <div className="ovbody">
        <div className="note" style={{ marginBottom: 14 }}>
          <span className="refbar-ic">{ICON.volunteer}</span>
          {t.refListSub}
        </div>
        {refugioNeeds.length === 0 && <div className="empty">{t.refListEmpty}</div>}
        {refugioNeeds.map(({ r, loc }) => (
          <div className="refitem" key={r.location_id}>
            <div className="refitem-h">
              <span className="refitem-name">
                {loc.canonical_name}
                <EstadoBadge r={r} lang={lang} />
                {r.es_animal && <span className="refanimal">{t.refAnimal}</span>}
              </span>
              <span className="refitem-place">
                <span className="refitem-type" style={{ color: TYPE_META[loc.type].color }}>
                  {TYPE_ICON[loc.type]}
                  {r.categoria || TYPE_META[loc.type][lang]}
                </span>
                {ICON.pin}
                {[loc.municipality, STATE_LABEL[loc.state]].filter(Boolean).join(" · ")}
              </span>
            </div>
            {/* "Lleno" / stale warning. A `cerrado` point never reaches this list (it is
                filtered out upstream) — it's not asking for donations. */}
            <RefugioStatusNote r={r} t={t} />
            {r.descripcion && <p className="refneedtxt">{r.descripcion}</p>}
            {ayudaKeys(r.ayuda).length > 0 && (
              <div className="refblock">
                <span className="reflabel">{ICON.volunteer}{t.iniHelpWays}</span>
                <div className="refchips">
                  {ayudaKeys(r.ayuda).map((k) => (
                    <span key={k} className="refchip inichip">{AYUDA_META[k][lang]}</span>
                  ))}
                </div>
              </div>
            )}
            {r.necesita && (
              <div className="refneed">
                <span className="reflabel">{ICON.volunteer}{t.refNeeds}</span>
                <p className="refneedtxt">{r.necesita}</p>
              </div>
            )}
            {r.recibe.length > 0 && (
              <div className="refblock">
                <span className="reflabel">{ICON.box}{t.refReceives}</span>
                <div className="refchips">
                  {r.recibe.map((x, i) => (
                    <span key={i} className="refchip">{x.charAt(0).toUpperCase() + x.slice(1)}</span>
                  ))}
                </div>
              </div>
            )}
            <div className="refitem-acts">
              <a
                className="btnp"
                href={mapsDirectionsUrl(loc.lat, loc.lng)}
                target="_blank"
                rel="noopener noreferrer"
              >
                {ICON.pin}
                {t.directions}
              </a>
              {loc.contact_whatsapp && (
                <a
                  className="btng"
                  href={`https://wa.me/${loc.contact_whatsapp.replace(/[^0-9]/g, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {ICON.wa}
                  {t.whatsapp}
                </a>
              )}
              <button className="btng" onClick={() => onShare(loc, r)}>
                {ICON.share}
                {t.refShareCta}
              </button>
            </div>
            <div className="refitem-foot">
              <UpdatedLine r={r} t={t} lang={lang} />
            </div>
          </div>
        ))}
        {/* CC-BY 4.0 attribution — only when the list actually contains AcopioVE rows
            (external_id). Iniciativas and hand-added centers are our own data. */}
        {refugioNeeds.some(({ r }) => r.external_id) && (
          <a className="refattrib refattrib-foot" href="https://acopiove.org" target="_blank" rel="noopener noreferrer">
            {t.refAttrib}
          </a>
        )}
      </div>
    </div>
  );
}
