const { createForgeConfig } = require("./server/config");
const { createForgeDatabase } = require("./server/database");
const { createForgeApp } = require("./server/app");
const { startForgeServer } = require("./server/runtime");

try {
    const config = createForgeConfig(__dirname);
    const database = createForgeDatabase(config);
    const app = createForgeApp(config, database);

    startForgeServer(app, config, database);
} catch (error) {
    console.error("Forge : démarrage impossible.", error.message);
    process.exit(1);
}
