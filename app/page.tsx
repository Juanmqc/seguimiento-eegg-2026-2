"use client";

import { FormEvent, useEffect, useMemo, useState, type CSSProperties } from "react";
import type { User } from "@supabase/supabase-js";
import { getAcademicBlocks, getSessionProfile, getSyllabi, getTeacherAccessStatuses, type AcademicBlock, type SessionProfile, type SyllabusDocument, type TeacherAccessStatus } from "@/lib/academic";
import { recordPortalPasswordLogin, supabase, supabaseConfigured } from "@/lib/supabase";

type Role = "docente" | "admin";
type Status = "Pendiente" | "Completada" | "Vencida";

const teacherNav = ["Inicio", "Mis cursos", "Mi horario", "Actividades", "Comunicados", "Documentos", "Tutoriales", "Mi cumplimiento", "Mi perfil"];
const adminNav = ["Dashboard general", "Docentes", "Acceso de docentes", "Actividades", "Comunicados", "Documentos", "Tutoriales", "Reportes"];
const icons: Record<string, string> = {
  "Inicio": "⌂", "Mis cursos": "▤", "Mi horario": "◷", "Actividades": "✓", "Comunicados": "◉",
  "Documentos": "▱", "Tutoriales": "▷", "Mi cumplimiento": "◔", "Mi perfil": "♙",
  "Dashboard general": "⌂", "Docentes": "♧", "Acceso de docentes": "🔐", "Reportes": "▥"
};

const activities = [
  { id: 1, name: "Confirmar recepción del sílabo", desc: "Revisa la versión final del sílabo y confirma su recepción.", published: "12 ago 2026", due: "18 ago 2026", status: "Pendiente" as Status },
  { id: 2, name: "Completar ficha de disponibilidad", desc: "Registra tus horarios disponibles para asesorías y reuniones.", published: "08 ago 2026", due: "14 ago 2026", status: "Completada" as Status },
  { id: 3, name: "Capacitación de aula virtual", desc: "Visualiza la inducción y adjunta la constancia correspondiente.", published: "01 ago 2026", due: "10 ago 2026", status: "Vencida" as Status },
  { id: 4, name: "Registrar plan de primera semana", desc: "Comparte las actividades previstas para el inicio de clases.", published: "13 ago 2026", due: "22 ago 2026", status: "Pendiente" as Status },
];

const TEACHER_VIEW_KEY = "eegg-portal-view";
const PORTAL_ACCESS_KEY = "eegg-explicit-portal-access";
const LOGIN_AUDIT_PENDING_KEY = "eegg-login-audit-pending";

