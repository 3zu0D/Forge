/* Lanceur de tests maison (pas de framework de test) : démarre le serveur Forge sur
   un port et un dossier de données isolés (jamais data/forge.db, jamais le port 3000
   utilisé par `npm start`), pilote Microsoft Edge via Playwright (déjà installé sur la
   machine, pas de téléchargement de Chromium), exécute chaque tests/*.test.js dans un
   contexte propre, puis coupe tout.

   Chaque fichier de test exporte une fonction async ({ page, baseUrl, assert }) => {}
   qui lève en cas d'échec (assert.strict de Node, ou une simple exception). */

const path = require("path");
const fs = require("fs");
const os = require("os");
const assert = require("assert").strict;
const { spawn } = require("child_process");

const ROOT_DIR = path.resolve(__dirname, "..");
const TESTS_DIR = path.join(ROOT_DIR, "tests");
const PORT = process.env.TEST_PORT || 3100;
const BASE_URL = `http://localhost:${PORT}`;
const DATA_DIR = path.join(os.tmpdir(), "forge-test-data");

function log(message) {
    console.log(message);
}

async function waitForHealth(timeoutMs) {
    const deadline = Date.now() + timeoutMs;

    while (Date.now() < deadline) {
        try {
            const res = await fetch(`${BASE_URL}/api/health`);
            if (res.ok) return;
        } catch (error) {
            // le serveur n'écoute pas encore, on retente
        }

        await new Promise((resolve) => setTimeout(resolve, 300));
    }

    throw new Error(`Le serveur de test n'a pas répondu sur ${BASE_URL}/api/health après ${timeoutMs}ms`);
}

async function resetStorage() {
    const res = await fetch(`${BASE_URL}/api/storage`, { method: "DELETE" });
    if (!res.ok) throw new Error(`Échec du reset du storage : HTTP ${res.status}`);
}

function startServer() {
    const serverProcess = spawn(process.execPath, ["server.js"], {
        cwd: ROOT_DIR,
        env: { ...process.env, PORT: String(PORT), FORGE_DATA_DIR: DATA_DIR },
        stdio: ["ignore", "pipe", "pipe"]
    });

    let output = "";
    serverProcess.stdout.on("data", (chunk) => (output += chunk.toString()));
    serverProcess.stderr.on("data", (chunk) => (output += chunk.toString()));

    serverProcess.on("exit", (code) => {
        if (code !== null && code !== 0 && !serverProcess.__expectedExit) {
            console.error(`Le serveur de test s'est arrêté prématurément (code ${code}).\n${output}`);
        }
    });

    return serverProcess;
}

async function main() {
    await removeDataDirWithRetry();
    fs.mkdirSync(DATA_DIR, { recursive: true });

    let playwright;
    try {
        playwright = require("playwright");
    } catch (error) {
        console.error('Playwright manquant. Installe-le avec : npm install --save-dev playwright');
        process.exit(1);
    }

    const serverProcess = startServer();
    await waitForHealth(15000);

    const channel = process.env.TEST_BROWSER_CHANNEL || "msedge";
    const browser = await playwright.chromium.launch({ channel, headless: true });

    const testFiles = fs
        .readdirSync(TESTS_DIR)
        .filter((file) => file.endsWith(".test.js"))
        .sort();

    let passed = 0;
    let failed = 0;

    for (const file of testFiles) {
        await resetStorage();

        const context = await browser.newContext({ viewport: { width: 1440, height: 950 } });
        const page = await context.newPage();
        const consoleErrors = [];

        page.on("console", (message) => {
            if (message.type() === "error") consoleErrors.push(message.text());
        });
        page.on("pageerror", (error) => consoleErrors.push(error.message));

        const testFn = require(path.join(TESTS_DIR, file));

        try {
            await testFn({ page, baseUrl: BASE_URL, assert });

            if (consoleErrors.length > 0) {
                throw new Error(`Erreurs console pendant le test :\n  ${consoleErrors.join("\n  ")}`);
            }

            log(`PASS  ${file}`);
            passed++;
        } catch (error) {
            log(`FAIL  ${file}`);
            log(`      ${error.message}`);
            failed++;
        } finally {
            await context.close();
        }
    }

    await browser.close();

    serverProcess.__expectedExit = true;
    await stopServer(serverProcess);

    // Sur Windows, .kill() ne délivre pas SIGTERM proprement : le process est tué
    // sans laisser SQLite relâcher son verrou sur le fichier tout de suite. On
    // retente la suppression du dossier temporaire quelques fois avant d'abandonner
    // (best-effort : un dossier de test qui traîne dans le tmp de l'OS est inoffensif).
    await removeDataDirWithRetry();

    log(`\n${passed} test(s) réussi(s), ${failed} échoué(s).`);
    process.exit(failed > 0 ? 1 : 0);
}

function stopServer(serverProcess) {
    return new Promise((resolve) => {
        if (serverProcess.exitCode !== null || serverProcess.signalCode !== null) {
            resolve();
            return;
        }

        serverProcess.once("exit", () => resolve());
        serverProcess.kill();
        setTimeout(resolve, 2000).unref();
    });
}

async function removeDataDirWithRetry() {
    for (let attempt = 0; attempt < 5; attempt++) {
        try {
            fs.rmSync(DATA_DIR, { recursive: true, force: true });
            return;
        } catch (error) {
            await new Promise((resolve) => setTimeout(resolve, 300));
        }
    }

    log(`(nettoyage du dossier de test ${DATA_DIR} non garanti, sans impact sur le résultat des tests)`);
}

main().catch((error) => {
    console.error("Échec du lanceur de tests :", error);
    process.exit(1);
});
