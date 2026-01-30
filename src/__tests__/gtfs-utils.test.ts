/// <reference types="vitest" />

import { describe, expect, it } from 'vitest';
import {
	normalizeStopId,
	resolveStopInfo,
	processGtfsEntity,
	INCOMING_AT,
	STOPPED_AT,
	IN_TRANSIT_TO,
	type StopRecord,
} from '@/lib/transit/gtfs-utils';

describe('normalizeStopId', () => {
	it('returns original stop ID as first candidate', () => {
		const result = normalizeStopId('123N');
		expect(result[0]).toBe('123N');
	});

	it('adds trimmed version without direction suffix', () => {
		const result = normalizeStopId('123N');
		expect(result).toContain('123');
	});

	it('handles S suffix', () => {
		const result = normalizeStopId('456S');
		expect(result).toEqual(['456S', '456']);
	});

	it('handles E/W suffixes', () => {
		expect(normalizeStopId('789E')).toEqual(['789E', '789']);
		expect(normalizeStopId('789W')).toEqual(['789W', '789']);
	});

	it('returns only original if no direction suffix', () => {
		const result = normalizeStopId('ABC');
		expect(result).toEqual(['ABC']);
	});

	it('handles empty string', () => {
		const result = normalizeStopId('');
		expect(result).toEqual(['']);
	});
});

describe('resolveStopInfo', () => {
	const stopMap: Record<string, StopRecord> = {
		'123': { name: 'Times Square', coords: [40.758, -73.985] },
		'456': { name: 'Grand Central', coords: [40.752, -73.977], lines: ['4', '5', '6'] },
	};

	it('resolves stop with exact match', () => {
		const result = resolveStopInfo('123', stopMap);
		expect(result.stopId).toBe('123');
		expect(result.stop?.name).toBe('Times Square');
	});

	it('resolves stop with direction suffix', () => {
		const result = resolveStopInfo('123N', stopMap);
		expect(result.stopId).toBe('123');
		expect(result.stop?.name).toBe('Times Square');
	});

	it('returns undefined stop for unknown ID', () => {
		const result = resolveStopInfo('999', stopMap);
		expect(result.stopId).toBe('999');
		expect(result.stop).toBeUndefined();
	});

	it('returns empty object for undefined stopId', () => {
		const result = resolveStopInfo(undefined, stopMap);
		expect(result).toEqual({});
	});
});

describe('processGtfsEntity', () => {
	const stopMap: Record<string, StopRecord> = {
		'A01': { name: 'Inwood', coords: [40.868, -73.920], lines: ['A'] },
		'A02': { name: '207th St', coords: [40.864, -73.919], lines: ['A'] },
	};
	const now = Date.now();

	it('returns null for entity without coords or resolvable stop', () => {
		const entity = {
			id: 'trip-1',
			tripUpdate: { trip: { routeId: 'A' } },
		};
		const result = processGtfsEntity(entity, {}, now);
		expect(result).toBeNull();
	});

	it('extracts train position from vehicle entity', () => {
		const entity = {
			id: 'trip-1',
			vehicle: {
				trip: { routeId: 'A', tripId: 'A-train-1' },
				vehicle: { id: 'train-001' },
				position: { latitude: 40.868, longitude: -73.920 },
				currentStatus: STOPPED_AT,
				stopId: 'A01',
			},
		};
		const result = processGtfsEntity(entity, stopMap, now);
		expect(result).not.toBeNull();
		expect(result?.lineId).toBe('A');
		expect(result?.trainId).toBe('train-001');
		expect(result?.status).toBe('stopped');
		expect(result?.stationName).toBe('Inwood');
		expect(result?.coords).toEqual([40.868, -73.920]);
	});

	it('handles INCOMING_AT status as arriving', () => {
		const entity = {
			id: 'trip-2',
			vehicle: {
				trip: { routeId: 'A' },
				position: { latitude: 40.866, longitude: -73.919 },
				currentStatus: INCOMING_AT,
				stopId: 'A02',
			},
		};
		const result = processGtfsEntity(entity, stopMap, now);
		expect(result?.status).toBe('arriving');
	});

	it('handles IN_TRANSIT_TO status', () => {
		const entity = {
			id: 'trip-3',
			vehicle: {
				trip: { routeId: 'A' },
				position: { latitude: 40.865, longitude: -73.919 },
				currentStatus: IN_TRANSIT_TO,
				stopId: 'A02',
			},
		};
		const result = processGtfsEntity(entity, stopMap, now);
		expect(result?.status).toBe('in_transit');
		expect(result?.nextStopId).toBe('A02');
	});

	it('uses stop coords when no GPS position', () => {
		const entity = {
			id: 'trip-4',
			vehicle: {
				trip: { routeId: 'A' },
				currentStatus: STOPPED_AT,
				stopId: 'A01',
			},
		};
		const result = processGtfsEntity(entity, stopMap, now);
		expect(result?.coords).toEqual([40.868, -73.920]);
	});

	it('extracts direction ID when present', () => {
		const entity = {
			id: 'trip-5',
			vehicle: {
				trip: { routeId: 'A', directionId: 1 },
				position: { latitude: 40.868, longitude: -73.920 },
				currentStatus: STOPPED_AT,
				stopId: 'A01',
			},
		};
		const result = processGtfsEntity(entity, stopMap, now);
		expect(result?.directionId).toBe(1);
	});

	it('defaults lineId to Unknown when missing', () => {
		const entity = {
			id: 'trip-6',
			vehicle: {
				position: { latitude: 40.868, longitude: -73.920 },
			},
		};
		const result = processGtfsEntity(entity, {}, now);
		expect(result?.lineId).toBe('Unknown');
	});
});

describe('GTFS-RT status constants', () => {
	it('has correct enum values', () => {
		expect(INCOMING_AT).toBe(0);
		expect(STOPPED_AT).toBe(1);
		expect(IN_TRANSIT_TO).toBe(2);
	});
});
