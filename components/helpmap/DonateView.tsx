import { useState } from "react";
import { ICON } from "./icons";
import { VOLUNTEER } from "./constants";
import { copyText } from "./share";
import { type Donation, type Strings } from "./data";

// "Donar" overlay: external donation partners (DB-driven) + the "add my org" CTA. Owns
// its own accordion state (openDon) since it's local UI only used here.
export function DonateView({
  t,
  donations,
  showToast,
  onJoin,
  onClose,
}: {
  t: Strings;
  donations: Donation[];
  showToast: (m: string) => void;
  onJoin: () => void;
  onClose: () => void;
}) {
  const [openDon, setOpenDon] = useState<string | null>(null);
  return (
    <div className="overlay">
      <div className="ovhead">
        <button className="oicon" onClick={onClose}>
          {ICON.back}
        </button>
        <span className="ohtitle">{t.donateTitle}</span>
      </div>
      <div className="ovbody">
        <p className="donate-sub">{t.donateSub}</p>
        <div className="donate-list">
          {donations.map((d) => {
            const open = openDon === d.id;
            const hasBody = !!(d.donate_info || d.social_url || d.donate_url);
            return (
              <div key={d.id} className={"donate-card" + (open ? " open" : "")}>
                <button
                  type="button"
                  className="donate-toggle"
                  onClick={() => hasBody && setOpenDon(open ? null : d.id)}
                  aria-expanded={open}
                  disabled={!hasBody}
                >
                  <div className="donate-info">
                    <span className="donate-name">{d.name}</span>
                    {d.description && <span className="donate-desc">{d.description}</span>}
                  </div>
                  {hasBody && <span className="donate-chev">{ICON.chevD}</span>}
                </button>
                {open && hasBody && (
                  <div className="donate-body">
                    {d.donate_info && (
                      <div className="donate-data">
                        <span className="donate-data-label">{t.donData}</span>
                        <span className="donate-data-txt">{d.donate_info}</span>
                        <button
                          type="button"
                          className="donate-copy"
                          onClick={async () => {
                            if (await copyText(d.donate_info!)) showToast(t.copied);
                          }}
                        >
                          {ICON.copy}
                          {t.donCopy}
                        </button>
                      </div>
                    )}
                    {(d.social_url || d.donate_url) && (
                      <div className="donate-acts">
                        {d.social_url && (
                          <a
                            className="donate-ig"
                            href={d.social_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label={t.donFollow}
                          >
                            {ICON.ig}
                            {t.donFollow}
                          </a>
                        )}
                        {d.donate_url && (
                          <a className="donate-go" href={d.donate_url} target="_blank" rel="noopener noreferrer">
                            {t.donateCta}
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
          {donations.length === 0 && <p className="donate-desc">{t.donNone}</p>}
        </div>
        <div className="donate-join">
          <span className="donate-join-t">{t.donateJoin}</span>
          <span className="donate-desc">{t.donateJoinSub}</span>
          <div className="dactions" style={{ marginTop: 11 }}>
            {VOLUNTEER.whatsapp && (
              <a
                className="btng"
                href={`https://wa.me/${VOLUNTEER.whatsapp.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(t.donateJoin)}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                {ICON.wa}
                {t.whatsapp}
              </a>
            )}
            <button className="btnp" onClick={onJoin}>
              {ICON.mail}
              {t.donateJoinCta}
            </button>
          </div>
        </div>
        <p className="donate-note">{t.donateNote}</p>
      </div>
    </div>
  );
}
