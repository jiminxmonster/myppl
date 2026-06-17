# 관리자 상품소싱/상품등록 설계서

## 목적

관리자가 외부 쇼핑몰 API에서 상품을 검색하고, 선택한 상품을 MYPPL 게시판 글로 자동 등록할 수 있게 한다. 상품 이미지, 가격, 쇼핑몰 링크, 상품명, 본문 내용을 함께 가져와 게시글 작성 시간을 줄인다.

## 적용 범위

- 관리자모드에 `상품소싱` 메뉴 추가
- 상품소싱 화면은 별도 창 또는 별도 페이지로 동작
- 외부 쇼핑몰 API 검색
- 검색 결과 리스트에서 상품 다중 선택
- 선택 상품을 MYPPL 게시판 글로 등록
- 상품 이미지를 서버 media 저장소에 저장
- 본문 첫 번째 이미지를 목록/메인 순위 노출 이미지로 사용

## 제외 범위

- 기존 게시판 구조 변경 금지
- bootstrap/seed 실행 금지
- 로그인/JWT 정책 변경 금지
- 기존 게시글 데이터 초기화 금지
- 외부 API 키를 프론트에 노출 금지
- 크롤링은 1차 구현 대상에서 제외

## 화면 구조

### 관리자 메뉴

관리자 패널 좌측 메뉴에 `상품소싱` 항목을 추가한다.

위치 권장:

- 화면관리
  - 게시판관리
  - 히어로섹션
  - 상품순위노출
  - 상품리스트관리
- 정책관리
  - 상품승인관리
  - 상품필터설정
  - 게시물관리
  - 회원 관리
  - 신고 처리
  - 금칙어 관리
- 상품운영
  - 상품소싱

### 상품소싱 페이지

필수 필드:

- 쇼핑몰 제공자 선택
  - 네이버 쇼핑 API
  - 쿠팡 파트너스 API
  - 추후 확장용 Custom API
- 검색어 입력
- 검색 버튼
- 등록 대상 게시판 선택
  - 판매자공유핫이슈
  - 구매자공유핫이슈
  - 커뮤니티
  - 실제 DB에 존재하고 쓰기 가능한 게시판만 표시
- 결과 리스트
  - 체크박스
  - 상품 이미지
  - 상품명
  - 원래가격
  - 현재가격
  - 쇼핑몰명
  - 외부 상품 URL
  - 카테고리
- 선택 상품 등록 버튼

## 사용자 흐름

1. 관리자가 관리자모드 > 상품소싱 진입
2. 쇼핑몰 제공자 선택
3. 검색어 입력 후 검색
4. 외부 API 검색 결과 표시
5. 상품을 체크
6. 등록 대상 게시판 선택
7. `선택 상품 등록` 클릭
8. 백엔드가 상품별 게시글 생성
9. 게시판 목록에 즉시 노출

## 데이터 매핑

외부 API 응답을 내부 게시글로 변환한다.

| 외부 상품 데이터 | MYPPL 게시글 필드 |
| --- | --- |
| 상품명 | title |
| 상품 상세 URL | product_live_url 또는 mall_links.url |
| 쇼핑몰명 | product_store_name |
| 원래가격 | product_original_price |
| 현재가격 | product_sale_price |
| 대표 이미지 | content 첫 번째 이미지 |
| 상품 설명 | content 본문 |
| 카테고리 | 게시판 카테고리 또는 상품 필터 |

## 게시글 본문 생성 규칙

등록되는 게시글 본문은 기존 Tiptap HTML 저장 구조를 따른다.

예시 구조:

```html
<p>상품 소개 문구</p>
<img src="/media/boards/inline/example.png" alt="상품 이미지">
<p>상품명: 예시 상품</p>
<p>쇼핑몰: 네이버쇼핑</p>
<p>가격: 29,900원</p>
<p><a href="https://example.com/product" target="_blank">쇼핑몰에서 보기</a></p>
```

중요:

- 첫 번째 `<img>`가 목록 썸네일과 메인 순위 노출 이미지가 된다.
- 별도 `main_ranking_image` 업로드 필드는 사용하지 않는다.
- 기존 상세 화면에서 이미지가 중복 렌더링되지 않아야 한다.

