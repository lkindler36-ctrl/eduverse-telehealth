/**
 * Fictional contract for VBHC / EDuVerse administrative handoffs.
 * NO transmission, credential checks, clinical decisions, PHI, or real receipts.
 * Optional persistence and receipt-reader adapters are development evidence only.
 */
const ORGS = new Set(['VBHC', 'EDUVERSE_TELEHEALTH']);
const ID_RE = /^[A-Za-z0-9._:-]{1,80}$/;
const TIMEZONE_RE = /(?:Z|[+-]\d{2}:\d{2})$/;

function field(value, label) {
  if (typeof value !== 'string' || !ID_RE.test(value)) {
    throw new Error(label + ' must be a nonempty, safe identifier (max 80 chars).');
  }
  return value;
}

function timestamp(value, label) {
  if (
    typeof value !== 'string' ||
    !TIMEZONE_RE.test(value) ||
    !Number.isFinite(Date.parse(value))
  ) {
    throw new Error(label + ' must be a valid timezone-aware timestamp.');
  }
  return value;
}

function snapshot(record) {
  return structuredClone(record);
}

function exactlyMatches(left, right) {
  if (Object.is(left, right)) return true;
  if (!left || !right || typeof left !== 'object' || typeof right !== 'object') {
    return false;
  }
  if (Array.isArray(left) !== Array.isArray(right)) return false;
  if (Array.isArray(left)) {
    return left.length === right.length &&
      left.every((value, index) => exactlyMatches(value, right[index]));
  }
  const leftKeys = Object.keys(left).sort();
  const rightKeys = Object.keys(right).sort();
  return leftKeys.length === rightKeys.length &&
    leftKeys.every((key, index) =>
      key === rightKeys[index] && exactlyMatches(left[key], right[key]));
}

function validateStore(store) {
  if (store === null) return;
  for (const method of ['allocateSequence', 'save', 'read', 'findByCorrelation']) {
    if (typeof store?.[method] !== 'function') {
      throw new Error('store.' + method + ' must be a function.');
    }
  }
}

