import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { dirname } from 'node:path';

const FORMAT = 'vbhc-fictional-handoff-store-v1';
const ID_RE = /^[A-Za-z0-9._:-]{1,80}$/;

function safeId(value, label) {
  if (typeof value !== 'string' || !ID_RE.test(value)) {
    throw new Error(label + ' must be a nonempty, safe identifier (max 80 chars).');
  }
  return value;
}

function emptyDocument() {
  return { format: FORMAT, nextSequence: 1, records: {} };
}

function validateRecord(record, { allowZeroVersion = false } = {}) {
  if (!record || typeof record !== 'object' || record.fictional !== true) {
    throw new Error('The durable adapter accepts fictional records ONLY.');
  }
  safeId(record.taskId, 'taskId');
  safeId(record.eventId, 'eventId');
  safeId(record.correlationId, 'correlationId');
  const minimumVersion = allowZeroVersion ? 0 : 1;
  if (!Number.isSafeInteger(record.version) || record.version < minimumVersion) {
    throw new Error('Stored record must contain a valid version.');
  }
  if (!Array.isArray(record.events) || record.events.length === 0) {
    throw new Error('Stored record must contain an event history.');
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
      const actualVersion = existing ? existing.version : 0;
      if (actualVersion !== expectedVersion) {
        const conflict = new Error(
          'Stale write rejected: expected version ' + expectedVersion +
          ' but durable version is ' + actualVersion + '.',
        );
        conflict.code = 'HANDOFF_STORE_CONFLICT';
        throw conflict;
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
