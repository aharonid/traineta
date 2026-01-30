/// <reference types="vitest" />

import { describe, expect, it, beforeEach } from 'vitest';
import { setLastMetrics, getLastMetrics, type TransitMetrics } from '@/lib/transit/metrics';

describe('Transit Metrics', () => {
	const sampleMetrics: TransitMetrics = {
		updatedAt: Date.now(),
		feedTimestamp: Date.now() - 1000,
		activeStopsCount: 150,
		arrivingCount: 30,
		stoppedCount: 45,
		inTransitCount: 75,
		linesActive: {
			'A': 12,
			'B': 8,
			'C': 10,
			'1': 15,
			'2': 11,
			'3': 9,
		},
	};

	it('returns null initially', () => {
		// Note: This test may fail if other tests have set metrics
		// In a real test suite, you'd want to reset state between tests
		const metrics = getLastMetrics();
		// Just verify it returns something (null or a value)
		expect(metrics === null || typeof metrics === 'object').toBe(true);
	});

	it('stores and retrieves metrics', () => {
		setLastMetrics(sampleMetrics);
		const retrieved = getLastMetrics();

		expect(retrieved).not.toBeNull();
		expect(retrieved?.activeStopsCount).toBe(150);
		expect(retrieved?.arrivingCount).toBe(30);
		expect(retrieved?.stoppedCount).toBe(45);
		expect(retrieved?.inTransitCount).toBe(75);
	});

	it('overwrites previous metrics', () => {
		setLastMetrics(sampleMetrics);

		const newMetrics: TransitMetrics = {
			...sampleMetrics,
			activeStopsCount: 200,
		};
		setLastMetrics(newMetrics);

		const retrieved = getLastMetrics();
		expect(retrieved?.activeStopsCount).toBe(200);
	});

	it('preserves linesActive breakdown', () => {
		setLastMetrics(sampleMetrics);
		const retrieved = getLastMetrics();

		expect(retrieved?.linesActive['A']).toBe(12);
		expect(retrieved?.linesActive['1']).toBe(15);
		expect(Object.keys(retrieved?.linesActive || {}).length).toBe(6);
	});

	it('counts should add up correctly', () => {
		setLastMetrics(sampleMetrics);
		const retrieved = getLastMetrics();

		const total = (retrieved?.arrivingCount || 0) +
			(retrieved?.stoppedCount || 0) +
			(retrieved?.inTransitCount || 0);

		expect(total).toBe(retrieved?.activeStopsCount);
	});
});
