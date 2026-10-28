import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { dirname } from 'node:path';
import { isDeepStrictEqual } from 'node:util';

const FORMAT = 'vbhc-fictional-handoff-store-v1';
const ID_RE = /^[A-Za-z0-9._:-]{1,80}$/;
const TIMEZONE_RE = /(?:Z|[+-]\d{2}:\d{2})$/;
const ORGS = new Set(['VBHC', 'EDUVERSE_TELEHEALTH']);
const ALLOWED_NEXT_STATE = new Map([
  ['RECEIVED', new Set(['VALIDATED'])],
  ['VALIDATED', new Set(['PERSISTENCE_EVIDENCE_ATTACHED'])],
  ['PERSISTENCE_EVIDENCE_ATTACHED', new Set(['ASSIGNMENT_PENDING'])],
  ['ASSIGNMENT_PENDING', new Set(['ASSIGNED_ACKNOWLEDGED'])],
  ['ASSIGNED_ACKNOWLEDGED', new Set(['DISPATCH_ATTEMPTED'])],
  ['DISPATCH_ATTEMPTED', new Set([
    'RECEIPT_EVIDENCE_UNVERIFIED',
    'RECEIPT_EVIDENCE_ATTACHED',
  ])],
  ['RECEIPT_EVIDENCE_UNVERIFIED', new Set(['RECEIPT_EVIDENCE_ATTACHED'])],
  ['RECEIPT_EVIDENCE_ATTACHED', new Set()],
]);

function safeId(value, label) {
  if (typeof value !== 'string' || !ID_RE.test(value)) {
    throw new Error(label + ' must be a nonempty, safe identifier (max 80 chars).');
  }
  return value;
}

function emptyDocument() {
  return { format: FORMAT, nextSequence: 1, records: {} };
}

function validTimestamp(value) {
  return (
    typeof value === 'string' &&
    TIMEZONE_RE.test(value) &&
    Number.isFinite(Date.parse(value))
  );
}

