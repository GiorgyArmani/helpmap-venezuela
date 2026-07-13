import { Avatar } from "./Avatar";
import { ICON } from "./icons";
import { maskCI, type RescatadoPublic, type Strings } from "./data";

// Public "Rescatados" list — people rescued in the field, not yet at a center (no map
// pin). Presentational: all data comes in as props.
export function RescuedView({
  t,
  rescatados,
  onClose,
}: {
  t: Strings;
  rescatados: RescatadoPublic[];
  onClose: () => void;
}) {
  return (
    <div className="overlay">
      <div className="ovhead">
        <button className="oicon" onClick={onClose}>
          {ICON.back}
        </button>
        <span className="ohtitle">{t.rescuedListTitle}</span>
      </div>
      <div className="ovbody">
        <div className="note" style={{ marginBottom: 14 }}>
          <span className="resc-ic">{ICON.rescue}</span>
          {t.rescuedListSub}
        </div>
        {rescatados.length === 0 && <div className="empty">{t.rescuedNone}</div>}
        {rescatados.map((r) => (
          <div className={"card st-resc"} key={r.id}>
            <Avatar p={r} cls="av" />
            <div className="cmid">
              <span className="cname">
                {(r.nombres + " " + r.apellidos).trim() || "—"}
                {r.verified && <span className="vchk"> {ICON.check}</span>}
              </span>
              <span className="cmeta">
                {[
                  r.edad != null ? r.edad + " " + t.yrs : null,
                  r.sexo === "M" ? t.male : r.sexo === "F" ? t.female : null,
                  !r.is_minor && r.ci_display && r.ci_display !== "—" ? maskCI(r.ci_display) : null,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </span>
            </div>
            <div className="cend">
              <span className="badge resc-badge">
                <span className="dot"></span>
                {t.rescuedStatus}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
