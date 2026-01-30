import { randomBytes } from 'crypto';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

export type ApiKey = {
	key: string;
	name: string;
	createdAt: number;
	lastUsed?: number;
	requestCount: number;
};

type KeyStore = {
	keys: ApiKey[];
};

const DATA_FILE = join(process.cwd(), 'data', 'api-keys.json');

const loadStore = (): KeyStore => {
	try {
		if (existsSync(DATA_FILE)) {
			const data = readFileSync(DATA_FILE, 'utf-8');
			return JSON.parse(data) as KeyStore;
		}
	} catch {
		// Fall through to default
	}
	return { keys: [] };
};

const saveStore = (store: KeyStore) => {
	try {
		writeFileSync(DATA_FILE, JSON.stringify(store, null, 2));
	} catch (error) {
		console.error('Failed to save API keys:', error);
	}
};

// In-memory cache
let cachedStore: KeyStore | null = null;
let cacheTime = 0;
const CACHE_TTL = 5000; // 5 seconds

const getStore = (): KeyStore => {
	const now = Date.now();
	if (!cachedStore || now - cacheTime > CACHE_TTL) {
		cachedStore = loadStore();
		cacheTime = now;
	}
	return cachedStore;
};

const invalidateCache = () => {
	cachedStore = null;
	cacheTime = 0;
};

export const generateApiKey = (): string => {
	return `tk_${randomBytes(24).toString('hex')}`;
};

export const createApiKey = (name: string): ApiKey => {
	const store = loadStore();
	const newKey: ApiKey = {
		key: generateApiKey(),
		name,
		createdAt: Date.now(),
		requestCount: 0,
	};
	store.keys.push(newKey);
	saveStore(store);
	invalidateCache();
	return newKey;
};

export const deleteApiKey = (key: string): boolean => {
	const store = loadStore();
	const index = store.keys.findIndex((k) => k.key === key);
	if (index === -1) return false;
	store.keys.splice(index, 1);
	saveStore(store);
	invalidateCache();
	return true;
};

export const getAllApiKeys = (): ApiKey[] => {
	return getStore().keys;
};

export const isValidApiKey = (key: string): boolean => {
	const store = getStore();
	return store.keys.some((k) => k.key === key);
};

export const recordKeyUsage = (key: string) => {
	const store = loadStore();
	const keyEntry = store.keys.find((k) => k.key === key);
	if (keyEntry) {
		keyEntry.lastUsed = Date.now();
		keyEntry.requestCount += 1;
		saveStore(store);
		invalidateCache();
	}
};

// Combine env keys with dynamic keys
export const getAllValidKeys = (): Set<string> => {
	const envKeys = (process.env.TRANSIT_CLIENT_KEYS || '')
		.split(',')
		.map((k) => k.trim())
		.filter(Boolean);
	const dynamicKeys = getStore().keys.map((k) => k.key);
	return new Set([...envKeys, ...dynamicKeys]);
};
