/** OpenCode's Go-specific local credential; never fall back to the Zen key. */
export declare function readOpenCodeGoKey(): Promise<string | undefined>;
