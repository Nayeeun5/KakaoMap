import { useEffect, useState } from "react";
import LandingBase from "../components/LandingBase";
import { useLocation } from "wouter";
import useSettingStore from "../store/setting";

// 주소 입력
function AddressInput({
  id,
  label,
  value,
  onChange,
  source = [],
  openFor,
  setOpenFor,
}) {
  const [suggestions, setSuggestions] = useState([]);

  const handleChange = (val) => {
    onChange(val);

    // 2글자 이상일 때만 추천
    if (!val.trim() || val.trim().length < 2) {
      setSuggestions([]);
      setOpenFor(null);
      return;
    }

    const tokens = val.split(/\s+/).filter(Boolean);
    const filtered = source
      .filter((addr) => {
        return tokens.every((t) => addr.includes(t));
      })
      .slice(0, 20);

    setSuggestions(filtered);
    setOpenFor(id);
  };

  const handleSelect = (addr) => {
    onChange(addr);
    setSuggestions([]);
    setOpenFor(null);
  };

  // 입력창을 누르면 그 입력창을 활성화
  const handleFocus = () => {
    if (suggestions.length > 0) setOpenFor(id);
  };

  // 다른 입력창으로 이동시 입력창 비활성화
  const handleClose = () => {
    setSuggestions([]);
    setOpenFor(null);
  };

  const isOpen = suggestions.length > 0 && openFor === id;

  return (
    <div className="relative mb-6">
      <h3 className="text-xl font-bold text-gray-800 mb-2">{label}</h3>

      <input
        type="text"
        placeholder={`${label} 주소를 입력하세요`}
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        onFocus={handleFocus}
        onClose={handleClose}
        className="input input-lg w-full border-2 border-black"
        aria-autocomplete="list"
        aria-expanded={isOpen}
      />

      {isOpen && (
        <div className="absolute left-0 right-0 z-20 bg-white border border-gray-300 mt-2 rounded-lg shadow max-h-60 overflow-auto">
          {suggestions.map((addr, idx) => (
            <div
              key={idx}
              className="px-4 py-2 hover:bg-blue-100 cursor-pointer"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => handleSelect(addr)}
              role="option"
            >
              {addr}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AddressSearchPage() {
  const geo = useSettingStore((s) => s.geo);
  const setGeoField = useSettingStore((s) => s.actions.setGeoField);

  const [addressList, setAddressList] = useState([]);
  const [, setLocation] = useLocation();
  const [openFor, setOpenFor] = useState(null);

  // CSV 로드
  useEffect(() => {
    fetch("/busan_address.csv")
      .then((res) => res.text())
      .then((text) => {
        const lines = text
          .split(/\r?\n/)
          .map((l) => l.trim())
          .filter(Boolean);

        const s = (v) => (v ?? "").trim();

        const all = [];

        lines.forEach((line) => {
          // 시도, 구군, 동, 도로명, 본번, 부번, 건축물용도
          const [sido, gugu, dong, road, mainNo, subNo, buildName, usage] = line
            .split(",")
            .map(s);

          const main = mainNo;
          const sub = subNo;

          // 부번이 비었거나 "0"이면 본번만, 그 외엔 "본번-부번"
          const numPart = sub && sub !== "0" ? `${main}-${sub}` : main;

          // 최종 표시
          const base = `${sido} ${gugu} ${road} ${numPart}`;
          const display = buildName
            ? `${base} (${dong}, ${buildName})`
            : `${base} (${dong})`;

          all.push(display);
        });

        setAddressList(all);
      })
      .catch((err) => console.error("주소 CSV 로드 실패:", err));
  }, []);

  return (
    <LandingBase>
      <div className="flex flex-col gap-8 justify-center">
        <header>
          <h1 className="text-3xl font-bold">주소 검색</h1>
          <p className="text-slate-700">
            자주가는 장소를 입력해주세요. 추후 마이페이지에서도 변경이 가능해요.
          </p>
        </header>

        <section>
          <AddressInput
            id="home"
            label="집"
            value={geo.home}
            onChange={(v) => setGeoField("home", v)}
            source={addressList}
            openFor={openFor}
            setOpenFor={setOpenFor}
          />
          <AddressInput
            id="school"
            label="학교"
            value={geo.school}
            onChange={(v) => setGeoField("school", v)}
            source={addressList}
            openFor={openFor}
            setOpenFor={setOpenFor}
          />
          <AddressInput
            id="workplace"
            label="직장"
            value={geo.workplace}
            onChange={(v) => setGeoField("workplace", v)}
            source={addressList}
            openFor={openFor}
            setOpenFor={setOpenFor}
          />

          <div className="mt-8 flex justify-between">
            <button
              className="btn bg-black text-white border-black"
              onClick={() => setLocation("/setting/lang")}
            >
              이전으로
            </button>
            <button
              className="btn bg-black text-white border-black"
              onClick={() => setLocation("/setting/prefer")}
            >
              다음으로
            </button>
          </div>
        </section>
      </div>
    </LandingBase>
  );
}
