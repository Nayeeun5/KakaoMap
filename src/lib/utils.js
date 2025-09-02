import { useMemo } from "react";

export function kmConverter(meter) {
  if (meter == null) return "";
  return meter >= 1000 ? `${(meter / 1000).toFixed(1)}km` : `${meter}m`;
}

export function uid() {
  return (typeof crypto !== "undefined" && crypto.randomUUID)
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function useQueryParam(name) {
  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  return params.get(name) || "";
}

export function extractPlaceName(text) {
  const t = (text || "").replace(/[“”"']/g, "").trim();

  const m1 = t.match(/^(.*?)(의)?\s*(위치|지도|길찾기|주소)\s*$/);
  if (m1 && m1[1]?.trim()) return m1[1].trim();

  const m2 = t.match(/^(위치|지도|길찾기|주소)\s*(?:는|좀|좀만|좀요)?\s*(.*)$/);
  if (m2 && m2[2]?.trim()) return m2[2].trim();

  return t;
}

// 나중에 LLM으로 대체
export function detectIntent(text, mode = "main") {
  const t = (text || "").trim().toLowerCase();
  if (!t) return mode === "main" ? "none" : "general";

  const recommendHints = ["추천","근처","가까운","어디 갈까","어디가지","best","top","맛집","카페","공원","전시","박물관","명소","코스","루트"];

  if (recommendHints.some(k => t.includes(k))) {
    return mode === "main" ? "ai" : "places_recommend";
  }

  if (/(지도|길찾기|위치|주소)/.test(t))
    return mode === "main" ? "map" : "place_map";

  if (/(가격|가격대|얼마|비싸|저렴)/.test(t))
    return mode === "main" ? "ai" : "place_price";
  if (/(영업|운영|시간|오픈|마감|휴무)/.test(t))
    return mode === "main" ? "ai" : "place_hours";
  if (/(리뷰|평점|후기)/.test(t))
    return mode === "main" ? "ai" : "place_reviews";
  if (mode !== "main" && /(연락처|전화|웹|홈페이지|사이트)/.test(t))
    return mode === "main" ? "ai" : "place_contact";
  if (mode !== "main" && /(비슷|유사)/.test(t))
    return mode === "main" ? "ai" : "place_similar";

  return mode === "main" ? "route" : "general";
}
