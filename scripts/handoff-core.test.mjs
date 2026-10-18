import test from 'node:test';
import assert from 'node:assert/strict';
import { createFictionalHandoffRegistry } from '../src/lib/eduverse/handoff-core.mjs';

const create = () => createFictionalHandoffRegistry({ clock: () => '2026-10-18T12:00:00.000Z' });
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
