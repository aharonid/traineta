'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import lineStops from '@/lib/data/lirr-line-stops.json';
import {
	getLirrLineColor,
	getLirrLineLabel,
	getLirrRouteBadge,
	getLirrRouteIdFromSlug,
	getLirrRouteSlug,
	getLirrRoutes,
	getLirrDirectionLabel,
	getLirrDirectionMark,
} from '@/lib/transit/lirr-routes';

type ActiveStop = {
	lineId: string;
	trainId: string;
	stopId?: string;
	stationName?: string;
	coords: [number, number];
	updatedAt: number;
	status?: 'arriving' | 'stopped' | 'in_transit';
	nextStopId?: string;
	nextStationName?: string;
	arrivalTime?: number;
	directionId?: number;
};

type ApiResponse = {
	ok: boolean;
	updatedAt: number;
	feedTimestamp?: number;
	activeStops: ActiveStop[];
	error?: string;
};

type StopRecord = {
	stopId: string;
	name: string;
	coords: [number, number];
};

const lineStopMap = lineStops as unknown as Record<string, StopRecord[]>;
const routeIds = Array.from(
	new Set([...getLirrRoutes().map((route) => route.routeId), ...Object.keys(lineStopMap)])
);

const routeList = routeIds
	.map((routeId) => ({
		routeId,
		label: getLirrLineLabel(routeId),
		badge: getLirrRouteBadge(routeId),
		slug: getLirrRouteSlug(routeId),
	}))
	.sort((a, b) => a.label.localeCompare(b.label));

const lineButtonStyle = (color: { bg: string; text: string }) => ({
	background: color.bg,
	color: color.text,
	borderColor: color.bg,
});

