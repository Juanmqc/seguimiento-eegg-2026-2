export interface PortalTutorial {
  id: string;
  title: string;
  category: string;
  description: string;
  videoUrl: string;
  active: boolean;
}

export const portalTutorials: PortalTutorial[] = [
  {
    id: "marcacion-ingreso-salida-docentes",
    title: "Marcación de ingreso y salida – Docentes",
    category: "Procedimientos institucionales",
    description: "Video tutorial institucional para el registro de ingreso y salida docente.",
    videoUrl: "https://wienercarrion-my.sharepoint.com/:v:/g/personal/juan_quinonez_uwiener_edu_pe/IQBL09qg8IHRQKTL1z6NWPj0AawVi0TWfGhlku4YIr2VGX0?nav=eyJyZWZlcnJhbEluZm8iOnsicmVmZXJyYWxBcHAiOiJPbmVEcml2ZUZvckJ1c2luZXNzIiwicmVmZXJyYWxBcHBQbGF0Zm9ybSI6IldlYiIsInJlZmVycmFsTW9kZSI6InZpZXciLCJyZWZlcnJhbFZpZXciOiJNeUZpbGVzTGlua0NvcHkifX0&e=FeeMdP",
    active: true,
  },
  {
    id: "toma-asistencia-estudiantes",
    title: "Toma de asistencia de estudiantes",
    category: "Registro de asistencia",
    description: "Video tutorial institucional para registrar la asistencia de estudiantes.",
    videoUrl: "https://wienercarrion-my.sharepoint.com/:v:/g/personal/juan_quinonez_uwiener_edu_pe/IQDyHI4ndyAARbcNI28k_Me5AQSYa9UNqCIm4eUnmiLfTY4?nav=eyJyZWZlcnJhbEluZm8iOnsicmVmZXJyYWxBcHAiOiJPbmVEcml2ZUZvckJ1c2luZXNzIiwicmVmZXJyYWxBcHBQbGF0Zm9ybSI6IldlYiIsInJlZmVycmFsTW9kZSI6InZpZXciLCJyZWZlcnJhbFZpZXciOiJNeUZpbGVzTGlua0NvcHkifX0&e=jEPFgM",
    active: true,
  },
  {
    id: "consulta-marcaciones-tardanzas-peoplesoft",
    title: "Consulta de marcaciones y tardanzas en PeopleSoft",
    category: "PeopleSoft / Marcaciones",
    description: "Aprende a revisar tus marcaciones de ingreso y salida en PeopleSoft, identificar tardanzas o registros pendientes y verificar oportunamente si necesitas solicitar una rectificación.",
    videoUrl: "https://wienercarrion-my.sharepoint.com/:v:/g/personal/juan_quinonez_uwiener_edu_pe/IQB5dOF5FlfHTJAcPcKA8n4TAVzgmWlw6veCrc-Or6jLwdM?nav=eyJyZWZlcnJhbEluZm8iOnsicmVmZXJyYWxBcHAiOiJPbmVEcml2ZUZvckJ1c2luZXNzIiwicmVmZXJyYWxBcHBQbGF0Zm9ybSI6IldlYiIsInJlZmVycmFsTW9kZSI6IldlYiIsInJlZmVycmFsTW9kZSI6InZpZXciLCJyZWZlcnJhbFZpZXciOiJNeUZpbGVzTGlua0NvcHkifX0&e=fVyZjY",
    active: true,
  },
];
