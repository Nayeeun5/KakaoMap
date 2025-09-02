import MainBase from "../components/MainBase";
import useChatStore from "../store/chat.js";
import { AssistantPlacesMessageSlim } from "../components/place/PlaceCarousel.jsx";
import { useEffect, useRef, useMemo, useCallback, useState } from "react";
import { makeMockPlaces, normalizePlaceData } from "../lib/place.js";
import {
  uid,
  useQueryParam,
  detectIntent,
  extractPlaceName,
} from "../lib/utils.js";
import { useLocation } from "wouter";
import ChildNav from "../components/ChildNav.jsx";

// 공통 액션
function PlaceAction(
  action,
  target,
  { navigate, pushMessage, scrollToBottom }
) {
  const name = target?.name?.trim();

  if (action === "map") {
    if (!name) {
      pushMessage("어느 장소를 지도에서 볼까요?", "assistant");
      return;
    }
    const qs = new URLSearchParams({ directions: name });
    const lat = target?.location?.lat;
    const lng = target?.location?.lng;
    if (typeof lat === "number" && typeof lng === "number") {
      qs.set("dlat", String(lat));
      qs.set("dlng", String(lng));
    }
    if (target?.id) qs.set("did", String(target.id));
    navigate(`/?${qs.toString()}`);
    return;
  }

  const msgByAction = {
    contact: `🔗 ${name} 연락처/웹: ${target?.phone ?? "-"} ${
      target?.url ?? ""
    }`,
    hours: `⏰ ${name} 운영시간: ${target?.hours ?? "알 수 없음"}`,
    price: `💰 ${name} 가격대: ${target?.priceTier ?? "알 수 없음"}`,
    reviews: `📝 ${name} 평점: ${target?.rating ?? "N/A"}`,
    similar: `🔍 ${name}와 비슷한 장소를 더 찾아볼게요`,
  };

  const msg = msgByAction[action];
  if (msg) {
    pushMessage(msg, "assistant");
    scrollToBottom?.();
  }
}

const intentToAction = {
  place_map: "map",
  place_contact: "contact",
  place_hours: "hours",
  place_price: "price",
  place_reviews: "reviews",
  place_similar: "similar",
};

// 나중에 서버를 만들면 연결
async function findPlaceByName(name, lastPlacesMsg) {
  const fromCarousel = lastPlacesMsg?.places?.find(
    (p) => p.name?.toLowerCase() === name.toLowerCase()
  );
  if (fromCarousel) return fromCarousel;

  try {
    const res = await fetch(`/api/lookup?name=${encodeURIComponent(name)}`);
    if (res.ok) {
      const json = await res.json(); // 형태는 백엔드에 맞게
      const item = Array.isArray(json) ? json[0] : json.item ?? json;
      if (item) return normalizePlaceData(item);
    }
  } catch (_) {}
  return undefined;
}

// 하단버튼
function QuickReplyBar({ currentName, onAction }) {
  return (
    <div className="px-4 pt-2 pb-3 m-0 bg-slate-150 border-t border-none !rounded-t-2xl">
      {/* 현재 선택 표시 */}
      <div className="flex flex-wrap gap-2">
        <button
          className="btn btn-sm rounded-full transition-colors bg-blue-200/70 border-[#4E94F8]/30
             hover:!bg-blue-300/70 hover:! hover:!border-[#4E94F8]/50
             focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4E94F8]/30"
          onClick={() => onAction("price")}
        >
          💰 가격대
        </button>
        <button
          className="btn btn-sm rounded-full transition-colors bg-blue-200/70 border-[#4E94F8]/30
             hover:!bg-blue-300/70 hover:! hover:!border-[#4E94F8]/50
             focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4E94F8]/30"
          onClick={() => onAction("hours")}
        >
          ⏰ 운영시간
        </button>
        <button
          className="btn btn-sm rounded-full transition-colors bg-blue-200/70 border-[#4E94F8]/30
             hover:!bg-blue-300/70 hover:! hover:!border-[#4E94F8]/50
             focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4E94F8]/30"
          onClick={() => onAction("reviews")}
        >
          📝 리뷰
        </button>
        <button
          className="btn btn-sm rounded-full transition-colors bg-blue-200/70 border-[#4E94F8]/30
             hover:!bg-blue-300/70 hover:! hover:!border-[#4E94F8]/50
             focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4E94F8]/30l"
          onClick={() => onAction("map")}
        >
          📍 지도에서 보기
        </button>
        <button
          className="btn btn-sm rounded-full transition-colors bg-blue-200/70 border-[#4E94F8]/30
             hover:!bg-blue-300/70 hover:! hover:!border-[#4E94F8]/50
             focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4E94F8]/30"
          onClick={() => onAction("contact")}
        >
          🔗 연락처/웹사이트
        </button>
      </div>
    </div>
  );
}