export default function Home() {
  const [role, setRole] = useState<Role>("docente");
  const [active, setActive] = useState("Inicio");
  const [done, setDone] = useState<number[]>([2]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [toast, setToast] = useState("");
  const [profile, setProfile] = useState<SessionProfile | null>(null);
  const [blocks, setBlocks] = useState<AcademicBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState("");
  const [passwordSetup, setPasswordSetup] = useState(false);
  const [viewAsTeacher, setViewAsTeacher] = useState(false);

  useEffect(() => {
    let activeRequest = true;
    async function recordPendingLogin() {
      if (window.sessionStorage.getItem(LOGIN_AUDIT_PENDING_KEY) !== "pending") return;
      const { data } = await supabase.auth.getSession();
      if (!data.session) return;
      for (let attempt = 0; attempt < 3; attempt += 1) {
        try {
          await recordPortalPasswordLogin(data.session.access_token);
          window.sessionStorage.removeItem(LOGIN_AUDIT_PENDING_KEY);
          return;
        } catch {
          if (attempt < 2) await new Promise((resolve) => window.setTimeout(resolve, 400 * (attempt + 1)));
        }
      }
    }
    async function loadUser(user: User | null) {
      if (!user) {
        if (activeRequest) { setProfile(null); setBlocks([]); setLoading(false); }
        return;
      }
      if (new URLSearchParams(window.location.search).get("set-password") === "1") {
        if (activeRequest) { setPasswordSetup(true); setLoading(false); }
        return;
      }
      const isPortalNavigation = new URLSearchParams(window.location.search).get("portal") === "1";
      if (!isPortalNavigation || window.sessionStorage.getItem(PORTAL_ACCESS_KEY) !== "granted") {
        if (activeRequest) { setProfile(null); setBlocks([]); setLoading(false); }
        return;
      }
      try {
        const nextProfile = await getSessionProfile(user.id);
        const nextBlocks = await getAcademicBlocks();
        await recordPendingLogin();
        if (!activeRequest) return;
        const nextRole: Role = nextProfile.role === "coordinacion" ? "admin" : "docente";
        const storedView = window.sessionStorage.getItem(TEACHER_VIEW_KEY);
        const useTeacherView = nextRole === "admin" && storedView === "docente";
        setProfile(nextProfile);
        setRole(nextRole);
        setViewAsTeacher(useTeacherView);
        setActive((current) => {
          const allowed = useTeacherView || nextRole === "docente" ? teacherNav : adminNav;
          return allowed.includes(current) ? current : useTeacherView || nextRole === "docente" ? "Inicio" : "Dashboard general";
        });
        setBlocks(nextBlocks);
        setAuthError("");
      } catch (error) {
        if (activeRequest) setAuthError(error instanceof Error ? error.message : "No se pudo cargar el perfil autorizado.");
      } finally {
        if (activeRequest) setLoading(false);
      }
    }
    supabase.auth.getUser().then(({ data }) => loadUser(data.user));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      window.setTimeout(() => void loadUser(session?.user ?? null), 0);
    });
    return () => { activeRequest = false; listener.subscription.unsubscribe(); };
  }, []);

  async function login(email: string, password: string) {
    setLoading(true); setAuthError("");
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) { setAuthError("Correo o contraseña incorrectos."); setLoading(false); }
    else if (!data.session) { setAuthError("No se pudo establecer una sesión segura."); setLoading(false); }
    else {
      window.sessionStorage.setItem(PORTAL_ACCESS_KEY, "granted");
      window.sessionStorage.setItem(LOGIN_AUDIT_PENDING_KEY, "pending");
      window.location.replace("/?portal=1");
    }
  }
  function complete(id: number) { setDone((d) => [...new Set([...d, id])]); setToast("Actividad registrada como realizada"); setTimeout(() => setToast(""), 3000); }
  async function logout() { window.sessionStorage.removeItem(TEACHER_VIEW_KEY); window.sessionStorage.removeItem(PORTAL_ACCESS_KEY); window.sessionStorage.removeItem(LOGIN_AUDIT_PENDING_KEY); await supabase.auth.signOut(); window.history.replaceState({}, "", "/"); setProfile(null); setBlocks([]); }
  function enterTeacherView() {
    if (role !== "admin") return;
    window.sessionStorage.setItem(TEACHER_VIEW_KEY, "docente");
    setViewAsTeacher(true);
    setActive("Inicio");
  }
  function exitTeacherView() {
    window.sessionStorage.setItem(TEACHER_VIEW_KEY, "coordinacion");
    setViewAsTeacher(false);
    setActive("Dashboard general");
  }
  async function finishInvitation(password: string) {
    setLoading(true); setAuthError("");
    const { error } = await supabase.auth.updateUser({ password });
    if (error) { setAuthError(error.message); setLoading(false); return; }
    window.sessionStorage.removeItem(PORTAL_ACCESS_KEY);
    window.sessionStorage.removeItem(LOGIN_AUDIT_PENDING_KEY);
    window.history.replaceState({}, "", "/");
    window.location.reload();
  }

  if (passwordSetup) return <PasswordSetup submit={finishInvitation} loading={loading} error={authError} />;
  if (!profile) return <Login login={login} loading={loading} error={authError} configured={supabaseConfigured} />;
  const effectiveView: Role = role === "admin" && viewAsTeacher ? "docente" : role;
  const visibleBlocks = viewAsTeacher ? blocks.filter((block) => block.teacherProfileId === profile.id) : blocks;
  const nav = effectiveView === "docente" ? teacherNav : adminNav;
  const initials = profile.fullName.split(" ").map((part) => part[0]).slice(0, 2).join("");
  return (
    <div className={`app-shell ${effectiveView}`}>
      <Sidebar role={effectiveView} nav={nav} active={active} open={menuOpen} onSelect={(n) => { setActive(n); setMenuOpen(false); }} />
      <main className="main">
        <header className="topbar">
          <button className="mobile-menu" onClick={() => setMenuOpen(!menuOpen)} aria-label="Abrir menú">☰</button>
          <div className="crumb"><span>{effectiveView === "docente" ? (viewAsTeacher ? "Mi vista docente" : "Portal del docente") : "Portal de Coordinación"}</span><b>/</b> {active}</div>
          <div className="top-actions">
            <button className="bell" aria-label="Notificaciones">♢<i>3</i></button>
            <button className="user-chip"><span className="avatar">{initials}</span><span><b>{profile.fullName}</b><small>{viewAsTeacher ? "Coordinación · Vista docente" : role === "docente" ? "Docente" : "Coordinación"}</small></span><em>⌄</em></button>
          </div>
        </header>
        <div className="page-content">
          {effectiveView === "docente" ? <TeacherView active={active} done={done} complete={complete} blocks={visibleBlocks} profile={profile} /> : <AdminView active={active} blocks={blocks} />}
        </div>
      </main>
      {menuOpen && <button className="backdrop" onClick={() => setMenuOpen(false)} aria-label="Cerrar menú" />}
      <div className="role-switch">{role === "admin" && <button className={viewAsTeacher ? "return-coordination" : ""} onClick={viewAsTeacher ? exitTeacherView : enterTeacherView}>{viewAsTeacher ? "← Volver a Coordinación" : "Ver mi vista docente"}</button>}<button onClick={logout}>Cerrar sesión</button></div>
      {toast && <div className="toast"><b>✓</b><span><strong>¡Registro exitoso!</strong>{toast}</span></div>}
    </div>
  );
}

function PasswordSetup({submit,loading,error}:{submit:(password:string)=>Promise<void>;loading:boolean;error:string}) {
  const [password,setPassword]=useState(""); const [confirm,setConfirm]=useState("");
  function save(event:FormEvent){event.preventDefault();if(password!==confirm)return;void submit(password)}
  return <div className="login-page"><section className="login-brand"><div className="text-university-mark"><span>Universidad</span><strong>Norbert Wiener</strong></div><div className="brand-copy"><small>PORTAL DE SEGUIMIENTO DOCENTE</small><span className="yellow-rule"/><h1>EEGG LIMA NORTE<br/><b>2026-II</b></h1></div></section><section className="login-panel"><form className="login-card" onSubmit={save}><span className="login-institution">ACTIVACIÓN DE CUENTA DOCENTE</span><h2>Configura tu<br/>contraseña</h2><p className="subtitle">La invitación fue verificada. Define una contraseña personal para tus próximos accesos.</p><label>Nueva contraseña<div className="input-wrap"><span>◆</span><input required minLength={8} type="password" autoComplete="new-password" value={password} onChange={e=>setPassword(e.target.value)}/></div></label><label>Confirmar contraseña<div className="input-wrap"><span>◆</span><input required minLength={8} type="password" autoComplete="new-password" value={confirm} onChange={e=>setConfirm(e.target.value)}/></div></label>{password&&confirm&&password!==confirm&&<div className="demo-note login-error"><b>!</b><span><strong>Las contraseñas no coinciden</strong>Revisa ambos campos.</span></div>}{error&&<div className="demo-note login-error"><b>!</b><span><strong>No se pudo guardar</strong>{error}</span></div>}<button className="primary login-button" disabled={loading||password!==confirm}>{loading?"Guardando…":"Guardar y entrar"} <span>→</span></button></form></section></div>
}

