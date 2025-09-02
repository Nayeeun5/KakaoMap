import { useEffect, useMemo, useState } from "react";
import { useLocation, useRoute } from "wouter";
import MainBase from "../components/MainBase";

// 간단 정규화
const norm = (s = "") =>
  s
    .toString()
    .trim()
    .replace(/\s*[\(（][^)）]*[\)）]\s*/g, "")
    .replace(/\s+/g, "")
    .toLowerCase();

const makePoiIndex = (list = []) => {
  const m = new Map();
  for (const r of list) {
    const idRaw = r.id ?? r.row?.id ?? "";
    const nameRaw =
      r.name ?? r.row?.name ?? r.address_hint ?? r.address ?? idRaw;

    const id = String(idRaw).trim();
    const name = String(nameRaw).trim();
    const lat = Number(r.lat ?? r.row?.lat);
    const lng = Number(r.lng ?? r.row?.lng);
    if (!id || !Number.isFinite(lat) || !Number.isFinite(lng)) continue;

    const obj = { name, lat, lng };

    // 여러 키로 접근 가능
    m.set(id, obj);
    m.set(name, obj);
    m.set(norm(id), obj);
    m.set(norm(name), obj);
  }
  return m;
};

const COURSE_MAP = {
  // 부산 해안코스 드라이브
  drive: {
    title: "부산 해안코스 드라이브",
    intro:
      "해안 뷰를 따라 천천히 달리며 포인트만 짚어 가는 드라이브 루트 모음입니다.",
    sections: [
      {
        name: "동부 오션뷰 드라이브",
        anchor: "달맞이길 전망",
        duration: "3–5h",
        bullets: [
          "달맞이길 전망",
          "청사포 다릿돌전망대",
          "송정해수욕장",
          "해동용궁사",
          "기장 멜튼/시장",
        ],
        image:
          "https://www.visitbusan.net/uploadImgs/files/hqimgfiles/20200313110744394_thumbL",
      },
      {
        name: "남부 파노라마",
        anchor: "이기대 해안공원(하이라이트)",
        duration: "4–6h",
        bullets: [
          "이기대 해안공원(주차 후 짧은 뷰포인트)",
          "오륙도 스카이워크",
          "광안리(밀락수변공원)",
          "해운대 마린시티 순환",
        ],
        image:
          "https://www.visitbusan.net/uploadImgs/files/hqimgfiles/20200327132326598_thumbL",
      },
      {
        name: "영도 일주",
        anchor: "태종대",
        duration: "4–6h",
        bullets: [
          "태종대",
          "흰여울문화마을",
          "절영해안산책로(주차 후 스냅)",
          "남항대교 드라이브",
          "송도해상케이블카 하부",
        ],
        image:
          "https://www.visitbusan.net/uploadImgs/files/hqimgfiles/20200327140456550_thumbL",
      },
      {
        name: "서부 석양 루트",
        anchor: "암남공원",
        duration: "3–5h",
        bullets: [
          "암남공원",
          "송도구름산책로",
          "다대포해수욕장 & 노을",
          "을숙도 전망",
        ],
        image:
          "https://www.visitbusan.net/uploadImgs/files/hqimgfiles/20230905172121074_thumbL",
      },
      {
        name: "야경 하이라이트",
        anchor: "황령산 봉수대 전망대",
        duration: "3–4h (저녁 추천)",
        bullets: [
          "황령산 봉수대 전망",
          "광안대교 야경(광안리/민락)",
          "해운대 엑스더스카이 또는 더베이101",
        ],
        image:
          "https://www.visitbusan.net/uploadImgs/files/hqimgfiles/20220530150753006_thumbL",
      },
    ],
  },

  // 부산 해안 산책로 도보
  walk: {
    title: "부산 해안 산책로 도보",
    intro:
      "차는 잠시 쉬고, 뷰 좋은 구간만 쏙쏙 골라 걷는 라이트 워크 코스예요.",
    sections: [
      {
        name: "해운대–동백섬 라이트 워크",
        anchor: "해운대해수욕장",
        duration: "2–3h",
        bullets: ["해운대해수욕장 모래사장", "동백섬 누리마루", "더베이101"],
        image:
          "https://www.visitbusan.net/uploadImgs/files/hqimgfiles/20200327141200390_thumbL",
      },
      {
        name: "청사포 레일·해변 트레일",
        anchor: "청사포 다릿돌전망대",
        duration: "2–3h",
        bullets: [
          "미포 정거장 주변 산책",
          "청사포 다릿돌전망대 왕복",
          "스카이캡슐 편도 + 도보 복귀(선택)",
        ],
        image:
          "https://www.visitbusan.net/uploadImgs/files/hqimgfiles/20200326145347955_thumbL",
      },
      {
        name: "이기대 절경 라인",
        anchor: "이기대 해안공원(하이라이트)",
        duration: "2–3h",
        bullets: ["이기대 입구", "오륙도 전망 포인트 구간만 왕복(핵심 뷰만)"],
        image:
          "https://www.visitbusan.net/uploadImgs/files/hqimgfiles/20200326092936405_thumbL",
      },
      {
        name: "송도 구름산책",
        anchor: "송도구름산책로",
        duration: "1.5–2.5h",
        bullets: [
          "송도구름산책로",
          "암남공원 초입 뷰포인트",
          "송도해상케이블카 탑승(선택)",
        ],
        image:
          "https://www.visitbusan.net/uploadImgs/files/hqimgfiles/20200327140456550_thumbL",
      },
      {
        name: "다대포 노을 워크",
        anchor: "다대포 몰운대",
        duration: "2h",
        bullets: [
          "다대포몰운대 산책",
          "낙동강하구 전망",
          "노을·분수 시간대 맞춰 귀환",
        ],
        image:
          "https://www.visitbusan.net/uploadImgs/files/hqimgfiles/20200908182049724_thumbL",
      },
    ],
  },

  // 부산 맛집탐방 코스
  food: {
    title: "부산 맛집탐방 코스",
    intro: "로컬 소울푸드부터 바다뷰 야식까지, 부산의 맛을 동선에 맞춰 즐겨요.",
    sections: [
      {
        name: "남포·자갈치 시푸드",
        anchor: "자갈치시장",
        duration: "3–5h",
        bullets: [
          "자갈치시장 생선회/구이",
          "BIFF 씨앗호떡",
          "국제시장 골목 분식",
        ],
        image:
          "https://www.visitbusan.net/uploadImgs/files/hqimgfiles/20200313110025780_thumbL",
      },
      {
        name: "서면 로컬 소울푸드",
        anchor: "전포 카페거리",
        duration: "3–4h",
        bullets: ["돼지국밥", "밀면", "전포커피거리 디저트"],
        image:
          "https://www.visitbusan.net/uploadImgs/files/hqimgfiles/20200326092201015_thumbL",
      },
      {
        name: "해운대 바다&포차",
        anchor: "해운대해수욕장",
        duration: "3–5h",
        bullets: ["해운대 횟집/활어회", "미포 포장마차", "야경 보면서 맥주"],
        image:
          "https://www.visitbusan.net/uploadImgs/files/hqimgfiles/20200918171137318_thumbL",
      },
      {
        name: "영도 어묵&빵",
        anchor: "흰여울문화마을",
        duration: "3–4h",
        bullets: ["어묵(체험/카페형)", "흰여울 카페", "지역 베이커리"],
        image:
          "https://www.visitbusan.net/uploadImgs/files/hqimgfiles/20200326153630357_thumbL",
      },
      {
        name: "전통시장 투어",
        anchor: "국제시장",
        duration: "3–4h",
        bullets: [
          "국제시장 먹자골목",
          "부평깡통야시장",
          "보수동 책방골목 카페",
        ],
        image:
          "https://www.visitbusan.net/uploadImgs/files/hqimgfiles/20200715174535509_thumbL",
      },
    ],
  },

  // 부산 명소 코스
  sight: {
    title: "부산 명소 코스",
    intro: "클래식부터 감성 루트까지, 부산을 처음/다시 만나는 정석 코스.",
    sections: [
      {
        name: "남포·중구 클래식",
        anchor: "암남공원",
        duration: "4–6h",
        bullets: [
          "BIFF광장",
          "자갈치시장",
          "국제시장(먹거리)",
          "용두산공원(부산타워)",
        ],
        image:
          "https://www.visitbusan.net/uploadImgs/files/hqimgfiles/20201223151425760_thumbL",
      },
      {
        name: "해운대 시그니처",
        anchor: "암남공원",
        duration: "4–6h",
        bullets: [
          "해운대해수욕장",
          "동백섬 누리마루",
          "마린시티/더베이101",
          "(옵션) 엑스더스카이",
        ],
        image:
          "https://www.visitbusan.net/uploadImgs/files/hqimgfiles/20200827181934132_thumbL",
      },
      {
        name: "영도 감성",
        anchor: "암남공원",
        duration: "4–6h",
        bullets: [
          "태종대",
          "흰여울문화마을",
          "절영해안산책로",
          "영도 카페 한 곳",
        ],
        image:
          "https://www.visitbusan.net/uploadImgs/files/hqimgfiles/20200327142332082_thumbL",
      },
      {
        name: "센텀·문화",
        anchor: "암남공원",
        duration: "4–6h",
        bullets: [
          "부산시립미술관/벡스코 중 택1",
          "신세계센텀 스파랜드(실내)",
          "영화의전당",
        ],
        image:
          "https://www.visitbusan.net/uploadImgs/files/hqimgfiles/20200327131947732_thumbL",
      },
      {
        name: "도심+바다 믹스",
        anchor: "암남공원",
        duration: "4–6h",
        bullets: ["서면/전포 카페거리", "광안리 해변 산책", "황령산 야경"],
        image:
          "https://www.visitbusan.net/uploadImgs/files/hqimgfiles/20200327134322957_thumbL",
      },
    ],
  },
};

