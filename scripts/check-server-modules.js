const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const root = path.resolve(__dirname, "..");
const moduleDir = path.join(root, "server");

if (!fs.existsSync(moduleDir)) {
    console.error("Forge check failed: dossier server/ introuvable.");
    process.exit(1);
}

const files = fs.readdirSync(moduleDir)
    .filter((file) => file.endsWith(".js"))
    .map((file) => path.join(moduleDir, file));

const allFiles = [
    path.join(root, "server.js"),
    ...files
];

for (const file of allFiles) {
    const result = spawnSync(process.execPath, ["--check", file], {
        encoding: "utf8"
    });

    if (result.status !== 0) {
        console.error(result.stdout);
        console.error(result.stderr);
        process.exit(result.status || 1);
    }
}

console.log(`Forge server modules OK (${allFiles.length} fichiers).`);
