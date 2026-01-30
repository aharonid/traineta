'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import Link from 'next/link';
import { getSubwayLineColor } from '@/lib/transit/line-colors';
import { ALL_LINES } from '@/lib/transit/lines';
import lineStops from '@/lib/data/mta-line-stops.json';

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

const getDirection = (stopId: string): 'Uptown' | 'Downtown' | null => {
	if (stopId.endsWith('N')) return 'Uptown';
	if (stopId.endsWith('S')) return 'Downtown';
	return null;
};

// NYC subway bounding box
const BOUNDS = {
	minLat: 40.502,
	maxLat: 40.915,
	minLng: -74.255,
	maxLng: -73.700,
};

const latLngToPercent = (lat: number, lng: number) => {
	const x = ((lng - BOUNDS.minLng) / (BOUNDS.maxLng - BOUNDS.minLng)) * 100;
	const y = (1 - (lat - BOUNDS.minLat) / (BOUNDS.maxLat - BOUNDS.minLat)) * 100;
	return { x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) };
};

const lineButtonStyle = (color: { bg: string; text: string }) => ({
	background: color.bg,
	color: color.text,
	borderColor: color.bg,
});

// Get all stops for a line to draw its path
const getLineStops = (lineId: string): StopRecord[] => {
	const data = lineStops as unknown as Record<string, StopRecord[]>;
	return data[lineId] || [];
};

// Generate SVG path for a line
const getLinePath = (lineId: string): string => {
	const stops = getLineStops(lineId);
	if (stops.length < 2) return '';

	const points = stops.map((stop) => {
		const { x, y } = latLngToPercent(stop.coords[0], stop.coords[1]);
		return `${x},${y}`;
	});

	return `M ${points.join(' L ')}`;
};

export default function SubwayMapPage() {
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
				const res = await fetch('/api/transit/mta', { cache: 'no-store' });
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

	// Group trains by line (only stopped at stations)
	const trainsByLine = useMemo(() => {
		const groups = new Map<string, ActiveStop[]>();
		activeStops.forEach((stop) => {
			const list = groups.get(stop.lineId) || [];
			list.push(stop);
			groups.set(stop.lineId, list);
		});
		return groups;
	}, [activeStops]);

	// Pre-compute line paths
	const linePaths = useMemo(() => {
		const paths = new Map<string, string>();
		ALL_LINES.forEach((lineId) => {
			paths.set(lineId, getLinePath(lineId));
		});
		return paths;
	}, []);

	return (
		<main className='subway-map-page subway-map-page--home'>
			<section className='subway-map-hero'>
				<div className='subway-map-hero-inner'>
					<div>
						<p className='subway-map-kicker'>Live NYC Subway</p>
						<h1 className='subway-map-title'>Live Train Map</h1>
						<p className='subway-map-subtitle'>
							Real-time MTA feed. The most accurate train data available online.
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
						{ALL_LINES.map((line) => {
							const color = getSubwayLineColor(line);
							return (
								<Link
									key={line}
									className='subway-map-line-button'
									href={`/subway-map/${line.toLowerCase()}`}
									style={lineButtonStyle(color)}
								>
									{line}
								</Link>
							);
						})}
					</div>
				</div>
			</section>

			<section className='subway-map-canvas'>
				<div className='subway-map-frame'>
					{/* SVG layer for line paths */}
					<svg className='subway-map-svg' viewBox='0 0 100 100' preserveAspectRatio='none' role='img' aria-label='NYC Subway line paths showing all train routes'>
						{ALL_LINES.map((lineId) => {
							const color = getSubwayLineColor(lineId);
							const path = linePaths.get(lineId) || '';
							if (!path) return null;
							return (
								<path
									key={lineId}
									d={path}
									fill='none'
									stroke={color.bg}
									strokeWidth='0.4'
									strokeLinecap='round'
									strokeLinejoin='round'
									opacity='0.6'
								/>
							);
						})}
					</svg>

					{/* Train dots layer */}
					{ALL_LINES.map((lineId) => {
						const color = getSubwayLineColor(lineId);
						const trains = (trainsByLine.get(lineId) || []).filter((train) => train.status === 'stopped');
						return trains.map((train) => {
							const { x, y } = latLngToPercent(train.coords[0], train.coords[1]);
							const direction = train.stopId
								? getDirection(train.stopId)
								: train.nextStopId
									? getDirection(train.nextStopId)
									: null;
							// Build tooltip with countdown if available
							let countdown = '';
							if (train.arrivalTime) {
								const secsLeft = Math.max(0, Math.round((train.arrivalTime - currentTime.getTime()) / 1000));
								if (secsLeft > 60) {
									countdown = ` • ${Math.floor(secsLeft / 60)}m ${secsLeft % 60}s`;
								} else {
									countdown = ` • ${secsLeft}s`;
								}
							}
							const statusLabel =
								train.status === 'arriving'
									? 'arriving at'
									: train.status === 'stopped'
										? 'stopped at'
										: 'heading to';
							const stationLabel = train.status === 'in_transit'
								? (train.nextStationName || train.stationName || 'next stop')
								: (train.stationName || 'Unknown');
							const label = `${lineId} train${direction ? ' ' + direction : ''} ${statusLabel} ${stationLabel}${countdown}`;
							const trainKey = `${lineId}-${train.trainId}`;
							return (
								<div
									key={trainKey}
									className={`subway-map-train-dot-wrap ${hoveredTrain === trainKey ? 'is-hovered' : ''} ${train.status === 'arriving' ? 'is-arriving' : ''} ${train.status === 'in_transit' ? 'is-in-transit' : ''}`}
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
									/>
								</div>
							);
						});
					})}

					{/* Tooltip portal */}
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
