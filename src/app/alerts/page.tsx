'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { ALL_LINES } from '@/lib/transit/lines';

type AlertSummary = {
	id: string;
	header: string;
	description: string;
	cause?: string;
	effect?: string;
	url?: string;
	routes: string[];
	activePeriods: Array<{ start?: number; end?: number }>;
};

type AlertsResponse = {
	ok: boolean;
	updatedAt: number;
	alerts: AlertSummary[];
	error?: string;
};

const formatTime = (value?: number) => {
	if (!value) return '—';
	return new Date(value).toLocaleString('en-US', {
		timeZone: 'America/New_York',
		hour: '2-digit',
		minute: '2-digit',
		month: 'short',
		day: 'numeric',
	});
};

const isActiveNow = (periods: Array<{ start?: number; end?: number }>) => {
	if (periods.length === 0) return true;
	const now = Date.now();
	return periods.some((period) => {
		const startOk = period.start ? now >= period.start : true;
		const endOk = period.end ? now <= period.end : true;
		return startOk && endOk;
	});
};

export default function AlertsPage() {
	return (
		<Suspense fallback={<AlertsLoading />}>
			<AlertsContent />
		</Suspense>
	);
}

function AlertsLoading() {
	return (
		<section className='alerts-page'>
			<div className='alerts-hero'>
				<div>
					<span className='pill'>Alerts</span>
					<h1>Service Alerts</h1>
					<p>Loading alerts...</p>
				</div>
			</div>
		</section>
	);
}

function AlertsContent() {
	const searchParams = useSearchParams();
	const initialLine = searchParams.get('line')?.toUpperCase() || 'ALL';

	const [activeLine, setActiveLine] = useState(initialLine);
	const [alerts, setAlerts] = useState<AlertSummary[]>([]);
	const [updatedAt, setUpdatedAt] = useState<number | null>(null);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		let mounted = true;
		const load = async () => {
			try {
				const res = await fetch('/api/alerts', { cache: 'no-store' });
				const data = (await res.json()) as AlertsResponse;
				if (!mounted) return;
				if (!data.ok) {
					setError(data.error || 'Unable to load alerts');
					return;
				}
				setAlerts(data.alerts || []);
				setUpdatedAt(data.updatedAt || Date.now());
				setError(null);
			} catch {
				if (!mounted) return;
				setError('Unable to load alerts');
			}
		};
		load();
		const interval = setInterval(load, 30000);
		return () => {
			mounted = false;
			clearInterval(interval);
		};
	}, []);

	useEffect(() => {
		setActiveLine(initialLine);
	}, [initialLine]);

	const filtered = useMemo(() => {
		if (activeLine === 'ALL') return alerts;
		return alerts.filter((alert) => alert.routes.length === 0 || alert.routes.includes(activeLine));
	}, [alerts, activeLine]);

	const activeCount = filtered.filter((alert) => isActiveNow(alert.activePeriods)).length;

	return (
		<section className='alerts-page'>
			<div className='alerts-hero'>
				<div>
					<span className='pill'>Alerts</span>
					<h1>Service Alerts</h1>
					<p>Live MTA alerts filtered by line. Updated {updatedAt ? formatTime(updatedAt) : '—'}.</p>
				</div>
				<div className='alerts-meta'>
					<span className='pill'>{activeCount} active</span>
					<span className='pill'>{filtered.length} total</span>
				</div>
			</div>

			<div className='alerts-tabs'>
				<button
					className={`alerts-tab ${activeLine === 'ALL' ? 'is-active' : ''}`}
					onClick={() => setActiveLine('ALL')}
				>
					All
				</button>
				{ALL_LINES.map((line) => (
					<button
						key={line}
						className={`alerts-tab ${activeLine === line ? 'is-active' : ''}`}
						onClick={() => setActiveLine(line)}
					>
						{line}
					</button>
				))}
			</div>

			{error && (
				<div className='site-card' style={{ marginTop: '16px', borderColor: 'rgba(248, 113, 113, 0.4)' }}>
					<p style={{ color: '#fca5a5' }}>{error}</p>
				</div>
			)}

			<div className='alerts-grid'>
				{filtered.length === 0 ? (
					<div className='site-card'>No alerts for this line.</div>
				) : (
					filtered.map((alert) => {
						const active = isActiveNow(alert.activePeriods);
						return (
							<div key={alert.id} className={`alerts-card ${active ? 'is-active' : ''}`}>
								<div className='alerts-card-header'>
									<span className='pill'>{active ? 'Active' : 'Inactive'}</span>
									{alert.routes.length > 0 && (
										<div className='alerts-route-list'>
											{alert.routes.map((route) => (
												<span key={route} className='alerts-route-pill'>
													{route}
												</span>
											))}
										</div>
									)}
								</div>
								<h2>{alert.header || 'Service Update'}</h2>
								{alert.description && <p>{alert.description}</p>}
								<div className='alerts-card-meta'>
									{alert.cause && <span>Cause: {alert.cause}</span>}
									{alert.effect && <span>Effect: {alert.effect}</span>}
								</div>
								{alert.activePeriods.length > 0 && (
									<div className='alerts-card-meta'>
										<span>Start: {formatTime(alert.activePeriods[0]?.start)}</span>
										<span>End: {formatTime(alert.activePeriods[0]?.end)}</span>
									</div>
								)}
								{alert.url && (
									<a className='alerts-link' href={alert.url} target='_blank' rel='noreferrer'>
										View details
									</a>
								)}
							</div>
						);
					})
				)}
			</div>
		</section>
	);
}
