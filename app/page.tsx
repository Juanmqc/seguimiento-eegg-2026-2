"use client";

import { FormEvent, useMemo, useState } from "react";

type Role = "docente" | "admin";
type Status = "Pendiente" | "Completada" | "Vencida";

const teacherNav = ["Inicio", "Mis cursos", "Mi horario", "Actividades", "Comunicados", "Documentos", "Tutoriales", "Mi cumplimiento", "Mi perfil"];
const adminNav = ["Dashboard general", "Docentes", "Actividades", "Comunicados", "Documentos", "Tutoriales", "Reportes"];
const icons: Record<string, string> = {
  "Inicio": "⌂", "Mis cursos": "▤", "Mi horario": "◷", "Actividades": "✓", "Comunicados": "◉",
  "Documentos": "▱", "Tutoriales": "▷", "Mi cumplimiento": "◔", "Mi perfil": "♙",
  "Dashboard general": "⌂", "Docentes": "♧", "Reportes": "▥"
};

const activities = [
  { id: 1, name: "Confirmar recepción del sílabo", desc: "Revisa la versión final del sílabo y confirma su recepción.", published: "12 ago 2026", due: "18 ago 2026", status: "Pendiente" as Status },
  { id: 2, name: "Completar ficha de disponibilidad", desc: "Registra tus horarios disponibles para asesorías y reuniones.", published: "08 ago 2026", due: "14 ago 2026", status: "Completada" as Status },
  { id: 3, name: "Capacitación de aula virtual", desc: "Visualiza la inducción y adjunta la constancia correspondiente.", published: "01 ago 2026", due: "10 ago 2026", status: "Vencida" as Status },
  { id: 4, name: "Registrar plan de primera semana", desc: "Comparte las actividades previstas para el inicio de clases.", published: "13 ago 2026", due: "22 ago 2026", status: "Pendiente" as Status },
];

const courses = [
  { name: "Comunicación I", code: "HUMA101", section: "LN01 · LN02", time: "Lun / Mié 08:00–10:00", room: "Aula B-204", mode: "Presencial", color: "blue" },
  { name: "Metodología del Estudio", code: "HUMA108", section: "LN04", time: "Mar / Jue 10:00–12:00", room: "Aula C-108", mode: "Presencial", color: "green" },
  { name: "Taller de Habilidades", code: "HUMA115", section: "LN07", time: "Sáb 09:00–12:00", room: "Microsoft Teams", mode: "Virtual", color: "purple" },
];

const teacherRows = [
  ["María Elena Torres", "Comunicación I", "LN01, LN02", "8", "2", "0", "80%"],
  ["Carlos Alberto Rojas", "Matemática Básica", "LN03", "9", "1", "0", "90%"],
  ["Lucía Fernández Vega", "Metodología del Estudio", "LN04, LN05", "7", "2", "1", "70%"],
  ["Jorge Luis Mendoza", "Desarrollo Personal", "LN06", "10", "0", "0", "100%"],
  ["Rosa Milagros Paredes", "Taller de Habilidades", "LN07", "6", "3", "1", "60%"],
];

