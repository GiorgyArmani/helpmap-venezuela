import { useState } from "react";
import { ICON } from "./icons";
import { initials } from "./helpers";
import { IgPicker } from "./IgPicker";
import { type ShareFormat } from "./share";
import { SM, type Lang, type PatientPublic, type Strings } from "./data";

// Share overlay: the WhatsApp-style preview card + share targets for a patient record.
export function ShareView({
  t,
  lang,
  patient,
  onShareTo,
  onBack,
}: {
  t: Strings;
  lang: Lang;
  patient: PatientPublic;
  onShareTo: (target: "wa" | "tg" | "ig" | "copy", fmt?: ShareFormat) => void;
  onBack: () => void;
}) {
  // One "Instagram" button; tapping it reveals the canvas picker (story / post /
  // square) instead of crowding the grid with one button per format.
  const [igPick, setIgPick] = useState(false);

  return (
    <div className="overlay">
      <div className="ovhead">
        <button className="oicon" onClick={onBack}>
          {ICON.back}
        </button>
        <span className="ohtitle">{t.shareTitle}</span>
      </div>
      <div className="ovbody">
        <p className="sdesc">{t.shareDesc}</p>
        <div className="chat">
          <div className="bubble">
            <div className={"ogcard " + SM[patient.estatus].cls}>
              <div className="ogimg">
                {patient.foto_url && !patient.is_minor ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={patient.foto_url} alt="" loading="lazy" decoding="async" />
                ) : (
                  initials(patient)
                )}
              </div>
              <div className="ogtxt">
                <span className="ogk">{t.cardKicker + " · HELPMAP"}</span>
                <span className="ogname">{patient.nombres + " " + patient.apellidos}</span>
                <span className="ogmeta">
                  <span className="dot"></span>
                  {SM[patient.estatus][lang] + " · " + patient.location_name}
                </span>
                <span className="ogurl">{"helpmapvzla.net/p/" + patient.id.slice(0, 8) + "…"}</span>
              </div>
            </div>
            <span className="blink">{"helpmapvzla.net/p/" + patient.id.slice(0, 8) + "…"}</span>
            <span className="btime">12:48 ✓✓</span>
          </div>
        </div>
        <div className="targets">
          <button className="tgt" onClick={() => onShareTo("wa")}>
            <span className="ti ti-wa">WA</span>WhatsApp
          </button>
          <button className="tgt" onClick={() => onShareTo("tg")}>
            <span className="ti ti-tg">TG</span>Telegram
          </button>
          <button className="tgt" onClick={() => setIgPick((v) => !v)} aria-expanded={igPick}>
            <span className="ti ti-ig">IG</span>Instagram
          </button>
          <button className="tgt" onClick={() => onShareTo("copy")}>
            <span className="ti ti-cp">↗</span>
            {t.copyLink}
          </button>
        </div>
        {igPick && <IgPicker t={t} onPick={(fmt) => onShareTo("ig", fmt)} />}
        <p className="share-disc">{ICON.check}{t.shareDisclosure}</p>
      </div>
    </div>
  );
}
