/**
 * Fictional, in-memory contract for VBHC / EDuVerse administrative handoffs.
 * NO persistence, transmission, credential checks, clinical decisions, or PHI.
 * These states are development evidence assertions, NOT real receipts.
 */
const ORGS = new Set(['VBHC', 'EDUVERSE_TELEHEALTH']);
const ID_RE = /^[A-Za-z0-9._:-]{1,80}$/;

function field(value, label) {
  if (typeof value !== 'string' || !ID_RE.test(value)) {
    throw new Error(label + ' must be a nonempty, safe identifier (max 80 chars).');
  }
  return value;
}

function snapshot(record) {
  return structuredClone(record);
}

/** Returns an isolated registry suitable ONLY for fictional staging fixtures. */
export function createFictionalHandoffRegistry({ clock = () => new Date().toISOString() } = {}) {
  const byTask = new Map();
  const byCorrelation = new Map();
  let serial = 0;

  function update(taskId, expected, state, actor, evidence = {}) {
    const record = byTask.get(field(taskId, 'taskId'));
    if (!record) throw new Error('Unknown task.');
    if (record.state !== expected) {
      throw new Error('Invalid transition from ' + record.state + '; expected ' + expected + '.');
    }
    const at = clock();
    if (!Number.isFinite(Date.parse(at))) throw new Error('Invalid event timestamp.');
    record.state = state;
    record.events.push({
      eventId: record.eventId,
      taskId: record.taskId,
      correlationId: record.correlationId,
      state,
      actor: field(actor, 'actor'),
      at,
      evidence: { ...evidence },
    });
    return snapshot(record);
  }

  return {
    receive({ correlationId, source, target, fictional }) {
      if (fictional !== true) throw new Error('This component accepts fictional staging records ONLY.');
      correlationId = field(correlationId, 'correlationId');
      if (!ORGS.has(source) || !ORGS.has(target)) throw new Error('Unknown organization.');
      const priorId = byCorrelation.get(correlationId);
      if (priorId) {
        const prior = byTask.get(priorId);
        if (prior.source !== source || prior.target !== target) {
          throw new Error('Correlation ID conflict across organizations.');
        }
        return snapshot(prior);
      }
      const at = clock();
      if (!Number.isFinite(Date.parse(at))) throw new Error('Invalid event timestamp.');
      const sequence = String(++serial).padStart(4, '0');
      const taskId = 'demo-task-' + sequence;
      const eventId = 'demo-event-' + sequence;
      const record = {
        eventId, taskId, correlationId, source, target, fictional: true, state: 'RECEIVED',
        events: [{ eventId, taskId, correlationId, state: 'RECEIVED', actor: 'staging-fixture', at, evidence: {} }],
      };
      byTask.set(taskId, record);
      byCorrelation.set(correlationId, taskId);
      return snapshot(record);
    },
    validate(taskId, validatedBy) {
      return update(taskId, 'RECEIVED', 'VALIDATED', validatedBy);
    },
    attachPersistenceEvidence(taskId, { storageRecordId, retrievedBy }) {
      // A caller-supplied readback reference is NOT independent readback proof.
      return update(taskId, 'VALIDATED', 'PERSISTENCE_EVIDENCE_ATTACHED', retrievedBy, {
        storageRecordId: field(storageRecordId, 'storageRecordId'),
        limitation: 'Caller-supplied evidence; no database connection or readback verified',
      });
    },
    requestAssignment(taskId, requestedBy) {
      return update(taskId, 'PERSISTENCE_EVIDENCE_ATTACHED', 'ASSIGNMENT_PENDING', requestedBy);
    },
    acknowledgeAssignment(taskId, { assigneeId, acknowledgementId }) {
      return update(taskId, 'ASSIGNMENT_PENDING', 'ASSIGNED_ACKNOWLEDGED', assigneeId, {
        acknowledgementId: field(acknowledgementId, 'acknowledgementId'),
      });
    },
    recordDispatchAttempt(taskId, { dispatchId, sentBy }) {
      return update(taskId, 'ASSIGNED_ACKNOWLEDGED', 'DISPATCH_ATTEMPTED', sentBy, {
        dispatchId: field(dispatchId, 'dispatchId'),
      });
    },
    attachReceiptEvidence(taskId, { receiptId, dispatchId, verifiedBy, dispatchActor }) {
      const record = byTask.get(field(taskId, 'taskId'));
      if (!record || record.state !== 'DISPATCH_ATTEMPTED') {
        throw new Error('Receipt evidence requires a recorded dispatch attempt.');
      }
      const last = record.events.at(-1);
      if (last.actor !== field(dispatchActor, 'dispatchActor')) {
        throw new Error('Dispatch actor mismatch.');
      }
      if (field(verifiedBy, 'verifiedBy') === last.actor) {
        throw new Error('Receipt must be reviewed by an actor other than the dispatcher.');
      }
      dispatchId = field(dispatchId, 'dispatchId');
      if (last.evidence.dispatchId !== dispatchId) {
        throw new Error('Receipt dispatch ID does not match the recorded dispatch attempt.');
      }
      return update(taskId, 'DISPATCH_ATTEMPTED', 'RECEIPT_EVIDENCE_ATTACHED', verifiedBy, {
        receiptId: field(receiptId, 'receiptId'),
        dispatchId,
        limitation: 'Not a verified external receipt; requires authenticated recipient readback',
      });
    },
    get(taskId) {
      const record = byTask.get(field(taskId, 'taskId'));
      return record ? snapshot(record) : null;
    },
  };
}
