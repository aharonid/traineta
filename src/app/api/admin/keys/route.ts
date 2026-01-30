import { NextResponse } from 'next/server';
import { enforceAdminAccess } from '@/lib/transit/access';
import { getAllApiKeys, createApiKey, deleteApiKey } from '@/lib/transit/api-keys';

export async function GET(request: Request) {
	const denied = enforceAdminAccess(request);
	if (denied) return denied;

	const keys = getAllApiKeys();
	// Don't expose full keys in list, just prefix
	const safeKeys = keys.map((k) => ({
		...k,
		key: `${k.key.slice(0, 10)}...`,
		fullKey: k.key,
	}));

	return NextResponse.json({ ok: true, keys: safeKeys });
}

export async function POST(request: Request) {
	const denied = enforceAdminAccess(request);
	if (denied) return denied;

	try {
		const body = await request.json();
		const name = body.name?.trim();

		if (!name || name.length < 1) {
			return NextResponse.json({ ok: false, error: 'Name is required' }, { status: 400 });
		}

		const newKey = createApiKey(name);
		return NextResponse.json({ ok: true, key: newKey });
	} catch {
		return NextResponse.json({ ok: false, error: 'Invalid request body' }, { status: 400 });
	}
}

export async function DELETE(request: Request) {
	const denied = enforceAdminAccess(request);
	if (denied) return denied;

	try {
		const body = await request.json();
		const key = body.key?.trim();

		if (!key) {
			return NextResponse.json({ ok: false, error: 'Key is required' }, { status: 400 });
		}

		const deleted = deleteApiKey(key);
		if (!deleted) {
			return NextResponse.json({ ok: false, error: 'Key not found' }, { status: 404 });
		}

		return NextResponse.json({ ok: true });
	} catch {
		return NextResponse.json({ ok: false, error: 'Invalid request body' }, { status: 400 });
	}
}
