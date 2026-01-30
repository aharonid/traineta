export type TransitMetrics = {
	updatedAt: number;
	feedTimestamp: number;
	activeStopsCount: number;
	arrivingCount: number;
	stoppedCount: number;
	inTransitCount: number;
	linesActive: Record<string, number>;
};

let lastMetrics: TransitMetrics | null = null;

export const setLastMetrics = (metrics: TransitMetrics) => {
	lastMetrics = metrics;
};

export const getLastMetrics = () => lastMetrics;