## 이미지 저장 정책

외부 이미지 URL을 그대로 본문에 넣지 않는다.

처리 순서:

1. 외부 API 응답에서 이미지 URL 확보
2. 백엔드가 해당 이미지를 다운로드
3. 파일 크기/확장자/Content-Type 검증
4. `/media/boards/inline/` 또는 동등한 inline media 경로에 저장
5. 저장된 내부 media URL을 게시글 본문 `<img src>`에 삽입

검증 조건:

- JPG, PNG, WEBP 허용
- 8MB 이하 권장
- 다운로드 실패 시 해당 상품은 등록 실패로 표시
- 일부 상품 실패 시 전체 작업을 중단하지 않고 결과 리포트 표시

## 백엔드 API 설계

### 1. 상품 검색

`POST /api/v1/admin/product-sourcing/search/`

Request:

```json
{
  "provider": "naver",
  "keyword": "무선 키보드",
  "page": 1,
  "limit": 20
}
```

Response:

```json
{
  "results": [
    {
      "external_id": "naver-123",
      "provider": "naver",
      "title": "무선 키보드",
      "image_url": "https://...",
      "product_url": "https://...",
      "store_name": "네이버쇼핑",
      "original_price": 39000,
      "sale_price": 29900,
      "category": "디지털기기"
    }
  ]
}
```

### 2. 선택 상품 게시글 등록

`POST /api/v1/admin/product-sourcing/import/`

Request:

```json
{
  "board_slug": "seller-hot-issues",
  "items": [
    {
      "provider": "naver",
      "external_id": "naver-123",
      "title": "무선 키보드",
      "image_url": "https://...",
      "product_url": "https://...",
      "store_name": "네이버쇼핑",
      "original_price": 39000,
      "sale_price": 29900,
      "category": "디지털기기"
    }
  ]
}
```

Response:

```json
{
  "created": [
    {
      "post_id": 201,
      "title": "무선 키보드",
      "url": "/boards/seller-hot-issues/201"
    }
  ],
  "failed": []
}
```

## 외부 API 키 관리

- API 키/시크릿은 프론트에 절대 전달하지 않는다.
- 백엔드 환경변수 또는 서버 설정으로 관리한다.
- 추후 관리자 화면에서 키를 입력받아 저장할 경우 암호화 저장이 필요하다.
- 로그에 API 키/시크릿이 출력되면 안 된다.

환경변수 예시:

```env
NAVER_SHOPPING_CLIENT_ID=
NAVER_SHOPPING_CLIENT_SECRET=
COUPANG_ACCESS_KEY=
COUPANG_SECRET_KEY=
```

## 프론트 구현 기준

- 관리자 전용 페이지로 보호
- 검색 중 로딩 표시
- 결과 리스트는 카드 또는 테이블 형태
- 여러 상품 체크 가능
- 등록 전 대상 게시판 선택 필수
- 등록 결과를 성공/실패로 분리 표시
- 외부 상품 링크는 새 창으로 열기
- 이미지가 없는 상품은 기본 placeholder 표시

## 안정성 체크

수정 후 반드시 실행:

```bash
npm exec tsc -- --noEmit --pretty false
docker compose exec -T backend python manage.py check
scripts/auth_stability_harness.sh vm
```

VM 반영 시 금지:

- bootstrap 실행 금지
- seed 실행 금지
- DB 초기화 금지
- volume 삭제 금지
- 기존 게시글/히어로/메뉴 데이터 변경 금지

## 완료 기준

- 관리자 상품소싱 페이지 접근 가능
- 외부 API 검색 결과 표시
- 상품 다중 선택 가능
- 선택 상품이 지정 게시판에 게시글로 등록
- 상품 이미지가 내부 media로 저장
- 첫 번째 이미지가 목록 썸네일로 표시
- 게시글 상세에서 이미지 중복 표시 없음
- 로그인 하네스 통과
- 기존 작성/수정/목록/상세 기능 유지

