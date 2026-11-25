// End-to-end smoke tests against the running docker-compose stack (NFR-13).
//
//   docker compose up -d --build
//   node tests/smoke.mjs                       # defaults to http://localhost:4200 (nginx -> server)
//   BASE_URL=http://localhost:8080 node tests/smoke.mjs   # straight at the API
//
// Flow A: claimant submits -> manager assigns -> staff starts, asks for info -> claimant replies ->
// staff assesses and settles -> claimant sees the decision.
// Flow B: a second claim goes SUBMITTED -> ASSIGNED -> IN_PROGRESS -> REJECTED, so every status is reached.
// The manager dashboard must reflect both.
// Plus the negative paths that matter: 401 without a token, 403 wrong role, 409 bad transition,
// 400 settle above assessed amount, 400 validation. Every response is checked for the ApiResponse envelope.
// Needs Node 18+ (built-in fetch). Exits 1 on the first failed check.

const BASE = process.env.BASE_URL ?? `http://localhost:${process.env.CLIENT_PORT ?? 4200}`;
const PASSWORD = process.env.DEMO_PASSWORD ?? 'Password123!';
const RUN_ID = `e2e-${Date.now()}`;

let passed = 0;

function check(cond, label, extra) {
  if (!cond) {
    console.error(`FAIL  ${label}`);
    if (extra !== undefined) console.error(JSON.stringify(extra, null, 2));
    process.exit(1);
  }
  passed++;
  console.log(`ok    ${label}`);
}

async function call(method, path, { token, body } = {}) {
  const headers = { 'Content-Type': 'application/json', 'X-Correlation-Id': `${RUN_ID}-${passed}` };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(BASE + path, { method, headers, body: body ? JSON.stringify(body) : undefined });
  const json = await res.json().catch(() => null);
  const envelopeOk = json && typeof json.success === 'boolean' && 'data' in json && 'error' in json && 'timestamp' in json;
  if (!envelopeOk) {
    console.error(`FAIL  ${method} ${path} did not return the ApiResponse envelope (HTTP ${res.status})`);
    process.exit(1);
  }
  return { status: res.status, body: json, correlationId: res.headers.get('x-correlation-id') };
}

async function login(username) {
  const r = await call('POST', '/api/auth/login', { body: { username, password: PASSWORD } });
  check(r.status === 200 && r.body.data?.token, `login ${username}`, r.body);
  return r.body.data.token;
}

const expectError = (r, status, code, label) =>
  check(r.status === status && r.body.success === false && r.body.error?.code === code,
    `${label} -> ${status} ${code}`, r.body);

console.log(`E2E full flow against ${BASE} (run ${RUN_ID})\n`);

// ---- Client app and routing through nginx ----
if (!process.env.BASE_URL) {
  const index = await fetch(`${BASE}/`);
  check(index.status === 200 && (await index.text()).includes('<app-root'), 'nginx serves the Angular app');
  const deep = await fetch(`${BASE}/staff/claims/1`);
  check(deep.status === 200 && (await deep.text()).includes('<app-root'), 'nginx SPA fallback for deep links');
}

// ---- Auth ----
expectError(await call('POST', '/api/auth/login', { body: { username: 'claimant1', password: 'wrong' } }),
  401, 'INVALID_CREDENTIALS', 'bad password');
expectError(await call('GET', '/api/claims'), 401, 'UNAUTHORIZED', 'no token');

const claimant = await login('claimant1');
const manager = await login('manager1');
const staff = await login('staff1');
const otherStaff = await login('staff2');

const me = await call('GET', '/api/auth/me', { token: claimant });
check(me.status === 200 && me.body.data.role === 'CLAIMANT', '/api/auth/me returns the claimant', me.body);

// ---- Dashboard baseline ----
const before = (await call('GET', '/api/dashboard?period=ALL', { token: manager })).body.data;
check(before && typeof before.unassignedCount === 'number', 'dashboard baseline read');

// ---- 1. Claimant submits ----
const incidentDate = new Date(Date.now() - 2 * 86400000).toISOString().slice(0, 10);
expectError(await call('POST', '/api/claims', { token: claimant, body: { type: 'MOTOR' } }),
  400, 'VALIDATION_FAILED', 'submit with missing fields');

