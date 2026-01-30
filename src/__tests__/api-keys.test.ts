/// <reference types="vitest" />

import { describe, expect, it } from 'vitest';
import { generateApiKey } from '@/lib/transit/api-keys';

describe('generateApiKey', () => {
	it('generates a key with correct prefix', () => {
		const key = generateApiKey();
		expect(key.startsWith('tk_')).toBe(true);
	});

	it('generates keys of consistent length', () => {
		const key1 = generateApiKey();
		const key2 = generateApiKey();
		// tk_ prefix (3) + 48 hex chars (24 bytes) = 51
		expect(key1.length).toBe(51);
		expect(key2.length).toBe(51);
	});

	it('generates unique keys', () => {
		const keys = new Set<string>();
		for (let i = 0; i < 100; i++) {
			keys.add(generateApiKey());
		}
		expect(keys.size).toBe(100);
	});

	it('generates keys with valid hex characters after prefix', () => {
		const key = generateApiKey();
		const hexPart = key.slice(3);
		expect(/^[a-f0-9]+$/.test(hexPart)).toBe(true);
	});
});

describe('API key format validation', () => {
	it('should have tk_ prefix', () => {
		const key = generateApiKey();
		expect(key.substring(0, 3)).toBe('tk_');
	});
});
