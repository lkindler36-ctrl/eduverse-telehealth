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

test('caller-supplied receipt stays unverified in the linked evidence chain', () => {
  const r = create();
  const { taskId } = start(r);
  advanceToDispatch(r, taskId);
  const end = r.attachReceiptEvidence(taskId, {
    receiptId: 'receipt-1', dispatchId: 'dispatch-1', verifiedBy: 'recipient-reader', dispatchActor: 'dispatcher',
  });
  assert.equal(end.state, 'RECEIPT_EVIDENCE_UNVERIFIED');
  assert.equal(end.events.length, 7);
  assert.equal(end.events.at(-1).evidence.dispatchId, 'dispatch-1');
  assert.equal(end.events.at(-1).evidence.evidenceOrigin, 'CALLER_SUPPLIED_UNVERIFIED');
});

test('authenticated reader upgrades caller-supplied evidence to verified receipt state', async () => {
  const r = create();
  const { taskId } = start(r, 'reader-upgrade');
  advanceToDispatch(r, taskId);

  const unverified = r.attachReceiptEvidence(taskId, {
    receiptId: 'caller-receipt',
    dispatchId: 'dispatch-1',
    verifiedBy: 'manual-reviewer',
    dispatchActor: 'dispatcher',
  });
  assert.equal(unverified.state, 'RECEIPT_EVIDENCE_UNVERIFIED');

  const verified = await r.retrieveAndAttachReceiptEvidence(taskId, {
    requestedBy: 'recipient-reader',
    receiptReader: { retrieve: async () => fictionalReceipt() },
  });

  assert.equal(verified.state, 'RECEIPT_EVIDENCE_ATTACHED');
  assert.equal(verified.events.length, 8);
  assert.equal(verified.events.at(-1).at, '2026-10-18T12:01:00.000Z');
  assert.equal(verified.events.at(-1).evidence.evidenceOrigin, 'AUTHENTICATED_READER_FIXTURE');
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

test('same-organization handoff is rejected before persistence', () => {
  const r = create();
  assert.throws(() => r.receive({
    correlationId: 'same-org-1',
    source: 'VBHC',
    target: 'VBHC',
    fictional: true,
  }), /must be distinct/);
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

test('cross-linked or internally inconsistent durable history fails closed', () => withStore(({ filePath, store }) => {
  const r = create({ store });
  const started = start(r, 'linked-corruption-1');
  r.validate(started.taskId, 'reviewer');
  const original = JSON.parse(readFileSync(filePath, 'utf8'));
  const cases = [
    {
      mutate: (document) => {
        document.records[started.taskId].events[1].correlationId = 'other-correlation';
      },
      error: /event linkage does not match/,
    },
    {
      mutate: (document) => {
        document.records[started.taskId].state = 'RECEIVED';
      },
      error: /state does not match its terminal event/,
    },
    {
      mutate: (document) => {
        document.records[started.taskId].events.pop();
      },
      error: /version and event count do not match/,
    },
    {
      mutate: (document) => {
        document.records[started.taskId].events[1].state = 'ASSIGNED_ACKNOWLEDGED';
        document.records[started.taskId].state = 'ASSIGNED_ACKNOWLEDGED';
      },
      error: /invalid transition/,
    },
  ];

  for (const corruption of cases) {
    const document = structuredClone(original);
    corruption.mutate(document);
    writeFileSync(filePath, JSON.stringify(document, null, 2) + '\n', 'utf8');
    const corruptedBytes = readFileSync(filePath, 'utf8');
    assert.throws(
      () => create({ store: createFictionalJsonFileStore({ filePath }) }).get(started.taskId),
      corruption.error,
    );
    assert.equal(readFileSync(filePath, 'utf8'), corruptedBytes);
  }
}));

test('invalid durable organization routing or backward chronology fails closed', () => withStore(({ filePath, store }) => {
  const r = create({ store });
  const started = start(r, 'route-chronology-corruption-1');
  r.validate(started.taskId, 'reviewer');
  const original = JSON.parse(readFileSync(filePath, 'utf8'));
  const cases = [
    {
      mutate: (document) => {
        document.records[started.taskId].source = 'UNKNOWN_ORG';
      },
      error: /unknown organization/,
    },
    {
      mutate: (document) => {
        document.records[started.taskId].target = 'VBHC';
      },
      error: /must be distinct/,
    },
    {
      mutate: (document) => {
        document.records[started.taskId].events[1].at = '2026-10-18T11:59:59.999Z';
      },
      error: /backward timestamp/,
    },
  ];

  for (const corruption of cases) {
    const document = structuredClone(original);
    corruption.mutate(document);
    writeFileSync(filePath, JSON.stringify(document, null, 2) + '\n', 'utf8');
    const corruptedBytes = readFileSync(filePath, 'utf8');
    assert.throws(
      () => create({ store: createFictionalJsonFileStore({ filePath }) }).get(started.taskId),
      corruption.error,
    );
    assert.equal(readFileSync(filePath, 'utf8'), corruptedBytes);
  }
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

test('event timestamps require an explicit timezone', () => {
  const r = createFictionalHandoffRegistry({ clock: () => '2026-10-18T12:00:00' });
  assert.throws(() => start(r, 'timezone-required'), /timezone-aware timestamp/);
});

test('core rejects a backward transition timestamp before in-memory mutation', () => {
  const times = [
    '2026-10-18T12:00:00.000Z',
    '2026-10-18T11:59:59.999Z',
  ];
  const r = createFictionalHandoffRegistry({ clock: () => times.shift() });
  const started = start(r, 'core-backward-in-memory');
  assert.throws(
    () => r.validate(started.taskId, 'reviewer'),
    /earlier than the latest recorded event timestamp/,
  );
  const unchanged = r.get(started.taskId);
  assert.equal(unchanged.state, 'RECEIVED');
  assert.equal(unchanged.version, 1);
  assert.equal(unchanged.events.length, 1);
});

test('core rejects a backward transition timestamp before durable mutation', () => withStore(({ filePath, store }) => {
  const times = [
    '2026-10-18T12:00:00.000Z',
    '2026-10-18T11:59:59.999Z',
  ];
  const r = createFictionalHandoffRegistry({ clock: () => times.shift(), store });
  const started = start(r, 'core-backward-durable');
  const before = readFileSync(filePath, 'utf8');
  assert.throws(
    () => r.validate(started.taskId, 'reviewer'),
    /earlier than the latest recorded event timestamp/,
  );
  assert.equal(readFileSync(filePath, 'utf8'), before);
  const recovered = create({ store: createFictionalJsonFileStore({ filePath }) }).get(started.taskId);
  assert.equal(recovered.state, 'RECEIVED');
  assert.equal(recovered.version, 1);
  assert.equal(recovered.events.length, 1);
}));

test('core rejects a durable create readback with altered routing', () => withStore(({ filePath, store }) => {
  const alteredStore = {
    allocateSequence: () => store.allocateSequence(),
    read: (taskId) => store.read(taskId),
    findByCorrelation: (correlationId) => store.findByCorrelation(correlationId),
    save(record, options) {
      const readback = store.save(record, options);
      return {
        ...readback,
        source: readback.target,
        target: readback.source,
      };
    },
  };
  const r = create({ store: alteredStore });
  assert.throws(
    () => start(r, 'altered-create-readback'),
    /did not exactly match the written record/,
  );
  const durable = create({ store: createFictionalJsonFileStore({ filePath }) })
    .get('demo-task-0001');
  assert.equal(durable.source, 'VBHC');
  assert.equal(durable.target, 'EDUVERSE_TELEHEALTH');
}));

test('core rejects a durable transition readback with altered audit evidence', () => withStore(({ filePath, store }) => {
  let saves = 0;
  const alteredStore = {
    allocateSequence: () => store.allocateSequence(),
    read: (taskId) => store.read(taskId),
    findByCorrelation: (correlationId) => store.findByCorrelation(correlationId),
    save(record, options) {
      saves += 1;
      const readback = store.save(record, options);
      if (saves === 1) return readback;
      const altered = structuredClone(readback);
      altered.events.at(-1).actor = 'different-reviewer';
      return altered;
    },
  };
  const r = create({ store: alteredStore });
  const started = start(r, 'altered-transition-readback');
  assert.throws(
    () => r.validate(started.taskId, 'reviewer'),
    /did not exactly match the written record/,
  );
  const durable = create({ store: createFictionalJsonFileStore({ filePath }) })
    .get(started.taskId);
  assert.equal(durable.state, 'VALIDATED');
  assert.equal(durable.events.at(-1).actor, 'reviewer');
}));

test('authenticated receipt timestamp must be later than the recorded dispatch', async () => {
  const r = create();
  const { taskId } = start(r, 'reader-time-order');
  advanceToDispatch(r, taskId);
  await assert.rejects(r.retrieveAndAttachReceiptEvidence(taskId, {
    requestedBy: 'recipient-reader',
    receiptReader: { retrieve: async () => fictionalReceipt({ receivedAt: '2026-10-18T12:00:00.000Z' }) },
  }), /later than the recorded dispatch/);
  await assert.rejects(r.retrieveAndAttachReceiptEvidence(taskId, {
    requestedBy: 'recipient-reader',
    receiptReader: { retrieve: async () => fictionalReceipt({ receivedAt: '2026-10-18T11:59:59.999Z' }) },
  }), /later than the recorded dispatch/);
  assert.equal(r.get(taskId).state, 'DISPATCH_ATTEMPTED');
});

test('authenticated upgrade rejects a receipt older than intervening unverified evidence', async () => {
  const times = [
    '2026-10-18T12:00:00.000Z',
    '2026-10-18T12:01:00.000Z',
    '2026-10-18T12:02:00.000Z',
    '2026-10-18T12:03:00.000Z',
    '2026-10-18T12:04:00.000Z',
    '2026-10-18T12:05:00.000Z',
    '2026-10-18T12:10:00.000Z',
  ];
  const r = createFictionalHandoffRegistry({ clock: () => times.shift() });
  const { taskId } = start(r, 'reader-upgrade-time-order');
  advanceToDispatch(r, taskId);
  r.attachReceiptEvidence(taskId, {
    receiptId: 'caller-receipt',
    dispatchId: 'dispatch-1',
    verifiedBy: 'manual-reviewer',
    dispatchActor: 'dispatcher',
  });

  await assert.rejects(r.retrieveAndAttachReceiptEvidence(taskId, {
    requestedBy: 'recipient-reader',
    receiptReader: {
      retrieve: async () => fictionalReceipt({ receivedAt: '2026-10-18T12:06:00.000Z' }),
    },
  }), /later than the latest recorded event/);
  assert.equal(r.get(taskId).state, 'RECEIPT_EVIDENCE_UNVERIFIED');
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

