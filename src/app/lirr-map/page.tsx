'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import Link from 'next/link';
import lineStops from '@/lib/data/lirr-line-stops.json';
import {
	getLirrLineColor,
	getLirrLineLabel,
	getLirrRouteBadge,
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

const allStops = Object.values(lineStopMap).flat();

const lineButtonStyle = (color: { bg: string; text: string }) => ({
	background: color.bg,
	color: color.text,
	borderColor: color.bg,
});

const DEFAULT_BOUNDS = {
	minLat: 40.55,
	maxLat: 41.15,
	minLng: -74.25,
	maxLng: -71.85,
};

const computeBounds = (stops: StopRecord[]) => {
	if (!stops.length) return null;
	let minLat = Infinity;
	let maxLat = -Infinity;
	let minLng = Infinity;
	let maxLng = -Infinity;
	for (const stop of stops) {
		const [lat, lng] = stop.coords;
		if (lat < minLat) minLat = lat;
		if (lat > maxLat) maxLat = lat;
		if (lng < minLng) minLng = lng;
		if (lng > maxLng) maxLng = lng;
	}
	if (!Number.isFinite(minLat) || !Number.isFinite(minLng)) return null;
	const padLat = (maxLat - minLat) * 0.05 || 0.02;
	const padLng = (maxLng - minLng) * 0.05 || 0.02;
	return {
		minLat: minLat - padLat,
		maxLat: maxLat + padLat,
		minLng: minLng - padLng,
		maxLng: maxLng + padLng,
	};
};

const BOUNDS = computeBounds(allStops) || DEFAULT_BOUNDS;

const latLngToPercent = (lat: number, lng: number) => {
	const lngRange = BOUNDS.maxLng - BOUNDS.minLng || 1;
	const latRange = BOUNDS.maxLat - BOUNDS.minLat || 1;
	const x = ((lng - BOUNDS.minLng) / lngRange) * 100;
	const y = (1 - (lat - BOUNDS.minLat) / latRange) * 100;
	return { x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) };
};

const getLineStops = (lineId: string): StopRecord[] => {
	return lineStopMap[lineId] || [];
};

const getLinePath = (lineId: string): string => {
	const stops = getLineStops(lineId);
	if (stops.length < 2) return '';
	const points = stops.map((stop) => {
		const { x, y } = latLngToPercent(stop.coords[0], stop.coords[1]);
		return `${x},${y}`;
	});
	return `M ${points.join(' L ')}`;
};

