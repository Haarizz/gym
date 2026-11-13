/**
 * Recruitment — coming soon (/recruitment). Preview on sample data (recruitment-mock.ts):
 * hiring pipeline board, open roles, interviews, and candidate / job detail sheets.
 */
import { useMemo, useState } from "react";
import {
  Briefcase, CalendarDays, CheckCircle2, Clock, FileText, Filter, Mail, MapPin, MessageSquare, Phone, Plus, Search,
  Send, Star, Timer, UserCheck, UserPlus, Users, Video, XCircle,
} from "lucide-react";
import { Button } from "../../components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "../../components/ui/sheet";
import { BarRows, Empty, Kpi, Panel, SectionTabs, Status, fmtDate, fmtInt, styles, usePalette } from "../../components/overview/overview-kit";
import { Meter, PreviewBanner, daysUntil, initialsOf, ps, soon } from "../../components/coming-soon/preview-kit";
import { CANDIDATES, Candidate, INTERVIEWS, JOBS, Job, STAGES, Stage } from "./recruitment-mock";

type View = "pipeline" | "jobs" | "interviews";

const jobOf = (id: string) => JOBS.find(j => j.id === id);
const candidateOf = (id: string) => CANDIDATES.find(c => c.id === id);
const stageMeta = (s: Stage) => STAGES.find(x => x.id === s) ?? { id: s, label: "Rejected", tone: "#d03b3b" };
const scoreTone = (n: number) => (n >= 90 ? "var(--status-good)" : n >= 80 ? "var(--status-info)" : n >= 70 ? "var(--status-warning)" : "var(--status-critical)");
const ago = (iso: string) => { const d = -daysUntil(iso); return d <= 0 ? "today" : d === 1 ? "yesterday" : `${d} days ago`; };
const JOB_STATUS_KIND = { Open: "good", Paused: "warning", Closed: "info" } as const;

function Avatar({ name, tone }: { name: string; tone: string }) {
  return <span className={`${styles.avatar} ${ps.initials}`} style={{ ["--tone" as any]: tone }}>{initialsOf(name)}</span>;
}

// ── Candidate sheet ─────────────────────────────────────────────────────────

