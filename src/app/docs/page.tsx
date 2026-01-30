export default function DocsPage() {
	return (
		<section className='site-page'>
			<span className='pill'>API Docs</span>
			<h1>Transit API</h1>
			<p>Real‑time NYC subway and LIRR train positions, free for non‑commercial use.</p>

			<div className='site-card' style={{ marginTop: '24px' }}>
				<h2>Rate limits</h2>
				<p>
					<strong>Without API key:</strong> 60 requests/min per IP
				</p>
				<p>
					<strong>With API key:</strong> 600 requests/min
				</p>
				<p style={{ marginTop: '12px', opacity: 0.7 }}>
					Commercial use or higher limits? Contact us for an API key.
				</p>
			</div>

			<div className='site-card' style={{ marginTop: '16px' }}>
				<h2>Authentication</h2>
				<p>API keys are optional for public access. If you have one, include it via:</p>
				<pre style={{ marginTop: '12px', padding: '12px', background: 'rgba(0,0,0,0.3)', borderRadius: '8px', overflow: 'auto' }}>
{`x-client-key: YOUR_KEY
# or
Authorization: Bearer YOUR_KEY`}
				</pre>
			</div>

			<div className='site-card' style={{ marginTop: '24px' }}>
				<h2>GET /api/transit/mta</h2>
				<p>Live subway train positions across all lines.</p>
				<pre style={{ marginTop: '12px', padding: '12px', background: 'rgba(0,0,0,0.3)', borderRadius: '8px', overflow: 'auto' }}>
{`curl https://trainETA.com/api/transit/mta`}
				</pre>
				<p style={{ marginTop: '12px' }}><strong>Response:</strong></p>
				<pre style={{ marginTop: '8px', padding: '12px', background: 'rgba(0,0,0,0.3)', borderRadius: '8px', overflow: 'auto', fontSize: '13px' }}>
{`{
  "ok": true,
  "activeStops": [
    {
      "lineId": "A",
      "trainId": "A01",
      "stopId": "A24",
      "stationName": "34 St-Penn Station",
      "coords": [-73.9912, 40.7527],
      "status": "stopped",
      "nextStopId": "A25",
      "nextStationName": "23 St",
      "arrivalTime": 1704067200000
    }
  ]
}`}
				</pre>
			</div>

			<div className='site-card' style={{ marginTop: '16px' }}>
				<h2>GET /api/transit/lirr</h2>
				<p>Live LIRR train positions. Same response shape as the subway endpoint.</p>
				<pre style={{ marginTop: '12px', padding: '12px', background: 'rgba(0,0,0,0.3)', borderRadius: '8px', overflow: 'auto' }}>
{`curl https://trainETA.com/api/transit/lirr`}
				</pre>
			</div>

			<div className='site-card' style={{ marginTop: '16px' }}>
				<h2>GET /api/status</h2>
				<p>Service health and feed freshness.</p>
				<pre style={{ marginTop: '12px', padding: '12px', background: 'rgba(0,0,0,0.3)', borderRadius: '8px', overflow: 'auto' }}>
{`curl https://trainETA.com/api/status`}
				</pre>
				<p style={{ marginTop: '12px' }}><strong>Response:</strong></p>
				<pre style={{ marginTop: '8px', padding: '12px', background: 'rgba(0,0,0,0.3)', borderRadius: '8px', overflow: 'auto', fontSize: '13px' }}>
{`{
  "ok": true,
  "timestamp": "2024-01-01T12:00:00.000Z",
  "feedConfigured": true,
  "hasMetrics": true,
  "metrics": {
    "updatedAt": 1704110400000,
    "feedTimestamp": 1704110395000,
    "activeStopsCount": 1355,
    "arrivingCount": 328,
    "stoppedCount": 334,
    "inTransitCount": 693,
    "linesActive": { "A": 84, "1": 53, ... }
  }
}`}
				</pre>
			</div>

			<div className='site-card' style={{ marginTop: '24px' }}>
				<h2>Error responses</h2>
				<p><strong>429 Too Many Requests</strong> — Rate limit exceeded. Check <code>Retry-After</code> header.</p>
				<p><strong>401 Unauthorized</strong> — Invalid API key provided.</p>
				<p><strong>503 Service Unavailable</strong> — Feed temporarily unavailable.</p>
			</div>
		</section>
	);
}