function Login({ login, loading, error, configured }: { login: (email: string, password: string) => Promise<void>; loading: boolean; error: string; configured: boolean }) {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [recoveryMode, setRecoveryMode] = useState(false);
  const [recoveryLoading, setRecoveryLoading] = useState(false);
  const [recoveryMessage, setRecoveryMessage] = useState("");
  const [recoveryError, setRecoveryError] = useState("");
  function submit(event: FormEvent) { event.preventDefault(); void login(email, password); }
  async function requestRecovery(event: FormEvent) {
    event.preventDefault();
    setRecoveryLoading(true); setRecoveryError(""); setRecoveryMessage("");
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo: `${window.location.origin}/?set-password=1`,
    });
    if (resetError) setRecoveryError(resetError.status === 429 ? "Se alcanzó temporalmente el límite de envíos. Espera unos minutos e intenta nuevamente." : "No se pudo solicitar la recuperación. Intenta nuevamente.");
    else setRecoveryMessage("Si el correo corresponde a una cuenta del portal, recibirás un enlace para establecer una nueva contraseña.");
    setRecoveryLoading(false);
  }
  return <div className="login-page">
    <section className="login-brand">
      <div className="text-university-mark"><span>Universidad</span><strong>Norbert Wiener</strong></div>
      <div className="brand-copy">
        <small>PORTAL DE SEGUIMIENTO DOCENTE</small>
        <span className="yellow-rule" />
        <h1>EEGG LIMA NORTE<br/><b>2026-II</b></h1>
        <span className="white-rule" />
        <h2><em>ATRÉVETE MÁS,</em> <strong>AVANZA +</strong></h2>
        <p>Un espacio para acompañar, organizar y fortalecer nuestra labor docente.</p>
      </div>
      <small className="internal-tool-note">HERRAMIENTA INTERNA DE SEGUIMIENTO DOCENTE</small>
    </section>
    <section className="login-panel">
      <form className="login-card" onSubmit={recoveryMode ? requestRecovery : submit}>
        <div className="mobile-logo"><div className="text-university-mark"><span>Universidad</span><strong>Norbert Wiener</strong></div></div>
        <span className="login-institution">UNIVERSIDAD NORBERT WIENER</span>
        <h2>{recoveryMode ? <>Recupera tu<br/>contraseña</> : <>Portal de Seguimiento<br/>Docente</>}</h2>
        <p className="subtitle">{recoveryMode ? "Solicita un enlace seguro usando tu correo institucional." : "Estudios Generales — Lima Norte — 2026-II"}</p>
        {!recoveryMode && <div className="login-role-info"><b>Acceso único</b><span>El portal identifica automáticamente tu perfil institucional.</span></div>}
        <label>Correo institucional<div className="input-wrap"><span aria-hidden="true">●</span><input required type="email" autoComplete="username" placeholder="nombre@dominio.edu.pe" value={email} onChange={(e)=>setEmail(e.target.value)} /></div></label>
        {!recoveryMode && <><label>Contraseña<div className="input-wrap"><span aria-hidden="true">◆</span><input required autoComplete="current-password" type={showPassword ? "text" : "password"} placeholder="••••••••" value={password} onChange={(e)=>setPassword(e.target.value)}/><button type="button" aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"} aria-pressed={showPassword} onClick={() => setShowPassword(!showPassword)}>{showPassword ? "◌" : "◉"}</button></div></label><div className="login-meta"><label><input type="checkbox"/> Recordarme</label><button type="button" className="forgot-password" onClick={()=>{setRecoveryMode(true);setRecoveryError("");setRecoveryMessage("")}}>¿Olvidaste tu contraseña?</button></div></>}
        <button className="primary login-button" disabled={loading || recoveryLoading || !configured}>{recoveryMode ? (recoveryLoading ? "Enviando…" : "Enviar enlace de recuperación") : (loading ? "Verificando…" : "Iniciar sesión")} <span>→</span></button>
        {!recoveryMode && (error || !configured) && <div className="demo-note login-error"><b>!</b><span><strong>No se pudo iniciar sesión</strong>{error || "Falta configurar la conexión pública con Supabase."}</span></div>}
        {recoveryError && <div className="demo-note login-error"><b>!</b><span><strong>No se pudo enviar</strong>{recoveryError}</span></div>}
        {recoveryMessage && <div className="demo-note recovery-success"><b>✓</b><span><strong>Solicitud recibida</strong>{recoveryMessage}</span></div>}
        {recoveryMode && <button type="button" className="back-to-login" onClick={()=>{setRecoveryMode(false);setRecoveryError("");setRecoveryMessage("")}}>← Volver al inicio de sesión</button>}
        <small className="support">¿Necesitas ayuda? <a href="mailto:soporte@universidad.edu.pe">Contacta a soporte</a></small>
      </form>
    </section>
  </div>
}

function Sidebar({ role, nav, active, open, onSelect }: { role: Role; nav: string[]; active: string; open: boolean; onSelect: (s: string) => void }) {
  return <aside className={`sidebar ${role} ${open ? "open" : ""}`}>
    {role === "docente" ? <div className="side-brand teacher-brand"><div className="side-university-text"><span>Universidad</span><strong>Norbert Wiener</strong></div><small>PORTAL DE SEGUIMIENTO DOCENTE</small></div> : <div className="side-brand admin-brand"><div className="side-university-text"><span>Universidad</span><strong>Norbert Wiener</strong></div><div><b>PORTAL DE SEGUIMIENTO</b><small>EEGG · LIMA NORTE</small></div></div>}
    <div className="cycle"><span>CICLO ACADÉMICO</span><b>2026-II</b></div>
    <nav>{nav.map((n) => <button key={n} className={active === n ? "active" : ""} onClick={() => onSelect(n)}><i>{icons[n] || "•"}</i>{n}{n === "Actividades" && role === "docente" && <em>3</em>}</button>)}</nav>
    <div className="side-help"><i>?</i><span><b>¿Necesitas ayuda?</b><small>Consulta la guía del portal</small></span><button>→</button></div>
    <div className="side-version">Portal EEGG <span>v1.0</span></div>
  </aside>
}

