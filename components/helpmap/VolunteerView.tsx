import { useRef, useState } from "react";
import { ICON } from "./icons";
import { VOLUNTEER, VOLUNTEER_ROLES, VOL_PROFILES } from "./constants";
import type { Lang, Strings } from "./data";

// "Súmate al voluntariado" panel: recruiting info + the self-signup form (→ pending queue,
// admin approves). Owns its own form/toggle state. Email CTA delegates to the caller.
export function VolunteerView({
  t,
  lang,
  showToast,
  onEmailContact,
  onClose,
}: {
  t: Strings;
  lang: Lang;
  showToast: (m: string) => void;
  onEmailContact: () => void;
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [profile, setProfile] = useState("");
  const [sources, setSources] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [open, setOpen] = useState(false); // toggles the form open in the panel
  const [hp, setHp] = useState(""); // anti-spam honeypot
  const openedAt = useRef(0);

  const submit = async () => {
    const mail = email.trim();
    if (!name.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail)) {
      showToast(t.volSignupReq);
      return;
    }
    if (pass.length < 6) {
      showToast(t.volPassShort);
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/volunteers/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: name.trim(),
          email: mail,
          password: pass,
          perfil: profile || null,
          fuentes: sources.trim() || null,
          telefono: phone.trim() || null,
          hp,
          elapsed: openedAt.current ? Date.now() - openedAt.current : undefined,
        }),
      });
      const j = await res.json().catch(() => ({}));
      if (res.ok) {
        setDone(true);
        setName("");
        setEmail("");
        setPass("");
        setProfile("");
        setSources("");
        setPhone("");
      } else if (j.error === "email_taken") {
        showToast(t.volEmailTaken);
      } else {
        showToast(t.saveError);
      }
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
        <span className="ohtitle">{t.volunteerTitle}</span>
      </div>
      <div className="ovbody">
        <p className="donate-sub">{t.volunteerSub}</p>
        <div className="vol-roles">
          {VOLUNTEER_ROLES.map((r) => (
            <div className="vol-role" key={r.es}>
              <span className="vol-check">{ICON.check}</span>
              <span>{r[lang]}</span>
            </div>
          ))}
        </div>

        {done ? (
          <div className="contact-ack">
            <div className="contact-ack-ico">{ICON.check}</div>
            <h3 className="contact-ack-title">{t.volSignupDoneTitle}</h3>
            <p className="contact-ack-body">{t.volSignupDoneBody}</p>
            <button className="btng" onClick={() => { setDone(false); setOpen(false); }}>
              {t.contribAckClose}
            </button>
          </div>
        ) : open ? (
          <div className="form">
            <p className="donate-sub">{t.volSignupSub}</p>
            {/* Honeypot: hidden from humans; bots that fill every field get dropped. */}
            <input
              type="text"
              name="website"
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
              value={hp}
              onChange={(e) => setHp(e.target.value)}
              style={{ position: "absolute", left: "-9999px", width: 1, height: 1, opacity: 0 }}
            />
            <div className="fld">
              <span className="flabel">{t.f_volName}</span>
              <input className="finput" value={name} onChange={(e) => setName(e.target.value)} placeholder={t.f_volName} />
            </div>
            <div className="fld">
              <span className="flabel">{t.email}</span>
              <input className="finput" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tu@correo.com" />
            </div>
            <div className="fld">
              <span className="flabel">{t.volSignupPass}</span>
              <input className="finput" type="password" autoComplete="new-password" value={pass} onChange={(e) => setPass(e.target.value)} placeholder="••••••" />
              <span className="fhint">{t.volSignupPassHint}</span>
            </div>
            <div className="fld">
              <span className="flabel">{t.f_volProfile}</span>
              <select className="fselect" value={profile} onChange={(e) => setProfile(e.target.value)}>
                <option value="">{t.f_volProfilePh}</option>
                {VOL_PROFILES.map((pf) => (
                  <option key={pf.value} value={pf.value}>
                    {pf[lang]}
                  </option>
                ))}
              </select>
            </div>
            <div className="fld">
              <span className="flabel">{t.f_volSources}</span>
              <textarea className="finput" rows={3} value={sources} onChange={(e) => setSources(e.target.value)} placeholder={t.f_volSourcesPh} />
            </div>
            <div className="fld">
              <span className="flabel">{t.f_volPhone}</span>
              <input className="finput" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+58…" />
            </div>
            <div className="note">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="9" />
                <path d="M12 11v5M12 8h.01" />
              </svg>
              {t.volSignupNote}
            </div>
            <div className="ebtns">
              <button className="btng" onClick={() => setOpen(false)}>
                {t.cancel}
              </button>
              <button className="btnp" onClick={submit} disabled={busy}>
                {busy ? t.volSignupSending : t.volSignupSend}
              </button>
            </div>
          </div>
        ) : (
          <>
            <p className="vol-ask">{t.volunteerAsk}</p>
            <button className="btnp" onClick={() => { setHp(""); openedAt.current = Date.now(); setOpen(true); }} style={{ width: "100%" }}>
              {ICON.check}
              {t.volSignupCta}
            </button>
            <div className="dactions" style={{ marginTop: 10 }}>
              {VOLUNTEER.whatsapp && (
                <a
                  className="btng"
                  href={`https://wa.me/${VOLUNTEER.whatsapp.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(t.volunteerWaMsg)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {ICON.wa}
                  {t.volunteerWa}
                </a>
              )}
              <button className="btng" onClick={onEmailContact}>
                {ICON.mail}
                {t.volunteerEmail}
              </button>
            </div>
          </>
        )}
        <p className="donate-note">{t.volunteerNote}</p>
      </div>
    </div>
  );
}
