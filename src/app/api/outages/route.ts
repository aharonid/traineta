import { NextResponse } from 'next/server';
import mtaStops from '@/lib/data/mta-stops.json';

type MtaStopRecord = {
  name: string;
  coords: [number, number];
  lines?: string[];
};

type OutageRecord = {
  id: string;
  stationName?: string;
  location?: string;
  stopId?: string;
  equipmentId?: string;
  equipmentType?: string;
  equipmentName?: string;
  lines?: string[];
  direction?: string;
  borough?: string;
  status?: string;
  reason?: string;
  description?: string;
  start?: number;
  end?: number;
};

type OutagePayload = {
  ok: boolean;
  updatedAt: number;
  feedTimestamp?: number;
  current: OutageRecord[];
  upcoming: OutageRecord[];
  equipment: OutageRecord[];
  error?: string;
};

const asStopMap = mtaStops as unknown as Record<string, MtaStopRecord>;
const CACHE_TTL_MS = 30000;
let cached:
  | {
    timestamp: number;
    payload: OutagePayload;
    status: number;
  }
  | undefined;
let inFlight: Promise<{ payload: OutagePayload; status: number }> | null = null;

const normalizeStopId = (stopId: string): string[] => {
  const candidates = [stopId];
  if (stopId.length > 0) {
    const trimmed = stopId.replace(/[NSEW]$/i, '');
    if (trimmed !== stopId) candidates.push(trimmed);
  }
  return candidates;
};

const resolveStopInfo = (stopId?: string) => {
  if (!stopId) return { stopId: undefined, stationName: undefined, lines: undefined };
  for (const candidate of normalizeStopId(stopId)) {
    if (asStopMap[candidate]) {
      return {
        stopId: candidate,
        stationName: asStopMap[candidate].name,
        lines: asStopMap[candidate].lines,
      };
    }
  }
  return { stopId, stationName: undefined, lines: undefined };
};

const asString = (value: unknown): string | undefined => {
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  return undefined;
};

const pickString = (obj: Record<string, unknown> | undefined, keys: string[]): string | undefined => {
  if (!obj) return undefined;
  for (const key of keys) {
    const value = asString(obj[key]);
    if (value) return value;
  }
  return undefined;
};

const pick = (obj: Record<string, unknown> | undefined, keys: string[]) => {
  if (!obj) return undefined;
  for (const key of keys) {
    if (obj[key] != null) return obj[key];
  }
  return undefined;
};

const asTimestamp = (value: unknown): number | undefined => {
  if (value == null) return undefined;
  if (typeof value === 'number') return value > 1_000_000_000_000 ? value : value * 1000;
  const str = asString(value);
  if (!str) return undefined;
  const parsed = Date.parse(str);
  if (!Number.isNaN(parsed)) return parsed;
  const numeric = Number(str);
  if (!Number.isNaN(numeric)) return numeric > 1_000_000_000_000 ? numeric : numeric * 1000;
  return undefined;
};

const parseLines = (value: unknown): string[] | undefined => {
  if (!value) return undefined;
  if (Array.isArray(value)) return value.map((item) => String(item)).filter(Boolean);
  if (typeof value === 'string') {
    return value
      .split(/[,/\s]+/)
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return undefined;
};

const getTranslationText = (value: unknown): string | undefined => {
  if (!value) return undefined;
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && value) {
    const translation = (value as { translation?: Array<{ text?: string }> }).translation;
    if (Array.isArray(translation)) {
      return translation.map((entry) => entry?.text).filter(Boolean).join(' ');
    }
  }
  return undefined;
};

const extractRecords = (data: any): any[] => {
  if (!data) return [];
  if (Array.isArray(data.entity)) return data.entity;
  if (Array.isArray(data.outages)) return data.outages;
  if (Array.isArray(data.equipments)) return data.equipments;
  if (Array.isArray(data.equipment)) return data.equipment;
  if (Array.isArray(data.data)) return data.data;
  if (Array.isArray(data)) return data;
  return [];
};

