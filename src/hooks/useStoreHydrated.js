import { useEffect, useState } from "react";
import useSettingStore from "../store/setting";

export default function useStoreHydrated() {
  const [hydrated, setHydrated] = useState(
    () =>
      // 이미 복원되었으면 바로 true
      useSettingStore.persist?.hasHydrated?.() ?? false,
  );

  useEffect(() => {
    // 복원 끝나면 true로
    const unsub = useSettingStore.persist?.onFinishHydration?.(() => {
      setHydrated(true);
    });
    // 이미 끝난 상태면 바로 true
    if (useSettingStore.persist?.hasHydrated?.()) {
      setHydrated(true);
    }
    return () => unsub?.();
  }, []);

  return hydrated;
}
