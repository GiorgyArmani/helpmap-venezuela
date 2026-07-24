import { IG_FORMATS, type ShareFormat } from "./share";
import type { Strings } from "./data";

// Instagram canvas picker. Instagram has no URL share intent (CLAUDE.md §5), so we
// generate the image ourselves — and the same banner is used for a story (9:16) and
// for a feed post (4:5 / 1:1), where a story image would be cropped. One "Instagram"
// button opens this; the little rectangle previews the ratio so the choice is obvious
// without reading. Shared by the patient and help-point share overlays.
export function IgPicker({ t, onPick }: { t: Strings; onPick: (fmt: ShareFormat) => void }) {
  return (
    <div className="igpick">
      <span className="igpick-t">{t.igPickTitle}</span>
      <div className="igpick-row">
        {IG_FORMATS.map((f) => (
          <button key={f.fmt} className="igpick-b" onClick={() => onPick(f.fmt)}>
            <span className="igpick-r" style={{ width: f.w, height: f.h }} />
            {t[f.key]}
          </button>
        ))}
      </div>
    </div>
  );
}
