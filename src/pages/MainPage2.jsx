import KakaoMap from "../components/KakaoMap.jsx";
import MainBase from "../components/MainBase.jsx";
import useSettingStore from "../store/setting";
import useStoreHydrated from "../hooks/useStoreHydrated";
import { useRef, useEffect, useState, useCallback } from "react";
import { useLocation } from "wouter";
import { useQueryParam, detectIntent, extractPlaceName } from "../lib/utils.js";
import {
  fetchCarDirections,
  fetchCarWaypointsDirections,
} from "../services/directions.js";

// 임의 장소(빠른 데모용)
const MOCK_PLACES = {
  부산시청: { lat: 35.179554, lng: 129.075642 },
};

const norm = (s = "") => s.trim().replace(/\s+/g, "");
const samePos = (a, b) =>
  !!a &&
  !!b &&
  Math.abs(a.lat - b.lat) < 1e-7 &&
  Math.abs(a.lng - b.lng) < 1e-7;

export default function MainPage2() {
  const hydrated = useStoreHydrated();
  const home = useSettingStore((s) => s.geo.home);
  const homeCoord = useSettingStore((s) => s.geo.homeCoord);

  const [, setLocation] = useLocation();
  const [query, setQuery] = useState("");

  // 경유지(문자열 배열)
  const [stops, setStops] = useState([]);
  const addStop = () => setStops((prev) => [...prev, ""]);
  const updateStop = (i, val) =>
    setStops((prev) => prev.map((s, idx) => (idx === i ? val : s)));
  const removeStop = (i) =>
    setStops((prev) => prev.filter((_, idx) => idx !== i));

  // 지도에 표시할 경유지 좌표
  const [waypointCoords, setWaypointCoords] = useState([]);

  // 길찾기 모드(지도의 출/도착/경로 유지)
  const [directionsOn, setDirectionsOn] = useState(false);
  // 시트 열림 상태
  const [sheetOpen, setSheetOpen] = useState(false);

  // 출발지(텍스트/좌표)
  const [originText, setOriginText] = useState("내 위치");
  const [originCoord, setOriginCoord] = useState(null);
  const lastGeocodedOriginRef = useRef("");

  // 목적지
  const [destination, setDestination] = useState("부산시청");
  const [destCoord, setDestCoord] = useState(MOCK_PLACES["부산시청"]);
  const [notFound, setNotFound] = useState(false);
  const [mode, setMode] = useState("car"); // public | car | walk | bike

  // 경로 표시/요약 상태
  const [routePath, setRoutePath] = useState(null);
  const [routeBounds, setRouteBounds] = useState(null);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);

  // URL 파라미터
  const directionsQ = useQueryParam("directions");
  const dlatQ = useQueryParam("dlat");
  const dlngQ = useQueryParam("dlng");
  const didConsumeRef = useRef(false);

  if (!hydrated) return <div className="p-6">로딩중...</div>;

  // 임시 ETA(디자인용)
  const getEta = () => {
    if (!destination) return "";
    if (mode === "public") return "40분";
    if (mode === "car") return "38분";
    if (mode === "walk") return "1시간 20분";
    if (mode === "bike") return "52분";
    return "";
  };

  // Kakao services 준비 대기
  const waitKakaoServices = () =>
    new Promise((resolve) => {
      let tries = 0;
      const tick = () => {
        const ok = window.kakao?.maps?.services;
        if (ok) return resolve(window.kakao);
        if (tries++ > 300) return resolve(null);
        setTimeout(tick, 50);
      };
      tick();
    });

  // 지오코딩(주소→좌표, 실패 시 키워드 장소)
  const geocodeByName = async (name) => {
    const kakao = await waitKakaoServices();
    if (!kakao) return null;
    const { services } = kakao.maps;

    const byAddress = await new Promise((res) => {
      const geocoder = new services.Geocoder();
      geocoder.addressSearch(name, (result, status) => {
        if (status === services.Status.OK && result?.[0]) {
          const { x, y } = result[0];
          return res({ lat: parseFloat(y), lng: parseFloat(x) });
        }
        res(null);
      });
    });
    if (byAddress) return byAddress;

    return await new Promise((res) => {
      const ps = new services.Places();
      ps.keywordSearch(name, (data, status) => {
        if (status === services.Status.OK && data?.[0]) {
          const { x, y } = data[0];
          return res({ lat: parseFloat(y), lng: parseFloat(x) });
        }
        res(null);
      });
    });
  };

  // 다수 경유지 지오코딩
  const geocodeStops = async (stopNames = []) => {
    const names = stopNames.map((s) => (s || "").trim()).filter(Boolean);
    const coords = [];
    for (const name of names) {
      const c = await geocodeByName(name);
      if (c) coords.push({ ...c, label: name });
    }
    return coords; // [{lat, lng, label}]
  };

  // URL 파라미터 소비(도착지 우선)
  useEffect(() => {
    if (didConsumeRef.current) return;

    const latNum = Number.parseFloat(dlatQ);
    const lngNum = Number.parseFloat(dlngQ);
    const hasValidCoords = Number.isFinite(latNum) && Number.isFinite(lngNum);
    const hasValidDirections =
      typeof directionsQ === "string" && directionsQ.trim().length > 0;

    if (!hasValidCoords && !hasValidDirections) return;

    didConsumeRef.current = true;

    if (hasValidCoords) {
      setDestCoord({ lat: latNum, lng: lngNum });
      setDestination(hasValidDirections ? String(directionsQ) : "");
      setNotFound(false);
      setDirectionsOn(true);
      setSheetOpen(true);
    } else if (hasValidDirections) {
      const name = String(directionsQ);
      setDestination(name);
      setDirectionsOn(true);
      setSheetOpen(true);

      geocodeByName(name).then((coord) => {
        if (coord) {
          setDestCoord(coord);
          setNotFound(false);
        } else {
          setDestCoord(null);
          setNotFound(true);
        }
      });
    }
    setTimeout(() => setLocation("/", { replace: true }), 0);
  }, [directionsQ, dlatQ, dlngQ, setLocation]);

  // 아이콘 로딩
  useEffect(() => {
    if (!document.getElementById("ms-outlined")) {
      const link = document.createElement("link");
      link.id = "ms-outlined";
      link.rel = "stylesheet";
      link.href =
        "https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0";
      document.head.appendChild(link);
    }
  }, []);

  // 의도 분류
  const classification = (text) => {
    const trimmed = (text || "").trim();
    if (!trimmed) return;
    const intent = detectIntent(trimmed, "main");

    if (intent === "ai") {
      setLocation(`/ai-chat?query=${encodeURIComponent(trimmed)}`);
      return;
    }

    if (intent === "map") {
      const name = extractPlaceName(trimmed);
      setDestination(name);
      setDirectionsOn(true);
      setSheetOpen(true);
      return;
    }

    setDestination(trimmed);
    setDirectionsOn(true);
    setSheetOpen(true);
  };

  const onKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (directionsOn) return;
      classification(query);
    }
  };

  // 출발/도착 바꾸기
  const swap = () => {
    const newOriginText = destination || "내 위치";
    const newOriginCoord = destCoord ?? null;

    const newDestText = originText === "내 위치" ? "" : originText;
    const newDestCoord = originText === "내 위치" ? null : originCoord;

    setOriginText(newOriginText);
    setOriginCoord(newOriginCoord);
    setDestination(newDestText);
    setDestCoord(newDestCoord);

    lastGeocodedOriginRef.current = "";
    setRoutePath(null);
    setRouteBounds(null);
    setSummary(null);
    setErr(null);
  };

  const resetDirections = () => {
    setSheetOpen(false);
    setDirectionsOn(false);
    setMode("car");
    setOriginText("내 위치");
    setOriginCoord(null);
    setDestination("");
    setQuery("");
    setDestCoord(null);
    setNotFound(false);
    setStops([]);
    setWaypointCoords([]);
    lastGeocodedOriginRef.current = "";
    setRoutePath(null);
    setRouteBounds(null);
    setSummary(null);
    setErr(null);
  };

  // 시트 열기/닫기
  const sheetRef = useRef(null);
  const shouldAnimateOpenRef = useRef(false);
  const expandBottomSheet = useCallback(() => {
    shouldAnimateOpenRef.current = true;
    setDirectionsOn(true);
    setSheetOpen(true);
  }, []);

  useEffect(() => {
    if (!sheetOpen || !shouldAnimateOpenRef.current) return;
    const el = sheetRef.current;
    if (!el) return;
    el.style.transition = "none";
    el.style.opacity = "0";
    el.style.transform = "translateY(16px)";
    requestAnimationFrame(() => {
      el.style.willChange = "transform, opacity";
      el.style.transition =
        "transform 220ms cubic-bezier(0.22,1,0.36,1), opacity 200ms ease";
      el.style.opacity = "1";
      el.style.transform = "translateY(0)";
      const onEnd = () => {
        el.removeEventListener("transitionend", onEnd);
        el.style.willChange = "";
        el.style.transition = "";
      };
      el.addEventListener("transitionend", onEnd);
    });
    shouldAnimateOpenRef.current = false;
  }, [sheetOpen]);

  const collapseBottomSheet = useCallback(() => {
    const el = sheetRef.current;
    if (!el) {
      setSheetOpen(false);
      return;
    }
    el.style.willChange = "transform, opacity";
    el.style.transition =
      "transform 220ms cubic-bezier(0.22,1,0.36,1), opacity 200ms ease";
    requestAnimationFrame(() => {
      el.style.transform = "translateY(16px)";
      el.style.opacity = "0";
    });
    const onEnd = () => {
      el.removeEventListener("transitionend", onEnd);
      setSheetOpen(false); // 시트만 닫기
      el.style.willChange = "";
      el.style.transition = "";
      el.style.transform = "";
      el.style.opacity = "";
    };
    el.addEventListener("transitionend", onEnd);
  }, []);

  // 목적지 검색
  const handleSearchDestination = async () => {
    const key = norm(destination);
    const found = MOCK_PLACES[key];

    if (found) {
      setDestCoord(found);
      setNotFound(false);
      setDirectionsOn(true);
      setSheetOpen(true);
      return;
    }

    const coord = await geocodeByName(destination);
    if (coord) {
      setDestCoord(coord);
      setNotFound(false);
      setDirectionsOn(true);
      setSheetOpen(true);
    } else {
      setDestCoord(null);
      setNotFound(true);
    }
  };

  // 출발지 검색(지오코딩)
  const handleSearchOrigin = async () => {
    if (!originText || originText.trim() === "내 위치") {
      setOriginCoord(null);
      lastGeocodedOriginRef.current = "";
      return;
    }
    const cur = originText.trim();
    if (cur === lastGeocodedOriginRef.current) return;

    const coord = await geocodeByName(cur);
    if (coord) {
      setOriginCoord((prev) => (samePos(prev, coord) ? prev : coord));
      lastGeocodedOriginRef.current = cur;
    }
  };

  const onSubmitDest = (e) => {
    e.preventDefault();
    handleSearchDestination();
  };

  // 브라우저 현재 위치
  const useMyLocation = () => {
    if (!navigator.geolocation) {
      alert("브라우저에서 위치를 지원하지 않습니다.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setOriginText("내 위치");
        setOriginCoord((prev) => {
          const next = { lat: latitude, lng: longitude };
          return samePos(prev, next) ? prev : next;
        });
        lastGeocodedOriginRef.current = "";
      },
      () => {
        alert("현재 위치를 가져올 수 없습니다.");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // 집으로
  const useHome = () => {
    if (homeCoord?.lat != null && homeCoord?.lng != null) {
      setOriginText(home || "집");
      const next = { lat: homeCoord.lat, lng: homeCoord.lng };
      setOriginCoord((prev) => (samePos(prev, next) ? prev : next));
      lastGeocodedOriginRef.current = "";
    } else if (home) {
      geocodeByName(home).then((c) => {
        if (c) setOriginCoord((prev) => (samePos(prev, c) ? prev : c));
      });
      setOriginText(home);
      lastGeocodedOriginRef.current = home;
    }
  };

  const requestDirections = async () => {
    if (mode !== "car") {
      setSummary(null);
      setRoutePath(null);
      setRouteBounds(null);
      setErr("현재는 자동차 길찾기만 지원합니다.");
      return;
    }
    if (!destCoord || !originCoord) return;

    setLoading(true);
    setErr(null);

    try {
      const stopCoords = await geocodeStops(stops);
      // 지도 표기도 갱신
      setWaypointCoords(stopCoords);

      let result;
      if (stopCoords.length > 0) {
        result = await fetchCarWaypointsDirections(
          originCoord,
          destCoord,
          stopCoords
        );
      } else {
        result = await fetchCarDirections(originCoord, destCoord);
      }
      const { summary: sum, path, bound } = result;
      setSummary(sum ?? null);
      setRoutePath(Array.isArray(path) ? path : null);
      setRouteBounds(bound ?? null);
    } catch (e) {
      setErr(e?.status ? `서버 오류 ${e.status}` : e?.message || "요청 실패");
      setRoutePath(null);
      setRouteBounds(null);
      setSummary(null);
    } finally {
      setLoading(false);
    }
  };

  // 경유지 텍스트가 바뀌면 지도 마커도 갱신
  useEffect(() => {
    let active = true;
    (async () => {
      const coords = await geocodeStops(stops);
      if (active) setWaypointCoords(coords);
    })();
    return () => {
      active = false;
    };
  }, [stops]);

  // 자동 요청
  useEffect(() => {
    if (directionsOn && originCoord && destCoord && mode === "car") {
      requestDirections();
    }
  }, [directionsOn, originCoord, destCoord, mode]);

  return (
    <MainBase current="main">
      {/* 시트 */}
      {sheetOpen && (
        <div className="absolute inset-x-0 bottom-0 z-30 pointer-events-none">
          <div
            ref={sheetRef}
            className="relative mx-auto w-full max-w-[800px]
                      rounded-t-2xl shadow-xl
                      border border-blue-100 ring-1 ring-blue-100/60
                      bg-blue-50/95
                      px-3 pt-3
                      pb-[max(12px,env(safe-area-inset-bottom))]
                      mb-[calc(76px+env(safe-area-inset-bottom))]
                      h-[72vh] md:h-[68vh]
                      overflow-y-auto
                      pointer-events-auto overscroll-contain touch-pan-y"
          >
            <button
              type="button"
              onClick={collapseBottomSheet}
              className="w-full"
            >
              <div className="btn btn-ghost mx-auto mb-2 h-1.5 w-10 rounded-full bg-slate-300 hover:bg-slate-400 border-none" />
            </button>

            <div className="flex items-center justify-between px-1">
              <div className="font-semibold text-slate-600">길찾기</div>
              <button
                className="btn btn-ghost btn-sm border-none text-slate-500 hover:bg-slate-200/70"
                onClick={resetDirections}
                aria-label="닫기"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M18 6L6 18" />
                  <path d="M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* 본문 */}
            <div className="mt-2 flex items-start gap-2">
              <button
                type="button"
                className="btn btn-ghost btn-sm rounded-full border-none mt-1 text-[#4E94F8] hover:bg-[#4E94F8]/10"
                onClick={swap}
                title="출발/도착 전환"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M7 7h10l-3-3m3 3-3 3M17 17H7l3 3m-3-3 3-3"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>

              <div className="flex-1 space-y-2">
                {/* 출발지 */}
                <div className="flex items-center gap-2">
                  <label className="group input w-full rounded-xl items-center gap-2 border border-blue-200 bg-white/95 px-3 py-2 shadow-sm">
                    <input
                      type="text"
                      value={originText}
                      onChange={(e) => setOriginText(e.target.value)}
                      onBlur={handleSearchOrigin}
                      placeholder="출발지 입력 (예: 내 위치, 부산역, 집)"
                      className="grow bg-transparent outline-none placeholder-slate-400 text-[15px]"
                    />
                    <span className="opacity-50 text-xs pr-1">출발</span>
                  </label>

                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={useMyLocation}
                  >
                    내 위치
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={useHome}
                  >
                    집으로
                  </button>
                </div>

                {/* 경유지들 */}
                {stops.map((s, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <label className="group input w-full rounded-xl items-center gap-2 border border-blue-200 bg-white/95 px-3 py-2 shadow-sm">
                      <input
                        type="text"
                        value={s}
                        onChange={(e) => updateStop(i, e.target.value)}
                        placeholder={`경유지 ${i + 1}`}
                        className="grow bg-transparent outline-none placeholder-slate-400 text-[15px]"
                      />
                    </label>

                    <button
                      type="button"
                      className="btn btn-ghost btn-sm text-error"
                      onClick={() => removeStop(i)}
                      aria-label="경유지 삭제"
                      title="경유지 삭제"
                    >
                      −
                    </button>
                  </div>
                ))}

                {/* 목적지 + +버튼 + 검색 */}
                <form
                  onSubmit={onSubmitDest}
                  className="group flex items-center gap-2 rounded-xl border border-blue-200 bg-white px-3 py-1.5 shadow-sm"
                >
                  <input
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    placeholder="목적지 입력 (예: 부산시청)"
                    type="search"
                    enterKeyHint="search"
                    autoComplete="off"
                    className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-gray-400 text-sm"
                  />
                  <button
                    type="button"
                    onClick={addStop}
                    className="btn btn-ghost btn-sm rounded-full"
                  >
                    +
                  </button>
                  <button
                    type="submit"
                    aria-label="검색"
                    className="btn btn-sm bg-blue-400 hover:bg-blue-500 text-white rounded-lg"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <circle cx="11" cy="11" r="8"></circle>
                      <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                    </svg>
                  </button>
                </form>

                {notFound && (
                  <div className="px-3 text-sm text-red-600">
                    찾을 수 없는 목적지입니다.
                  </div>
                )}

                {/* 교통수단 */}
                <div className="mt-2 flex items-center gap-2">
                  <div className="join">
                    <button
                      className={`btn btn-sm join-item ${
                        mode === "public"
                          ? "bg-[#4E94F8]/80 text-white"
                          : "btn-ghost"
                      }`}
                      onClick={() => setMode("public")}
                      title="대중교통"
                    >
                      <span className="material-symbols-outlined">
                        directions_bus
                      </span>
                    </button>
                    <button
                      className={`btn btn-sm join-item ${
                        mode === "car"
                          ? "bg-[#4E94F8]/80 text-white"
                          : "btn-ghost"
                      }`}
                      onClick={() => setMode("car")}
                      title="자동차"
                    >
                      <span className="material-symbols-outlined">
                        directions_car
                      </span>
                    </button>
                    <button
                      className={`btn btn-sm join-item ${
                        mode === "walk"
                          ? "bg-[#4E94F8]/80 text-white"
                          : "btn-ghost"
                      }`}
                      onClick={() => setMode("walk")}
                      title="도보"
                    >
                      <span className="material-symbols-outlined">
                        directions_walk
                      </span>
                    </button>
                    <button
                      className={`btn btn-sm join-item ${
                        mode === "bike"
                          ? "bg-[#4E94F8]/80 text-white"
                          : "btn-ghost"
                      }`}
                      onClick={() => setMode("bike")}
                      title="자전거"
                    >
                      <span className="material-symbols-outlined">
                        pedal_bike
                      </span>
                    </button>
                  </div>

                  {destination && (
                    <span className="badge badge-lg ml-1">{getEta()}</span>
                  )}
                </div>

                {/* 길찾기 실행/상태 */}
                <div className="mt-2 flex items-center gap-2">
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={requestDirections}
                    disabled={
                      !destCoord || !originCoord || loading || mode !== "car"
                    }
                    title="경로 새로고침"
                  >
                    {loading ? "불러오는 중…" : "경로 새로고침"}
                  </button>
                  {err && (
                    <div className="text-red-600 text-sm">
                      에러: {String(err)}
                    </div>
                  )}
                </div>

                {/* 요약 */}
                {summary && (
                  <div className="mt-3">
                    <div className="text-gray-600 text-sm">요약</div>
                    <ul className="list-disc list-inside text-sm">
                      <li>거리: {summary.distance} m</li>
                      <li>
                        시간: {Math.round((summary.duration ?? 0) / 60)} 분
                      </li>
                      {summary.fare && (
                        <li>요금: {JSON.stringify(summary.fare)}</li>
                      )}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="mx-auto w-full max-w-screen-md">
        {/* 지도 */}
        <div className="relative sticky top-0 h-[calc(100svh-200px)] md:h-[calc(100svh-280px)]">
          <KakaoMap
            lat={35.0}
            lng={129.0}
            level={3}
            homeAddress={home}
            homeCoord={homeCoord}
            // 목적지
            targetCoord={destCoord}
            targetLabel={destination}
            // 출발지
            originAddress={originText === "내 위치" ? "" : originText}
            originCoord={originCoord}
            originLabel="출발"
            enableOriginPick={sheetOpen}
            originDraggable={true}
            onOriginChange={useCallback((pos, meta) => {
              setOriginCoord((prev) => (samePos(prev, pos) ? prev : pos));
              if (meta?.source === "drag" || meta?.source === "click") {
                setOriginText("사용자 지정 위치");
              }
            }, [])}
            // 경로
            routePath={routePath}
            routeBounds={routeBounds}
            // 경유지 표시
            waypoints={waypointCoords}
            showControls
            showMarker
            // 출발지 기능 토글
            directionsOpen={directionsOn}
          />
        </div>

        {/* 시트 다시 열기 버튼 (시트 닫힘 + 길찾기 유지 상태에서 표시) */}
        {directionsOn && !sheetOpen && (
          <div className="fixed inset-x-0 bottom-[calc(76px+env(safe-area-inset-bottom)+140px)] z-30 flex justify-center pointer-events-none">
            <button
              type="button"
              onClick={expandBottomSheet}
              className="pointer-events-auto inline-flex items-center gap-2
                        rounded-full bg-[#4E94F8]/90 text-white px-4 py-2
                        shadow-lg hover:bg-[#3c84ef] active:scale-[0.98]"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M6 9l6 6 6-6" />
              </svg>
              <span className="text-sm">길찾기</span>
            </button>
          </div>
        )}

        {/* 기본 검색바 (길찾기 모드 아닐 때만) */}
        {!directionsOn && (
          <div className="mx-auto w-full max-w-screen-md shrink-0 pt-3 pb-4 px-4 space-y-3">
            <label className="group w-full flex items-center gap-2 rounded-xl border border-blue-200 bg-white/95 px-3 py-2 shadow-sm">
              <svg
                className="h-5 w-5 text-blue-500"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                aria-hidden
              >
                <g
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  strokeWidth="2.5"
                  fill="none"
                  stroke="currentColor"
                >
                  <circle cx="11" cy="11" r="8"></circle>
                  <path d="m21 21-4.3-4.3"></path>
                </g>
              </svg>

              <input
                type="search"
                required
                placeholder="부산의 원하시는 장소나 분위기, 생각나는 것들을 모두 입력해보세요."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onKeyDown}
                className="grow bg-transparent outline-none placeholder-slate-400 text-slate-800"
              />
            </label>

            <div className="flex gap-2 overflow-x-auto -mx-4 px-4 py-1">
              <button
                type="button"
                className="badge badge-lg rounded-full whitespace-nowrap border border-[#4E94F8]/30 bg-[#4E94F8]/10 text-[#4E94F8]"
                onClick={() =>
                  classification("여름에 더위를 식힐 부산 맛집 추천해줘")
                }
              >
                🏖️ 여름에 더위를 식힐 부산 맛집!
              </button>

              <button
                type="button"
                className="badge badge-lg rounded-full whitespace-nowrap border border-[#4E94F8]/30 bg-[#4E94F8]/10 text-[#4E94F8]"
                onClick={() => classification("분위기 좋은 해운대 카페 알려줘")}
              >
                ☕️ 분위기 좋은 해운대 카페
              </button>
            </div>
          </div>
        )}
      </div>
    </MainBase>
  );
}
