import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { once } from 'node:events';
import { apply, Config, rpcMethod, rpcRoutePath, RPC_ENDPOINTS } from '../lib/index.js';
import { parseChatGPTUsage, parseOpenCodeUsage } from '../lib/adapters/subscription.js';
import { readOpenCodeGoKey } from '../lib/adapters/opencode-auth.js';

const fixture = await mkdtemp(path.join(os.tmpdir(), 'quota-center-'));
process.env.CODEX_HOME = path.join(fixture, 'codex');
process.env.XDG_DATA_HOME = path.join(fixture, 'data');
await mkdir(process.env.CODEX_HOME, { recursive: true });
const authPath = path.join(process.env.CODEX_HOME, 'auth.json');
const patch = await readFile(new URL('../cordis.patch.yml', import.meta.url), 'utf8');
const providers = [
	{ id: 'chatgpt', label: 'ChatGPT', format: 'chatgpt-subscription', endpoint: 'https://chatgpt.com/backend-api/wham/usage' },
	{ id: 'deepseek', label: 'DeepSeek', format: 'deepseek-balance', credential: 'DEEPSEEK_API_KEY', endpoint: 'https://api.deepseek.com/user/balance' },
	{ id: 'opencode-go', label: 'OpenCode Go', format: 'opencode-usage', credential: 'OPENCODE_GO_API_KEY', endpoint: 'https://opencode.ai/zen/go/v1/usage' }
];
function mount(rows = providers, credentials = {}) {
	const routes = [];
	apply({ connection: { fetch: { register: (r) => routes.push(r) } }, credentials: { resolve: async (ref) => credentials[ref] ? { value: credentials[ref] } : undefined } }, { auto: false, providers: rows });
	return async (endpoint, payload = {}) => {
		const response = await routes.find((r) => r.path === rpcRoutePath(endpoint)).fetch(new Request('http://localhost' + rpcRoutePath(endpoint), {
			method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ type: 'client-request', rpcId: 'test', method: rpcMethod(endpoint), payload })
		}));
		return (await response.json()).result;
	};
}

test('default bundle has three explicit rows, independent of current model and credentials', async () => {
	assert.equal((patch.match(/\n          - id:/g) || []).length, 3);
	assert.ok(patch.includes('auto: false'));
	Config({ auto: false, providers });
	const rpc = mount();
	assert.deepEqual((await rpc('specs')).value.rows.map((r) => r.id), providers.map((r) => r.id));
	const result = await rpc('fetch-all');
	assert.equal(result.value.rows.length, 3);
	assert.ok(result.value.rows.every((r) => r.error && !r.view));
	assert.deepEqual([...RPC_ENDPOINTS], ['specs', 'fetch-all']);
});

test('unknown ChatGPT windows keep actual durations and never fabricate 5h/weekly', () => {
	const view = parseChatGPTUsage({ plan_type: 'plus', rate_limit: { primary_window: { used_percent: 8.5, limit_window_seconds: 86400 }, secondary_window: { used_percent: 10 } } });
	assert.equal(view.windows.primary_window.label, '1 天');
	assert.equal(view.windows.primary_window.percent, 8.5);
	assert.ok(view.windows.secondary_window.label.includes('未知'));
	assert.equal(view.windows.rolling, undefined);
	assert.equal(parseChatGPTUsage({ rate_limit: { primary_window: { used_percent: null } } }), null);
	assert.equal(parseOpenCodeUsage({ usage: Object.fromEntries(['rolling', 'weekly', 'monthly'].map((k) => [k, { percent: 25 }])) }).windows.monthly.percent, 25);
	assert.throws(() => parseOpenCodeUsage({ usage: { rolling: { percent: null } } }));
});

