import { useState } from "react";
import { Avatar } from "./Avatar";
import { ICON, TYPE_ICON } from "./icons";
import { timeAgo, localeOf } from "./helpers";
import { mapsDirectionsUrl } from "./share";
import { SM, STATE_LABEL, TYPE_META, type Lang, type Location, type PatientPublic, type Strings } from "./data";

// Per-person detail overlay (the "ficha"). Presentational; actions come in as callbacks.
export function DetailView({
  t,
  lang,
  patient,
  loc,
  onShare,
  onContribute,
  onSeeMap,
  onClose,
}: {
  t: Strings;
  lang: Lang;
  patient: PatientPublic;
  loc: Location | null;
  onShare: () => void;
  onContribute: () => void;
  onSeeMap: () => void;
  onClose: () => void;
}) {
  const [showVerifiedInfo, setShowVerifiedInfo] = useState(false);
  return (
    <div className="overlay">
      <div className="ovhead">
        <button className="oicon" onClick={onClose}>
          {ICON.back}
        </button>
        <span className="ohtitle">{t.detailTitle}</span>
        <button className="oicon" onClick={onShare}>
          {ICON.share}
        </button>
      </div>
      <div className="ovbody">
        <div className={"dhero " + SM[patient.estatus].cls}>
          <Avatar p={patient} cls="dav" />
          <span className="dname">{patient.nombres + " " + patient.apellidos}</span>
          <span className="badge">
            <span className="dot"></span>
            {SM[patient.estatus][lang]}
          </span>
          {patient.verified && (
            <span className="vchk">
              {ICON.check}
              {t.verifiedYes}
            </span>
          )}
        </div>
        {/* Prominent "last updated" — in an emergency people need to see how fresh the
            record is FIRST (multiple transfers happen; §14). Relative time big, exact
            datetime beneath. */}
        <div className="dupdated-hero">
          <span className="duh-label">{t.updatedTitle}</span>
          <span className="duh-time">{timeAgo(patient.updated_at, lang)}</span>
          <span className="duh-date">
            {new Date(patient.updated_at).toLocaleString(localeOf(lang))}
          </span>
        </div>
        <div className="drows">
          {[
            { label: t.f_status, value: SM[patient.estatus][lang], mono: "" },
            { label: t.ci, value: patient.ci_display, mono: "mono" },
            { label: t.edad, value: patient.edad != null ? patient.edad + " " + t.yrs : "—", mono: "" },
            { label: t.sexo, value: patient.sexo === "F" ? t.female : patient.sexo === "M" ? t.male : "—", mono: "" },
            { label: t.ubic, value: patient.location_name, mono: "" },
            {
              label: t.type,
              value: (
                <span className="dval-type">
                  {TYPE_META[patient.location_type][lang]}
                  <span className="dval-type-ic" style={{ color: TYPE_META[patient.location_type].color }}>
                    {TYPE_ICON[patient.location_type]}
                  </span>
                </span>
              ),
              mono: "",
            },
            { label: t.municipality, value: patient.municipality ?? "—", mono: "" },
            { label: t.state, value: STATE_LABEL[patient.state], mono: "" },
            {
              label: (
                <span className="dlabel-info">
                  {t.verified}
                  <button
                    type="button"
                    className="infobtn"
                    onClick={() => setShowVerifiedInfo((s) => !s)}
                    aria-label={t.verifiedInfo}
                  >
                    {ICON.info}
                  </button>
                </span>
              ),
              value: patient.verified ? t.verifiedYes : t.verifiedNo,
              mono: "",
            },
          ].map((r, i) => (
            <div className="drow" key={i}>
              <span className="dlabel">{r.label}</span>
              <span className={"dval " + r.mono}>{r.value}</span>
            </div>
          ))}
        </div>
        {showVerifiedInfo && <div className="verifiedinfo">{t.verifiedInfo}</div>}
        {/* Methodology disclaimer (§14): the list doesn't guarantee the person is still at
            the center, but it does guarantee the veracity + date of the published data. */}
        <div className="ddisclaimer">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 11v5M12 8h.01" />
          </svg>
          <span>{t.cardDisclaimer}</span>
        </div>
        <div className="dactions">
          <button className="btnp" onClick={onShare}>
            {ICON.share}
            {t.share}
          </button>
          <button className="btng" onClick={onContribute}>
            {ICON.plus}
            {t.contribCta}
          </button>
          <button className="btng" onClick={onSeeMap}>
            {ICON.pin}
            {t.seeMap}
          </button>
          <a className="btng" href={mapsDirectionsUrl(patient.lat, patient.lng)} target="_blank" rel="noopener noreferrer">
            {ICON.pin}
            {t.directions}
          </a>
          {loc?.contact_whatsapp && (
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
          {loc?.contact_phone && (
            <a className="btng" href={`tel:${loc.contact_phone}`}>
              {ICON.phone}
              {t.call}
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
