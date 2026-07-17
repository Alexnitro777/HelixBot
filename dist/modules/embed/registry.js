import fs from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
const currentFile = fileURLToPath(import.meta.url);
const currentDir = dirname(currentFile);
const embedsDir = join(currentDir, "embeds");
const skipFiles = new Set(["types", "registry"]);
export async function loadEmbeds() {
    const registry = new Map();
    const files = await fs.readdir(embedsDir);
    const filteredFiles = files.filter((file) => {
        const base = file.replace(/\.(ts|js)$/, "");
        return /\.(ts|js)$/.test(file) && !file.endsWith(".d.ts") && !skipFiles.has(base);
    });
    for (const file of filteredFiles) {
        const filePath = join(embedsDir, file);
        const fileUrl = pathToFileURL(filePath).href;
        const mod = await import(fileUrl);
        const candidates = new Set([mod.default, ...Object.values(mod)]);
        for (const candidate of candidates) {
            if (isEmbedDefinition(candidate)) {
                if (registry.has(candidate.name)) {
                    throw new Error(`Дублирующееся имя embed-а: "${candidate.name}" (файл ${file})`);
                }
                registry.set(candidate.name, candidate);
            }
        }
    }
    return registry;
}
function isEmbedDefinition(value) {
    return (typeof value === "object" &&
        value !== null &&
        typeof value.name === "string" &&
        typeof value.build === "function");
}
