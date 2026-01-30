'use client';

import { useEffect, useMemo, useState } from 'react';

type OutageRecord = {
	id: string;
	stationName?: string;
	location?: string;
	stopId?: string;
	equipmentId?: string;
	equipmentType?: string;
	equipmentName?: string;
	lines?: string[];
	direction?: string;
	borough?: string;
	status?: string;
	reason?: string;
	description?: string;
	start?: number;
	end?: number;
};

type OutageResponse = {
	ok: boolean;
	updatedAt: number;
	feedTimestamp?: number;
	current: OutageRecord[];
	upcoming: OutageRecord[];
	equipment: OutageRecord[];
	error?: string;
};

type TabId = 'current' | 'upcoming' | 'equipment';

const TABS: { id: TabId; label: string; empty: string }[] = [
	{ id: 'current', label: 'Current Outages', empty: 'No active outages reported.' },
	{ id: 'upcoming', label: 'Upcoming Outages', empty: 'No scheduled outages reported.' },
	{ id: 'equipment', label: 'Equipment', empty: 'No equipment inventory returned.' },
];

const formatClock = (value: Date) =>
	value.toLocaleTimeString('en-US', {
		timeZone: 'America/New_York',
		hour: '2-digit',
		minute: '2-digit',
		second: '2-digit',
	});

const formatLabel = (value?: string) => {
	if (!value) return '';
	const normalized = value
		.replace(/[_-]+/g, ' ')
		.replace(/\s+/g, ' ')
		.trim()
		.toLowerCase();
	return normalized.replace(/\b\w/g, (match) => match.toUpperCase());
};

const formatTime = (timestamp?: number) => {
	if (!timestamp) return 'TBD';
	return new Date(timestamp).toLocaleString('en-US', {
		timeZone: 'America/New_York',
		month: 'short',
		day: '2-digit',
		hour: '2-digit',
		minute: '2-digit',
	});
};

const formatWindow = (start?: number, end?: number) => {
	if (!start && !end) return 'Window: TBD';
	return `${formatTime(start)} - ${formatTime(end)}`;
};

const getEquipmentKind = (outage: OutageRecord) => {
	const raw = `${outage.equipmentType || ''} ${outage.equipmentName || ''} ${outage.equipmentId || ''}`
		.toLowerCase()
		.trim();
	if (/\b(escalator|esc)\b/.test(raw) || raw.startsWith('es')) return 'Escalator';
	if (/\b(elevator|elev|el)\b/.test(raw) || raw.startsWith('el')) return 'Elevator';
	return 'Equipment';
};

const buildMeta = (outage: OutageRecord) => {
	const parts: string[] = [];
	if (outage.lines?.length) parts.push(`Lines: ${outage.lines.join(', ')}`);
	if (outage.direction) parts.push(`Dir: ${outage.direction}`);
	if (outage.borough) parts.push(`Borough: ${outage.borough}`);
	return parts.join(' | ');
};

const getTitle = (outage: OutageRecord) =>
	outage.stationName || outage.location || outage.equipmentName || outage.stopId || 'Unknown location';

const getStatusLabel = (outage: OutageRecord, tab: TabId) => {
	if (outage.status) return formatLabel(outage.status);
	if (tab === 'upcoming') return 'Planned Maintenance';
	if (tab === 'equipment') return 'Equipment';
	return 'Out of Service';
};

const getStatusTone = (outage: OutageRecord, tab: TabId) => {
	const status = (outage.status || '').toLowerCase().replace(/[_-]+/g, ' ');
	if (tab === 'upcoming' || status.includes('planned')) return 'is-upcoming';
	if (status.includes('out') || status.includes('no service') || status.includes('unavailable')) return 'is-outage';
	return 'is-info';
};

const getTypeLabel = (outage: OutageRecord, tab: TabId) => {
	const kind = getEquipmentKind(outage);
	const statusTone = getStatusTone(outage, tab);
	if (statusTone === 'is-upcoming') return `${kind} Maintenance`;
	if (statusTone === 'is-outage') return `${kind} Outage`;
	return kind;
};

