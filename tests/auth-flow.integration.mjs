import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_TEST_URL;
const anonKey = process.env.SUPABASE_TEST_ANON_KEY;
const serviceKey = process.env.SUPABASE_TEST_SERVICE_KEY;
const mailpitUrl = process.env.SUPABASE_TEST_MAILPIT_URL;
assert(url && anonKey && serviceKey, "Missing local Supabase test configuration");

const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
const suffix = crypto.randomUUID().slice(0, 8);
const teacherEmail = `teacher-${suffix}@test.invalid`;
const activationEmail = `activation-${suffix}@test.invalid`;
const pendingEmail = `pending-${suffix}@test.invalid`;
const coordinationEmail = `coord-${suffix}@test.invalid`;
const password = `Local-only-${suffix}-A9!`;
const replacementPassword = `Local-new-${suffix}-B8!`;
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

async function createInvitedTeacher(email) {
  const { data, error } = await admin.auth.admin.generateLink({
    type: "invite",
    email,
    options: { redirectTo: "http://127.0.0.1:3000/?set-password=1" },
  });
  if (error) throw error;
  createdUserIds.push(data.user.id);
  const { error: profileError } = await admin.from("profiles").insert({
    id: data.user.id,
    role: "docente",
    full_name: `Docente Activación ${email}`,
    institutional_email: email,
    active: true,
  });
  if (profileError) throw profileError;
  const { error: teacherError } = await admin.from("teachers").insert({
    profile_id: data.user.id,
    display_name: `Docente Activación ${email}`,
    institutional_email: email,
    active: true,
  });
  if (teacherError) throw teacherError;
  return data;
}

try {
  const teacher = await createProfileUser(teacherEmail, "docente", true);
  const invited = await createInvitedTeacher(activationEmail);
  await createProfileUser(pendingEmail, "docente", false);
  await createProfileUser(coordinationEmail, "coordinacion", true);

  const teacherClient = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: teacherLogin, error: teacherLoginError } = await teacherClient.auth.signInWithPassword({ email: teacherEmail, password });
  assert.ifError(teacherLoginError);
  assert.equal(teacherLogin.user?.id, teacher.id);

  const { error: incorrectPasswordError } = await teacherClient.auth.signInWithPassword({ email: teacherEmail, password: "Incorrecta-A9!" });
  assert.ok(incorrectPasswordError, "An incorrect password unexpectedly authenticated");

  const authenticatedRpc = createClient(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${teacherLogin.session.access_token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: recordedAt, error: recordError } = await authenticatedRpc.rpc("record_portal_password_login_v2");
  assert.ifError(recordError);
  assert.ok(recordedAt);

  const activationClient = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { error: activationOtpError } = await activationClient.auth.verifyOtp({
    token_hash: invited.properties.hashed_token,
    type: "invite",
  });
  assert.ifError(activationOtpError);
  const { error: activationPasswordError } = await activationClient.auth.updateUser({ password });
  assert.ifError(activationPasswordError);
  await activationClient.auth.signOut();

  const recoveryRequestClient = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { error: recoveryRequestError } = await recoveryRequestClient.auth.resetPasswordForEmail(activationEmail, {
    redirectTo: "http://127.0.0.1:3000/?set-password=1",
  });
  assert.ifError(recoveryRequestError);
  if (mailpitUrl) {
    const mailResponse = await fetch(`${mailpitUrl}/api/v1/messages`);
    assert.equal(mailResponse.ok, true, "Mailpit did not expose the recovery message list");
    const mailbox = await mailResponse.json();
    assert.ok(
      mailbox.messages?.some((message) => message.To?.some((recipient) => recipient.Address === activationEmail)),
      "The recovery email was not delivered to the local mailbox",
    );
  }
  const { data: activatedLogin, error: activatedLoginError } = await activationClient.auth.signInWithPassword({ email: activationEmail, password });
  assert.ifError(activatedLoginError);
  assert.equal(activatedLogin.user?.id, invited.user.id);
  const activatedRpc = createClient(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${activatedLogin.session.access_token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error: activatedRecordError } = await activatedRpc.rpc("record_portal_password_login_v2");
  assert.ifError(activatedRecordError);
  await activationClient.auth.signOut();

  const { data: recovery, error: recoveryLinkError } = await admin.auth.admin.generateLink({
    type: "recovery",
    email: activationEmail,
    options: { redirectTo: "http://127.0.0.1:3000/?set-password=1" },
  });
  assert.ifError(recoveryLinkError);
  const recoveryClient = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { error: recoveryOtpError } = await recoveryClient.auth.verifyOtp({
    token_hash: recovery.properties.hashed_token,
    type: "recovery",
  });
  assert.ifError(recoveryOtpError);
  const { error: replacementError } = await recoveryClient.auth.updateUser({ password: replacementPassword });
  assert.ifError(replacementError);
  await recoveryClient.auth.signOut();
  const { error: oldPasswordError } = await recoveryClient.auth.signInWithPassword({ email: activationEmail, password });
  assert.ok(oldPasswordError, "The previous password remained valid after recovery");
  const { data: recoveredLogin, error: recoveredLoginError } = await recoveryClient.auth.signInWithPassword({ email: activationEmail, password: replacementPassword });
  assert.ifError(recoveredLoginError);
  assert.equal(recoveredLogin.user?.id, invited.user.id);

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
  const recovered = statuses.find((row) => row.institutional_email === activationEmail);
  assert.equal(activated?.activated, true);
  assert.ok(activated?.last_sign_in_at);
  assert.equal(pending?.activated, false);
  assert.equal(pending?.last_sign_in_at, null);
  assert.equal(recovered?.activated, true);
  assert.ok(recovered?.last_sign_in_at);

  console.log(JSON.stringify({ passwordLogin: "ok", incorrectPassword: "ok", activation: "ok", recoveryRequest: "ok", recovery: "ok", accessRecorded: "ok", coordinationRead: "ok", teacherIsolation: "ok", pendingPreserved: "ok" }));
} finally {
  if (createdUserIds.length) {
    const { error: teacherCleanupError } = await admin.from("teachers").delete().in("profile_id", createdUserIds);
    if (teacherCleanupError) console.error(`Teacher cleanup failed: ${teacherCleanupError.message}`);
    const { error: profileCleanupError } = await admin.from("profiles").delete().in("id", createdUserIds);
    if (profileCleanupError) console.error(`Profile cleanup failed: ${profileCleanupError.message}`);
  }
  for (const userId of createdUserIds.reverse()) await admin.auth.admin.deleteUser(userId);
}
