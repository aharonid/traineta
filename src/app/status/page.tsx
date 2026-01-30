'use client';

import { useEffect, useState } from 'react';

type TransitMetrics = {
	updatedAt: number;
	feedTimestamp: number;
	activeStopsCount: number;
	arrivingCount: number;
	stoppedCount: number;
	inTransitCount: number;
	linesActive: Record<string, number>;
};

type StatusResponse = {
	ok: boolean;
	timestamp: string;
	feedConfigured: boolean;
	hasMetrics: boolean;
	metrics?: TransitMetrics | null;
};

const formatAge = (value?: number | null) => {
	if (!value) return '—';
	const secs = Math.max(0, Math.round((Date.now() - value) / 1000));
	if (secs < 60) return `${secs}s ago`;
	const mins = Math.floor(secs / 60);
	return `${mins}m ${secs % 60}s ago`;
};

const formatTime = (value?: number | null) => {
	if (!value) return '—';
	return new Date(value).toLocaleTimeString('en-US', {
		timeZone: 'America/New_York',
		hour: '2-digit',
		minute: '2-digit',
		second: '2-digit',
	});
};

export default function StatusPage() {
	const [health, setHealth] = useState<StatusResponse | null>(null);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		let mounted = true;
		const load = async () => {
			try {
				const res = await fetch('/api/status', { cache: 'no-store' });
				const data = (await res.json()) as StatusResponse;
				if (!mounted) return;
				setHealth(data);
				setError(null);
			} catch {
				if (!mounted) return;
				setError('Unable to reach status endpoint');
			}
		};
		load();
		const interval = setInterval(load, 10000);
		return () => {
			mounted = false;
			clearInterval(interval);
		};
	}, []);

	const metrics = health?.metrics;
	const lineCounts = metrics?.linesActive
		? Object.entries(metrics.linesActive).sort((a, b) => b[1] - a[1])
		: [];

	return (
		<section className='site-page'>
			<span className='pill'>Status</span>
			<h1>Service Status</h1>
			<p>Monitor feed status, cache freshness, and active train counts.</p>

			{error && (
				<div className='site-card' style={{ marginTop: '16px', borderColor: 'rgba(248, 113, 113, 0.4)' }}>
					<p style={{ color: '#fca5a5' }}>{error}</p>
				</div>
			)}

			<div className='site-grid cols-2' style={{ marginTop: '24px' }}>
				<div className='site-card'>
					<h2>Health</h2>
					<p>Status: {health?.ok ? 'Healthy' : 'Degraded'}</p>
					<p>Feed configured: {health?.feedConfigured ? 'Yes' : 'No'}</p>
					<p>Last check: {health?.timestamp ? new Date(health.timestamp).toLocaleString() : '—'}</p>
				</div>
				<div className='site-card'>
					<h2>Cache</h2>
					<p>Last update: {formatAge(metrics?.updatedAt)}</p>
					<p>Feed age: {metrics?.feedTimestamp ? formatAge(metrics.feedTimestamp) : '—'}</p>
					<p>Feed time: {formatTime(metrics?.feedTimestamp)}</p>
				</div>
			</div>

			<div className='site-grid cols-2' style={{ marginTop: '16px' }}>
				<div className='site-card'>
					<h2>Train positions</h2>
					<p>Total: {metrics?.activeStopsCount ?? '—'}</p>
					<p>Stopped: {metrics?.stoppedCount ?? '—'}</p>
					<p>Arriving: {metrics?.arrivingCount ?? '—'}</p>
					<p>In transit: {metrics?.inTransitCount ?? '—'}</p>
				</div>
				<div className='site-card'>
					<h2>By line</h2>
					{lineCounts.length === 0 ? (
						<p>Metrics will appear after the live feed loads.</p>
					) : (
						<ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
							{lineCounts.map(([line, count]) => (
								<li key={line} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
									<span>{line}</span>
									<span>{count}</span>
								</li>
							))}
						</ul>
					)}
				</div>
			</div>
		</section>
	);
}