function TeacherView({ active, done, complete, blocks, profile }: { active: string; done: number[]; complete: (id: number) => void; blocks: AcademicBlock[]; profile: SessionProfile }) {
  if (active === "Inicio") return <TeacherHome done={done} blocks={blocks} name={profile.fullName} />;
  if (active === "Mis cursos") return <Courses blocks={blocks} />;
  if (active === "Mi horario") return <Schedule blocks={blocks} />;
  if (active === "Actividades") return <Activities done={done} complete={complete} />;
  if (active === "Comunicados") return <Announcements />;
  if (active === "Documentos") return <Documents admin={false} />;
  if (active === "Tutoriales") return <Tutorials admin={false} />;
  if (active === "Mi cumplimiento") return <Compliance done={done} />;
  return <Profile blocks={blocks} profile={profile} />;
}

function PageTitle({ eyebrow, title, copy, action }: { eyebrow?: string; title: string; copy: string; action?: React.ReactNode }) {
  return <div className="page-title"><div>{eyebrow && <span>{eyebrow}</span>}<h1>{title}</h1><p>{copy}</p></div>{action}</div>;
}

function TeacherHome({ done, blocks, name }: { done: number[]; blocks: AcademicBlock[]; name: string }) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => { const timer=window.setInterval(()=>setNow(new Date()),60_000); return ()=>window.clearInterval(timer); },[]);
  const currentDate = new Intl.DateTimeFormat("es-PE", { timeZone:"America/Lima", weekday: "long", day: "numeric", month: "long" }).format(now).toLocaleUpperCase("es-PE");
  const teacherName = blocks[0]?.teacherName || name;
  const firstName = teacherName.trim().split(/\s+/)[0];
  const greeting = limaGreeting(now);
  const courseCount = new Set(blocks.map((block) => block.courseId)).size;
  const sectionCount = new Set(blocks.map((block) => block.sectionId)).size;
  const theoryCount = blocks.filter((block)=>block.component==="teoría").length;
  const practiceCount = blocks.filter((block)=>block.component==="práctica").length;
  const order = ["lunes","martes","miércoles","jueves","viernes","sábado","domingo"];
  const upcoming = [...blocks].sort((a,b)=>order.indexOf(a.day)-order.indexOf(b.day)||a.startTime.localeCompare(b.startTime)).slice(0,6);
  void done;
  return <>
    <PageTitle eyebrow={currentDate} title={`¡${greeting}, ${firstName}!`} copy={`Tienes ${courseCount} cursos y ${sectionCount} secciones asignadas en 2026-II.`} />
    <section className="stats teacher-stats">
      <Stat icon="▤" value={String(courseCount)} label="Cursos asignados" tone="navy"/><Stat icon="▣" value={String(sectionCount)} label="Secciones" tone="green"/><Stat icon="T" value={String(theoryCount)} label="Bloques de teoría" tone="blue"/><Stat icon="P" value={String(practiceCount)} label="Bloques de práctica" tone="orange"/>
    </section>
    <section className="panel teacher-program-summary"><PanelHead title="Mi programación académica"/><AcademicRows blocks={upcoming}/></section>
    {blocks.length===0&&<EmptyProgramming/>}
  </>;
}

function Stat({ icon, value, label, tone }: { icon: string; value: string; label: string; tone: string }) { return <div className="stat"><i className={tone}>{icon}</i><div><strong>{value}</strong><span>{label}</span></div></div>; }
function PanelHead({ title, link }: { title: string; link?: string }) { return <div className="panel-head"><h2>{title}</h2>{link && <button>{link} →</button>}</div>; }
function Courses({ blocks }: { blocks: AcademicBlock[] }) {
  const grouped = useMemo(() => {
    const result = new Map<string,{base:AcademicBlock;components:AcademicBlock[]}>();
    for (const block of blocks) {
      const group = result.get(block.sectionId) ?? {base:block,components:[]};
      group.components.push(block); result.set(block.sectionId,group);
    }
    return [...result.values()];
  }, [blocks]);
  return <><PageTitle eyebrow="DOCENCIA" title="Mis cursos" copy="Solo tu programación oficial del ciclo 2026-II."/><div className="course-grid">{grouped.map(({base,components}, index) => <article className={`course-card ${["blue","green","purple"][index%3]}`} key={base.sectionId}><div className="course-top"><span>{base.courseCode}</span><em>{base.modality}</em></div><h2>{base.courseName}</h2><p>Sección académica <b>{base.sectionCode}</b></p><div className="component-list">{components.sort((a,b)=>a.classNumber-b.classNumber).map(block=><div className="component-item" key={`${block.classNumber}-${block.day}-${block.startTime}`}><span className="badge">{capitalize(block.component)}</span><b>Clase {block.classNumber} · Sección {block.originalSection}</b><small>{capitalize(block.day)} · {formatTime(block.startTime)}–{formatTime(block.endTime)}</small><small>{block.classroom||"Instalación por confirmar"} · {block.modality||"Modalidad por confirmar"}</small></div>)}</div>{base.coordinators.map(contact=><div className="course-coordinator" key={contact.fullName}><small>COORDINACIÓN DEL CURSO</small><b>{contact.fullName}</b><span>{contact.institutionalEmail||"Correo institucional pendiente"}{contact.phone?` · ${contact.phone}`:""}</span></div>)}</article>)}</div>{grouped.length===0&&<EmptyProgramming/>}</>;
}

