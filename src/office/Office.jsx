import React, { useEffect, useRef, useState, useMemo } from "react";
import {
  Play,
  Pause,
  Plus,
  Minus,
  RotateCcw,
  Focus,
  Move3d,
  Armchair,
  UserRound,
  Users,
  Check,
  Save,
  MousePointer2,
  Search,
  ChevronDown,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  AlertCircle,
  Monitor,
  Flower2,
  Sun,
  Building2,
  Layers3,
  Settings2,
  Trash2,
  RotateCw,
  BriefcaseBusiness,
  Expand,
  Keyboard,
  Palette,
} from "lucide-react";
import { EMPLOYEES, ROLES } from "../model";
import { api } from "../api";
import { createOfficeEngine } from "./engine";
import {
  defaultOffice,
  employeeStyle,
  TEAMS,
  SKINS,
  OUTFITS,
  HAIRS,
  actualStatus,
} from "./config";
import "./office.css";
const catalog = [
  ["select", "Select & move", MousePointer2],
  ["desk", "Workstation", Monitor],
  ["sofa", "Sofa", Armchair],
  ["plant", "Plant", Flower2],
  ["table", "Table", Layers3],
  ["lamp", "Floor light", Sun],
  ["partition", "Partition", Building2],
  ["bookshelf", "Bookcase", BriefcaseBusiness],
  ["art", "Sculpture", Palette],
];
const roleLabel = (id) => ROLES.find((r) => r[0] === id)?.[1] || id;
function Swatches({ label, options, value, onChange }) {
  return (
    <fieldset className="office-swatches">
      <legend>{label}</legend>
      <div>
        {options.map((color) => (
          <button
            type="button"
            key={color}
            aria-label={label + " " + color}
            aria-pressed={value === color}
            style={{ background: color }}
            className={value === color ? "chosen" : ""}
            onClick={() => onChange(color)}
          />
        ))}
      </div>
      <input
        type="color"
        aria-label={"Custom " + label.toLowerCase()}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </fieldset>
  );
}
export default function Office({ tasks, create, changeTask }) {
  const [team, setTeam] = useState("Data lab"),
    [wing, setWing] = useState(0),
    [mode, setMode] = useState("live"),
    [config, setConfig] = useState(defaultOffice),
    [version, setVersion] = useState(0),
    [ready, setReady] = useState(false),
    [dirty, setDirty] = useState(false),
    [saving, setSaving] = useState(false),
    [message, setMessage] = useState(""),
    [error, setError] = useState(""),
    [selectedId, setSelectedId] = useState("dataresearch-1"),
    [playing, setPlaying] = useState(true),
    [panel, setPanel] = useState("employee"),
    [tool, setTool] = useState("select"),
    [selectedObject, setSelectedObject] = useState(null),
    [rosterSearch, setRosterSearch] = useState(""),
    [view, setView] = useState("perspective");
  const host = useRef(),
    engine = useRef(),
    state = useRef(),
    cameraState = useRef(null);
  state.current = { config, tool, selectedObject, selectedId };
  const teamEmployees = useMemo(
    () => EMPLOYEES.filter((e) => e.team === team),
    [team],
  );
  const employees = useMemo(
    () => teamEmployees.slice(wing * 16, wing * 16 + 16),
    [teamEmployees, wing],
  );
  const selected = EMPLOYEES.find((e) => e.id === selectedId) || employees[0];
  const style = {
    ...employeeStyle(selected.id),
    ...config.employees[selected.id],
  };
  const currentTask = tasks.find(
    (t) =>
      t.agentId === selected.id && !["Done", "Cancelled"].includes(t.status),
  );
  const recent = tasks.filter(
      (t) => t.heartbeatAt && Date.now() - Date.parse(t.heartbeatAt) < 90000,
    ),
    working = recent.filter((t) => t.status === "Working").length;
  async function load() {
    try {
      const data = await api("office");
      setConfig(data.config || defaultOffice());
      setVersion(data.version);
      setDirty(false);
      setError("");
      setReady(true);
    } catch (e) {
      setError(e.message);
      setReady(false);
    }
  }
  useEffect(() => {
    load();
  }, []);
  const visualKey = JSON.stringify([
    config.theme,
    config.lighting,
    config.floor,
    config.wall,
    config.objects,
    Object.entries(config.employees).map(
      ([id, { displayName, ...appearance }]) => [id, appearance],
    ),
  ]);
  const update = (key, value) => {
    setConfig((c) => ({
      ...c,
      [key]: value,
      ...(key === "theme"
        ? {
            penthouse: { lighting: "daylight", floor: "oak", wall: "ivory" },
            studio: { lighting: "sunset", floor: "marble", wall: "sage" },
            midnight: { lighting: "night", floor: "slate", wall: "charcoal" },
          }[value]
        : {}),
    }));
    setDirty(true);
  };
  function customize(key, value) {
    setConfig((c) => ({
      ...c,
      employees: {
        ...c.employees,
        [selected.id]: { ...c.employees[selected.id], [key]: value },
      },
    }));
    setDirty(true);
  }
  function chooseEmployee(id) {
    const employee = EMPLOYEES.find((e) => e.id === id);
    if (employee) {
      if (employee.team !== team) setTeam(employee.team);
      const teamMembers = EMPLOYEES.filter((e) => e.team === employee.team);
      setWing(Math.floor(teamMembers.findIndex((e) => e.id === id) / 16));
      setSelectedId(id);
      setPanel("employee");
    }
  }
  const place = (position) => {
    const s = state.current;
    if (s.tool === "select") {
      if (s.selectedObject) {
        setConfig((c) => ({
          ...c,
          objects: c.objects.map((o) =>
            o.id === s.selectedObject ? { ...o, ...position } : o,
          ),
        }));
        setDirty(true);
      }
      return;
    }
    if (s.config.objects.length >= 300) {
      setMessage("Office limit: 300 furniture items.");
      return;
    }
    const object = {
      id: crypto.randomUUID(),
      type: s.tool,
      ...position,
      rotation: 0,
      color:
        s.tool === "plant"
          ? "#48674b"
          : s.tool === "sofa"
            ? "#c8bba2"
            : "#a88c64",
    };
    setConfig((c) => ({ ...c, objects: [...c.objects, object] }));
    setSelectedObject(object.id);
    setDirty(true);
  };
  useEffect(() => {
    if (!ready || !host.current) return;
    try {
      setError("");
      engine.current = createOfficeEngine(host.current, {
        employees,
        config,
        selectedId: state.current.selectedId,
        playing,
        mode,
        tool,
        onSelect: chooseEmployee,
        onObjectSelect: (id) => {
          setSelectedObject(id);
          setPanel("build");
        },
        onPlace: place,
        onMove: (id, pos) => {
          setConfig((c) => ({
            ...c,
            positions: { ...c.positions, [id]: pos },
          }));
          setDirty(true);
        },
      });
      if (cameraState.current)
        engine.current.restoreCamera(cameraState.current);
    } catch (e) {
      setError(
        "3D rendering could not start. Use the employee roster below. " +
          e.message,
      );
    }
    return () => {
      cameraState.current = engine.current?.getCamera() || cameraState.current;
      engine.current?.dispose();
      engine.current = null;
    };
  }, [ready, team, wing, visualKey]);
  useEffect(() => {
    engine.current?.select(selectedId);
  }, [selectedId]);
  useEffect(() => {
    engine.current?.setMode(mode, tool);
  }, [mode, tool]);
  useEffect(() => {
    engine.current?.play(playing);
  }, [playing]);
  async function save() {
    if (saving || !ready) return;
    const sentConfig = {
      ...state.current.config,
      positions: {
        ...state.current.config.positions,
        ...engine.current?.getPositions(),
      },
    };
    setConfig(sentConfig);
    state.current.config = sentConfig;
    setSaving(true);
    try {
      const data = await api(
        "office",
        { config: sentConfig, version },
        "PATCH",
      );
      setVersion(data.version);
      const unchanged = state.current.config === sentConfig;
      setDirty(!unchanged);
      setMessage(
        unchanged
          ? "Office saved. Your layout and characters are available across devices."
          : "Snapshot saved. You have newer changes still to save.",
      );
    } catch (e) {
      setMessage(e.message + " Your unsaved design is still open.");
    } finally {
      setSaving(false);
    }
  }
  function changeTeam(value) {
    setTeam(value);
    setWing(0);
    setSelectedId(EMPLOYEES.find((e) => e.team === value).id);
    setSelectedObject(null);
  }
  function editObject(patch) {
    setConfig((c) => ({
      ...c,
      objects: c.objects.map((o) =>
        o.id === selectedObject ? { ...o, ...patch } : o,
      ),
    }));
    setDirty(true);
  }
  const object = config.objects.find((o) => o.id === selectedObject);
  return (
    <div className="office-v2">
      <div className="studio-topline">
        <div className="studio-location">
          <span className="studio-tag">TRAYAAM HEADQUARTERS</span>
          <span className="studio-address">
            The partnership floor <span> / </span> Level 32
          </span>
        </div>
        <div className="studio-save-state">
          <span className={"tiny-light " + (dirty ? "unsaved" : "")} />
          {!ready
            ? error
              ? "Office unavailable"
              : "Loading office…"
            : dirty
              ? "Unsaved changes"
              : "Office synchronized"}
          <button
            className="studio-button gold"
            disabled={saving || !dirty || !ready}
            onClick={save}
          >
            <Save size={14} />
            {saving ? "Saving…" : "Save office"}
          </button>
        </div>
      </div>
      <div className="office-modebar">
        <div className="studio-modes">
          {[
            ["live", "Live mode", Play],
            ["build", "Build mode", Armchair],
            ["team", "People", Users],
          ].map(([id, label, Icon]) => (
            <button
              key={id}
              className={mode === id ? "active" : ""}
              onClick={() => {
                setMode(id);
                setPanel(id === "build" ? "build" : "employee");
              }}
            >
              <Icon size={15} />
              {label}
            </button>
          ))}
        </div>
        <label className="division-picker">
          <span>DIVISION</span>
          <select
            aria-label="Office division"
            value={team}
            onChange={(e) => changeTeam(e.target.value)}
          >
            {TEAMS.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
          <ChevronDown size={14} />
        </label>
        {teamEmployees.length > 16 && (
          <label className="wing-picker">
            <span>Wing</span>
            <select
              aria-label="Office wing"
              value={wing}
              onChange={(e) => {
                const w = Number(e.target.value);
                setWing(w);
                setSelectedId(teamEmployees[w * 16].id);
              }}
            >
              {Array.from(
                { length: Math.ceil(teamEmployees.length / 16) },
                (_, i) => (
                  <option key={i} value={i}>
                    {i === 0 ? "East" : "West"} wing
                  </option>
                ),
              )}
            </select>
          </label>
        )}
        <div className="studio-runtime">
          <span className={"tiny-light " + (!recent.length ? "offline" : "")} />
          {recent.length ? "AI runtime connected" : "AI runtime offline"}
          <span className="studio-runtime-caption">
            {working} working ·{" "}
            {tasks.filter((t) => t.status === "Queued").length} queued
          </span>
        </div>
      </div>
      {message && (
        <div className="office-message" role="status">
          <CheckCircle2 size={16} />
          {message}
          <button onClick={() => setMessage("")} aria-label="Dismiss message">
            ×
          </button>
        </div>
      )}
      {error && (
        <div className="office-message error" role="alert">
          <AlertCircle size={16} />
          {error}
          <button onClick={load}>Retry loading</button>
        </div>
      )}
      <div className="studio-layout">
        <div className="studio-scene-column">
          <div className="studio-viewport">
            <div ref={host} className="three-host" />
            {!ready && !error && (
              <div className="studio-loading">
                <img src="/brand/trayaam-emblem.webp" alt="" />
                <span>Opening the partnership floor…</span>
              </div>
            )}
            <div className="scene-title">
              <div className="scene-live">
                <span />
                {mode === "build"
                  ? "DESIGN YOUR WORKPLACE"
                  : mode === "team"
                    ? "YOUR SPECIALIST ROSTER"
                    : "A SPACE FOR AMBITION"}
              </div>
              <h2>
                {team === "Data lab"
                  ? "Intelligence begins here."
                  : team === "Outbound"
                    ? "Every conversation matters."
                    : "Where good work comes together."}
              </h2>
              <p>
                {employees.length} specialists · {employees.length / 4} role
                teams · four seats per specialty
              </p>
            </div>
            <div className="scene-camera">
              <button
                aria-label="Zoom in"
                onClick={() => engine.current?.zoom(0.85)}
              >
                <Plus size={17} />
              </button>
              <button
                aria-label="Zoom out"
                onClick={() => engine.current?.zoom(1.15)}
              >
                <Minus size={17} />
              </button>
              <i />
              <button
                aria-label="Reset camera"
                onClick={() => {
                  engine.current?.reset();
                  setView("perspective");
                }}
              >
                <RotateCcw size={16} />
              </button>
              <button
                aria-label="Toggle top-down view"
                className={view === "top" ? "active" : ""}
                onClick={() => {
                  const next = view === "top" ? "perspective" : "top";
                  engine.current?.view(next);
                  setView(next);
                }}
              >
                <Layers3 size={17} />
              </button>
              <button
                aria-label="Focus selected employee"
                onClick={() => engine.current?.focus(selectedId)}
              >
                <Focus size={17} />
              </button>
            </div>
            <div className="scene-instructions">
              <MousePointer2 size={12} />
              {mode === "build"
                ? tool === "select"
                  ? "Select a furnishing, then click the floor to move it."
                  : "Click the floor to place your selected furnishing."
                : "Select an employee. Click the floor to walk, or use WASD."}
              <span>Drag to orbit · Scroll to zoom</span>
            </div>
            <div className="scene-bottom">
              <div className="scene-player">
                <span
                  className="avatar-sigil"
                  style={{ background: style.outfit, color: style.skin }}
                >
                  <UserRound size={23} />
                </span>
                <div>
                  <strong>{style.displayName}</strong>
                  <small>{selected.title}</small>
                </div>
                <span className="gold-diamond" />
              </div>
              <div className="scene-playback">
                <button
                  aria-label={playing ? "Pause movement" : "Resume movement"}
                  onClick={() => setPlaying(!playing)}
                >
                  {playing ? <Pause size={16} /> : <Play size={16} />}
                </button>
                <span>{playing ? "LIVE" : "PAUSED"}</span>
                <span className="scene-sim-note">Office simulation</span>
              </div>
            </div>
          </div>
          <div className="character-tray">
            <div className="tray-label">
              <span>YOUR {team.toUpperCase()} TEAM</span>
              <small>Select any employee to take control.</small>
            </div>
            <div className="character-row">
              {employees.map((e) => {
                const s = { ...employeeStyle(e.id), ...config.employees[e.id] };
                return (
                  <button
                    key={e.id}
                    aria-label={"Select " + s.displayName + " · " + e.title}
                    className={e.id === selectedId ? "selected" : ""}
                    onClick={() => chooseEmployee(e.id)}
                  >
                    <span
                      className="portrait"
                      style={{
                        "--skin": s.skin,
                        "--shirt": s.outfit,
                        "--hair": s.hair,
                      }}
                    >
                      <i className="portrait-hair" />
                      <i className="portrait-face" />
                      <i className="portrait-body" />
                    </span>
                    <strong>{s.displayName}</strong>
                    <small>{e.title}</small>
                    <span
                      className={
                        "portrait-status " +
                        (tasks.some(
                          (t) => t.agentId === e.id && t.status === "Queued",
                        )
                          ? "queued"
                          : "")
                      }
                    />
                  </button>
                );
              })}
            </div>
          </div>
        </div>
        <aside className="studio-inspector">
          {mode === "build" ? (
            <>
              <div className="inspector-kicker">
                <Armchair size={15} />
                BUILD STUDIO
              </div>
              <h3>Make room for great work.</h3>
              <p className="inspector-intro">
                Place furniture, move it, and choose the atmosphere of your
                office.
              </p>
              <div className="furniture-catalog">
                {catalog.map(([id, label, Icon]) => (
                  <button
                    key={id}
                    className={tool === id ? "active" : ""}
                    onClick={() => {
                      setTool(id);
                      setSelectedObject(null);
                    }}
                  >
                    <Icon size={21} />
                    <span>{label}</span>
                  </button>
                ))}
              </div>
              {object && (
                <div className="object-editor">
                  <strong>Selected: {object.type}</strong>
                  <div className="object-controls">
                    <button
                      className="studio-button"
                      onClick={() =>
                        editObject({
                          rotation:
                            ((object.rotation || 0) + Math.PI / 4) %
                            (Math.PI * 2),
                        })
                      }
                    >
                      <RotateCw size={14} />
                      Rotate
                    </button>
                    <button
                      className="studio-button"
                      onClick={() => {
                        setConfig((c) => ({
                          ...c,
                          objects: c.objects.filter(
                            (o) => o.id !== selectedObject,
                          ),
                        }));
                        setDirty(true);
                        setSelectedObject(null);
                      }}
                    >
                      <Trash2 size={14} />
                      Remove
                    </button>
                  </div>
                  <label>
                    Material color
                    <input
                      aria-label="Furniture color"
                      type="color"
                      value={object.color}
                      onChange={(e) => editObject({ color: e.target.value })}
                    />
                  </label>
                  <div className="object-coordinates">
                    <label>
                      X
                      <input
                        type="number"
                        min="-16"
                        max="16"
                        step=".5"
                        value={object.x}
                        onChange={(e) =>
                          editObject({
                            x: Math.max(
                              -16,
                              Math.min(16, Number(e.target.value)),
                            ),
                          })
                        }
                      />
                    </label>
                    <label>
                      Z
                      <input
                        type="number"
                        min="-10"
                        max="10"
                        step=".5"
                        value={object.z}
                        onChange={(e) =>
                          editObject({
                            z: Math.max(
                              -10,
                              Math.min(10, Number(e.target.value)),
                            ),
                          })
                        }
                      />
                    </label>
                  </div>
                </div>
              )}
              <div className="environment-controls">
                <h4>Office atmosphere</h4>
                {[
                  [
                    "theme",
                    "Architecture",
                    ["penthouse", "studio", "midnight"],
                  ],
                  ["lighting", "Time of day", ["daylight", "sunset", "night"]],
                  ["floor", "Floor finish", ["oak", "marble", "slate"]],
                  ["wall", "Wall palette", ["ivory", "charcoal", "sage"]],
                ].map(([key, label, options]) => (
                  <label key={key}>
                    {label}
                    <select
                      aria-label={label}
                      value={config[key]}
                      onChange={(e) => update(key, e.target.value)}
                    >
                      {options.map((o) => (
                        <option key={o}>{o}</option>
                      ))}
                    </select>
                  </label>
                ))}
              </div>
            </>
          ) : (
            <>
              <div className="inspector-kicker">
                <UserRound size={15} />
                SELECTED SPECIALIST
              </div>
              <div className="inspector-person">
                <span
                  className="portrait large"
                  style={{
                    "--skin": style.skin,
                    "--shirt": style.outfit,
                    "--hair": style.hair,
                  }}
                >
                  <i className="portrait-hair" />
                  <i className="portrait-face" />
                  <i className="portrait-body" />
                </span>
                <span className="gold-diamond" />
              </div>
              <input
                className="employee-name-input"
                aria-label="Employee display name"
                maxLength={50}
                value={style.displayName}
                onChange={(e) => customize("displayName", e.target.value)}
              />
              <div className="employee-title">
                {selected.title} <span> / </span> Seat{" "}
                {selected.id.split("-").at(-1)}
              </div>
              <div className="employee-current-status">
                <span
                  className={"tiny-light " + (!currentTask ? "offline" : "")}
                />
                {actualStatus(currentTask)}
                <small>{currentTask?.step || "Ready for an assignment"}</small>
              </div>
              <div className="inspector-tabs">
                <button
                  className={panel === "employee" ? "active" : ""}
                  onClick={() => setPanel("employee")}
                >
                  Work profile
                </button>
                <button
                  className={panel === "style" ? "active" : ""}
                  onClick={() => setPanel("style")}
                >
                  Customize
                </button>
              </div>
              {panel === "style" ? (
                <div className="character-editor">
                  <Swatches
                    label="Skin tone"
                    options={SKINS}
                    value={style.skin}
                    onChange={(v) => customize("skin", v)}
                  />
                  <Swatches
                    label="Outfit palette"
                    options={OUTFITS}
                    value={style.outfit}
                    onChange={(v) => customize("outfit", v)}
                  />
                  <Swatches
                    label="Hair color"
                    options={HAIRS}
                    value={style.hair}
                    onChange={(v) => customize("hair", v)}
                  />
                  <label>
                    Hair style
                    <select
                      aria-label="Hair style"
                      value={style.hairStyle}
                      onChange={(e) => customize("hairStyle", e.target.value)}
                    >
                      {["short", "bob", "curly", "bun", "bald"].map((o) => (
                        <option key={o}>{o}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Accessory
                    <select
                      aria-label="Character accessory"
                      value={style.accessory}
                      onChange={(e) => customize("accessory", e.target.value)}
                    >
                      <option>none</option>
                      <option>glasses</option>
                    </select>
                  </label>
                  <button
                    className="studio-button"
                    onClick={() => {
                      setConfig((c) => {
                        const copy = { ...c.employees };
                        delete copy[selected.id];
                        return { ...c, employees: copy };
                      });
                      setDirty(true);
                    }}
                  >
                    Reset appearance
                  </button>
                </div>
              ) : (
                <>
                  <div className="employee-mission">
                    <h4>Responsibility</h4>
                    <p>{selected.mission}</p>
                  </div>
                  <div className="employee-assignment">
                    <div>
                      <h4>Current assignment</h4>
                      <span>
                        {currentTask
                          ? actualStatus(currentTask)
                          : "No task assigned"}
                      </span>
                    </div>
                    {currentTask ? (
                      <>
                        <strong>{currentTask.title}</strong>
                        <p>{currentTask.description}</p>
                        <div className="office-progress">
                          <span
                            style={{ width: (currentTask.progress || 0) + "%" }}
                          />
                        </div>
                        <small>
                          {currentTask.progress || 0}% ·{" "}
                          {currentTask.step || "Awaiting runtime"}
                        </small>
                      </>
                    ) : (
                      <p>
                        Give this specialist a clear outcome and acceptance
                        criteria.
                      </p>
                    )}
                  </div>
                  <button
                    className="studio-button gold full"
                    onClick={() => create(selected.id)}
                  >
                    <Plus size={15} />
                    Assign a task
                  </button>
                  <button
                    className="studio-button full"
                    onClick={() => engine.current?.focus(selected.id)}
                  >
                    <Focus size={15} />
                    Follow this employee
                  </button>
                  <div className="runtime-explanation">
                    <span className="tiny-light offline" />
                    <p>
                      Character control is interactive. AI task execution begins
                      when your orchestrator is connected.
                    </p>
                  </div>
                </>
              )}
            </>
          )}
        </aside>
      </div>
      {mode === "team" && (
        <section className="studio-roster">
          <div className="studio-section-heading">
            <div>
              <span>THE FULL SALES ORGANIZATION</span>
              <h3>{EMPLOYEES.length} seats. Every role covered.</h3>
            </div>
            <label>
              <Search size={15} />
              <input
                aria-label="Find employee or role"
                placeholder="Find an employee or specialty…"
                value={rosterSearch}
                onChange={(e) => setRosterSearch(e.target.value)}
              />
            </label>
          </div>
          <div className="full-roster-grid">
            {ROLES.filter((r) =>
              r.join(" ").toLowerCase().includes(rosterSearch.toLowerCase()),
            ).map(([id, title, mission, division]) => (
              <div className="role-team-card" key={id}>
                <span>{division}</span>
                <h4>{title}</h4>
                <p>{mission}</p>
                <div>
                  {EMPLOYEES.filter((e) => e.role === id).map((e) => (
                    <button
                      key={e.id}
                      onClick={() => chooseEmployee(e.id)}
                      aria-label={"Control " + e.name}
                    >
                      <UserRound size={17} />
                      {e.id.split("-").at(-1)}
                      <span className="tiny-light offline" />
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
      <section className="studio-task-board">
        <div className="studio-section-heading">
          <div>
            <span>MISSION CONTROL</span>
            <h3>Real tasks. Visible progress.</h3>
          </div>
          <button className="studio-button" onClick={() => create("")}>
            <Plus size={14} />
            New assignment
          </button>
        </div>
        <div className="office-task-grid">
          {tasks.length ? (
            tasks.map((t) => (
              <article key={t.id}>
                <div>
                  <span
                    className={
                      "task-state " + (t.status === "Done" ? "done" : "")
                    }
                  >
                    {actualStatus(t)}
                  </span>
                  <small>{roleLabel(t.role)}</small>
                </div>
                <h4>{t.title}</h4>
                <p>{t.description}</p>
                <div className="office-progress">
                  <span style={{ width: (t.progress || 0) + "%" }} />
                </div>
                <small>
                  {t.progress || 0}% · {t.step || "Awaiting runtime"}
                </small>
                {t.output && (
                  <details>
                    <summary>View output</summary>
                    <p>{t.output}</p>
                  </details>
                )}
                <div className="task-card-footer">
                  <span>
                    {config.employees[t.agentId]?.displayName ||
                      employeeStyle(t.agentId).displayName}
                  </span>
                  <select
                    aria-label={"Task status " + t.title}
                    value={t.status}
                    onChange={(e) => changeTask(t, e.target.value)}
                  >
                    {[
                      ...new Set([
                        t.status,
                        "Queued",
                        "Blocked",
                        "Awaiting review",
                        "Done",
                        "Cancelled",
                      ]),
                    ].map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </article>
            ))
          ) : (
            <p className="no-tasks">
              The team is ready. Create an assignment to begin.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