function validateReceiptReader(receiptReader) {
  if (typeof receiptReader?.retrieve !== 'function') {
    throw new Error('receiptReader.retrieve must be a function.');
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
    if (store) {
      const stored = store.read(taskId);
      return stored ? remember(stored) : null;
    }
    const memory = byTask.get(taskId);
    return memory ? snapshot(memory) : null;
  }

  function persist(record, expectedVersion = 0) {
    if (!store) {
      const next = snapshot(record);
      next.version = expectedVersion + 1;
      return remember(next);
    }
    let readback;
    try {
      readback = store.save(snapshot(record), { expectedVersion });
    } catch (error) {
      if (error?.code === 'HANDOFF_STORE_CONFLICT') {
        byTask.delete(record.taskId);
      }
      throw error;
    }
    const expectedReadback = snapshot(record);
    expectedReadback.version = expectedVersion + 1;
    if (!exactlyMatches(readback, expectedReadback)) {
      throw new Error('Durable store readback did not exactly match the written record.');
    }
    return remember(readback);
  }

  function update(taskId, expected, state, actor, evidence = {}, eventAt = null) {
    taskId = field(taskId, 'taskId');
    const current = durableRead(taskId);
    if (!current) throw new Error('Unknown task.');
    if (current.state !== expected) {
      throw new Error('Invalid transition from ' + current.state + '; expected ' + expected + '.');
    }
    const at = timestamp(eventAt ?? clock(), 'event timestamp');
    const latestEventAt = timestamp(current.events.at(-1).at, 'latest event timestamp');
    if (Date.parse(at) < Date.parse(latestEventAt)) {
      throw new Error('Event timestamp cannot be earlier than the latest recorded event timestamp.');
    }
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
    return snapshot(persist(next, current.version));
  }

  function recordedDispatch(taskId) {
    const record = durableRead(field(taskId, 'taskId'));
    if (
      !record ||
      !['DISPATCH_ATTEMPTED', 'RECEIPT_EVIDENCE_UNVERIFIED'].includes(record.state)
    ) {
      throw new Error('Receipt evidence requires a recorded dispatch attempt.');
    }
    const dispatch = record.events.findLast((event) => event.state === 'DISPATCH_ATTEMPTED');
    if (!dispatch) {
      throw new Error('Receipt evidence requires a recorded dispatch attempt.');
    }
    return { record, dispatch };
  }

  return {
    receive({ correlationId, source, target, fictional }) {
      if (fictional !== true) throw new Error('This component accepts fictional staging records ONLY.');
      correlationId = field(correlationId, 'correlationId');
      if (!ORGS.has(source) || !ORGS.has(target)) throw new Error('Unknown organization.');
      if (source === target) throw new Error('Source and target organizations must be distinct.');
      const memoryId = byCorrelation.get(correlationId);
      const prior = store
        ? store.findByCorrelation(correlationId)
        : memoryId ? durableRead(memoryId) : null;
      if (prior) {
        remember(prior);
        if (prior.source !== source || prior.target !== target) {
          throw new Error('Correlation ID conflict across organizations.');
        }
        return snapshot(prior);
      }
      const at = timestamp(clock(), 'event timestamp');
      const rawSequence = store ? store.allocateSequence() : ++serial;
      if (!Number.isSafeInteger(rawSequence) || rawSequence < 1) {
        throw new Error('Invalid task sequence.');
      }
      const sequence = String(rawSequence).padStart(4, '0');
      const taskId = 'demo-task-' + sequence;
      const eventId = 'demo-event-' + sequence;
      const record = {
        eventId, taskId, correlationId, source, target, fictional: true, version: 0, state: 'RECEIVED',
        events: [{ eventId, taskId, correlationId, state: 'RECEIVED', actor: 'staging-fixture', at, evidence: {} }],
      };
      return snapshot(persist(record, 0));
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
      const { dispatch } = recordedDispatch(taskId);
      if (dispatch.actor !== field(dispatchActor, 'dispatchActor')) {
        throw new Error('Dispatch actor mismatch.');
      }
      if (field(verifiedBy, 'verifiedBy') === dispatch.actor) {
        throw new Error('Receipt must be reviewed by an actor other than the dispatcher.');
      }
      dispatchId = field(dispatchId, 'dispatchId');
      if (dispatch.evidence.dispatchId !== dispatchId) {
        throw new Error('Receipt dispatch ID does not match the recorded dispatch attempt.');
      }
      return update(taskId, 'DISPATCH_ATTEMPTED', 'RECEIPT_EVIDENCE_UNVERIFIED', verifiedBy, {
        receiptId: field(receiptId, 'receiptId'),
        dispatchId,
        evidenceOrigin: 'CALLER_SUPPLIED_UNVERIFIED',
        limitation: 'Not a verified external receipt; requires authenticated recipient readback',
      });
    },
    async retrieveAndAttachReceiptEvidence(taskId, { receiptReader, requestedBy }) {
      validateReceiptReader(receiptReader);
      requestedBy = field(requestedBy, 'requestedBy');
      const { record, dispatch } = recordedDispatch(taskId);
      if (requestedBy === dispatch.actor) {
        throw new Error('Receipt retrieval actor must differ from the dispatcher.');
      }
      const receipt = await receiptReader.retrieve({
        taskId: record.taskId,
        eventId: record.eventId,
        correlationId: record.correlationId,
        dispatchId: dispatch.evidence.dispatchId,
        requestedBy,
      });
      if (!receipt) throw new Error('Authenticated receipt was not found.');
      if (receipt.fictional !== true) {
        throw new Error('Receipt reader must return a fictional staging receipt.');
      }
      if (receipt.authenticated !== true) {
        throw new Error('Receipt reader did not provide authenticated evidence.');
      }
      const dispatchId = field(receipt.dispatchId, 'receipt.dispatchId');
      if (dispatchId !== dispatch.evidence.dispatchId) {
        throw new Error('Retrieved receipt does not match the recorded dispatch attempt.');
      }
      const retrievedBy = field(receipt.retrievedBy, 'receipt.retrievedBy');
      if (retrievedBy !== requestedBy) {
        throw new Error('Receipt retrieval actor does not match the requesting actor.');
      }
      if (retrievedBy === dispatch.actor) {
        throw new Error('Receipt retrieval actor must differ from the dispatcher.');
      }
      const recipientActor = field(receipt.recipientActor, 'receipt.recipientActor');
      if (recipientActor === dispatch.actor) {
        throw new Error('Receipt recipient actor must differ from the dispatcher.');
      }
      const receivedAt = timestamp(receipt.receivedAt, 'receipt.receivedAt');
      const dispatchedAt = timestamp(dispatch.at, 'dispatch.at');
      if (Date.parse(receivedAt) <= Date.parse(dispatchedAt)) {
        throw new Error('receipt.receivedAt must be later than the recorded dispatch timestamp.');
      }
      const latestEventAt = timestamp(record.events.at(-1).at, 'latest event timestamp');
      if (Date.parse(receivedAt) <= Date.parse(latestEventAt)) {
        throw new Error('receipt.receivedAt must be later than the latest recorded event timestamp.');
      }
      return update(taskId, record.state, 'RECEIPT_EVIDENCE_ATTACHED', retrievedBy, {
        receiptId: field(receipt.receiptId, 'receipt.receiptId'),
        dispatchId,
        retrievalId: field(receipt.retrievalId, 'receipt.retrievalId'),
        recipientActor,
        receivedAt,
        evidenceOrigin: 'AUTHENTICATED_READER_FIXTURE',
        limitation: 'Fictional authenticated-reader contract only; no external system or real recipient verified',
      }, receivedAt);
    },
    get(taskId) {
      const record = durableRead(field(taskId, 'taskId'));
      return record ? snapshot(record) : null;
    },
  };
}