function Schedule({ blocks }: { blocks: AcademicBlock[] }) {
  const order = ["lunes","martes","miércoles","jueves","viernes","sábado","domingo"];
  const sorted = [...blocks].sort((a,b)=>order.indexOf(a.day)-order.indexOf(b.day)||a.startTime.localeCompare(b.startTime));
  const startMinute = 7 * 60;
  const latestEnd = Math.max(startMinute + 45, ...blocks.map((block) => timeToMinutes(block.endTime)));
  const slotCount = Math.ceil((latestEnd - startMinute) / 45);
  const slots = Array.from({length:slotCount},(_,index)=>startMinute+index*45);
  return <><PageTitle eyebrow="AGENDA ACADÉMICA" title="Mi horario semanal" copy="Programación oficial del ciclo 2026-II."/>
    <section className="panel weekly-schedule-wrap" aria-label="Horario académico semanal"><div className="weekly-schedule" style={{"--schedule-rows":slotCount} as CSSProperties}>
      <div className="schedule-corner">Hora</div>
      {order.map((day,index)=><div className="schedule-day" style={{gridColumn:index+2}} key={day}>{capitalize(day)}</div>)}
      {slots.map((minute,index)=><div className="schedule-time" style={{gridRow:index+2}} key={minute}><b>{minutesToTime(minute)}</b><span>{minutesToTime(minute+45)}</span></div>)}
      {order.flatMap((day,dayIndex)=>slots.map((minute,rowIndex)=><div className="schedule-cell" style={{gridColumn:dayIndex+2,gridRow:rowIndex+2}} key={`${day}-${minute}`}/>))}
      {sorted.map((block)=>{const rowStart=Math.floor((timeToMinutes(block.startTime)-startMinute)/45)+2;const span=Math.max(1,Math.ceil((timeToMinutes(block.endTime)-timeToMinutes(block.startTime))/45));return <article className={`schedule-class course-tone-${courseTone(block.courseId)}`} style={{gridColumn:order.indexOf(block.day)+2,gridRow:`${rowStart} / span ${span}`}} key={`${block.assignmentId}-${block.classNumber}-${block.day}-${block.startTime}`}><strong>{block.courseName}</strong><span>Sección {block.sectionCode} · {capitalize(block.component)}</span><span>Clase {block.classNumber}</span><span>{formatTime(block.startTime)}–{formatTime(block.endTime)}</span><small>{block.classroom||"Por confirmar"} · {block.modality||"Por confirmar"}</small></article>})}
    </div></section>
    <section className="panel table-wrap academic-table schedule-detail"><PanelHead title="Detalle de mi programación"/><table><thead><tr>{["Día","Horario","Curso","Sección","Componente","Clase","Instalación","Modalidad"].map(x=><th key={x}>{x}</th>)}</tr></thead><tbody>{sorted.map(block=><tr key={`${block.assignmentId}-${block.classNumber}-${block.day}`}><td><b>{capitalize(block.day)}</b></td><td>{formatTime(block.startTime)}–{formatTime(block.endTime)}</td><td><b>{block.courseName}</b><small className="table-code">{block.courseCode}</small></td><td>{block.sectionCode}<small className="table-code">Origen: {block.originalSection}</small></td><td><span className="badge">{capitalize(block.component)}</span></td><td>{block.classNumber}</td><td>{block.classroom || "Por confirmar"}</td><td>{block.modality || "Por confirmar"}</td></tr>)}</tbody></table></section>{sorted.length===0&&<EmptyProgramming/>}</>;
}

function AcademicRows({blocks}:{blocks:AcademicBlock[]}){const rows=[...blocks].sort((a,b)=>a.teacherName.localeCompare(b.teacherName)||a.courseName.localeCompare(b.courseName)||a.classNumber-b.classNumber);return <table><thead><tr>{["Docente","Curso","Sección","Componente","Clase","Día y hora","Instalación","Modalidad"].map(x=><th key={x}>{x}</th>)}</tr></thead><tbody>{rows.map(b=><tr key={`${b.assignmentId}-${b.classNumber}-${b.day}`}><td><b>{b.teacherName}</b></td><td>{b.courseName}<small className="table-code">{b.courseCode}</small></td><td>{b.sectionCode}<small className="table-code">Origen: {b.originalSection}</small></td><td><span className="badge">{capitalize(b.component)}</span></td><td>{b.classNumber}</td><td>{capitalize(b.day)} · {formatTime(b.startTime)}–{formatTime(b.endTime)}</td><td>{b.classroom||"Por confirmar"}</td><td>{b.modality||"Por confirmar"}</td></tr>)}</tbody></table>}
function formatTime(value:string){return value.slice(0,5)}
function timeToMinutes(value:string){const [hours,minutes]=value.slice(0,5).split(":").map(Number);return hours*60+minutes}
function minutesToTime(value:number){return `${String(Math.floor(value/60)).padStart(2,"0")}:${String(value%60).padStart(2,"0")}`}
function courseTone(courseId:string){let hash=0;for(const char of courseId)hash=(hash*31+char.charCodeAt(0))>>>0;return hash%8}
function limaGreeting(date:Date){const hour=Number(new Intl.DateTimeFormat("en-US",{timeZone:"America/Lima",hour:"2-digit",hourCycle:"h23"}).format(date));return hour>=5&&hour<12?"Buenos días":hour>=12&&hour<19?"Buenas tardes":"Buenas noches"}
function capitalize(value:string){return value.charAt(0).toUpperCase()+value.slice(1)}
function EmptyProgramming(){return <section className="panel empty-programming"><b>Sin programación vinculada</b><p>La cuenta está activa, pero todavía no está enlazada con un registro docente.</p></section>}

function Activities({ done, complete }: { done: number[]; complete: (id: number) => void }) { const [filter,setFilter]=useState("Todas"); const shown=activities.filter(a=>filter==="Todas" || (done.includes(a.id)?"Completada":a.status)===filter); return <><PageTitle eyebrow="SEGUIMIENTO" title="Mis actividades" copy="Revisa tus tareas académicas y administrativas y registra su cumplimiento."/><div className="filter-row">{["Todas","Pendiente","Completada","Vencida"].map(f=><button key={f} className={filter===f?"active":""} onClick={()=>setFilter(f)}>{f}</button>)}</div><div className="activity-list">{shown.map(a=>{const current=done.includes(a.id)?"Completada":a.status;return <article className="activity-card" key={a.id}><div className={`status-mark ${current.toLowerCase()}`}>{current==="Completada"?"✓":current==="Vencida"?"!":"◷"}</div><div className="activity-body"><div className="activity-title"><div><span className={`badge ${current.toLowerCase()}`}>{current}</span><h2>{a.name}</h2></div><button>•••</button></div><p>{a.desc}</p><div className="activity-dates"><span><small>PUBLICADA</small><b>{a.published}</b></span><span><small>FECHA LÍMITE</small><b>{a.due}</b></span></div>{current!=="Completada"?<><textarea placeholder="Añade una observación (opcional)"/><div className="evidence"><button>＋ Adjuntar evidencia</button><small>PDF, JPG o PNG · Máx. 10 MB (próximamente)</small></div><button className="primary" onClick={()=>complete(a.id)}>✓ Marcar como realizada</button></>:<div className="completed-note"><b>✓ Actividad registrada</b><span>Tu confirmación quedó guardada correctamente.</span></div>}</div></article>})}</div></> }

