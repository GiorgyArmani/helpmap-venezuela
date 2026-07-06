import { initials } from "./helpers";
import type { PersonLike } from "./types";

// Photo/initials avatar shared by patients and rescatados.
export function Avatar({ p, cls }: { p: PersonLike; cls: string }) {
  // Never render a photo for a minor, even if a foto_url somehow arrives (the data is
  // already stripped by protectMinor; this is the last line of defense).
  if (p.foto_url && !p.is_minor) {
    return (
      <div className={cls}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={p.foto_url} alt="" loading="lazy" decoding="async" />
      </div>
    );
  }
  return <div className={cls}>{initials(p)}</div>;
}
