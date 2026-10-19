import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createFictionalHandoffRegistry } from '../src/lib/eduverse/handoff-core.mjs';
import { createFictionalJsonFileStore } from '../src/lib/eduverse/handoff-json-file-store.mjs';

function createClock(start = '2026-10-18T12:00:00.000Z') {
  let tick = Date.parse(start);
  return () => new Date(tick++).toISOString();
}

const create = ({ clock = createClock(), ...options } = {}) =>
  createFictionalHandoffRegistry({ clock, ...options });
const start = (r, correlationId = 'test-1') => r.receive({
  correlationId, source: 'VBHC', target: 'EDUVERSE_TELEHEALTH', fictional: true,
});

function advanceToDispatch(r, taskId, dispatchId = 'dispatch-1') {
  r.validate(taskId, 'reviewer');
  r.attachPersistenceEvidence(taskId, { storageRecordId: 'staging-row-1', retrievedBy: 'independent-reader' });
  r.requestAssignment(taskId, 'coordinator');
  r.acknowledgeAssignment(taskId, { assigneeId: 'fictional-staff-1', acknowledgementId: 'ack-1' });
  r.recordDispatchAttempt(taskId, { dispatchId, sentBy: 'dispatcher' });
}

function fictionalReceipt(overrides = {}) {
  return {
    fictional: true,
    authenticated: true,
    receiptId: 'receipt-1',
    dispatchId: 'dispatch-1',
    retrievalId: 'retrieval-1',
    retrievedBy: 'recipient-reader',
    recipientActor: 'fictional-recipient',
    receivedAt: '2026-10-18T12:01:00.000Z',
    ...overrides,
  };
}