function Announcements() { const items=[{level:"urgent",tag:"URGENTE",date:"13 AGO",title:"Reunión de coordinación académica",copy:"Participación obligatoria este viernes a las 4:00 p. m. en la sala del pabellón B."},{level:"important",tag:"IMPORTANTE",date:"11 AGO",title:"Actualización de sílabos 2026-II",copy:"Ya se encuentran disponibles las versiones finales de los sílabos del ciclo."},{level:"normal",tag:"INFORMATIVO",date:"08 AGO",title:"Bienvenida al ciclo académico",copy:"Coordinación de Estudios Generales les da la bienvenida y comparte las fechas clave."}]; return <><PageTitle eyebrow="COORDINACIÓN" title="Comunicados" copy="Información y anuncios oficiales para el equipo docente."/><div className="announcement-list">{items.map(x=><article className={`announcement ${x.level}`} key={x.title}><div className="announce-date"><b>{x.date.split(" ")[0]}</b><span>{x.date.split(" ")[1]}</span></div><div><span className="badge">{x.tag}</span><h2>{x.title}</h2><p>{x.copy}</p><button>Leer comunicado completo →</button></div></article>)}</div></> }

const docCats=["Sílabos","Formatos y solicitudes","Rectificaciones","Manuales","Documentos académicos","Otros documentos"];
function Documents({admin}:{admin:boolean}) {
  const [syllabi,setSyllabi]=useState<SyllabusDocument[]>([]); const [loading,setLoading]=useState(true); const [error,setError]=useState("");
  useEffect(()=>{let current=true;getSyllabi().then(data=>{if(current)setSyllabi(data)}).catch(reason=>{if(current)setError(reason instanceof Error?reason.message:"No se pudieron cargar los sílabos.")}).finally(()=>{if(current)setLoading(false)});return()=>{current=false}},[]);
  return <><PageTitle eyebrow="RECURSOS" title={admin?"Gestión de documentos":"Documentos"} copy={admin?"Publica y organiza los recursos institucionales para docentes.":"Encuentra sílabos, formatos y documentos académicos en un solo lugar."} action={admin?<button className="primary" title="Carga administrativa preparada para una siguiente etapa">＋ Agregar documento</button>:undefined}/><div className="category-grid">{docCats.map((x,i)=><article className={`category-card ${i===0?"selected":""}`} key={x}><i>{["▤","▱","↻","▥","▣","•••"][i]}</i><div><h2>{x}</h2><p>{i===0?(loading?"Cargando…":`${syllabi.length} ${syllabi.length===1?"archivo":"archivos"}`):"Próximamente"}</p></div><button aria-label={`Abrir ${x}`}>{admin?"Abrir":"›"}</button></article>)}</div><section className="panel syllabus-panel"><PanelHead title="Sílabos — 2026-II" link={admin?`${syllabi.length} disponibles`:"Según tus cursos asignados"}/>{loading&&<div className="empty-state">Cargando sílabos autorizados…</div>}{error&&<div className="demo-note login-error"><b>!</b><span><strong>No se pudieron cargar los documentos</strong>{error}</span></div>}{!loading&&!error&&syllabi.length===0&&<div className="empty-state">No tienes sílabos disponibles para tus cursos actuales.</div>}<div className="syllabus-grid">{syllabi.map(document=><SyllabusCard key={document.id} document={document}/>)}</div></section></>
}

function SyllabusCard({document}:{document:SyllabusDocument}) {
  const size=document.sizeBytes?`${(document.sizeBytes/1024/1024).toFixed(2)} MB`:"PDF";
  return <article className="syllabus-card"><div className="pdf-icon"><b>PDF</b><span>▤</span></div><div className="syllabus-copy"><span className="course-code">{document.documentCode}</span><h2>{document.courseName}</h2><small>{size} · Ciclo 2026-II</small></div><div className="syllabus-actions"><a href={document.viewUrl} target="_blank" rel="noreferrer" className="primary">Ver sílabo</a><a href={document.downloadUrl} className="download-link">Descargar</a></div></article>
}

const tutorials=["Introducción a Canvas","Registro de notas en PeopleSoft","Clases efectivas en Microsoft Teams","Registro de asistencia","Publicar materiales en Canvas","Solicitud de rectificación"];
function Tutorials({admin}:{admin:boolean}) { return <><PageTitle eyebrow="APRENDIZAJE" title={admin?"Gestión de tutoriales":"Tutoriales"} copy={admin?"Registra videos y clasifícalos por plataforma o procedimiento.":"Videos breves para ayudarte con las principales plataformas y procesos."} action={admin?<button className="primary">＋ Registrar video</button>:undefined}/><div className="filter-row"><button className="active">Todos</button>{["Canvas","PeopleSoft","Microsoft Teams","Registro de notas","Registro de asistencia","Otros procedimientos"].map(x=><button key={x}>{x}</button>)}</div><div className="tutorial-grid">{tutorials.map((t,i)=><article className="tutorial" key={t}><div className={`video-cover c${i}`}><button>▶</button><span>{["04:32","06:18","05:44","03:25","07:12","04:08"][i]}</span></div><div><span className="badge">{["CANVAS","PEOPLESOFT","TEAMS","ASISTENCIA","CANVAS","PROCEDIMIENTOS"][i]}</span><h2>{t}</h2><p>Guía práctica paso a paso para docentes.</p></div></article>)}</div></> }

