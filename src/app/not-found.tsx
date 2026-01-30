import Link from 'next/link';

export default function NotFound() {
	return (
		<main className='subway-map-page'>
			<section className='subway-map-hero'>
				<div className='subway-map-hero-inner'>
					<div>
						<p className='subway-map-kicker'>404</p>
						<h1 className='subway-map-title'>Page not found</h1>
						<p className='subway-map-subtitle'>
							The page you’re looking for doesn’t exist. Head back to the live map.
						</p>
					</div>
					<Link className='subway-map-line-button' href='/'>
						Go to live map
					</Link>
				</div>
			</section>
		</main>
	);
}
