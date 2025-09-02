"use client";

export default function Navigation() {
  // const pathname = usePathname();

  const getActiveSection = () => {
    // if (pathname === "/AIchat") return 0;
    // if (pathname === "/Mainpage") return 1;
    // if (pathname === "/BusanBest") return 2;
    return 1; // 기본값
  };

  const activeSection = getActiveSection();

  return (
    <div className="rounded-lg h-12 mb-6 border-2 border-black flex items-center justify-center p-2">
      <div className="flex items-center justify-center w-full">
        {[
          { index: 0, text: "ai채팅", href: "/AIchat" },
          { index: 1, text: "메인", href: "/Mainpage" },
          { index: 2, text: "부산best", href: "/BusanBest" },
        ].map((item, idx) => (
          <div key={item.index} className="flex items-center flex-1">
            <a
              href={item.href}
              className={`w-full px-4 py-2 transition-colors duration-200 text-sm font-medium rounded-lg text-center ${
                activeSection === item.index
                  ? "bg-black text-white"
                  : "hover:bg-slate-100 text-black"
              }`}
            >
              {item.text}
            </a>
            {idx < 2 && <div className="mx-2 font-light">|</div>}
          </div>
        ))}
      </div>
    </div>
  );
}