function validateRecord(record, { allowZeroVersion = false } = {}) {
  if (!record || typeof record !== 'object' || record.fictional !== true) {
    throw new Error('The durable adapter accepts fictional records ONLY.');
  }
  safeId(record.taskId, 'taskId');
  safeId(record.eventId, 'eventId');
  safeId(record.correlationId, 'correlationId');
  if (!ORGS.has(record.source) || !ORGS.has(record.target)) {
    throw new Error('Stored record contains an unknown organization.');
  }
  if (record.source === record.target) {
    throw new Error('Stored record source and target must be distinct.');
  }
  const minimumVersion = allowZeroVersion ? 0 : 1;
  if (!Number.isSafeInteger(record.version) || record.version < minimumVersion) {
    throw new Error('Stored record must contain a valid version.');
  }
  if (!Array.isArray(record.events) || record.events.length === 0) {
    throw new Error('Stored record must contain an event history.');
  }
  const expectedEventCount = record.version + (allowZeroVersion ? 1 : 0);
  if (record.events.length !== expectedEventCount) {
    throw new Error('Stored record version and event count do not match.');
  }
  let recordedDispatchId;
  let recordedDispatchActor;
  let recordedDispatchAt;
  for (const [index, event] of record.events.entries()) {
    if (!event || typeof event !== 'object' || Array.isArray(event)) {
      throw new Error('Stored event must be an object.');
    }
    if (
      safeId(event.eventId, 'event.eventId') !== record.eventId ||
      safeId(event.taskId, 'event.taskId') !== record.taskId ||
      safeId(event.correlationId, 'event.correlationId') !== record.correlationId
    ) {
      throw new Error('Stored event linkage does not match its record.');
    }
    safeId(event.actor, 'event.actor');
    if (!ALLOWED_NEXT_STATE.has(event.state)) {
      throw new Error('Stored event contains an unknown state.');
    }
    if (!validTimestamp(event.at)) {
      throw new Error('Stored event timestamp must be timezone-aware.');
    }
    if (
      !event.evidence ||
      typeof event.evidence !== 'object' ||
      Array.isArray(event.evidence)
    ) {
      throw new Error('Stored event evidence must be an object.');
    }
    if (event.state === 'PERSISTENCE_EVIDENCE_ATTACHED') {
      safeId(
        event.evidence.storageRecordId,
        'persistence evidence.storageRecordId',
      );
    }
    if (event.state === 'ASSIGNED_ACKNOWLEDGED') {
      safeId(
        event.evidence.acknowledgementId,
        'assignment evidence.acknowledgementId',
      );
    }
    if (event.state === 'DISPATCH_ATTEMPTED') {
      recordedDispatchId = safeId(
        event.evidence.dispatchId,
        'dispatch evidence.dispatchId',
      );
      recordedDispatchActor = event.actor;
      recordedDispatchAt = event.at;
    }
    if (
      event.state === 'RECEIPT_EVIDENCE_UNVERIFIED' ||
      event.state === 'RECEIPT_EVIDENCE_ATTACHED'
    ) {
      if (!recordedDispatchId) {
        throw new Error('Stored receipt evidence has no recorded dispatch attempt.');
      }
      const receiptDispatchId = safeId(
        event.evidence.dispatchId,
        'receipt evidence.dispatchId',
      );
      safeId(event.evidence.receiptId, 'receipt evidence.receiptId');
      if (receiptDispatchId !== recordedDispatchId) {
        throw new Error('Stored receipt dispatch ID does not match the recorded dispatch attempt.');
      }
      if (event.actor === recordedDispatchActor) {
        throw new Error('Stored receipt evidence actor must differ from the dispatcher.');
      }
      if (event.state === 'RECEIPT_EVIDENCE_UNVERIFIED') {
        if (event.evidence.evidenceOrigin !== 'CALLER_SUPPLIED_UNVERIFIED') {
          throw new Error('Stored unverified receipt evidence has an invalid origin.');
        }
      } else {
        safeId(event.evidence.retrievalId, 'receipt evidence.retrievalId');
        const recipientActor = safeId(
          event.evidence.recipientActor,
          'receipt evidence.recipientActor',
        );
        if (recipientActor === recordedDispatchActor) {
          throw new Error('Stored receipt recipient actor must differ from the dispatcher.');
        }
        if (event.evidence.evidenceOrigin !== 'AUTHENTICATED_READER_FIXTURE') {
          throw new Error('Stored verified receipt evidence has an invalid origin.');
        }
        if (
          !validTimestamp(event.evidence.receivedAt) ||
          event.evidence.receivedAt !== event.at
        ) {
          throw new Error('Stored verified receipt time must match its event timestamp.');
        }
        const previousEventAt = index > 0
          ? record.events[index - 1].at
          : null;
        if (
          previousEventAt &&
          Date.parse(event.evidence.receivedAt) <= Date.parse(previousEventAt)
        ) {
          throw new Error(
            'Stored verified receipt must be later than the preceding recorded event.',
          );
        }
        if (Date.parse(event.evidence.receivedAt) <= Date.parse(recordedDispatchAt)) {
          throw new Error('Stored verified receipt must be later than its dispatch attempt.');
        }
      }
    }
    if (index === 0 && event.state !== 'RECEIVED') {
      throw new Error('Stored event history must begin in RECEIVED.');
    }
    if (index > 0) {
      const previousEvent = record.events[index - 1];
      const previousState = previousEvent.state;
      if (!ALLOWED_NEXT_STATE.get(previousState)?.has(event.state)) {
        throw new Error('Stored event history contains an invalid transition.');
      }
      if (Date.parse(event.at) < Date.parse(previousEvent.at)) {
        throw new Error('Stored event history contains a backward timestamp.');
      }
    }
  }
  if (record.events.at(-1).state !== record.state) {
    throw new Error('Stored record state does not match its terminal event.');
  }
  return structuredClone(record);
}

/**
 * Local JSON persistence for isolated fictional tests only.
 * It is synchronous, single-process and not a production database.
 */
