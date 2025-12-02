# Pinchgut L8

**Pinchgut L8** is a simple, open **Layer 8 instruction & hash-linked ledger protocol**.

This repo contains the reference Node.js server for the protocol, plus specs and docs.
The goal is to provide a **small, inspectable core** that other stacks can build on.

---

## Features

- `/health` – status + ledger entry count
- `/instruction` – submit an instruction frame
- `/ledger` – read the full hash-linked ledger
- `/verify` – re-hash the chain and confirm integrity
- Flat-file JSON storage (`data/ledger.json`)
- No blockchain, no tokens, no drama

---

## Quickstart

```bash
git clone https://github.com/pinchgut-protocol/pinchgut-l8.git
cd pinchgut-l8
npm install
node server.js        # or: npm start
