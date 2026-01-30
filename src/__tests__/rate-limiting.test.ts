/// <reference types="vitest" />

import { describe, expect, it, beforeEach, vi } from 'vitest';

// Test rate limiting logic in isolation
describe('Rate Limiting Logic', () => {
	// Simulated rate limiter (mirrors access.ts logic)
	type RateBucket = { count: number; resetAt: number };
	let rateMap: Map<string, RateBucket>;
	const RATE_WINDOW_MS = 60_000;

	const checkRateLimit = (id: string, limit: number) => {
		const now = Date.now();
		const current = rateMap.get(id);
		if (!current || now > current.resetAt) {
			const bucket = { count: 1, resetAt: now + RATE_WINDOW_MS };
			rateMap.set(id, bucket);
			return { ok: true, remaining: limit - 1, resetAt: bucket.resetAt };
		}
		if (current.count >= limit) {
			return { ok: false, remaining: 0, resetAt: current.resetAt };
		}
		current.count += 1;
		return { ok: true, remaining: Math.max(0, limit - current.count), resetAt: current.resetAt };
	};

	beforeEach(() => {
		rateMap = new Map();
	});

	describe('checkRateLimit', () => {
		it('allows first request', () => {
			const result = checkRateLimit('user:123', 60);
			expect(result.ok).toBe(true);
			expect(result.remaining).toBe(59);
		});

		it('decrements remaining count', () => {
			checkRateLimit('user:123', 60);
			const result = checkRateLimit('user:123', 60);
			expect(result.ok).toBe(true);
			expect(result.remaining).toBe(58);
		});

		it('blocks when limit reached', () => {
			const limit = 3;
			for (let i = 0; i < limit; i++) {
				checkRateLimit('user:456', limit);
			}
			const result = checkRateLimit('user:456', limit);
			expect(result.ok).toBe(false);
			expect(result.remaining).toBe(0);
		});

		it('tracks different users separately', () => {
			for (let i = 0; i < 5; i++) {
				checkRateLimit('user:A', 5);
			}
			// User A is blocked
			expect(checkRateLimit('user:A', 5).ok).toBe(false);
			// User B is not
			expect(checkRateLimit('user:B', 5).ok).toBe(true);
		});

		it('resets after window expires', () => {
			const result1 = checkRateLimit('user:789', 2);
			checkRateLimit('user:789', 2);

			// Manually expire the bucket
			const bucket = rateMap.get('user:789');
			if (bucket) {
				bucket.resetAt = Date.now() - 1000; // Set to past
			}

			// Should reset and allow
			const result2 = checkRateLimit('user:789', 2);
			expect(result2.ok).toBe(true);
			expect(result2.remaining).toBe(1);
		});

		it('returns correct resetAt timestamp', () => {
			const before = Date.now();
			const result = checkRateLimit('user:time', 10);
			const after = Date.now();

			expect(result.resetAt).toBeGreaterThanOrEqual(before + RATE_WINDOW_MS);
			expect(result.resetAt).toBeLessThanOrEqual(after + RATE_WINDOW_MS + 10);
		});
	});

	describe('Rate limit tiers', () => {
		it('public tier allows 60 requests', () => {
			const PUBLIC_LIMIT = 60;
			for (let i = 0; i < PUBLIC_LIMIT; i++) {
				const result = checkRateLimit('ip:192.168.1.1', PUBLIC_LIMIT);
				expect(result.ok).toBe(true);
			}
			expect(checkRateLimit('ip:192.168.1.1', PUBLIC_LIMIT).ok).toBe(false);
		});

		it('API key tier allows 600 requests', () => {
			const KEY_LIMIT = 600;
			for (let i = 0; i < KEY_LIMIT; i++) {
				checkRateLimit('key:tk_abc123', KEY_LIMIT);
			}
			expect(checkRateLimit('key:tk_abc123', KEY_LIMIT).ok).toBe(false);
		});
	});

	describe('Cleanup logic', () => {
		it('removes expired entries', () => {
			// Add some entries
			checkRateLimit('user:1', 10);
			checkRateLimit('user:2', 10);
			checkRateLimit('user:3', 10);

			// Expire user:1 and user:2
			const bucket1 = rateMap.get('user:1');
			const bucket2 = rateMap.get('user:2');
			if (bucket1) bucket1.resetAt = Date.now() - 1000;
			if (bucket2) bucket2.resetAt = Date.now() - 1000;

			// Simulate cleanup
			const now = Date.now();
			for (const [id, bucket] of rateMap) {
				if (now > bucket.resetAt) {
					rateMap.delete(id);
				}
			}

			expect(rateMap.has('user:1')).toBe(false);
			expect(rateMap.has('user:2')).toBe(false);
			expect(rateMap.has('user:3')).toBe(true);
		});
	});
});

describe('IP extraction logic', () => {
	const getIp = (headers: Record<string, string | null>) => {
		const forwarded = headers['x-forwarded-for'];
		if (forwarded) return forwarded.split(',')[0].trim();
		const realIp = headers['x-real-ip'];
		if (realIp) return realIp.trim();
		return 'unknown';
	};

	it('extracts IP from x-forwarded-for', () => {
		const ip = getIp({ 'x-forwarded-for': '1.2.3.4, 5.6.7.8', 'x-real-ip': null });
		expect(ip).toBe('1.2.3.4');
	});

	it('extracts IP from x-real-ip', () => {
		const ip = getIp({ 'x-forwarded-for': null, 'x-real-ip': '10.0.0.1' });
		expect(ip).toBe('10.0.0.1');
	});

	it('returns unknown when no headers', () => {
		const ip = getIp({ 'x-forwarded-for': null, 'x-real-ip': null });
		expect(ip).toBe('unknown');
	});

	it('prefers x-forwarded-for over x-real-ip', () => {
		const ip = getIp({ 'x-forwarded-for': '1.1.1.1', 'x-real-ip': '2.2.2.2' });
		expect(ip).toBe('1.1.1.1');
	});
});

describe('API key extraction logic', () => {
	const getClientKey = (headers: Record<string, string | null>, queryKey: string | null) => {
		const headerKey = headers['x-client-key'];
		if (headerKey) return headerKey.trim();
		const auth = headers['authorization'];
		if (auth?.toLowerCase().startsWith('bearer ')) {
			return auth.slice(7).trim();
		}
		return queryKey ? queryKey.trim() : null;
	};

	it('extracts key from x-client-key header', () => {
		const key = getClientKey({ 'x-client-key': 'tk_abc123', 'authorization': null }, null);
		expect(key).toBe('tk_abc123');
	});

	it('extracts key from Bearer token', () => {
		const key = getClientKey({ 'x-client-key': null, 'authorization': 'Bearer tk_xyz789' }, null);
		expect(key).toBe('tk_xyz789');
	});

	it('extracts key from query parameter', () => {
		const key = getClientKey({ 'x-client-key': null, 'authorization': null }, 'tk_query123');
		expect(key).toBe('tk_query123');
	});

	it('prefers header over query', () => {
		const key = getClientKey({ 'x-client-key': 'tk_header', 'authorization': null }, 'tk_query');
		expect(key).toBe('tk_header');
	});

	it('prefers x-client-key over Bearer', () => {
		const key = getClientKey({ 'x-client-key': 'tk_header', 'authorization': 'Bearer tk_bearer' }, null);
		expect(key).toBe('tk_header');
	});

	it('returns null when no key provided', () => {
		const key = getClientKey({ 'x-client-key': null, 'authorization': null }, null);
		expect(key).toBeNull();
	});
});
