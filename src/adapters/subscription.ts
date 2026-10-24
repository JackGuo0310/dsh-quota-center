/** Unstable provider responses are normalized here; never infer plan windows. */
export function parseChatGPTUsage(body: any) {
	const limits = body?.rate_limit;
	if (!limits || typeof limits !== 'object') return null;
	const windows: Record<string, any> = {};
	for (const [position, raw] of Object.entries(limits) as [string, any][]) {
		if (!position.endsWith('_window') || !raw || raw.used_percent == null) continue;
		const percent = Number(raw.used_percent);
		if (!Number.isFinite(percent)) continue;
		const seconds = Number(raw.limit_window_seconds);
		const lane = seconds === 18000 ? 'rolling' : seconds === 604800 ? 'weekly' : position;
		const label = Number.isFinite(seconds) && seconds > 0
			? seconds % 86400 === 0 ? `${seconds / 86400} 天` : seconds % 3600 === 0 ? `${seconds / 3600} 小时` : `${seconds / 60} 分钟`
			: position === 'primary_window' ? '主窗口（时长未知）' : '次窗口（时长未知）';
		const reset = Number(raw.reset_at);
		const resetMs = reset > 1e12 ? reset : reset * 1000;
		windows[windows[lane] ? position : lane] = {
			percent: Math.min(100, Math.max(0, percent)), label,
			durationSeconds: Number.isFinite(seconds) && seconds > 0 ? seconds : undefined,
			resetsAt: Number.isFinite(resetMs) && resetMs > 0 && resetMs < 8.64e15 ? new Date(resetMs).toISOString() : undefined
		};
	}
	if (!Object.keys(windows).length) return null;
	return { kind: 'usage' as const, windows, title: `ChatGPT 订阅 · ${typeof body.plan_type === 'string' ? body.plan_type : '套餐未知'}（非 OpenAI API 余额）` };
}

export function parseOpenCodeUsage(body: any) {
	const windows: Record<string, any> = {};
	for (const key of ['rolling', 'weekly', 'monthly']) {
		const raw = body?.usage?.[key];
		const percent = raw?.percent == null ? NaN : Number(raw.percent);
		if (!Number.isFinite(percent)) throw new Error(`missing usage.${key}.percent`);
		windows[key] = { percent: Math.min(100, Math.max(0, percent)), resetsAt: raw.resetsAt };
	}
	return { kind: 'usage' as const, windows };
}
