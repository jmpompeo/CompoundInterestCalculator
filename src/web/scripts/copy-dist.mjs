import { cp, mkdir, rm, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const distDir = resolve(here, '../dist');
const apiStaticDir = resolve(here, '../../api/CompoundInterestCalculator.Api/wwwroot');

try {
  await stat(distDir);
} catch {
  console.error('Build output not found at %s. Did you run "pnpm build"?', distDir);
  process.exit(1);
}

await rm(apiStaticDir, { recursive: true, force: true });
await mkdir(apiStaticDir, { recursive: true });
await cp(distDir, apiStaticDir, { recursive: true });

console.log('Copied frontend assets to %s', apiStaticDir);