export default function LirrLinePage() {
	const params = useParams();
	const lineParam = Array.isArray(params?.line) ? params?.line[0] : params?.line;
	const resolvedRouteId = lineParam ? getLirrRouteIdFromSlug(lineParam, routeIds) : null;
	const routeId = resolvedRouteId || routeIds[0] || null;
	const isValidLine = Boolean(routeId);

	const [activeStops, setActiveStops] = useState<ActiveStop[]>([]);
	const [lastUpdated, setLastUpdated] = useState<number | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [currentTime, setCurrentTime] = useState<Date>(new Date());

	useEffect(() => {
		const timer = setInterval(() => setCurrentTime(new Date()), 1000);
		return () => clearInterval(timer);
	}, []);

	useEffect(() => {
		if (!isValidLine) return;
		let mounted = true;
		let interval: NodeJS.Timeout | null = null;

		const load = async () => {
			try {
				const res = await fetch('/api/transit/lirr', { cache: 'no-store' });
				const data = (await res.json()) as ApiResponse;
				if (!mounted) return;
				if (!data.ok) {
					setError(data.error || 'Unable to load live feed');
					return;
				}
				setActiveStops(data.activeStops || []);
				setLastUpdated(data.updatedAt || Date.now());
				setError(null);
			} catch {
				if (!mounted) return;
				setError('Unable to load live feed');
			}
		};

		load();
		interval = setInterval(load, 5000);

		return () => {
			mounted = false;
			if (interval) clearInterval(interval);
		};
	}, [isValidLine]);

	const stops = useMemo<StopRecord[]>(() => {
		if (!routeId) return [];
		return lineStopMap[routeId] || [];
	}, [routeId]);

	const trainsByStop = useMemo(() => {
		if (!routeId) return new Map<string, ActiveStop[]>();
		const groups = new Map<string, ActiveStop[]>();
		activeStops
			.filter((stop) => (stop.status === 'stopped' || stop.status === 'arriving') && stop.lineId === routeId && stop.stopId)
			.forEach((stop) => {
				const key = stop.stopId as string;
				const list = groups.get(key) || [];
				list.push(stop);
				groups.set(key, list);
			});
		return groups;
	}, [activeStops, routeId]);

	const nextTrainByStop = useMemo(() => {
		if (!routeId) return new Map<string, { arrivalTime: number | null; directionId: number | null }>();
		const next = new Map<string, { arrivalTime: number | null; directionId: number | null }>();
		activeStops
			.filter((stop) => stop.status === 'in_transit' && stop.lineId === routeId && stop.nextStopId)
			.forEach((stop) => {
				const baseStopId = stop.nextStopId as string;
				const existing = next.get(baseStopId);
				if (!existing || (stop.arrivalTime && (!existing.arrivalTime || stop.arrivalTime < existing.arrivalTime))) {
					next.set(baseStopId, { arrivalTime: stop.arrivalTime || null, directionId: stop.directionId ?? null });
				}
			});
		return next;
	}, [activeStops, routeId]);

	const lineColor = routeId ? getLirrLineColor(routeId) : { bg: '#1f2937', text: '#ffffff' };
	const lineLabel = routeId ? getLirrLineLabel(routeId) : 'Unknown line';
	const badge = routeId ? getLirrRouteBadge(routeId) : 'LIRR';

	if (!isValidLine) {
		return (
			<main className='subway-line-page'>
				<section className='subway-line-hero'>
					<div>
						<p className='subway-map-kicker'>Line View</p>
						<h1 className='subway-map-title'>Unknown line</h1>
						<p className='subway-map-subtitle'>That line doesn’t exist. Pick one from the list.</p>
					</div>
					<Link className='subway-map-line-button' href='/lirr-map'>
						Back to live map
					</Link>
				</section>
				<section className='subway-map-controls'>
					<p className='subway-map-controls-label'>Line</p>
					<div className='subway-map-controls-row'>
						{routeList.map((route) => {
							const color = getLirrLineColor(route.routeId);
							return (
								<Link
									key={route.routeId}
									className='subway-map-line-button'
									href={`/lirr-map/${route.slug}`}
									style={lineButtonStyle(color)}
								>
									{route.label}
								</Link>
							);
						})}
					</div>
				</section>
			</main>
		);
	}

	return (
		<main className='subway-line-page'>
			<section className='subway-line-hero'>
				<div>
					<p className='subway-map-kicker'>Line View</p>
					<h1 className='subway-map-title'>{lineLabel} Live Station Board</h1>
				</div>
				<div className='subway-map-status'>
					<span className='subway-map-time'>
						{currentTime.toLocaleTimeString('en-US', { timeZone: 'America/New_York', hour: '2-digit', minute: '2-digit', second: '2-digit' })} EST
					</span>
					{error ? (
						<span className='subway-map-status-error'>{error}</span>
					) : (
						<span className='subway-map-status-ok' role='status' aria-live='polite'>
							Updated {lastUpdated ? `${Math.max(0, Math.round((currentTime.getTime() - lastUpdated) / 1000))}s ago` : '…'}
						</span>
					)}
				</div>
			</section>

			<section className='subway-map-controls'>
				<p className='subway-map-controls-label'>Line</p>
				<div className='subway-map-controls-row'>
					{routeList.map((route) => {
						const color = getLirrLineColor(route.routeId);
						return (
							<Link
								key={route.routeId}
								className={`subway-map-line-button${routeId === route.routeId ? ' is-active' : ''}`}
								href={`/lirr-map/${route.slug}`}
								style={lineButtonStyle(color)}
							>
								{route.label}
							</Link>
						);
					})}
				</div>
			</section>

			{stops.length === 0 ? (
				<section className='site-page'>
					<div className='site-card' style={{ marginTop: '16px' }}>
						<h2>Missing LIRR station data</h2>
						<p>Generate it from the GTFS static zip to populate this board.</p>
					</div>
				</section>
			) : (
				<section className='subway-line-list'>
					{stops.map((stop) => {
						const trains = trainsByStop.get(stop.stopId) || [];
						return (
							<div key={stop.stopId} className='subway-line-row'>
								<div className='subway-line-stop'>
									<span className='subway-line-stop-dot' style={{ background: lineColor.bg }} aria-hidden='true' />
									<span className='subway-line-stop-name'>{stop.name}</span>
								</div>
								<div className='subway-line-trains'>
									{trains.length === 0 ? (
										(() => {
										const nextTrain = nextTrainByStop.get(stop.stopId);
										if (nextTrain) {
											const directionLabel = routeId
												? getLirrDirectionLabel(routeId, nextTrain.directionId)
												: null;
											const directionMark = getLirrDirectionMark(nextTrain.directionId);
											const directionText = directionLabel
												? `${directionMark ? `${directionMark} ` : ''}${directionLabel} `
												: nextTrain.directionId != null
													? `dir ${nextTrain.directionId} `
													: '';
											if (nextTrain.arrivalTime) {
												const secs = Math.max(0, Math.round((nextTrain.arrivalTime - Date.now()) / 1000));
												const mins = Math.floor(secs / 60);
												const timeStr = mins > 0 ? `${mins}m ${secs % 60}s` : `${secs}s`;
												return <span className='subway-line-next'>Next {directionText}{timeStr}</span>;
											}
											return <span className='subway-line-next'>Next {directionText}approaching</span>;
										}
										return <span className='subway-line-empty'>—</span>;
									})()
								) : (
									trains.map((train, idx) => {
										const isArriving = train.status === 'arriving';
										const arrivalSecs = train.arrivalTime ? Math.max(0, Math.round((train.arrivalTime - Date.now()) / 1000)) : null;
										const directionLabel = routeId ? getLirrDirectionLabel(routeId, train.directionId) : null;
										const directionMark = getLirrDirectionMark(train.directionId);
										const directionText = directionLabel
											? `${directionMark ? `${directionMark} ` : ''}${directionLabel}`
											: train.directionId != null
												? `Dir ${train.directionId}`
												: '';
										return (
											<span
												key={`${train.trainId}-${idx}`}
												className={`subway-line-train-pill ${isArriving ? 'is-arriving' : ''}`}
													style={{
														borderColor: lineColor.bg,
													color: lineColor.bg,
													opacity: isArriving ? 0.7 : 1,
												}}
											>
												{badge}
												{directionText ? ` ${directionText}` : ''}{' '}
												{isArriving && arrivalSecs !== null ? `${arrivalSecs}s` : '●'}
											</span>
										);
									})
								)}
								</div>
							</div>
						);
					})}
				</section>
			)}
		</main>
	);
}
