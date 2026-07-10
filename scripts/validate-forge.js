const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");

function fail(message) {
    console.error(`Forge validation failed: ${message}`);
    process.exit(1);
}

function read(relativePath) {
    return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function assertExists(relativePath) {
    if (!fs.existsSync(path.join(root, relativePath))) {
        fail(`${relativePath} est introuvable.`);
    }
}

[
    "server.js",
    "server/app.js",
    "server/config.js",
    "server/database.js",
    "server/routes.js",
    "server/runtime.js",
    "server/security.js",
    "server/storage-validation.js",
    "package.json",
    "public/script.js",
    "public/style.css",
    "public/vm-sizing.html",
    "public/vm-sizing.js",
    "scripts/healthcheck.js",
    "scripts/check-server-modules.js",
    "scripts/code-review.js"
].forEach(assertExists);

const packageJson = JSON.parse(read("package.json"));

if (packageJson.version !== "0.1.3") {
    fail(`package.json doit être en 0.1.3, trouvé : ${packageJson.version}.`);
}

const script = read("public/script.js");
const serverEntry = read("server.js");
const serverSecurity = read("server/security.js");
const dockerfile = fs.existsSync(path.join(root, "Dockerfile")) ? read("Dockerfile") : "";

const bootstrapMatches = script.match(/forgeBootstrap\(\);/g) || [];

if (bootstrapMatches.length !== 1) {
    fail(`script.js doit contenir exactement un appel forgeBootstrap();, trouvé : ${bootstrapMatches.length}.`);
}

for (const forbidden of ["start-forge.bat", "stop-forge.bat"]) {
    if (fs.existsSync(path.join(root, forbidden))) {
        fail(`${forbidden} ne doit pas être livré dans cette archive.`);
    }
}

if (fs.existsSync(path.join(root, "data"))) {
    fail("Le dossier data ne doit pas être livré dans cette archive.");
}

if (!serverEntry.includes("./server/app") || !serverEntry.includes("./server/config")) {
    fail("server.js doit rester un point d’entrée fin vers les modules server/.");
}

if (!serverSecurity.includes("Content-Security-Policy")) {
    fail("server/security.js doit appliquer une Content Security Policy.");
}

if (!serverSecurity.includes("X-Content-Type-Options")) {
    fail("server/security.js doit appliquer les en-têtes de sécurité principaux.");
}

if (dockerfile && !dockerfile.includes("COPY server ./server")) {
    fail("Dockerfile doit copier le dossier server/.");
}

console.log("Forge validation OK.");
