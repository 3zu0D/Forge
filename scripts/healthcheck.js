const http = require("http");

const port = Number(process.env.PORT || 3000);
const timeoutMs = Number(process.env.FORGE_HEALTHCHECK_TIMEOUT_MS || 4000);
const authUser = process.env.FORGE_AUTH_USER || "";
const authPassword = process.env.FORGE_AUTH_PASSWORD || "";

const headers = {};

if (authUser && authPassword) {
    headers.Authorization = `Basic ${Buffer.from(`${authUser}:${authPassword}`).toString("base64")}`;
}

const req = http.request({
    host: "127.0.0.1",
    port,
    path: "/api/health",
    method: "GET",
    timeout: timeoutMs,
    headers
}, (res) => {
    let body = "";

    res.setEncoding("utf8");
    res.on("data", (chunk) => {
        body += chunk;
    });

    res.on("end", () => {
        if (res.statusCode !== 200) {
            console.error(`Forge healthcheck failed with HTTP ${res.statusCode}`);
            process.exit(1);
        }

        try {
            const payload = JSON.parse(body);

            if (!payload.ok) {
                console.error("Forge healthcheck payload is not ok.");
                process.exit(1);
            }

            process.exit(0);
        } catch (error) {
            console.error("Forge healthcheck returned invalid JSON.", error.message);
            process.exit(1);
        }
    });
});

req.on("timeout", () => {
    req.destroy(new Error("Healthcheck timeout"));
});

req.on("error", (error) => {
    console.error("Forge healthcheck failed:", error.message);
    process.exit(1);
});

req.end();
