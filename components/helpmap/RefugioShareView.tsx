import { ICON } from "./icons";
import { STATE_LABEL, TYPE_META, type Lang, type Location, type Refugio, type Strings } from "./data";

// Share overlay for a help point (refugio / centro de acopio) — the same preview-card +
// social-targets system as the patient ShareView, so a need can be shared "a sociales
// bien" (link preview card + Instagram story image), not only a raw WhatsApp text.
export function RefugioShareView({
  t,
  lang,
  loc,
  refugio,
  onShareTo,
  onBack,
}: {
  t: Strings;
  lang: Lang;
  loc: Location;
  refugio: Refugio;
  onShareTo: (target: "wa" | "tg" | "ig" | "copy") => void;
  onBack: () => void;
}) {
  const typeLabel = TYPE_META[loc.type][lang];
  const place = [loc.municipality, STATE_LABEL[loc.state]].filter(Boolean).join(" · ");
  const sub = refugio.necesita?.trim() || place;
  const shortId = loc.location_id.slice(0, 10);

  return (
    <div className="overlay">
      <div className="ovhead">
        <button className="oicon" onClick={onBack}>
          {ICON.back}
        </button>
        <span className="ohtitle">{t.refShareCta}</span>
      </div>
      <div className="ovbody">
        <p className="sdesc">{t.shareDesc}</p>
        <div className="chat">
          <div className="bubble">
            <div className="ogcard">
              <div className="ogimg" aria-hidden>
                🆘
              </div>
              <div className="ogtxt">
                <span className="ogk">{typeLabel + " · HELPMAP"}</span>
                <span className="ogname">{loc.canonical_name}</span>
                <span className="ogmeta">
                  <span className="dot"></span>
                  {sub}
                </span>
                <span className="ogurl">{"helpmapvzla.net/c/" + shortId + "…"}</span>
              </div>
            </div>
            <span className="blink">{"helpmapvzla.net/c/" + shortId + "…"}</span>
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
          <button className="tgt" onClick={() => onShareTo("ig")}>
            <span className="ti ti-ig">IG</span>Instagram
          </button>
          <button className="tgt" onClick={() => onShareTo("copy")}>
            <span className="ti ti-cp">↗</span>
            {t.copyLink}
          </button>
        </div>
        <a className="share-disc" href="https://acopiove.org" target="_blank" rel="noopener noreferrer">
          {ICON.check}
          {t.refAttrib}
        </a>
      </div>
    </div>
  );
}
