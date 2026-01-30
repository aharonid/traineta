'use client';

export default function SubwayMapLoading() {
	return (
		<main className="subway-map-loading">
			<section className="subway-map-loading-hero">
				<div className="subway-map-loading-hero-inner">
					<div className="skeleton skeleton-kicker" />
					<div className="skeleton skeleton-title" />
					<div className="skeleton skeleton-subtitle" />
				</div>
				<div className="skeleton skeleton-status" />
			</section>

			<section className="subway-map-loading-controls">
				<div className="subway-map-loading-controls-row">
					{Array.from({ length: 12 }).map((_, i) => (
						<div key={i} className="skeleton skeleton-button" />
					))}
				</div>
			</section>

			<section className="subway-map-loading-canvas">
				<div className="skeleton skeleton-map" />
			</section>

			<style jsx>{`
				.subway-map-loading {
					padding: 2rem;
					max-width: 1200px;
					margin: 0 auto;
				}

				.skeleton {
					background: linear-gradient(
						90deg,
						rgba(255, 255, 255, 0.05) 25%,
						rgba(255, 255, 255, 0.1) 50%,
						rgba(255, 255, 255, 0.05) 75%
					);
					background-size: 200% 100%;
					animation: shimmer 1.5s infinite;
					border-radius: 4px;
				}

				@keyframes shimmer {
					0% {
						background-position: 200% 0;
					}
					100% {
						background-position: -200% 0;
					}
				}

				.subway-map-loading-hero {
					display: flex;
					justify-content: space-between;
					align-items: flex-start;
					margin-bottom: 2rem;
					gap: 1rem;
					flex-wrap: wrap;
				}

				.subway-map-loading-hero-inner {
					display: flex;
					flex-direction: column;
					gap: 0.75rem;
				}

				.skeleton-kicker {
					width: 120px;
					height: 16px;
				}

				.skeleton-title {
					width: 280px;
					height: 36px;
				}

				.skeleton-subtitle {
					width: 400px;
					height: 20px;
				}

				.skeleton-status {
					width: 180px;
					height: 40px;
				}

				.subway-map-loading-controls {
					margin-bottom: 2rem;
				}

				.subway-map-loading-controls-row {
					display: flex;
					gap: 0.5rem;
					flex-wrap: wrap;
				}

				.skeleton-button {
					width: 40px;
					height: 40px;
					border-radius: 50%;
				}

				.subway-map-loading-canvas {
					margin-top: 1rem;
				}

				.skeleton-map {
					width: 100%;
					height: 500px;
					border-radius: 12px;
				}

				@media (max-width: 600px) {
					.skeleton-title {
						width: 200px;
					}
					.skeleton-subtitle {
						width: 280px;
					}
					.skeleton-map {
						height: 300px;
					}
				}
			`}</style>
		</main>
	);
}
