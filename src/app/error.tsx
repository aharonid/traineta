'use client';

import { useEffect } from 'react';

export default function GlobalError({
	error,
	reset,
}: {
	error: Error & { digest?: string };
	reset: () => void;
}) {
	useEffect(() => {
		console.error('Application error:', error);
	}, [error]);

	return (
		<section className="site-page" style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
			<span className="pill" style={{ background: 'rgba(248, 113, 113, 0.2)', color: '#fca5a5' }}>Error</span>
			<h1>Something went wrong</h1>
			<p style={{ color: 'var(--muted-foreground, #888)', marginBottom: '1.5rem', textAlign: 'center', maxWidth: '400px' }}>
				An unexpected error occurred. Please try again or return to the home page.
			</p>
			<div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
				<button
					onClick={reset}
					style={{
						padding: '0.75rem 1.5rem',
						background: 'rgba(255, 255, 255, 0.1)',
						color: 'white',
						border: '1px solid rgba(255, 255, 255, 0.2)',
						borderRadius: '999px',
						cursor: 'pointer',
						fontWeight: 500,
					}}
				>
					Try Again
				</button>
				<a
					href="/"
					style={{
						padding: '0.75rem 1.5rem',
						color: '#38bdf8',
						textDecoration: 'none',
						border: '1px solid rgba(56, 189, 248, 0.3)',
						borderRadius: '999px',
					}}
				>
					Return Home
				</a>
			</div>
			{process.env.NODE_ENV === 'development' && error.message && (
				<details style={{ marginTop: '2rem', textAlign: 'left', background: 'rgba(248, 113, 113, 0.1)', padding: '1rem', borderRadius: '8px', maxWidth: '500px', width: '100%' }}>
					<summary style={{ cursor: 'pointer', color: '#fca5a5' }}>Error Details</summary>
					<pre style={{ overflowX: 'auto', fontSize: '0.75rem', marginTop: '0.5rem', color: '#fca5a5' }}>{error.message}</pre>
					{error.digest && <p style={{ fontSize: '0.75rem', color: '#fca5a5', marginTop: '0.5rem' }}>Error ID: {error.digest}</p>}
				</details>
			)}
		</section>
	);
}
