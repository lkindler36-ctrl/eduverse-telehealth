/**
 * Fictional contract for VBHC / EDuVerse administrative handoffs.
 * NO transmission, credential checks, clinical decisions, PHI, or real receipts.
 * Optional persistence adapters are development evidence only.
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

function validateStore(store) {
  if (store === null) return;
  for (const method of ['allocateSequence', 'save', 'read', 'findByCorrelation']) {
    if (typeof store?.[method] !== 'function') {
      throw new Error('store.' + method + ' must be a function.');
    }
  }
}

/** Returns an isolated registry suitable ONLY for fictional staging fixtures. */
export function createFictionalHandoffRegistry({
  clock = () => new Date().toISOString(),
  store = null,
} = {}) {
  validateStore(store);
  const byTask = new Map();
  const byCorrelation = new Map();
  let serial = 0;

  function remember(record) {
    const copy = snapshot(record);
    byTask.set(copy.taskId, copy);
    byCorrelation.set(copy.correlationId, copy.taskId);
    return copy;
  }

  function durableRead(taskId) {
    const memory = byTask.get(taskId);
    if (memory) return snapshot(memory);
    const stored = store ? store.read(taskId) : null;
    return stored ? remember(stored) : null;
  }

  function persist(record) {
    if (!store) return remember(record);
    const readback = store.save(snapshot(record));
    if (
      !readback ||
      readback.taskId !== record.taskId ||
      readback.eventId !== record.eventId ||
      readback.correlationId !== record.correlationId ||
      readback.state !== record.state ||
      readback.events.length !== record.events.length
    ) {
      throw new Error('Durable store readback did not match the written record.');
    }
    return remember(readback);
  }

  function update(taskId, expected, state, actor, evidence = {}) {
    taskId = field(taskId, 'taskId');
    const current = durableRead(taskId);
    if (!current) throw new Error('Unknown task.');
    if (current.state !== expected) {
      throw new Error('Invalid transition from ' + current.state + '; expected ' + expected + '.');
    }
    const at = clock();
    if (!Number.isFinite(Date.parse(at))) throw new Error('Invalid event timestamp.');
    const next = snapshot(current);
    next.state = state;
    next.events.push({
      eventId: next.eventId,
      taskId: next.taskId,
      correlationId: next.correlationId,
      state,
      actor: field(actor, 'actor'),
      at,
      evidence: { ...evidence },
    });
    return snapshot(persist(next));
  }

  return {
    receive({ correlationId, source, target, fictional }) {
      if (fictional !== true) throw new Error('This component accepts fictional staging records ONLY.');
      correlationId = field(correlationId, 'correlationId');
      if (!ORGS.has(source) || !ORGS.has(target)) throw new Error('Unknown organization.');
      const memoryId = byCorrelation.get(correlationId);
      const prior = memoryId ? durableRead(memoryId) : store?.findByCorrelation(correlationId);
      if (prior) {
        remember(prior);
        if (prior.source !== source || prior.target !== target) {
          throw new Error('Correlation ID conflict across organizations.');
        }
        return snapshot(prior);
      }
      const at = clock();
      if (!Number.isFinite(Date.parse(at))) throw new Error('Invalid event timestamp.');
      const rawSequence = store ? store.allocateSequence() : ++serial;
      if (!Number.isSafeInteger(rawSequence) || rawSequence < 1) {
        throw new Error('Invalid task sequence.');
      }
      const sequence = String(rawSequence).padStart(4, '0');
      const taskId = 'demo-task-' + sequence;
      const eventId = 'demo-event-' + sequence;
      const record = {
        eventId, taskId, correlationId, source, target, fictional: true, state: 'RECEIVED',
        events: [{ eventId, taskId, correlationId, state: 'RECEIVED', actor: 'staging-fixture', at, evidence: {} }],
      };
      return snapshot(persist(record));
    },
    validate(taskId, validatedBy) {
      return update(taskId, 'RECEIVED', 'VALIDATED', validatedBy);
    },
    attachPersistenceEvidence(taskId, { storageRecordId, retrievedBy }) {
      return update(taskId, 'VALIDATED', 'PERSISTENCE_EVIDENCE_ATTACHED', retrievedBy, {
        storageRecordId: field(storageRecordId, 'storageRecordId'),
        limitation: store
          ? 'Fictional local store post-write readback verified; not an external database or independent receipt'
          : 'Caller-supplied evidence; no database connection or readback verified',
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
      const record = durableRead(field(taskId, 'taskId'));
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
      const record = durableRead(field(taskId, 'taskId'));
      return record ? snapshot(record) : null;
    },
  };
}
