import { useState } from "react";
import { ICON } from "./icons";
import type { Strings } from "./data";

// Public "Reportar desaparecido" form (the "+" FAB). Owns its own form state — it's all
// local to this overlay. Posts a lead to /api/reports; never appears on the public map.
export function ReportMissingView({
  t,
  showToast,
  onClose,
}: {
  t: Strings;
  showToast: (m: string) => void;
  onClose: () => void;
}) {
  const [ape, setApe] = useState("");
  const [nom, setNom] = useState("");
  const [ci, setCi] = useState("");
  const [edad, setEdad] = useState("");
  const [zona, setZona] = useState("");
  const [desc, setDesc] = useState("");
  const [reporter, setReporter] = useState("");
  const [contact, setContact] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async () => {
    if (!ape.trim() && !nom.trim()) {
      showToast(t.rmReqName);
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apellidos: ape.trim(),
          nombres: nom.trim(),
          ci: ci.trim() || null,
          edad: edad.trim() || null,
          zona: zona.trim() || null,
          descripcion: desc.trim() || null,
          reporter_name: reporter.trim() || null,
          reporter_contact: contact.trim() || null,
        }),
      });
      if (res.ok) setDone(true);
      else showToast(t.saveError);
    } catch {
      showToast(t.saveError);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="overlay">
      <div className="ovhead">
        <button className="oicon" onClick={onClose}>
          {ICON.back}
        </button>
        <span className="ohtitle">{t.rmTitle}</span>
      </div>
      <div className="ovbody">
        {done ? (
          <div className="contact-ack">
            <div className="contact-ack-ico">{ICON.check}</div>
            <h3 className="contact-ack-title">{t.rmDoneTitle}</h3>
            <p className="contact-ack-body">{t.rmDoneBody}</p>
            <button className="btnp" onClick={onClose}>
              {t.rmDoneClose}
            </button>
          </div>
        ) : (
          <div className="form">
            <div className="infoneed">
              <span className="infoneed-d">{t.rmIntro}</span>
            </div>
            <div className="fld-sec">{t.rmWho}</div>
            <div className="fld">
              <span className="flabel">{t.f_ape}</span>
              <input className="finput" placeholder={t.f_ape} value={ape} onChange={(e) => setApe(e.target.value)} />
            </div>
            <div className="fld">
              <span className="flabel">{t.f_nom}</span>
              <input className="finput" placeholder={t.f_nom} value={nom} onChange={(e) => setNom(e.target.value)} />
            </div>
            <div className="frow">
              <div className="fld">
                <span className="flabel">{t.f_ci}</span>
                <input className="finput mono" placeholder="V-00.000.000" value={ci} onChange={(e) => setCi(e.target.value)} />
              </div>
              <div className="fld">
                <span className="flabel">{t.f_edad}</span>
                <input className="finput" placeholder="00" inputMode="numeric" value={edad} onChange={(e) => setEdad(e.target.value)} />
              </div>
            </div>
            <div className="fld">
              <span className="flabel">{t.rmZona}</span>
              <input className="finput" placeholder={t.rmZonaPh} value={zona} onChange={(e) => setZona(e.target.value)} />
            </div>
            <div className="fld">
              <span className="flabel">{t.rmDesc}</span>
              <textarea className="finput" rows={3} placeholder={t.rmDescPh} value={desc} onChange={(e) => setDesc(e.target.value)} />
            </div>
            <div className="fld-sec">{t.rmReporter}</div>
            <div className="fld">
              <span className="flabel">{t.rmReporter}</span>
              <input className="finput" placeholder={t.rmReporter} value={reporter} onChange={(e) => setReporter(e.target.value)} />
            </div>
            <div className="fld">
              <span className="flabel">{t.rmContact}</span>
              <input className="finput" placeholder="+58… / correo" value={contact} onChange={(e) => setContact(e.target.value)} />
              <span className="fhint">{t.rmContactHint}</span>
            </div>
            <div className="note">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="9" />
                <path d="M12 11v5M12 8h.01" />
              </svg>
              {t.rmNote}
            </div>
            <button className="btnp" onClick={submit} disabled={busy}>
              {busy ? t.contribSending : t.rmSubmit}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
