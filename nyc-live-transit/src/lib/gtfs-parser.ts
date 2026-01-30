import GtfsRealtimeBindings from 'gtfs-realtime-bindings';

export interface Arrival {
  tripId: string;
  routeId: string;
  stopId: string;
  arrivalTime: number;
  departureTime: number;
  direction: 'N' | 'S' | null;
}

export interface FeedStatus {
  url: string;
  ok: boolean;
  entityCount: number;
  lastFetch: number;
}

// In-memory cache for feed data
const feedCache = new Map<string, { data: Arrival[]; timestamp: number; status: FeedStatus }>();
const CACHE_TTL = 5000; // 5 seconds

// Request deduplication
const pendingRequests = new Map<string, Promise<Arrival[]>>();

export async function fetchGtfsRealtimeFeed(url: string): Promise<Arrival[]> {
  const now = Date.now();
  const cached = feedCache.get(url);

  // Return cached data if fresh
  if (cached && now - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  // Deduplicate concurrent requests
  const pending = pendingRequests.get(url);
  if (pending) {
    return pending;
  }

  const request = (async () => {
    try {
      const response = await fetch(url, {
        headers: { 'Accept': 'application/x-protobuf' },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const buffer = await response.arrayBuffer();
      const feed = GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(
        new Uint8Array(buffer)
      );

      const arrivals: Arrival[] = [];

      for (const entity of feed.entity) {
        if (!entity.tripUpdate) continue;

        const tripUpdate = entity.tripUpdate;
        const routeId = tripUpdate.trip?.routeId || '';
        const tripId = tripUpdate.trip?.tripId || '';

        for (const stopTimeUpdate of tripUpdate.stopTimeUpdate || []) {
          const stopId = stopTimeUpdate.stopId || '';
          const arrivalTime = Number(stopTimeUpdate.arrival?.time || 0);
          const departureTime = Number(stopTimeUpdate.departure?.time || 0);

          // Determine direction from stop ID suffix (N/S)
          let direction: 'N' | 'S' | null = null;
          if (stopId.endsWith('N')) direction = 'N';
          else if (stopId.endsWith('S')) direction = 'S';

          if (arrivalTime > 0 || departureTime > 0) {
            arrivals.push({
              tripId,
              routeId,
              stopId,
              arrivalTime,
              departureTime,
              direction,
            });
          }
        }
      }

      // Update cache
      feedCache.set(url, {
        data: arrivals,
        timestamp: now,
        status: {
          url,
          ok: true,
          entityCount: feed.entity.length,
          lastFetch: now,
        },
      });

      return arrivals;
    } catch (error) {
      // Cache error status
      feedCache.set(url, {
        data: [],
        timestamp: now,
        status: {
          url,
          ok: false,
          entityCount: 0,
          lastFetch: now,
        },
      });
      throw error;
    } finally {
      pendingRequests.delete(url);
    }
  })();

  pendingRequests.set(url, request);
  return request;
}

export function getFeedStatuses(): FeedStatus[] {
  return Array.from(feedCache.values()).map(c => c.status);
}

export function getGtfsUrls(): string[] {
  const urls = process.env.MTA_GTFS_RT_URLS || '';
  return urls.split(',').filter(Boolean);
}
