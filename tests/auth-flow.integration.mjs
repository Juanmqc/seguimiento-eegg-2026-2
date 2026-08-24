import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_TEST_URL;
const anonKey = process.env.SUPABASE_TEST_ANON_KEY;
const serviceKey = process.env.SUPABASE_TEST_SERVICE_KEY;
assert(url && anonKey && serviceKey, "Missing local Supabase test configuration");

const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
const suffix = crypto.randomUUID().slice(0, 8);
const teacherEmail = `teacher-${suffix}@test.invalid`;
const pendingEmail = `pending-${suffix}@test.invalid`;
const coordinationEmail = `coord-${suffix}@test.invalid`;
const password = `Local-only-${suffix}-A9!`;
const createdUserIds = [];

async function createProfileUser(email, role, withPassword) {
  const { data, error } = withPassword
    ? await admin.auth.admin.createUser({ email, password, email_confirm: true })
    : await admin.auth.admin.generateLink({ type: "invite", email });
  if (error) throw error;
  createdUserIds.push(data.user.id);
  const { error: profileError } = await admin.from("profiles").insert({
    id: data.user.id,
    role,
    full_name: role === "coordinacion" ? "Coordinación Ficticia" : `Docente Ficticio ${email}`,
    institutional_email: email,
    active: true,
  });
  if (profileError) throw profileError;
  if (role === "docente") {
    const { error: teacherError } = await admin.from("teachers").insert({
      profile_id: data.user.id,
      display_name: `Docente Ficticio ${email}`,
      institutional_email: email,
      active: true,
    });
    if (teacherError) throw teacherError;
  }
  return data.user;
}

try {
  const teacher = await createProfileUser(teacherEmail, "docente", true);
  await createProfileUser(pendingEmail, "docente", false);
  await createProfileUser(coordinationEmail, "coordinacion", true);

  const teacherClient = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: teacherLogin, error: teacherLoginError } = await teacherClient.auth.signInWithPassword({ email: teacherEmail, password });
  assert.ifError(teacherLoginError);
  assert.equal(teacherLogin.user?.id, teacher.id);

  const authenticatedRpc = createClient(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${teacherLogin.session.access_token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: recordedAt, error: recordError } = await authenticatedRpc.rpc("record_portal_password_login_v2");
  assert.ifError(recordError);
  assert.ok(recordedAt);

  const { error: forbiddenError } = await authenticatedRpc.rpc("get_teacher_access_status");
  assert.ok(forbiddenError, "Teacher unexpectedly read the access overview");

  const coordinationClient = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: coordinationLogin, error: coordinationLoginError } = await coordinationClient.auth.signInWithPassword({ email: coordinationEmail, password });
  assert.ifError(coordinationLoginError);
  const coordinationRpc = createClient(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${coordinationLogin.session.access_token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: statuses, error: statusError } = await coordinationRpc.rpc("get_teacher_access_status");
  assert.ifError(statusError);
  const activated = statuses.find((row) => row.institutional_email === teacherEmail);
  const pending = statuses.find((row) => row.institutional_email === pendingEmail);
  assert.equal(activated?.activated, true);
  assert.ok(activated?.last_sign_in_at);
  assert.equal(pending?.activated, false);
  assert.equal(pending?.last_sign_in_at, null);

  console.log(JSON.stringify({ passwordLogin: "ok", accessRecorded: "ok", coordinationRead: "ok", teacherIsolation: "ok", pendingPreserved: "ok" }));
} finally {
  for (const userId of createdUserIds.reverse()) await admin.auth.admin.deleteUser(userId);
}
