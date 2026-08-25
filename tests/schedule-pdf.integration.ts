import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { createSchedulePdf } from "../lib/schedule-pdf";
import type { AcademicBlock } from "../lib/academic";

const base = {
  assignmentId: "assignment-a", teacherId: "teacher-a", teacherProfileId: "profile-a",
  teacherName: "DOCENTE FICTICIO DE PRUEBA", teacherEmail: "prueba@test.invalid",
  sectionId: "section-a", sectionCode: "1A", coordinators: [],
};
const blocks: AcademicBlock[] = [
  { ...base, courseId: "course-math", courseCode: "AC4014", courseName: "MATEMÁTICA", originalSection: "1A", component: "teoría", classNumber: 1001, day: "lunes", startTime: "07:00:00", endTime: "09:15:00", classroom: "Aula 401", modality: "Presencial" },
  { ...base, assignmentId: "assignment-b", courseId: "course-math", courseCode: "AC4014", courseName: "MATEMÁTICA", sectionId: "section-b", sectionCode: "1B", originalSection: "1B1", component: "práctica", classNumber: 1002, day: "miércoles", startTime: "10:30:00", endTime: "12:00:00", classroom: "Aula virtual", modality: "A distancia" },
  { ...base, assignmentId: "assignment-c", courseId: "course-ethics", courseCode: "AC4013", courseName: "INTRODUCCIÓN A LA ÉTICA", sectionId: "section-c", sectionCode: "1C", originalSection: "1C", component: "teoría", classNumber: 1372, day: "domingo", startTime: "18:15:00", endTime: "20:30:00", classroom: "B-302", modality: "Presencial" },
];

const pdf = createSchedulePdf("DOCENTE FICTICIO DE PRUEBA", blocks, { generatedAt: new Date("2026-08-25T12:00:00-05:00") });
const bytes = Buffer.from(pdf.output("arraybuffer"));
assert.equal(bytes.subarray(0, 5).toString(), "%PDF-");
assert.ok(pdf.getNumberOfPages() >= 1);
assert.match(pdf.getTextDimensions("DOCENTE FICTICIO DE PRUEBA").w.toString(), /\d/);
await mkdir("tmp/pdfs", { recursive: true });
await writeFile("tmp/pdfs/horario-docente-prueba.pdf", bytes);
console.log(JSON.stringify({ pdf: "ok", pages: pdf.getNumberOfPages(), blocks: blocks.length, theory: 2, practice: 1, presencial: 2, remote: 1 }));