function AIChatPage() {
  const threads = useChatStore((s) => s.threads);
  const currentMessage = useChatStore((s) => s.currentMessage);
  const currentThreadId = useChatStore((s) => s.currentThreadId);
  const currentThread = useMemo(
    () => threads.find((t) => t.id === currentThreadId) ?? threads[0],
    [threads, currentThreadId]
  );

  const {
    sendMessage,
    setCurrentMessage,
    switchThread,
    createThread,
    deleteThread,
    clearCurrentThread,
  } = useChatStore((s) => s.actions);

  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  const scrollBoxRef = useRef(null);
  const didSeedRef = useRef(false);

  const [, navigate] = useLocation();

  const [sideOpen, setSideOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [selectedPlace, setSelectedPlace] = useState(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  };

  const pushMessage = useCallback(
    (text, sender = "user") => {
      const trimmed = (text || "").trim();
      if (!trimmed) return;
      sendMessage({ id: uid(), text: trimmed, sender, timestamp: Date.now() });
    },
    [sendMessage]
  );

  const msgs = currentThread?.messages ?? [];
  const lastPlacesMsg = useMemo(
    () => [...msgs].reverse().find((m) => m.kind === "places"),
    [msgs]
  );
  useEffect(() => {
    setActiveIndex(0);
    setSelectedPlace(null);
  }, [lastPlacesMsg?.id]);

  const currentPlace = lastPlacesMsg?.places?.[activeIndex] ?? null;
  const currentTargetPlace = selectedPlace || currentPlace;

  const handleActiveIndexChange = useCallback((i) => {
    setActiveIndex((prev) => {
      if (i !== prev) setSelectedPlace(null);
      return i;
    });
  }, []);

  const onQuickAction = useCallback(
    (a) => {
      const p = currentTargetPlace;
      if (!p) return;
      PlaceAction(a, p, { navigate, pushMessage, scrollToBottom });
    },
    [currentTargetPlace, navigate, pushMessage]
  );

  const aiEcho = useCallback(
    async (raw) => {
      const text = (raw || "").trim();
      if (!text) return;
      pushMessage(text, "user");
      setCurrentMessage("");
      const intent = detectIntent(text, "chat");

      if (intent === "places_recommend") {
        setTimeout(() => {
          pushMessage(`“${text}” 관련 추천 결과입니다.`, "assistant");
          const places = makeMockPlaces("food", 5);
          sendMessage({
            id: uid(),
            sender: "assistant",
            timestamp: Date.now(),
            kind: "places",
            places,
          });
          setSelectedPlace(null);
          setActiveIndex(0);
          scrollToBottom();
        }, 200);
        return;
      }

      const placeIntents = Object.keys(intentToAction);
      if (placeIntents.includes(intent)) {
        const nameGuess = extractPlaceName(text);
        const hasExplicitName =
          nameGuess &&
          !/^(위치|지도|길찾기|주소|어디|어딘지)$/i.test(nameGuess);
        let target;
        if (hasExplicitName)
          target = await findPlaceByName(nameGuess, lastPlacesMsg);
        else if (selectedPlace) target = selectedPlace;
        else if (currentPlace) target = currentPlace;
        if (!target && nameGuess) target = { name: nameGuess };
        if (!target?.name) {
          pushMessage("어떤 장소를 말씀하시는지 알려주세요.", "assistant");
          return;
        }
        setSelectedPlace(target);
        const action = intentToAction[intent];
        PlaceAction(action, target, { navigate, pushMessage, scrollToBottom });
        return;
      }

      pushMessage(`“${text}” 관련 대답중입니다.`, "assistant");
    },
    [
      pushMessage,
      setCurrentMessage,
      scrollToBottom,
      sendMessage,
      selectedPlace,
      currentPlace,
      lastPlacesMsg,
      navigate,
    ]
  );

  const query = useQueryParam("query");
  useEffect(() => {
    if (!query || didSeedRef.current) return;
    didSeedRef.current = true;
    aiEcho(query);
  }, [query, aiEcho]);
  useEffect(() => {
    scrollToBottom();
  }, [currentThread?.messages]);
  useEffect(() => {
    if (!textareaRef.current) return;
    textareaRef.current.style.height = "auto";
    textareaRef.current.style.height = `${Math.min(
      textareaRef.current.scrollHeight,
      150
    )}px`;
  }, [currentMessage]);

  const handleSendMessage = () => aiEcho(currentMessage);
  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTime = (timestamp) => {
    const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const startNewChat = () => {
    createThread("새 대화");
    setSideOpen(false);
    setTimeout(scrollToBottom, 0);
  };
  const openThread = (id) => {
    switchThread(id);
    setSideOpen(false);
    setTimeout(scrollToBottom, 0);
  };
  const removeThread = (id) => {
    if (!confirm("이 대화를 삭제할까요? 되돌릴 수 없습니다.")) return;
    deleteThread(id);
  };
  const clearThisChat = () => {
    if (!confirm("현재 대화의 메시지를 모두 지울까요?")) return;
    clearCurrentThread();
  };

  return (
    <MainBase current="ai">
      <div className="h-full flex flex-col min-h-0 font-sans">
        <ChildNav title="AI 추천">
          <div className="flex gap-2 shrink-0 pt-0">
            <button
              className="btn btn-ghost btn-sm justify-self-start shrink-0 border-none hover:bg-slate-200"
              onClick={() => setSideOpen(true)}
              aria-label="대화 목록 열기"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <path
                  d="M3 6h18M3 12h18M3 18h18"
                  stroke="currentColor"
                  strokeWidth="2"
                />
              </svg>
            </button>
          </div>
        </ChildNav>

        {sideOpen && (
          <div className="fixed inset-0 z-50">
            <div
              className="absolute inset-0 bg-black/40"
              onClick={() => setSideOpen(false)}
            />
            <aside className="absolute left-0 top-0 h-full w-80 bg-white shadow-xl p-4 overflow-y-auto">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold mb-3">대화 목록</h3>
                <button
                  className="btn btn-ghost btn-sm hover:!bg-slate-200/70 border-none"
                  onClick={startNewChat}
                >
                  새 채팅
                </button>
              </div>
              <ul className="space-y-2">
                {threads.map((t) => (
                  <li
                    key={t.id}
                    className={`flex items-center justify-between rounded-lg border-2 p-3 mb-3 hover:bg-slate-200/60 ${
                      t.id === currentThread?.id
                        ? "border-none bg-slate-200/60"
                        : "border-none"
                    }`}
                  >
                    <button
                      className="text-left flex-1"
                      onClick={() => openThread(t.id)}
                      title={t.title}
                    >
                      <div className="font-medium truncate">{t.title}</div>
                      <div className="text-xs text-gray-500">
                        {new Date(t.updatedAt || t.createdAt).toLocaleString()}
                      </div>
                    </button>
                    <button
                      className="btn btn-ghost btn-xs h-9 text-gray-500 hover:bg-slate-300/70 border-none"
                      onClick={() => removeThread(t.id)}
                      aria-label="대화 삭제"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        class="icon icon-tabler icons-tabler-outline icon-tabler-trash"
                      >
                        <path stroke="none" d="M0 0h24v24H0z" fill="none" />
                        <path d="M4 7l16 0" />
                        <path d="M10 11l0 6" />
                        <path d="M14 11l0 6" />
                        <path d="M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2 -2l1 -12" />
                        <path d="M9 7v-3a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v3" />
                      </svg>
                    </button>
                  </li>
                ))}
              </ul>
            </aside>
          </div>
        )}

        {/* 채팅 메시지 영역 */}
        <div
          ref={scrollBoxRef}
          className="custom-scroll flex-1 min-h-0 overflow-y-auto px-4 py-3 space-y-3 bg-blue-50"
          style={{ paddingBottom: currentTargetPlace ? 180 : 120 }}
        >
          {msgs.length === 0 ? (
            <div className="flex flex-col justify-center items-center h-full text-slate-600">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-16 my-4 text-blue-400"
              >
                <path stroke="none" d="M0 0h24v24H0z" fill="none" />
                <path d="M3 19a2 2 0 1 0 4 0a2 2 0 0 0 -4 0" />
                <path d="M19 7a2 2 0 1 0 0 -4a2 2 0 0 0 0 4z" />
                <path d="M11 19h5.5a3.5 3.5 0 0 0 0 -7h-8a3.5 3.5 0 0 1 0 -7h4.5" />
              </svg>
              <div className="text-center">
                <h3 className="text-xl font-semibold">AI 추천 시작하기</h3>
                <p className="text-gray-500 p-4">
                  부산에서 원하시는 목적지, 분위기를 입력해보세요.
                  <br /> AI 갈매기가 추천해드려요.{" "}
                </p>
              </div>
            </div>
          ) : (
            msgs.map((message, i) => {
              const prev = msgs[i - 1];

              // 현재/이전 발신자 계산
              const currSender =
                message.kind === "places" ? "ai" : message.sender;
              const prevSender = prev
                ? prev.kind === "places"
                  ? "ai"
                  : prev.sender
                : null;

              // 발신자 바뀌는 지점이면 true
              const groupStart = i === 0 || currSender !== prevSender;

              if (message.kind === "places") {
                const isLast = message.id === lastPlacesMsg?.id;
                return (
                  <div
                    key={message.id}
                    className={groupStart ? "mt-4 md:mt-5" : ""}
                  >
                    <AssistantPlacesMessageSlim
                      places={message.places}
                      onActiveIndexChange={
                        isLast ? handleActiveIndexChange : undefined
                      }
                    />
                  </div>
                );
              }

              const isUser = message.sender === "user";
              return (
                <div
                  key={message.id}
                  className={[
                    "flex items-end gap-2",
                    isUser ? "justify-end" : "justify-start",
                    groupStart ? "mt-4 md:mt-5" : "",
                  ].join(" ")}
                >
                  {!isUser && (
                    <div className="mb-9">
                      <img
                        src="/src/assets/gal.png"
                        alt="AI"
                        className="shrink-0 w-8 h-8 rounded-full object-cover ring-1 ring-white/50 shadow"
                      />
                    </div>
                  )}

                  <div
                    className={`max-w-[75%] flex flex-col ${
                      isUser ? "items-end" : "items-start"
                    }`}
                  >
                    <div className="mb-1 text-xs text-slate-500 select-none">
                      {isUser ? "" : "AI 갈매기"}
                    </div>
                    <div
                      className={`${
                        isUser
                          ? "bg-[rgb(100_160_250_/_.99)] text-white"
                          : "bg-white text-slate-800 border border-slate-100"
                      } rounded-2xl px-4 py-2.5`}
                    >
                      {message.text}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>
        {/* 하단 고정: Dock 바로 위에 붙이기 */}
        <div
          className="
            fixed left-1/2 -translate-x-1/2 z-40
            w-full max-w-3xl px-8 md:px-16 space-y-2
          "
          style={{ bottom: "calc(76px + env(safe-area-inset-bottom))" }} // Dock 높이에 맞춰 붙임
        >
          {/* 퀵바 (선택된 장소 있을 때만 표시) */}
          {currentTargetPlace && (
            <QuickReplyBar
              currentName={currentTargetPlace?.name ?? "-"}
              onAction={onQuickAction}
            />
          )}

          {/* 입력창 */}
          <div className="border-none  bg-slate-50 p-4 shadow-sm">
            <div className="flex items-center gap-2">
              <input
                ref={textareaRef}
                value={currentMessage}
                onChange={(e) =>
                  useChatStore
                    .getState()
                    .actions.setCurrentMessage(e.target.value)
                }
                onKeyDown={handleKeyDown}
                placeholder="갈매기에게 무엇이든 물어보세요!"
                className="input w-full rounded-xl border border-slate-300 bg-white px-3 py-6 focus:outline-none"
                rows="1"
              />
              <button
                onClick={handleSendMessage}
                disabled={currentMessage.trim() === ""}
                className="btn btn-circle !bg-blue-300 hover:!bg-blue-500/90 text-white"
              >
                {/* paper-plane 아이콘 그대로 */}
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="25"
                  height="25"
                  viewBox="0 0 20 22"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="icon icon-tabler icons-tabler-outline icon-tabler-send-2"
                >
                  <path stroke="none" d="M0 0h24v24H0z" fill="none" />
                  <path d="M4.698 4.034l16.302 7.966l-16.302 7.966a.503 .503 0 0 1 -.546 -.124a.555 .555 0 0 1 -.12 -.568l2.468 -7.274l-2.468 -7.274a.555 .555 0 0 1 .12 -.568a.503 .503 0 0 1 .546 -.124z" />
                  <path d="M6.5 12h14.5" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* 스크롤바 커스텀 (컴포넌트 범위) */}
        <style>{`
          .custom-scroll { scrollbar-width: thin; scrollbar-color: #cbd5e1 #f8fafc; }
          .custom-scroll::-webkit-scrollbar { width: 8px; height: 8px; }
          .custom-scroll::-webkit-scrollbar-track { background: #f8fafc; border-radius: 9999px; }
          .custom-scroll::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 9999px; }
          .custom-scroll:hover::-webkit-scrollbar-thumb { background: #94a3b8; }
        `}</style>
      </div>
    </MainBase>
  );
}

export default AIChatPage;