function CandidateSheet({ c, onClose }: { c: Candidate | null; onClose: () => void }) {
  const palette = usePalette();
  if (!c) return null;
  const job = jobOf(c.jobId);
  const st = stageMeta(c.stage);
  const interview = INTERVIEWS.find(i => i.candidateId === c.id);
  const reached = STAGES.findIndex(s => s.id === c.stage);
  return (
    <Sheet open={!!c} onOpenChange={o => { if (!o) onClose(); }}>
      <SheetContent className={ps.sheet} style={{ width: "min(100vw, 34rem)", maxWidth: "100vw", overflowY: "auto" }}>
        <SheetHeader>
          <div className={ps.sheetHead}>
            <span className={`${styles.avatar} ${ps.initials}`} style={{ ["--tone" as any]: st.tone, width: 48, height: 48, fontSize: 15 }}>{initialsOf(c.name)}</span>
            <div style={{ minWidth: 0 }}>
              <SheetTitle className={ps.sheetTitle}>{c.name}</SheetTitle>
              <SheetDescription className={ps.sheetSub}>{job?.title} · applied {ago(c.applied)} via {c.source}</SheetDescription>
            </div>
          </div>
          <div className={styles.chips} style={{ marginTop: 10 }}>
            <Status kind={c.stage === "rejected" ? "critical" : c.stage === "hired" ? "good" : "info"}>{st.label}</Status>
            <span className={ps.score} style={{ ["--st" as any]: scoreTone(c.score), marginLeft: 0 }}>Score {c.score}</span>
          </div>
        </SheetHeader>
        <div className={ps.sheetBody}>
          <div className={ps.sheetActions}>
            <Button size="sm" onClick={() => soon("Moving candidates between stages")}><Send className="h-4 w-4 mr-2" />Move to next stage</Button>
            <Button size="sm" variant="outline" onClick={() => soon("Scheduling interviews")}><CalendarDays className="h-4 w-4 mr-2" />Schedule interview</Button>
            <Button size="sm" variant="outline" onClick={() => soon("Rejecting candidates")}><XCircle className="h-4 w-4 mr-2" />Reject</Button>
          </div>

          <div className={ps.sheetSection}>
            <div className={ps.sheetSectionTitle}>Progress</div>
            <div className={ps.timeline}>
              {STAGES.map((s, i) => {
                const done = c.stage !== "rejected" && i <= reached;
                return (
                  <div key={s.id} className={ps.tlItem} style={{ ["--tone" as any]: done ? s.tone : "#94a3b8" }}>
                    <span className={ps.tlDot}>{done ? <CheckCircle2 /> : <Clock />}</span>
                    <div><div className={ps.tlTitle} style={{ opacity: done ? 1 : 0.55 }}>{s.label}</div>
                      {i === reached && c.stage !== "rejected" && <div className={ps.tlMeta}>Current stage</div>}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {interview && (
            <div className={ps.sheetSection}>
              <div className={ps.sheetSectionTitle}>Next interview</div>
              <div className={ps.slot}>
                <span className={ps.slotTime}>{interview.time}</span>
                <div style={{ minWidth: 0 }}><div style={{ fontWeight: 600, fontSize: "var(--text-sm)" }}>{interview.round} · {fmtDate(interview.date)}</div><div className={ps.cellSub}>with {interview.interviewer}</div></div>
                <Status kind="info">{interview.mode}</Status>
              </div>
            </div>
          )}

          <div className={ps.sheetSection}>
            <div className={ps.sheetSectionTitle}>Contact & profile</div>
            <div className={styles.facts}>
              <div className={styles.fact}><span className={styles.factLabel}>Email</span><span className={styles.factValue}>{c.email}</span></div>
              <div className={styles.fact}><span className={styles.factLabel}>Phone</span><span className={styles.factValue}>{c.phone}</span></div>
              <div className={styles.fact}><span className={styles.factLabel}>Experience</span><span className={styles.factValue}>{c.experience}</span></div>
              <div className={styles.fact}><span className={styles.factLabel}>Lives in</span><span className={styles.factValue}>{c.location}</span></div>
              <div className={styles.fact}><span className={styles.factLabel}>Applied for</span><span className={styles.factValue}>{job?.title} · {job?.branch}</span></div>
              <div className={styles.fact}><span className={styles.factLabel}>Match score</span><span className={styles.factValue}><Meter pct={c.score} color={palette.s3} /></span></div>
            </div>
            <div className={ps.tags}>{c.tags.map(t => <span key={t} className={ps.tag}>{t}</span>)}</div>
          </div>

          <div className={ps.sheetSection}>
            <div className={ps.sheetSectionTitle}>Notes</div>
            <div style={{ fontSize: "var(--text-sm)", color: c.notes ? undefined : "var(--muted-foreground)" }}>{c.notes || "No notes yet."}</div>
            <div className={ps.docs}>
              <button type="button" className={ps.doc} onClick={() => soon("Opening CVs")}><FileText />CV_{c.name.split(" ")[0]}.pdf</button>
              <button type="button" className={ps.doc} onClick={() => soon("Adding notes")}><MessageSquare />Add a note</button>
              <button type="button" className={ps.doc} onClick={() => soon("Emailing candidates")}><Mail />Email</button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ── Job sheet ───────────────────────────────────────────────────────────────

function JobSheet({ job, onClose, onCandidate }: { job: Job | null; onClose: () => void; onCandidate: (c: Candidate) => void }) {
  if (!job) return null;
  const people = CANDIDATES.filter(c => c.jobId === job.id);
  return (
    <Sheet open={!!job} onOpenChange={o => { if (!o) onClose(); }}>
      <SheetContent className={ps.sheet} style={{ width: "min(100vw, 34rem)", maxWidth: "100vw", overflowY: "auto" }}>
        <SheetHeader>
          <div className={ps.sheetHead}>
            <span className={`${ps.tile} ${ps.tileLg}`}><Briefcase /></span>
            <div style={{ minWidth: 0 }}>
              <SheetTitle className={ps.sheetTitle}>{job.title}</SheetTitle>
              <SheetDescription className={ps.sheetSub}>{job.department} · {job.branch} · {job.type}</SheetDescription>
            </div>
          </div>
          <div className={styles.chips} style={{ marginTop: 10 }}>
            <Status kind={JOB_STATUS_KIND[job.status]}>{job.status}</Status>
            <Status kind={job.priority === "High" ? "critical" : job.priority === "Medium" ? "warning" : "info"}>{job.priority} priority</Status>
          </div>
        </SheetHeader>
        <div className={ps.sheetBody}>
          <div className={ps.sheetActions}>
            <Button size="sm" onClick={() => soon("Sharing job posts")}><Send className="h-4 w-4 mr-2" />Share post</Button>
            <Button size="sm" variant="outline" onClick={() => soon("Editing jobs")}>Edit</Button>
            <Button size="sm" variant="outline" onClick={() => soon("Closing jobs")}>Close role</Button>
          </div>
          <div className={styles.facts}>
            <div className={styles.fact}><span className={styles.factLabel}>Salary</span><span className={styles.factValue}>{job.salary}</span></div>
            <div className={styles.fact}><span className={styles.factLabel}>Openings</span><span className={styles.factValue}>{job.openings}</span></div>
            <div className={styles.fact}><span className={styles.factLabel}>Posted</span><span className={styles.factValue}>{fmtDate(job.posted)} ({ago(job.posted)})</span></div>
            <div className={styles.fact}><span className={styles.factLabel}>Applicants</span><span className={styles.factValue}>{people.length}</span></div>
          </div>
          <div className={ps.sheetSection}>
            <div className={ps.sheetSectionTitle}>About the role</div>
            <div style={{ fontSize: "var(--text-sm)", lineHeight: 1.5 }}>{job.description}</div>
            <div className={ps.tags}>{job.requirements.map(r => <span key={r} className={ps.tag}>{r}</span>)}</div>
          </div>
          <div className={ps.sheetSection}>
            <div className={ps.sheetSectionTitle}>Candidates</div>
            {people.length === 0 ? <div className={styles.muted} style={{ fontSize: "var(--text-sm)" }}>No applicants yet.</div> : (
              <div className={styles.list}>
                {people.map(c => {
                  const st = stageMeta(c.stage);
                  return (
                    <button key={c.id} type="button" className={styles.listRow} style={{ border: 0, textAlign: "left", cursor: "pointer", font: "inherit", color: "inherit" }} onClick={() => onCandidate(c)}>
                      <Avatar name={c.name} tone={st.tone} />
                      <div className={styles.rowMain}><span className={styles.rowName}>{c.name}</span><span className={styles.rowMeta}>{c.experience} · applied {ago(c.applied)}</span></div>
                      <span className={styles.rowEnd}><Status kind={c.stage === "rejected" ? "critical" : c.stage === "hired" ? "good" : "info"}>{st.label}</Status></span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ── Page ────────────────────────────────────────────────────────────────────

export function Recruitment() {
  const palette = usePalette();
  const [view, setView] = useState<View>("pipeline");
  const [jobFilter, setJobFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [cand, setCand] = useState<Candidate | null>(null);
  const [job, setJob] = useState<Job | null>(null);

  const open = JOBS.filter(j => j.status === "Open");
  const active = CANDIDATES.filter(c => c.stage !== "rejected" && c.stage !== "hired");
  const count = (s: Stage) => CANDIDATES.filter(c => c.stage === s).length;
  const funnel = STAGES.map((s, i) => ({ ...s, value: CANDIDATES.filter(c => c.stage !== "rejected" && STAGES.findIndex(x => x.id === c.stage) >= i).length }));
  const upcoming = [...INTERVIEWS].sort((x, y) => (x.date + x.time).localeCompare(y.date + y.time));

  const board = useMemo(() => CANDIDATES.filter(c =>
    (jobFilter === "all" || c.jobId === jobFilter)
    && (!query.trim() || `${c.name} ${c.tags.join(" ")} ${jobOf(c.jobId)?.title}`.toLowerCase().includes(query.trim().toLowerCase()))), [jobFilter, query]);

  const days = useMemo(() => {
    const m = new Map<string, typeof INTERVIEWS>();
    upcoming.forEach(i => m.set(i.date, [...(m.get(i.date) ?? []), i]));
    return [...m.entries()];
  }, [upcoming]);

  return (
    <div className={styles.root}>
      <div className={styles.head}>
        <div>
          <h1 className={styles.title}>Recruitment</h1>
          <div className={styles.subtitle}>Open roles, candidates and interviews in one hiring pipeline</div>
        </div>
        <div className={styles.actions}>
          <Button variant="outline" size="sm" onClick={() => soon("Adding candidates")}><UserPlus className="h-4 w-4 mr-2" />Add candidate</Button>
          <Button size="sm" onClick={() => soon("Posting jobs")}><Plus className="h-4 w-4 mr-2" />Post a job</Button>
        </div>
      </div>
      <PreviewBanner module="Recruitment" features={["Job posts & careers page", "Candidate pipeline", "Interview scheduling", "Offer letters", "Hire → staff record"]} />

      <div className={styles.kpis}>
        <Kpi icon={Briefcase} tone="blue" label="Open roles" value={fmtInt(open.length)} hint={`${open.reduce((n, j) => n + j.openings, 0)} positions`} onClick={() => setView("jobs")} />
        <Kpi icon={Users} tone="teal" label="In the pipeline" value={fmtInt(active.length)} hint={`${CANDIDATES.filter(c => -daysUntil(c.applied) <= 7).length} new this week`} onClick={() => setView("pipeline")} />
        <Kpi icon={CalendarDays} tone="violet" label="Interviews" value={fmtInt(INTERVIEWS.length)} hint={`${INTERVIEWS.filter(i => daysUntil(i.date) === 0).length} today`} onClick={() => setView("interviews")} />
        <Kpi icon={Send} tone="amber" label="Offers out" value={fmtInt(count("offer"))} hint="awaiting reply" />
        <Kpi icon={UserCheck} tone="green" label="Hired" value={fmtInt(count("hired"))} hint="last 30 days" />
        <Kpi icon={Timer} tone="gray" label="Time to hire" value="18 days" hint="average, applied → hired" />
      </div>

      <div className={styles.cols2}>
        <Panel title="Hiring funnel" icon={Filter} sub="Candidates who reached each stage">
          <BarRows rows={funnel.map(f => ({ key: f.id, label: f.label, value: f.value, color: f.tone, meta: CANDIDATES.length ? `${Math.round((f.value / funnel[0].value) * 100)}%` : undefined }))}
            fmt={n => fmtInt(n)} empty="No candidates yet." />
        </Panel>
        <Panel title="Coming up" icon={CalendarDays} sub="Next interviews" action={<Button variant="outline" size="sm" onClick={() => setView("interviews")}>All interviews</Button>}>
          <div className={styles.list}>
            {upcoming.slice(0, 4).map(i => {
              const c = candidateOf(i.candidateId)!;
              const d = daysUntil(i.date);
              return (
                <button key={i.id} type="button" className={styles.listRow} style={{ border: 0, textAlign: "left", cursor: "pointer", font: "inherit", color: "inherit" }} onClick={() => setCand(c)}>
                  <Avatar name={c.name} tone={palette.s4} />
                  <div className={styles.rowMain}><span className={styles.rowName}>{c.name}</span><span className={styles.rowMeta}>{jobOf(c.jobId)?.title} · {i.round}</span></div>
                  <span className={styles.rowEnd}><Status kind={d === 0 ? "warning" : "info"}>{d === 0 ? "Today" : d === 1 ? "Tomorrow" : fmtDate(i.date)} {i.time}</Status></span>
                </button>
              );
            })}
          </div>
        </Panel>
      </div>

      <SectionTabs<View>
        tabs={[
          { id: "pipeline", label: "Pipeline", icon: Users, count: active.length },
          { id: "jobs", label: "Open roles", icon: Briefcase, count: open.length },
          { id: "interviews", label: "Interviews", icon: CalendarDays, count: INTERVIEWS.length },
        ]}
        value={view} onChange={setView} label="Recruitment views"
      />

      {view === "pipeline" && (
        <Panel title="Pipeline" icon={Users} sub={`Click a candidate for their profile · ${count("rejected")} rejected not shown`}>
          <div className={ps.toolbar}>
            <label className={ps.search}><Search aria-hidden /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search name or skill…" aria-label="Search candidates" /></label>
            <select className={ps.select} value={jobFilter} onChange={e => setJobFilter(e.target.value)} aria-label="Role">
              <option value="all">All roles</option>{JOBS.map(j => <option key={j.id} value={j.id}>{j.title}</option>)}
            </select>
          </div>
          <div className={ps.board}>
            {STAGES.map(s => {
              const list = board.filter(c => c.stage === s.id).sort((x, y) => y.score - x.score);
              return (
                <div key={s.id} className={ps.column}>
                  <div className={ps.columnHead}><span><span className={ps.dot} style={{ ["--tone" as any]: s.tone }} />{s.label}</span><span className={ps.count}>{list.length}</span></div>
                  {list.length === 0 && <div className={styles.muted} style={{ fontSize: "var(--text-xs)", textAlign: "center", padding: "1rem 0" }}>No one here</div>}
                  {list.map(c => (
                    <button key={c.id} type="button" className={ps.candidate} onClick={() => setCand(c)}>
                      <div className={ps.candTop}>
                        <Avatar name={c.name} tone={s.tone} />
                        <div style={{ minWidth: 0 }}><div className={ps.candName}>{c.name}</div><div className={ps.candRole}>{jobOf(c.jobId)?.title}</div></div>
                        <span className={ps.score} style={{ ["--st" as any]: scoreTone(c.score) }}><Star size={10} style={{ display: "inline", marginRight: 2, verticalAlign: "-1px" }} />{c.score}</span>
                      </div>
                      <div className={ps.tags}>{c.tags.slice(0, 2).map(t => <span key={t} className={ps.tag}>{t}</span>)}</div>
                      <div className={ps.candFoot}><span>{c.experience}</span><span>{ago(c.applied)}</span></div>
                    </button>
                  ))}
                </div>
              );
            })}
          </div>
        </Panel>
      )}

      {view === "jobs" && (
        <div className={ps.cardGrid}>
          {JOBS.map(j => {
            const people = CANDIDATES.filter(c => c.jobId === j.id);
            const progressed = people.filter(c => ["interview", "offer", "hired"].includes(c.stage)).length;
            return (
              <button key={j.id} type="button" className={ps.card} onClick={() => setJob(j)}>
                <div className={ps.cardHead}>
                  <div style={{ minWidth: 0 }}>
                    <div className={ps.cardTitle}>{j.title}</div>
                    <div className={ps.cardMeta}><span><Briefcase />{j.department}</span><span><MapPin />{j.branch}</span></div>
                  </div>
                  <Status kind={JOB_STATUS_KIND[j.status]}>{j.status}</Status>
                </div>
                <div className={ps.cardMeta}><span><Clock />{j.type}</span><span>{j.salary}</span></div>
                <div>
                  <div className={ps.cardMeta} style={{ justifyContent: "space-between", marginBottom: 6 }}><span>{people.length} applicant{people.length === 1 ? "" : "s"}</span><span>{progressed} past screening</span></div>
                  <Meter pct={people.length ? (progressed / people.length) * 100 : 0} color={palette.s4} />
                </div>
                <div className={ps.cardFoot}>
                  <span>Posted {ago(j.posted)}</span>
                  <Status kind={j.priority === "High" ? "critical" : j.priority === "Medium" ? "warning" : "info"}>{j.priority}</Status>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {view === "interviews" && (
        <Panel title="Interview schedule" icon={CalendarDays} sub="Upcoming interviews by day" action={<Button size="sm" onClick={() => soon("Scheduling interviews")}><Plus className="h-4 w-4 mr-2" />Schedule</Button>}>
          {days.length === 0 ? <Empty icon={CalendarDays} title="No interviews scheduled" /> : days.map(([date, list]) => {
            const d = new Date(date + "T00:00:00");
            return (
              <div key={date} className={ps.agendaDay}>
                <div className={ps.dayBadge} data-today={daysUntil(date) === 0}>
                  <span>{d.toLocaleString(undefined, { weekday: "short" })}</span><b>{d.getDate()}</b><span>{d.toLocaleString(undefined, { month: "short" })}</span>
                </div>
                <div>
                  {list.map(i => {
                    const c = candidateOf(i.candidateId)!;
                    return (
                      <div key={i.id} className={ps.slot} style={{ cursor: "pointer" }} onClick={() => setCand(c)}>
                        <span className={ps.slotTime}>{i.time}</span>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: 600, fontSize: "var(--text-sm)" }}>{c.name} · {jobOf(c.jobId)?.title}</div>
                          <div className={ps.cellSub}>{i.round} with {i.interviewer}</div>
                        </div>
                        <Status kind="info">{i.mode === "Video call" ? <><Video size={12} />Video</> : <><MapPin size={12} />In person</>}</Status>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </Panel>
      )}

      <CandidateSheet c={cand} onClose={() => setCand(null)} />
      <JobSheet job={job} onClose={() => setJob(null)} onCandidate={c => { setJob(null); setCand(c); }} />
    </div>
  );
}
