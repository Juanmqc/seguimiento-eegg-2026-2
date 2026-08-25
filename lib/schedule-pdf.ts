import { jsPDF } from "jspdf";
import autoTable, { type CellHookData, type RowInput } from "jspdf-autotable";
import type { AcademicBlock } from "@/lib/academic";

const DAYS = ["lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"] as const;
const DAY_LABELS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
const START_MINUTE = 7 * 60;
const SLOT_MINUTES = 45;

type PdfOptions = { generatedAt?: Date };
type CellMeta = { courseId: string; continuation: boolean };

function toMinutes(value: string) {
  const [hours, minutes] = value.slice(0, 5).split(":").map(Number);
  return hours * 60 + minutes;
}

function toTime(value: number) {
  return `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`;
}

function titleCase(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function courseColor(courseId: string): [number, number, number] {
  const palette: Array<[number, number, number]> = [
    [218, 246, 247], [224, 241, 252], [232, 245, 235], [255, 242, 215],
    [240, 233, 250], [252, 231, 235], [226, 243, 239], [236, 240, 248],
  ];
  let hash = 0;
  for (const character of courseId) hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  return palette[hash % palette.length];
}

function safeFilePart(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

function limaDate(date: Date) {
  return new Intl.DateTimeFormat("es-PE", {
    timeZone: "America/Lima", day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit", hour12: false,
  }).format(date);
}

export function createSchedulePdf(teacherName: string, blocks: AcademicBlock[], options: PdfOptions = {}) {
  const generatedAt = options.generatedAt ?? new Date();
  const latestEnd = Math.max(START_MINUTE + SLOT_MINUTES, ...blocks.map((block) => toMinutes(block.endTime)));
  const slotCount = Math.ceil((latestEnd - START_MINUTE) / SLOT_MINUTES);
  const slots = Array.from({ length: slotCount }, (_, index) => START_MINUTE + index * SLOT_MINUTES);
  const cellMap = new Map<string, { text: string; meta: CellMeta }>();

  for (const block of blocks) {
    const dayIndex = DAYS.indexOf(block.day as (typeof DAYS)[number]);
    if (dayIndex < 0) continue;
    const firstSlot = Math.max(0, Math.floor((toMinutes(block.startTime) - START_MINUTE) / SLOT_MINUTES));
    const occupied = Math.max(1, Math.ceil((toMinutes(block.endTime) - toMinutes(block.startTime)) / SLOT_MINUTES));
    const details = [
      block.courseName,
      `Sec. ${block.sectionCode} | ${titleCase(block.component)} | Clase ${block.classNumber}`,
      `${block.startTime.slice(0, 5)}-${block.endTime.slice(0, 5)} | ${block.classroom || "Por confirmar"} | ${block.modality || "Por confirmar"}`,
    ].join("\n");
    for (let offset = 0; offset < occupied; offset += 1) {
      const key = `${firstSlot + offset}:${dayIndex}`;
      const existing = cellMap.get(key);
      const text = offset === 0 ? details : "";
      cellMap.set(key, { text: existing?.text ? `${existing.text}\n${text}` : text, meta: { courseId: block.courseId, continuation: offset > 0 } });
    }
  }

  const rows: RowInput[] = slots.map((minute, rowIndex) => [
    `${toTime(minute)}\n${toTime(minute + SLOT_MINUTES)}`,
    ...DAYS.map((_, dayIndex) => cellMap.get(`${rowIndex}:${dayIndex}`)?.text ?? ""),
  ]);
  const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4", compress: true });
  pdf.setProperties({ title: `Horario 2026-II - ${teacherName}`, subject: "Horario semanal docente", author: "Portal de Seguimiento Docente" });

  const drawHeader = () => {
    pdf.setFillColor(0, 143, 154); pdf.rect(0, 0, 297, 23, "F");
    pdf.setTextColor(255, 255, 255); pdf.setFont("helvetica", "bold"); pdf.setFontSize(13);
    pdf.text("Universidad Norbert Wiener", 9, 9);
    pdf.setFontSize(8); pdf.text("Portal de Seguimiento Docente", 9, 15);
    pdf.setFont("helvetica", "normal"); pdf.text("Ciclo académico 2026-II", 288, 9, { align: "right" });
    pdf.text(`Generado: ${limaDate(generatedAt)}`, 288, 15, { align: "right" });
    pdf.setTextColor(10, 39, 69); pdf.setFont("helvetica", "bold"); pdf.setFontSize(11);
    pdf.text(teacherName, 9, 31);
  };

  drawHeader();
  autoTable(pdf, {
    startY: 36,
    head: [["Hora", ...DAY_LABELS]],
    body: rows,
    margin: { left: 7, right: 7, top: 36, bottom: 14 },
    theme: "grid",
    styles: { font: "helvetica", fontSize: 5.7, cellPadding: 1.2, lineColor: [190, 208, 217], lineWidth: 0.18, valign: "middle", overflow: "linebreak", minCellHeight: 10 },
    headStyles: { fillColor: [10, 43, 76], textColor: 255, fontStyle: "bold", halign: "center", fontSize: 7, minCellHeight: 8 },
    columnStyles: {
      0: { cellWidth: 19, halign: "center", fontStyle: "bold", fillColor: [244, 248, 250] },
      1: { cellWidth: 37.71 }, 2: { cellWidth: 37.71 }, 3: { cellWidth: 37.71 }, 4: { cellWidth: 37.71 },
      5: { cellWidth: 37.71 }, 6: { cellWidth: 37.71 }, 7: { cellWidth: 37.71 },
    },
    didParseCell: (data: CellHookData) => {
      if (data.section !== "body" || data.column.index === 0) return;
      const meta = cellMap.get(`${data.row.index}:${data.column.index - 1}`)?.meta;
      if (!meta) return;
      data.cell.styles.fillColor = courseColor(meta.courseId);
      data.cell.styles.textColor = [9, 45, 68];
      data.cell.styles.fontStyle = meta.continuation ? "normal" : "bold";
    },
    didDrawPage: ({ pageNumber }) => {
      if (pageNumber > 1) drawHeader();
      pdf.setFont("helvetica", "normal"); pdf.setFontSize(6.5); pdf.setTextColor(99, 115, 129);
      pdf.text("Portal de Seguimiento Docente - EEGG Lima Norte - 2026-II", 9, 203);
      pdf.text(`Página ${pageNumber}`, 288, 203, { align: "right" });
    },
  });
  return pdf;
}

export function downloadSchedulePdf(teacherName: string, blocks: AcademicBlock[]) {
  const pdf = createSchedulePdf(teacherName, blocks);
  pdf.save(`Horario_2026-II_${safeFilePart(teacherName) || "DOCENTE"}.pdf`);
}
