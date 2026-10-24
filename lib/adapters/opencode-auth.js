import { readFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
/** OpenCode's Go-specific local credential; never fall back to the Zen key. */
export async function readOpenCodeGoKey() {
    const dataHome = process.env.XDG_DATA_HOME || path.join(os.homedir(), '.local', 'share');
    try {
        const auth = JSON.parse(await readFile(path.join(dataHome, 'opencode', 'auth.json'), 'utf8'));
        const go = auth?.['opencode-go'];
        return go?.type === 'api' && typeof go.key === 'string' && go.key.trim() ? go.key : undefined;
    }
    catch {
        return undefined;
    }
}
