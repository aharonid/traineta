import type { Metadata } from 'next';

export const metadata: Metadata = {
	title: 'trainETA.com — Real-Time Subway Map',
	description:
		'Track NYC subway trains in real-time with live MTA GTFS-RT feeds. See train positions, arrivals, and station info for all subway lines.',
	keywords: [
		'NYC subway',
		'MTA',
		'real-time subway',
		'train tracker',
		'subway map',
		'New York City transit',
		'live train positions',
	],
	openGraph: {
		title: 'trainETA.com — Real-Time Subway Map',
		description:
			'Track NYC subway trains in real-time. See positions, arrivals, and station info for all lines.',
		type: 'website',
		locale: 'en_US',
	},
	twitter: {
		card: 'summary_large_image',
		title: 'trainETA.com — Real-Time Subway Map',
		description: 'Track NYC subway trains in real-time with live MTA feeds.',
	},
	robots: {
		index: true,
		follow: true,
	},
};

export default function SubwayMapLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <>{children}</>;
}
