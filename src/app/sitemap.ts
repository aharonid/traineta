import { MetadataRoute } from 'next';
import lineStops from '@/lib/data/mta-line-stops.json';
import lirrLineStops from '@/lib/data/lirr-line-stops.json';
import { getLirrRouteSlug, getLirrRoutes } from '@/lib/transit/lirr-routes';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

export default function sitemap(): MetadataRoute.Sitemap {
	const lineIds = Object.keys(lineStops as Record<string, unknown>).map((line) => line.toLowerCase());
	const lirrIds = Array.from(
		new Set([
			...getLirrRoutes().map((route) => route.routeId),
			...Object.keys(lirrLineStops as Record<string, unknown>),
		])
	);
	const lastModified = new Date();

	return [
		{
			url: BASE_URL,
			lastModified,
			changeFrequency: 'hourly',
			priority: 1,
		},
		{
			url: `${BASE_URL}/subway-map`,
			lastModified,
			changeFrequency: 'hourly',
			priority: 0.9,
		},
		{
			url: `${BASE_URL}/lirr-map`,
			lastModified,
			changeFrequency: 'hourly',
			priority: 0.8,
		},
		{
			url: `${BASE_URL}/outages`,
			lastModified,
			changeFrequency: 'weekly',
			priority: 0.5,
		},
		{
			url: `${BASE_URL}/about`,
			lastModified,
			changeFrequency: 'weekly',
			priority: 0.4,
		},
		{
			url: `${BASE_URL}/status`,
			lastModified,
			changeFrequency: 'hourly',
			priority: 0.6,
		},
		{
			url: `${BASE_URL}/docs`,
			lastModified,
			changeFrequency: 'weekly',
			priority: 0.5,
		},
		...lineIds.map((line) => ({
			url: `${BASE_URL}/subway-map/${line}`,
			lastModified,
			changeFrequency: 'hourly' as const,
			priority: 0.7,
		})),
		...lirrIds.map((routeId) => ({
			url: `${BASE_URL}/lirr-map/${getLirrRouteSlug(routeId)}`,
			lastModified,
			changeFrequency: 'hourly' as const,
			priority: 0.6,
		})),
	];
}
