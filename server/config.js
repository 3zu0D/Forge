const path = require("path");
const fs = require("fs");

const FORGE_VERSION = "0.1.3";

function readNumberEnv(name, fallback) {
    const value = process.env[name];

    if (value === undefined || value === "") return fallback;

    const number = Number(value);

    if (!Number.isFinite(number)) return fallback;

    return number;
}

function createForgeConfig(rootDir) {
    const dataDir = process.env.FORGE_DATA_DIR || path.join(rootDir, "data");
    const backupsDir = path.join(dataDir, "backups");
    const publicDir = path.join(rootDir, "public");

    const authUser = process.env.FORGE_AUTH_USER || "";
    const authPassword = process.env.FORGE_AUTH_PASSWORD || "";

    if ((authUser && !authPassword) || (!authUser && authPassword)) {
        throw new Error("FORGE_AUTH_USER et FORGE_AUTH_PASSWORD doivent être configurés ensemble.");
    }

    fs.mkdirSync(dataDir, { recursive: true });
    fs.mkdirSync(backupsDir, { recursive: true });

    return {
        version: FORGE_VERSION,
        rootDir,
        port: readNumberEnv("PORT", 3000),
        dataDir,
        backupsDir,
        publicDir,
        dbPath: path.join(dataDir, "forge.db"),
        auth: {
            user: authUser,
            password: authPassword,
            enabled: Boolean(authUser && authPassword)
        },
        api: {
            jsonLimit: process.env.FORGE_JSON_LIMIT || "25mb",
            rateLimitPerMinute: readNumberEnv("FORGE_API_RATE_LIMIT_PER_MINUTE", 1200),
            maxKeyLength: readNumberEnv("FORGE_MAX_STORAGE_KEY_LENGTH", 180),
            maxValueBytes: readNumberEnv("FORGE_MAX_STORAGE_VALUE_BYTES", 5 * 1024 * 1024),
            maxBulkEntries: readNumberEnv("FORGE_MAX_BULK_ENTRIES", 500)
        },
        runtime: {
            keepAliveTimeoutMs: 65 * 1000,
            headersTimeoutMs: 70 * 1000,
            requestTimeoutMs: 120 * 1000,
            shutdownTimeoutMs: 10 * 1000
        }
    };
}

module.exports = {
    createForgeConfig
};
