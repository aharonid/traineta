import { NextResponse } from 'next/server';
import { getLastMetrics } from '@/lib/transit/metrics';
import { enforceAdminAccess } from '@/lib/transit/access';

export async function GET(request: Request) {
	const denied = enforceAdminAccess(request);
	if (denied) return denied;
	const metrics = getLastMetrics();
	if (!metrics) {
		return NextResponse.json({ ok: false, error: 'No metrics yet' }, { status: 404 });
	}
	return NextResponse.json({ ok: true, metrics }, { status: 200 });
}