export default function OutagesPage() {
	const [data, setData] = useState<OutageResponse | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [activeTab, setActiveTab] = useState<TabId>('current');
	const [currentTime, setCurrentTime] = useState<Date>(new Date());

	useEffect(() => {
		const timer = setInterval(() => setCurrentTime(new Date()), 1000);
		return () => clearInterval(timer);
	}, []);

	useEffect(() => {
		let mounted = true;
		let interval: NodeJS.Timeout | null = null;

		const load = async () => {
			try {
				const res = await fetch('/api/outages', { cache: 'no-store' });
				const payload = (await res.json()) as OutageResponse;
				if (!mounted) return;
				if (!payload.ok) {
					setError(payload.error || 'Unable to load outage feeds');
					return;
				}
				setData(payload);
				setError(null);
			} catch {
				if (!mounted) return;
				setError('Unable to load outage feeds');
			}
		};

		load();
		interval = setInterval(load, 30000);

		return () => {
			mounted = false;
			if (interval) clearInterval(interval);
		};
	}, []);

	const activeItems = useMemo(() => {
		if (!data) return [];
		switch (activeTab) {
			case 'upcoming':
				return data.upcoming;
			case 'equipment':
				return data.equipment;
			default:
				return data.current;
		}
	}, [data, activeTab]);

	const sortedItems = useMemo(() => {
		return [...activeItems].sort((a, b) => getTitle(a).localeCompare(getTitle(b)));
	}, [activeItems]);

	const lastUpdated = data?.updatedAt || null;
	const feedTimestamp = data?.feedTimestamp || null;

	return (
		<main className='subway-line-page outages-page'>
			<section className='subway-line-hero'>
				<div>
					<p className='subway-map-kicker'>Accessibility</p>
					<h1 className='subway-map-title'>Elevator & Escalator Outages</h1>
					<p className='subway-map-subtitle'>Live MTA feed for current and upcoming elevator or escalator outages.</p>
				</div>
				<div className='subway-map-status'>
					<span className='subway-map-time'>{formatClock(currentTime)} EST</span>
					{error ? (
						<span className='subway-map-status-error'>{error}</span>
					) : (
						<span className='subway-map-status-ok' role='status' aria-live='polite'>
							Updated {lastUpdated ? `${Math.max(0, Math.round((currentTime.getTime() - lastUpdated) / 1000))}s ago` : '...'}
							{feedTimestamp ? ` | Feed ${Math.max(0, Math.round((currentTime.getTime() - feedTimestamp) / 1000))}s old` : ''}
						</span>
					)}
				</div>
			</section>

			<section className='subway-map-controls'>
				<p className='subway-map-controls-label'>View</p>
				<div className='subway-map-controls-row'>
					{TABS.map((tab) => (
						<button
							key={tab.id}
							type='button'
							className={`subway-map-line-button${activeTab === tab.id ? ' is-active' : ''}`}
							onClick={() => setActiveTab(tab.id)}
						>
							{tab.label}
						</button>
					))}
				</div>
			</section>

			<section className='outages-summary'>
				<div className='outages-summary-pill'>Current: {data?.current.length ?? '...'}</div>
				<div className='outages-summary-pill'>Upcoming: {data?.upcoming.length ?? '...'}</div>
				<div className='outages-summary-pill'>Equipment: {data?.equipment.length ?? '...'}</div>
			</section>

			<section className='outages-list'>
				{sortedItems.length === 0 ? (
					<div className='outages-empty'>
						{TABS.find((tab) => tab.id === activeTab)?.empty || 'No data.'}
					</div>
				) : (
					sortedItems.map((outage) => {
						const meta = buildMeta(outage);
						const statusLabel = getStatusLabel(outage, activeTab);
						const statusTone = getStatusTone(outage, activeTab);
						const typeLabel = getTypeLabel(outage, activeTab);
						return (
							<div key={outage.id} className='outage-row'>
								<div className='outage-main'>
									<div className='outage-title-row'>
										<span className='outage-type-pill'>
											{typeLabel}
										</span>
										<span className='outage-title'>{getTitle(outage)}</span>
									</div>
									{meta ? <div className='outage-meta'>{meta}</div> : null}
									{outage.equipmentId ? (
										<div className='outage-meta'>Equipment ID: {outage.equipmentId}</div>
									) : null}
									{outage.description ? <div className='outage-description'>{outage.description}</div> : null}
								</div>
								<div className='outage-status-col'>
									<span className={`outage-status-pill ${statusTone}`}>{statusLabel || 'Status'}</span>
									<span className='outage-window'>{formatWindow(outage.start, outage.end)}</span>
									{outage.reason ? <span className='outage-reason'>{formatLabel(outage.reason)}</span> : null}
								</div>
							</div>
						);
					})
				)}
			</section>
		</main>
	);
}