export default function LirrMapPage() {
	const [activeStops, setActiveStops] = useState<ActiveStop[]>([]);
	const [lastUpdated, setLastUpdated] = useState<number | null>(null);
	const [feedTimestamp, setFeedTimestamp] = useState<number | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [currentTime, setCurrentTime] = useState<Date>(new Date());
	const [hoveredTrain, setHoveredTrain] = useState<string | null>(null);
	const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);
	const [tooltipContent, setTooltipContent] = useState<string>('');

	const handleTrainHover = useCallback((e: React.SyntheticEvent<HTMLElement>, trainKey: string, content: string) => {
		const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
		setHoveredTrain(trainKey);
		setTooltipPos({ x: rect.left + rect.width / 2, y: rect.top });
		setTooltipContent(content);
	}, []);

	const handleTrainLeave = useCallback(() => {
		setHoveredTrain(null);
		setTooltipPos(null);
		setTooltipContent('');
	}, []);

	// Update current time every second
	useEffect(() => {
		const timer = setInterval(() => setCurrentTime(new Date()), 1000);
		return () => clearInterval(timer);
	}, []);

	useEffect(() => {
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
				setFeedTimestamp(data.feedTimestamp || null);
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
	}, []);

	const trainsByLine = useMemo(() => {
		const groups = new Map<string, ActiveStop[]>();
		activeStops
			.filter((stop) => stop.status === 'stopped' && stop.stopId)
			.forEach((stop) => {
				const list = groups.get(stop.lineId) || [];
				list.push(stop);
				groups.set(stop.lineId, list);
			});
		return groups;
	}, [activeStops]);

	const visibleLineIds = useMemo(() => {
		const ids = new Set(routeIds);
		activeStops.forEach((stop) => ids.add(stop.lineId));
		return Array.from(ids);
	}, [activeStops]);

	const linePaths = useMemo(() => {
		const paths = new Map<string, string>();
		routeIds.forEach((lineId) => {
			paths.set(lineId, getLinePath(lineId));
		});
		return paths;
	}, []);

	return (
		<main className='subway-map-page'>
			<section className='subway-map-hero'>
				<div className='subway-map-hero-inner'>
					<div>
						<p className='subway-map-kicker'>Live LIRR</p>
						<h1 className='subway-map-title'>Live Rail Map</h1>
						<p className='subway-map-subtitle'>
							Real-time LIRR feed. The most accurate train data available online.
						</p>
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
				</div>
				<div className='subway-map-controls' id='lines'>
					<p className='subway-map-controls-label'>Click a line for station list</p>
					<div className='subway-map-controls-row'>
						{routeList.length === 0 ? (
							<span className='subway-map-status-error'>No LIRR line data yet. Generate it from GTFS static.</span>
						) : (
							routeList.map((route) => {
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
							})
						)}
					</div>
				</div>
			</section>

			<section className='subway-map-canvas'>
				<div className='subway-map-frame'>
					<svg className='subway-map-svg' viewBox='0 0 100 100' preserveAspectRatio='none' role='img' aria-label='LIRR line paths showing rail routes'>
						{routeIds.map((lineId) => {
							const color = getLirrLineColor(lineId);
							const path = linePaths.get(lineId) || '';
							if (!path) return null;
							return (
								<path
									key={lineId}
									d={path}
									fill='none'
									stroke={color.bg}
									strokeWidth='0.35'
									strokeLinecap='round'
									strokeLinejoin='round'
									opacity='0.6'
								/>
							);
						})}
					</svg>

					{visibleLineIds.map((lineId) => {
						const color = getLirrLineColor(lineId);
						const trains = trainsByLine.get(lineId) || [];
						const lineLabel = getLirrLineLabel(lineId);
						const badge = getLirrRouteBadge(lineId);
						return trains.map((train) => {
							const { x, y } = latLngToPercent(train.coords[0], train.coords[1]);
							const directionLabel = getLirrDirectionLabel(lineId, train.directionId);
							const directionMark = getLirrDirectionMark(train.directionId);
							let countdown = '';
							if (train.arrivalTime) {
								const secsLeft = Math.max(0, Math.round((train.arrivalTime - currentTime.getTime()) / 1000));
								if (secsLeft > 60) {
									countdown = ` • ${Math.floor(secsLeft / 60)}m ${secsLeft % 60}s`;
								} else {
									countdown = ` • ${secsLeft}s`;
								}
							}
							const directionText = directionLabel
								? ` ${directionMark ? `${directionMark} ` : ''}${directionLabel}`
								: train.directionId != null
									? ` dir ${train.directionId}`
									: '';
							const stationLabel = train.stationName || train.nextStationName || 'Unknown';
							const label = `${lineLabel} train${directionText} at ${stationLabel}${countdown}`;
							const trainKey = `${lineId}-${train.trainId}`;
							return (
								<div
									key={trainKey}
									className={`subway-map-train-dot-wrap ${hoveredTrain === trainKey ? 'is-hovered' : ''}`}
									style={{ left: `${x}%`, top: `${y}%` }}
									aria-label={label}
									role='button'
									tabIndex={0}
									onMouseEnter={(e) => handleTrainHover(e, trainKey, label)}
									onMouseLeave={handleTrainLeave}
									onFocus={(e) => handleTrainHover(e, trainKey, label)}
									onBlur={handleTrainLeave}
									onKeyDown={(e) => {
										if (e.key === 'Escape') {
											handleTrainLeave();
										}
										if (e.key === 'Enter' || e.key === ' ') {
											e.preventDefault();
											handleTrainHover(e, trainKey, label);
										}
									}}
								>
									<span
										className='subway-map-train-circle'
										style={{
											background: color.bg,
											color: color.text,
											boxShadow: `0 0 6px ${color.bg}, 0 0 12px ${color.bg}40`,
										}}
									>
										{badge}
									</span>
								</div>
							);
						});
					})}

					{hoveredTrain && tooltipPos && (
						<div
							className='subway-map-tooltip'
							style={{
								position: 'fixed',
								left: `${tooltipPos.x}px`,
								top: `${tooltipPos.y - 10}px`,
								transform: 'translate(-50%, -100%)',
								zIndex: 9999,
							}}
						>
							{tooltipContent}
						</div>
					)}
				</div>
			</section>
		</main>
	);
}
