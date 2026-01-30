import type { Metadata } from 'next';
import { DM_Sans, Cormorant_Garamond } from 'next/font/google';
import './globals.css';
import SiteHeader from '@/components/site-header';
import SiteFooter from '@/components/site-footer';

const dmSans = DM_Sans({
	subsets: ['latin'],
	variable: '--font-body',
	display: 'swap',
});

const cormorantGaramond = Cormorant_Garamond({
	subsets: ['latin'],
	weight: ['500', '600', '700'],
	variable: '--font-heading',
	display: 'swap',
});

export const metadata: Metadata = {
	title: 'trainETA.com — Real-Time Subway Map',
	description:
		'Real-time NYC subway train tracker powered by MTA GTFS-RT feeds. Live positions and arrivals across all subway lines.',
	openGraph: {
		title: 'trainETA.com — Real-Time Subway Map',
		description: 'Real-time NYC subway train tracker with live train positions.',
		type: 'website',
	},
	twitter: {
		card: 'summary_large_image',
		title: 'trainETA.com — Real-Time Subway Map',
		description: 'Real-time NYC subway train tracker with live train positions.',
	},
	robots: {
		index: true,
		follow: true,
	},
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang='en'>
			<body className={`${dmSans.variable} ${cormorantGaramond.variable} bg-[#0b0f13] text-white antialiased`}>
				<div className='site-shell'>
					<SiteHeader />
					<main className='site-main'>{children}</main>
					<SiteFooter />
				</div>
			</body>
		</html>
	);
}
