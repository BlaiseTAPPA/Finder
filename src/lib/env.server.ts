import fs from "node:fs";
import path from "node:path";

function isPlaceholder(value: string | undefined): boolean {
  if (!value) return true;
  if (/^0{8}-0{4}-0{4}-0{4}-0{12}$/i.test(value)) return true;
  if (/^0+$/.test(value)) return true;
  if (/^(placeholder|dummy|your_.*_here)$/i.test(value)) return true;
  return false;
}

export function loadEnvFile(): void {
  try {
    const envPath = path.resolve(process.cwd(), ".env");
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, "utf-8");
      for (const line of content.split("\n")) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const eqIdx = trimmed.indexOf("=");
        if (eqIdx > 0) {
          const key = trimmed.slice(0, eqIdx).trim();
          let val = trimmed.slice(eqIdx + 1).trim();
          if (
            (val.startsWith('"') && val.endsWith('"')) ||
            (val.startsWith("'") && val.endsWith("'"))
          ) {
            val = val.slice(1, -1);
          }
          if (val && (!process.env[key] || isPlaceholder(process.env[key]))) {
            process.env[key] = val;
          }
        }
      }
    }
  } catch (e) {
    console.warn("[Env] Failed to load .env file:", e);
  }
}

// Automatically load on import
loadEnvFile();
