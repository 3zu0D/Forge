const fs = require("fs");
const path = require("path");
const Database = require("better-sqlite3");

function createForgeDatabase(config) {
    const db = new Database(config.dbPath);

    db.pragma("journal_mode = WAL");
    db.pragma("synchronous = NORMAL");
    db.pragma("foreign_keys = ON");
    db.pragma("busy_timeout = 5000");

    db.exec(`
CREATE TABLE IF NOT EXISTS storage (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
`);

    const statements = {
        ping: db.prepare("SELECT 1"),
        getAllEntries: db.prepare("SELECT key, value FROM storage ORDER BY key"),
        upsertEntry: db.prepare(`
INSERT INTO storage (key, value, updated_at)
VALUES (@key, @value, CURRENT_TIMESTAMP)
ON CONFLICT(key) DO UPDATE SET
    value = excluded.value,
    updated_at = CURRENT_TIMESTAMP
`),
        deleteEntry: db.prepare("DELETE FROM storage WHERE key = ?"),
        deleteAllEntries: db.prepare("DELETE FROM storage")
    };

    function ping() {
        statements.ping.get();
    }

    function getEntriesObject() {
        const entries = {};

        for (const row of statements.getAllEntries.all()) {
            entries[row.key] = row.value;
        }

        return entries;
    }

    function upsert(key, value) {
        statements.upsertEntry.run({
            key,
            value
        });
    }

    function upsertBulk(rows, validateKey, validateValue) {
        let saved = 0;
        let skipped = 0;

        const transaction = db.transaction((items) => {
            for (const [key, rawValue] of items) {
                if (!validateKey(key)) {
                    skipped += 1;
                    continue;
                }

                const checkedValue = validateValue(rawValue);

                if (!checkedValue.ok) {
                    skipped += 1;
                    continue;
                }

                upsert(key, checkedValue.value);
                saved += 1;
            }
        });

        transaction(rows);

        return { saved, skipped };
    }

    function remove(key) {
        statements.deleteEntry.run(key);
    }

    function clear() {
        statements.deleteAllEntries.run();
    }

    function checkpoint() {
        try {
            db.pragma("wal_checkpoint(PASSIVE)");
        } catch (error) {
            console.warn("Forge DB : checkpoint WAL impossible.", error.message);
        }
    }

    function makeBackupName() {
        const stamp = new Date()
            .toISOString()
            .replace(/[:.]/g, "-")
            .replace("T", "_")
            .replace("Z", "");

        return `forge-${stamp}.db`;
    }

    async function backup() {
        fs.mkdirSync(config.backupsDir, { recursive: true });

        const file = makeBackupName();
        const backupPath = path.join(config.backupsDir, file);

        await db.backup(backupPath);

        const stat = fs.statSync(backupPath);

        return {
            file,
            sizeBytes: stat.size
        };
    }

    function close() {
        db.close();
    }

    return {
        ping,
        getEntriesObject,
        upsert,
        upsertBulk,
        remove,
        clear,
        checkpoint,
        backup,
        close
    };
}

module.exports = {
    createForgeDatabase
};
