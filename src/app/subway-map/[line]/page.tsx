'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import lineStops from '@/lib/data/mta-line-stops.json';
import { getSubwayLineColor } from '@/lib/transit/line-colors';
import { LINE_OPTIONS } from '@/lib/transit/lines';

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

const normalizeLine = (value: string) => value.toUpperCase();

const getDirection = (stopId: string): 'Uptown' | 'Downtown' | null => {
	if (stopId.endsWith('N')) return 'Uptown';
	if (stopId.endsWith('S')) return 'Downtown';
	return null;
};

const lineButtonStyle = (color: { bg: string; text: string }) => ({
	background: color.bg,
	color: color.text,
	borderColor: color.bg,
});

export default function SubwayLinePage() {
	const params = useParams();
	const lineParam = Array.isArray(params?.line) ? params?.line[0] : params?.line;
	const lineId = normalizeLine(lineParam || '6');
	const isValidLine = LINE_OPTIONS.includes(lineId);

	const [activeStops, setActiveStops] = useState<ActiveStop[]>([]);
	const [lastUpdated, setLastUpdated] = useState<number | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [currentTime, setCurrentTime] = useState<Date>(new Date());

	// Update current time every second
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
				const res = await fetch('/api/transit/mta', { cache: 'no-store' });
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
		const data = lineStops as unknown as Record<string, StopRecord[]>;
		return data[lineId] || [];
	}, [lineId]);

	const trainsByStop = useMemo(() => {
		const groups = new Map<string, ActiveStop[]>();
		activeStops
			.filter((stop) => (stop.status === 'stopped' || stop.status === 'arriving') && stop.lineId === lineId && stop.stopId)
			.forEach((stop) => {
				// Strip direction suffix (N/S) to match mta-line-stops.json format
				const key = (stop.stopId as string).replace(/[NS]$/, '');
				const list = groups.get(key) || [];
				list.push(stop);
				groups.set(key, list);
			});
		return groups;
	}, [activeStops, lineId]);

	// Get next arriving train for each stop (from in_transit trains)
	const nextTrainByStop = useMemo(() => {
		const next = new Map<string, { direction: 'Uptown' | 'Downtown' | null; arrivalTime: number | null }>();
		activeStops
			.filter((stop) => stop.status === 'in_transit' && stop.lineId === lineId && stop.nextStopId)
			.forEach((stop) => {
				const baseStopId = (stop.nextStopId as string).replace(/[NS]$/, '');
				const direction = getDirection(stop.nextStopId as string);
				const existing = next.get(baseStopId);
				// Keep the soonest arrival per stop (prefer ones with arrivalTime)
				if (!existing || (stop.arrivalTime && (!existing.arrivalTime || stop.arrivalTime < existing.arrivalTime))) {
					next.set(baseStopId, { direction, arrivalTime: stop.arrivalTime || null });
				}
			});
		return next;
	}, [activeStops, lineId]);

	const lineColor = getSubwayLineColor(lineId);

	if (!isValidLine) {
		return (
			<main className='subway-line-page'>
				<section className='subway-line-hero'>
					<div>
						<p className='subway-map-kicker'>Line View</p>
						<h1 className='subway-map-title'>Unknown line</h1>
						<p className='subway-map-subtitle'>That line doesn’t exist. Pick one from the list.</p>
					</div>
					<Link className='subway-map-line-button' href='/subway-map'>
						Back to live map
					</Link>
				</section>
				<section className='subway-map-controls'>
					<p className='subway-map-controls-label'>Line</p>
					<div className='subway-map-controls-row'>
						{LINE_OPTIONS.map((line) => {
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
				</section>
			</main>
		);
	}

	return (
		<main className='subway-line-page'>
			<section className='subway-line-hero'>
				<div>
					<p className='subway-map-kicker'>Line View</p>
					<h1 className='subway-map-title'>{lineId} Line Live Station Board</h1>
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
					{LINE_OPTIONS.map((line) => {
						const color = getSubwayLineColor(line);
						return (
							<Link
								key={line}
								className={`subway-map-line-button${lineId === line ? ' is-active' : ''}`}
								href={`/subway-map/${line.toLowerCase()}`}
								style={lineButtonStyle(color)}
							>
								{line}
							</Link>
						);
					})}
				</div>
			</section>

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
											const directionIcon = nextTrain.direction === 'Uptown' ? '↑' : nextTrain.direction === 'Downtown' ? '↓' : '';
											if (nextTrain.arrivalTime) {
												const secs = Math.max(0, Math.round((nextTrain.arrivalTime - Date.now()) / 1000));
												const mins = Math.floor(secs / 60);
												const timeStr = mins > 0 ? `${mins}m ${secs % 60}s` : `${secs}s`;
												return (
													<span className='subway-line-next'>
														Next {directionIcon}: {timeStr}
													</span>
												);
											}
											return (
												<span className='subway-line-next'>
													Next {directionIcon} approaching
												</span>
											);
										}
										return <span className='subway-line-empty'>—</span>;
									})()
								) : (
									trains.map((train, idx) => {
										const direction = train.stopId ? getDirection(train.stopId) : null;
										const isArriving = train.status === 'arriving';
										const arrivalSecs = train.arrivalTime ? Math.max(0, Math.round((train.arrivalTime - Date.now()) / 1000)) : null;
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
												{lineId} {direction || ''} {isArriving && arrivalSecs !== null ? `${arrivalSecs}s` : '●'}
											</span>
										);
									})
								)}
							</div>
						</div>
					);
				})}
			</section>
		</main>
	);
}
