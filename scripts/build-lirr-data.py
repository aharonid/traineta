#!/usr/bin/env python3
import argparse
import csv
import io
import json
import os
import tempfile
import urllib.request
import zipfile


def read_csv_from_zip(zf: zipfile.ZipFile, filename: str):
    if filename not in zf.namelist():
        raise FileNotFoundError(f"Missing {filename} in GTFS zip")
    with zf.open(filename) as raw:
        text = io.TextIOWrapper(raw, encoding="utf-8-sig")
        return list(csv.DictReader(text))


def normalize_hex(value):
    if not value:
        return None
    value = value.strip()
    if not value:
        return None
    if not value.startswith("#"):
        value = f"#{value}"
    if len(value) in (4, 7):
        return value.upper()
    return None


def slugify(value: str):
    value = value.lower()
    out = []
    last_dash = False
    for ch in value:
        if ch.isalnum():
            out.append(ch)
            last_dash = False
        else:
            if not last_dash:
                out.append("-")
                last_dash = True
    slug = "".join(out).strip("-")
    return slug


def load_zip(path: str):
    return zipfile.ZipFile(path, "r")


def download_to_temp(url: str):
    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".zip")
    tmp.close()
    with urllib.request.urlopen(url) as response:
        with open(tmp.name, "wb") as f:
            f.write(response.read())
    return tmp.name


def main():
    parser = argparse.ArgumentParser(description="Build LIRR stop + line data from a GTFS static zip.")
    parser.add_argument("--zip", dest="zip_path", help="Path to GTFS static zip file.")
    parser.add_argument("--url", dest="zip_url", help="URL to GTFS static zip file.")
    parser.add_argument("--out-dir", dest="out_dir", default="src/lib/data", help="Output directory for JSON files.")
    args = parser.parse_args()

    if not args.zip_path and not args.zip_url:
        parser.error("Provide --zip or --url")
    if args.zip_path and args.zip_url:
        parser.error("Provide only one of --zip or --url")

    zip_path = args.zip_path
    temp_path = None
    if args.zip_url:
        temp_path = download_to_temp(args.zip_url)
        zip_path = temp_path

    try:
        with load_zip(zip_path) as zf:
            stops_rows = read_csv_from_zip(zf, "stops.txt")
            routes_rows = read_csv_from_zip(zf, "routes.txt")
            trips_rows = read_csv_from_zip(zf, "trips.txt")
            stop_times_rows = read_csv_from_zip(zf, "stop_times.txt")

        stops = {}
        for row in stops_rows:
            stop_id = row.get("stop_id")
            if not stop_id:
                continue
            try:
                lat = float(row.get("stop_lat", ""))
                lng = float(row.get("stop_lon", ""))
            except ValueError:
                continue
            name = row.get("stop_name") or stop_id
            stops[stop_id] = {"name": name, "coords": [lat, lng]}

        routes = {}
        for row in routes_rows:
            route_id = row.get("route_id")
            if not route_id:
                continue
            routes[route_id] = {
                "routeId": route_id,
                "shortName": row.get("route_short_name") or "",
                "longName": row.get("route_long_name") or "",
                "color": normalize_hex(row.get("route_color")),
                "textColor": normalize_hex(row.get("route_text_color")),
                "slug": slugify(row.get("route_short_name") or row.get("route_long_name") or route_id),
            }

        headsign_counts = {}
        trip_route = {}
        for row in trips_rows:
            trip_id = row.get("trip_id")
            route_id = row.get("route_id")
            direction_id = row.get("direction_id")
            headsign = (row.get("trip_headsign") or row.get("trip_short_name") or "").strip()
            if not trip_id or not route_id:
                continue
            trip_route[trip_id] = route_id
            if route_id and direction_id in ("0", "1") and headsign:
                route_map = headsign_counts.setdefault(route_id, {})
                dir_map = route_map.setdefault(direction_id, {})
                dir_map[headsign] = dir_map.get(headsign, 0) + 1

        trip_stops = {}
        for row in stop_times_rows:
            trip_id = row.get("trip_id")
            stop_id = row.get("stop_id")
            if not trip_id or not stop_id:
                continue
            try:
                seq = int(row.get("stop_sequence") or 0)
            except ValueError:
                seq = 0
            trip_stops.setdefault(trip_id, []).append((seq, stop_id))

        best_trip_by_route = {}
        for trip_id, stops_list in trip_stops.items():
            route_id = trip_route.get(trip_id)
            if not route_id:
                continue
            count = len(stops_list)
            best = best_trip_by_route.get(route_id)
            if not best or count > int(best["count"]):
                best_trip_by_route[route_id] = {"trip_id": trip_id, "count": count}

        line_stops = {}
        stop_lines = {}
        for route_id, meta in best_trip_by_route.items():
            trip_id = meta["trip_id"]
            stops_list = trip_stops.get(trip_id, [])
            stops_list.sort(key=lambda x: x[0])
            ordered = []
            seen = set()
            for _, stop_id in stops_list:
                if stop_id in seen:
                    continue
                stop = stops.get(stop_id)
                if not stop:
                    continue
                ordered.append({"stopId": stop_id, "name": stop["name"], "coords": stop["coords"]})
                seen.add(stop_id)
                stop_lines.setdefault(stop_id, set()).add(route_id)
            line_stops[route_id] = ordered

        direction_labels = {}
        for route_id, dir_map in headsign_counts.items():
            labels = {}
            for dir_id, headsigns in dir_map.items():
                label = max(headsigns.items(), key=lambda item: item[1])[0]
                labels[dir_id] = label
            if labels:
                direction_labels[route_id] = labels

        out_dir = args.out_dir
        os.makedirs(out_dir, exist_ok=True)

        lirr_stops = {}
        for stop_id, stop in stops.items():
            lines = sorted(stop_lines.get(stop_id, []))
            record = {"name": stop["name"], "coords": stop["coords"]}
            if lines:
                record["lines"] = lines
            lirr_stops[stop_id] = record

        with open(os.path.join(out_dir, "lirr-stops.json"), "w", encoding="utf-8") as f:
            json.dump(lirr_stops, f, ensure_ascii=True, separators=(",", ":"))

        with open(os.path.join(out_dir, "lirr-line-stops.json"), "w", encoding="utf-8") as f:
            json.dump(line_stops, f, ensure_ascii=True, separators=(",", ":"))

        route_list = [routes[route_id] for route_id in line_stops.keys() if route_id in routes]
        with open(os.path.join(out_dir, "lirr-routes.json"), "w", encoding="utf-8") as f:
            json.dump(route_list, f, ensure_ascii=True, separators=(",", ":"))

        with open(os.path.join(out_dir, "lirr-direction-labels.json"), "w", encoding="utf-8") as f:
            json.dump(direction_labels, f, ensure_ascii=True, separators=(",", ":"))
    finally:
        if temp_path and os.path.exists(temp_path):
            os.remove(temp_path)


if __name__ == "__main__":
    main()
