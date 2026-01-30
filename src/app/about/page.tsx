export default function AboutPage() {
	return (
		<section className='site-page'>
			<span className='pill'>About</span>
			<h1>trainETA.com</h1>
			<p>
				This project visualizes live NYC subway activity using the MTA’s GTFS‑RT feeds. It’s built as a
				real-time map plus per-line station boards so commuters can see where trains are and what’s
				coming next.
			</p>
			<div className='site-grid cols-2' style={{ marginTop: '24px' }}>
				<div className='site-card'>
					<h2>What it shows</h2>
					<p>Live train positions, station stops, and arrival countdowns across all subway lines.</p>
				</div>
				<div className='site-card'>
					<h2>How it works</h2>
					<p>
						API routes fetch GTFS‑RT feeds, normalize the data, and cache results for a fast map
						experience.
					</p>
				</div>
			</div>

			<p style={{ marginTop: '24px', fontSize: '14px', opacity: 0.7 }}>
				Built by <a href='https://davidaharoni.com' target='_blank' rel='noopener noreferrer' style={{ color: '#38bdf8' }}>David Aharoni</a>
			</p>
		</section>
	);
}
