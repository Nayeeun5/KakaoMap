"use client";
import { useEffect, useRef, useState } from "react";

// 주소에 있는 괄호내용 지우기
function normalizeAddress(str = "") {
  return str
    .replace(/\s*[\(（][^)）]*[\)）]\s*/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

export default function KakaoMap({
  lat = 35.0,
  lng = 129.0,
  level = 3,

  // 집 좌표/주소
  homeAddress,
  homeCoord,
  showControls = true,
  showMarker = true,

  // 목적지
  targetCoord,
  targetLabel,

  // 경로 렌더링
  routePath = null,
  routeBounds = null,

  // 출발지
  originAddress,
  originCoord,
  originLabel = "출발지",
  enableOriginPick = false,
  originDraggable = false,
  onOriginChange,

  // 길찾기 창 열림 여부 (열리면 출발지 관련 기능 활성)
  directionsOpen = false,

  // 경유지(초록 마커) 표시
  waypoints = [],
}) {
  const mapEl = useRef(null);
  const mapRef = useRef(null);
  const geocoderRef = useRef(null);

  const homeMarkerRef = useRef(null);
  const homeOverlayRef = useRef(null);
  const targetMarkerRef = useRef(null);
  const targetOverlayRef = useRef(null);
  const originMarkerRef = useRef(null);
  const originOverlayRef = useRef(null);

  // 경유지 마커/라벨 묶음
  const waypointMarkersRef = useRef([]);
  const routeLineRef = useRef(null);

  const [ready, setReady] = useState(false);

  // 큰 둥근 네모 라벨(마커 정중앙 위)
  const makeHoverLabel = (kakao, pos, text) => {
    const div = document.createElement("div");
    div.style.cssText = `
      position: relative;
      left: 50%;
      transform: translate(-50%, -110%);
      white-space: nowrap;
      background: white; border:1px solid #e5e7eb; border-radius:12px;
      padding:6px 10px; font-size:22px; font-weight:500;
      line-height:1.2; color:#111; box-shadow:0 8px 24px rgba(0,0,0,0.12);
      pointer-events:auto;
    `;
    div.textContent = text;
    return new kakao.maps.CustomOverlay({
      position: pos,
      content: div,
      yAnchor: 1,
      zIndex: 99,
    });
  };

  // 마커/라벨 둘 다에 호버 연결 (둘 다 벗어나면 숨김)
  const attachHover = (kakao, marker, overlay) => {
    const map = mapRef.current;
    if (!map || !marker || !overlay) return;

    const show = () => {
      overlay.setPosition(marker.getPosition());
      overlay.setMap(map);
    };
    const hide = () => overlay.setMap(null);

    let hideTimer = null;
    const scheduleHide = () => {
      if (hideTimer) clearTimeout(hideTimer);
      hideTimer = setTimeout(() => hide(), 80);
    };

    kakao.maps.event.addListener(marker, "mouseover", show);
    kakao.maps.event.addListener(marker, "mouseout", scheduleHide);

    const el = overlay.getContent();
    const onEnter = () => {
      if (hideTimer) clearTimeout(hideTimer);
      show();
    };
    const onLeave = () => hide();
    el.addEventListener("mouseenter", onEnter);
    el.addEventListener("mouseleave", onLeave);

    hide();

    // 해제 함수
    return () => {
      kakao.maps.event.removeListener(marker, "mouseover", show);
      kakao.maps.event.removeListener(marker, "mouseout", scheduleHide);
      el.removeEventListener("mouseenter", onEnter);
      el.removeEventListener("mouseleave", onLeave);
      if (hideTimer) clearTimeout(hideTimer);
      overlay.setMap && overlay.setMap(null);
    };
  };

  const clearHomePin = () => {
    if (homeMarkerRef.current?._hoverCleanup) {
      homeMarkerRef.current._hoverCleanup();
      homeMarkerRef.current._hoverCleanup = null;
    }
    homeOverlayRef.current?.setMap?.(null);
    homeOverlayRef.current = null;
    homeMarkerRef.current?.setMap(null);
    homeMarkerRef.current = null;
  };

  const clearTargetPin = () => {
    if (targetMarkerRef.current?._hoverCleanup) {
      targetMarkerRef.current._hoverCleanup();
      targetMarkerRef.current._hoverCleanup = null;
    }
    targetOverlayRef.current?.setMap?.(null);
    targetOverlayRef.current = null;
    targetMarkerRef.current?.setMap(null);
    targetMarkerRef.current = null;
  };

  const clearOriginPin = () => {
    const kakao = window.kakao;
    if (originMarkerRef.current?._dragendListener) {
      kakao?.maps?.event?.removeListener(
        originMarkerRef.current,
        "dragend",
        originMarkerRef.current._dragendListener
      );
      originMarkerRef.current._dragendListener = null;
    }
    if (originMarkerRef.current?._dragstartListener) {
      kakao?.maps?.event?.removeListener(
        originMarkerRef.current,
        "dragstart",
        originMarkerRef.current._dragstartListener
      );
      originMarkerRef.current._dragstartListener = null;
    }
    if (originMarkerRef.current?._hoverCleanup) {
      originMarkerRef.current._hoverCleanup();
      originMarkerRef.current._hoverCleanup = null;
    }
    originOverlayRef.current?.setMap?.(null);
    originOverlayRef.current = null;

    originMarkerRef.current?.setMap(null);
    originMarkerRef.current = null;
  };

  // 경유지 마커 클리어
  const clearWaypointPins = () => {
    waypointMarkersRef.current.forEach(({ marker, overlay, cleanup }) => {
      cleanup && cleanup();
      overlay?.setMap?.(null);
      marker?.setMap?.(null);
    });
    waypointMarkersRef.current = [];
  };

  const clearRouteLine = () => {
    routeLineRef.current?.setMap(null);
    routeLineRef.current = null;
  };

  // 도착지(빨간) / 출발지(파란) / 경유지(초록) 마커
  const markerImageFactory = {
    red: (kakao) => {
      const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'
              fill='red' stroke='white' stroke-width='2'>
          <path d='M12 2C8.134 2 5 5.134 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.866-3.134-7-7-7zm0 9.5a2.5 2.5 0 110-5 2.5 2.5 0 010 5z'/>
        </svg>`;
      return makeSvgImage(kakao, svg);
    },
    blue: (kakao) => {
      const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'
              fill='#2b6cff' stroke='white' stroke-width='2'>
          <path d='M12 2C8.134 2 5 5.134 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.866-3.134-7-7-7zm0 9.5a2.5 2.5 0 110-5 2.5 2.5 0 010 5z'/>
        </svg>`;
      return makeSvgImage(kakao, svg);
    },
    green: (kakao) => {
      const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'
              fill='#10B981' stroke='white' stroke-width='2'>
          <path d='M12 2C8.134 2 5 5.134 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.866-3.134-7-7-7zm0 9.5a2.5 2.5 0 110-5 2.5 2.5 0 010 5z'/>
        </svg>`;
      return makeSvgImage(kakao, svg);
    },
  };

  const makeSvgImage = (kakao, svg) => {
    const url = "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(svg);
    const SIZE = 56;
    return new kakao.maps.MarkerImage(url, new kakao.maps.Size(SIZE, SIZE), {
      offset: new kakao.maps.Point(SIZE / 2, SIZE),
    });
  };

  const putHomePin = (kakao, pos) => {
    clearHomePin();
    if (!pos) return;
    const map = mapRef.current;

    const marker = new kakao.maps.Marker({
      position:
        pos instanceof kakao.maps.LatLng
          ? pos
          : new kakao.maps.LatLng(pos.lat, pos.lng),
      map,
      zIndex: 5,
      clickable: true,
    });
    homeMarkerRef.current = marker;

    const overlay = makeHoverLabel(kakao, marker.getPosition(), "집");
    homeOverlayRef.current = overlay;
    marker._hoverCleanup = attachHover(kakao, marker, overlay);
  };

  const relayoutCenter = (pos) => {
    const map = mapRef.current;
    if (!map) return;
    map.relayout();
    map.setCenter(pos);
    requestAnimationFrame(() => map.setCenter(pos));
  };

  const onOriginChangeRef = useRef(onOriginChange);
  useEffect(() => {
    onOriginChangeRef.current = onOriginChange;
  }, [onOriginChange]);

  const sameLL = (a, b) =>
    !!a &&
    !!b &&
    Math.abs(a.getLat() - b.getLat()) < 1e-7 &&
    Math.abs(a.getLng() - b.getLng()) < 1e-7;

  // 출발 마커 세팅
  const setOriginFromPos = (pos, { emit = false, source } = {}) => {
    const kakao = window.kakao;
    const map = mapRef.current;
    if (!kakao || !map) return;

    if (!directionsOpen) {
      clearOriginPin();
      if (emit)
        onOriginChangeRef.current?.(
          { lat: pos.getLat(), lng: pos.getLng() },
          { source }
        );
      return;
    }

    if (
      originMarkerRef.current &&
      sameLL(originMarkerRef.current.getPosition(), pos)
    ) {
      originOverlayRef.current?.setPosition?.(pos);
      if (emit)
        onOriginChangeRef.current?.(
          { lat: pos.getLat(), lng: pos.getLng() },
          { source }
        );
      return;
    }

    clearOriginPin();
    const marker = new kakao.maps.Marker({
      position: pos,
      map,
      image: markerImageFactory.blue(kakao),
      zIndex: 9,
      draggable: !!originDraggable,
      clickable: true,
    });
    originMarkerRef.current = marker;

    const ov = makeHoverLabel(kakao, pos, originLabel || "출발");
    originOverlayRef.current = ov;
    marker._hoverCleanup = attachHover(kakao, marker, ov);

    if (originDraggable) {
      const onDragStart = () => ov.setMap(null);
      const onDragEnd = () => {
        ov.setPosition(marker.getPosition());
        onOriginChangeRef.current?.(
          {
            lat: marker.getPosition().getLat(),
            lng: marker.getPosition().getLng(),
          },
          { source: "drag" }
        );
      };
      kakao.maps.event.addListener(marker, "dragstart", onDragStart);
      kakao.maps.event.addListener(marker, "dragend", onDragEnd);
      marker._dragstartListener = onDragStart;
      marker._dragendListener = onDragEnd;
    }

    map.panTo(pos);
    if (map.getLevel() > 4) map.setLevel(4);
    if (emit)
      onOriginChangeRef.current?.(
        { lat: pos.getLat(), lng: pos.getLng() },
        { source }
      );
  };

  // 경유지 그리기(초록 마커 + 호버 라벨)
  const putWaypoints = (kakao, pts = []) => {
    clearWaypointPins();
    const map = mapRef.current;
    if (!map || !Array.isArray(pts) || pts.length === 0) return;

    pts.forEach((p, idx) => {
      const pos =
        p instanceof kakao.maps.LatLng
          ? p
          : new kakao.maps.LatLng(p.lat, p.lng);
      const marker = new kakao.maps.Marker({
        position: pos,
        map,
        image: markerImageFactory.green(kakao),
        zIndex: 8,
        clickable: true,
      });
      const label = p.label || p.name || `경유지 ${idx + 1}`;
      const overlay = makeHoverLabel(kakao, pos, label);
      const cleanup = attachHover(kakao, marker, overlay);
      waypointMarkersRef.current.push({ marker, overlay, cleanup });
    });
  };

  // 경로 그리기
  const drawRoute = (kakao, path) => {
    const map = mapRef.current;
    clearRouteLine();
    if (!path || path.length < 2) return;

    const latlngs = path.map((p) =>
      p instanceof kakao.maps.LatLng ? p : new kakao.maps.LatLng(p.lat, p.lng)
    );
    routeLineRef.current = new kakao.maps.Polyline({
      path: latlngs,
      strokeWeight: 5,
      strokeOpacity: 0.9,
      strokeColor: "#1E90FF",
      map,
    });
  };

  const fitBounds = (kakao, bound) => {
    const map = mapRef.current;
    if (!bound) return;

    const b = new kakao.maps.LatLngBounds();
    b.extend(new kakao.maps.LatLng(bound.minLat, bound.minLng));
    b.extend(new kakao.maps.LatLng(bound.maxLat, bound.maxLng));
    map.setBounds(b);
    requestAnimationFrame(() => map.setBounds(b));
  };

  // 지도가 보일때까지 기다렸다가 초기화
  const waitUntilVisible = () =>
    new Promise((resolve) => {
      const el = mapEl.current;
      if (!el) return resolve(false);
      const readyNow = () => {
        const rect = el.getBoundingClientRect();
        return (
          rect.width > 0 &&
          rect.height > 0 &&
          getComputedStyle(el).display !== "none"
        );
      };
      if (readyNow()) return resolve(true);
      let rafId;
      const tick = () => {
        if (readyNow()) {
          cancelAnimationFrame(rafId);
          resolve(true);
        } else {
          rafId = requestAnimationFrame(tick);
        }
      };
      rafId = requestAnimationFrame(tick);
    });

  // Kakao SDK 로드 + 지도 init
  useEffect(() => {
    const APP_KEY = import.meta.env.VITE_KAKAO_API; // 테스트용
    const SCRIPT_ID = "kakao-maps-sdk";
    let cleanupFns = [];

    const initMap = async () => {
      if (!mapEl.current || !window.kakao?.maps) return;
      await waitUntilVisible();

      const { maps } = window.kakao;

      const map = new maps.Map(mapEl.current, {
        center: new maps.LatLng(lat, lng),
        level,
      });
      mapRef.current = map;
      geocoderRef.current = new maps.services.Geocoder();

      if (showControls) {
        map.addControl(new maps.ZoomControl(), maps.ControlPosition.RIGHT);
        map.addControl(
          new maps.MapTypeControl(),
          maps.ControlPosition.TOPRIGHT
        );
      }

      if (showMarker && !homeAddress && !homeCoord) {
        const marker = new maps.Marker({
          position: new maps.LatLng(lat, lng),
          map,
          clickable: true,
        });
        homeMarkerRef.current = marker;
        const ov = makeHoverLabel(window.kakao, marker.getPosition(), "집");
        homeOverlayRef.current = ov;
        marker._hoverCleanup = attachHover(window.kakao, marker, ov);
      }

      const ro = new ResizeObserver(() => map.relayout());
      ro.observe(mapEl.current);
      cleanupFns.push(() => ro.disconnect());

      const handleVisible = () => {
        if (!mapRef.current) return;
        mapRef.current.relayout();
        if (targetMarkerRef.current) {
          relayoutCenter(targetMarkerRef.current.getPosition());
          return;
        }
        if (originMarkerRef.current) {
          relayoutCenter(originMarkerRef.current.getPosition());
          return;
        }
        if (homeCoord) {
          const pos = new window.kakao.maps.LatLng(
            homeCoord.lat,
            homeCoord.lng
          );
          relayoutCenter(pos);
        }
      };
      const onVis = () => {
        if (document.visibilityState === "visible") handleVisible();
      };
      window.addEventListener("pageshow", handleVisible);
      document.addEventListener("visibilitychange", onVis);
      cleanupFns.push(() => {
        window.removeEventListener("pageshow", handleVisible);
        document.removeEventListener("visibilitychange", onVis);
      });

      setReady(true);
    };

    const onScriptLoad = () => window.kakao?.maps?.load(initMap);

    if (window.kakao?.maps) {
      window.kakao.maps.load(initMap);
    } else {
      const existing = document.getElementById(SCRIPT_ID);
      if (existing) {
        existing.addEventListener("load", onScriptLoad, { once: true });
        cleanupFns.push(() =>
          existing.removeEventListener("load", onScriptLoad)
        );
      } else {
        const script = document.createElement("script");
        script.id = SCRIPT_ID;
        script.async = true;
        script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${APP_KEY}&libraries=services&autoload=false`;
        script.addEventListener("load", onScriptLoad, { once: true });
        script.addEventListener("error", () =>
          console.error("[Kakao] SDK load error")
        );
        document.head.appendChild(script);
        cleanupFns.push(() => script.removeEventListener("load", onScriptLoad));
      }
    }

    return () => {
      clearTargetPin();
      clearHomePin();
      clearOriginPin();
      clearWaypointPins();
      clearRouteLine();
      const map = mapRef.current;
      if (map && map._originClickListener) {
        window.kakao?.maps?.event?.removeListener(
          map,
          "click",
          map._originClickListener
        );
        map._originClickListener = null;
      }
      cleanupFns.forEach((fn) => fn());
    };
  }, [lat, lng, level, showControls, showMarker, homeAddress, homeCoord]);

  // 집 처리(주소/좌표 변경 시 갱신)
  useEffect(() => {
    if (!ready) return;
    const kakao = window.kakao;
    const map = mapRef.current;
    const geocoder = geocoderRef.current;
    if (!kakao || !map || !geocoder) return;

    clearHomePin();

    const addr = (homeAddress || "").trim();
    if (addr) {
      const cleaned = normalizeAddress(addr);
      geocoder.addressSearch(cleaned, (result, status) => {
        if (status === kakao.maps.services.Status.OK && result?.length) {
          const { x, y } = result[0];
          const pos = new kakao.maps.LatLng(y, x);
          relayoutCenter(pos);
          putHomePin(kakao, pos);
        } else if (homeCoord) {
          const pos = new kakao.maps.LatLng(homeCoord.lat, homeCoord.lng);
          relayoutCenter(pos);
          putHomePin(kakao, pos);
        } else if (showMarker) {
          const pos = new kakao.maps.LatLng(lat, lng);
          relayoutCenter(pos);
          putHomePin(kakao, pos);
        }
      });
      return;
    }

    if (homeCoord) {
      const pos = new kakao.maps.LatLng(homeCoord.lat, homeCoord.lng);
      relayoutCenter(pos);
      putHomePin(kakao, pos);
      return;
    }

    if (showMarker) {
      const pos = new kakao.maps.LatLng(lat, lng);
      relayoutCenter(pos);
      putHomePin(kakao, pos);
    }
  }, [ready, homeAddress, homeCoord, showMarker, lat, lng]);

  // 출발지 — 주소가 바뀐 경우
  useEffect(() => {
    if (!ready || !directionsOpen) return;
    const kakao = window.kakao;
    const map = mapRef.current;
    const geocoder = geocoderRef.current;
    if (!kakao || !map || !geocoder) return;

    const tryAddress = (addr) =>
      new Promise((resolve) => {
        const cleaned = normalizeAddress(addr);
        if (!cleaned) return resolve(false);
        geocoder.addressSearch(cleaned, (result, status) => {
          if (status === kakao.maps.services.Status.OK && result?.length) {
            const { x, y } = result[0];
            const pos = new kakao.maps.LatLng(y, x);
            setOriginFromPos(pos, { emit: true, source: "geocode" });
            resolve(true);
          } else resolve(false);
        });
      });

    (async () => {
      if (originAddress) {
        const ok = await tryAddress(originAddress);
        if (!ok && !originCoord) clearOriginPin();
      }
    })();
  }, [
    ready,
    originAddress,
    originLabel,
    originDraggable,
    originCoord,
    directionsOpen,
  ]);

  useEffect(() => {
    if (!ready || !directionsOpen) return;
    const kakao = window.kakao;
    const map = mapRef.current;
    if (!kakao || !map) return;

    if (originCoord?.lat != null && originCoord?.lng != null) {
      const pos = new kakao.maps.LatLng(originCoord.lat, originCoord.lng);
      if (
        originMarkerRef.current &&
        sameLL(originMarkerRef.current.getPosition(), pos)
      )
        return;
      setOriginFromPos(pos, { emit: false });
    } else if (!originAddress) {
      clearOriginPin();
    }
  }, [
    ready,
    originCoord,
    originLabel,
    originDraggable,
    originAddress,
    directionsOpen,
  ]);

  // 지도 클릭으로 출발지 선택 (패널 열렸을 때만)
  useEffect(() => {
    if (!ready) return;
    const kakao = window.kakao;
    const map = mapRef.current;
    if (!kakao || !map) return;

    if (map._originClickListener) {
      kakao.maps.event.removeListener(map, "click", map._originClickListener);
      map._originClickListener = null;
    }
    if (!enableOriginPick || !directionsOpen) return;

    const handler = (mouseEvent) => {
      const pos = mouseEvent.latLng;
      setOriginFromPos(pos, { emit: true, source: "click" });
    };

    kakao.maps.event.addListener(map, "click", handler);
    map._originClickListener = handler;

    return () => {
      if (map._originClickListener) {
        kakao.maps.event.removeListener(map, "click", map._originClickListener);
        map._originClickListener = null;
      }
    };
  }, [ready, enableOriginPick, originDraggable, originLabel, directionsOpen]);

  const tLat = targetCoord?.lat ?? null;
  const tLng = targetCoord?.lng ?? null;

  useEffect(() => {
    if (!ready) return;
    const kakao = window.kakao;
    const map = mapRef.current;
    if (!kakao || !map) return;

    if (tLat == null || tLng == null) {
      clearTargetPin();
      return;
    }

    const pos = new kakao.maps.LatLng(tLat, tLng);
    map.panTo(pos);
    if (map.getLevel() > 3) map.setLevel(3);

    clearTargetPin();
    const marker = new kakao.maps.Marker({
      position: pos,
      image: markerImageFactory.red(kakao),
      zIndex: 10,
      clickable: true,
    });
    marker.setMap(map);
    targetMarkerRef.current = marker;

    const overlay = makeHoverLabel(kakao, pos, targetLabel || "도착지");
    targetOverlayRef.current = overlay;
    marker._hoverCleanup = attachHover(kakao, marker, overlay);
  }, [ready, tLat, tLng, targetLabel]);

  // directionsOpen 변경(닫히면 출발 마커/라벨 제거)
  useEffect(() => {
    if (!ready) return;
    if (!directionsOpen) clearOriginPin();
  }, [ready, directionsOpen]);

  // 경로 렌더링
  useEffect(() => {
    if (!ready) return;
    const kakao = window.kakao;
    drawRoute(kakao, routePath);
    if (routeBounds) fitBounds(kakao, routeBounds);
  }, [ready, routePath, routeBounds]);

  // 경유지 렌더링
  useEffect(() => {
    if (!ready) return;
    const kakao = window.kakao;
    putWaypoints(kakao, Array.isArray(waypoints) ? waypoints : []);
  }, [ready, waypoints]);

  return (
    <div
      ref={mapEl}
      className="rounded-lg w-full h-full min-h-[60rem]"
      aria-label="Kakao Map"
    />
  );
}