function withStore(run) {
  const directory = mkdtempSync(join(tmpdir(), 'vbhc-handoff-'));
  const filePath = join(directory, 'fictional-store.json');
  try {
    return run({ filePath, store: createFictionalJsonFileStore({ filePath }) });
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

async function withStoreAsync(run) {
  const directory = mkdtempSync(join(tmpdir(), 'vbhc-handoff-'));
  const filePath = join(directory, 'fictional-store.json');
  try {
    return await run({ filePath, store: createFictionalJsonFileStore({ filePath }) });
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

test('fictional administrative handoff records an ordered, linked evidence chain', () => {
  const r = create();
  const { taskId } = start(r);
  advanceToDispatch(r, taskId);
  const end = r.attachReceiptEvidence(taskId, {
    receiptId: 'receipt-1', dispatchId: 'dispatch-1', verifiedBy: 'recipient-reader', dispatchActor: 'dispatcher',
  });
  assert.equal(end.state, 'RECEIPT_EVIDENCE_ATTACHED');
  assert.equal(end.events.length, 7);
  const eventTimes = end.events.map((event) => Date.parse(event.at));
  assert.equal(
    eventTimes.every((value, index) => index === 0 || value > eventTimes[index - 1]),
    true,
  );
  assert.equal(end.events.at(-1).evidence.dispatchId, 'dispatch-1');
  assert.equal(end.events.at(-1).evidence.evidenceOrigin, 'CALLER_SUPPLIED_UNVERIFIED');
});

test('static or backward clocks preserve strict ordering across restart', () => withStore(({ filePath, store }) => {
  const staticClock = () => '2026-10-18T12:00:00.000Z';
  const first = create({ clock: staticClock, store });
  const started = start(first, 'clock-regression-1');
  first.validate(started.taskId, 'reviewer');

  const backwardClock = () => '2026-10-18T11:59:59.000Z';
  const restarted = create({
    clock: backwardClock,
    store: createFictionalJsonFileStore({ filePath }),
  });
  const end = restarted.attachPersistenceEvidence(started.taskId, {
    storageRecordId: 'clock-row-1',
    retrievedBy: 'independent-reader',
  });
  assert.deepEqual(
    end.events.map((event) => event.at),
    [
      '2026-10-18T12:00:00.000Z',
      '2026-10-18T12:00:00.001Z',
      '2026-10-18T12:00:00.002Z',
    ],
  );
}));

test('every transition preserves event, task and correlation linkage', () => {
  const r = create();
  const startState = start(r, 'linkage-1');
  advanceToDispatch(r, startState.taskId);
  const end = r.attachReceiptEvidence(startState.taskId, {
    receiptId: 'receipt-1', dispatchId: 'dispatch-1', verifiedBy: 'recipient-reader', dispatchActor: 'dispatcher',
  });
  for (const event of end.events) {
    assert.equal(event.eventId, startState.eventId);
    assert.equal(event.taskId, startState.taskId);
    assert.equal(event.correlationId, 'linkage-1');
  }
});

test('receipt must reference the exact recorded dispatch ID', () => {
  const r = create();
  const { taskId } = start(r);
  advanceToDispatch(r, taskId, 'dispatch-recorded');
  assert.throws(() => r.attachReceiptEvidence(taskId, {
    receiptId: 'receipt-1', dispatchId: 'dispatch-other', verifiedBy: 'recipient-reader', dispatchActor: 'dispatcher',
  }), /does not match/);
  assert.equal(r.get(taskId).state, 'DISPATCH_ATTEMPTED');
});

test('cannot silently use the component for real data', () => {
  const r = create();
  assert.throws(() => r.receive({ correlationId: 'real-1', source: 'VBHC', target: 'EDUVERSE_TELEHEALTH', fictional: false }), /fictional staging/);
});

test('duplicate correlation ID is idempotent with same organization routing', () => {
  const r = create();
  const a = start(r);
  const b = start(r);
  assert.equal(a.taskId, b.taskId);
  assert.equal(a.eventId, b.eventId);
  assert.throws(() => r.receive({correlationId: 'test-1', source: 'EDUVERSE_TELEHEALTH', target: 'VBHC', fictional: true}), /conflict/);
});

test('receipt cannot be attached before dispatch', () => {
  const r = create();
  const { taskId } = start(r);
  assert.throws(() => r.attachReceiptEvidence(taskId, {receiptId: 'r1', dispatchId: 'd1', verifiedBy: 'r2', dispatchActor: 'd1'}), /requires a recorded dispatch/);
});

test('receipt actor must differ from dispatch actor', () => {
  const r = create();
  const { taskId } = start(r);
  advanceToDispatch(r, taskId);
  assert.throws(() => r.attachReceiptEvidence(taskId, {
    receiptId: 'r1', dispatchId: 'dispatch-1', verifiedBy: 'dispatcher', dispatchActor: 'dispatcher',
  }), /other than/);
});

test('missing evidence and skipped stages are rejected', () => {
  const r = create();
  const { taskId } = start(r);
  assert.throws(() => r.requestAssignment(taskId, 'coordinator'), /Invalid transition/);
  r.validate(taskId, 'reviewer');
  assert.throws(() => r.attachPersistenceEvidence(taskId, {storageRecordId: '', retrievedBy: 'reader'}), /storageRecordId/);
});

test('returned snapshots do not permit mutation of the internal registry', () => {
  const r = create();
  const s = start(r);
  s.events.push({state:'FAKE'});
  assert.equal(r.get(s.taskId).events.length, 1);
});

test('fictional task and transition history survive a registry restart', () => withStore(({ filePath, store }) => {
  const first = create({ store });
  const started = start(first, 'restart-1');
  first.validate(started.taskId, 'reviewer');
  const restarted = create({ store: createFictionalJsonFileStore({ filePath }) });
  const recovered = restarted.get(started.taskId);
  assert.equal(recovered.state, 'VALIDATED');
  assert.equal(recovered.events.length, 2);
  const advanced = restarted.attachPersistenceEvidence(started.taskId, {
    storageRecordId: 'row-restart-1', retrievedBy: 'reader-2',
  });
  assert.equal(advanced.state, 'PERSISTENCE_EVIDENCE_ATTACHED');
  assert.match(advanced.events.at(-1).evidence.limitation, /post-write readback verified/);
  assert.equal(JSON.parse(readFileSync(filePath, 'utf8')).records[started.taskId].events.length, 3);
}));

test('duplicate correlation remains idempotent after registry restart', () => withStore(({ filePath, store }) => {
  const first = create({ store });
  const started = start(first, 'restart-dedupe-1');
  const restarted = create({ store: createFictionalJsonFileStore({ filePath }) });
  const duplicate = start(restarted, 'restart-dedupe-1');
  assert.equal(duplicate.taskId, started.taskId);
  assert.equal(duplicate.eventId, started.eventId);
  assert.throws(() => restarted.receive({
    correlationId: 'restart-dedupe-1', source: 'EDUVERSE_TELEHEALTH', target: 'VBHC', fictional: true,
  }), /conflict/);
}));

test('durable sequence prevents task ID reuse after restart', () => withStore(({ filePath, store }) => {
  const first = create({ store });
  const a = start(first, 'sequence-a');
  const restarted = create({ store: createFictionalJsonFileStore({ filePath }) });
  const b = start(restarted, 'sequence-b');
  assert.equal(a.taskId, 'demo-task-0001');
  assert.equal(b.taskId, 'demo-task-0002');
}));

test('corrupt durable state fails closed without overwriting evidence', () => withStore(({ filePath, store }) => {
  const r = create({ store });
  start(r, 'corrupt-1');
  writeFileSync(filePath, '{"format":"wrong"}\n', 'utf8');
  const corruptedBytes = readFileSync(filePath, 'utf8');
  assert.throws(() => create({
    store: createFictionalJsonFileStore({ filePath }),
  }).get('demo-task-0001'), /invalid schema/);
  assert.equal(readFileSync(filePath, 'utf8'), corruptedBytes);
}));

test('stale registry cannot overwrite a newer durable transition', () => withStore(({ filePath, store }) => {
  const seed = create({ store });
  const started = start(seed, 'concurrent-write-1');
  assert.equal(started.version, 1);

  const first = create({ store: createFictionalJsonFileStore({ filePath }) });
  const stale = create({ store: createFictionalJsonFileStore({ filePath }) });
  assert.equal(first.get(started.taskId).version, 1);
  assert.equal(stale.get(started.taskId).version, 1);

  const advanced = first.validate(started.taskId, 'reviewer-1');
  assert.equal(advanced.version, 2);
  assert.throws(
    () => stale.validate(started.taskId, 'reviewer-2'),
    (error) => error?.code === 'HANDOFF_STORE_CONFLICT' && /Stale write rejected/.test(error.message),
  );

  const durable = create({ store: createFictionalJsonFileStore({ filePath }) }).get(started.taskId);
  assert.equal(durable.state, 'VALIDATED');
  assert.equal(durable.version, 2);
  assert.equal(durable.events.length, 2);
  assert.equal(durable.events.at(-1).actor, 'reviewer-1');
  assert.equal(stale.get(started.taskId).version, 2);
}));

test('authenticated reader fixture links receipt to the exact dispatch', async () => withStoreAsync(async ({ filePath, store }) => {
  const first = create({ store });
  const started = start(first, 'reader-success');
  advanceToDispatch(first, started.taskId);
  const restarted = create({ store: createFictionalJsonFileStore({ filePath }) });
  const end = await restarted.retrieveAndAttachReceiptEvidence(started.taskId, {
    requestedBy: 'recipient-reader',
    receiptReader: { retrieve: async () => fictionalReceipt() },
  });
  assert.equal(end.state, 'RECEIPT_EVIDENCE_ATTACHED');
  assert.equal(end.events.at(-1).evidence.evidenceOrigin, 'AUTHENTICATED_READER_FIXTURE');
  assert.equal(end.events.at(-1).evidence.retrievalId, 'retrieval-1');
  assert.equal(create({ store: createFictionalJsonFileStore({ filePath }) }).get(started.taskId).state, 'RECEIPT_EVIDENCE_ATTACHED');
}));

test('reader request carries exact linkage and independent retrieval actor', async () => {
  const r = create();
  const started = start(r, 'reader-linkage');
  advanceToDispatch(r, started.taskId);
  let request;
  await r.retrieveAndAttachReceiptEvidence(started.taskId, {
    requestedBy: 'recipient-reader',
    receiptReader: { retrieve: async (value) => { request = value; return fictionalReceipt(); } },
  });
  assert.deepEqual(request, {
    taskId: started.taskId,
    eventId: started.eventId,
    correlationId: 'reader-linkage',
    dispatchId: 'dispatch-1',
    requestedBy: 'recipient-reader',
  });
});

test('missing or unauthenticated receipt fails closed without advancing state', async () => {
  const r = create();
  const { taskId } = start(r, 'reader-missing');
  advanceToDispatch(r, taskId);
  await assert.rejects(r.retrieveAndAttachReceiptEvidence(taskId, {
    requestedBy: 'recipient-reader', receiptReader: { retrieve: async () => null },
  }), /not found/);
  await assert.rejects(r.retrieveAndAttachReceiptEvidence(taskId, {
    requestedBy: 'recipient-reader', receiptReader: { retrieve: async () => fictionalReceipt({ authenticated: false }) },
  }), /authenticated evidence/);
  assert.equal(r.get(taskId).state, 'DISPATCH_ATTEMPTED');
});

test('mismatched dispatch or non-independent actor fails closed', async () => {
  const r = create();
  const { taskId } = start(r, 'reader-mismatch');
  advanceToDispatch(r, taskId);
  await assert.rejects(r.retrieveAndAttachReceiptEvidence(taskId, {
    requestedBy: 'recipient-reader',
    receiptReader: { retrieve: async () => fictionalReceipt({ dispatchId: 'dispatch-other' }) },
  }), /does not match/);
  await assert.rejects(r.retrieveAndAttachReceiptEvidence(taskId, {
    requestedBy: 'dispatcher',
    receiptReader: { retrieve: async () => fictionalReceipt({ retrievedBy: 'dispatcher' }) },
  }), /must differ/);
  assert.equal(r.get(taskId).state, 'DISPATCH_ATTEMPTED');
});

