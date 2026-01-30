import { NextResponse } from 'next/server';

const ALERTS_URL =
	process.env.MTA_ALERTS_URL ||
	'https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/camsys%2Fsubway-alerts';

const CACHE_TTL_MS = 30000;
let cached:
	| {
			timestamp: number;
			payload: { ok: boolean; updatedAt: number; alerts: AlertSummary[]; error?: string };
			status: number;
	  }
	| undefined;
let inFlight: Promise<{ payload: { ok: boolean; updatedAt: number; alerts: AlertSummary[]; error?: string }; status: number }> | null = null;

type AlertSummary = {
	id: string;
	header: string;
	description: string;
	cause?: string;
	effect?: string;
	url?: string;
	routes: string[];
	activePeriods: Array<{ start?: number; end?: number }>;
};

const pickTranslation = (field?: { translation?: Array<{ language?: string | null; text?: string | null }> | null } | null) => {
	if (!field?.translation?.length) return '';
	const english = field.translation.find((t) => t.language?.toLowerCase() === 'en');
	return (english?.text || field.translation[0]?.text || '').trim();
};

export async function GET() {
	const now = Date.now();
	if (cached && now - cached.timestamp < CACHE_TTL_MS) {
		return NextResponse.json(cached.payload, { status: cached.status });
	}

	if (inFlight) {
		const result = await inFlight;
		return NextResponse.json(result.payload, { status: result.status });
	}

	inFlight = (async () => {
		let gtfs;
		try {
			gtfs = await import('gtfs-realtime-bindings');
		} catch {
			return {
				payload: { ok: false, updatedAt: Date.now(), alerts: [], error: 'Missing gtfs-realtime-bindings' },
				status: 500,
			};
		}

		try {
			const res = await fetch(ALERTS_URL, { cache: 'no-store' });
			if (!res.ok) {
				throw new Error(`Feed error: ${res.status}`);
			}
			const buffer = await res.arrayBuffer();
			const feed = gtfs.transit_realtime.FeedMessage.decode(new Uint8Array(buffer));

			const alerts: AlertSummary[] = [];
			for (const entity of feed.entity || []) {
				if (!entity.alert) continue;
				const alert = entity.alert;

				const routes = Array.from(
					new Set(
						(alert.informedEntity || [])
							.map((ent) => ent.routeId)
							.filter((id): id is string => typeof id === 'string')
					)
				);

				const activePeriods = (alert.activePeriod || []).map((period) => ({
					start: period.start ? Number(period.start) * 1000 : undefined,
					end: period.end ? Number(period.end) * 1000 : undefined,
				}));

				const header = pickTranslation(alert.headerText);
				const description = pickTranslation(alert.descriptionText);
				const url = pickTranslation(alert.url);

				const cause = typeof alert.cause === 'number'
					? gtfs.transit_realtime.Alert.Cause[alert.cause] || 'UNKNOWN_CAUSE'
					: alert.cause ?? undefined;
				const effect = typeof alert.effect === 'number'
					? gtfs.transit_realtime.Alert.Effect[alert.effect] || 'UNKNOWN_EFFECT'
					: alert.effect ?? undefined;

				alerts.push({
					id: entity.id || crypto.randomUUID(),
					header,
					description,
					cause,
					effect,
					url,
					routes,
					activePeriods,
				});
			}

			const payload = { ok: true, updatedAt: Date.now(), alerts };
			return { payload, status: 200 };
		} catch {
			return {
				payload: { ok: false, updatedAt: Date.now(), alerts: [], error: 'Alerts feed fetch failed' },
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
