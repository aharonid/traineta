/// <reference types="vitest" />

import { describe, expect, it } from 'vitest';
import lineStops from '@/lib/data/mta-line-stops.json';
import { ALL_LINES } from '@/lib/transit/lines';

describe('mta-line-stops.json', () => {
	it('includes stop arrays for all UI lines', () => {
		for (const line of ALL_LINES) {
			expect(lineStops[line as keyof typeof lineStops]).toBeTruthy();
			expect(Array.isArray(lineStops[line as keyof typeof lineStops])).toBe(true);
		}
	});

	it('each line has at least one stop', () => {
		for (const line of ALL_LINES) {
			const stops = lineStops[line as keyof typeof lineStops] as Array<{ stopId: string }>;
			expect(stops.length).toBeGreaterThan(0);
			expect(stops[0].stopId).toBeTruthy();
		}
	});
});
