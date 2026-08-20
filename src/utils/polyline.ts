/**
 * Google Encoded Polyline decoder.
 *
 * The server persists an errand's road-network route as an encoded polyline on
 * `Errand.routeGeometry` (whichever engine produced it — OSRM and Google both
 * emit this format), so the dispatcher can draw the exact route the fare was
 * calculated from rather than a straight line between pins.
 */
export interface LatLngLiteral {
  lat: number;
  lng: number;
}

export function decodePolyline(encoded: string, precision = 5): LatLngLiteral[] {
  if (!encoded) return [];

  const factor = Math.pow(10, precision);
  const points: LatLngLiteral[] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let shift = 0;
    let result = 0;
    let byte: number;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    lat += result & 1 ? ~(result >> 1) : result >> 1;

    shift = 0;
    result = 0;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    lng += result & 1 ? ~(result >> 1) : result >> 1;

    points.push({ lat: lat / factor, lng: lng / factor });
  }

  return points;
}
