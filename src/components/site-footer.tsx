import Link from 'next/link';

export default function SiteFooter() {
	return (
		<footer className='site-footer'>
			<div className='site-footer-inner'>
				<div className='site-footer-brand'>
					<span className='site-footer-mark' aria-hidden='true' />
					<span>trainETA.com</span>
				</div>
				<p className='site-footer-copy'>
					Live subway telemetry powered by GTFS-RT. Built for explorers, planners, and commuters.
				</p>
				<div className='site-footer-links'>
					<Link href='/outages'>Outages</Link>
					<Link href='/docs'>API Docs</Link>
					<Link href='/about'>About</Link>
					<Link href='/status'>Status</Link>
				</div>
				<p className='site-footer-copy' style={{ marginTop: '16px', opacity: 0.5 }}>
					© 2026 David Aharoni
				</p>
			</div>
		</footer>
	);
}