test('Codex 401/403/429 never refreshes, logs in, writes credentials, or exposes upstream errors', async () => {
	const original = JSON.stringify({ tokens: { access_token: 'test-access-secret', refresh_token: 'test-refresh-secret' } });
	await writeFile(authPath, original);
	const realFetch = globalThis.fetch;
	try {
		for (const status of [401, 403, 429]) {
			const calls = [];
			globalThis.fetch = async (url) => { calls.push(String(url)); return { status, ok: false, json: async () => ({ detail: 'test-access-secret' }) }; };
			const result = await mount([providers[0]])('fetch-all');
			assert.equal(calls.length, 1);
			assert.ok(calls[0].endsWith('/wham/usage'));
			assert.ok(result.value.rows[0].error.includes(String(status)));
			assert.ok(!JSON.stringify(result).includes('test-access-secret'));
			assert.equal(await readFile(authPath, 'utf8'), original);
		}
	} finally { globalThis.fetch = realFetch; }
});

test('expired Codex credentials cause no network activity', async () => {
	await writeFile(authPath, JSON.stringify({ tokens: { access_token: 'expired', expires_at: 1 } }));
	const realFetch = globalThis.fetch;
	let calls = 0;
	globalThis.fetch = async () => { calls++; throw new Error('unexpected'); };
	try {
		const result = await mount([providers[0]])('fetch-all');
		assert.equal(calls, 0);
		assert.match(result.value.rows[0].error, /重新登录/);
	} finally { globalThis.fetch = realFetch; }
});

test('DeepSeek selects CNY; per-provider failures and hidden providers are isolated', async () => {
	const realFetch = globalThis.fetch;
	let calls = 0;
	globalThis.fetch = async () => { calls++; return { status: 200, ok: true, json: async () => ({ balance_infos: [{ currency: 'USD', total_balance: '99' }, { currency: 'CNY', total_balance: '7.5', topped_up_balance: '5', granted_balance: '2.5' }] }) }; };
	try {
		const rpc = mount(providers, { DEEPSEEK_API_KEY: 'private-key' });
		const result = await rpc('fetch-all', { hidden: ['opencode-go'] });
		assert.equal(result.value.rows.length, 2);
		assert.equal(calls, 1);
		assert.equal(result.value.rows.find((r) => r.id === 'deepseek').view.amount, 7.5);
		assert.ok(!JSON.stringify(result).includes('private-key'));
		for (const status of [401, 403, 429]) {
			globalThis.fetch = async () => ({ status, ok: false, json: async () => ({}) });
			assert.match((await rpc('fetch-all', { hidden: ['chatgpt', 'opencode-go'] })).value.rows[0].error, new RegExp(String(status)));
		}
		globalThis.fetch = async () => { throw new DOMException('timeout', 'TimeoutError'); };
		assert.match((await rpc('fetch-all', { hidden: ['chatgpt', 'opencode-go'] })).value.rows[0].error, /timeout/);
	} finally { globalThis.fetch = realFetch; }
});

test('OpenCode credential discovery uses Go only, never Zen; malformed auth is safe', async () => {
	const dir = path.join(process.env.XDG_DATA_HOME, 'opencode');
	await mkdir(dir, { recursive: true });
	const file = path.join(dir, 'auth.json');
	await writeFile(file, JSON.stringify({ opencode: { type: 'api', key: 'zen-secret' } }));
	assert.equal(await readOpenCodeGoKey(), undefined);
	await writeFile(file, JSON.stringify({ 'opencode-go': { type: 'api', key: 'go-secret' } }));
	assert.equal(await readOpenCodeGoKey(), 'go-secret');
	await writeFile(file, '{');
	assert.equal(await readOpenCodeGoKey(), undefined);
});

test('HTTPS proxy CONNECT does not expose upstream Authorization or account headers', async () => {
	let headers;
	const proxy = http.createServer();
	proxy.on('connect', (req, socket) => { headers = req.headers; socket.end('HTTP/1.1 403 Forbidden\r\n\r\n'); });
	proxy.listen(0, '127.0.0.1');
	await once(proxy, 'listening');
	try {
		const result = await mount([providers[1]], { DEEPSEEK_API_KEY: 'top-secret' })('fetch-all', { proxy: { deepseek: `http://proxyuser:proxypass@127.0.0.1:${proxy.address().port}` } });
		assert.equal(headers.authorization, undefined);
		assert.equal(headers['chatgpt-account-id'], undefined);
		assert.ok(headers['proxy-authorization'].startsWith('Basic '));
		assert.match(result.value.rows[0].error, /403/);
	} finally { proxy.close(); }
});
