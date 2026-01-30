import Link from 'next/link';

const navItems = [
	{ href: '/', label: 'MTA' },
	{ href: '/lirr-map', label: 'LIRR' },
	{ href: '/outages', label: 'Outages' },
	{ href: '/about', label: 'About' },
	{ href: '/status', label: 'Status' },
];

export default function SiteHeader() {
	return (
		<header className='site-header'>
			<div className='site-header-inner'>
				<Link className='site-logo' href='/'>
					<span className='site-logo-mark' aria-hidden='true' />
					trainETA.com
				</Link>
				<nav className='site-nav' aria-label='Primary'>
					{navItems.map((item) => (
						<Link key={item.href} className='site-nav-link' href={item.href}>
							{item.label}
						</Link>
					))}
				</nav>
			</div>
		</header>
	);
}
