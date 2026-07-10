import { useEffect, useMemo, useRef, useState } from "react";
import { ICON } from "./icons";
import { TYPE_META, norm, type Lang, type Location, type LocationType, type Strings } from "./data";

// Custom center picker — replaces the native <select> for "Todos los centros".
// The list is long (hospitals + refugios + comedores…), so this styled dropdown adds a
// search box + type-grouped options, consistent with the app on desktop AND mobile.
export function CenterPicker({
  t,
  lang,
  groups,
  valueId,
  locById,
  onPick,
}: {
  t: Strings;
  lang: Lang;
  groups: { type: LocationType; items: Location[] }[];
  valueId: string | null;
  locById: Record<string, Location>;
  onPick: (id: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);

  const selName = (valueId && locById[valueId]?.canonical_name) || t.allCenters;

  const filtered = useMemo(() => {
    const nq = norm(q.trim());
    if (!nq) return groups;
    return groups
      .map((g) => ({ ...g, items: g.items.filter((l) => norm(l.canonical_name).includes(nq)) }))
      .filter((g) => g.items.length > 0);
  }, [groups, q]);

  // Close on outside click / Escape.
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const pick = (id: string | null) => {
    onPick(id);
    setOpen(false);
    setQ("");
  };

  return (
    <div className={"cpick" + (open ? " cpick-open" : "")} ref={rootRef}>
      <button type="button" className="cpick-btn" onClick={() => setOpen((o) => !o)}>
        {ICON.pin}
        <span className="cpick-val">{selName}</span>
        <svg className="cpick-chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
      {open && (
        <div className="cpick-panel">
          <div className="cpick-search">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3-3" />
            </svg>
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t.centerSearch}
            />
            {q && (
              <button type="button" className="cpick-x" onClick={() => setQ("")} aria-label="✕">
                ✕
              </button>
            )}
          </div>
          <div className="cpick-list">
            <button
              type="button"
              className={"cpick-opt cpick-all" + (!valueId ? " cpick-sel" : "")}
              onClick={() => pick(null)}
            >
              {t.allCenters}
            </button>
            {filtered.map((g) => (
              <div key={g.type} className="cpick-group">
                <div className="cpick-ghead">
                  <span className="cpick-gdot" style={{ background: TYPE_META[g.type].color }}></span>
                  {TYPE_META[g.type][lang]}
                </div>
                {g.items.map((l) => (
                  <button
                    key={l.location_id}
                    type="button"
                    className={"cpick-opt" + (valueId === l.location_id ? " cpick-sel" : "")}
                    onClick={() => pick(l.location_id)}
                  >
                    {l.canonical_name}
                  </button>
                ))}
              </div>
            ))}
            {filtered.length === 0 && <div className="cpick-empty">{t.noResults}</div>}
          </div>
        </div>
      )}
    </div>
  );
}
