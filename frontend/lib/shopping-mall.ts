export const shoppingMallOptions = [
  "네이버쇼핑",
  "네이버 스마트스토어",
  "쿠팡",
  "11번가",
  "G마켓",
  "옥션",
  "SSG",
  "롯데온",
  "카카오쇼핑",
  "무신사",
  "오늘의집",
  "마켓컬리",
  "올리브영",
  "인터파크",
  "티몬",
  "위메프",
];

const shoppingMallHostMap: Array<{ keywords: string[]; name: string }> = [
  { keywords: ["smartstore.naver.com"], name: "네이버 스마트스토어" },
  { keywords: ["brand.naver.com"], name: "네이버 브랜드스토어" },
  { keywords: ["shoppinglive.naver.com", "shopping.naver.com", "naver.me"], name: "네이버쇼핑" },
  { keywords: ["coupang.com"], name: "쿠팡" },
  { keywords: ["11st.co.kr"], name: "11번가" },
  { keywords: ["gmarket.co.kr", "g9.co.kr"], name: "G마켓" },
  { keywords: ["auction.co.kr"], name: "옥션" },
  { keywords: ["ssg.com"], name: "SSG" },
  { keywords: ["lotteon.com"], name: "롯데온" },
  { keywords: ["shoppinghow.kakao.com", "store.kakao.com", "kakaomakers.com"], name: "카카오쇼핑" },
  { keywords: ["musinsa.com"], name: "무신사" },
  { keywords: ["ohou.se"], name: "오늘의집" },
  { keywords: ["kurly.com"], name: "마켓컬리" },
  { keywords: ["oliveyoung.co.kr"], name: "올리브영" },
  { keywords: ["interpark.com"], name: "인터파크" },
  { keywords: ["tmon.co.kr"], name: "티몬" },
  { keywords: ["wemakeprice.com", "wmp.co.kr"], name: "위메프" },
];

export function inferShoppingMallName(rawUrl?: string | null) {
  const value = `${rawUrl ?? ""}`.trim();
  if (!value) {
    return "";
  }

  try {
    const parsedUrl = new URL(value.includes("://") ? value : `https://${value}`);
    const host = parsedUrl.hostname.toLowerCase().replace(/^m\./, "").replace(/^www\./, "");
    return shoppingMallHostMap.find((item) => item.keywords.some((keyword) => host === keyword || host.endsWith(`.${keyword}`)))?.name ?? "";
  } catch {
    const lowerValue = value.toLowerCase();
    return shoppingMallHostMap.find((item) => item.keywords.some((keyword) => lowerValue.includes(keyword)))?.name ?? "";
  }
}
