import type { Metadata } from 'next';

export const metadata: Metadata = {
	title: 'trainETA.com — LIRR Live Map',
	description:
		'Track Long Island Rail Road trains in real-time with live MTA GTFS-RT feeds. See train positions and station info.',
	keywords: [
		'LIRR',
		'Long Island Rail Road',
		'real-time rail',
		'train tracker',
		'LIRR map',
		'NYC commuter rail',
		'live train positions',
	],
	openGraph: {
		title: 'trainETA.com — LIRR Live Map',
		description: 'Track LIRR trains in real-time. See positions and station info.',
		type: 'website',
		locale: 'en_US',
	},
	twitter: {
		card: 'summary_large_image',
		title: 'trainETA.com — LIRR Live Map',
		description: 'Track LIRR trains in real-time with live MTA feeds.',
	},
	robots: {
		index: true,
		follow: true,
	},
};

export default function LirrMapLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return <>{children}</>;
}
