// Pinchgut L8 Reference Server v0.1
// Simple Layer 8 instruction gateway + hash-linked ledger.

const express = require('express');
const bodyParser = require('body-parser');
const morgan = require('morgan');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 8080;

// --- Storage setup ---------------------------------------------------------

const DATA_DIR = path.join(__dirname, 'data');
const LEDGER_FILE = path.join(DATA_DIR, 'ledger.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function loadLedger() {
  if (!fs.existsSync(LEDGER_FILE)) {
    fs.writeFileSync(LEDGER_FILE, '[]', 'utf8');
  }
  const raw = fs.readFileSync(LEDGER_FILE, 'utf8');
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveLedger(entries) {
  fs.writeFileSync(LEDGER_FILE, JSON.stringify(entries, null, 2), 'utf8');
}

function hashBlock(block) {
  const h = crypto.createHash('sha256');
  h.update(JSON.stringify({
    ts: block.ts,
    frame: block.frame,
    prevHash: block.prevHash
  }));
  return h.digest('hex');
}

// --- Middleware -----------------------------------------------------------

app.use(bodyParser.json());
app.use(morgan('tiny'));

// --- L8 helpers -----------------------------------------------------------

const INSTRUCTION_VERSION = 'PINCHGUT-L8-0.1';

function isValidInstructionFrame(f) {
  if (!f || typeof f !== 'object') return false;
  if (!f.msgId || typeof f.msgId !== 'string') return false;
  if (!f.origin || typeof f.origin !== 'string') return false;
  if (!f.kind || typeof f.kind !== 'string') return false;
  if (!f.intent || typeof f.intent !== 'string') return false;
  if (f.version && f.version !== INSTRUCTION_VERSION) return false;
  return true;
}

// --- Routes ---------------------------------------------------------------

// Health check
app.get('/health', (req, res) => {
  const entries = loadLedger();
  res.json({
    ok: true,
    service: 'Pinchgut Protocol L8',
    status: 'running',
    ledgerEntries: entries.length,
    time: new Date().toISOString()
  });
});

// Submit an instruction frame
app.post('/instruction', (req, res) => {
  const frame = req.body;

  if (!isValidInstructionFrame(frame)) {
    return res.status(400).json({
      ok: false,
      error: 'INVALID_FRAME',
      message: 'msgId, origin, kind, intent are required; optional version must match.',
      expectedVersion: INSTRUCTION_VERSION
    });
  }

  if (!frame.version) {
    frame.version = INSTRUCTION_VERSION;
  }

  const ledger = loadLedger();
  const prev = ledger.length > 0 ? ledger[ledger.length - 1] : null;

  const block = {
    ts: new Date().toISOString(),
    frame,
    prevHash: prev ? prev.hash : null
  };
  block.hash = hashBlock(block);

  ledger.push(block);
  saveLedger(ledger);

  res.status(201).json({
    ok: true,
    saved: {
      ts: block.ts,
      hash: block.hash,
      prevHash: block.prevHash
    }
  });
});

// Read ledger
app.get('/ledger', (req, res) => {
  const ledger = loadLedger();
  res.json({
    ok: true,
    count: ledger.length,
    entries: ledger
  });
});

// Verify chain integrity
app.get('/verify', (req, res) => {
  const ledger = loadLedger();

  let valid = true;
  let badIndex = null;

  for (let i = 0; i < ledger.length; i++) {
    const block = ledger[i];
    const expectedPrev = i === 0 ? null : ledger[i - 1].hash;
    if (block.prevHash !== expectedPrev) {
      valid = false;
      badIndex = i;
      break;
    }
    const recomputed = hashBlock({
      ts: block.ts,
      frame: block.frame,
      prevHash: block.prevHash
    });
    if (recomputed !== block.hash) {
      valid = false;
      badIndex = i;
      break;
    }
  }

  res.json({
    ok: valid,
    entries: ledger.length,
    badIndex
  });
});

// --- Start server ---------------------------------------------------------

app.listen(PORT, () => {
  console.log(`Pinchgut L8 server running on port ${PORT}`);
});
