import { ICON } from "./icons";
import { mapsDirectionsUrl } from "./share";
import { STATE_LABEL, type Location, type Refugio, type Strings } from "./data";

// "Refugios · cómo colaborar" needs list — surfaces every refugio that reported a need so
// people can act (visibilizar necesidades). Presentational; needs come in as props.
export function RefugiosView({
  t,
  refugioNeeds,
  onShare,
  onClose,
}: {
  t: Strings;
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
                {r.es_animal && <span className="refanimal">{t.refAnimal}</span>}
              </span>
              <span className="refitem-place">
                {ICON.pin}
                {[loc.municipality, STATE_LABEL[loc.state]].filter(Boolean).join(" · ")}
              </span>
            </div>
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
          </div>
        ))}
        {refugioNeeds.length > 0 && (
          <a className="refattrib refattrib-foot" href="https://acopiove.org" target="_blank" rel="noopener noreferrer">
            {t.refAttrib}
          </a>
        )}
      </div>
    </div>
  );
}
