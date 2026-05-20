from urllib.parse import urlparse


SHOPPING_MALL_HOST_MAP = [
    (("smartstore.naver.com",), "네이버 스마트스토어"),
    (("brand.naver.com",), "네이버 브랜드스토어"),
    (("shoppinglive.naver.com", "shopping.naver.com"), "네이버쇼핑"),
    (("coupang.com",), "쿠팡"),
    (("11st.co.kr",), "11번가"),
    (("gmarket.co.kr", "g9.co.kr"), "G마켓"),
    (("auction.co.kr",), "옥션"),
    (("ssg.com",), "SSG"),
    (("lotteon.com",), "롯데온"),
    (("shoppinghow.kakao.com", "store.kakao.com", "kakaomakers.com"), "카카오쇼핑"),
    (("musinsa.com",), "무신사"),
    (("ohou.se",), "오늘의집"),
    (("kurly.com",), "마켓컬리"),
    (("oliveyoung.co.kr",), "올리브영"),
    (("interpark.com",), "인터파크"),
    (("tmon.co.kr",), "티몬"),
    (("wemakeprice.com", "wmp.co.kr"), "위메프"),
]


def infer_shopping_mall_name(raw_url: str | None) -> str:
    """외부 상품/라이브 URL에서 쇼핑몰명을 추정한다."""
    value = (raw_url or "").strip()
    if not value:
        return ""

    try:
        parsed_url = urlparse(value if "://" in value else f"https://{value}")
        host = parsed_url.hostname or ""
    except ValueError:
        host = ""

    normalized_host = host.lower().removeprefix("www.").removeprefix("m.")
    for keywords, name in SHOPPING_MALL_HOST_MAP:
        if any(normalized_host == keyword or normalized_host.endswith(f".{keyword}") for keyword in keywords):
            return name

    lowered_value = value.lower()
    for keywords, name in SHOPPING_MALL_HOST_MAP:
        if any(keyword in lowered_value for keyword in keywords):
            return name
    return ""
