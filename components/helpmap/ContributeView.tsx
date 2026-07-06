import { useState } from "react";
import { ICON } from "./icons";
import { compressImage, uploadContributionPhoto } from "./uploadPhoto";
import type { PatientPublic, Strings } from "./data";

// Public "Aportar foto / info" form → contributions moderation queue. Owns its own form
// state. Minors never carry a photo (§2). Back/close return to the person's detail.
export function ContributeView({
  t,
  patient,
  showToast,
  onClose,
}: {
  t: Strings;
  patient: PatientPublic;
  showToast: (m: string) => void;
  onClose: () => void;
}) {
  const [photo, setPhoto] = useState<string | null>(null);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [desc, setDesc] = useState("");
  const [contact, setContact] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const onPickPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (patient.is_minor) return; // never a photo for a minor (CLAUDE.md §2)
    setPhotoBusy(true);
    try {
      setPhoto(await compressImage(file));
    } catch {
      showToast(t.photoError);
    } finally {
      setPhotoBusy(false);
    }
  };

  const submit = async () => {
    const d = desc.trim();
    const p = patient.is_minor ? null : photo; // defensive: minors never carry a photo
    if (!p && !d) {
      showToast(t.contribReq);
      return;
    }
    setBusy(true);
    try {
      let foto_url: string | null = null;
      if (p) {
        // Private bucket → returns an object PATH (not a public URL). A pending
        // contribution photo must never be publicly reachable until approved (§2).
        foto_url = await uploadContributionPhoto(p);
      }
      const res = await fetch("/api/contributions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patient_id: patient.id, foto_url, descripcion: d || null, contacto: contact.trim() || null }),
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
        <span className="ohtitle">{t.contribTitle}</span>
      </div>
      <div className="ovbody">
        {done ? (
          <div className="contact-ack">
            <div className="contact-ack-ico">{ICON.check}</div>
            <h3 className="contact-ack-title">{t.contribAckTitle}</h3>
            <p className="contact-ack-body">{t.contribAckBody}</p>
            <button className="btnp" onClick={onClose}>
              {t.contribAckClose}
            </button>
          </div>
        ) : (
          <div className="form">
            <div className="fld">
              <span className="flabel">{t.contribFor}</span>
              <div className="aname">{patient.nombres + " " + patient.apellidos}</div>
              <span className="asub">{patient.location_name}</span>
            </div>
            <p className="donate-sub">{t.contribSub}</p>
            <div className="fld">
              <span className="flabel">{t.contribDescLabel}</span>
              <textarea
                className="finput"
                rows={4}
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                placeholder={t.contribDescPh}
              />
            </div>
            {patient.is_minor ? (
              <div className="note">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z" />
                </svg>
                {t.contribMinorNote}
              </div>
            ) : (
              <div className="fld">
                <span className="flabel">{t.contribPhoto}</span>
                {photo ? (
                  <div className="upload upload-has">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={photo} alt="" className="upload-thumb" />
                    <button type="button" className="upload-remove" onClick={() => setPhoto(null)}>
                      {t.removePhoto}
                    </button>
                  </div>
                ) : (
                  <label className="upload">
                    <input type="file" accept="image/*" onChange={onPickPhoto} style={{ display: "none" }} disabled={photoBusy} />
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 16V4M8 8l4-4 4 4" />
                      <path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" />
                    </svg>
                    {photoBusy ? t.photoBusy : t.f_photoHint}
                  </label>
                )}
              </div>
            )}
            <div className="fld">
              <span className="flabel">{t.contribContact}</span>
              <input className="finput" value={contact} onChange={(e) => setContact(e.target.value)} placeholder="+58… / correo" />
            </div>
            <div className="note">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="9" />
                <path d="M12 11v5M12 8h.01" />
              </svg>
              {t.contribNote}
            </div>
            <button className="btnp" onClick={submit} disabled={busy}>
              {busy ? t.contribSending : t.contribSend}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
