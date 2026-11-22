import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

// Charge .env.server.local (clé secrète) s'il existe — fichier non chargé par Next par défaut.
const serverEnvPath = resolve(process.cwd(), '.env.server.local');
if (existsSync(serverEnvPath)) {
  for (const line of readFileSync(serverEnvPath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (key && process.env[key] === undefined) process.env[key] = val;
  }
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {},
};

export default nextConfig;