const normalizeAlert = (entity: any, source: string, index: number): OutageRecord | null => {
  const alert = entity?.alert;
  if (!alert) return null;
  const informed = Array.isArray(alert.informedEntity) ? alert.informedEntity[0] : undefined;
  const rawStopId = asString(informed?.stopId) || asString(informed?.stop_id);
  const stopInfo = resolveStopInfo(rawStopId || undefined);
  const facility = informed?.facility || alert.facility || {};
  const equipmentId =
    pickString(facility, ['equipmentId', 'equipment_id', 'id']) ||
    pickString(alert, ['equipmentId', 'equipment_id']) ||
    pickString(entity, ['equipmentId', 'equipment_id']);
  const equipmentType =
    pickString(facility, ['equipmentType', 'equipment_type', 'type']) ||
    pickString(alert, ['equipmentType', 'equipment_type', 'type']);
  const equipmentName =
    pickString(facility, ['equipmentName', 'equipment_name', 'name', 'description']) ||
    pickString(alert, ['equipmentName', 'equipment_name']);
  const description = getTranslationText(alert.descriptionText) || getTranslationText(alert.headerText);
  const status = pickString(alert, ['effect', 'transitEffect', 'status']);
  const reason = pickString(alert, ['cause', 'reason']);
  const direction = pickString(facility, ['direction']) || pickString(informed, ['direction']);
  const borough = pickString(alert, ['borough']);
  const activePeriod = Array.isArray(alert.activePeriod) ? alert.activePeriod[0] : undefined;
  const start = asTimestamp(activePeriod?.start ?? activePeriod?.startTime ?? alert.start);
  const end = asTimestamp(activePeriod?.end ?? activePeriod?.endTime ?? alert.end);
  const lines = stopInfo.lines || parseLines(informed?.routeId);
  const location = pickString(alert, ['location', 'station', 'stop_name']) || stopInfo.stationName;

  return {
    id: String(entity?.id || equipmentId || `${source}-${index}`),
    stationName: stopInfo.stationName,
    location,
    stopId: stopInfo.stopId,
    equipmentId,
    equipmentType,
    equipmentName,
    lines,
    direction,
    borough,
    status,
    reason,
    description,
    start,
    end,
  };
};

const normalizeRecord = (record: any, source: string, index: number): OutageRecord => {
  const rawStopId = pickString(record, ['stopId', 'stop_id', 'station_id', 'stationId', 'gtfs_stop_id']);
  const stopInfo = resolveStopInfo(rawStopId || undefined);
  const location =
    pickString(record, ['station', 'station_name', 'stop_name', 'location', 'name']) || stopInfo.stationName;
  const equipmentId = pickString(record, ['equipmentId', 'equipment_id', 'asset_id', 'facility_id', 'id']);
  const equipmentType = pickString(record, ['equipmentType', 'equipment_type', 'type', 'equipment']);
  const equipmentName = pickString(record, ['equipmentName', 'equipment_name', 'name', 'description']);
  const lines = parseLines(pick(record, ['lines', 'line', 'route', 'routes', 'serving', 'serves', 'line_id'])) || stopInfo.lines;
  const direction = pickString(record, ['direction', 'dir']);
  const borough = pickString(record, ['borough']);
  const status = pickString(record, ['status', 'outage_status', 'availability', 'operationalStatus', 'state']);
  const reason = pickString(record, ['reason', 'cause', 'remarks', 'comment']);
  const description = pickString(record, ['description', 'details', 'notes', 'text']);
  const start = asTimestamp(pick(record, ['outage_start', 'start_time', 'start', 'effective_date', 'start_date']));
  const end = asTimestamp(pick(record, ['outage_end', 'end_time', 'end', 'estimated_return_to_service', 'end_date']));

  return {
    id: String(record?.id || equipmentId || `${source}-${index}`),
    stationName: stopInfo.stationName,
    location,
    stopId: stopInfo.stopId,
    equipmentId,
    equipmentType,
    equipmentName,
    lines,
    direction,
    borough,
    status,
    reason,
    description,
    start,
    end,
  };
};