const created = await call('POST', '/api/claims', {
  token: claimant,
  body: {
    type: 'MOTOR', market: 'SG', policyNumber: 'POL-E2E-001', incidentDate,
    location: 'Orchard Road, Singapore', description: `Rear-end collision at a junction (${RUN_ID})`,
    estimatedAmount: 4200.0,
  },
});
check(created.status === 201 && created.body.data.status === 'SUBMITTED', 'claimant submits claim -> 201 SUBMITTED', created.body);
check(created.body.data.currency === 'SGD', 'currency defaults from market (SG -> SGD)', created.body.data);
const id = created.body.data.id;
console.log(`      claim ${created.body.data.claimNumber} (id ${id})`);

expectError(await call('POST', '/api/claims', { token: staff, body: created.body.data }), 403, 'ACCESS_DENIED',
  'staff cannot submit a claim');

// ---- 2. Manager assigns ----
expectError(await call('POST', `/api/claims/${id}/start`, { token: staff }), 403, 'ACCESS_DENIED',
  'staff cannot start an unassigned claim');

const staffList = await call('GET', '/api/users?role=CLAIMS_STAFF', { token: manager });
const staff1 = staffList.body.data.find((u) => u.username === 'staff1');
check(staff1, 'manager lists claims staff', staffList.body);

expectError(await call('PUT', `/api/claims/${id}/assignment`, { token: claimant, body: { staffId: staff1.id } }),
  403, 'ACCESS_DENIED', 'claimant cannot assign');

const assigned = await call('PUT', `/api/claims/${id}/assignment`, { token: manager, body: { staffId: staff1.id } });
check(assigned.status === 200 && assigned.body.data.status === 'ASSIGNED', 'manager assigns to staff1 -> ASSIGNED', assigned.body);

// ---- 3. Staff starts and asks for info ----
const otherView = await call('GET', `/api/claims/${id}`, { token: otherStaff });
check(otherView.status === 403 || otherView.status === 404, `staff2 cannot see staff1's claim (${otherView.status})`, otherView.body);

expectError(await call('POST', `/api/claims/${id}/settle`, { token: staff, body: { settledAmount: 1, decisionNote: 'x' } }),
  409, 'INVALID_STATUS_TRANSITION', 'settle before start');

const started = await call('POST', `/api/claims/${id}/start`, { token: staff });
check(started.status === 200 && started.body.data.status === 'IN_PROGRESS', 'staff starts -> IN_PROGRESS', started.body);

const ask = await call('POST', `/api/claims/${id}/messages`, { token: staff, body: { body: 'Please send the repair quote reference.' } });
check(ask.status === 201, 'staff asks the claimant for more info', ask.body);

const reply = await call('POST', `/api/claims/${id}/messages`, { token: claimant, body: { body: 'The quote reference is WS-88412.' } });
check(reply.status === 201, 'claimant replies with the info', reply.body);

const thread = await call('GET', `/api/claims/${id}/messages`, { token: staff });
const msgs = Array.isArray(thread.body.data) ? thread.body.data : thread.body.data?.content ?? [];
check(msgs.length >= 2, `staff sees the message thread (${msgs.length} messages)`, thread.body);

// ---- 4. Staff assesses and settles ----
const assessed = await call('PATCH', `/api/claims/${id}/assessment`, { token: staff, body: { assessedAmount: 3800.0 } });
check(assessed.status === 200 && Number(assessed.body.data.assessedAmount) === 3800, 'staff assesses at 3800.00', assessed.body);

const over = await call('POST', `/api/claims/${id}/settle`, { token: staff, body: { settledAmount: 5000, decisionNote: 'too much' } });
check(over.status === 400 && over.body.error?.code === 'VALIDATION_FAILED', 'settle above assessed amount -> 400', over.body);

const settled = await call('POST', `/api/claims/${id}/settle`, {
  token: staff, body: { settledAmount: 3800.0, decisionNote: 'Covered under comprehensive policy, less excess.' },
});
check(settled.status === 200 && settled.body.data.status === 'SETTLED', 'staff settles -> SETTLED', settled.body);

expectError(await call('POST', `/api/claims/${id}/reject`, { token: staff, body: { decisionNote: 'late' } }),
  409, 'INVALID_STATUS_TRANSITION', 'reject a settled claim');

