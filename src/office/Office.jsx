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
import { portraitStyle } from "./identities";
import { DEPARTMENTS, PLATFORMS, MODEL_STUDIO, roomInfo, membersFor, makeRoom, employeePlatform } from "./workspaces";
import { CHARACTER_MODELS, CHARACTER_REFERENCES } from "./model-catalog";
import "./office.css";
function Portrait({employee, large=false}) {
  return <span role="img" aria-label={employee.name + " character reference"} className={"cast-portrait"+(large?" large":"")} style={CHARACTER_REFERENCES[employee.id]?{backgroundImage:`url(${CHARACTER_REFERENCES[employee.id]})`,backgroundSize:"300% auto",backgroundPosition:"50% 0%"}:portraitStyle(employee.portrait)} />;
}
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
  ["booth", "Acoustic pod", Monitor],
  ["whiteboard", "Idea board", Palette],
  ["server", "Data cabinet", Building2],
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
  const [roomKey, setRoomKey] = useState("studio-reference"),
    [directory, setDirectory] = useState("departments"),
    [showReferences, setShowReferences] = useState(false),
    [allTasks, setAllTasks] = useState(false),
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
    cameraState = useRef({}),
    roomAnchor = useRef();
  const info = roomInfo(roomKey);
  const team = info.team || info.name;
  state.current = { config, tool, selectedObject, selectedId, roomKey };
  const teamEmployees = useMemo(() => membersFor(roomKey, config), [roomKey, config.employees]);
  const employees = useMemo(() => teamEmployees.slice(wing * 16, wing * 16 + 16), [teamEmployees, wing]);
  const room = config.rooms?.[roomKey] || makeRoom(roomKey, teamEmployees.length);
  const sceneConfig = {...config, ...room, room:info};
  const roomTasks = tasks.filter(t => teamEmployees.some(e => e.id === t.agentId));
  function mutateRoom(fn, key=roomKey) {
    setConfig(c => ({...c, rooms: {...c.rooms, [key]: fn(c.rooms?.[key] || makeRoom(key, membersFor(key,c).length))}}));
    setDirty(true);
  }
  function captureRoom() {
    engine.current?.flushPositions();
  }
  function changeRoom(key, enter=false) {
    if(enter) requestAnimationFrame(()=>roomAnchor.current?.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'}));
    if(key === roomKey) return;
    captureRoom();
    setRoomKey(key); setWing(0); setSelectedObject(null);
    const first=membersFor(key,state.current.config)[0];
    if(first) setSelectedId(first.id);
  }
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
    roomKey, room.objects,
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
      let teamMembers = membersFor(roomKey, state.current.config);
      if (!teamMembers.some(e=>e.id===id)) {
        const destination=DEPARTMENTS.find(d=>d.team===employee.team).id;
        captureRoom(); setRoomKey(destination);
        teamMembers=membersFor(destination,state.current.config);
      }
      setWing(Math.floor(teamMembers.findIndex((e) => e.id === id) / 16));
      setSelectedId(id);
      setPanel("employee");
    }
  }
  const place = (position) => {
    const s = state.current;
    if (s.tool === "select") {
      if (s.selectedObject) {
        mutateRoom(r=>({...r,objects:r.objects.map(o=>o.id===s.selectedObject?{...o,...position}:o)}),s.roomKey);
        setDirty(true);
      }
      return;
    }
    if ((s.config.rooms?.[s.roomKey]?.objects.length || room.objects.length) >= 80) {
      setMessage("Room limit: 80 furniture items.");
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
    mutateRoom(r=>({...r,objects:[...r.objects,object]}),s.roomKey);
    setSelectedObject(object.id);
    setDirty(true);
  };
  useEffect(() => {
    if (!ready || !host.current) return;
    try {
      setError("");
      engine.current = createOfficeEngine(host.current, {
        employees,
        config: sceneConfig,
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
          mutateRoom(r=>({...r,positions:{...r.positions,[id]:pos}}));
        },
      });
      if (cameraState.current[roomKey])
        engine.current.restoreCamera(cameraState.current[roomKey]);
    } catch (e) {
      setError(
        "3D rendering could not start. Use the employee roster below. " +
          e.message,
      );
    }
    return () => {
      cameraState.current[roomKey] = engine.current?.getCamera() || cameraState.current[roomKey];
      engine.current?.dispose();
      engine.current = null;
    };
  }, [ready, roomKey, wing, visualKey]);
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
      rooms: {...state.current.config.rooms, [roomKey]: {...room, positions:{...room.positions,...engine.current?.getPositions()}}},
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
  function changeTeam(value) { changeRoom(DEPARTMENTS.find(d=>d.team===value).id); }
  function editObject(patch) { mutateRoom(r=>({...r,objects:r.objects.map(o=>o.id===selectedObject?{...o,...patch}:o)})); }
  const object = room.objects.find(o=>o.id===selectedObject);
  return (
    <div className="office-v2">
      <section className="hq-directory" aria-label="Office departments and platforms">
        <div className="hq-directory-heading"><div><span className="studio-tag">A PLACE FOR EVERY SPECIALTY</span><h2>One company. Distinct worlds.</h2><p>Meet the people, enter their department, or organize the floor by platform.</p></div><div className="reference-studio-actions"><button className="studio-button gold" onClick={()=>changeRoom(MODEL_STUDIO.id,true)}>Enter the reference studio <ArrowUpRight size={14}/></button><button className="studio-button" onClick={()=>setShowReferences(!showReferences)}><Palette size={15}/>{showReferences?"Close art direction":"Character & office references"}</button></div></div>
        <div className="hq-directory-tabs" role="group" aria-label="Browse office by"><button aria-pressed={directory==='departments'} onClick={()=>setDirectory('departments')}><Building2 size={15}/>Departments <span>08</span></button><button aria-pressed={directory==='platforms'} onClick={()=>setDirectory('platforms')}><Monitor size={15}/>Platforms <span>08</span></button><small>128 unique colleagues · 32 specialties</small></div>
        <div className="hq-room-grid">{(directory==='departments'?DEPARTMENTS:PLATFORMS).map((entry,i)=>{
          const key=directory==='departments'?entry.id:'platform-'+entry.id;
          const members=membersFor(key,config), workload=tasks.filter(t=>members.some(e=>e.id===t.agentId)&&!['Done','Cancelled'].includes(t.status));
          const available=members.filter(e=>!workload.some(t=>t.agentId===e.id)).length;
          return <button key={key} aria-label={'Enter '+(entry.team||entry.name)} aria-pressed={roomKey===key} onClick={()=>changeRoom(key,true)} className="hq-room-card" style={{'--room-accent':entry.accent}}><div className={'room-miniature '+entry.kind}><i/><i/><i/><i/><span>{String(i+1).padStart(2,'0')}</span></div><strong>{entry.team||entry.name}</strong><small>{entry.subtitle||entry.description}</small><div className="room-card-people">{members.slice(0,3).map(e=><Portrait key={e.id} employee={e}/>)}<span>{members.length} people</span><ArrowUpRight size={15}/></div><footer><span>{available} available</span><span>{workload.length} tasks</span></footer></button>
        })}</div>
      </section>
      {showReferences&&<section className="art-direction"><div><span className="studio-tag">GPT IMAGE GENERATION · ORIGINAL ART DIRECTION</span><h3>A cast of individuals.</h3><p>128 fictional identities. 96 women and 32 men. Generated reference portraits guide the cast; live wardrobe and appearance edits apply to the 3D characters.</p></div><img className="office-concept" src="/office/office-concept.webp" alt="Generated reference showing distinct research, communication, client and creative office zones"/><div className="cast-reference-grid">{Array.from({length:8},(_,i)=><figure key={i}><img loading="lazy" src={'/office/cast-v2-'+(i+1)+'.webp'} alt={'Character reference atlas '+(i+1)+', 16 distinct fictional professionals'}/><figcaption>CAST {String(i+1).padStart(2,'0')} · {i*16+1}—{i*16+16}</figcaption></figure>)}</div></section>}
      <div className="studio-topline" ref={roomAnchor}>
        <div className="studio-location">
          <span className="studio-tag">TRAYAAM HEADQUARTERS</span>
          <span className="studio-address">
            {info.name} <span> / </span> {info.team || "Platform studio"}
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
            value={roomKey}
            onChange={(e) => changeRoom(e.target.value)}
          >
            <option value={MODEL_STUDIO.id}>Reference studio</option>
            <optgroup label="Departments">{DEPARTMENTS.map(d=><option key={d.id} value={d.id}>{d.team}</option>)}</optgroup>
            <optgroup label="Platforms">{PLATFORMS.map(p=><option key={p.id} value={'platform-'+p.id}>{p.name}</option>)}</optgroup>
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
                    Wing {i + 1}
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
                {info.name}
              </h2>
              <p>
                {employees.length} colleagues on this floor · {info.subtitle || info.description}
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
                {teamEmployees.length>0&&<Portrait employee={selected}/>}
                <div>
                  <strong>{teamEmployees.length?style.displayName:'Your next workspace'}</strong>
                  <small>{teamEmployees.length?selected.title:'Assign a colleague from People'}</small>
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
                    <Portrait employee={e}/>
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
          {!teamEmployees.length && mode !== "build" ? <div className="empty-studio"><Users size={28}/><h3>Make this studio yours.</h3><p>No colleagues are assigned to this platform yet. Open People, select a colleague and change their assigned platform.</p><button className="studio-button" onClick={()=>setMode('team')}>Find a colleague</button></div> : mode === "build" ? (
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
                        mutateRoom(r=>({...r,objects:r.objects.filter(o=>o.id!==selectedObject)}));
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
                <Portrait employee={selected} large/>
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
              {panel === "style" && CHARACTER_MODELS[selected.id] ? <div className="model-look-card"><h4>Reference-matched look</h4><p>This character now uses its image-derived 3D wardrobe and hairstyle. Additional outfit and hair variants will appear here as they are created.</p><strong>{CHARACTER_MODELS[selected.id].rigged ? "Rigged character · animated movement" : "Textured model · articulation pending"}</strong><small>Name, movement, platform and task assignment remain editable.</small></div> : panel === "style" ? (
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
                      {["short", "bob", "curly", "bun", "bald", "long", "ponytail", "braid", "pixie", "hijab"].map((o) => (
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
                      <option>glasses</option><option>earrings</option><option>headset</option>
                    </select>
                  </label>
                  <label>Wardrobe<select aria-label="Character wardrobe" value={style.wardrobe} onChange={e=>customize('wardrobe',e.target.value)}>{['blazer','dress','knit','shirt'].map(v=><option key={v}>{v}</option>)}</select></label>
                  <p className="reference-note">Portraits are generated character references. Your edits change the playable 3D model.</p>
                  <button
                    className="studio-button"
                    onClick={() => {
                      setConfig((c) => {
                        const copy = { ...c.employees };
                        const {displayName,platform}=copy[selected.id]||{};
                        copy[selected.id]={...(displayName?{displayName}:{}),...(platform?{platform}:{})};
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
                  <div className="employee-platform"><label>Assigned platform<select aria-label="Employee platform" value={employeePlatform(selected,config)} onChange={e=>{const next=e.target.value;const dept=DEPARTMENTS.find(d=>d.team===selected.team);changeRoom(dept.id);customize('platform',next);}}>{PLATFORMS.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label><small>{selected.team} · {selected.gender==='woman'?'She / her':'He / him'} · fictional digital colleague</small></div>
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
              (r.join(" ")+" "+EMPLOYEES.filter(e=>e.role===r[0]).map(e=>config.employees[e.id]?.displayName||e.name).join(" ")).toLowerCase().includes(rosterSearch.toLowerCase()),
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
                      <Portrait employee={e}/><span>{config.employees[e.id]?.displayName||e.name}<small className="roster-person-status">{actualStatus(tasks.find(t=>t.agentId===e.id&&!['Done','Cancelled'].includes(t.status)))}</small></span>
                      <span className="tiny-light offline" />
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
      <p className="model-attribution">Image-derived 3D assets created with <a href="https://www.meshy.ai/" target="_blank" rel="noreferrer">Meshy</a> · <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noreferrer">CC BY 4.0</a> · <a href="/office/models/CREDITS.md" target="_blank" rel="noreferrer">Asset credits</a></p>
      <section className="studio-task-board">
        <div className="studio-section-heading">
          <div>
            <span>MISSION CONTROL</span>
            <h3>{allTasks?'Company-wide mission control':info.team||info.name} assignments.</h3>
          </div>
          <div className="task-board-actions"><button className="studio-button" aria-pressed={allTasks} onClick={()=>setAllTasks(!allTasks)}>{allTasks?'This workspace':'All company tasks'}</button><button className="studio-button" onClick={() => create("")}>
            <Plus size={14} />
            New assignment
          </button></div>
        </div>
        <div className="office-task-grid">
          {(allTasks?tasks:roomTasks).length ? (
            (allTasks?tasks:roomTasks).map((t) => (
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
