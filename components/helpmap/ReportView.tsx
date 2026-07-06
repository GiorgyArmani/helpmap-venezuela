import { useState } from "react";
import { ICON } from "./icons";
import { compressImage } from "./uploadPhoto";
import { enqueue, flushQueue, queueCount, type IntakeSubmission } from "./intakeQueue";
import { ESTATUS_ORDER, SM, type Estatus, type Lang, type Location, type Sexo, type Strings } from "./data";

// Public "Aportar datos" intake form. Never writes the DB — it queues offline then flushes
// to n8n (CLAUDE.md §7). Owns its own form state; the offline queue is module-level.
export function ReportView({
  t,
  lang,
  locations,
  pending,
  onPendingChange,
  showToast,
  onClose,
}: {
  t: Strings;
  lang: Lang;
  locations: Location[];
  pending: number;
  onPendingChange: (n: number) => void;
  showToast: (m: string) => void;
  onClose: () => void;
}) {
  const [ape, setApe] = useState("");
  const [nom, setNom] = useState("");
  const [ci, setCi] = useState("");
  const [edad, setEdad] = useState("");
  const [minor, setMinor] = useState(false);
  const [loc, setLoc] = useState("");
  const [estatus, setEstatus] = useState<Estatus>("INGRESADO");
  const [sexo, setSexo] = useState<Sexo | "">("");
  const [procedencia, setProcedencia] = useState("");
  const [dataDate, setDataDate] = useState("");
  const [contact, setContact] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);
  const [photoBusy, setPhotoBusy] = useState(false);

  const [todayISO] = useState(() => new Date().toISOString().slice(0, 10)); // date cap; not reactive
  const statusOpts = ESTATUS_ORDER.map((k) => ({ v: k, label: SM[k][lang] }));

  const onPickPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || minor) return; // minors never carry a photo (§2/§5)
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
    if ((!nom.trim() && !ape.trim()) || !loc) {
      showToast(t.reqNameLoc);
      return;
    }
    const edadNum = edad ? parseInt(edad) : null;
    const isMinor = minor || (edadNum != null && edadNum < 18);
    const center = locations.find((l) => l.location_id === loc);
    const sub: IntakeSubmission = {
      id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : "i_" + Date.now(),
      createdAt: new Date().toISOString(),
      apellidos: ape.trim(),
      nombres: nom.trim(),
      ci: isMinor ? "MENOR" : ci.trim() || "—",
      is_minor: isMinor,
      edad: edadNum,
      sexo: sexo || null,
      location_id: loc,
      location_name: center?.canonical_name ?? "",
      estatus,
      procedencia: procedencia.trim() || null,
      data_date: dataDate || null,
      contacto: contact.trim() || null,
      lang,
      source: "web",
      // Adults only — never attach a photo for a minor (§2/§5).
      foto_b64: isMinor ? null : photo,
      foto_url: null,
    };
    enqueue(sub);
    onClose();
    const online = typeof navigator === "undefined" ? true : navigator.onLine;
    if (online) {
      const r = await flushQueue();
      onPendingChange(queueCount());
      showToast(r.sent > 0 ? t.sent : t.queuedOffline);
    } else {
      onPendingChange(queueCount());
      showToast(t.queuedOffline);
    }
  };

  return (
    <div className="overlay">
      <div className="ovhead">
        <button className="oicon" onClick={onClose}>
          {ICON.back}
        </button>
        <span className="ohtitle">{t.reportTitle}</span>
      </div>
      <div className="ovbody">
        <div className="form">
          <div className="infoneed">
            <span className="infoneed-t">{t.infoNeededTitle}</span>
            <span className="infoneed-d">{t.infoNeeded}</span>
          </div>
          {pending > 0 && (
            <div className="stale">
              {ICON.wifiOff}
              {pending} {t.pendingSync}
            </div>
          )}
          <div className="fld">
            <span className="flabel">{t.f_ape}</span>
            <input className="finput" placeholder={t.f_ape} value={ape} onChange={(e) => setApe(e.target.value)} />
          </div>
          <div className="fld">
            <span className="flabel">{t.f_nom}</span>
            <input className="finput" placeholder={t.f_nom} value={nom} onChange={(e) => setNom(e.target.value)} />
          </div>
          <div className="fld">
            <span className="flabel">{t.f_minor}</span>
            <div className="seg">
              <button className={"segb " + (!minor ? "segb-on" : "")} onClick={() => setMinor(false)}>
                {t.no}
              </button>
              <button
                className={"segb " + (minor ? "segb-on" : "")}
                onClick={() => {
                  setMinor(true);
                  setPhoto(null); // minors never carry a photo
                }}
              >
                {t.yes}
              </button>
            </div>
          </div>
          <div className="frow">
            <div className="fld">
              <span className="flabel">{t.f_ci}</span>
              <input
                className="finput mono"
                placeholder="V-00.000.000"
                value={minor ? "MENOR" : ci}
                onChange={(e) => setCi(e.target.value)}
                disabled={minor}
              />
            </div>
            <div className="fld">
              <span className="flabel">{t.f_edad}</span>
              <input className="finput" placeholder="00" inputMode="numeric" value={edad} onChange={(e) => setEdad(e.target.value)} />
            </div>
          </div>
          <div className="fld">
            <span className="flabel">{t.sexo}</span>
            <div className="seg">
              <button className={"segb " + (sexo === "M" ? "segb-on" : "")} onClick={() => setSexo(sexo === "M" ? "" : "M")}>
                {t.male}
              </button>
              <button className={"segb " + (sexo === "F" ? "segb-on" : "")} onClick={() => setSexo(sexo === "F" ? "" : "F")}>
                {t.female}
              </button>
            </div>
          </div>
          <div className="fld">
            <span className="flabel">{t.f_ubic}</span>
            <select className="fselect" value={loc} onChange={(e) => setLoc(e.target.value)}>
              <option value="">{t.selectHosp}</option>
              {locations.map((l) => (
                <option key={l.location_id} value={l.location_id}>
                  {l.canonical_name}
                </option>
              ))}
            </select>
          </div>
          <div className="fld">
            <span className="flabel">{t.f_status}</span>
            <select className="fselect" value={estatus} onChange={(e) => setEstatus(e.target.value as Estatus)}>
              {statusOpts.map((s) => (
                <option key={s.v} value={s.v}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
          <div className="fld">
            <span className="flabel">{t.f_dataDate}</span>
            <input className="finput" type="date" max={todayISO} value={dataDate} onChange={(e) => setDataDate(e.target.value)} />
            <span className="fhint">{t.f_dataDateHint}</span>
          </div>
          <div className="fld">
            <span className="flabel">{t.f_procedencia}</span>
            <input className="finput" placeholder={t.f_procedenciaPh} value={procedencia} onChange={(e) => setProcedencia(e.target.value)} />
            <span className="fhint">{t.f_procedenciaHint}</span>
          </div>
          <div className="fld">
            <span className="flabel">{t.f_contact}</span>
            <input className="finput" placeholder="+58…" value={contact} onChange={(e) => setContact(e.target.value)} />
          </div>
          {!minor && (
            <div className="fld">
              <span className="flabel">{t.f_photo}</span>
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
          <div className="note">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 11v5M12 8h.01" />
            </svg>
            {t.note}
          </div>
          <div className="note">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z" />
            </svg>
            {t.noteMinors}
          </div>
          <button className="btnp" onClick={submit}>
            {t.submit}
          </button>
        </div>
      </div>
    </div>
  );
}
