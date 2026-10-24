/**
 * Build: compile src/*.ts into lib/ (tsc, declarations included), then
 * copy the vendored runtime files (schemastery.mjs + cosmokit.js) into
 * lib/vendor/ so the compiled lib/index.js relative import resolves.
 * Declaration files stay in src/ — they are for type-checking only.
 */
import { cpSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

execSync('tsc -p tsconfig.json', { stdio: 'inherit' });
// Embed the installed package version into its browser artifact; no runtime
// Git checkout or package.json request is required by the DSH module loader.
const { version } = JSON.parse(readFileSync('package.json', 'utf8'));
const client = readFileSync('lib/client.js', 'utf8');
if (!client.includes('__DSH_QUOTA_VERSION__')) throw new Error('client version marker missing');
writeFileSync('lib/client.js', client.replace('"__DSH_QUOTA_VERSION__"', JSON.stringify(`v${version}`)));
mkdirSync('lib/vendor', { recursive: true });
for (const file of readdirSync('src/vendor')) {
	if (file.endsWith('.d.mts') || file.endsWith('.d.ts')) continue;
	cpSync(`src/vendor/${file}`, `lib/vendor/${file}`);
}
console.log('build: tsc ok, lib/vendor populated');