export default function CourseDetailPage() {
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/course/:kind");
  const kind = params?.kind ?? "drive";

  const course = useMemo(() => COURSE_MAP[kind] ?? COURSE_MAP.drive, [kind]);

  const [poiIndex, setPoiIndex] = useState(new Map());
  useEffect(() => {
    let cancelled = false;
    fetch("/busan_pois_geocoded.json", { cache: "force-cache" })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((json) => {
        if (!cancelled && Array.isArray(json) && json.length) {
          setPoiIndex(makePoiIndex(json));
        }
      })
      .catch((err) => {
        console.error("로드 실패:", err);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // 섹션 이미지 클릭
  const onSectionImageClick = (section) => {
    if (poiIndex.size === 0) {
      alert("장소 데이터 로딩중");
      return;
    }

    const tryResolve = (k) =>
      k ? poiIndex.get(k) || poiIndex.get(norm(k)) : null;

    const byAnchor = tryResolve(section.anchor);
    if (byAnchor) {
      setLocation(
        `/?directions=${encodeURIComponent(byAnchor.name)}&dlat=${
          byAnchor.lat
        }&dlng=${byAnchor.lng}`
      );
      return;
    }

    // 자동 매칭 시도
    for (const b of section.bullets ?? []) {
      const hit = poiIndex.get(b) || poiIndex.get(norm(b));
      if (hit) {
        setLocation(
          `/?directions=${encodeURIComponent(hit.name)}&dlat=${hit.lat}&dlng=${
            hit.lng
          }`
        );
        return;
      }
    }

    // 없으면 알림
    alert("이 섹션에 연결된 장소 좌표를 JSON에서 찾지 못했어요.");
  };

  return (
    <MainBase current="recommend">
      {/* 헤더 */}
      <div className="flex items-center gap-2 px-2 py-3">
        <button
          onClick={() => setLocation("/recommend")}
          className="inline-flex items-center justify-center rounded-full w-9 h-9 hover:bg-gray-100"
          aria-label="뒤로가기"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <h1 className="text-lg font-semibold truncate">{course.title}</h1>
      </div>
      <div>
        <p className="text-base pb-5 text-gray-600 mb-2 ml-10 emphasis-loop">
          {course.intro}
        </p>
        <p className="mt-1 text-xs text-gray-600/60 mb-2 ml-4">
          원하시는 코스의 이미지를 클릭해보세요
        </p>
      </div>

      {/* 섹션 리스트 */}
      <ol className="mx-2 space-y-4">
        {course.sections.map((s, idx) => (
          <li
            key={idx}
            className="group rounded-2xl border border-gray-200 bg-white p-2 shadow-sm transition hover:shadow-md hover:border-blue-200"
          >
            <div className="flex items-start gap-3">
              <div className="flex-1 grid grid-cols-1 md:grid-cols-[1fr_220px] gap-3">
                {/* 본문 */}
                <div className="rounded-xl bg-blue-50 p-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-lg font-semibold text-gray-800">
                      {s.name}
                    </h3>
                    <span className="text-[11px] px-2 py-0.5 text-emerald-700">
                      걸리는 시간: {s.duration}
                    </span>
                  </div>

                  <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-2 text-sm text-gray-700">
                    {s.bullets.map((stop, i) => (
                      <span
                        key={`stop-${i}`}
                        className="inline-flex items-center"
                      >
                        <span className="px-2 py-1">{stop}</span>
                        {i < s.bullets.length - 1 && (
                          <svg
                            aria-hidden
                            className="mx-2 w-4 h-4 shrink-0 opacity-70"
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M9 18l6-6-6-6" />
                          </svg>
                        )}
                      </span>
                    ))}
                  </div>
                </div>

                {/* 이미지 (우측) */}
                <div className="md:justify-self-end">
                  <button
                    type="button"
                    onClick={() => onSectionImageClick(s)}
                    aria-label={`${s.name} 지도 보기`}
                  >
                    <div className="w-full aspect-[3/2] overflow-hidden rounded-lg">
                      <img
                        src={s.image}
                        alt={s.name}
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </li>
        ))}
      </ol>

      <div className="h-6" />
      <footer
        role="contentinfo"
        className="mx-2 mt-4 text-[11px] text-gray-500"
      >
        사진 출처:{" "}
        <a
          href="https://www.visitbusan.net/index.do?menuCd=DOM_000000204009000000"
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-2 hover:opacity-80"
        >
          VISIT BUSAN(부산광역시·부산관광공사)
        </a>
        {" | "}촬영: (주)써머트리, 이음미디어(주){" | "}
      </footer>
    </MainBase>
  );
}
