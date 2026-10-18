import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createFictionalHandoffRegistry } from '../src/lib/eduverse/handoff-core.mjs';
import { createFictionalJsonFileStore } from '../src/lib/eduverse/handoff-json-file-store.mjs';

const clock = () => '2026-10-18T12:00:00.000Z';
const create = (options = {}) => createFictionalHandoffRegistry({ clock, ...options });
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

function withStore(run) {
  const directory = mkdtempSync(join(tmpdir(), 'vbhc-handoff-'));
  const filePath = join(directory, 'fictional-store.json');
  try {
    return run({ filePath, store: createFictionalJsonFileStore({ filePath }) });
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
  assert.equal(end.events.at(-1).evidence.dispatchId, 'dispatch-1');
  assert.match(end.events.at(-1).evidence.limitation, /Not a verified external receipt/);
});

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

  const secondStore = createFictionalJsonFileStore({ filePath });
  const restarted = create({ store: secondStore });
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
    correlationId: 'restart-dedupe-1',
    source: 'EDUVERSE_TELEHEALTH',
    target: 'VBHC',
    fictional: true,
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
