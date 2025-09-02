import { create } from "zustand";
import { persist } from "zustand/middleware";
import { uid } from "../lib/utils.js";

const newThread = (title = "임시 제목") => ({
  id: uid(),
  title,
  createdAt: Date.now(),
  updatedAt: Date.now(),
  messages: [],
});

const createInitialState = () => ({
  threads: [newThread()],
  currentThreadId: null,
  currentMessage: "",
});

const getCurrentThread = (state) => {
  const { threads, currentThreadId } = state;
  return threads.find((t) => t.id === currentThreadId) ?? threads[0];
};

const useChatStore = create(
  persist(
    (set, get) => ({
      ...createInitialState(),
      actions: {
        // 현재 메시지 설정
        setCurrentMessage: (text) =>
          set(() => ({
            currentMessage: text,
          })),

        // 현재 메시지 초기화
        clearCurrentMessage: () =>
          set(() => ({
            currentMessage: "",
          })),

        // 스레드 변경
        switchThread: (id) =>
          set((state) => {
            const exists = state.threads.some((t) => t.id === id);
            return exists
              ? {
                  currentThreadId: id,
                  currentMessage: "",
                }
              : {};
          }),

        // 스레드 생성
        createThread: (title = "새 대화") =>
          set((state) => {
            const t = newThread(title);
            return {
              threads: [t, ...state.threads],
              currentThreadId: t.id,
              currentMessage: "",
            };
          }),

        // 스레드 삭제
        deleteThread: (id) =>
          set((state) => {
            let threads = state.threads.filter((t) => t.id !== id);
            if (threads.length === 0) threads = [newThread("새 대화")];
            const nextId =
              id === state.currentThreadId
                ? threads[0].id
                : state.currentThreadId;
            return {
              threads,
              currentThreadId: nextId,
              currentMessage: "",
            };
          }),

        // 현재 스레드 내용 삭제
        clearCurrentThread: () =>
          set((state) => {
            const cur = getCurrentThread(state);
            return {
              threads: state.threads.map((t) =>
                t.id === cur.id
                  ? { ...t, messages: [], updatedAt: Date.now() }
                  : t
              ),
              currentMessage: "",
            };
          }),

        // 메시지 전송
        sendMessage: (text) =>
          set((state) => {
            const cur = getCurrentThread(state);
            if (!cur) return {};

            // 기본값 세팅
            const fullMsg = {
              ...text,
              id: text?.id ?? uid(),
              timestamp: text?.timestamp ?? Date.now(),
              sender: text?.sender ?? "assistant",
            };

            if (typeof fullMsg.text === "string") {
              fullMsg.text = fullMsg.text.trim();
            }

            // 빈 메시지 방지
            const hasContent =
              (typeof fullMsg.text === "string" && fullMsg.text.length > 0) ||
              !!fullMsg.kind ||
              !!fullMsg.places;
            if (!hasContent) return {};

            const threads = state.threads.map((t) =>
              t.id === cur.id
                ? {
                    ...t,
                    messages: [...(t.messages ?? []), fullMsg],
                    updatedAt: Date.now(),
                  }
                : t
            );

            return { threads, currentMessage: "" };
          }),

        // 전체 상태 초기화
        reset: () => set(() => ({ ...createInitialState() })),
      },
    }),
    {
      name: "chat-storage",
      getStorage: () =>
        typeof window !== "undefined" ? localStorage : undefined, // 앱버전은 AsyncStorage
      partialize: (state) => ({
        threads: state.threads,
        currentThreadId: state.currentThreadId,
      }),
    }
  )
);

export default useChatStore;
