import { postJSON } from "../api/api.js";

const vertexesToPath = (vs = []) => {
  const path = [];
  for (let i = 0; i < vs.length - 1; i += 2) {
    const x = +vs[i], y = +vs[i + 1];
    if (Number.isFinite(x) && Number.isFinite(y)) path.push({ lat: y, lng: x });
  }
  return path;
};

const boundToLatLng = (b) =>
  b ? ({ minLat: b.min_y, minLng: b.min_x, maxLat: b.max_y, maxLng: b.max_x }) : null;

const normalizeDirections = (resp) => {
  const r0 = resp?.routes?.[0];
  if (!r0) return { summary: null, path: [], bound: null };

  const path = [];
  (r0.sections || []).forEach((sec) =>
    (sec.roads || []).forEach((rd) => {
      path.push(...vertexesToPath(rd.vertexes || []));
    })
  );

  return {
    summary: r0.summary || null,
    path,
    bound: boundToLatLng(r0.summary?.bound),
  };
};

// 자동차 길찾기
export async function fetchCarDirections(origin, destination) {
  const body = {
    origin: { x: origin.lng, y: origin.lat, name: "출발" },
    destination: { x: destination.lng, y: destination.lat, name: "도착" },
  };
  const data = await postJSON("/geo/car/directions", body, "DIR");
  return normalizeDirections(data);
}

// (선택) 경유지 길찾기
export async function fetchCarWaypointsDirections(origin, destination, waypoints = []) {
  const body = {
    origin: { x: origin.lng, y: origin.lat, name: "출발" },
    destination: { x: destination.lng, y: destination.lat, name: "도착" },
    waypoints: waypoints.map((w) => ({ x: w.lng, y: w.lat, name: w.name || "" })),
  };
  const data = await postJSON("/geo/car/waypoints-directions", body, "DIR");
  return normalizeDirections(data);
}
