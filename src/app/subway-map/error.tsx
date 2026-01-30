'use client';

import { useEffect } from 'react';

export default function SubwayMapError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        // Log error to console in development
        console.error('Subway map error:', error);
    }, [error]);

    return (
        <main className="subway-map-error">
            <div className="subway-map-error-content">
                <h1>Something went wrong</h1>
                <p>Unable to load the subway map. This could be due to a temporary issue with the MTA feed.</p>
                <div className="subway-map-error-actions">
                    <button
                        onClick={reset}
                        className="subway-map-error-button"
                    >
                        Try Again
                    </button>
                    <a href="/subway-map" className="subway-map-error-link">
                        Return to Subway Map
                    </a>
                </div>
                {process.env.NODE_ENV === 'development' && error.message && (
                    <details className="subway-map-error-details">
                        <summary>Error Details</summary>
                        <pre>{error.message}</pre>
                        {error.digest && <p>Error ID: {error.digest}</p>}
                    </details>
                )}
            </div>
            <style jsx>{`
				.subway-map-error {
					min-height: 60vh;
					display: flex;
					align-items: center;
					justify-content: center;
					padding: 2rem;
				}
				.subway-map-error-content {
					text-align: center;
					max-width: 400px;
				}
				.subway-map-error-content h1 {
					font-size: 1.5rem;
					margin-bottom: 0.5rem;
					color: var(--foreground, #fff);
				}
				.subway-map-error-content p {
					color: var(--muted-foreground, #888);
					margin-bottom: 1.5rem;
				}
				.subway-map-error-actions {
					display: flex;
					gap: 1rem;
					justify-content: center;
					flex-wrap: wrap;
				}
				.subway-map-error-button {
					padding: 0.75rem 1.5rem;
					background: #0070f3;
					color: white;
					border: none;
					border-radius: 8px;
					cursor: pointer;
					font-weight: 500;
					transition: background 0.2s;
				}
				.subway-map-error-button:hover {
					background: #0060df;
				}
				.subway-map-error-link {
					padding: 0.75rem 1.5rem;
					color: #0070f3;
					text-decoration: none;
					border: 1px solid #0070f3;
					border-radius: 8px;
					transition: background 0.2s;
				}
				.subway-map-error-link:hover {
					background: rgba(0, 112, 243, 0.1);
				}
				.subway-map-error-details {
					margin-top: 2rem;
					text-align: left;
					background: rgba(255, 0, 0, 0.1);
					padding: 1rem;
					border-radius: 8px;
				}
				.subway-map-error-details summary {
					cursor: pointer;
					color: #ff6b6b;
				}
				.subway-map-error-details pre {
					overflow-x: auto;
					font-size: 0.75rem;
					margin-top: 0.5rem;
					color: #ff6b6b;
				}
			`}</style>
        </main>
    );
}
