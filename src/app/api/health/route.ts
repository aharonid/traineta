import { NextResponse } from 'next/server';
import { getLastMetrics } from '@/lib/transit/metrics';
import { enforceAdminAccess } from '@/lib/transit/access';

export async function GET(request: Request) {
	const denied = enforceAdminAccess(request);
	if (denied) return denied;
	const feedConfigured = Boolean(process.env.MTA_GTFS_RT_URLS);
	const metrics = getLastMetrics();
	const ok = feedConfigured;

	return NextResponse.json(
		{
			ok,
			timestamp: new Date().toISOString(),
			feedConfigured,
			hasMetrics: Boolean(metrics),
			metrics,
		},
		{ status: ok ? 200 : 503 }
	);
}
