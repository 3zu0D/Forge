const path = require("path");
const express = require("express");
const crypto = require("crypto");
const compression = require("compression");
const {
    applySecurityHeaders,
    createApiRateLimiter,
    createRequireForgeAuth
} = require("./security");
const { createStorageValidators } = require("./storage-validation");
const { registerForgeApiRoutes } = require("./routes");

function createForgeApp(config, database) {
    const app = express();
    const validators = createStorageValidators(config);
    const context = {
        config,
        database,
        validators
    };

    app.disable("x-powered-by");

    app.use(compression());
    app.use(applySecurityHeaders);
    app.use(createRequireForgeAuth(config));
    app.use(createApiRateLimiter(config));
    app.use(express.json({
        limit: config.api.jsonLimit,
        strict: true,
        type: "application/json"
    }));

    registerForgeApiRoutes(app, context);

    app.use(express.static(config.publicDir, {
        extensions: ["html"],
        index: false,
        etag: true,
        maxAge: 0,
        setHeaders: (res, filePath) => {
            if (filePath.endsWith(".html")) {
                res.setHeader("Cache-Control", "no-store");
            } else {
                res.setHeader("Cache-Control", "no-cache");
            }
        }
    }));

    app.get("/", (_req, res) => {
        res.sendFile(path.join(config.publicDir, "dashboard.html"));
    });

    app.get("*", (req, res, next) => {
        if (req.path.startsWith("/api/")) return next();

        res.sendFile(path.join(config.publicDir, "dashboard.html"));
    });

    app.use((err, req, res, _next) => {
        const requestId = crypto.randomBytes(6).toString("hex");

        console.error(`Forge error ${requestId}:`, err);

        if (res.headersSent) return;

        if (req.path.startsWith("/api/")) {
            return res.status(500).json({
                error: "Erreur interne Forge.",
                requestId
            });
        }

        return res.status(500).send("Erreur interne Forge.");
    });

    return app;
}

module.exports = {
    createForgeApp
};
