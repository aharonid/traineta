import { NextResponse } from 'next/server';
import mtaStops from '@/lib/data/mta-stops.json';
import { setLastMetrics } from '@/lib/transit/metrics';
import { enforceTransitAccess } from '@/lib/transit/access';
import {
	type StopRecord,
	type ActiveStop,
	type CacheEntry,
	type FeedPayload,
	CACHE_TTL_MS,
	fetchWithRetry,
	processGtfsEntity,
} from '@/lib/transit/gtfs-utils';

const asStopMap = mtaStops as unknown as Record<string, StopRecord>;

let cached: CacheEntry | undefined;
let inFlight: Promise<{ payload: FeedPayload; status: number }> | null = null;

export async function GET(request: Request) {
	const denied = enforceTransitAccess(request);
	if (denied) return denied;

	const now = Date.now();
	if (cached && now - cached.timestamp < CACHE_TTL_MS) {
		return NextResponse.json(cached.payload, { status: cached.status });
	}

	if (inFlight) {
		const result = await inFlight;
		return NextResponse.json(result.payload, { status: result.status });
	}

	inFlight = (async () => {
		const urlsRaw = process.env.MTA_GTFS_RT_URLS;

		if (!urlsRaw) {
			return {
				payload: { ok: false, updatedAt: Date.now(), activeStops: [], error: 'Missing MTA_GTFS_RT_URLS' },
				status: 500,
			};
		}

		if (Object.keys(asStopMap).length === 0) {
			return {
				payload: { ok: false, updatedAt: Date.now(), activeStops: [], error: 'Missing stop map (mta-stops.json)' },
				status: 500,
			};
		}

		let gtfs;
		try {
			gtfs = await import('gtfs-realtime-bindings');
		} catch {
			return {
				payload: { ok: false, updatedAt: Date.now(), activeStops: [], error: 'Missing gtfs-realtime-bindings dependency' },
				status: 500,
			};
		}

		const urls = urlsRaw.split(',').map((u) => u.trim()).filter(Boolean);

		try {
			const responses = await Promise.all(
				urls.map(async (url) => {
					const res = await fetchWithRetry(url);
					const buffer = await res.arrayBuffer();
					return gtfs.transit_realtime.FeedMessage.decode(new Uint8Array(buffer));
				})
			);

			const now = Date.now();
			const activeStops: ActiveStop[] = [];
			const seen = new Set<string>();
			let latestFeedTimestamp = 0;

			for (const feed of responses) {
				const feedTs = feed.header?.timestamp ? Number(feed.header.timestamp) * 1000 : 0;
				if (feedTs > latestFeedTimestamp) latestFeedTimestamp = feedTs;

				for (const entity of feed.entity || []) {
					const stop = processGtfsEntity(entity, asStopMap, now);
					if (!stop) continue;

					const key = stop.trainId || `${stop.lineId}-${stop.stopId || stop.coords.join('-')}`;
					if (seen.has(key)) continue;
					seen.add(key);

					activeStops.push(stop);
				}
			}

			const arrivingCount = activeStops.filter((s) => s.status === 'arriving').length;
			const stoppedCount = activeStops.filter((s) => s.status === 'stopped').length;
			const inTransitCount = activeStops.filter((s) => s.status === 'in_transit').length;
			const linesActive = activeStops.reduce<Record<string, number>>((acc, s) => {
				acc[s.lineId] = (acc[s.lineId] || 0) + 1;
				return acc;
			}, {});

			setLastMetrics({
				updatedAt: now,
				feedTimestamp: latestFeedTimestamp,
				activeStopsCount: activeStops.length,
				arrivingCount,
				stoppedCount,
				inTransitCount,
				linesActive,
			});

			return { payload: { ok: true, updatedAt: now, feedTimestamp: latestFeedTimestamp, activeStops }, status: 200 };
		} catch {
			return {
				payload: { ok: false, updatedAt: Date.now(), feedTimestamp: 0, activeStops: [], error: 'Feed fetch failed' },
				status: 502,
			};
		}
	})();

	const result = await inFlight;
	inFlight = null;
	if (result.status === 200) {
		cached = { timestamp: Date.now(), payload: result.payload, status: result.status };
	}
	return NextResponse.json(result.payload, { status: result.status });
}
