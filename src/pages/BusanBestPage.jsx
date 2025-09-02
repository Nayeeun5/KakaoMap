import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import MainBase from "../components/MainBase";
import { PlaceList, PlaceCarousel } from "../components/place";
import { makeMockPlaces } from "../lib/place";
import ChildNav from "../components/ChildNav";

export default function BusanBestPage() {
  const [, navigate] = useLocation();

  function goCourseSelect(kind) {
  navigate(`/course/${kind}`);
}

  // 보기 모드
  const [viewMode, setViewMode] = useState("list");

  const [foodIndex, setFoodIndex] = useState(0);
  const [sightIndex, setSightIndex] = useState(0);

  const foodPlaces = useMemo(() => makeMockPlaces("food", 15), []);
  const sightPlaces = useMemo(() => makeMockPlaces("sight", 15), []);

  return (
    <MainBase current="recommend">
      <div className="h-full flex flex-col min-h-0 bg-blue-50">
        <ChildNav title="부산 추천">
          <div className="inline-flex rounded-full bg-gray-200 p-1">
            <button
              className={`px-3 py-1 text-sm rounded-full cursor-pointer ${viewMode === "list" ? "bg-white shadow" : "text-gray-600"}`}
              onClick={() => setViewMode("list")}
            >
              리스트
            </button>
            <button
              className={`px-3 py-1 text-sm rounded-full cursor-pointer ${viewMode === "card" ? "bg-white shadow" : "text-gray-600"}`}
              onClick={() => setViewMode("card")}
            >
              카드
            </button>
          </div>
        </ChildNav>

        {/* 본문 스크롤 영역 */}
        <div className="flex-1 min-h-0 overflow-y-auto px-4 pt-4 pb-6 space-y-8 scrollbar-hide">
          {/* 부산 맛집 BEST */}
          <section className="rounded-2xl border border-base-300 bg-white shadow p-4">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h3 className="text-lg font-semibold text-gray-800">부산 맛집 BEST</h3>
                <p className="text-xs text-gray-500 pt-2">요즘 뜨는 로컬 스팟을 골라봤어요</p>
              </div>
              <div className="flex items-center gap-3">
                <button className="btn btn-sm bg-blue-500 border-none hover:bg-blue-600 text-white rounded-full">
                  자세히 보기
                </button>
              </div>
            </div>

            {viewMode === "card" ? (
              <PlaceCarousel places={foodPlaces} onActiveIndexChange={setFoodIndex} />
            ) : (
              <div className="max-h-[480px] overflow-y-auto pr-1 -mr-1 scrollbar-hide">
                <PlaceList places={foodPlaces} />
              </div>
            )}
          </section>

          {/* 부산 관광지 BEST */}
          <section className="rounded-2xl border border-base-300 bg-white shadow p-4">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h3 className="text-lg font-semibold text-gray-800">부산 관광지 BEST</h3>
                <p className="text-xs text-gray-500">뷰 · 산책 · 포토스팟 모음</p>
              </div>
              <div className="flex items-center gap-3">
                <button className="btn btn-sm bg-blue-500 border-none hover:bg-blue-600 text-white rounded-full">
                  자세히 보기
                </button>
              </div>
            </div>

            {viewMode === "card" ? (
              <PlaceCarousel places={sightPlaces} onActiveIndexChange={setSightIndex} />
            ) : (
              <div className="max-h-[480px] overflow-y-auto pr-1 -mr-1 scrollbar-hide">
                <PlaceList places={sightPlaces} />
              </div>
            )}
          </section>

          {/* 부산 여행코스 */}
          <section className="rounded-2xl border border-base-300 bg-white shadow p-4">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h3 className="text-lg font-semibold text-gray-800">부산 여행코스</h3>
              </div>
            </div>

            <ul role="list" className="divide-y divide-gray-100">
              {/* 해안도로 드라이브 */}
              <li>
                <button
                  type="button"
                  onClick={() => goCourseSelect("drive")}
                  className="w-full flex items-center gap-3 py-3 text-left hover:bg-gray-50 focus:bg-gray-50 rounded-xl px-2 transition"
                >
                  <img
                    src="https://images.unsplash.com/photo-1611372876693-4dc4153dee61?q=80&w=2060&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
                    alt="해안도로 드라이브"
                    className="w-24 h-16 object-cover rounded-lg"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-lg font-semibold text-gray-800">해안도로 드라이브</div>
                    <div className="text-xs text-gray-500 truncate">
                      동·남·영도·서부·야경 5개 핵심 루트
                    </div>
                  </div>
                  <svg
                    className="shrink-0"
                    xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"
                    fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                  >
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                </button>
              </li>

              {/* 부산 해안 산책로 도보 */}
              <li>
                <button
                  type="button"
                  onClick={() => goCourseSelect("walk")}
                  className="w-full flex items-center gap-3 py-3 text-left hover:bg-gray-50 focus:bg-gray-50 rounded-xl px-2 transition"
                >
                  <img
                    src="https://images.unsplash.com/photo-1558981403-c5f9899a28bc?q=80&w=1470&auto=format&fit=crop"
                    alt="부산 해안 산책로 도보"
                    className="w-24 h-16 object-cover rounded-lg"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-lg font-semibold text-gray-800">부산 해안 산책로 도보</div>
                    <div className="text-xs text-gray-500 truncate">뷰 좋은 구간만 라이트 워크</div>
                  </div>
                  <svg
                    className="shrink-0"
                    xmlns="http://www.w3.org/2000/svg" width="20" height="20"
                    viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                    strokeLinecap="round" strokeLinejoin="round"
                  >
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                </button>
              </li>

              {/* 부산 맛집 코스 */}
              <li>
                <button
                  type="button"
                  onClick={() => goCourseSelect("food")}
                  className="w-full flex items-center gap-3 py-3 text-left hover:bg-gray-50 focus:bg-gray-50 rounded-xl px-2 transition"
                >
                  <img
                    src="https://cdn.pixabay.com/photo/2022/08/16/05/21/soondaeguk-7389373_1280.jpg"
                    alt="부산 맛집 코스"
                    className="w-24 h-16 object-cover rounded-lg"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-lg font-semibold text-gray-800">부산 맛집 코스</div>
                    <div className="text-xs text-gray-500 truncate">
                      돼지국밥·밀면·포차·시장 투어
                    </div>
                  </div>
                  <svg
                    className="shrink-0"
                    xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"
                    fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                  >
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                </button>
              </li>

              {/* 부산 명소 코스 */}
              <li>
                <button
                  type="button"
                  onClick={() => goCourseSelect("sight")}
                  className="w-full flex items-center gap-3 py-3 text-left hover:bg-gray-50 focus:bg-gray-50 rounded-xl px-2 transition"
                >
                  <img
                    src="https://images.unsplash.com/photo-1655829184043-34819d7dfeb6?q=80&w=1470&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
                    alt="부산 명소 코스"
                    className="w-24 h-16 object-cover rounded-lg"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-lg font-semibold text-gray-800">부산 명소 코스</div>
                    <div className="text-xs text-gray-500 truncate">
                      남포·해운대·영도·센텀 뷰·포토스팟
                    </div>
                  </div>
                  <svg
                    className="shrink-0"
                    xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"
                    fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                  >
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                </button>
              </li>
            </ul>
          </section>

          {/* 교통 실시간 */}
          <section className="rounded-2xl border border-base-300 bg-white shadow p-4 text-center">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-gray-800">교통 실시간 정보</h3>
              <button className="btn btn-sm bg-blue-500 border-none hover:bg-blue-600 text-white rounded-full">
                자세히 보기
              </button>
            </div>
            <div className="text-sm">※ 지하철/버스/도로 혼잡도</div>
          </section>
        </div>
      </div>
    </MainBase>
  );
}
