import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_TEST_URL;
const serviceKey = process.env.SUPABASE_TEST_SERVICE_KEY;
const sourceRoot = process.env.SYLLABUS_SOURCE;
assert(url && serviceKey && sourceRoot, "Missing syllabus verification configuration");

const files = {
  AC4011: "AC4011 - DESARROLLO HUMANO Y SOCIAL.pdf",
  AC4012: "AC4012 - INGLÉS I.pdf",
  AC4013: "AC4013 - INTRODUCCIÓN A LA ÉTICA.pdf",
  AC4014: "AC4014 - MATEMÁTICA.pdf",
  AC4021: "AC4021 - ESTILO DE VIDA, SALUD Y MEDIO AMBIENTE.pdf",
  AC4022: "AC4022 - INGLÉS II.pdf",
  AC4024: "AC4024 - CÁLCULO I.pdf",
  AC4037: "AC4037 - ESTADÍSTICA.pdf",
  AC4063: "AC4063 - TENDENCIAS GLOBALES EN SALUD.pdf",
  AC4066: "AC4066 - MATEMÁTICA.pdf",
  IS6033: "IS6033 - MATEMÁTICA DISCRETA.pdf",
};

const supabase = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
const { data: documents, error: documentError } = await supabase
  .from("documents")
  .select("document_code, course_id, storage_path, active")
  .eq("category", "syllabus")
  .eq("academic_term", "2026-II");
assert.ifError(documentError);
assert.equal(documents.length, 11);
assert.equal(documents.filter((document) => document.active).length, 11);
assert.equal(new Set(documents.map((document) => document.course_id)).size, 11);

let hashMatches = 0;
for (const [code, fileName] of Object.entries(files)) {
  const { data, error } = await supabase.storage.from("syllabi").download(`2026-II/${code}.pdf`);
  assert.ifError(error);
  const [remote, local] = await Promise.all([
    data.arrayBuffer().then((buffer) => Buffer.from(buffer)),
    readFile(join(sourceRoot, fileName)),
  ]);
  const digest = (bytes) => createHash("sha256").update(bytes).digest("hex");
  assert.equal(digest(remote), digest(local), `${code} differs from its source PDF`);
  hashMatches += 1;
}

console.log(JSON.stringify({ documentRows: documents.length, activeRows: 11, uniqueCourses: 11, hashMatches }));
