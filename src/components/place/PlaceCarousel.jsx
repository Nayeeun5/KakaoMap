import { useEffect, useRef, useState } from "react";
import PlaceCard from "./PlaceCard";

export function PlaceCarousel({ places, onActiveIndexChange }) {
  const ref = useRef(null);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    onActiveIndexChange?.(0);
  }, [onActiveIndexChange]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const handleScroll = () => {
      const width = el.clientWidth;
      const i = Math.round(el.scrollLeft / width); // 가장 가까운 카드 인덱스로 반올림
      if (i !== index) {
        setIndex(i);
        onActiveIndexChange?.(i);
      }
    };
    el.addEventListener("scroll", handleScroll, { passive: true });
    return () => el.removeEventListener("scroll", handleScroll);
  }, [index, onActiveIndexChange]);

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm text-gray-500">추천 {places.length}곳</div>
        <div className="text-sm font-medium">
          {index + 1}/{places.length}
        </div>
      </div>
      <div
        ref={ref}
        className="w-full overflow-x-auto snap-x snap-mandatory scroll-smooth no-scrollbar"
      >
        <div className="flex w-full">
          {places.map((p) => (
            <article
              key={p.id}
              className="snap-start shrink-0 w-full pr-3 last:pr-0"
            >
              <PlaceCard place={p} layout="card" />
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}

// 채팅 버전
export function AssistantPlacesMessageSlim({ places, onActiveIndexChange }) {
  return (
    <div className="chat chat-start">
      <div className="chat-header">AI Assistant</div>
      <div className="chat-bubble bg-white text-gray-800 border border-gray-200 shadow-sm max-w-full p-0">
        <div className="p-3">
          <PlaceCarousel
            places={places}
            onActiveIndexChange={onActiveIndexChange}
          />
        </div>
      </div>
    </div>
  );
}
