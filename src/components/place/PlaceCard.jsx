import { kmConverter } from "../../lib/utils";
import { useLocation } from "wouter";

function getLatLng(place) {
  const lat = typeof place?.location?.lat === "number" ? place.location.lat
            : typeof place?.lat === "number" ? place.lat : null;
  const lng = typeof place?.location?.lng === "number" ? place.location.lng
            : typeof place?.lng === "number" ? place.lng : null;
  return { lat, lng };
}

export default function PlaceCard({ place, layout = "card" }) {
  const [, navigate] = useLocation();
  if (!place) return null;

  const isCard = layout === "card";

  const onClick = () => {
    const name = (place.name ?? "").trim();
    const { lat, lng } = getLatLng(place);

    const qs = new URLSearchParams();
    if (name) qs.set("directions", name);  // ← MainPage2가 읽는 키와 일치
    if (typeof lat === "number" && typeof lng === "number") {
      qs.set("dlat", String(lat));
      qs.set("dlng", String(lng));
    }
    if (place.id != null) qs.set("did", String(place.id));

    navigate(`/?${qs.toString()}`);
  };

  const StatusPill = () =>
    place.isOpenNow != null && (
      <span
        className={
          "ml-2 inline-flex items-center whitespace-nowrap text-xs px-2 py-0.5 rounded-full ring-1 " +
          (place.isOpenNow
            ? "bg-sky-100 text-sky-500 ring-sky-300"
            : "bg-slate-100 text-slate-600 ring-slate-300")
        }
      >
        {place.isOpenNow ? "영업중" : "마감"}
      </span>
    );

  const MetaRow = () => (
    <div className="text-sm text-slate-600 flex flex-wrap items-center gap-x-3 gap-y-1">
      <span className="inline-flex items-center gap-1">
        <span aria-hidden>📍</span>
        {kmConverter(place.distanceMeters)}
      </span>
      <span className="inline-flex items-center gap-1">
        <span aria-hidden>⏱</span>
        {place.etaMinutes ?? "?"}분
      </span>
      {place.rating != null && (
        <span className="inline-flex items-center gap-1">
          <span aria-hidden>⭐</span>
          {Number(place.rating).toFixed(1)}
        </span>
      )}
      {place.priceTier && <span className="opacity-80">{place.priceTier}</span>}
    </div>
  );

  const Tags = () =>
    Array.isArray(place.tags) && place.tags.length > 0 && (
      <div className="flex flex-wrap gap-1.5">
        {place.tags.slice(0, 4).map((t) => (
          <span
            key={t}
            className="text-xs text-sky-900/70 bg-blue-100/85 ring-1 ring-blue-200 px-2 py-0.5 rounded-full"
          >
            {t}
          </span>
        ))}
      </div>
    );

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      className={
        isCard
          ? "group relative rounded-2xl p-[1px] bg-slate-100 shadow-sm hover:shadow-md transition-all duration-300"
          : "group flex items-center gap-3 py-3 hover:bg-gray-50 focus:bg-gray-50 rounded-xl px-2 transition"
      }
    >
      {isCard ? (
        <div className="rounded-2xl bg-white/85 backdrop-blur overflow-hidden ring-1 ring-sky-100">
          <div className="relative aspect-[16/7] w-full bg-sky-50">
            {place.heroImage ? (
              <img
                src={place.heroImage}
                alt={place.name || "장소 이미지"}
                loading="lazy"
                decoding="async"
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.01]"
              />
            ) : (
              <div className="w-full h-full" />
            )}
          </div>

          <div className="p-8 space-y-2.5 bg-sky-50/50">
            <div className="flex items-start justify-between gap-3">
              <h4 className="font-semibold tracking-tight text-slate-900 truncate">
                {place.name}
              </h4>
              <StatusPill />
            </div>
            <MetaRow />
            <Tags />
          </div>
        </div>
      ) : (
        <>
          <div className="relative w-24 h-16 rounded-xl overflow-hidden bg-sky-50 ring-1 ring-sky-100 shrink-0">
            {place.heroImage ? (
              <img
                src={place.heroImage}
                alt={place.name || "장소 이미지"}
                loading="lazy"
                decoding="async"
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-sky-100 to-cyan-100" />
            )}
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-sky-900/15 via-transparent to-transparent" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <h4 className="font-medium text-slate-900 truncate">{place.name}</h4>
              <StatusPill />
            </div>
            <MetaRow />
            <Tags />
          </div>
        </>
      )}
    </div>
  );
}
