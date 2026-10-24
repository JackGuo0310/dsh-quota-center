/** Unstable provider responses are normalized here; never infer plan windows. */
export declare function parseChatGPTUsage(body: any): {
    kind: "usage";
    windows: Record<string, any>;
    title: string;
};
export declare function parseOpenCodeUsage(body: any): {
    kind: "usage";
    windows: Record<string, any>;
};
