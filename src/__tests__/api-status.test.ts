/// <reference types="vitest" />

import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { GET } from '@/app/api/status/route';

describe('GET /api/status', () => {
	const originalEnv = process.env;

	beforeEach(() => {
		vi.resetModules();
		process.env = { ...originalEnv };
	});

	afterEach(() => {
		process.env = originalEnv;
	});

	it('returns JSON response', async () => {
		process.env.MTA_GTFS_RT_URLS = 'https://example.com/feed';
		const response = await GET();
		const data = await response.json();

		expect(data).toHaveProperty('ok');
		expect(data).toHaveProperty('timestamp');
		expect(data).toHaveProperty('feedConfigured');
		expect(data).toHaveProperty('hasMetrics');
	});

	it('returns ok: true when feed is configured', async () => {
		process.env.MTA_GTFS_RT_URLS = 'https://example.com/feed';
		const response = await GET();
		const data = await response.json();

		expect(data.ok).toBe(true);
		expect(data.feedConfigured).toBe(true);
		expect(response.status).toBe(200);
	});

	it('returns ok: false when feed is not configured', async () => {
		delete process.env.MTA_GTFS_RT_URLS;
		const response = await GET();
		const data = await response.json();

		expect(data.ok).toBe(false);
		expect(data.feedConfigured).toBe(false);
		expect(response.status).toBe(503);
	});

	it('includes valid ISO timestamp', async () => {
		process.env.MTA_GTFS_RT_URLS = 'https://example.com/feed';
		const response = await GET();
		const data = await response.json();

		const timestamp = new Date(data.timestamp);
		expect(timestamp.toISOString()).toBe(data.timestamp);
	});

	it('includes metrics field (null when no data)', async () => {
		process.env.MTA_GTFS_RT_URLS = 'https://example.com/feed';
		const response = await GET();
		const data = await response.json();

		expect(data).toHaveProperty('metrics');
		// metrics will be null if no feed has been fetched yet
		expect(data.hasMetrics).toBe(false);
	});
});
