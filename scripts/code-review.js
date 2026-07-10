const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const publicScriptPath = path.join(root, "public", "script.js");
const serverDir = path.join(root, "server");

function listJsFiles(dir) {
    if (!fs.existsSync(dir)) return [];

    return fs.readdirSync(dir)
        .filter((file) => file.endsWith(".js"))
        .map((file) => path.join(dir, file));
}

function countMatches(text, regex) {
    return (text.match(regex) || []).length;
}

function getFunctionNames(text) {
    const matches = [...text.matchAll(/\nfunction\s+([A-Za-z0-9_]+)\s*\(/g)];
    return matches.map((match) => match[1]);
}

const script = fs.readFileSync(publicScriptPath, "utf8");
const serverFiles = listJsFiles(serverDir);
const functionNames = getFunctionNames(script);
const duplicatedFunctions = [...new Set(functionNames.filter((name, index) => functionNames.indexOf(name) !== index))];

const review = {
    version: "0.1.2",
    publicScript: {
        chars: script.length,
        functionCount: functionNames.length,
        bootstrapCalls: countMatches(script, /forgeBootstrap\(\);/g),
        duplicatedFunctionNames: duplicatedFunctions.slice(0, 50),
        duplicatedFunctionNameCount: duplicatedFunctions.length
    },
    server: {
        moduleCount: serverFiles.length,
        modules: serverFiles.map((file) => path.relative(root, file))
    },
    observations: []
};

if (script.length > 400000) {
    review.observations.push("public/script.js reste volontairement conservé en gros fichier pour éviter une régression front-end. La prochaine vraie étape serait une modularisation frontend progressive.");
}

if (duplicatedFunctions.length > 0) {
    review.observations.push("Des noms de fonctions dupliqués existent encore dans public/script.js à cause de l’historique par overrides. La 0.1.2 limite le risque en validant qu’un seul bootstrap final est exécuté.");
}

if (review.publicScript.bootstrapCalls !== 1) {
    console.error("Forge code review failed: bootstrap count invalide.");
    process.exit(1);
}

console.log("Forge code review OK.");
console.log(JSON.stringify(review, null, 2));
