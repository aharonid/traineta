// Shared GTFS-RT utilities for MTA and LIRR feeds

export type StopRecord = {
	name: string;
	coords: [number, number];
	lines?: string[];
};

export type ActiveStop = {
	lineId: string;
	trainId: string;
	stopId?: string;
	stationName?: string;
	coords: [number, number];
	updatedAt: number;
	status: 'arriving' | 'stopped' | 'in_transit';
	directionId?: number;
	nextStopId?: string;
	nextStationName?: string;
	arrivalTime?: number;
};

export type FeedPayload = {
	ok: boolean;
	updatedAt: number;
	feedTimestamp?: number;
	activeStops: ActiveStop[];
	error?: string;
};

export type CacheEntry = {
	timestamp: number;
	payload: FeedPayload;
	status: number;
};

// GTFS-RT VehicleStopStatus enum values
export const INCOMING_AT = 0; // Approaching the stop
export const STOPPED_AT = 1; // Currently stopped at station
export const IN_TRANSIT_TO = 2; // Moving toward next stop

export const CACHE_TTL_MS = 5000;

export const normalizeStopId = (stopId: string): string[] => {
	const candidates = [stopId];
	if (stopId.length > 0) {
		const trimmed = stopId.replace(/[NSEW]$/i, '');
		if (trimmed !== stopId) candidates.push(trimmed);
	}
	return candidates;
};

export const fetchWithRetry = async (
	url: string,
	headers?: Record<string, string>,
	retries = 3
): Promise<Response> => {
	let lastError: Error | null = null;
	for (let attempt = 0; attempt < retries; attempt++) {
		try {
			const res = await fetch(url, { cache: 'no-store', headers });
			if (res.ok) return res;
			throw new Error(`Feed error: ${res.status}`);
		} catch (err) {
			lastError = err as Error;
			if (attempt < retries - 1) {
				await new Promise((resolve) => setTimeout(resolve, 500 * Math.pow(2, attempt)));
			}
		}
	}
	throw lastError || new Error('Max retries reached');
};

export const resolveStopInfo = (
	stopId: string | undefined,
	stopMap: Record<string, StopRecord>
): { stopId?: string; stop?: StopRecord } => {
	if (!stopId) return {};
	for (const candidate of normalizeStopId(stopId)) {
		if (stopMap[candidate]) {
			return { stopId: candidate, stop: stopMap[candidate] };
		}
	}
	return { stopId };
};

type Long = { toNumber(): number };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const processGtfsEntity = (
	entity: any,
	stopMap: Record<string, StopRecord>,
	now: number
): ActiveStop | null => {
	const trip = entity.tripUpdate?.trip || entity.vehicle?.trip;
	let lineId = trip?.routeId || 'Unknown';
	const directionId = trip?.directionId != null ? Number(trip.directionId) : undefined;
	const trainId =
		entity.vehicle?.vehicle?.id ||
		entity.tripUpdate?.vehicle?.id ||
		entity.id ||
		trip?.tripId ||
		`${lineId}-unknown`;

	let stopId: string | undefined;
	let stationName: string | undefined;
	let coords: [number, number] | undefined;
	let status: 'arriving' | 'stopped' | 'in_transit' = 'in_transit';
	let nextStopId: string | undefined;
	let nextStationName: string | undefined;
	let arrivalTime: number | undefined;

	const vehiclePos = entity.vehicle?.position;
	if (vehiclePos?.latitude != null && vehiclePos?.longitude != null) {
		coords = [Number(vehiclePos.latitude), Number(vehiclePos.longitude)];
	}

	const currentStatus = entity.vehicle?.currentStatus;
	const vehicleStopId = entity.vehicle?.stopId;

	if (currentStatus === STOPPED_AT && vehicleStopId) {
		stopId = vehicleStopId;
		status = 'stopped';
	} else if (currentStatus === INCOMING_AT && vehicleStopId) {
		stopId = vehicleStopId;
		status = 'arriving';
	} else if (currentStatus === IN_TRANSIT_TO && vehicleStopId) {
		nextStopId = vehicleStopId;
		status = 'in_transit';
	}

	if (entity.tripUpdate?.stopTimeUpdate?.length) {
		for (const update of entity.tripUpdate.stopTimeUpdate) {
			if (!update.stopId) continue;
			const arrivalRaw = update.arrival?.time;
			const departureRaw = update.departure?.time;
			const arrival =
				arrivalRaw != null
					? (typeof arrivalRaw === 'number' ? arrivalRaw : arrivalRaw.toNumber()) * 1000
					: undefined;
			const departure =
				departureRaw != null
					? (typeof departureRaw === 'number' ? departureRaw : departureRaw.toNumber()) * 1000
					: undefined;

			if (status === 'in_transit' && !stopId) {
				const windowStart = arrival ?? (departure ? departure - 60_000 : undefined);
				const windowEnd = departure ?? (arrival ? arrival + 60_000 : undefined);
				if (windowStart != null && windowEnd != null) {
					if (now >= windowStart && now <= windowEnd) {
						stopId = update.stopId;
						status = 'stopped';
						break;
					} else if (arrival && now < arrival && arrival - now < 120_000) {
						stopId = update.stopId;
						status = 'arriving';
						arrivalTime = arrival;
						break;
					}
				}
			}

			if (status === 'in_transit' && !nextStopId && arrival && arrival > now) {
				nextStopId = update.stopId;
				arrivalTime = arrival;
				break;
			}
		}
	}

	const hasStopMap = Object.keys(stopMap).length > 0;
	let stop: StopRecord | undefined;
	if (hasStopMap && stopId) {
		const resolved = resolveStopInfo(stopId, stopMap);
		stopId = resolved.stopId;
		stop = resolved.stop;
	}

	let nextStop: StopRecord | undefined;
	if (hasStopMap && nextStopId) {
		const resolved = resolveStopInfo(nextStopId, stopMap);
		nextStopId = resolved.stopId;
		nextStop = resolved.stop;
		if (nextStop) nextStationName = nextStop.name;
	}

	if (!coords && stop) coords = stop.coords;
	if (!coords && status === 'in_transit' && nextStop) coords = nextStop.coords;

	if (lineId === 'Unknown') {
		const inferred = stop?.lines?.[0] || nextStop?.lines?.[0];
		if (inferred) lineId = inferred;
	}

	if (!coords) return null;

	stationName = stop?.name;

	return {
		lineId,
		trainId,
		stopId,
		stationName,
		coords,
		updatedAt: now,
		status,
		directionId: Number.isFinite(directionId as number) ? directionId : undefined,
		nextStopId,
		nextStationName,
		arrivalTime,
	};
};