export function createFictionalJsonFileStore({ filePath }) {
  if (typeof filePath !== 'string' || filePath.length === 0) {
    throw new Error('filePath is required.');
  }

  function readDocument() {
    if (!existsSync(filePath)) return emptyDocument();
    let parsed;
    try {
      parsed = JSON.parse(readFileSync(filePath, 'utf8'));
    } catch {
      throw new Error('Fictional handoff store is unreadable or corrupt.');
    }
    if (
      !parsed || parsed.format !== FORMAT ||
      !Number.isSafeInteger(parsed.nextSequence) || parsed.nextSequence < 1 ||
      !parsed.records || typeof parsed.records !== 'object' || Array.isArray(parsed.records)
    ) {
      throw new Error('Fictional handoff store has an invalid schema.');
    }
    for (const [taskId, record] of Object.entries(parsed.records)) {
      if (taskId !== record?.taskId) throw new Error('Fictional handoff store key mismatch.');
      validateRecord(record);
    }
    return parsed;
  }

  function writeDocument(document) {
    mkdirSync(dirname(filePath), { recursive: true });
    const temporary = filePath + '.tmp';
    try {
      writeFileSync(temporary, JSON.stringify(document, null, 2) + '\n', {
        encoding: 'utf8',
        flag: 'w',
        mode: 0o600,
      });
      renameSync(temporary, filePath);
    } catch (error) {
      try { unlinkSync(temporary); } catch {}
      throw error;
    }
  }

  return {
    allocateSequence() {
      const document = readDocument();
      const sequence = document.nextSequence;
      document.nextSequence += 1;
      writeDocument(document);
      return sequence;
    },
    save(record, { expectedVersion } = {}) {
      if (!Number.isSafeInteger(expectedVersion) || expectedVersion < 0) {
        throw new Error('expectedVersion must be a nonnegative safe integer.');
      }
      const next = validateRecord(record, { allowZeroVersion: true });
      if (next.version !== expectedVersion) {
        throw new Error('Record version must match expectedVersion.');
      }
      const document = readDocument();
      const existing = document.records[next.taskId];
      if (existing && existing.correlationId !== next.correlationId) {
        throw new Error('Task ID conflicts with another correlation ID.');
      }
      const correlationOwner = Object.values(document.records).find(
        (record) =>
          record.correlationId === next.correlationId &&
          record.taskId !== next.taskId,
      );
      if (correlationOwner) {
        throw new Error('Correlation ID is already linked to another task.');
      }
      const actualVersion = existing ? existing.version : 0;
      if (actualVersion !== expectedVersion) {
        const conflict = new Error(
          'Stale write rejected: expected version ' + expectedVersion +
          ' but durable version is ' + actualVersion + '.',
        );
        conflict.code = 'HANDOFF_STORE_CONFLICT';
        throw conflict;
      }
      if (existing) {
        for (const name of ['eventId', 'correlationId', 'source', 'target', 'fictional']) {
          if (next[name] !== existing[name]) {
            throw new Error('Stored task identity and routing cannot be rewritten.');
          }
        }
        const durableHistory = next.events.slice(0, existing.events.length);
        if (!isDeepStrictEqual(durableHistory, existing.events)) {
          throw new Error('Stored event history cannot be rewritten.');
        }
      }
      next.version = expectedVersion + 1;
      document.records[next.taskId] = next;
      writeDocument(document);
      return this.read(next.taskId);
    },
    read(taskId) {
      taskId = safeId(taskId, 'taskId');
      const record = readDocument().records[taskId];
      return record ? validateRecord(record) : null;
    },
    findByCorrelation(correlationId) {
      correlationId = safeId(correlationId, 'correlationId');
      const records = Object.values(readDocument().records)
        .filter((record) => record.correlationId === correlationId);
      if (records.length > 1) throw new Error('Duplicate correlation ID in durable store.');
      return records.length === 1 ? validateRecord(records[0]) : null;
    },
  };
}
