import { uid } from "../lib/utils.js";

export function normalizePlaceData(raw) {
  return {
    id: raw.id ?? uid(),
    name: raw.name ?? "",
    heroImage: raw.heroImage ?? raw.image_url ?? null,
    rating: raw.rating ?? null,
    tags: raw.tags ?? [],
    isOpenNow: raw.isOpenNow ?? raw.is_open ?? null,
    distanceMeters: raw.distanceMeters ?? raw.distance ?? null,
    etaMinutes: raw.etaMinutes ?? raw.eta ?? null,
    priceTier: raw.priceTier ?? raw.price_level ?? null,
    hours: raw.hours ?? null,
    url: raw.url ?? raw.website ?? null,
    phone: raw.phone ?? null,
    location: raw.location ?? raw.geometry?.location ?? null,
  };
}

export function makeMockPlaces(kind, count = 15) {
  const label = kind === "food" ? "맛집" : "관광지";
  return Array.from({ length: count }).map((_, i) =>
    normalizePlaceData({
      id: uid(),
      name: `부산 ${label} ${i + 1}`,
      heroImage: `https://picsum.photos/seed/${kind}-${i}/800/450`,
      rating: Math.round((4 + Math.random()) * 10) / 10,
      tags: kind === "food" ? ["로컬", "가성비", "분위기"] : ["뷰맛집", "산책", "포토"],
      isOpenNow: Math.random() > 0.5,
      distanceMeters: 500 + Math.floor(Math.random() * 2500),
      etaMinutes: 5 + Math.floor(Math.random() * 20),
      priceTier: ["₩", "₩₩", "₩₩₩"][Math.floor(Math.random() * 3)],
      hours: "10:00–22:00",
      url: "https://example.com",
      phone: "051-000-0000",
      location: { lat: 35.18 + Math.random() * 0.02, lng: 129.07 + Math.random() * 0.02 },
    })
  );
}
