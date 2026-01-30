'use client';

import { useEffect, useState, useCallback } from 'react';

type ApiKey = {
	key: string;
	fullKey: string;
	name: string;
	createdAt: number;
	lastUsed?: number;
	requestCount: number;
};

type KeysResponse = {
	ok: boolean;
	keys: ApiKey[];
	error?: string;
};

type CreateKeyResponse = {
	ok: boolean;
	key?: ApiKey;
	error?: string;
};

const inputStyle = {
	minWidth: '240px',
	padding: '8px 10px',
	borderRadius: '8px',
	border: '1px solid rgba(255,255,255,0.15)',
	background: 'rgba(10,10,10,0.4)',
	color: '#fff',
};

const buttonStyle = {
	padding: '8px 14px',
	borderRadius: '999px',
	border: '1px solid rgba(255,255,255,0.2)',
	background: 'rgba(255,255,255,0.06)',
	color: '#fff',
	fontWeight: 600,
	cursor: 'pointer',
};

const dangerButtonStyle = {
	...buttonStyle,
	border: '1px solid rgba(248, 113, 113, 0.4)',
	background: 'rgba(248, 113, 113, 0.1)',
	color: '#fca5a5',
};

export default function AdminPage() {
	const [adminToken, setAdminToken] = useState<string>('');
	const [tokenInput, setTokenInput] = useState<string>('');
	const [isAuthenticated, setIsAuthenticated] = useState(false);
	const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
	const [newKeyName, setNewKeyName] = useState('');
	const [newlyCreatedKey, setNewlyCreatedKey] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);

	useEffect(() => {
		const saved = typeof window !== 'undefined' ? window.sessionStorage.getItem('adminToken') : null;
		if (saved) {
			setAdminToken(saved);
			setTokenInput(saved);
		}
	}, []);

	const loadKeys = useCallback(async () => {
		if (!adminToken) return;
		try {
			const res = await fetch('/api/admin/keys', {
				headers: { 'x-admin-token': adminToken },
			});
			if (res.status === 401) {
				setIsAuthenticated(false);
				setError('Invalid admin token');
				return;
			}
			const data = (await res.json()) as KeysResponse;
			if (data.ok) {
				setIsAuthenticated(true);
				setApiKeys(data.keys);
				setError(null);
			} else {
				setError(data.error || 'Failed to load keys');
			}
		} catch {
			setError('Failed to connect to server');
		}
	}, [adminToken]);

	useEffect(() => {
		if (adminToken) {
			loadKeys();
		}
	}, [adminToken, loadKeys]);

	const saveToken = () => {
		const next = tokenInput.trim();
		setAdminToken(next);
		setIsAuthenticated(false);
		setApiKeys([]);
		if (typeof window !== 'undefined') {
			if (next) {
				window.sessionStorage.setItem('adminToken', next);
			} else {
				window.sessionStorage.removeItem('adminToken');
			}
		}
	};

	const createKey = async () => {
		if (!newKeyName.trim()) {
			setError('Please enter a name for the key');
			return;
		}
		setLoading(true);
		setError(null);
		try {
			const res = await fetch('/api/admin/keys', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'x-admin-token': adminToken,
				},
				body: JSON.stringify({ name: newKeyName.trim() }),
			});
			const data = (await res.json()) as CreateKeyResponse;
			if (data.ok && data.key) {
				setNewlyCreatedKey(data.key.key);
				setNewKeyName('');
				loadKeys();
			} else {
				setError(data.error || 'Failed to create key');
			}
		} catch {
			setError('Failed to create key');
		} finally {
			setLoading(false);
		}
	};

	const deleteKey = async (key: string) => {
		if (!confirm('Are you sure you want to delete this API key? This cannot be undone.')) return;
		setLoading(true);
		try {
			const res = await fetch('/api/admin/keys', {
				method: 'DELETE',
				headers: {
					'Content-Type': 'application/json',
					'x-admin-token': adminToken,
				},
				body: JSON.stringify({ key }),
			});
			const data = await res.json();
			if (data.ok) {
				loadKeys();
			} else {
				setError(data.error || 'Failed to delete key');
			}
		} catch {
			setError('Failed to delete key');
		} finally {
			setLoading(false);
		}
	};

	const copyToClipboard = (text: string) => {
		navigator.clipboard.writeText(text);
	};

	return (
		<section className='site-page'>
			<span className='pill'>Admin</span>
			<h1>Admin Dashboard</h1>
			<p>Manage API keys and monitor system configuration.</p>

			<div className='site-card' style={{ marginTop: '16px' }}>
				<h2>Authentication</h2>
				<p>Enter your admin token to access this page.</p>
				<div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '12px' }}>
					<input
						type='password'
						placeholder='Admin token'
						value={tokenInput}
						onChange={(e) => setTokenInput(e.target.value)}
						onKeyDown={(e) => e.key === 'Enter' && saveToken()}
						style={inputStyle}
					/>
					<button type='button' onClick={saveToken} style={buttonStyle}>
						{isAuthenticated ? 'Update' : 'Authenticate'}
					</button>
				</div>
				{isAuthenticated && (
					<p style={{ marginTop: '8px', color: '#86efac' }}>Authenticated</p>
				)}
			</div>

			{error && (
				<div className='site-card' style={{ marginTop: '16px', borderColor: 'rgba(248, 113, 113, 0.4)' }}>
					<p style={{ color: '#fca5a5' }}>{error}</p>
				</div>
			)}

			{newlyCreatedKey && (
				<div className='site-card' style={{ marginTop: '16px', borderColor: 'rgba(134, 239, 172, 0.4)' }}>
					<h2>New API Key Created</h2>
					<p style={{ color: '#fca5a5', marginBottom: '8px' }}>
						Copy this key now. You won't be able to see it again!
					</p>
					<div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
						<code style={{ padding: '8px 12px', background: 'rgba(0,0,0,0.3)', borderRadius: '6px', wordBreak: 'break-all' }}>
							{newlyCreatedKey}
						</code>
						<button
							type='button'
							onClick={() => copyToClipboard(newlyCreatedKey)}
							style={buttonStyle}
						>
							Copy
						</button>
						<button
							type='button'
							onClick={() => setNewlyCreatedKey(null)}
							style={buttonStyle}
						>
							Dismiss
						</button>
					</div>
				</div>
			)}

			{isAuthenticated && (
				<>
					<div className='site-card' style={{ marginTop: '24px' }}>
						<h2>Generate API Key</h2>
						<p>Create a new API key for developers or integrations.</p>
						<div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '12px' }}>
							<input
								type='text'
								placeholder='Key name (e.g., "Mobile App", "Partner XYZ")'
								value={newKeyName}
								onChange={(e) => setNewKeyName(e.target.value)}
								onKeyDown={(e) => e.key === 'Enter' && createKey()}
								style={{ ...inputStyle, flex: 1 }}
							/>
							<button
								type='button'
								onClick={createKey}
								disabled={loading}
								style={buttonStyle}
							>
								{loading ? 'Creating...' : 'Generate Key'}
							</button>
						</div>
					</div>

					<div className='site-card' style={{ marginTop: '16px' }}>
						<h2>Active API Keys</h2>
						{apiKeys.length === 0 ? (
							<p style={{ opacity: 0.7 }}>No API keys created yet.</p>
						) : (
							<div style={{ marginTop: '12px' }}>
								{apiKeys.map((k) => (
									<div
										key={k.fullKey}
										style={{
											display: 'flex',
											justifyContent: 'space-between',
											alignItems: 'center',
											padding: '12px 0',
											borderBottom: '1px solid rgba(255,255,255,0.1)',
											flexWrap: 'wrap',
											gap: '8px',
										}}
									>
										<div>
											<strong>{k.name}</strong>
											<br />
											<code style={{ fontSize: '13px', opacity: 0.7 }}>{k.key}</code>
											<br />
											<span style={{ fontSize: '12px', opacity: 0.5 }}>
												Created: {new Date(k.createdAt).toLocaleDateString()} |
												Requests: {k.requestCount}
												{k.lastUsed && ` | Last used: ${new Date(k.lastUsed).toLocaleDateString()}`}
											</span>
										</div>
										<div style={{ display: 'flex', gap: '8px' }}>
											<button
												type='button'
												onClick={() => copyToClipboard(k.fullKey)}
												style={buttonStyle}
											>
												Copy
											</button>
											<button
												type='button'
												onClick={() => deleteKey(k.fullKey)}
												disabled={loading}
												style={dangerButtonStyle}
											>
												Delete
											</button>
										</div>
									</div>
								))}
							</div>
						)}
					</div>

					<div className='site-card' style={{ marginTop: '24px' }}>
						<h2>Rate Limits</h2>
						<p><strong>Public (no key):</strong> 60 requests/min per IP</p>
						<p><strong>With API key:</strong> 600 requests/min</p>
						<p style={{ marginTop: '8px', opacity: 0.7 }}>
							Configure via TRANSIT_PUBLIC_RPM, TRANSIT_KEY_RPM, and TRANSIT_RATE_WINDOW_MS
						</p>
					</div>
				</>
			)}
		</section>
	);
}
