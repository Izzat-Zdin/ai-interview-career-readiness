import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// DB file lives at server/data/interview.db (overridable for tests).
const dataDir = process.env.DB_DIR || path.join(__dirname, '../../../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}
const dbPath = path.join(dataDir, 'interview.db');

/**
 * Storage driver resolution:
 * 1) node:sqlite (built-in, Node >=22.5) — zero native dependencies, preferred
 *    because this machine's better-sqlite3 native binding hard-crashes (segfault)
 *    the whole process on first use, which cannot be caught in-process.
 * 2) better-sqlite3 fallback for older Node versions without node:sqlite.
 * We wrap node:sqlite's positional-parameter API to also accept named params.
 */
function openDatabase() {
  try {
    const { DatabaseSync } = require('node:sqlite');
    const db = new DatabaseSync(dbPath);
    db.exec('PRAGMA journal_mode = WAL;');
    const prepare = (sql) => {
      const stmt = db.prepare(sql);
      // Convert @name / $name / :name params into positional for node:sqlite
      return {
        run(named) {
          if (named && typeof named === 'object' && !Array.isArray(named)) {
            const keys = [];
            const positionalSql = sql.replace(/[@$:](\w+)/g, (_m, k) => {
              keys.push(k);
              return '?';
            });
            const positionalStmt = positionalSql === sql ? stmt : db.prepare(positionalSql);
            return positionalStmt.run(...keys.map((k) => named[k] ?? null));
          }
          return stmt.run(named);
        },
        get: (...args) => stmt.get(...args),
        all: (...args) => stmt.all(...args),
      };
    };
    return { kind: 'node:sqlite', db, prepare };
  } catch (err) {
    console.warn('[db] node:sqlite unavailable, falling back to better-sqlite3:', err.message);
  }
  try {
    const Database = require('better-sqlite3');
    const db = new Database(dbPath);
    db.pragma('journal_mode = WAL');
    return { kind: 'better-sqlite3', db };
  } catch (err) {
    console.warn('[db] No SQLite driver available, sessions will not persist:', err.message);
    return { kind: 'none', db: null };
  }
}

const driver = openDatabase();
console.log(`[db] Using SQLite driver: ${driver.kind}`);

const exec = (sql) => driver.db?.exec(sql);
const prepare = driver.prepare
  ? driver.prepare.bind(driver)
  : (sql) => driver.db?.prepare(sql);

exec(`
  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    role TEXT,
    type TEXT,
    language TEXT DEFAULT 'en',
    persona TEXT DEFAULT 'neutral',
    status TEXT,
    average_score INTEGER,
    created_at TEXT,
    completed_at TEXT,
    data TEXT NOT NULL
  );
`);

const insertStmt = driver.db
  ? prepare(`
  INSERT OR REPLACE INTO sessions
    (id, role, type, language, persona, status, average_score, created_at, completed_at, data)
  VALUES
    (@id, @role, @type, @language, @persona, @status, @average_score, @created_at, @completed_at, @data)
`)
  : null;

export function persistSession(session) {
  if (!insertStmt) return;
  try {
    const validEvaluations = (session.evaluations || []).filter((e) => Number.isFinite(e?.overallScore));
    const averageScore = validEvaluations.length
      ? Math.round(validEvaluations.reduce((sum, e) => sum + e.overallScore, 0) / validEvaluations.length)
      : null;
    insertStmt.run({
      id: session.id,
      role: session.role,
      type: session.type,
      language: session.language || 'en',
      persona: session.persona || 'neutral',
      status: session.status,
      average_score: averageScore,
      created_at: session.createdAt,
      completed_at: session.status === 'completed' ? new Date().toISOString() : null,
      data: JSON.stringify(session),
    });
  } catch (err) {
    console.warn('Failed to persist session:', err.message);
  }
}

export function loadSession(id) {
  if (!driver.db) return null;
  const row = prepare('SELECT data FROM sessions WHERE id = ?').get(id);
  if (!row) return null;
  try {
    return JSON.parse(row.data);
  } catch {
    return null;
  }
}

export function listHistory({ limit = 50 } = {}) {
  if (!driver.db) return [];
  const rows = prepare(
      `SELECT id, role, type, language, persona, status, average_score, created_at, completed_at, data
       FROM sessions ORDER BY created_at DESC LIMIT ?`
    )
    .all(limit);
  return rows.map((row) => {
    let session = null;
    try {
      session = JSON.parse(row.data);
    } catch {
      session = null;
    }
    const qa = session?.questions?.map((q, i) => ({
      questionId: q.id,
      question: q.text,
      answer: session.answers?.[i]?.text || '',
      score: session.evaluations?.[i]?.overallScore ?? null,
      fillerRate: session.answers?.[i]?.audio?.fillerAnalysis?.ratePer100Words ?? null,
      nervousPercent: session.evaluations?.[i] == null
        ? null
        : session.answers?.[i]?.audio?.facialAnalysis?.nervousPercent ?? null,
    })) || [];
    const fillerRates = qa.map((q) => q.fillerRate).filter((v) => Number.isFinite(v));
    const avgFillerRate = fillerRates.length
      ? Number((fillerRates.reduce((a, b) => a + b, 0) / fillerRates.length).toFixed(2))
      : null;
    return {
      id: row.id,
      role: row.role,
      type: row.type,
      language: row.language,
      persona: row.persona,
      status: row.status,
      averageScore: row.average_score,
      avgFillerRate,
      createdAt: row.created_at,
      completedAt: row.completed_at,
      questionCount: session?.questions?.length ?? 0,
      answeredCount: session?.answers?.length ?? 0,
    };
  });
}
