function startForgeServer(app, config, database) {
    const server = app.listen(config.port, "0.0.0.0", () => {
        console.log(`Forge ${config.version} lancé sur http://localhost:${config.port}`);
        console.log("Stockage SQLite actif.");
        console.log(`Authentification HTTP Basic : ${config.auth.enabled ? "activée" : "désactivée"}`);
    });

    server.keepAliveTimeout = config.runtime.keepAliveTimeoutMs;
    server.headersTimeout = config.runtime.headersTimeoutMs;
    server.requestTimeout = config.runtime.requestTimeoutMs;

    function shutdown(signal) {
        console.log(`Forge : arrêt demandé (${signal}).`);

        server.close(() => {
            database.checkpoint();

            try {
                database.close();
            } catch (error) {
                console.warn("Forge DB : fermeture impossible.", error.message);
            }

            process.exit(0);
        });

        setTimeout(() => {
            console.error("Forge : arrêt forcé après timeout.");
            process.exit(1);
        }, config.runtime.shutdownTimeoutMs).unref();
    }

    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);

    process.on("uncaughtException", (error) => {
        console.error("Forge : exception non interceptée.", error);
        database.checkpoint();
        process.exit(1);
    });

    process.on("unhandledRejection", (reason) => {
        console.error("Forge : promesse rejetée non gérée.", reason);
    });

    return server;
}

module.exports = {
    startForgeServer
};