// ---- 5. Claimant sees the decision ----
const mine = await call('GET', `/api/claims/${id}`, { token: claimant });
check(mine.status === 200 && mine.body.data.status === 'SETTLED', 'claimant sees SETTLED', mine.body);
check(mine.body.data.decisionNote?.startsWith('Covered'), 'claimant sees the decision note', mine.body.data);

const history = await call('GET', `/api/claims/${id}/history`, { token: claimant });
const statuses = history.body.data.map((h) => h.toStatus ?? h.status);
check(['SUBMITTED', 'ASSIGNED', 'IN_PROGRESS', 'SETTLED'].every((s) => statuses.includes(s)),
  `history has the full lifecycle (${statuses.join(' -> ')})`, history.body);

const otherClaimant = await login('claimant2');
const peek = await call('GET', `/api/claims/${id}`, { token: otherClaimant });
check(peek.status === 403 || peek.status === 404, `claimant2 cannot see claimant1's claim (${peek.status})`, peek.body);

// ---- 6. Second claim: rejection path (every status reached) ----
const created2 = await call('POST', '/api/claims', {
  token: claimant,
  body: {
    type: 'PROPERTY', market: 'HK', policyNumber: 'POL-E2E-002', incidentDate,
    location: 'Mong Kok, Hong Kong', description: `Water damage from upstairs flat (${RUN_ID})`,
    estimatedAmount: 20000.0,
  },
});
check(created2.status === 201 && created2.body.data.currency === 'HKD', 'claimant submits second claim (HK -> HKD)', created2.body);
const id2 = created2.body.data.id;
const staff2 = staffList.body.data.find((u) => u.username === 'staff2');
check((await call('PUT', `/api/claims/${id2}/assignment`, { token: manager, body: { staffId: staff2.id } })).body.data?.status === 'ASSIGNED',
  'manager assigns second claim to staff2 -> ASSIGNED');
expectError(await call('POST', `/api/claims/${id2}/start`, { token: staff }), 403, 'ACCESS_DENIED',
  'staff1 cannot start a claim assigned to staff2');
check((await call('POST', `/api/claims/${id2}/start`, { token: otherStaff })).body.data?.status === 'IN_PROGRESS',
  'staff2 starts -> IN_PROGRESS');
expectError(await call('POST', `/api/claims/${id2}/reject`, { token: otherStaff, body: { decisionNote: '' } }),
  400, 'VALIDATION_FAILED', 'reject without a note');
const rejected = await call('POST', `/api/claims/${id2}/reject`, {
  token: otherStaff, body: { decisionNote: 'Gradual leak is excluded under the policy wording.' },
});
check(rejected.status === 200 && rejected.body.data.status === 'REJECTED', 'staff2 rejects with a note -> REJECTED', rejected.body);
const mine2 = await call('GET', `/api/claims/${id2}`, { token: claimant });
check(mine2.body.data.status === 'REJECTED' && mine2.body.data.decisionNote?.startsWith('Gradual'),
  'claimant sees REJECTED and the note', mine2.body);
expectError(await call('POST', `/api/claims/${id2}/messages`, { token: claimant, body: { body: 'Why?' } }),
  409, 'MESSAGING_NOT_ALLOWED', 'no messages on a closed claim');

// ---- 7. Dashboard updates ----
expectError(await call('GET', '/api/dashboard', { token: staff }), 403, 'ACCESS_DENIED', 'staff cannot read dashboard');
const after = (await call('GET', '/api/dashboard?period=ALL', { token: manager })).body.data;
check(after.submittedCount === before.submittedCount + 2, `dashboard submittedCount ${before.submittedCount} -> ${after.submittedCount}`);
check(after.closedCounts.settled === before.closedCounts.settled + 1,
  `dashboard settled count ${before.closedCounts.settled} -> ${after.closedCounts.settled}`);
check(after.closedCounts.rejected === before.closedCounts.rejected + 1,
  `dashboard rejected count ${before.closedCounts.rejected} -> ${after.closedCounts.rejected}`);
const sgd = (d) => Number(d.settledTotals.find((t) => t.currency === 'SGD')?.amount ?? 0);
check(Math.abs(sgd(after) - sgd(before) - 3800) < 0.001, `dashboard SGD settled total +3800 (${sgd(before)} -> ${sgd(after)})`);

console.log(`\nAll ${passed} checks passed (claim ${id} settled, claim ${id2} rejected).`);