export default function Home() {
  const [logged, setLogged] = useState(false);
  const [role, setRole] = useState<Role>("docente");
  const [active, setActive] = useState("Inicio");
  const [done, setDone] = useState<number[]>([2]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [toast, setToast] = useState("");

  function login(e: FormEvent) { e.preventDefault(); setLogged(true); setActive(role === "docente" ? "Inicio" : "Dashboard general"); }
  function complete(id: number) { setDone((d) => [...new Set([...d, id])]); setToast("Actividad registrada como realizada"); setTimeout(() => setToast(""), 3000); }
  function switchRole(next: Role) { setRole(next); setActive(next === "docente" ? "Inicio" : "Dashboard general"); }

  if (!logged) return <Login role={role} setRole={setRole} login={login} />;
  const nav = role === "docente" ? teacherNav : adminNav;
  return (
    <div className={`app-shell ${role}`}>
      <Sidebar role={role} nav={nav} active={active} open={menuOpen} onSelect={(n) => { setActive(n); setMenuOpen(false); }} />
      <main className="main">
        <header className="topbar">
          <button className="mobile-menu" onClick={() => setMenuOpen(!menuOpen)} aria-label="Abrir menú">☰</button>
          <div className="crumb"><span>{role === "docente" ? "Portal del docente" : "Portal de Coordinación"}</span><b>/</b> {active}</div>
          <div className="top-actions">
            <button className="bell" aria-label="Notificaciones">♢<i>3</i></button>
            <button className="user-chip"><span className="avatar">{role === "docente" ? "MT" : "AC"}</span><span><b>{role === "docente" ? "María Torres" : "Ana Castillo"}</b><small>{role === "docente" ? "Docente" : "Coordinadora"}</small></span><em>⌄</em></button>
          </div>
        </header>
        <div className="page-content">
          {role === "docente" ? <TeacherView active={active} done={done} complete={complete} /> : <AdminView active={active} />}
        </div>
      </main>
      {menuOpen && <button className="backdrop" onClick={() => setMenuOpen(false)} aria-label="Cerrar menú" />}
      <div className="role-switch"><button onClick={() => switchRole(role === "docente" ? "admin" : "docente")}>↔ Ver como {role === "docente" ? "coordinador" : "docente"}</button><button onClick={() => setLogged(false)}>Salir</button></div>
      {toast && <div className="toast"><b>✓</b><span><strong>¡Registro exitoso!</strong>{toast}</span></div>}
    </div>
  );
}

function Login({ role, setRole, login }: { role: Role; setRole: (r: Role) => void; login: (e: FormEvent) => void }) {
  const [showPassword, setShowPassword] = useState(false);
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
      <form className="login-card" onSubmit={login}>
        <div className="mobile-logo"><div className="text-university-mark"><span>Universidad</span><strong>Norbert Wiener</strong></div></div>
        <span className="login-institution">UNIVERSIDAD NORBERT WIENER</span>
        <h2>Portal de Seguimiento<br/>Docente</h2>
        <p className="subtitle">Estudios Generales — Lima Norte — 2026-II</p>
        <div className="role-tabs"><button type="button" className={role === "docente" ? "active" : ""} onClick={() => setRole("docente")}>Docente</button><button type="button" className={role === "admin" ? "active" : ""} onClick={() => setRole("admin")}>Coordinación</button></div>
        <label>Usuario institucional<div className="input-wrap"><span aria-hidden="true">●</span><input required placeholder="nombre.apellido" defaultValue="maria.torres" /></div></label>
        <label>Contraseña<div className="input-wrap"><span aria-hidden="true">◆</span><input required type={showPassword ? "text" : "password"} placeholder="••••••••" defaultValue="demo2026"/><button type="button" aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"} aria-pressed={showPassword} onClick={() => setShowPassword(!showPassword)}>{showPassword ? "◌" : "◉"}</button></div></label>
        <div className="login-meta"><label><input type="checkbox"/> Recordarme</label><a href="#demo">¿Olvidaste tu contraseña?</a></div>
        <button className="primary login-button">Iniciar sesión <span>→</span></button>
        <div className="demo-note"><b>i</b><span><strong>Acceso de demostración</strong>Puedes ingresar con los datos precargados.</span></div>
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
    <div className="side-version">Portal EEGG <span>v1.0 demo</span></div>
  </aside>
}

function TeacherView({ active, done, complete }: { active: string; done: number[]; complete: (id: number) => void }) {
  if (active === "Inicio") return <TeacherHome done={done} />;
  if (active === "Mis cursos") return <Courses />;
  if (active === "Mi horario") return <Schedule />;
  if (active === "Actividades") return <Activities done={done} complete={complete} />;
  if (active === "Comunicados") return <Announcements />;
  if (active === "Documentos") return <Documents admin={false} />;
  if (active === "Tutoriales") return <Tutorials admin={false} />;
  if (active === "Mi cumplimiento") return <Compliance done={done} />;
  return <Profile />;
}

function PageTitle({ eyebrow, title, copy, action }: { eyebrow?: string; title: string; copy: string; action?: React.ReactNode }) {
  return <div className="page-title"><div>{eyebrow && <span>{eyebrow}</span>}<h1>{title}</h1><p>{copy}</p></div>{action}</div>;
}

function TeacherHome({ done }: { done: number[] }) {
  const progress = Math.min(100, 62 + Math.max(0, done.length - 1) * 8);
  const currentDate = new Intl.DateTimeFormat("es-PE", { weekday: "long", day: "numeric", month: "long" }).format(new Date()).toLocaleUpperCase("es-PE");
  return <>
    <PageTitle eyebrow={currentDate} title="¡Buenos días, María!" copy="Aquí tienes un resumen de tus actividades para esta semana." />
    <div className="notice urgent"><span className="notice-icon">!</span><div><b>Reunión de coordinación académica</b><p>Este viernes 14 de agosto a las 4:00 p. m. · Sala de reuniones, pabellón B.</p></div><button>Ver comunicado →</button></div>
    <section className="stats teacher-stats">
      <Stat icon="✓" value="4" label="Actividades asignadas" tone="navy"/><Stat icon="●" value={String(done.length)} label="Actividades realizadas" tone="green"/><Stat icon="◷" value={String(4-done.length)} label="Actividades pendientes" tone="orange"/><Stat icon="!" value="1" label="Actividad vencida" tone="red"/>
    </section>
    <div className="dashboard-grid">
      <section className="panel tasks-panel"><PanelHead title="Actividades pendientes" link="Ver todas"/><div className="task-list">
        <TaskMini color="orange" title="Confirmar recepción del sílabo" tag="Académica" due="Vence el 18 ago"/>
        <TaskMini color="blue" title="Registrar plan de primera semana" tag="Planificación" due="Vence el 22 ago"/>
        <TaskMini color="red" title="Capacitación de aula virtual" tag="Capacitación" due="Venció el 10 ago"/>
      </div></section>
      <section className="panel progress-panel"><PanelHead title="Mi cumplimiento" link="Ver detalle"/><div className="progress-ring" style={{"--progress": `${progress * 3.6}deg`} as React.CSSProperties}><div><strong>{progress}%</strong><span>Cumplimiento</span></div></div><div className="progress-legend"><span><i className="green-dot"/>Realizadas <b>{done.length}</b></span><span><i className="orange-dot"/>Pendientes <b>{4-done.length}</b></span><span><i className="red-dot"/>Vencidas <b>1</b></span></div><p>Estás cerca de tu meta. Completa tus pendientes antes de la fecha límite.</p></section>
      <section className="panel dates-panel"><PanelHead title="Próximas fechas" link="Ver horario"/><div className="date-row"><div><b>14</b><span>AGO</span></div><p><strong>Reunión de coordinación</strong><small>Viernes · 4:00 p. m.</small></p><i>›</i></div><div className="date-row"><div><b>24</b><span>AGO</span></div><p><strong>Inicio de clases</strong><small>Lunes · 8:00 a. m.</small></p><i>›</i></div><div className="date-row"><div><b>31</b><span>AGO</span></div><p><strong>Entrega de diagnóstico</strong><small>Lunes · Todo el día</small></p><i>›</i></div></section>
      <section className="panel quick-panel"><PanelHead title="Accesos rápidos"/><div><button><i>▤</i><span><b>Mis cursos</b><small>3 cursos asignados</small></span>›</button><button><i>▱</i><span><b>Documentos</b><small>Sílabos y formatos</small></span>›</button><button><i>▷</i><span><b>Tutoriales</b><small>Guías y videos</small></span>›</button></div></section>
    </div>
  </>;
}

function Stat({ icon, value, label, tone }: { icon: string; value: string; label: string; tone: string }) { return <div className="stat"><i className={tone}>{icon}</i><div><strong>{value}</strong><span>{label}</span></div></div>; }
function PanelHead({ title, link }: { title: string; link?: string }) { return <div className="panel-head"><h2>{title}</h2>{link && <button>{link} →</button>}</div>; }
function TaskMini({ color, title, tag, due }: { color: string; title: string; tag: string; due: string }) { return <div className={`task-mini ${color}`}><i>□</i><div><b>{title}</b><span><em>{tag}</em> · {due}</span></div><button>›</button></div>; }

function Courses() { return <><PageTitle eyebrow="DOCENCIA" title="Mis cursos" copy="Consulta tus asignaturas, horarios y materiales del ciclo 2026-II."/><div className="course-grid">{courses.map(c => <article className={`course-card ${c.color}`} key={c.name}><div className="course-top"><span>{c.code}</span><em>{c.mode}</em></div><h2>{c.name}</h2><p>Secciones <b>{c.section}</b></p><div className="course-info"><span><i>◷</i><small>HORARIO</small><b>{c.time}</b></span><span><i>⌖</i><small>AULA</small><b>{c.room}</b></span></div><div className="course-actions"><button className="primary">Ver sílabo</button><button>Documentos</button></div></article>)}</div></> }

function Schedule() { const days = ["Lunes","Martes","Miércoles","Jueves","Viernes","Sábado"]; return <><PageTitle eyebrow="AGENDA ACADÉMICA" title="Mi horario semanal" copy="Ciclo 2026-II · Vigente desde el 24 de agosto." action={<button className="outline">↓ Descargar horario</button>}/><section className="schedule panel"><div className="schedule-grid"><div className="hour-head">HORA</div>{days.map(d=><div className="day-head" key={d}>{d.toUpperCase()}</div>)}{["08:00","09:00","10:00","11:00","12:00"].map((h,ri)=><div className="schedule-row" key={h} style={{gridRow:ri+2}}><span>{h}</span></div>)}<div className="class-block blue" style={{gridColumn:2,gridRow:"2 / 4"}}><b>Comunicación I</b><span>LN01 · B-204</span></div><div className="class-block blue" style={{gridColumn:4,gridRow:"2 / 4"}}><b>Comunicación I</b><span>LN02 · B-204</span></div><div className="class-block green" style={{gridColumn:3,gridRow:"4 / 6"}}><b>Metodología</b><span>LN04 · C-108</span></div><div className="class-block green" style={{gridColumn:5,gridRow:"4 / 6"}}><b>Metodología</b><span>LN04 · C-108</span></div><div className="class-block purple" style={{gridColumn:7,gridRow:"3 / 6"}}><b>Taller de Habilidades</b><span>LN07 · Virtual</span></div></div></section></> }

function Activities({ done, complete }: { done: number[]; complete: (id: number) => void }) { const [filter,setFilter]=useState("Todas"); const shown=activities.filter(a=>filter==="Todas" || (done.includes(a.id)?"Completada":a.status)===filter); return <><PageTitle eyebrow="SEGUIMIENTO" title="Mis actividades" copy="Revisa tus tareas académicas y administrativas y registra su cumplimiento."/><div className="filter-row">{["Todas","Pendiente","Completada","Vencida"].map(f=><button key={f} className={filter===f?"active":""} onClick={()=>setFilter(f)}>{f}</button>)}</div><div className="activity-list">{shown.map(a=>{const current=done.includes(a.id)?"Completada":a.status;return <article className="activity-card" key={a.id}><div className={`status-mark ${current.toLowerCase()}`}>{current==="Completada"?"✓":current==="Vencida"?"!":"◷"}</div><div className="activity-body"><div className="activity-title"><div><span className={`badge ${current.toLowerCase()}`}>{current}</span><h2>{a.name}</h2></div><button>•••</button></div><p>{a.desc}</p><div className="activity-dates"><span><small>PUBLICADA</small><b>{a.published}</b></span><span><small>FECHA LÍMITE</small><b>{a.due}</b></span></div>{current!=="Completada"?<><textarea placeholder="Añade una observación (opcional)"/><div className="evidence"><button>＋ Adjuntar evidencia</button><small>PDF, JPG o PNG · Máx. 10 MB (próximamente)</small></div><button className="primary" onClick={()=>complete(a.id)}>✓ Marcar como realizada</button></>:<div className="completed-note"><b>✓ Actividad registrada</b><span>Tu confirmación quedó guardada correctamente.</span></div>}</div></article>})}</div></> }

function Announcements() { const items=[{level:"urgent",tag:"URGENTE",date:"13 AGO",title:"Reunión de coordinación académica",copy:"Participación obligatoria este viernes a las 4:00 p. m. en la sala del pabellón B."},{level:"important",tag:"IMPORTANTE",date:"11 AGO",title:"Actualización de sílabos 2026-II",copy:"Ya se encuentran disponibles las versiones finales de los sílabos del ciclo."},{level:"normal",tag:"INFORMATIVO",date:"08 AGO",title:"Bienvenida al ciclo académico",copy:"Coordinación de Estudios Generales les da la bienvenida y comparte las fechas clave."}]; return <><PageTitle eyebrow="COORDINACIÓN" title="Comunicados" copy="Información y anuncios oficiales para el equipo docente."/><div className="announcement-list">{items.map(x=><article className={`announcement ${x.level}`} key={x.title}><div className="announce-date"><b>{x.date.split(" ")[0]}</b><span>{x.date.split(" ")[1]}</span></div><div><span className="badge">{x.tag}</span><h2>{x.title}</h2><p>{x.copy}</p><button>Leer comunicado completo →</button></div></article>)}</div></> }

const docCats=["Sílabos","Formatos y solicitudes","Rectificaciones","Manuales","Documentos académicos","Otros documentos"];
function Documents({admin}:{admin:boolean}) { return <><PageTitle eyebrow="RECURSOS" title={admin?"Gestión de documentos":"Documentos"} copy={admin?"Publica y organiza los recursos institucionales para docentes.":"Encuentra sílabos, formatos y documentos académicos en un solo lugar."} action={admin?<button className="primary">＋ Agregar documento</button>:undefined}/><div className="category-grid">{docCats.map((x,i)=><article className="category-card" key={x}><i>{["▤","▱","↻","▥","▣","•••"][i]}</i><div><h2>{x}</h2><p>{["12 archivos","8 archivos","4 archivos","6 archivos","15 archivos","3 archivos"][i]}</p></div><button>{admin?"Abrir":"›"}</button></article>)}</div><section className="panel file-panel"><PanelHead title="Archivos recientes" link="Ver todos"/><div className="file-row"><i>PDF</i><div><b>Sílabo Comunicación I — 2026-II</b><small>Actualizado el 12 ago 2026 · 2.4 MB</small></div><div className="file-actions">{admin&&<><button>Editar</button><button>Eliminar</button></>}<button>Abrir</button></div></div><div className="file-row"><i>XLS</i><div><b>Formato de registro de asistencia</b><small>Actualizado el 10 ago 2026 · 680 KB</small></div><div className="file-actions">{admin&&<><button>Editar</button><button>Eliminar</button></>}<button>Abrir</button></div></div></section></> }

const tutorials=["Introducción a Canvas","Registro de notas en PeopleSoft","Clases efectivas en Microsoft Teams","Registro de asistencia","Publicar materiales en Canvas","Solicitud de rectificación"];
function Tutorials({admin}:{admin:boolean}) { return <><PageTitle eyebrow="APRENDIZAJE" title={admin?"Gestión de tutoriales":"Tutoriales"} copy={admin?"Registra videos y clasifícalos por plataforma o procedimiento.":"Videos breves para ayudarte con las principales plataformas y procesos."} action={admin?<button className="primary">＋ Registrar video</button>:undefined}/><div className="filter-row"><button className="active">Todos</button>{["Canvas","PeopleSoft","Microsoft Teams","Registro de notas","Registro de asistencia","Otros procedimientos"].map(x=><button key={x}>{x}</button>)}</div><div className="tutorial-grid">{tutorials.map((t,i)=><article className="tutorial" key={t}><div className={`video-cover c${i}`}><button>▶</button><span>{["04:32","06:18","05:44","03:25","07:12","04:08"][i]}</span></div><div><span className="badge">{["CANVAS","PEOPLESOFT","TEAMS","ASISTENCIA","CANVAS","PROCEDIMIENTOS"][i]}</span><h2>{t}</h2><p>Guía práctica paso a paso para docentes.</p></div></article>)}</div></> }

function Compliance({done}:{done:number[]}) { const pct=Math.min(100,62+(done.length-1)*8); return <><PageTitle eyebrow="DESEMPEÑO PERSONAL" title="Mi cumplimiento" copy="Resumen de tus actividades asignadas durante el ciclo 2026-II."/><section className="stats"><Stat icon="▤" value="10" label="Asignadas" tone="navy"/><Stat icon="✓" value={String(6+done.length)} label="Realizadas" tone="green"/><Stat icon="◷" value={String(3-done.length+1)} label="Pendientes" tone="orange"/><Stat icon="!" value="1" label="Vencida" tone="red"/></section><section className="panel compliance-card"><div><span>CUMPLIMIENTO GENERAL</span><h2>{pct}%</h2><p>Has completado {6+done.length} de 10 actividades asignadas.</p></div><div className="big-progress"><div style={{width:`${pct}%`}}/></div><div className="milestones"><span>0%</span><span>Meta institucional: 90%</span><span>100%</span></div></section></> }

function Profile(){return <><PageTitle eyebrow="CUENTA" title="Mi perfil" copy="Información docente registrada para el ciclo actual."/><section className="panel profile-card"><div className="profile-head"><span className="profile-avatar">MT</span><div><h2>María Elena Torres Salazar</h2><p>Docente de Estudios Generales</p><span className="badge completada">PERFIL ACTIVO</span></div><button className="outline">Editar datos de contacto</button></div><div className="profile-grid"><div><small>CÓDIGO DOCENTE</small><b>DOC-08421</b></div><div><small>CORREO INSTITUCIONAL</small><b>maria.torres@universidad.edu.pe</b></div><div><small>SEDE</small><b>Lima Norte</b></div><div><small>CICLO</small><b>2026-II</b></div></div><PanelHead title="Cursos asignados"/><div className="profile-courses">{courses.map(c=><span key={c.name}><i>▤</i><b>{c.name}</b><small>{c.section}</small></span>)}</div></section></>}

function AdminView({active}:{active:string}) {
 if(active==="Dashboard general") return <AdminDashboard/>;
 if(active==="Docentes") return <Teachers/>;
 if(active==="Actividades") return <AdminActivities/>;
 if(active==="Comunicados") return <AdminAnnouncements/>;
 if(active==="Documentos") return <Documents admin/>;
 if(active==="Tutoriales") return <Tutorials admin/>;
 return <Reports/>;
}

function AdminDashboard(){return <><PageTitle eyebrow="PORTAL DE COORDINACIÓN" title="Dashboard general" copy="Seguimiento del equipo docente · Estudios Generales Lima Norte · 2026-II" action={<button className="outline">↓ Exportar resumen</button>}/><section className="stats admin-stats"><Stat icon="♧" value="48" label="Total de docentes" tone="navy"/><Stat icon="▤" value="12" label="Actividades asignadas" tone="blue"/><Stat icon="✓" value="386" label="Actividades realizadas" tone="green"/><Stat icon="◷" value="82" label="Actividades pendientes" tone="orange"/><Stat icon="!" value="14" label="Actividades vencidas" tone="red"/><Stat icon="◔" value="80%" label="Cumplimiento general" tone="blue"/></section><div className="admin-grid"><section className="panel overall"><PanelHead title="Cumplimiento general" link="Ver reporte"/><div className="overall-body"><div className="progress-ring big" style={{"--progress":"288deg"} as React.CSSProperties}><div><strong>80%</strong><span>General</span></div></div><div className="overall-copy"><h3>Buen nivel de cumplimiento</h3><p>El equipo está a 10 puntos de la meta institucional.</p><div className="big-progress"><div style={{width:"80%"}}/></div><small>Meta institucional <b>90%</b></small></div></div></section><section className="panel attention"><PanelHead title="Requieren atención" link="Ver docentes"/><div className="attention-row"><span>RP</span><div><b>Rosa M. Paredes</b><small>4 actividades pendientes</small></div><em>60%</em></div><div className="attention-row"><span>LF</span><div><b>Lucía Fernández</b><small>3 actividades pendientes</small></div><em>70%</em></div><div className="attention-row"><span>AV</span><div><b>Andrés Valdivia</b><small>2 actividades vencidas</small></div><em>72%</em></div></section><section className="panel admin-tasks"><PanelHead title="Actividades recientes" link="Gestionar"/>{activities.slice(0,3).map(a=><div className="admin-task-row" key={a.id}><i>▤</i><div><b>{a.name}</b><small>Asignada a 48 docentes · Vence {a.due}</small></div><span>{a.id===1?"32 / 48":"41 / 48"}</span></div>)}</section><section className="panel distribution"><PanelHead title="Estado de actividades"/><div className="bars"><div><span>Completadas <b>386</b></span><i><em style={{width:"80%"}}/></i></div><div><span>Pendientes <b>82</b></span><i><em style={{width:"17%"}}/></i></div><div><span>Vencidas <b>14</b></span><i><em style={{width:"3%"}}/></i></div></div></section></div></>}

function Teachers(){const [q,setQ]=useState("");const rows=teacherRows.filter(r=>r[0].toLowerCase().includes(q.toLowerCase()));return <><PageTitle eyebrow="EQUIPO ACADÉMICO" title="Docentes" copy="Consulta el avance y cumplimiento individual del equipo docente." action={<button className="primary">＋ Registrar docente</button>}/><div className="table-tools"><div className="search">⌕ <input placeholder="Buscar docente..." value={q} onChange={e=>setQ(e.target.value)}/></div><button className="outline">Curso: Todos ⌄</button><button className="outline">Estado: Todos ⌄</button></div><section className="panel table-wrap"><table><thead><tr>{["Docente","Curso","Secciones","Realizadas","Pendientes","Vencidas","Cumplimiento",""] .map(x=><th key={x}>{x}</th>)}</tr></thead><tbody>{rows.map((r,i)=><tr key={r[0]}><td><span className="table-avatar">{r[0].split(" ").map(x=>x[0]).slice(0,2).join("")}</span><b>{r[0]}</b></td><td>{r[1]}</td><td>{r[2]}</td><td><span className="count green">{r[3]}</span></td><td><span className="count orange">{r[4]}</span></td><td><span className="count red">{r[5]}</span></td><td><div className="mini-progress"><i><em style={{width:r[6]}}/></i><b className={i===4?"low":""}>{r[6]}</b></div></td><td><button>•••</button></td></tr>)}</tbody></table><div className="table-footer">Mostrando {rows.length} de 48 docentes <span><button>‹</button><button className="active">1</button><button>2</button><button>3</button><button>›</button></span></div></section></>}

function AdminActivities(){return <><PageTitle eyebrow="GESTIÓN ACADÉMICA" title="Actividades" copy="Crea, asigna y supervisa las actividades del equipo docente." action={<button className="primary">＋ Nueva actividad</button>}/><div className="filter-row"><button className="active">Todas <b>12</b></button><button>Activas <b>7</b></button><button>Finalizadas <b>4</b></button><button>Borradores <b>1</b></button></div><div className="assignment-options"><span>Asignar a:</span><button>Todos los docentes</button><button>Por curso</button><button>Docentes específicos</button></div><div className="admin-activity-grid">{activities.map((a,i)=><article className="panel admin-activity" key={a.id}><div><span className={`badge ${i===2?"vencida":"pendiente"}`}>{i===2?"FINALIZADA":"ACTIVA"}</span><button>•••</button></div><h2>{a.name}</h2><p>{a.desc}</p><div className="assignment"><span><small>ASIGNACIÓN</small><b>{i===3?"18 docentes":"Todos los docentes"}</b></span><span><small>FECHA LÍMITE</small><b>{a.due}</b></span></div><div className="completion"><span><b>{[32,41,48,12][i]} de {i===3?18:48}</b> cumplieron</span><b>{[67,85,100,67][i]}%</b><i><em style={{width:`${[67,85,100,67][i]}%`}}/></i></div><div className="activity-status-summary"><span className="done">✓ Cumplieron</span><span className="waiting">◷ Pendientes</span><span className="late">! Vencidos</span></div><div className="card-footer"><button>Editar</button><button>Ver cumplimiento →</button></div></article>)}</div></>}

function AdminAnnouncements(){return <><PageTitle eyebrow="COMUNICACIÓN" title="Gestión de comunicados" copy="Crea y administra anuncios para el equipo docente." action={<button className="primary">＋ Nuevo comunicado</button>}/><section className="panel table-wrap"><table><thead><tr><th>Comunicado</th><th>Prioridad</th><th>Publicado</th><th>Alcance</th><th>Estado</th><th></th></tr></thead><tbody>{[["Reunión de coordinación académica","Urgente","13 ago 2026","48 docentes"],["Actualización de sílabos 2026-II","Importante","11 ago 2026","48 docentes"],["Bienvenida al ciclo académico","Normal","08 ago 2026","48 docentes"]].map((r,i)=><tr key={r[0]}><td><b>{r[0]}</b></td><td><span className={`badge ${i===0?"vencida":i===1?"pendiente":"completada"}`}>{r[1]}</span></td><td>{r[2]}</td><td>{r[3]}</td><td><span className="published">● Publicado</span></td><td><button>•••</button></td></tr>)}</tbody></table></section></>}

function Reports(){return <><PageTitle eyebrow="ANÁLISIS" title="Reportes de seguimiento" copy="Consulta y exporta el cumplimiento docente según los criterios seleccionados." action={<div className="export-actions"><button className="outline">↓ Exportar Excel</button><button className="primary">↓ Exportar PDF</button></div>}/><section className="panel report-filters"><h2>Filtros del reporte</h2><div>{["Docente: Todos","Curso: Todos","Actividad: Todas","Estado: Todos","Fecha: Ciclo actual"].map(x=><button className="outline" key={x}>{x} ⌄</button>)}</div><button className="primary">Aplicar filtros</button><button>Limpiar</button></section><section className="stats"><Stat icon="♧" value="48" label="Docentes evaluados" tone="navy"/><Stat icon="▤" value="482" label="Registros totales" tone="blue"/><Stat icon="✓" value="80%" label="Cumplimiento promedio" tone="green"/><Stat icon="!" value="14" label="Incumplimientos" tone="red"/></section><section className="panel report-placeholder"><div className="chart-bars">{[65,78,90,72,86,94,80].map((x,i)=><i key={i} style={{height:`${x}%`}}><span>{x}%</span></i>)}</div><div className="chart-labels"><span>Comunicación</span><span>Matemática</span><span>Metodología</span><span>Desarrollo</span><span>Habilidades</span><span>Ciudadanía</span><span>Promedio</span></div></section></>}
