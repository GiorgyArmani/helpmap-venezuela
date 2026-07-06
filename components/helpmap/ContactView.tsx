import { useRef, useState } from "react";
import { ICON } from "./icons";
import { compressImage } from "./uploadPhoto";
import type { Strings } from "./data";

// "Escríbenos" contact form (volunteer/donation/contact). Owns its own form state; the
// caller passes which `kind` opened it (sent to /api/contact for the subject tag).
export function ContactView({
  t,
  kind,
  showToast,
  onClose,
}: {
  t: Strings;
  kind: "volunteer" | "donation" | "contact";
  showToast: (m: string) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");
  const [imgs, setImgs] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [hp, setHp] = useState(""); // honeypot
  const openedAt = useRef(Date.now()); // anti-spam: how long the form was open

  const onPickPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || imgs.length >= 4) return;
    try {
      const b64 = await compressImage(file);
      setImgs((a) => (a.length >= 4 ? a : [...a, b64]));
    } catch {
      showToast(t.photoError);
    }
  };

  const send = async () => {
    if (!msg.trim()) {
      showToast(t.contactError);
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind,
          name: name.trim(),
          email: email.trim(),
          message: msg.trim(),
          images: imgs,
          // Anti-spam signals (see /api/contact): honeypot must stay empty; elapsed is
          // how long the form was open — a real person takes seconds to type.
          hp,
          elapsed: Date.now() - openedAt.current,
        }),
      });
      if (res.ok) {
        setName("");
        setEmail("");
        setMsg("");
        setImgs([]);
        setDone(true);
      } else {
        showToast(t.contactError);
      }
    } catch {
      showToast(t.contactError);
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
        <span className="ohtitle">{t.contactTitle}</span>
      </div>
      <div className="ovbody">
        {done ? (
          <div className="contact-ack">
            <div className="contact-ack-ico">{ICON.check}</div>
            <h3 className="contact-ack-title">{t.contactAckTitle}</h3>
            <p className="contact-ack-body">{t.contactAckBody}</p>
            <button className="btnp" onClick={onClose}>
              {t.contactAckClose}
            </button>
          </div>
        ) : (
          <div className="form">
            <p className="donate-sub">{t.contactSub}</p>
            {/* Honeypot: hidden from humans (off-screen, not tabbable, aria-hidden). Bots
                that auto-fill every field will populate it → server drops it. */}
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
              <span className="flabel">{t.contactName}</span>
              <input className="finput" value={name} onChange={(e) => setName(e.target.value)} placeholder={t.contactName} />
            </div>
            <div className="fld">
              <span className="flabel">{t.contactEmailLabel}</span>
              <input className="finput" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tucorreo@ejemplo.com" />
            </div>
            <div className="fld">
              <span className="flabel">{t.contactMsg}</span>
              <textarea className="finput" rows={5} value={msg} onChange={(e) => setMsg(e.target.value)} placeholder={t.contactMsg} />
            </div>
            <div className="fld">
              <span className="flabel">{t.contactPhotos}</span>
              {imgs.length > 0 && (
                <div className="cimg-grid">
                  {imgs.map((src, i) => (
                    <div className="cimg" key={i}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={src} alt="" />
                      <button type="button" className="cimg-x" onClick={() => setImgs((a) => a.filter((_, n) => n !== i))}>
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {imgs.length < 4 && (
                <label className="upload">
                  <input type="file" accept="image/*" onChange={onPickPhoto} style={{ display: "none" }} />
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 16V4M8 8l4-4 4 4" />
                    <path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" />
                  </svg>
                  {t.contactAddPhoto}
                </label>
              )}
            </div>
            <button className="btnp" onClick={send} disabled={busy}>
              {ICON.mail}
              {busy ? t.contactSending : t.contactSend}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
