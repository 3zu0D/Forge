function registerForgeApiRoutes(app, context) {
    const { config, database, validators } = context;

    app.get("/api/health", (_req, res, next) => {
        try {
            database.ping();

            res.json({
                ok: true,
                app: "Forge",
                version: config.version,
                storage: "sqlite",
                authEnabled: config.auth.enabled,
                uptimeSeconds: Math.round(process.uptime())
            });
        } catch (error) {
            next(error);
        }
    });

    app.get("/api/storage", (_req, res, next) => {
        try {
            res.json({
                entries: database.getEntriesObject()
            });
        } catch (error) {
            next(error);
        }
    });

    app.post("/api/storage/bulk", (req, res, next) => {
        try {
            const entries = req.body?.entries;

            if (!entries || typeof entries !== "object" || Array.isArray(entries)) {
                return res.status(400).json({ error: "Payload invalide." });
            }

            const items = Object.entries(entries);

            if (items.length > config.api.maxBulkEntries) {
                return res.status(413).json({ error: "Trop d’entrées dans la synchronisation." });
            }

            const result = database.upsertBulk(
                items,
                validators.isForgeStorageKey,
                validators.validateStorageValue
            );

            return res.json({
                ok: true,
                saved: result.saved,
                skipped: result.skipped
            });
        } catch (error) {
            next(error);
        }
    });

    app.put("/api/storage/:key", (req, res, next) => {
        try {
            const key = req.params.key;

            if (!validators.isForgeStorageKey(key)) {
                return res.status(400).json({ error: "Clé non autorisée." });
            }

            if (!req.body || typeof req.body !== "object" || Array.isArray(req.body)) {
                return res.status(400).json({ error: "Payload invalide." });
            }

            const checkedValue = validators.validateStorageValue(req.body.value);

            if (!checkedValue.ok) {
                return res.status(413).json({ error: checkedValue.error });
            }

            database.upsert(key, checkedValue.value);

            return res.json({ ok: true });
        } catch (error) {
            next(error);
        }
    });

    app.delete("/api/storage/:key", (req, res, next) => {
        try {
            const key = req.params.key;

            if (!validators.isForgeStorageKey(key)) {
                return res.status(400).json({ error: "Clé non autorisée." });
            }

            database.remove(key);
            return res.json({ ok: true });
        } catch (error) {
            next(error);
        }
    });

    app.delete("/api/storage", (_req, res, next) => {
        try {
            database.clear();
            database.checkpoint();
            return res.json({ ok: true });
        } catch (error) {
            next(error);
        }
    });

    app.post("/api/maintenance/backup", async (_req, res, next) => {
        try {
            const backup = await database.backup();

            return res.json({
                ok: true,
                file: backup.file,
                sizeBytes: backup.sizeBytes
            });
        } catch (error) {
            next(error);
        }
    });

    app.use("/api", (_req, res) => {
        res.status(404).json({ error: "Endpoint Forge introuvable." });
    });
}

module.exports = {
    registerForgeApiRoutes
};
