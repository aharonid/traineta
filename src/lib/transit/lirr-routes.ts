import routes from '@/lib/data/lirr-routes.json';
import directionLabels from '@/lib/data/lirr-direction-labels.json';

export type LirrRoute = {
	routeId: string;
	shortName?: string;
	longName?: string;
	color?: string;
	textColor?: string;
	slug?: string;
};

const FALLBACK_COLOR = '#0039A6';
const FALLBACK_TEXT = '#FFFFFF';

const normalizeHex = (value?: string) => {
	if (!value) return undefined;
	const raw = value.trim();
	if (!raw) return undefined;
	const hex = raw.startsWith('#') ? raw : `#${raw}`;
	if (/^#[0-9a-fA-F]{3}$/.test(hex) || /^#[0-9a-fA-F]{6}$/.test(hex)) {
		return hex.toUpperCase();
	}
	return undefined;
};

const normalizeRoutes = (routes as LirrRoute[]).map((route) => ({
	...route,
	color: normalizeHex(route.color),
	textColor: normalizeHex(route.textColor),
}));

const ROUTE_MAP = new Map(normalizeRoutes.map((route) => [route.routeId, route]));
const DIRECTION_LABELS = directionLabels as Record<string, Record<string, string>>;

const normalizeSlug = (value: string) =>
	value
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/(^-|-$)/g, '');

const hexToRgb = (hex: string) => {
	const clean = hex.replace('#', '');
	const expanded = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean;
	const intVal = Number.parseInt(expanded, 16);
	if (Number.isNaN(intVal)) return null;
	return {
		r: (intVal >> 16) & 255,
		g: (intVal >> 8) & 255,
		b: intVal & 255,
	};
};

const getContrastText = (bg: string) => {
	const rgb = hexToRgb(bg);
	if (!rgb) return FALLBACK_TEXT;
	const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
	return luminance > 0.6 ? '#000000' : '#FFFFFF';
};

export const getLirrRoutes = () => normalizeRoutes;

export const getLirrRoute = (routeId: string) => ROUTE_MAP.get(routeId);

export const getLirrLineLabel = (routeId: string) => {
	const route = getLirrRoute(routeId);
	return route?.shortName || route?.longName || routeId;
};

export const getLirrLineColor = (routeId: string) => {
	const route = getLirrRoute(routeId);
	const bg = route?.color || FALLBACK_COLOR;
	const text = route?.textColor || getContrastText(bg) || FALLBACK_TEXT;
	return { bg, text };
};

export const getLirrRouteBadge = (routeId: string) => {
	const label = getLirrLineLabel(routeId);
	const cleaned = label.replace(/\b(branch|line)\b/gi, '').trim();
	if (cleaned.length <= 4) return cleaned.toUpperCase();
	const words = cleaned.split(/\s+/).filter(Boolean);
	if (words.length > 1) {
		return words
			.map((word) => word[0])
			.join('')
			.slice(0, 4)
			.toUpperCase();
	}
	return cleaned.slice(0, 4).toUpperCase();
};

export const getLirrRouteSlug = (routeId: string) => {
	const route = getLirrRoute(routeId);
	const base = route?.slug || route?.shortName || route?.longName || routeId;
	return normalizeSlug(base);
};

export const getLirrRouteIdFromSlug = (slug: string, routeIds: string[]) => {
	const normalized = normalizeSlug(slug);
	for (const routeId of routeIds) {
		if (normalizeSlug(routeId) === normalized) return routeId;
		if (getLirrRouteSlug(routeId) === normalized) return routeId;
	}
	return null;
};

export const getLirrDirectionLabel = (routeId: string, directionId?: number | null) => {
	if (directionId == null) return null;
	const labels = DIRECTION_LABELS[routeId];
	if (!labels) return null;
	return labels[String(directionId)] || null;
};

export const getLirrDirectionMark = (directionId?: number | null) => {
	if (directionId === 0) return '→';
	if (directionId === 1) return '←';
	return '';
};
