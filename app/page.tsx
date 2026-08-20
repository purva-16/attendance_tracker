"use client";

import { useEffect, useState } from "react";

type LogEntry = {
  id: string;
  date: string; // ISO date
  status: "present" | "absent";
};

type Component = {
  id: string;
  type: string; // Theory / Tutorial / Practicum / custom
  attended: number;
  total: number;
  log: LogEntry[];
};

type Subject = {
  id: string;
  name: string;
  components: Component[];
};

const STORAGE_KEY = "attendance-ledger:v3";
const THRESHOLD_KEY = "attendance-ledger:threshold";
const LECTURE_TYPES = ["Theory", "Tutorial", "Practicum"];

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function fmtDate(iso: string) {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function comp(type: string, attended: number, total: number): Component {
  return { id: uid(), type, attended, total, log: [] };
}

// Seeded from her Attendance Report, 06.07.2026 – 14.08.2026.
// Only used the very first time the page loads (nothing saved yet).
function seedSubjects(): Subject[] {
  return [
    {
      id: uid(),
      name: "Advance Psychology",
      components: [comp("Theory", 8, 8), comp("Tutorial", 5, 5)],
    },
    {
      id: uid(),
      name: "Psychological Assessment (Practicum)",
      components: [comp("Practicum", 40, 40)],
    },
    {
      id: uid(),
      name: "Neuropsychology",
      components: [comp("Theory", 10, 10), comp("Tutorial", 5, 5)],
    },
    {
      id: uid(),
      name: "Health Psychology",
      components: [comp("Theory", 10, 10), comp("Tutorial", 5, 5)],
    },
    {
      id: uid(),
      name: "Psychological Testing & Research",
      components: [comp("Theory", 6, 6), comp("Tutorial", 3, 4)],
    },
    {
      id: uid(),
      name: "Applied Social Psychology",
      components: [comp("Theory", 10, 10), comp("Tutorial", 4, 5)],
    },
    {
      id: uid(),
      name: "Sports Psychology",
      components: [comp("Theory", 6, 6), comp("Tutorial", 4, 5)],
    },
    {
      id: uid(),
      name: "Psychological First Aid",
      components: [comp("Theory", 12, 12), comp("Tutorial", 4, 4)],
    },
  ];
}

function sumSubject(subj: Subject) {
  return subj.components.reduce(
    (acc, c) => {
      acc.attended += c.attended;
      acc.total += c.total;
      return acc;
    },
    { attended: 0, total: 0 }
  );
}

function computeMargins(attended: number, total: number, threshold: number) {
  if (total === 0) return { pct: null, bunkable: 0, needed: 0, safe: true };
  const pct = (attended / total) * 100;
  const bunkable = Math.max(0, Math.floor(attended / threshold - total));
  const needed = Math.max(
    0,
    Math.ceil((threshold * total - attended) / (1 - threshold))
  );
  return { pct, bunkable, needed, safe: pct >= threshold * 100 };
}

export default function Page() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [threshold, setThreshold] = useState(80);
  const [newSubject, setNewSubject] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [cloudEnabled, setCloudEnabled] = useState<boolean | null>(null);
  const [markDate, setMarkDate] = useState<Record<string, string>>({});

  // Load: try the cloud (Vercel KV) first, fall back to this browser's
  // localStorage if no cloud storage is set up yet.
  useEffect(() => {
    let cancelled = false;

    function loadFromLocalStorage() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) setSubjects(JSON.parse(raw));
        else setSubjects(seedSubjects());
        const t = localStorage.getItem(THRESHOLD_KEY);
        if (t) setThreshold(Number(t));
      } catch (e) {
        console.error("Could not read saved ledger", e);
        setSubjects(seedSubjects());
      }
    }

    async function init() {
      try {
        const res = await fetch("/api/data");
        const json = await res.json();
        if (cancelled) return;

        if (json.configured) {
          setCloudEnabled(true);
          if (json.data && json.data.subjects) {
            setSubjects(json.data.subjects);
            setThreshold(json.data.threshold ?? 80);
          } else {
            const seeded = seedSubjects();
            setSubjects(seeded);
            fetch("/api/data", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ subjects: seeded, threshold: 80 }),
            }).catch(() => {});
          }
        } else {
          setCloudEnabled(false);
          loadFromLocalStorage();
        }
      } catch (e) {
        console.error("Cloud sync unavailable, using local storage", e);
        setCloudEnabled(false);
        loadFromLocalStorage();
      } finally {
        if (!cancelled) setLoaded(true);
      }
    }

    init();
    return () => {
      cancelled = true;
    };
  }, []);

  // Save: always keep a local copy, and push to the cloud too if it's set up.
  useEffect(() => {
    if (!loaded) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(subjects));
    localStorage.setItem(THRESHOLD_KEY, String(threshold));
    if (cloudEnabled) {
      fetch("/api/data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subjects, threshold }),
      }).catch((e) => console.error("Cloud save failed", e));
    }
  }, [subjects, threshold, loaded, cloudEnabled]);

  function dateFor(compId: string) {
    return markDate[compId] || todayISO();
  }

  function addSubject() {
    const name = newSubject.trim();
    if (!name) return;
    setSubjects((s) => [
      ...s,
      { id: uid(), name, components: [comp("Theory", 0, 0)] },
    ]);
    setNewSubject("");
  }

  function addComponent(subjId: string, type: string) {
    setSubjects((s) =>
      s.map((subj) =>
        subj.id === subjId
          ? { ...subj, components: [...subj.components, comp(type, 0, 0)] }
          : subj
      )
    );
  }

  function removeComponent(subjId: string, compId: string) {
    setSubjects((s) =>
      s.map((subj) =>
        subj.id === subjId
          ? {
              ...subj,
              components: subj.components.filter((c) => c.id !== compId),
            }
          : subj
      )
    );
  }

  function mark(
    subjId: string,
    compId: string,
    status: "present" | "absent"
  ) {
    const date = dateFor(compId);
    setSubjects((s) =>
      s.map((subj) => {
        if (subj.id !== subjId) return subj;
        return {
          ...subj,
          components: subj.components.map((c) =>
            c.id === compId
              ? {
                  ...c,
                  attended: c.attended + (status === "present" ? 1 : 0),
                  total: c.total + 1,
                  log: [{ id: uid(), date, status }, ...c.log]
                    .sort((a, b) => (a.date < b.date ? 1 : -1))
                    .slice(0, 12),
                }
              : c
          ),
        };
      })
    );
  }

  function deleteEntry(subjId: string, compId: string, entryId: string) {
    setSubjects((s) =>
      s.map((subj) => {
        if (subj.id !== subjId) return subj;
        return {
          ...subj,
          components: subj.components.map((c) => {
            if (c.id !== compId) return c;
            const entry = c.log.find((e) => e.id === entryId);
            if (!entry) return c;
            return {
              ...c,
              attended: c.attended - (entry.status === "present" ? 1 : 0),
              total: c.total - 1,
              log: c.log.filter((e) => e.id !== entryId),
            };
          }),
        };
      })
    );
  }

  function setCounts(
    subjId: string,
    compId: string,
    attended: number,
    total: number
  ) {
    setSubjects((s) =>
      s.map((subj) =>
        subj.id === subjId
          ? {
              ...subj,
              components: subj.components.map((c) =>
                c.id === compId
                  ? {
                      ...c,
                      attended: Math.max(0, Math.min(attended, total)),
                      total: Math.max(0, total),
                    }
                  : c
              ),
            }
          : subj
      )
    );
  }

  function removeSubject(id: string) {
    setSubjects((s) => s.filter((subj) => subj.id !== id));
  }

  const thresholdFrac = threshold / 100;

  return (
    <main className="max-w-3xl mx-auto px-4 sm:px-5 py-8 sm:py-14">
      <header className="mb-10">
        <div className="flex items-center justify-between gap-3">
          <p className="text-red text-xs tracking-[0.2em] uppercase mb-2">
            Roll Call ·{" "}
            {new Date().toLocaleDateString(undefined, {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </p>
          <button
            onClick={async () => {
              await fetch("/api/logout", { method: "POST" });
              window.location.href = "/login";
            }}
            className="text-xs text-inkSoft hover:text-red transition-colors underline underline-offset-2"
          >
            Sign out
          </button>
        </div>
        <h1 className="font-display text-3xl sm:text-5xl font-semibold text-ink leading-tight">
          Attendance Ledger
        </h1>
        <p className="mt-3 text-inkSoft text-sm max-w-md">
          Loaded with the M.Sc. Applied Psychology attendance report through
          14 Aug 2026. Log new classes as they happen — Theory, Tutorial and
          Practicum are tracked separately but count toward one combined
          course percentage, just like on the official report.
        </p>
      </header>

      <section className="mb-8 flex flex-wrap items-end gap-4 border-b border-line pb-6">
        <div className="flex-1 min-w-[160px] w-full sm:w-auto">
          <label className="block text-xs uppercase tracking-wide text-inkSoft mb-1">
            Add a course
          </label>
          <div className="flex gap-2">
            <input
              value={newSubject}
              onChange={(e) => setNewSubject(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addSubject()}
              placeholder="e.g. Statistics"
              className="flex-1 bg-transparent border border-line rounded-none px-3 py-2 text-ink placeholder:text-inkSoft/50 focus:outline-none focus:ring-2 focus:ring-red/40"
            />
            <button
              onClick={addSubject}
              className="px-4 py-2 bg-ink text-paper text-sm uppercase tracking-wide hover:bg-inkSoft transition-colors"
            >
              Add
            </button>
          </div>
        </div>
        <div>
          <label className="block text-xs uppercase tracking-wide text-inkSoft mb-1">
            Required %
          </label>
          <input
            type="number"
            min={0}
            max={100}
            value={threshold}
            onChange={(e) => setThreshold(Number(e.target.value) || 0)}
            className="w-20 bg-transparent border border-line px-3 py-2 text-ink focus:outline-none focus:ring-2 focus:ring-red/40"
          />
        </div>
      </section>

      <div className="space-y-8">
        {subjects.map((subj) => {
          const agg = sumSubject(subj);
          const { pct, bunkable, needed, safe } = computeMargins(
            agg.attended,
            agg.total,
            thresholdFrac
          );
          const availableTypes = LECTURE_TYPES.filter(
            (t) => !subj.components.some((c) => c.type === t)
          );

          return (
            <article
              key={subj.id}
              className="margin-rule relative bg-paper/40 border border-line pl-12 pr-4 py-4 sm:pl-20 sm:pr-5 sm:py-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                <div>
                  <h2 className="font-display text-xl font-semibold text-ink">
                    {subj.name}
                  </h2>
                  <p className="text-xs text-inkSoft mt-0.5">
                    {agg.attended} attended / {agg.total} held combined
                    {pct !== null && <> · {pct.toFixed(1)}%</>}
                  </p>
                </div>

                {pct !== null && (
                  <span
                    className={`stamp inline-block border-2 px-3 py-1 text-xs font-bold uppercase tracking-widest ${
                      safe ? "border-green text-green" : "border-red text-red"
                    }`}
                  >
                    {safe ? "Safe" : "At Risk"}
                  </span>
                )}
              </div>

              {pct !== null && (
                <p className="text-sm text-inkSoft mb-4">
                  {safe ? (
                    bunkable > 0 ? (
                      <>
                        Margin: can miss{" "}
                        <span className="text-red font-semibold">
                          {bunkable}
                        </span>{" "}
                        more class{bunkable === 1 ? "" : "es"} (any type) and
                        stay above {threshold}%.
                      </>
                    ) : (
                      <>
                        Right at the line — missing one more drops you below{" "}
                        {threshold}%.
                      </>
                    )
                  ) : (
                    <>
                      Below target. Attend the next{" "}
                      <span className="text-red font-semibold">{needed}</span>{" "}
                      class{needed === 1 ? "" : "es"} in a row to reach{" "}
                      {threshold}%.
                    </>
                  )}
                </p>
              )}

              <div className="space-y-3">
                {subj.components.map((c) => {
                  const cm = computeMargins(c.attended, c.total, thresholdFrac);
                  return (
                    <div
                      key={c.id}
                      className="border border-line/70 px-3 py-3 bg-paper/60"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                        <span className="text-xs uppercase tracking-wide text-inkSoft font-semibold">
                          {c.type}
                        </span>
                        <span className="text-xs text-inkSoft">
                          {c.attended}/{c.total}
                          {cm.pct !== null && <> · {cm.pct.toFixed(1)}%</>}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <input
                          type="date"
                          value={dateFor(c.id)}
                          max={todayISO()}
                          onChange={(e) =>
                            setMarkDate((m) => ({
                              ...m,
                              [c.id]: e.target.value,
                            }))
                          }
                          className="px-2 py-2 sm:py-1 text-xs bg-transparent border border-line text-inkSoft"
                        />
                        <button
                          onClick={() => mark(subj.id, c.id, "present")}
                          className="flex-1 sm:flex-none min-w-[90px] px-3 py-2.5 sm:py-1 text-sm sm:text-xs font-semibold bg-green/90 text-paper active:bg-green sm:hover:bg-green transition-colors"
                        >
                          Present
                        </button>
                        <button
                          onClick={() => mark(subj.id, c.id, "absent")}
                          className="flex-1 sm:flex-none min-w-[90px] px-3 py-2.5 sm:py-1 text-sm sm:text-xs font-semibold bg-red/90 text-paper active:bg-red sm:hover:bg-red transition-colors"
                        >
                          Absent
                        </button>
                        <button
                          onClick={() => removeComponent(subj.id, c.id)}
                          className="w-full sm:w-auto sm:ml-auto px-3 py-2 sm:py-1 text-xs text-red/70 active:text-red sm:hover:text-red transition-colors text-right"
                        >
                          Remove
                        </button>
                      </div>
                      <p className="text-[11px] text-inkSoft/70 mb-2">
                        Marking for {fmtDate(dateFor(c.id))}
                        {dateFor(c.id) !== todayISO() ? " (backdated)" : ""}.
                        Change the date above to log a past class.
                      </p>

                      {c.log.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mb-2">
                          {c.log.map((entry) => (
                            <span
                              key={entry.id}
                              title={`${fmtDate(entry.date)} — ${entry.status}`}
                              className={`inline-flex items-center gap-1 text-[10px] pl-1.5 pr-1 py-0.5 border ${
                                entry.status === "present"
                                  ? "border-green/60 text-green"
                                  : "border-red/60 text-red"
                              }`}
                            >
                              {fmtDate(entry.date)}
                              <button
                                onClick={() =>
                                  deleteEntry(subj.id, c.id, entry.id)
                                }
                                aria-label={`Delete ${fmtDate(
                                  entry.date
                                )} entry`}
                                className="px-1 opacity-70 hover:opacity-100"
                              >
                                ×
                              </button>
                            </span>
                          ))}
                        </div>
                      )}

                      <details className="text-xs text-inkSoft">
                        <summary className="cursor-pointer select-none">
                          Correct the count
                        </summary>
                        <div className="flex items-center gap-2 mt-2">
                          <label>
                            Attended
                            <input
                              type="number"
                              min={0}
                              value={c.attended}
                              onChange={(e) =>
                                setCounts(
                                  subj.id,
                                  c.id,
                                  Number(e.target.value) || 0,
                                  c.total
                                )
                              }
                              className="w-20 ml-1 bg-transparent border border-line px-2 py-1.5"
                            />
                          </label>
                          <label>
                            Total
                            <input
                              type="number"
                              min={0}
                              value={c.total}
                              onChange={(e) =>
                                setCounts(
                                  subj.id,
                                  c.id,
                                  c.attended,
                                  Number(e.target.value) || 0
                                )
                              }
                              className="w-20 ml-1 bg-transparent border border-line px-2 py-1.5"
                            />
                          </label>
                        </div>
                      </details>
                    </div>
                  );
                })}
              </div>

              <div className="flex flex-wrap items-center gap-2 mt-3">
                {availableTypes.map((t) => (
                  <button
                    key={t}
                    onClick={() => addComponent(subj.id, t)}
                    className="px-2 py-1 text-xs border border-line text-inkSoft hover:border-inkSoft transition-colors"
                  >
                    + {t}
                  </button>
                ))}
                <button
                  onClick={() => removeSubject(subj.id)}
                  className="ml-auto px-2 py-1 text-xs text-red/70 hover:text-red transition-colors"
                >
                  Remove course
                </button>
              </div>
            </article>
          );
        })}
      </div>

      <footer className="mt-14 pt-6 border-t border-line text-xs text-inkSoft">
        {cloudEnabled === true && (
          <p>
            ☁ Synced to Vercel KV — data is safe even if this browser is
            cleared or she switches devices.
          </p>
        )}
        {cloudEnabled === false && (
          <p>
            Data is stored only in this browser (localStorage) — nothing is
            sent to a server. Clearing browser data clears the ledger. See
            the README to add free Vercel KV storage so it survives that.
          </p>
        )}
      </footer>
    </main>
  );
}
