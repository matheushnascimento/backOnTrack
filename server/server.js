// @ts-nocheck -- código Node do server, fora do tsc do app (ADR-002).
// TinyBase WebSocket sync server (M6, ADR-009, #198).
//
// Runs `createWsServer` from `tinybase/synchronizers/synchronizer-ws-server`
// and exposes a WebSocket endpoint. Each connection's path is treated as a
// separate "room" — the client picks the room (e.g. one per userId), the
// server keeps one `MergeableStore` per room.
//
// Persistence: JSON file per room, written to $DATA_DIR (default ./data).
// Simple and durable enough for the current scale (~10 testers); can be
// swapped for SQLite later without touching the client.
//
// TLS termination is done by the reverse proxy in front (Traefik in the
// homeserver deploy — see compose.yml). This process only speaks plain WS.

import { createMergeableStore } from "tinybase";
import { createFilePersister } from "tinybase/persisters/persister-file";
import { createWsServer } from "tinybase/synchronizers/synchronizer-ws-server";
import { WebSocketServer } from "ws";
import { mkdirSync } from "node:fs";
import { join, resolve } from "node:path";

const PORT = Number(process.env.PORT ?? 8787);
const DATA_DIR = resolve(process.env.DATA_DIR ?? "./data");

// Ensure the data dir exists so `createFilePersister` can open files.
// `recursive: true` makes this a no-op if it's already there.
mkdirSync(DATA_DIR, { recursive: true });

// `pathId` is whatever comes after the host in the WS URL (e.g. `/user123`).
// Sanitize to a filesystem-safe name so nothing sneaks out of $DATA_DIR.
function safeFilename(pathId) {
  const clean = pathId.replace(/[^A-Za-z0-9_-]/g, "-").replace(/^-+|-+$/g, "");
  return `${clean || "default"}.json`;
}

const wss = new WebSocketServer({ port: PORT });
createWsServer(wss, (pathId) =>
  createFilePersister(
    createMergeableStore(),
    join(DATA_DIR, safeFilename(pathId)),
  ),
);

console.log(`[sync] listening on ws://0.0.0.0:${PORT} — data dir: ${DATA_DIR}`);