const parseFeed = (data: any, source: string) => {
  const feedTimestamp = asTimestamp(data?.header?.timestamp ?? data?.header?.timestamp?.low ?? data?.timestamp);
  const records = extractRecords(data);
  const items = records
    .map((record, index) => {
      if (record?.alert) {
        return normalizeAlert(record, source, index);
      }
      return normalizeRecord(record, source, index);
    })
    .filter(Boolean) as OutageRecord[];
  return { items, feedTimestamp };
};

const fetchJson = async (url: string, apiKey?: string) => {
  const res = await fetch(url, {
    cache: 'no-store',
    headers: apiKey ? { 'x-api-key': apiKey } : undefined,
  });
  if (!res.ok) {
    throw new Error(`Feed error: ${res.status}`);
  }
  return res.json();
};

export async function GET() {
  const now = Date.now();
  if (cached && now - cached.timestamp < CACHE_TTL_MS) {
    return NextResponse.json(cached.payload, { status: cached.status });
  }

  if (inFlight) {
    const result = await inFlight;
    return NextResponse.json(result.payload, { status: result.status });
  }

  inFlight = (async () => {
    const apiKey = process.env.MTA_API_KEY;
    const currentUrl = process.env.MTA_OUTAGES_CURRENT_URL || 'https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fnyct_ene.json';
    const upcomingUrl = process.env.MTA_OUTAGES_UPCOMING_URL || 'https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fnyct_ene_upcoming.json';
    const equipmentUrl = process.env.MTA_OUTAGES_EQUIPMENT_URL || 'https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fnyct_ene_equipments.json';

    try {
      const results = await Promise.allSettled([
        fetchJson(currentUrl, apiKey),
        fetchJson(upcomingUrl, apiKey),
        fetchJson(equipmentUrl, apiKey),
      ]);

      const currentData = results[0].status === 'fulfilled' ? results[0].value : null;
      const upcomingData = results[1].status === 'fulfilled' ? results[1].value : null;
      const equipmentData = results[2].status === 'fulfilled' ? results[2].value : null;

      if (!currentData && !upcomingData && !equipmentData) {
        return {
          payload: {
            ok: false,
            updatedAt: Date.now(),
            current: [],
            upcoming: [],
            equipment: [],
            error: 'Feed fetch failed',
          },
          status: 502,
        };
      }

      const parsedCurrent = currentData ? parseFeed(currentData, 'current') : { items: [], feedTimestamp: undefined };
      const parsedUpcoming = upcomingData ? parseFeed(upcomingData, 'upcoming') : { items: [], feedTimestamp: undefined };
      const parsedEquipment = equipmentData ? parseFeed(equipmentData, 'equipment') : { items: [], feedTimestamp: undefined };
      const feedTimestamp = Math.max(
        parsedCurrent.feedTimestamp || 0,
        parsedUpcoming.feedTimestamp || 0,
        parsedEquipment.feedTimestamp || 0
      );

      return {
        payload: {
          ok: true,
          updatedAt: now,
          feedTimestamp: feedTimestamp || undefined,
          current: parsedCurrent.items,
          upcoming: parsedUpcoming.items,
          equipment: parsedEquipment.items,
        },
        status: 200,
      };
    } catch (error) {
      return {
        payload: {
          ok: false,
          updatedAt: Date.now(),
          current: [],
          upcoming: [],
          equipment: [],
          error: 'Feed fetch failed',
        },
        status: 502,
      };
    }
  })();

  const result = await inFlight;
  inFlight = null;
  if (result.status === 200) {
    cached = { timestamp: Date.now(), payload: result.payload, status: result.status };
  }
  return NextResponse.json(result.payload, { status: result.status });
}
