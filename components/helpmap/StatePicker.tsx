import { useEffect, useRef, useState } from "react";
import { STATE_LABEL, type Strings, type VzlaState } from "./data";

// Custom state picker — mirrors CenterPicker's styling (.cpick) for a consistent look,
// but a short flat list (≤7 states) so no search box. Data-driven from statesAvailable.
export function StatePicker({
  t,
  states,
  value,
  onPick,
}: {
  t: Strings;
  states: VzlaState[];
  value: "all" | VzlaState;
  onPick: (v: "all" | VzlaState) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const label = value === "all" ? t.allStates : STATE_LABEL[value];

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

  const pick = (v: "all" | VzlaState) => {
    onPick(v);
    setOpen(false);
  };

  return (
    <div className={"cpick" + (open ? " cpick-open" : "")} ref={rootRef}>
      <button type="button" className="cpick-btn" onClick={() => setOpen((o) => !o)}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 21h18M5 21V8l5-4 5 4M19 21V11l-4-3M9 21v-4h2v4" />
        </svg>
        <span className="cpick-val">{label}</span>
        <svg className="cpick-chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
      {open && (
        <div className="cpick-panel">
          <div className="cpick-list">
            <button
              type="button"
              className={"cpick-opt cpick-all" + (value === "all" ? " cpick-sel" : "")}
              onClick={() => pick("all")}
            >
              {t.allStates}
            </button>
            {states.map((s) => (
              <button
                key={s}
                type="button"
                className={"cpick-opt" + (value === s ? " cpick-sel" : "")}
                onClick={() => pick(s)}
              >
                {STATE_LABEL[s]}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
