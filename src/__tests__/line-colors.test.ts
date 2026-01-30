/// <reference types="vitest" />

import { describe, expect, it } from 'vitest';
import { getSubwayLineColor } from '@/lib/transit/line-colors';

describe('getSubwayLineColor', () => {
	it('returns a known line color', () => {
		const color = getSubwayLineColor('A');
		expect(color.bg).toBeTruthy();
		expect(color.text).toBeTruthy();
	});

	it('returns fallback for unknown lines', () => {
		const color = getSubwayLineColor('UNKNOWN');
		expect(color).toEqual({ bg: '#808080', text: '#FFFFFF' });
	});
});
