import { NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { getAllValidKeys, recordKeyUsage } from './api-keys';

const RATE_WINDOW_MS = Number(process.env.TRANSIT_RATE_WINDOW_MS || 60_000);
const PUBLIC_RPM = Number(process.env.TRANSIT_PUBLIC_RPM || 60);
const KEY_RPM = Number(process.env.TRANSIT_KEY_RPM || 600);
const ADMIN_RPM = Number(process.env.ADMIN_RATE_LIMIT || 10);
const REQUIRE_KEY = process.env.TRANSIT_REQUIRE_API_KEY === 'true';
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

type RateBucket = { count: number; resetAt: number };
const rateMap = new Map<string, RateBucket>();

const cleanupExpiredEntries = () => {
	const now = Date.now();
	for (const [id, bucket] of rateMap) {
		if (now > bucket.resetAt) {
			rateMap.delete(id);
		}
	}
};
setInterval(cleanupExpiredEntries, CLEANUP_INTERVAL_MS);

const safeCompare = (a: string, b: string): boolean => {
	if (a.length !== b.length) return false;
	try {
		return timingSafeEqual(Buffer.from(a), Buffer.from(b));
	} catch {
		return false;
	}
};

const getClientKey = (request: Request) => {
	const headerKey = request.headers.get('x-client-key');
	if (headerKey) return headerKey.trim();
	const auth = request.headers.get('authorization');
	if (auth?.toLowerCase().startsWith('bearer ')) {
		return auth.slice(7).trim();
	}
	const url = new URL(request.url);
	const queryKey = url.searchParams.get('key');
	return queryKey ? queryKey.trim() : null;
};

const getIp = (request: Request) => {
	const forwarded = request.headers.get('x-forwarded-for');
	if (forwarded) return forwarded.split(',')[0].trim();
	const realIp = request.headers.get('x-real-ip');
	if (realIp) return realIp.trim();
	return 'unknown';
};

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

export const enforceTransitAccess = (request: Request) => {
	const key = getClientKey(request);
	const validKeys = getAllValidKeys();
	const hasKeysConfigured = validKeys.size > 0;
	const validKey = key ? validKeys.has(key) : false;

	if (hasKeysConfigured && key && !validKey) {
		return NextResponse.json({ ok: false, error: 'Invalid API key' }, { status: 401 });
	}
	if (hasKeysConfigured && REQUIRE_KEY && !validKey) {
		return NextResponse.json({ ok: false, error: 'Missing API key' }, { status: 401 });
	}

	// Record usage for valid dynamic keys
	if (validKey && key) {
		recordKeyUsage(key);
	}

	const identifier = validKey ? `key:${key}` : `ip:${getIp(request)}`;
	const path = new URL(request.url).pathname;
	const limit = validKey ? KEY_RPM : PUBLIC_RPM;
	const result = checkRateLimit(`${path}:${identifier}`, limit);

	if (!result.ok) {
		const retryAfter = Math.max(1, Math.ceil((result.resetAt - Date.now()) / 1000));
		const response = NextResponse.json(
			{ ok: false, error: 'Rate limit exceeded', retryAfterSeconds: retryAfter },
			{ status: 429 }
		);
		response.headers.set('Retry-After', retryAfter.toString());
		return response;
	}

	return null;
};

export const enforceAdminAccess = (request: Request) => {
	const ip = getIp(request);

	const rateResult = checkRateLimit(`admin:${ip}`, ADMIN_RPM);
	if (!rateResult.ok) {
		const retryAfter = Math.max(1, Math.ceil((rateResult.resetAt - Date.now()) / 1000));
		const response = NextResponse.json(
			{ ok: false, error: 'Too many auth attempts', retryAfterSeconds: retryAfter },
			{ status: 429 }
		);
		response.headers.set('Retry-After', retryAfter.toString());
		return response;
	}

	const token = process.env.ADMIN_API_TOKEN;
	if (!token) return null;

	const headerToken = request.headers.get('x-admin-token');
	const auth = request.headers.get('authorization');
	const bearer = auth?.toLowerCase().startsWith('bearer ') ? auth.slice(7).trim() : null;
	const url = new URL(request.url);
	const queryToken = url.searchParams.get('token');
	const supplied = headerToken || bearer || queryToken;

	if (!supplied || !safeCompare(supplied, token)) {
		return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
	}

	return null;
};