function Compliance({done}:{done:number[]}) { const pct=Math.min(100,62+(done.length-1)*8); return <><PageTitle eyebrow="DESEMPEÑO PERSONAL" title="Mi cumplimiento" copy="Resumen de tus actividades asignadas durante el ciclo 2026-II."/><section className="stats"><Stat icon="▤" value="10" label="Asignadas" tone="navy"/><Stat icon="✓" value={String(6+done.length)} label="Realizadas" tone="green"/><Stat icon="◷" value={String(3-done.length+1)} label="Pendientes" tone="orange"/><Stat icon="!" value="1" label="Vencida" tone="red"/></section><section className="panel compliance-card"><div><span>CUMPLIMIENTO GENERAL</span><h2>{pct}%</h2><p>Has completado {6+done.length} de 10 actividades asignadas.</p></div><div className="big-progress"><div style={{width:`${pct}%`}}/></div><div className="milestones"><span>0%</span><span>Meta institucional: 90%</span><span>100%</span></div></section></> }

function Profile({blocks,profile}:{blocks:AcademicBlock[];profile:SessionProfile}){const teacher=blocks[0];const sections=Array.from(new Map(blocks.map(b=>[b.sectionId,b])).values());return <><PageTitle eyebrow="CUENTA" title="Mi perfil" copy="Información docente registrada para el ciclo actual."/><section className="panel profile-card"><div className="profile-head"><span className="profile-avatar">{profile.fullName.split(" ").map(x=>x[0]).slice(0,2).join("")}</span><div><h2>{teacher?.teacherName||profile.fullName}</h2><p>Docente de Estudios Básicos y Complementarios</p><span className="badge completada">PERFIL ACTIVO</span></div></div><div className="profile-grid"><div><small>CORREO INSTITUCIONAL</small><b>{teacher?.teacherEmail||"Pendiente de vinculación"}</b></div><div><small>SEDE</small><b>Lima Norte</b></div><div><small>CICLO</small><b>2026-II</b></div><div><small>BLOQUES PROGRAMADOS</small><b>{blocks.length}</b></div></div><PanelHead title="Cursos asignados"/><div className="profile-courses">{sections.map(c=><span key={c.sectionId}><i>▤</i><b>{c.courseName}</b><small>Sección {c.sectionCode}</small></span>)}</div></section></>}

function AdminView({active,blocks}:{active:string;blocks:AcademicBlock[]}) {
 if(active==="Dashboard general") return <AdminDashboard blocks={blocks}/>;
 if(active==="Docentes") return <Teachers blocks={blocks}/>;
 if(active==="Acceso de docentes") return <TeacherAccess/>;
 if(active==="Actividades") return <AdminActivities/>;
 if(active==="Comunicados") return <AdminAnnouncements/>;
 if(active==="Documentos") return <Documents admin/>;
 if(active==="Tutoriales") return <Tutorials admin/>;
 return <Reports/>;
}

function AdminDashboard({blocks}:{blocks:AcademicBlock[]}){const teachers=new Set(blocks.map(b=>b.teacherId)).size;const coursesCount=new Set(blocks.map(b=>b.courseId)).size;const sections=new Set(blocks.map(b=>b.sectionId)).size;const theory=blocks.filter(b=>b.component==="teoría").length;const practice=blocks.filter(b=>b.component==="práctica").length;return <><PageTitle eyebrow="PORTAL DE COORDINACIÓN" title="Dashboard general" copy="Programación oficial · Estudios Básicos y Complementarios · Lima Norte · 2026-II"/><section className="stats admin-stats"><Stat icon="♧" value={String(teachers)} label="Docentes activos" tone="navy"/><Stat icon="▤" value={String(coursesCount)} label="Cursos" tone="blue"/><Stat icon="▣" value={String(sections)} label="Secciones" tone="green"/><Stat icon="◷" value={String(blocks.length)} label="Bloques horarios" tone="orange"/><Stat icon="T" value={String(theory)} label="Teorías" tone="blue"/><Stat icon="P" value={String(practice)} label="Prácticas" tone="red"/></section><section className="panel table-wrap academic-table"><PanelHead title="Programación académica consolidada"/><AcademicRows blocks={blocks}/></section></>}

function Teachers({blocks}:{blocks:AcademicBlock[]}){const [q,setQ]=useState("");const grouped=useMemo(()=>{const map=new Map<string,{name:string;courses:Set<string>;sections:Set<string>;blocks:number}>();for(const b of blocks){const row=map.get(b.teacherId)??{name:b.teacherName,courses:new Set<string>(),sections:new Set<string>(),blocks:0};row.courses.add(b.courseName);row.sections.add(b.sectionCode);row.blocks++;map.set(b.teacherId,row)}return [...map.values()].filter(r=>r.name.toLowerCase().includes(q.toLowerCase())).sort((a,b)=>a.name.localeCompare(b.name));},[blocks,q]);return <><PageTitle eyebrow="EQUIPO ACADÉMICO" title="Docentes" copy="Programación docente real del ciclo 2026-II."/><div className="table-tools"><div className="search">⌕ <input placeholder="Buscar docente..." value={q} onChange={e=>setQ(e.target.value)}/></div></div><section className="panel table-wrap"><table><thead><tr>{["Docente","Cursos","Secciones","Bloques de horario"] .map(x=><th key={x}>{x}</th>)}</tr></thead><tbody>{grouped.map(r=><tr key={r.name}><td><span className="table-avatar">{r.name.split(" ").map(x=>x[0]).slice(0,2).join("")}</span><b>{r.name}</b></td><td>{[...r.courses].join(", ")}</td><td>{[...r.sections].join(", ")}</td><td><span className="count green">{r.blocks}</span></td></tr>)}</tbody></table><div className="table-footer">Mostrando {grouped.length} docentes activos</div></section></>}

