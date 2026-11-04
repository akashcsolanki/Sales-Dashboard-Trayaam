import React, { useEffect, useRef, useState, useMemo } from "react";
import { createRoot } from "react-dom/client";
import gsap from "gsap";
import {
  LayoutDashboard,
  Users,
  Workflow,
  Building2,
  Globe2,
  BriefcaseBusiness,
  ChartNoAxesCombined,
  FolderOpen,
  Settings,
  Search,
  ArrowUpRight,
  ArrowRight,
  Plus,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Mail,
  Linkedin,
  Phone,
  Check,
  Clock,
  Activity,
  ShieldCheck,
  Download,
  X,
  Menu,
  RefreshCw,
  LockKeyhole,
  LogOut,
  Target,
  SlidersHorizontal,
  ExternalLink,
  Command,
  CheckCircle2,
  AlertCircle,
  Send,
  Bot,
  NotebookPen,
  Filter,
  MapPin,
  MoreHorizontal,
} from "lucide-react";
import {
  STAGES,
  CHANNELS,
  ROLES,
  EMPLOYEES,
  metrics,
  filterProspects,
  safeUrl,
  exportCSV,
} from "./model";
import { Gradient, Globe } from "./visuals";
import { api } from "./api";
import "./style.css";
import Drafts from "./Drafts";
import SourceBrowser from "./SourceBrowser";
const NAV = [
  ["Overview", LayoutDashboard],
  ["Prospects", Users],
  ["Pipeline", Workflow],
  ["Hiring signals", BriefcaseBusiness],
  ["Sales Office", Building2],
  ["World view", Globe2],
  ["Analytics", ChartNoAxesCombined],
  ["Asset library", FolderOpen],
  ["Data & settings", Settings],
];
const fmt = (n) => Number(n || 0).toLocaleString("en-GB");
function Link({ url, children, ...props }) {
  const href = safeUrl(url);
  return href ? (
    <a href={href} target="_blank" rel="noopener noreferrer" {...props}>
      {children}
      <ArrowUpRight size={13} />
    </a>
  ) : (
    <span className="muted">{children || "Not recorded"}</span>
  );
}
function Badge({ children, tone = "" }) {
  return <span className={"badge " + tone}>{children}</span>;
}
function Empty({ title, children }) {
  return (
    <div className="empty">
      <Target size={27} />
      <h3>{title}</h3>
      <p>{children}</p>
    </div>
  );
}
function Select({ label, value, onChange, options, all }) {
  return (
    <label className="select-label">
      <span className="sr-only">{label}</span>
      <select
        aria-label={label}
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
      >
        {all && <option value="">{all}</option>}
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
      <ChevronDown size={13} />
    </label>
  );
}
function App() {
  const [data, setData] = useState(null),
    [auth, setAuth] = useState("loading"),
    [error, setError] = useState(""),
    [tab, setTab] = useState("Overview"),
    [mobile, setMobile] = useState(false),
    [selected, setSelected] = useState(null),
    [taskOpen, setTaskOpen] = useState(false),
    [taskAgent, setTaskAgent] = useState(""),
    [toast, setToast] = useState(""),
    [busy, setBusy] = useState(false),
    [filters, setFilters] = useState({ search: "", priority: "" });
  const main = useRef();
  async function load() {
    try {
      const d = await api("snapshot");
      setData(d);
      setAuth("in");
      setError("");
    } catch (e) {
      setError(e.message);
      setAuth("out");
    }
  }
  useEffect(() => {
    load();
  }, []);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 4500);
    return () => clearTimeout(timer);
  }, [toast]);
  useEffect(() => {
    if (!main.current || matchMedia("(prefers-reduced-motion: reduce)").matches)
      return;
    const ctx = gsap.context(
      () =>
        gsap.fromTo(
          ".animate-in",
          { y: 14, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 0.45,
            stagger: 0.055,
            ease: "power2.out",
          },
        ),
      main,
    );
    return () => ctx.revert();
  }, [tab, auth]);
  useEffect(() => {
    if (auth !== "in") return;
    const timer = setInterval(() => {
      if (!document.hidden && !selected && !taskOpen)
        api("snapshot")
          .then(setData)
          .catch(() => {});
    }, 30000);
    return () => clearInterval(timer);
  }, [auth, selected, taskOpen]);
  const prospects = data?.prospects || [],
    events = data?.events || [],
    tasks = data?.tasks || [],
    stats = metrics(prospects, events);
  const shown = filterProspects(prospects, filters);
  function navigate(next) {
    setTab(next);
    setMobile(false);
    setFilters({ search: "", priority: "" });
  }
  async function openProspect(p) {
    try {
      const full = await api("prospects/" + p.id);
      setSelected(full);
    } catch (e) {
      setToast(e.message);
    }
  }
  async function saveProspect(patch) {
    setBusy(true);
    try {
      const updated = await api(
        "prospects/" + selected.id,
        { ...patch, version: selected.version },
        "PATCH",
      );
      setData((d) => ({
        ...d,
        prospects: d.prospects.map((p) => (p.id === updated.id ? updated : p)),
      }));
      setSelected(updated);
      setToast("Prospect saved across devices");
    } catch (e) {
      setToast(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function addEvent(event) {
    try {
      const saved = await api("events", event);
      setData((d) => ({ ...d, events: [saved, ...d.events] }));
      setToast("Activity recorded");
    } catch (e) {
      setToast(e.message);
    }
  }
  async function createTask(task) {
    try {
      const saved = await api("tasks", task);
      setData((d) => ({ ...d, tasks: [saved, ...d.tasks] }));
      setTaskOpen(false);
      setToast("Task added to the queue");
    } catch (e) {
      setToast(e.message);
    }
  }
  async function changeTask(task, status) {
    try {
      const saved = await api(
        "tasks/" + task.id,
        { status, version: task.version },
        "PATCH",
      );
      setData((d) => ({
        ...d,
        tasks: d.tasks.map((t) => (t.id === saved.id ? saved : t)),
      }));
    } catch (e) {
      setToast(e.message);
    }
  }
  function download() {
    const blob = new Blob([exportCSV(shown)], {
      type: "text/csv;charset=utf-8;",
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "trayaam-prospects.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  }
  if (auth === "loading")
    return (
      <div className="loading">
        <span className="brand-symbol">t.</span>
        <p>Opening your Sales Office…</p>
      </div>
    );
  if (auth === "out") return <Login onLogin={load} error={error} />;
  return (
    <div className="app-shell">
      <aside className={mobile ? "sidebar open" : "sidebar"}>
        <a
          className="brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            navigate("Overview");
          }}
        >
          <span className="brand-symbol">t.</span>
          <span>
            trayaam<span className="brand-caption">SALES WORKSPACE</span>
          </span>
        </a>
        <div className="workspace">
          <span className="workspace-avatar">T</span>
          <div>
            Trayaam HQ<small>Agency partnerships</small>
          </div>
          <ChevronDown size={14} />
        </div>
        <div className="nav-label">WORKSPACE</div>
        <nav>
          {NAV.map(([name, Icon]) => (
            <button
              key={name}
              className={tab === name ? "nav-item active" : "nav-item"}
              onClick={() => navigate(name)}
            >
              <Icon size={18} />
              <span>{name}</span>
              {name === "Prospects" && <small>{fmt(stats.total)}</small>}
              {name === "Hiring signals" && <i className="nav-dot" />}
              {name === "Sales Office" && <Badge>76</Badge>}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="team-status">
            <span className="status-dot" />
            <span>
              Your next chapter starts here.
              <small>Research. Connect. Grow.</small>
            </span>
          </div>
          <button
            className="profile"
            onClick={async () => {
              await api("logout", {});
              setAuth("out");
              setData(null);
            }}
          >
            <span className="avatar">AS</span>
            <span>
              Akash Solanki<small>Workspace owner</small>
            </span>
            <LogOut size={15} />
          </button>
        </div>
      </aside>
      {mobile && <div className="nav-scrim" onClick={() => setMobile(false)} />}
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="icon mobile-toggle"
              aria-label="Open navigation"
              onClick={() => setMobile(true)}
            >
              <Menu size={20} />
            </button>
            <span>Workspace</span>
            <ChevronRight size={13} />
            <strong>{tab}</strong>
          </div>
          <div className="top-actions">
            <span className="secure">
              <ShieldCheck size={14} />
              Private workspace
            </span>
            <button
              className="icon"
              aria-label="Refresh workspace"
              onClick={load}
            >
              <RefreshCw size={16} />
            </button>
            <span className="avatar small">AS</span>
          </div>
        </header>
        <main ref={main}>
          <div className="page-heading animate-in">
            <div>
              <div className="eyebrow">
                TRAYAAM /{" "}
                {tab === "Overview" ? "COMMAND CENTER" : tab.toUpperCase()}
              </div>
              <h1>
                {tab === "Overview"
                  ? "A clear view. A stronger pipeline."
                  : tab === "Sales Office"
                    ? "Your people. One shared mission."
                    : tab === "Hiring signals"
                      ? "Turn hiring signals into conversations."
                      : tab === "World view"
                        ? "Relationships, around the world."
                        : tab}
              </h1>
              <p>
                {tab === "Overview"
                  ? "Your outreach, intelligence and sales team. Working in one place."
                  : tab === "Sales Office"
                    ? "A dedicated specialist for every step. Four seats for every role."
                    : tab === "Hiring signals"
                      ? "Your priority agency employers, with dated evidence and candidate fit."
                      : "Keep every relationship moving with context, clarity and purpose."}
              </p>
            </div>
            <div className="heading-actions">
              {tab === "Overview" ? (
                <span className="date-chip">
                  <Clock size={14} />
                  {new Intl.DateTimeFormat("en-GB", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                    timeZone: "Asia/Kolkata",
                  }).format(new Date())}
                </span>
              ) : (
                <button className="btn" onClick={download}>
                  <Download size={15} />
                  Export prospects
                </button>
              )}
              <button
                className="btn primary"
                onClick={() => {
                  setTaskAgent("");
                  setTaskOpen(true);
                }}
              >
                <Plus size={16} />
                Create task
              </button>
            </div>
          </div>
          {error && <div className="notice">{error}</div>}
          {tab === "Overview" && (
            <>
              <section className="hero animate-in">
                <Gradient />
                <div className="hero-content">
                  <span className="hero-kicker">
                    <span className="status-dot" /> YOUR NEXT MOVE
                  </span>
                  <h2>
                    Good partnerships
                    <br />
                    start with the right focus.
                  </h2>
                  <p>
                    Your 100 priority agencies are ready for review.
                    <br />
                    Start with their hiring signals. Make every approach
                    relevant.
                  </p>
                  <button
                    className="btn lime"
                    onClick={() => {
                      navigate("Prospects");
                      setFilters({ priority: "shortlist" });
                    }}
                  >
                    Explore priority prospects
                    <ArrowUpRight size={16} />
                  </button>
                </div>
                <div className="hero-orbit">
                  <div className="orbit o1" />
                  <div className="orbit o2" />
                  <div className="orbit o3" />
                  <span className="orbit-core">
                    <Target size={33} />
                  </span>
                  <span className="orbit-chip">
                    <i />
                    100 agencies. Your first move.
                  </span>
                </div>
                <span className="hero-number">
                  01 / THE PARTNERSHIP PLAYBOOK
                </span>
              </section>
              <section className="stats-grid animate-in">
                <Stat
                  title="Total prospects"
                  value={fmt(stats.total)}
                  sub="Canonical agency directory"
                  icon={Users}
                />
                <Stat
                  title="Priority agencies"
                  value={fmt(stats.shortlist)}
                  sub="Vacancy-backed shortlist"
                  icon={Target}
                  accent
                />
                <Stat
                  title="Outreach sent"
                  value={fmt(stats.sent)}
                  sub="Recorded company outreach"
                  icon={Send}
                />
                <Stat
                  title="Reply rate"
                  value={
                    stats.replyRate === null
                      ? "—"
                      : (stats.replyRate * 100).toFixed(1) + "%"
                  }
                  sub={
                    stats.reached
                      ? `${stats.replies} replies recorded`
                      : "Awaiting first outreach cohort"
                  }
                  icon={ChartNoAxesCombined}
                />
              </section>
              <div className="overview-grid">
                <section className="panel animate-in">
                  <PanelHeader
                    title="Your priority queue"
                    note="The right agency. The right reason."
                    action="View all prospects"
                    onClick={() => {
                      navigate("Prospects");
                      setFilters({ priority: "shortlist" });
                    }}
                  />
                  <div className="compact-list">
                    {prospects
                      .filter((p) => p.shortlist)
                      .slice(0, 5)
                      .map((p, i) => (
                        <button
                          className="queue-row"
                          key={p.id}
                          onClick={() => openProspect(p)}
                        >
                          <span className={"company-icon c" + i}>
                            {p.name.slice(0, 2).toUpperCase()}
                          </span>
                          <span className="queue-company">
                            <strong>{p.name}</strong>
                            <small>{p.job?.["Live advertised role"]}</small>
                          </span>
                          <span className="queue-city">{p.city}</span>
                          <Badge tone="green">Priority 01</Badge>
                          <ArrowUpRight size={16} />
                        </button>
                      ))}
                  </div>
                </section>
                <section className="panel globe-panel animate-in">
                  <PanelHeader
                    title="Your global footprint"
                    action="Explore"
                    onClick={() => navigate("World view")}
                  />
                  <Globe prospects={prospects} />
                  <div className="geo-footer">
                    <div>
                      <strong>United Kingdom</strong>
                      <small>Primary agency market</small>
                    </div>
                    <b>
                      {fmt(stats.total)}
                      <small>prospects</small>
                    </b>
                  </div>
                </section>
              </div>
              <div className="overview-bottom">
                <section className="panel animate-in">
                  <PanelHeader
                    title="Pipeline at a glance"
                    action="Open pipeline"
                    onClick={() => navigate("Pipeline")}
                  />
                  <div className="pipeline-mini">
                    {[
                      "Not contacted",
                      "Qualified",
                      "Contacted",
                      "Replied",
                      "Meeting booked",
                      "Won",
                    ].map((stage, i) => (
                      <div key={stage}>
                        <div className="mini-line">
                          <i
                            style={{
                              background: [
                                "#c4c8c2",
                                "#a1b896",
                                "#667e65",
                                "#4d705c",
                                "#bcb371",
                                "#354f45",
                              ][i],
                            }}
                          />
                          {stage}
                          <strong>
                            {fmt(
                              prospects.filter((p) => p.stage === stage).length,
                            )}
                          </strong>
                        </div>
                        <div className="bar-track">
                          <span
                            style={{
                              width:
                                Math.max(
                                  2,
                                  (prospects.filter((p) => p.stage === stage)
                                    .length /
                                    Math.max(1, stats.total)) *
                                    100,
                                ) + "%",
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
                <section className="panel office-invite animate-in">
                  <div className="eyebrow">THE SALES OFFICE</div>
                  <div className="invite-icons">
                    {[Bot, Search, Mail, ChartNoAxesCombined].map((Icon, i) => (
                      <span key={i}>
                        <Icon size={21} />
                      </span>
                    ))}
                  </div>
                  <h3>Specialists, ready for the next move.</h3>
                  <p>
                    19 specialties. 76 dedicated seats.
                    <br />
                    Research, outreach, closing and beyond.
                  </p>
                  <button
                    className="text-button"
                    onClick={() => navigate("Sales Office")}
                  >
                    Step inside the office
                    <ArrowRight size={16} />
                  </button>
                  <Badge>AI runtime not connected</Badge>
                </section>
                <section className="panel animate-in">
                  <PanelHeader title="Next actions" />
                  <div className="action-row">
                    <Clock size={18} />
                    <div>
                      <strong>{stats.due} follow-ups due</strong>
                      <small>Based on recorded next-action dates</small>
                    </div>
                  </div>
                  <div className="action-row">
                    <BriefcaseBusiness size={18} />
                    <div>
                      <strong>
                        {
                          prospects.filter(
                            (p) =>
                              p.shortlist &&
                              ![
                                "Verified open",
                                "Closed / no current openings",
                              ].includes(p.hiringVerification?.status),
                          ).length
                        }{" "}
                        hiring signals to recheck
                      </strong>
                      <small>Retained evidence from October</small>
                    </div>
                  </div>
                  <div className="action-row">
                    <ShieldCheck size={18} />
                    <div>
                      <strong>Outreach held for review</strong>
                      <small>Eligibility and sending approval required</small>
                    </div>
                  </div>
                </section>
              </div>
            </>
          )}
          {tab === "Prospects" && (
            <ProspectTable
              rows={shown}
              all={prospects}
              filters={filters}
              setFilters={setFilters}
              onSelect={openProspect}
              onExport={download}
            />
          )}
          {tab === "Hiring signals" && (
            <Hiring
              rows={prospects.filter((p) => p.shortlist)}
              onSelect={openProspect}
            />
          )}
          {tab === "Pipeline" && (
            <>
              <div className="pipeline-summary animate-in">
                <span>
                  <b>{fmt(stats.total)}</b> relationships
                </span>
                <span>
                  <b>£{fmt(stats.pipeline)}</b> unweighted pipeline
                </span>
                <span>
                  <b>{stats.meetings}</b> meetings booked
                </span>
                <span>
                  <b>{stats.won}</b> won
                </span>
              </div>
              <div className="kanban">
                {STAGES.filter((s) => s !== "Do not contact").map((stage) => {
                  const rows = prospects.filter((p) => p.stage === stage);
                  return (
                    <section className="kanban-column" key={stage}>
                      <div className="kanban-title">
                        <i />
                        {stage}
                        <Badge>{rows.length}</Badge>
                      </div>
                      {rows.slice(0, 30).map((p) => (
                        <button
                          className="deal"
                          key={p.id}
                          onClick={() => openProspect(p)}
                        >
                          <span className="deal-name">
                            {p.name}
                            <ArrowUpRight size={14} />
                          </span>
                          <small>
                            {p.city} · {p.industry}
                          </small>
                          <p>{p.nextAction || "Set the next action"}</p>
                          <div>
                            <Badge tone={p.shortlist ? "green" : ""}>
                              {p.shortlist ? "Priority 01" : p.channel}
                            </Badge>
                            {p.value > 0 && <b>£{fmt(p.value)}</b>}
                          </div>
                        </button>
                      ))}
                      {rows.length > 30 && (
                        <small className="muted">
                          Showing 30 of {rows.length}. Use Prospects to filter
                          all.
                        </small>
                      )}
                    </section>
                  );
                })}
              </div>
            </>
          )}
          {tab === "Sales Office" && (
            <SalesOffice
              tasks={tasks}
              create={(id) => {
                setTaskAgent(id || "");
                setTaskOpen(true);
              }}
              changeTask={changeTask}
            />
          )}
          {tab === "World view" && (
            <World
              prospects={shown}
              filters={filters}
              setFilters={setFilters}
              onSelect={openProspect}
            />
          )}
          {tab === "Analytics" && (
            <Analytics prospects={prospects} events={events} />
          )}
          {tab === "Asset library" && <Assets />}
          {tab === "Data & settings" && <DataSettings data={data} />}
          <footer className="page-footer">
            <span>
              <span className="status-dot" />
              Shared workspace · Cloudflare D1
            </span>
            <span>YOUR BRAND. YOUR CLIENT RELATIONSHIP. OUR DELIVERY.</span>
          </footer>
        </main>
      </div>
      {toast && (
        <div role="status" className="toast">
          <CheckCircle2 size={17} />
          {toast}
        </div>
      )}
      {selected && (
        <ProspectDrawer
          key={selected.id}
          p={selected}
          onClose={() => setSelected(null)}
          save={saveProspect}
          busy={busy}
          events={events.filter((e) => e.prospectId === selected.id)}
          addEvent={addEvent}
        />
      )}
      {taskOpen && (
        <TaskModal
          agent={taskAgent}
          prospects={prospects}
          tasks={tasks}
          onClose={() => setTaskOpen(false)}
          onSubmit={createTask}
        />
      )}
    </div>
  );
}
function Login({ onLogin, error }) {
  const [password, setPassword] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  return (
    <div className="login-shell">
      <div className="login-art">
        <Gradient />
        <span className="brand light">
          <span className="brand-symbol">t.</span>trayaam
        </span>
        <div>
          <div className="eyebrow">THE PARTNERSHIP WORKSPACE</div>
          <h1>
            Build relationships.
            <br />
            Create what’s next.
          </h1>
          <p>One office for your prospects, outreach and people.</p>
        </div>
        <small>YOUR BRAND. YOUR CLIENT RELATIONSHIP. OUR DELIVERY.</small>
      </div>
      <form
        className="login-form"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          try {
            await api("login", { password });
            await onLogin();
          } catch (e) {
            setMessage(e.message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <span className="login-lock">
          <LockKeyhole size={24} />
        </span>
        <div className="eyebrow">TRAYAAM SALES OFFICE</div>
        <h2>Welcome to your workspace.</h2>
        <p>Sign in to access your private sales operations.</p>
        <label>
          Workspace password
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={12}
          />
        </label>
        <button className="btn primary" disabled={busy}>
          {busy ? "Opening workspace…" : "Open Sales Office"}
          <ArrowRight size={16} />
        </button>
        {(message || error) && (
          <p className="form-error" role="alert">
            {message || error}
          </p>
        )}
        <small>
          <ShieldCheck size={13} /> Your prospect data stays behind server-side
          authentication.
        </small>
      </form>
    </div>
  );
}
function Stat({ title, value, sub, icon: Icon, accent }) {
  return (
    <div className={"stat " + (accent ? "accent" : "")}>
      <div className="stat-title">
        {title}
        <Icon size={17} />
      </div>
      <strong>{value}</strong>
      <small>{sub}</small>
    </div>
  );
}
function PanelHeader({ title, note, action, onClick }) {
  return (
    <div className="panel-header">
      <div>
        <h3>{title}</h3>
        {note && <p>{note}</p>}
      </div>
      {action && (
        <button className="text-button" onClick={onClick}>
          {action}
          <ArrowUpRight size={14} />
        </button>
      )}
    </div>
  );
}
function ProspectTable({ rows, all, filters, setFilters, onSelect, onExport }) {
  const [page, setPage] = useState(0);
  useEffect(() => setPage(0), [filters]);
  const set = (k, v) => setFilters((f) => ({ ...f, [k]: v }));
  return (
    <section className="panel animate-in">
      <div className="table-tabs">
        <button
          className={!filters.priority ? "selected" : ""}
          onClick={() => set("priority", "")}
        >
          All prospects <Badge>{fmt(all.length)}</Badge>
        </button>
        <button
          className={filters.priority === "shortlist" ? "selected" : ""}
          onClick={() => set("priority", "shortlist")}
        >
          Priority shortlist <Badge>100</Badge>
        </button>
        <button
          className={filters.priority === "broader" ? "selected" : ""}
          onClick={() => set("priority", "broader")}
        >
          Broader pool
        </button>
      </div>
      <div className="filters">
        <label className="search">
          <Search size={16} />
          <input
            aria-label="Search prospects"
            placeholder="Search companies, services, cities…"
            value={filters.search || ""}
            onChange={(e) => set("search", e.target.value)}
          />
        </label>
        <Select
          label="Stage"
          value={filters.stage}
          onChange={(v) => set("stage", v)}
          options={STAGES}
          all="All stages"
        />
        <Select
          label="Channel"
          value={filters.channel}
          onChange={(v) => set("channel", v)}
          options={CHANNELS}
          all="All channels"
        />
        <Select
          label="Industry"
          value={filters.industry}
          onChange={(v) => set("industry", v)}
          options={[...new Set(all.map((p) => p.industry))].sort()}
          all="All industries"
        />
        <Select
          label="City"
          value={filters.city}
          onChange={(v) => set("city", v)}
          options={[...new Set(all.map((p) => p.city))].sort()}
          all="All cities"
        />
        <button
          className="icon"
          title="Clear filters"
          aria-label="Clear filters"
          onClick={() => setFilters({})}
        >
          <X size={16} />
        </button>
      </div>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Company</th>
              <th>Industry & services</th>
              <th>Priority</th>
              <th>Stage</th>
              <th>Channel</th>
              <th>Next action</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.slice(page * 25, (page + 1) * 25).map((p, i) => (
              <tr key={p.id}>
                <td>
                  <button className="company-cell" onClick={() => onSelect(p)}>
                    <span className={"company-icon c" + (i % 5)}>
                      {p.name.slice(0, 2).toUpperCase()}
                    </span>
                    <span>
                      <strong>{p.name}</strong>
                      <small>
                        <MapPin size={11} />
                        {p.city}
                      </small>
                    </span>
                  </button>
                </td>
                <td>
                  <span>{p.industry}</span>
                  <small className="truncate">
                    {p.services || "Services not yet verified"}
                  </small>
                </td>
                <td>
                  <Badge tone={p.shortlist ? "green" : ""}>
                    {p.shortlist ? "01 · Hiring shortlist" : p.priority}
                  </Badge>
                </td>
                <td>
                  <Badge tone={p.suppressed ? "red" : ""}>
                    {p.suppressed ? "Suppressed" : p.stage}
                  </Badge>
                </td>
                <td>
                  <span className="channel-text">
                    {p.channel === "Email" ? (
                      <Mail size={13} />
                    ) : p.channel === "LinkedIn" ? (
                      <Linkedin size={13} />
                    ) : null}
                    {p.channel}
                  </span>
                </td>
                <td>
                  <span className="truncate">
                    {p.nextAction || "Not assigned"}
                  </span>
                  {p.nextDate && <small>{p.nextDate}</small>}
                </td>
                <td>
                  <button
                    className="icon"
                    aria-label={"Open " + p.name}
                    onClick={() => onSelect(p)}
                  >
                    <ArrowUpRight size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!rows.length && (
        <Empty title="No prospects match">
          Adjust your filters to explore the directory.
        </Empty>
      )}
      <div className="pagination">
        <span>
          {rows.length
            ? `${page * 25 + 1}–${Math.min((page + 1) * 25, rows.length)}`
            : "0"}{" "}
          of {fmt(rows.length)} prospects
        </span>
        <div>
          <button
            className="icon"
            aria-label="Previous page"
            disabled={page === 0}
            onClick={() => setPage((p) => p - 1)}
          >
            <ChevronLeft size={16} />
          </button>
          <span>
            Page {page + 1} of {Math.max(1, Math.ceil(rows.length / 25))}
          </span>
          <button
            className="icon"
            aria-label="Next page"
            disabled={(page + 1) * 25 >= rows.length}
            onClick={() => setPage((p) => p + 1)}
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </section>
  );
}
function Hiring({ rows, onSelect }) {
  const [mode, setMode] = useState("all"),
    [search, setSearch] = useState("");
  const filtered = rows.filter(
    (p) =>
      (mode === "all" ||
        (mode === "verified"
          ? p.hiringVerification?.status === "Verified open"
          : mode === "feny"
            ? p.application?.applicant === "Feny Solanki"
            : p.application?.applicant === "Akash Solanki")) &&
      [p.name, p.job?.["Live advertised role"]]
        .join(" ")
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  return (
    <>
      <div className="stats-grid animate-in">
        <Stat
          title="Priority employers"
          value={rows.length}
          sub="Existing shortlist preserved"
          icon={Building2}
        />
        <Stat
          title="Reverified open"
          value={
            rows.filter((p) => p.hiringVerification?.status === "Verified open")
              .length
          }
          sub="Official role and application route checked"
          icon={CheckCircle2}
        />
        <Stat
          title="Feny · provisional route"
          value={
            rows.filter((p) => p.application?.applicant === "Feny Solanki")
              .length
          }
          sub="Full JD and candidate fit required"
          icon={Users}
        />
        <Stat
          title="Akash · provisional route"
          value={
            rows.filter((p) => p.application?.applicant === "Akash Solanki")
              .length
          }
          sub="Full JD and candidate fit required"
          icon={Users}
        />
      </div>
      <div className="notice">
        <Clock size={17} />
        <span>
          October vacancies are historical signals until rechecked. Personal
          applications and Trayaam partnership proposals have separate routes.{" "}
          <Link url="https://feny.trayaam.com">Feny’s latest portfolio</Link>
        </span>
      </div>
      <div className="filters">
        <label className="search">
          <Search size={16} />
          <input
            aria-label="Search hiring agencies"
            placeholder="Search employer or role…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <Select
          label="Hiring view"
          value={mode}
          onChange={setMode}
          options={["all", "verified", "feny", "akash"]}
        />
      </div>
      <div className="hiring-grid">
        {filtered.map((p) => (
          <button
            key={p.id}
            className="panel hiring-card animate-in"
            onClick={() => onSelect(p)}
          >
            <div className="card-top">
              <span className="company-icon">
                {p.name.slice(0, 2).toUpperCase()}
              </span>
              <Badge
                tone={
                  p.hiringVerification?.status === "Verified open"
                    ? "green"
                    : "amber"
                }
              >
                {p.hiringVerification?.status || "Needs recheck"}
              </Badge>
              <ArrowUpRight size={15} />
            </div>
            <h3>{p.name}</h3>
            <h4>{p.job["Live advertised role"]}</h4>
            <p>
              <MapPin size={13} />
              {p.job.Location || p.city}
            </p>
            <div className="hiring-detail">
              <span>{p.job.Department}</span>
              <span>{p.application?.applicant || "Fit review needed"}</span>
            </div>
            <small>
              Evidence:{" "}
              {p.hiringVerification?.checkedAt || p.job["Checked date"]} · Open
              to review
            </small>
          </button>
        ))}
      </div>
      {!filtered.length && (
        <Empty title="No verified matches in this view">
          Use all signals to review the retained shortlist.
        </Empty>
      )}
    </>
  );
}
function SalesOffice({ tasks, create, changeTask }) {
  const [team, setTeam] = useState("Outbound"),
    [view, setView] = useState("room"),
    [employee, setEmployee] = useState(null);
  const recent = tasks.filter(
      (t) => t.heartbeatAt && Date.now() - Date.parse(t.heartbeatAt) < 90000,
    ),
    connected = new Set(recent.map((t) => t.runtimeId)).size,
    active = recent.filter((t) => t.status === "Working"),
    queued = tasks.filter((t) => t.status === "Queued");
  const specialties = ROLES.filter((r) => r[3] === team);
  return (
    <>
      <div className="office-toolbar animate-in">
        <div className="office-status">
          <span className="status-dot amber-dot" />
          {connected ? "AI RUNTIME CONNECTED" : "AI RUNTIME DISCONNECTED"}{" "}
          <span className="muted">
            {connected
              ? "Heartbeat received within 90 seconds"
              : "Connect your orchestrator to activate workers"}
          </span>
        </div>
        <div className="segmented">
          <button
            className={view === "room" ? "selected" : ""}
            onClick={() => setView("room")}
          >
            Office floor
          </button>
          <button
            className={view === "roster" ? "selected" : ""}
            onClick={() => setView("roster")}
          >
            Team roster
          </button>
        </div>
      </div>
      <div className="office-metrics">
        <span>
          <b>76</b> dedicated seats
        </span>
        <span>
          <b>{active.length}</b> working
        </span>
        <span>
          <b>{queued.length}</b> queued tasks
        </span>
        <span>
          <b>{connected}</b> connected runtimes
        </span>
      </div>
      <div className="office-layout">
        <div>
          <div className="team-tabs">
            {[...new Set(ROLES.map((r) => r[3]))].map((t) => (
              <button
                key={t}
                className={team === t ? "selected" : ""}
                onClick={() => setTeam(t)}
              >
                {t}
              </button>
            ))}
          </div>
          {view === "room" ? (
            <section className="office-room">
              <div className="office-windows">
                <span />
                <span />
                <span />
                <span />
                <span />
                <span />
                <span />
              </div>
              <div className="office-wall">
                <span className="wall-logo">
                  trayaam<span>SALES & PARTNERSHIPS</span>
                </span>
                <div className="wall-screen">
                  <i />
                  MISSION CONTROL
                  <small>
                    {active.length} active · {queued.length} queued
                  </small>
                </div>
              </div>
              <div className="office-floor">
                <div className="office-boardroom">
                  <div className="conference-table">
                    <span>STRATEGY & SYNC</span>
                  </div>
                  <i />
                  <i />
                  <i />
                  <i />
                </div>
                <div className="desk-pods">
                  {specialties.map(([role, title]) => (
                    <div className="desk-pod" key={role}>
                      <span className="pod-label">{title}</span>
                      <div className="desks">
                        {EMPLOYEES.filter((e) => e.role === role).map((e) => {
                          const task = tasks.find(
                            (t) =>
                              t.agentId === e.id &&
                              !["Done", "Cancelled"].includes(t.status),
                          );
                          return (
                            <button
                              key={e.id}
                              className={"desk " + (task ? "occupied" : "")}
                              onClick={() => setEmployee(e)}
                              aria-label={`${e.name}: ${task?.status || "Idle · not connected"}`}
                            >
                              <span className="monitor">
                                <i />
                                <i />
                                <i />
                              </span>
                              <span className="desktop" />
                              <span className="chair" />
                              <span className="employee-person">
                                <i />
                              </span>
                              <span className="desk-number">
                                {e.id.split("-").at(-1).padStart(2, "0")}
                              </span>
                              <span className="desk-tooltip">
                                {e.name}
                                <small>
                                  {task?.title || "Idle · runtime disconnected"}
                                </small>
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="office-lounge">
                  <span className="plant">✳</span>
                  <div className="sofa" />
                  <div className="coffee-table" />
                  <span className="plant">✳</span>
                </div>
                <span className="floor-caption">
                  {team.toUpperCase()} DIVISION · CLICK A DESK TO INSPECT
                </span>
              </div>
            </section>
          ) : (
            <div className="roster-grid">
              {EMPLOYEES.filter((e) => e.team === team).map((e) => (
                <button
                  className="panel employee-card"
                  key={e.id}
                  onClick={() => setEmployee(e)}
                >
                  <span className="avatar">
                    <Bot size={20} />
                  </span>
                  <h3>{e.name}</h3>
                  <p>{e.mission}</p>
                  <Badge>
                    {tasks.find(
                      (t) =>
                        t.agentId === e.id &&
                        !["Done", "Cancelled"].includes(t.status),
                    )?.status || "Idle · not connected"}
                  </Badge>
                </button>
              ))}
            </div>
          )}
        </div>
        <aside className="panel capacity">
          <PanelHeader title="Capacity planner" />
          <p>
            Four specialists per role. Assign a free seat when the queue grows.
          </p>
          {specialties.map(([role, title]) => {
            const roleTasks = tasks.filter(
              (t) =>
                t.role === role && !["Done", "Cancelled"].includes(t.status),
            );
            return (
              <div className="capacity-role" key={role}>
                <strong>{title}</strong>
                <div className="capacity-seats">
                  {EMPLOYEES.filter((e) => e.role === role).map((e) => (
                    <button
                      key={e.id}
                      className={
                        roleTasks.some((t) => t.agentId === e.id) ? "taken" : ""
                      }
                      onClick={() => setEmployee(e)}
                      aria-label={e.name}
                    >
                      <Bot size={17} />
                    </button>
                  ))}
                </div>
                <small>
                  {new Set(roleTasks.map((t) => t.agentId)).size}/4 reserved ·{" "}
                  {roleTasks.length} tasks
                </small>
              </div>
            );
          })}
          <div className="capacity-note">
            <ShieldCheck size={16} />
            Outbound actions require separate approval. Queuing a task does not
            send outreach.
          </div>
        </aside>
      </div>
      <section className="panel task-section">
        <PanelHeader
          title="Task control"
          note="Assignments, progress and handoffs for every specialist."
          action="Create task"
          onClick={() => create()}
        />
        {tasks.length ? (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Task</th>
                  <th>Employee</th>
                  <th>Status</th>
                  <th>Progress</th>
                  <th>Due</th>
                  <th>Update</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map((t) => (
                  <tr key={t.id}>
                    <td>
                      <strong>{t.title}</strong>
                      <small>{t.description}</small>
                    </td>
                    <td>
                      {EMPLOYEES.find((e) => e.id === t.agentId)?.name ||
                        "Unassigned"}
                    </td>
                    <td>
                      <Badge
                        tone={
                          t.status === "Blocked"
                            ? "red"
                            : t.status === "Done"
                              ? "green"
                              : ""
                        }
                      >
                        {t.status === "Working" &&
                        (!t.heartbeatAt ||
                          Date.now() - Date.parse(t.heartbeatAt) > 90000)
                          ? "Stale heartbeat"
                          : t.status}
                      </Badge>
                    </td>
                    <td>
                      <div className="progress-track">
                        <span style={{ width: t.progress + "%" }} />
                      </div>
                      <small>
                        {t.progress}% · {t.step || "Awaiting runtime"}
                      </small>
                      {t.output && (
                        <details>
                          <summary>Task output</summary>
                          <p style={{ whiteSpace: "pre-wrap", maxWidth: 280 }}>
                            {t.output}
                          </p>
                        </details>
                      )}
                    </td>
                    <td>{t.due || "Not set"}</td>
                    <td>
                      <Select
                        label={"Update " + t.title}
                        value={t.status}
                        onChange={(status) => changeTask(t, status)}
                        options={[
                          "Queued",
                          "Blocked",
                          "Awaiting review",
                          "Done",
                          "Cancelled",
                        ]}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty title="A clear desk. A focused start.">
            Create a task and assign a specialist. Work begins when the AI
            runtime is connected.
          </Empty>
        )}
      </section>
      {employee && (
        <div className="modal-backdrop" onClick={() => setEmployee(null)}>
          <section
            className="modal employee-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Employee details"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="icon modal-close"
              aria-label="Close employee"
              onClick={() => setEmployee(null)}
            >
              <X size={20} />
            </button>
            <span className="employee-avatar">
              <Bot size={33} />
            </span>
            <div className="eyebrow">
              {employee.team} / SEAT {employee.id.split("-").at(-1)}
            </div>
            <h2>{employee.name}</h2>
            <p>{employee.mission}</p>
            <Badge>Runtime disconnected</Badge>
            <div className="employee-info">
              <strong>Role boundaries</strong>
              <p>
                Use recorded sources, preserve uncertainty, keep a task log and
                hand off to the next specialist. No sending or applications
                without explicit approval.
              </p>
            </div>
            <button
              className="btn primary"
              onClick={() => {
                create(employee.id);
                setEmployee(null);
              }}
            >
              Assign task
              <Plus size={15} />
            </button>
          </section>
        </div>
      )}
    </>
  );
}
function World({ prospects, filters, setFilters, onSelect }) {
  const [city, setCity] = useState(""),
    [selected, setSelected] = useState(null);
  const rows = prospects.filter((p) => !city || p.city === city);
  return (
    <div className="world-layout">
      <section className="world-stage">
        <Gradient />
        <div className="world-caption">
          <div className="eyebrow">PROSPECT INTELLIGENCE</div>
          <h2>
            Your network,
            <br />
            in perspective.
          </h2>
          <p>Source-listed coordinates. No invented locations.</p>
        </div>
        <Globe prospects={rows} selected={selected} large />
        <div className="world-summary">
          <span>
            <strong>{fmt(rows.length)}</strong> companies
          </span>
          <span>
            <strong>{new Set(rows.map((p) => p.city)).size}</strong> search
            cities
          </span>
          <span>
            <strong>{rows.filter((p) => !p.coordinates.length).length}</strong>{" "}
            unmapped
          </span>
        </div>
      </section>
      <section className="panel world-list">
        <PanelHeader title="Location explorer" />
        <Select
          label="Filter location"
          value={city}
          onChange={setCity}
          all="All cities"
          options={[...new Set(prospects.map((p) => p.city))].sort()}
        />
        <div className="location-list">
          {rows.slice(0, 100).map((p) => (
            <button
              key={p.id}
              onClick={() => {
                setSelected(p);
                onSelect(p);
              }}
            >
              <span className="company-icon">
                {p.name.slice(0, 2).toUpperCase()}
              </span>
              <span>
                <strong>{p.name}</strong>
                <small>
                  {p.city} ·{" "}
                  {p.coordinates.length ? "Source-listed location" : "Unmapped"}
                </small>
              </span>
              <ArrowUpRight size={15} />
            </button>
          ))}
        </div>
        <small>
          Showing first 100 matches. Full directory available in Prospects.
        </small>
      </section>
    </div>
  );
}
function Analytics({ prospects, events }) {
  const [days, setDays] = useState("30"),
    [channel, setChannel] = useState("");
  const cutoff = Date.now() - Number(days) * 86400000;
  const filtered = events.filter(
    (e) =>
      (days === "all" || Date.parse(e.at) >= cutoff) &&
      (!channel || e.channel === channel),
  );
  const m = metrics(prospects, filtered);
  const stages = STAGES.map((s) => ({
    name: s,
    count: prospects.filter((p) => p.stage === s).length,
  }));
  return (
    <>
      <div className="filters">
        <Select
          label="Reporting period"
          value={days}
          onChange={setDays}
          options={["7", "30", "90", "all"]}
        />
        <span className="muted">
          days · activities within period; pipeline is current
        </span>
        <Select
          label="Analytics channel"
          value={channel}
          onChange={setChannel}
          options={CHANNELS.filter((c) => c !== "Unassigned")}
          all="All channels"
        />
      </div>
      <div className="stats-grid">
        <Stat
          title="Outbound touches"
          value={m.sent}
          sub="Manually recorded sent events"
          icon={Send}
        />
        <Stat
          title="Unique accounts reached"
          value={m.reached}
          sub="Deduplicated by company ID"
          icon={Users}
        />
        <Stat
          title="Account reply rate"
          value={
            m.replyRate === null ? "—" : (m.replyRate * 100).toFixed(1) + "%"
          }
          sub="Replying sent accounts / reached accounts"
          icon={ChartNoAxesCombined}
        />
        <Stat
          title="Open pipeline · GBP"
          value={"£" + fmt(m.pipeline)}
          sub="Unweighted recorded deal values"
          icon={Target}
        />
      </div>
      <div className="analytics-grid">
        <section className="panel">
          <PanelHeader
            title="Channel performance"
            note="Actual recorded events. Empty denominators remain blank."
          />
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Channel</th>
                  <th>Sent</th>
                  <th>Replies</th>
                  <th>Bounced</th>
                </tr>
              </thead>
              <tbody>
                {CHANNELS.filter((c) => c !== "Unassigned").map((c) => (
                  <tr key={c}>
                    <td>{c}</td>
                    {["Sent", "Replied", "Bounced"].map((o) => (
                      <td key={o}>
                        {
                          filtered.filter(
                            (e) =>
                              e.type === "outreach" &&
                              e.channel === c &&
                              e.outcome === o,
                          ).length
                        }
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
        <section className="panel">
          <PanelHeader
            title="Stage distribution"
            note="Current relationship states across the agency directory"
          />
          <div className="distribution">
            {stages.map((s) => (
              <div key={s.name}>
                <span>{s.name}</span>
                <div className="bar-track">
                  <span
                    style={{
                      width:
                        Math.max(
                          s.count ? 1 : 0,
                          (s.count / Math.max(prospects.length, 1)) * 100,
                        ) + "%",
                    }}
                  />
                </div>
                <strong>{s.count}</strong>
              </div>
            ))}
          </div>
        </section>
      </div>
      <section className="panel">
        <PanelHeader
          title="Activity timeline"
          note="Applications remain separate from company outreach."
        />
        {filtered.length ? (
          <div className="activity-feed">
            {filtered.slice(0, 100).map((e) => (
              <div key={e.id}>
                <span className="activity-icon">
                  <Activity size={16} />
                </span>
                <div>
                  <strong>
                    {e.companyName || e.prospectId} · {e.outcome || e.type}
                  </strong>
                  <p>{e.note}</p>
                  <small>
                    {e.channel} · {new Date(e.at).toLocaleString("en-GB")}
                  </small>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <Empty title="Your story is just getting started">
            Record outreach activity from a prospect profile to build a reliable
            performance history.
          </Empty>
        )}
      </section>
    </>
  );
}
function Assets() {
  const assets = [
    [
      "Feny Solanki",
      "Performance marketing portfolio",
      "Meta and LinkedIn paid media, organic social, campaign creative and reporting. Updated portfolio reviewed 4 November 2026.",
      "https://feny.trayaam.com",
      "Paid media · Social · Healthcare",
      "FS",
    ],
    [
      "Trayaam",
      "Agency portfolio",
      "White-label engineering and digital delivery. Keep company proposals separate from personal job applications.",
      "https://trayaam.com",
      "Agency partnerships",
      "t.",
    ],
    [
      "West England Service",
      "Property maintenance website",
      "Relevant website delivery example for service businesses.",
      "https://westenglandservice.com",
      "Website development",
      "WE",
    ],
    [
      "Deepak Products",
      "Manufacturing website",
      "Manufacturing portfolio reference for an industry-specific conversation.",
      "https://deepakproducts.trayaam.com",
      "Manufacturing · Website",
      "DP",
    ],
    [
      "Dietz",
      "Manufacturing website",
      "Additional engineering and manufacturing website reference.",
      "https://dietz.trayaam.com",
      "Manufacturing · Website",
      "DZ",
    ],
    [
      "Trayaam ERP",
      "Business systems",
      "ERP reference. Access restrictions may apply; confirm fit and access before sharing.",
      "https://erp.trayaam.com",
      "ERP · Business software",
      "ER",
    ],
  ];
  return (
    <>
      <div className="notice">
        <FolderOpen size={17} />
        Choose assets for the prospect’s actual need. Feny’s portfolio contains
        platform-attributed outcomes; verified revenue and purchase ROAS are
        unavailable.
      </div>
      <div className="asset-grid">
        {assets.map(([name, title, description, url, tags, initials], i) => (
          <article className="panel asset-card" key={name}>
            <div className={"asset-cover asset-" + i}>
              <span>{initials}</span>
              <div className="cover-lines" />
            </div>
            <div className="asset-content">
              <div className="eyebrow">{tags}</div>
              <h2>{name}</h2>
              <h4>{title}</h4>
              <p>{description}</p>
              <Link url={url} className="text-button">
                Open portfolio
              </Link>
            </div>
          </article>
        ))}
      </div>
    </>
  );
}
function DataSettings({ data }) {
  const inventory = data.inventory || [];
  const [search, setSearch] = useState("");
  return (
    <>
      <div className="settings-grid">
        <section className="panel settings-card">
          <ShieldCheck size={24} />
          <h3>Private by design</h3>
          <p>
            Prospect records live in D1, behind server-side session
            authentication. The public repository contains application code and
            documentation only.
          </p>
          <Badge tone="green">No contact data in the frontend bundle</Badge>
        </section>
        <section className="panel settings-card">
          <Bot size={24} />
          <h3>AI connection</h3>
          <p>
            Runtime is not connected. Agent roles, queues and handoffs are
            prepared. Working status requires a signed runtime update and
            heartbeat.
          </p>
          <Badge>Integration pending</Badge>
        </section>
        <section className="panel settings-card">
          <Mail size={24} />
          <h3>Sending controls</h3>
          <p>
            No email, LinkedIn, phone or application sending is enabled. Keep
            personal applications, company outreach, eligibility and suppression
            distinct.
          </p>
          <Badge tone="amber">Production outreach on hold</Badge>
        </section>
      </div>
      <SourceBrowser inventory={inventory} />
      <section className="panel">
        <PanelHeader
          title="Source register"
          note={`${inventory.length} CSV sources indexed. Canonical companies are deduplicated; starter data stays outside the active pipeline.`}
        />
        <div className="filters">
          <label className="search">
            <Search size={16} />
            <input
              aria-label="Search source register"
              placeholder="Find a source file…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Source artifact</th>
                <th>Rows</th>
                <th>Classification</th>
                <th>Integrity</th>
              </tr>
            </thead>
            <tbody>
              {inventory
                .filter((s) =>
                  s.path.toLowerCase().includes(search.toLowerCase()),
                )
                .map((s) => (
                  <tr key={s.path}>
                    <td className="source-path">{s.path}</td>
                    <td>{fmt(s.rows)}</td>
                    <td>{s.classification}</td>
                    <td>
                      <code title={s.sha256}>{s.sha256.slice(0, 10)}</code>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </section>
      <section className="panel settings-card">
        <h3>Campaign context</h3>
        <p>
          UK first, Ireland second, continental Europe third. Start with the
          existing 100-company vacancy-backed shortlist. A vacancy is evidence
          of hiring, not proof of outsourcing demand. Fixed-price white-label
          project delivery and personal resource applications are separate
          offers.
        </p>
        <p>
          Historical submission evidence: GLO / Feny and Inspire Digital / Akash
          received visible acceptance on official forms. Email receipts remain
          unverified. Availability recorded in October is superseded by Feny’s 3
          November résumé: serving notice, last working day 27 November 2026.
        </p>
      </section>
    </>
  );
}
function ProspectDrawer({ p, onClose, save, busy, events, addEvent }) {
  const [section, setSection] = useState("Overview"),
    [form, setForm] = useState({ ...p }),
    [note, setNote] = useState(""),
    [outcome, setOutcome] = useState("Note"),
    [channel, setChannel] = useState(
      p.channel === "Unassigned" ? "Email" : p.channel,
    );
  const dialog = useRef(null);
  useEffect(() => {
    const last = document.activeElement;
    dialog.current?.focus();
    const fn = (e) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab") {
        const nodes = [
          ...dialog.current.querySelectorAll(
            "button,input,select,textarea,a[href]",
          ),
        ].filter((n) => !n.disabled);
        if (e.shiftKey && document.activeElement === nodes[0]) {
          e.preventDefault();
          nodes.at(-1)?.focus();
        } else if (!e.shiftKey && document.activeElement === nodes.at(-1)) {
          e.preventDefault();
          nodes[0]?.focus();
        }
      }
    };
    document.addEventListener("keydown", fn);
    return () => {
      document.removeEventListener("keydown", fn);
      last?.focus();
    };
  }, []);
  const field = (key, value) => setForm((f) => ({ ...f, [key]: value }));
  return (
    <div className="drawer-backdrop" onClick={onClose}>
      <aside
        ref={dialog}
        tabIndex={-1}
        className="drawer"
        role="dialog"
        aria-modal="true"
        aria-label={p.name + " prospect profile"}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="drawer-header">
          <span className="eyebrow">PROSPECT PROFILE / {p.id}</span>
          <button
            className="icon"
            aria-label="Close prospect"
            onClick={onClose}
          >
            <X size={21} />
          </button>
        </div>
        <div className="drawer-company">
          <span className="company-icon">
            {p.name.slice(0, 2).toUpperCase()}
          </span>
          <h2>{p.name}</h2>
          <p>
            <MapPin size={14} />
            {p.city}, {p.country}
          </p>
          <div>
            <Badge tone={p.shortlist ? "green" : ""}>
              {p.shortlist ? "Priority 01 · Hiring shortlist" : p.priority}
            </Badge>
            <Badge>{p.industry}</Badge>
          </div>
        </div>
        <div className="drawer-tabs">
          {["Overview", "Activity", "Hiring", "Evidence", "Drafts"].map((s) => (
            <button
              className={s === section ? "selected" : ""}
              key={s}
              onClick={() => setSection(s)}
            >
              {s}
            </button>
          ))}
        </div>
        <div className="drawer-body">
          {section === "Overview" && (
            <>
              <div className="contact-links">
                <Link url={p.website}>Website</Link>
                <Link url={p.linkedin}>LinkedIn</Link>
                <Link url={p.contactPage}>Contact page</Link>
              </div>
              <div className="detail-grid">
                <div>
                  <small>Published business email</small>
                  <strong>{p.email || "Not recorded"}</strong>
                  <small>{p.emailStatus}</small>
                </div>
                <div>
                  <small>Phone</small>
                  <strong>{p.phone || "Not recorded"}</strong>
                </div>
                <div>
                  <small>Services observed</small>
                  <p>{p.services || "Unknown"}</p>
                </div>
                <div>
                  <small>Proposed offer</small>
                  <p>{p.offer || "Review required"}</p>
                </div>
              </div>
              {p.suppressed && (
                <div className="notice danger">
                  Suppressed:{" "}
                  {p.suppressionReason || "Recorded do-not-contact instruction"}
                </div>
              )}
              <form
                className="edit-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  save({
                    stage: form.stage,
                    channel: form.channel,
                    owner: form.owner,
                    nextAction: form.nextAction,
                    nextDate: form.nextDate,
                    notes: form.notes,
                    value: Number(form.value) || 0,
                    suppressed: form.suppressed,
                    eligibility: form.eligibility,
                  });
                }}
              >
                <div className="form-grid">
                  <label>
                    Relationship stage
                    <Select
                      label="Relationship stage"
                      value={form.stage}
                      onChange={(v) => field("stage", v)}
                      options={STAGES}
                    />
                  </label>
                  <label>
                    Primary channel
                    <Select
                      label="Primary channel"
                      value={form.channel}
                      onChange={(v) => field("channel", v)}
                      options={CHANNELS}
                    />
                  </label>
                  <label>
                    Owner
                    <input
                      value={form.owner || ""}
                      onChange={(e) => field("owner", e.target.value)}
                      placeholder="Assign an owner"
                    />
                  </label>
                  <label>
                    Deal value · GBP
                    <input
                      type="number"
                      min="0"
                      value={form.value || 0}
                      onChange={(e) => field("value", e.target.value)}
                    />
                  </label>
                  <label>
                    Next-action date
                    <input
                      type="date"
                      value={form.nextDate || ""}
                      onChange={(e) => field("nextDate", e.target.value)}
                    />
                  </label>
                  <label>
                    Channel eligibility
                    <Select
                      label="Eligibility"
                      value={form.eligibility}
                      options={[
                        ...new Set([
                          form.eligibility,
                          "Needs review",
                          "Eligible",
                          "Blocked",
                        ]),
                      ]}
                      onChange={(v) => field("eligibility", v)}
                    />
                  </label>
                </div>
                <label>
                  Next action
                  <textarea
                    rows="2"
                    value={form.nextAction || ""}
                    onChange={(e) => field("nextAction", e.target.value)}
                  />
                </label>
                <label>
                  Internal notes
                  <textarea
                    rows="4"
                    value={form.notes || ""}
                    onChange={(e) => field("notes", e.target.value)}
                  />
                </label>
                <label className="checkbox">
                  <input
                    type="checkbox"
                    checked={form.suppressed}
                    onChange={(e) => field("suppressed", e.target.checked)}
                  />
                  Suppress all outreach for this prospect
                </label>
                <button className="btn primary" disabled={busy}>
                  {busy ? "Saving…" : "Save prospect"}
                  <Check size={15} />
                </button>
              </form>
            </>
          )}
          {section === "Activity" && (
            <>
              <form
                className="edit-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  addEvent({
                    prospectId: p.id,
                    companyName: p.name,
                    type: outcome === "Note" ? "note" : "outreach",
                    outcome,
                    channel,
                    note,
                  });
                  setNote("");
                }}
              >
                <h3>Record an activity</h3>
                <p className="muted">
                  Log an observed outcome. This does not send a message.
                </p>
                <div className="form-grid">
                  <Select
                    label="Activity outcome"
                    value={outcome}
                    onChange={setOutcome}
                    options={[
                      "Note",
                      "Sent",
                      "Replied",
                      "Bounced",
                      "Meeting",
                      "Opted out",
                    ]}
                  />
                  <Select
                    label="Activity channel"
                    value={channel}
                    onChange={setChannel}
                    options={CHANNELS.filter((c) => c !== "Unassigned")}
                  />
                </div>
                <label>
                  Evidence / activity note
                  <textarea
                    required
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="What happened? Include evidence or the next step."
                    rows="4"
                  />
                </label>
                <button className="btn primary">
                  Record activity
                  <Plus size={15} />
                </button>
              </form>
              <div className="activity-feed">
                {events.map((e) => (
                  <div key={e.id}>
                    <Activity size={16} />
                    <div>
                      <strong>{e.outcome}</strong>
                      <p>{e.note}</p>
                      <small>
                        {e.channel} · {new Date(e.at).toLocaleString()}
                      </small>
                    </div>
                  </div>
                ))}
              </div>
              {!events.length && (
                <Empty title="No new activity recorded">
                  Historical application outcomes remain under Hiring.
                </Empty>
              )}
            </>
          )}
          {section === "Hiring" &&
            (p.job ? (
              <>
                <h3>{p.job["Live advertised role"]}</h3>
                <Badge tone="amber">
                  {p.hiringVerification?.status || "Needs recheck"}
                </Badge>
                <p>
                  Original checked date: {p.job["Checked date"]}. Current
                  recheck:{" "}
                  {p.hiringVerification?.checkedAt || "Not yet completed"}.
                </p>
                <p>{p.hiringVerification?.note}</p>
                <div className="detail-grid">
                  <div>
                    <small>Department</small>
                    {p.job.Department}
                  </div>
                  <div>
                    <small>Provisional applicant</small>
                    {p.application?.applicant || "Review required"}
                  </div>
                  <div>
                    <small>Application route</small>
                    <p>
                      {p.application?.application_route_status ||
                        p.job["Application status"]}
                    </p>
                  </div>
                  <div>
                    <small>Recorded application status</small>
                    <p>{p.application?.application_status}</p>
                    <small>{p.application?.confirmation_status}</small>
                  </div>
                </div>
                <Link url={p.job["Job URL"]}>Review official opening</Link>
                <p>
                  {p.application?.applicant === "Feny Solanki" ? (
                    <Link url="https://feny.trayaam.com">
                      Feny’s latest portfolio
                    </Link>
                  ) : (
                    <Link url="https://trayaam.com">
                      Trayaam engineering portfolio
                    </Link>
                  )}
                </p>
                <div className="notice">
                  Match the full JD, location restrictions, availability and
                  required skills before applying. Feny’s current résumé records
                  last working day 27 November 2026. Email-only application
                  routes remain on hold.
                </div>
                <h4>Current role checks</h4>
                {p.hiringVerification?.roles?.map((r, i) => (
                  <div className="evidence-row" key={i}>
                    <strong>{r.title}</strong>
                    <p>{r.fit}</p>
                    <Link url={r.url}>Official role page</Link>
                  </div>
                ))}
              </>
            ) : (
              <Empty title="No captured hiring evidence">
                This agency is in the broader pool. A vacancy must be verified
                before adding a hiring signal.
              </Empty>
            ))}
          {section === "Drafts" && <Drafts id={p.id} />}{" "}
          {section === "Evidence" && (
            <>
              <h3>Source and qualification</h3>
              <div className="detail-grid">
                <div>
                  <small>Source checked</small>
                  {p.checkedAt}
                </div>
                <div>
                  <small>Fit classification</small>
                  {p.fit}
                </div>
                <div>
                  <small>Technology signals</small>
                  {p.technology || "Unknown"}
                </div>
                <div>
                  <small>Listing rating</small>
                  {p.rating || "Unknown"} / 5 · {p.reviewCount || 0} reviews
                </div>
              </div>
              <p className="source-path">{p.sources}</p>
              <Link url={p.emailSource}>Published email evidence</Link>
              <h4>Decision-maker research</h4>
              <div className="detail-grid">
                <div>
                  <small>Contact candidate</small>
                  {p.decisionMakerResearch?.["Decision maker"] ||
                    p.job?.["Decision maker"] ||
                    "Not established"}
                  <p>
                    {p.decisionMakerResearch?.Role ||
                      p.job?.["Decision maker title"]}
                  </p>
                </div>
                <div>
                  <small>Team size · source-reported</small>
                  {p.decisionMakerResearch?.["Employee band"] ||
                    p.job?.["Employee band"] ||
                    "Unknown"}
                </div>
              </div>
              <p className="muted">
                {p.decisionMakerResearch?.["Research note"]}
              </p>
              <Link
                url={
                  p.decisionMakerResearch?.["Decision maker LinkedIn"] ||
                  p.job?.["Personal LinkedIn URL"]
                }
              >
                Public professional profile
              </Link>
              <p>
                <Link url={p.decisionMakerResearch?.["Evidence URL"]}>
                  Company research evidence
                </Link>
              </p>
              <h4>Source-listed locations</h4>
              {p.coordinates.map((c, i) => (
                <div className="evidence-row" key={i}>
                  <p>
                    {c.address} · {c.lat.toFixed(5)}, {c.lng.toFixed(5)}
                  </p>
                  <small>{c.basis}</small>
                  <Link url={c.source}>Open source map</Link>
                </div>
              ))}
              <h4>Published contacts</h4>
              {p.contacts.map((c, i) => (
                <div className="evidence-row" key={i}>
                  <strong>{c.email}</strong>
                  <small>{c.status}</small>
                  <Link url={c.source_url}>Source</Link>
                </div>
              ))}
              <h4>Preserved source fields</h4>
              <details>
                <summary>View original imported record</summary>
                <pre>{JSON.stringify(p.original, null, 2)}</pre>
              </details>
            </>
          )}
        </div>
      </aside>
    </div>
  );
}
function TaskModal({ agent, prospects, tasks, onClose, onSubmit }) {
  const [role, setRole] = useState(
      EMPLOYEES.find((e) => e.id === agent)?.role || "research",
    ),
    [agentId, setAgentId] = useState(agent || "research-1");
  const [title, setTitle] = useState(""),
    [description, setDescription] = useState(""),
    [prospectId, setProspectId] = useState(""),
    [due, setDue] = useState("");
  const ref = useRef();
  useEffect(() => {
    ref.current?.focus();
    const fn = (e) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab") {
        const nodes = [
          ...ref.current.querySelectorAll("button,input,select,textarea"),
        ].filter((n) => !n.disabled);
        if (e.shiftKey && document.activeElement === nodes[0]) {
          e.preventDefault();
          nodes.at(-1)?.focus();
        } else if (!e.shiftKey && document.activeElement === nodes.at(-1)) {
          e.preventDefault();
          nodes[0]?.focus();
        }
      }
    };
    document.addEventListener("keydown", fn);
    return () => document.removeEventListener("keydown", fn);
  }, []);
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <form
        ref={ref}
        tabIndex={-1}
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label="Create task"
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit({
            title,
            description,
            role,
            agentId,
            prospectId,
            due,
            status: "Queued",
            progress: 0,
          });
        }}
      >
        <button
          type="button"
          className="icon modal-close"
          aria-label="Close task form"
          onClick={onClose}
        >
          <X size={20} />
        </button>
        <div className="eyebrow">SALES OFFICE / NEW ASSIGNMENT</div>
        <h2>Make the next move.</h2>
        <p>Choose a specialist and give the task a clear outcome.</p>
        <label>
          Task title
          <input
            required
            maxLength={180}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Recheck the first 10 priority vacancies"
          />
        </label>
        <label>
          Specialty
          <Select
            label="Task specialty"
            value={role}
            onChange={(v) => {
              setRole(v);
              setAgentId(v + "-1");
            }}
            options={ROLES.map((r) => r[0])}
          />
        </label>
        <label>
          Dedicated employee
          <select value={agentId} onChange={(e) => setAgentId(e.target.value)}>
            {EMPLOYEES.filter((e) => e.role === role).map((e) => (
              <option key={e.id} value={e.id}>
                {e.name} ·{" "}
                {tasks.some(
                  (t) =>
                    t.agentId === e.id &&
                    !["Done", "Cancelled"].includes(t.status),
                )
                  ? "reserved"
                  : "free"}
              </option>
            ))}
          </select>
        </label>
        <label>
          Prospect (optional)
          <select
            value={prospectId}
            onChange={(e) => setProspectId(e.target.value)}
          >
            <option value="">General office task</option>
            {prospects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Due date
          <input
            type="date"
            value={due}
            onChange={(e) => setDue(e.target.value)}
          />
        </label>
        <label>
          Instructions & acceptance criteria
          <textarea
            required
            rows="3"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Expected output, sources to check and handoff destination…"
          />
        </label>
        <div className="notice">
          Tasks queue now. Execution requires the AI runtime connection.
        </div>
        <button className="btn primary">
          Create assignment
          <ArrowRight size={16} />
        </button>
      </form>
    </div>
  );
}
createRoot(document.getElementById("root")).render(<App />);