function TeacherAccess(){
 const [rows,setRows]=useState<TeacherAccessStatus[]>([]);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState("");
 useEffect(()=>{let current=true;getTeacherAccessStatuses().then(data=>{if(current)setRows(data)}).catch(reason=>{if(current)setError(reason instanceof Error?reason.message:"No se pudo consultar el estado de acceso.")}).finally(()=>{if(current)setLoading(false)});return()=>{current=false}},[]);
 const activated=rows.filter(row=>row.activated).length;
 return <><PageTitle eyebrow="SEGURIDAD Y ACCESO" title="Acceso de docentes" copy="Estado de activación y último ingreso de las cuentas docentes del portal."/><section className="stats access-summary"><Stat icon="✓" value={String(activated)} label="Cuentas activadas" tone="green"/><Stat icon="◷" value={String(rows.length-activated)} label="Activación pendiente" tone="orange"/></section><section className="panel table-wrap access-table">{loading?<div className="access-message">Consultando accesos…</div>:error?<div className="access-message error">No fue posible consultar esta información. {error}</div>:<><table><thead><tr><th>Docente</th><th>Correo institucional</th><th>Estado de cuenta</th><th>Último acceso</th></tr></thead><tbody>{rows.map(row=><tr key={row.teacherId}><td><span className="table-avatar">{row.fullName.split(" ").map(part=>part[0]).slice(0,2).join("")}</span><b>{row.fullName}</b></td><td>{row.institutionalEmail}</td><td><span className={`account-status ${row.activated?"activated":"pending"}`}><i aria-hidden="true"/>{row.activated?"Activada":"Pendiente"}</span></td><td>{formatLastAccess(row.activated?row.lastSignInAt:null)}</td></tr>)}</tbody></table><div className="table-footer">Mostrando {rows.length} cuentas docentes</div></>}</section></>;
}

function formatLastAccess(value:string|null){if(!value)return "Sin ingreso registrado";return new Intl.DateTimeFormat("es-PE",{dateStyle:"medium",timeStyle:"short",timeZone:"America/Lima"}).format(new Date(value));}

function AdminActivities(){return <><PageTitle eyebrow="GESTIÓN ACADÉMICA" title="Actividades" copy="Crea, asigna y supervisa las actividades del equipo docente." action={<button className="primary">＋ Nueva actividad</button>}/><div className="filter-row"><button className="active">Todas <b>12</b></button><button>Activas <b>7</b></button><button>Finalizadas <b>4</b></button><button>Borradores <b>1</b></button></div><div className="assignment-options"><span>Asignar a:</span><button>Todos los docentes</button><button>Por curso</button><button>Docentes específicos</button></div><div className="admin-activity-grid">{activities.map((a,i)=><article className="panel admin-activity" key={a.id}><div><span className={`badge ${i===2?"vencida":"pendiente"}`}>{i===2?"FINALIZADA":"ACTIVA"}</span><button>•••</button></div><h2>{a.name}</h2><p>{a.desc}</p><div className="assignment"><span><small>ASIGNACIÓN</small><b>{i===3?"18 docentes":"Todos los docentes"}</b></span><span><small>FECHA LÍMITE</small><b>{a.due}</b></span></div><div className="completion"><span><b>{[32,41,48,12][i]} de {i===3?18:48}</b> cumplieron</span><b>{[67,85,100,67][i]}%</b><i><em style={{width:`${[67,85,100,67][i]}%`}}/></i></div><div className="activity-status-summary"><span className="done">✓ Cumplieron</span><span className="waiting">◷ Pendientes</span><span className="late">! Vencidos</span></div><div className="card-footer"><button>Editar</button><button>Ver cumplimiento →</button></div></article>)}</div></>}

function AdminAnnouncements(){return <><PageTitle eyebrow="COMUNICACIÓN" title="Gestión de comunicados" copy="Crea y administra anuncios para el equipo docente." action={<button className="primary">＋ Nuevo comunicado</button>}/><section className="panel table-wrap"><table><thead><tr><th>Comunicado</th><th>Prioridad</th><th>Publicado</th><th>Alcance</th><th>Estado</th><th></th></tr></thead><tbody>{[["Reunión de coordinación académica","Urgente","13 ago 2026","48 docentes"],["Actualización de sílabos 2026-II","Importante","11 ago 2026","48 docentes"],["Bienvenida al ciclo académico","Normal","08 ago 2026","48 docentes"]].map((r,i)=><tr key={r[0]}><td><b>{r[0]}</b></td><td><span className={`badge ${i===0?"vencida":i===1?"pendiente":"completada"}`}>{r[1]}</span></td><td>{r[2]}</td><td>{r[3]}</td><td><span className="published">● Publicado</span></td><td><button>•••</button></td></tr>)}</tbody></table></section></>}

function Reports(){return <><PageTitle eyebrow="ANÁLISIS" title="Reportes de seguimiento" copy="Consulta y exporta el cumplimiento docente según los criterios seleccionados." action={<div className="export-actions"><button className="outline">↓ Exportar Excel</button><button className="primary">↓ Exportar PDF</button></div>}/><section className="panel report-filters"><h2>Filtros del reporte</h2><div>{["Docente: Todos","Curso: Todos","Actividad: Todas","Estado: Todos","Fecha: Ciclo actual"].map(x=><button className="outline" key={x}>{x} ⌄</button>)}</div><button className="primary">Aplicar filtros</button><button>Limpiar</button></section><section className="stats"><Stat icon="♧" value="48" label="Docentes evaluados" tone="navy"/><Stat icon="▤" value="482" label="Registros totales" tone="blue"/><Stat icon="✓" value="80%" label="Cumplimiento promedio" tone="green"/><Stat icon="!" value="14" label="Incumplimientos" tone="red"/></section><section className="panel report-placeholder"><div className="chart-bars">{[65,78,90,72,86,94,80].map((x,i)=><i key={i} style={{height:`${x}%`}}><span>{x}%</span></i>)}</div><div className="chart-labels"><span>Comunicación</span><span>Matemática</span><span>Metodología</span><span>Desarrollo</span><span>Habilidades</span><span>Ciudadanía</span><span>Promedio</span></div></section></>}
