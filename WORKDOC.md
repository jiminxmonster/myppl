# MYPPL Workdoc

최종 업데이트: 2026-06-14

이 문서는 앞으로 MYPPL 작업의 기준 문서로 사용한다. 기존 작업지시서, 운영자 명세서, 개편 지시서, QA 내역, 외부 연동 명세를 하나로 통합해 현재 상태와 다음 작업 기준을 관리한다.

## 0. 최종 운영 정책

MYPPL은 운영자 1명, 개발자 1명 중심의 단일 CMS형 서비스다. 운영자는 Admin을 통해 메뉴, Hero, 카테고리, 게시판, 상품, 게시글을 지속적으로 변경한다. 따라서 운영 데이터는 코드보다 우선한다.

최종 Source of Truth:

- **GitHub = 코드 원본**: frontend, backend, API, migration, Docker 설정을 관리한다.
- **PostgreSQL = 데이터 원본**: 회원, 상품, 게시글, 댓글, 메뉴, Hero, 카테고리, 운영 설정을 관리한다.
- **Admin = 운영 원본**: Admin에서 저장한 값이 최종 운영값이다.
- **Bootstrap = 최초 설치 도구**: 빈 DB, 신규 서버, 재해복구 때만 사용한다.

### 0.1 Bootstrap 정책

기존 코드 중심 구조는 `Code -> Bootstrap -> Database`였다. 이 방식은 운영 중 Admin 설정을 되돌리는 문제가 있어 폐기한다.

Bootstrap에서 허용하는 항목:

- 최초 관리자 계정 생성
- 최초 권한 생성
- 필수 게시판 생성
- 신규 서버 설치 시 사용할 기본 데이터 생성

Bootstrap에서 금지하는 항목:

- 메뉴 강제 동기화
- Hero 강제 동기화
- 카테고리 강제 동기화
- 기존 계정 비밀번호 강제 변경
- 운영 데이터 UPDATE
- 일상 배포/재시작/스케일 시 자동 실행

운영 환경 기본값:

- `RUN_BOOTSTRAP=0`
- 배포 시 `RUN_MIGRATIONS=1`만 허용
- `bootstrap_community.py`는 운영 DB를 덮어쓰지 않아야 한다.

### 0.2 현재 기준 서버

현재 수정 지시와 검수의 기준 화면은 Google VM이다.

- 기준 화면: `http://34.22.96.236:8080/`
- VM 경로: `/home/bannykick/comunitysite`
- 실행 방식: Docker Compose
- 운영 데이터 원본: VM PostgreSQL
- 미디어 원본: VM Docker `media_data` volume
- 코드 원본: GitHub

Cloud Run은 이전 임시 배포 환경이며, 신규 수정/검수 기준으로 사용하지 않는다.

### 0.3 Hero 정책

Hero는 운영 데이터로 취급한다.

```text
Hero
-> Admin
-> PostgreSQL
-> media volume 또는 object storage
```

Hero 저장 후 새로고침해도 유지되면 정상이다. Hero는 bootstrap의 필수 관리 대상이 아니다. bootstrap hero는 신규 서버 설치 시 기본 Hero 생성 정도만 허용한다.

### 0.4 개발/배포 방식

코드 문제는 로컬에서 수정한다.

- 버튼
- UI
- 업로드
- API
- 페이지

데이터 문제는 Admin에서 수정한다.

- Hero
- 메뉴
- 카테고리
- 상품
- 게시글

작업 흐름:

```text
로컬 코드 수정
-> Git commit
-> Git push
-> 서버 배포
```

데이터 흐름:

```text
Admin 수정
-> PostgreSQL 저장
-> 끝
```

서버는 테스트 및 운영 환경이다. 서버에서 코드를 직접 수정하지 않는다.

### 0.5 인프라 방향

현재는 Google VM + Docker Compose를 운영/검수 서버로 사용한다. 최종 목표는 Vultr + Docker Compose 운영이다.

목표 구성:

- frontend
- backend
- postgres
- redis
- nginx

Cloud Run에서 발생한 복잡도(`Secret`, `Revision`, `CORS`, `DB_HOST`, `Bootstrap`)는 Docker Compose 운영에서 단순화한다.

### 0.6 JWT 정책

개발 단계에서는 생산성을 우선한다.

- Access token: 365일
- Refresh token: 365일

운영 전에는 보안 기준에 맞춰 재조정한다.

## 1. 작업 기준

- 작업 관련 결정, 진행 내역, 남은 작업은 이 문서에 누적한다.
- 코드 수정 전에는 수정 대상 파일, 수정 이유, 예상 영향을 먼저 좁혀서 확인한다.
- 사용자가 별도 승인하기 전까지 커밋, 푸시, 배포는 진행하지 않는다.
- 화면 수정 후에는 로컬 화면 반영 여부를 확인한다.
- 불필요한 광범위 수정은 피하고, 요청된 기능과 직접 관련된 파일만 변경한다.
- 임시 우회 코드는 작업 종료 전 유지/원복 여부를 명시한다.

### 1.1 UI 수정 절대 수칙

- UI 수정은 먼저 구조를 짧게 확정한 뒤 코드 변경에 들어간다.
- 같은 요청 안에서 해석을 바꿔가며 반복 수정하지 않는다. 애매하면 적용 전 기준을 하나로 정하고 진행한다.
- 기본 검증은 `build 1회 + 브라우저 반영 확인 1회`로 끝낸다.
- 브라우저 치수/DOM 검증은 사용자가 요구한 핵심 항목만 확인한다.
- 중간 지시가 바뀌면 이전 수정은 바로 덮어쓰되, 불필요한 재측정과 과도한 탐색은 하지 않는다.
- UI 변경이 5분을 넘길 가능성이 있으면 먼저 현재 원인과 남은 검증 항목을 사용자에게 짧게 보고한다.
- 요청받은 수정만 수행하고, 불필요한 전체 검토나 광범위한 리팩터링은 하지 않는다.
- 요청 범위를 넘는 검토가 필요하면 먼저 사용자에게 경고하고 승인 후 진행한다.

### 1.2 수정 및 업데이트 작업방식

- 사용자는 VM 배포주소를 기준 화면으로 보고 수정사항을 지시한다.
- 현재 기준 배포주소는 `http://34.22.96.236:8080/`이다.
- Cloud Run 주소는 이전 임시 배포 환경이며, 신규 수정/검수 기준으로 사용하지 않는다.
- 실제 코드는 로컬 작업공간 `/Users/bannykick/Documents/work/comunitysite`에서 수정한다.
- 수정 후 로컬 `http://localhost:3100` 또는 Docker nginx `http://localhost:8080`에서 빠르게 확인한다.
- 로컬 확인 후 사용자가 승인하면 Git 커밋/푸시를 진행한다.
- 서버 반영은 VM Docker Compose 기준으로 진행한다.
- 배포주소에서 직접 코드를 수정하지 않는다. 배포주소는 수정 지시와 최종 확인용 화면이다.

### 1.3 로그인/API 안정화 필수 절차

수정할 때마다 로그인 실패가 반복되지 않도록, 프론트/백엔드/API/배포 변경 전후에 아래 절차를 필수로 수행한다.

현재 학습 결과:

- 로그인 장애가 반복된 직접 원인은 계정/DB가 아니라 프론트 컨테이너 실행 구조였다.
- `next start`는 `.next` production build가 있어야 정상 실행된다.
- `frontend` 서비스에 `./frontend:/app`, `/app/.next` 볼륨을 걸면 이미지 안에 생성된 `.next` 빌드 결과가 가려질 수 있다.
- 이 상태에서는 빌드가 성공해도 실행 시 프론트가 재시작하거나, 오래된 번들/잘못된 API 대상이 남아 로그인 실패로 보일 수 있다.
- VM/운영 기준 `frontend`는 소스 볼륨 마운트 없이 빌드된 이미지 기준으로 실행해야 한다.
- VM/운영 기준 `NEXT_PUBLIC_API_URL`은 빌드 args로 `frontend` 이미지에 주입되어야 한다.
- VM 로그인 페이지의 API 대상은 `/api/v1`이어야 한다.

필수 하네스:

```bash
# 로컬 Docker nginx 기준
scripts/auth_stability_harness.sh local-nginx

# VM 기준
scripts/auth_stability_harness.sh vm
```

하네스가 확인하는 항목:

- `/login` HTTP 200
- `admin / admin`, `buy / buy`, `sell / sell` API 로그인 200
- VM 로그인 페이지에 `localhost` API 대상이 섞이지 않았는지
- `frontend`, `backend`, `nginx` 컨테이너 상태
- VM `frontend` 환경의 `NEXT_PUBLIC_API_URL`

수정 전 확인:

- 현재 기준 화면이 로컬인지 VM인지 먼저 명시한다.
- 프론트가 바라보는 API 주소를 확인한다.
- 로그인 실패가 있으면 먼저 API 직접 호출로 계정 상태를 확인한다.
- `admin / admin`, `buy / buy`, `sell / sell` 세 계정 모두 API 로그인 200 여부를 확인한다.
- API 로그인이 200이면 계정/백엔드 문제가 아니라 프론트 호출, 토큰 저장, API base URL, CORS, 프록시 문제로 좁힌다.
- API 로그인이 실패하면 프론트 수정으로 해결하지 말고 백엔드 인증/DB/부트스트랩 여부부터 확인한다.

수정 후 확인:

- 프론트 빌드 또는 타입 체크를 1회 수행한다.
- 로컬 또는 VM에서 프론트 컨테이너가 최신 코드로 재시작되었는지 확인한다.
- 수정 후 `scripts/auth_stability_harness.sh local-nginx`를 실행한다.
- VM 반영 후 `scripts/auth_stability_harness.sh vm`을 실행한다.
- 브라우저 강력 새로고침 후 로그인 페이지의 API 대상 표시가 현재 환경과 맞는지 확인한다.
- `admin / admin`, `buy / buy`, `sell / sell` 로그인을 실제 화면 또는 API로 확인한다.
- 로그인 성공 후 `/admin-panel`, `/boards/seller-hot-issues/write`, `/boards/구매자-공유-핫이슈/write` 중 수정 범위와 관련된 화면 1개 이상을 확인한다.

로그인 장애 발생 시 판단 기준:

- 화면에 `대상: http://localhost:8000/api/v1`가 표시되면 프론트가 로컬 백엔드를 바라보는 상태다.
- 로컬 백엔드가 꺼져 있으면 로그인은 실패한다. 이 경우 백엔드를 켜거나 API base를 현재 기준 환경에 맞춘다.
- VM 기준에서는 브라우저가 `/api/v1` 또는 `http://34.22.96.236:8080/api/v1`로 호출해야 한다.
- 서버 배포 후에도 `/api/v1/auth/login/` 직접 호출이 200이면 DB 계정은 정상이다.
- 로그인 실패 메시지만 보고 계정 초기화, bootstrap 실행, seed 실행을 하지 않는다.

절대 금지:

- 로그인 복구 목적으로 `bootstrap_community.py`를 실행하지 않는다.
- 운영 DB의 관리자 비밀번호를 bootstrap으로 덮어쓰지 않는다.
- Docker volume 삭제, DB 초기화, seed 재투입은 사용자 승인 없이 하지 않는다.
- 로그인 문제와 무관한 메뉴, Hero, 게시판, 메인 순위 코드를 함께 수정하지 않는다.
- VM/운영 `frontend`에 `./frontend:/app`, `/app/.next` 볼륨 마운트를 되살리지 않는다.
- `NEXT_PUBLIC_API_URL` 빌드 args 없이 VM/운영 프론트를 배포하지 않는다.

## 2. 원본 문서 통합

- `codex_작업지시서.docx`: 최초 커뮤니티 + 커머스 플랫폼 개발 지시서
- `admin_운영자_명세서.docx`: 운영자 권한, 게시판, 회원, 콘텐츠 관리 명세
- `docs/myppl_rearchitecture_spec.md`: 구매자/판매자 중심 MYPPL 전면 개편 지시서
- `docs/external_product_ingestion_spec.md`: 외부 쇼핑몰 API/크롤링, 상품필터, 알림 구조 명세
- `QA_FIXLIST.md`: 기존 QA 수정 완료 및 검증 항목
- `README.md`: 실행, 하네스, 배포 전 점검 절차
- `docs/frontend_change_apply_checklist.md`: 프론트 수정 반영 표준 절차

## 3. 서비스 정의

MYPPL은 판매자가 상품을 홍보하고, 구매자가 원하는 상품 조건을 저장해 비교·탐색·알림을 받을 수 있는 상품 공유형 커뮤니티 플랫폼이다. 단순 게시판이 아니라 판매자 상품 등록, 구매자 관심 조건, 상품 필터, 외부 상품 데이터 연동, 알림을 연결하는 구조를 목표로 한다.

## 4. 현재 기술 스택

- 프론트엔드: Next.js 14 App Router, React, Tailwind CSS, Zustand, Axios
- 백엔드: Django 5, Django REST Framework, JWT 인증
- 데이터베이스: PostgreSQL 기준, 임시 배포/로컬 일부는 SQLite 사용 가능
- 실시간/비동기: Redis, Channels, Daphne, Celery 확장 구조
- 이미지/파일: 운영 기준 Object Storage 필요, Cloud Run 컨테이너 로컬 디스크는 휘발성
- 배포: Docker, GitHub Actions, Google Cloud Run 임시 배포

## 5. 핵심 계정/역할

- 운영자: `admin / admin`
- 판매자: `sell / sell`
- 구매자: `buy / buy`
- 운영자는 `operator_role`로 별도 권한을 갖고, 구매자/판매자 회원 타입과 독립적으로 관리한다.

## 6. 현재 구현 기준

- 메인 구조는 MYPPL 브랜드 중심으로 개편 중이다.
- 상단 메뉴는 상품/공유 핫이슈/커뮤니티 중심으로 정리 중이다.
- 히어로 섹션은 운영자가 관리하는 광고 슬라이드 구조를 갖는다.
- 상품 순위 노출은 운영자가 관리하며, 메인에는 순위형 슬라이드로 노출한다.
- 상품리스트는 좌측 상품 메뉴와 연동되는 구조다.
- 판매자 공유 핫이슈와 소비자 공유 핫이슈에 상품 카테고리 슬라이더가 적용되어 있다.
- 게시글/상품 게시글은 이미지, 댓글, 조회수, 수정/삭제 권한 구조를 갖는다.
- 댓글은 비밀댓글 구조가 추가되었고, 본문 작성자와 관리자만 볼 수 있는 방향으로 설계되어 있다.
- 운영자 패널은 게시판관리, 히어로섹션, 상품순위노출, 상품리스트관리, 상품승인관리, 상품필터설정, 게시물관리 등으로 분리되어 있다.

## 7. 완료/검증된 주요 항목

- 로그인 기본 구조
- 게시판 생성 후 메뉴 반영
- 한글 게시판 진입
- 글쓰기 게시판 선택
- 게시판 제목 동기화
- 게시글 이미지 업로드/표시
- 핫딜/중고장터 상세 진입
- 상품 등록 후 관리자 승인 구조
- 운영자 신고 처리 및 블라인드 처리
- 댓글 알림 저장 및 실시간 알림 배지
- 운영자 게시물 수정/삭제 권한
- 판매자 상품 수정/삭제 권한
- 상품필터 설정 UI 개편
- 히어로 섹션 관리 UI 및 전환 효과
- Cloud Run 임시 배포
- GitHub 저장소 연결

## 8. 현재 로컬 미커밋 작업 상태

현재 로컬에는 아래 파일 변경이 남아 있다. 사용자가 승인하기 전까지 커밋/푸시/배포하지 않는다.

- `frontend/app/boards/[slug]/page.tsx`: 핫이슈 게시판 글쓰기 버튼 문구 관련 변경
- `frontend/app/page.tsx`: 메인 상품 순위 노출 개수/구성 관련 변경
- `frontend/components/home/home-product-section.tsx`: 메인 상품 순위 라인 1-6위, 7-12위 방식 변경
- `frontend/next.config.js`: 로컬 로그인 확인 중 추가된 API 프록시 임시 수정

검토 필요:

- `frontend/next.config.js`의 프록시 수정은 로그인 원인 확인용 임시 우회 성격이므로 유지할지 원복할지 별도 결정이 필요하다.

## 9. 남은 핵심 작업

### 9.1 기능 안정화

- 로컬/배포 로그인 동작을 역할별로 재검증한다.
- `admin / admin`, `sell / sell`, `buy / buy`를 각각 로그인해 접근 메뉴와 권한을 확인한다.
- 판매자 상품 등록, 관리자 승인, 상품 노출 흐름을 다시 검증한다.
- 구매자 원하는상품 등록, 수정, 알림 채널 설정 흐름을 다시 검증한다.
- 게시글/댓글/비밀댓글의 권한 노출 조건을 검증한다.

### 9.2 상품/필터/외부 연동

- 상품필터설정은 내부 표준 카테고리와 체크박스 옵션을 관리하는 기준 화면으로 유지한다.
- 외부 API/크롤링 연동 매핑은 상품필터설정의 연장 기능으로 둔다.
- 외부 카테고리/속성은 자동 수집 후 관리자 승인/매핑을 거쳐 내부 필터로 반영한다.
- 쿠팡 등 API 제공 쇼핑몰은 공식 API를 우선 사용한다.
- API가 없는 쇼핑몰은 약관과 robots 정책을 확인한 뒤 허용 범위 내 크롤링 또는 제휴 데이터 방식을 검토한다.

### 9.3 이미지/파일 저장

- Cloud Run 컨테이너 내부 디스크는 휘발성이므로 이미지 저장소로 사용하면 안 된다.
- 운영/테스트 배포 모두 GCS 또는 Object Storage를 사용하도록 전환해야 한다.
- 히어로 이미지, 게시글 이미지, 상품 이미지는 같은 저장소 정책으로 통합한다.

### 9.4 운영자 화면

- 운영자 모바일 화면에서 좌측 메뉴는 메뉴 버튼으로 접히고 펼쳐지는 구조를 유지한다.
- 화면관리와 정책관리는 메뉴 그룹을 명확히 분리한다.
- 화면관리: 게시판관리, 히어로섹션, 상품순위노출, 상품리스트관리
- 정책관리: 상품승인관리, 상품필터설정, 게시물관리, 회원관리, 신고처리, 금칙어관리, IP 차단

### 9.5 메인/게시판 UX

- 메인 히어로는 MYPPL 자체 광고 3개 문구를 기준으로 세련된 광고 비주얼로 정리한다.
- 상품 순위 노출은 30위까지 채우고, 판매자공유핫이슈/소비자공유핫이슈 섹션은 `1-10위`, `11-20위`, `21-30위` 독립 가로 슬라이더 3줄로 보여준다.
- 상품리스트 자체 노출 여부와 핫이슈 게시판의 카테고리 슬라이더 적용 범위를 확정한다.
- 판매자/소비자 공유 핫이슈의 글쓰기 버튼 문구는 `내상품홍보` 기준으로 정리한다.

## 10. 로컬 확인 절차

프론트 변경 후 화면에 바로 반영되지 않으면 아래 순서로 확인한다.

```bash
cd /Users/bannykick/Documents/work/comunitysite
bash scripts/frontend_apply_check.sh
```

단, 현재처럼 Docker가 아닌 `npm start`로 직접 띄운 경우에는 `frontend`에서 직접 빌드 후 실행한다.

```bash
cd /Users/bannykick/Documents/work/comunitysite/frontend
npm run build
npm start -- --port 3100
```

로컬 URL:

- 프론트: `http://localhost:3100`
- 백엔드 API: `http://localhost:8000/api/v1`

## 11. 배포 기준

- 로컬에서 기능 확인 후 커밋한다.
- GitHub에 푸시한다.
- GitHub Actions로 Cloud Run 배포를 진행한다.
- 배포 후 실제 Cloud Run URL에서 로그인, 관리자, 히어로 이미지, 게시글 이미지, 상품 등록 흐름을 확인한다.
- 도메인 연결은 임시 배포 테스트가 충분히 끝난 뒤 진행한다.

## 12. 다음 작업 후보

1. 현재 로컬 미커밋 변경 중 `next.config.js` 임시 프록시 유지/원복 결정
2. 로컬 로그인 문제를 최소 범위로 재검증
3. 메인 순위 노출 30위/3줄 슬라이드 UI 확인
4. 판매자/소비자 공유 핫이슈 버튼 문구와 카테고리 슬라이더 확인
5. GCS 이미지 저장 전환 작업 범위 산정
6. 상품필터설정과 원하는상품 등록 흐름 재검증

## 13. 작업 로그

### 2026-06-08: 메인 메뉴 초기 노출 보정

- 증상: 운영자 게시판 설정에서 `판매자 공유 핫이슈`, `소비자공유핫이슈`, `커뮤니티`가 메인 메뉴 노출 상태인데 첫 화면에서 메뉴가 비어 보일 수 있었다.
- 원인: 헤더가 클라이언트에서 `/boards/` API를 받은 뒤 메뉴를 채우는 구조라 첫 HTML 응답에는 메뉴가 비어 있었다.
- 수정: `SiteHeader`에 기본 상단 게시판 메뉴를 즉시 렌더링하도록 추가하고, API 로딩 성공 시 운영자 설정값으로 교체되도록 유지했다.
- 검증: `npm run build` 통과, 로컬 HTML 응답과 브라우저 헤더에서 세 메뉴 노출 확인.

### 2026-06-08: 공유 핫이슈 순위 슬라이드 정리

- 요청: `판매자공유핫이슈`, `소비자공유핫이슈` 홈 노출 영역의 순위 30개를 3줄로 나누어 슬라이드되게 수정.
- 수정: 홈 상품 순위 컴포넌트를 30위까지 채우고, `1-10위`, `11-20위`, `21-30위`가 각각 독립 가로 슬라이더로 움직이도록 변경했다.
- 수정: 두 공유 핫이슈 섹션 제목은 공백 없는 표기(`판매자공유핫이슈`, `소비자공유핫이슈`)로 정규화한다.
- 검증: `npm run build` 통과. 로컬 SSR 기준 두 섹션 합산 독립 랭킹 줄 6개, 카드 60개 생성 확인. 각 섹션은 `1위 - 10위`, `11위 - 20위`, `21위 - 30위` 3줄로 구성된다.

### 2026-06-08: 히어로/순위/핫이슈 카테고리 보정

- 요청: 히어로 섹션 높이 통일, 메인 순위 카드 게시물 이동, 2~4위 상단 쇼핑몰명 표시, 공유 핫이슈 카테고리 필터, 히어로 설정값 실제 반영.
- 수정: 메인 히어로는 운영자 설정 이미지를 우선 사용하고, 설정 이미지가 없을 때만 기본 MYPPL 광고 이미지를 사용하도록 변경했다.
- 수정: 메인 히어로 높이를 고정하고, 운영자 히어로 설정 카드의 썸네일 영역도 180px로 통일했다.
- 수정: 메인 순위 카드는 외부 액션 버튼이 있어도 카드 자체가 실제 게시물 상세 링크(`/hotdeals`, `/marketplace`, `/boards`)로 이동하도록 정리했다.
- 수정: 2~4위 상단에는 쇼핑몰/출처명이 표시되며, 외부몰명이 없을 경우 `MYPPL 핫딜`, `MYPPL 장터`, `MYPPL 공유`를 표시한다.
- 수정: `판매자공유핫이슈`, `소비자공유핫이슈`에서 카테고리 클릭 시 해당 카테고리와 매칭되는 게시물만 보이도록 필터링한다. 현재 게시글 API에 카테고리 ID가 없어 제목, 스토어명, 플랫폼, URL 기반 휴리스틱 매칭으로 처리한다.
- 검증: `npm run build` 통과. 브라우저에서 메인 히어로 430px, 어드민 히어로 썸네일 180px 동일 높이 확인. 메인 첫 5개 순위 링크는 상세 페이지로 연결되고 1~4위 상단 출처명이 표시됨을 확인. 판매자 디지털 카테고리 필터는 13개 링크에서 6개로, 소비자 디지털 카테고리 필터는 4개로 축소되고 식품/뷰티 키워드가 섞이지 않음을 확인.

### 2026-06-08: 헤더 와이드화 및 화이트톤 푸터 추가

- 요청: 상단 헤더를 좌우로 더 넓게 보이게 수정하고, 참고 디자인 기반의 화이트톤 푸터를 삽입.
- 수정: 공통 레이아웃에서 헤더/푸터는 `max-w-[1600px]` 와이드 영역을 사용하고, 본문은 기존 `max-w-7xl` 흐름을 유지하도록 분리했다.
- 수정: MYPPL 로고/설명/소셜 아이콘이 있는 브랜드 열, 빈 2열, 빠른 링크/커뮤니티/고객 지원 3열로 구성한 5열 `SiteFooter`를 추가했다.
- 검증: `npm run build` 통과. 로컬 브라우저 기준 헤더/히어로/푸터는 모두 좌측 24px, 폭 899px로 동일하게 렌더링된다. 푸터는 5열이며 브랜드 1열 183px, 빈 2열 115px, 나머지 링크 3열 각 136px로 배치된다. 빠른 링크/커뮤니티/고객 지원 제목 라인은 로고 이미지 하단과 offset 0으로 정렬된다.

### 2026-06-08: 로고 파일 교체

- 요청: `artwork/ppl_a.svg` 파일을 사이트 로고로 사용.
- 수정: `frontend/public/branding/ppl_a.svg`를 추가하고, 헤더/푸터 로고 경로를 `/branding/ppl_a.svg`로 교체했다.
- 검증: `npm run build` 통과. 로컬 브라우저에서 헤더/푸터 로고 `src`가 모두 `/branding/ppl_a.svg`로 렌더링됨을 확인했다.
### 2026-06-09: 로그인 안정화 (Cloud Run temp 배포)

- 기준 배포 주소에서 로그인 generic error 문제 수정
- 로그인/회원가입 페이지에 실제 API 대상 URL 표시 + 실시간 에러 메시지 개선 (배포 화면에서 호출 주소 바로 확인 가능)
- deploy-cloud-run.yml: myppl-backend-temp 배포 시 RUN_MIGRATIONS=1, RUN_BOOTSTRAP=1 자동 추가 → test 계정(admin/buy/sell) 항상 생성
- backend settings: *-temp-*.run.app CORS regex 추가
- 로컬 http://localhost:3100 + scripts/frontend_apply_check.sh 로 확인 완료
- 사용자 승인 후 GitHub push → CI/CD로 Cloud Run temp 서비스 업데이트


### 2026-06-09: Local vs Deployed UI Sync (boards, rankings, recent communities)

- Problem: Local Docker (localhost:3100) had mismatched content vs 기준 배포주소 (cloud temp): empty "최근 구매자커뮤니티", missing main rankings (3-line), boards/lists not updating, hero below not matching final.
- Cause: Separate DBs (local postgres vs CloudSQL); insufficient sample posts in buyer/hot/comm boards; possible old Docker cache/.next volumes; code for final UI (3-line rankings, "내상품홍보" button) was in source but data not populated to match deployed "final".
- Actions (WORKDOC rules: local edit/verify first, no push without approval):
  - Docker clean rebuild (--no-cache, apply_check.sh multiple times) to sync code.
  - Data seeding: bootstrap --with-sample-data + refresh_sample_product_posts + added recent posts (buyer +5 "최근 구매자 샘플 글", hot/comm to 30 each for full 3-line).
  - Verified: Buyer 67 posts, hot/comm 30; recent buyer now has latest samples; HomeProductSection has rankRowSize=10 (3 rows); boards/[slug] writeButtonLabel="내상품홍보"; next.config clean (temp proxy removed).
  - Login debug: page now shows "API: {url}" + real error with target (for diagnosing local vs cloud backend).
  - Local verify: apply_check.sh passed, containers healthy, 3100 responds.
- Approval received: "승인".
- Next: Commit/push (triggers CI/CD to myppl-frontend-temp / myppl-backend-temp with bootstrap on deploy).
- Expected: After new revision + hard refresh on cloud URL, local and deployed UI/content (boards, rankings 3-line, recent communities, hero below) will match closely. Data approx via seed (exact match limited by separate DBs).
- Decision: Keep local as dev for final UI code; use seed + future proxy if needed for exact data sync. Update WORKDOC on results.


### 2026-06-09: Server login fix (deployed cloud version)

- Local login works (native 3100 + local backend, accounts from bootstrap, debug shows API target).
- Server (https://myppl-frontend-temp-.../login) still shows old generic error because old image deployed.
- Fixes already in source:
  - Login page: shows real error message + "API: (actual target URL)" for debugging.
  - Deploy workflow: backend-temp always runs bootstrap (creates admin/buy/sell accounts).
  - bootstrap: menu only 판매자공유핫이슈 + 소비자공유핫이슈 in top (names compacted).
  - CORS: allows temp run.app domains.
- To apply to server: Trigger 'Deploy Cloud Run' workflow (or push). Ensure GitHub secret NEXT_PUBLIC_API_URL = current myppl-backend-temp public URL (e.g. https://myppl-backend-temp-xxx.a.run.app/api/v1). After new revision, hard refresh cloud URL. Login page will show the baked API target - verify it matches backend. If wrong, update secret and redeploy.
- Local 3100 native now for dev (Docker frontend stopped).
- Approval for this server focus: given in query.


### 2026-06-09 추가: 서버 로그인 적용 (cloud temp URL 기준)

- 로컬 native 3100: 로그인 정상 (admin/buy/sell 토큰 발급, API debug 표시).
- 서버 배포판 (https://myppl-frontend-temp-bexuss3nja-du.a.run.app/login): 아직 old image라 generic 에러만 보임 (디버그 없음).
- 서버 적용 필요 내용 (이미 source에 있음):
  - Login page: 실제 에러 + "API: (target URL)" 디버그.
  - Deploy workflow: backend-temp에 RUN_BOOTSTRAP=1 (계정 자동 생성).
  - bootstrap: 메뉴 이름 판매자공유핫이슈 / 소비자공유핫이슈 (top menu only).
- 서버에 반영하는 정확한 방법:
  1. GitHub Secrets의 NEXT_PUBLIC_API_URL을 **현재 myppl-backend-temp 공개 URL** (콘솔에서 복사) 로 업데이트.
  2. GitHub Actions에서 'Deploy Cloud Run' workflow 수동 실행.
  3. Cloud Run 콘솔에서 frontend-temp 새 리비전 확인.
  4. cloud URL 강력 새로고침.
  5. 로그인 페이지에서 'API: ...' 주소 확인 → secret 값과 맞는지.
  6. secret 맞추고 재배포 반복.
- Local은 이미 native + 최신 소스 + seed 데이터로 서버 final에 최대한 맞춤.
- 다음: 사용자 확인 후 server URL에서 디버그 보고 secret 조정.


### 2026-06-09 서버 로그인 현황 (사용자 보고: cloud URL에서 여전히 안 됨)
- 로컬 native 3100 + local backend: 로그인 정상 (토큰 발급 성공, debug 'API: ...' 표시).
- 서버 (https://myppl-frontend-temp-bexuss3nja-du.a.run.app/login): 여전히 generic 에러 (old image).
- 원인: 배포된 frontend 이미지에 새 코드(디버그) + 올바른 baked API_URL 이 없음.
- 이미 소스에 있는 것: login page real error + target 표시, workflow RUN_BOOTSTRAP=1, bootstrap 메뉴 이름 정리, CORS.
- 사용자에게 안내한 정확한 단계:
  1. Cloud Run 콘솔에서 현재 myppl-backend-temp URL 확인.
  2. GitHub secret NEXT_PUBLIC_API_URL 을 그 URL 로 업데이트.
  3. GitHub Actions 'Deploy Cloud Run' workflow 수동 실행.
  4. Cloud Run에서 frontend-temp 새 리비전 확인.
  5. cloud URL 강력 새로고침.
  6. 로그인 페이지에서 'API: ...' 확인 → secret 과 일치하는지.
  7. 안 되면 secret 고치고 3~6 반복.
- 다음: 사용자 cloud URL 스크린샷 (디버그 보이는지, 어떤 주소 나오는지) + GitHub Actions 로그 + Cloud Run revision 정보 받으면 더 정확히 안내.


### 2026-06-09 서버 로그인 복구 (사용자가 backend-temp URL 공유)

- 사용자가 공유한 정확한 backend-temp URL: https://myppl-backend-temp-220680126959.asia-northeast3.run.app
- 로컬 native 3100은 이미 최신 소스 + local backend로 로그인 정상.
- 서버에 적용하기 위한 정확한 단계 안내:
  1. GitHub Secrets의 NEXT_PUBLIC_API_URL (그리고 NEXT_INTERNAL_API_URL)을 위 URL + /api/v1 로 정확히 업데이트.
  2. GitHub Actions 'Deploy Cloud Run' workflow 수동 실행.
  3. Cloud Run에서 frontend-temp 새 리비전 확인.
  4. cloud URL 강력 새로고침 후 로그인 페이지에서 'API: ...' 확인 (이 주소가 backend URL과 일치해야 함).
  5. 테스트 계정으로 로그인.
- 소스에는 이미 로그인 디버그, bootstrap 메뉴 정리, workflow RUN_BOOTSTRAP=1 등이 반영됨.
- 다음: 사용자 실행 결과 보고 (API 주소가 뭐라고 나오는지, 로그인 성공 여부).

### Local ↔ Deployed State Sync Policy (메뉴/게시판/관리자 변경 동기화)

- **기준**: WORKDOC + `bootstrap_community.py` 가 "기본 메뉴/게시판 상태" 의 소스. 배포 주소(cloud)는 사용자 가 보는 "기준 화면" 과 live 데이터.
- **현재 메뉴 구조 (WORKDOC + 사용자 요청 + bootstrap 스펙 기준)**:
  - 상단(top) 메뉴: **오직 "판매자공유핫이슈"(slug: seller-hot-issues) + "소비자공유핫이슈"(slug: community-grid)** 만 show_in_top_menu=True, 이름 공백 없이 compacted, audience=ALL.
  - 다른 게시판(buyer-community, seller-community, notice, free, live-special, hotdeal-board, market-board 등): show_in_top_menu=False (top menu에 노출 안 함).
  - bootstrap _ensure_boards 가 생성/업데이트 시 name, show_in_top_menu, audience, sort_order 등을 spec 대로 강제 (idempotent).
- **홈 UI**:
  - "최근 구매자커뮤니티" / "최근 판매자커뮤니티" 섹션: slug "buyer-community" / "seller-community" 에서 최근 포스트 (top_menu flag 와 무관하게 slug 로 찾도록 수정).
  - 판매자/소비자 공유 핫이슈 섹션: product board + HomeProductSection + 3줄 랭킹 (1-10,11-20,21-30) per WORKDOC.
  - SiteHeader fallback 과 getTopMenuLabel 도 두 개의 hot issue 만 초기 렌더/라벨 매핑.
- **동기화 방법 (앞으로 적용)**:
  - 서버(배포) admin-panel (게시판관리 등) 에서 메뉴/게시판 visibility, 이름, home sections, sort 등 수정 시 → 변경 내용 (또는 스크린샷) 보고.
  - 내가 WORKDOC 에 "현재 live spec" 기록.
  - bootstrap_community.py 의 board_specs / home sections 기본값 업데이트 (재-bootstrap 시 동일 재현).
  - 로컬: backend 띄우고 `python manage.py bootstrap_community` (또는 shell update) 실행해서 local DB 를 동일 상태로.
  - Frontend 코드 변경은 로컬 3100 에서 먼저 검증 (build + browser).
  - 배포 시 workflow 가 backend 에 RUN_BOOTSTRAP=1 로 cloud 를 spec 에 맞춤.
  - Local frontend 를 임시로 cloud backend API 로 pointing (env override) 해서 server admin 변경 효과를 로컬 UI 에서 바로 확인 가능 (CORS 조정 필요 시 지원).
- **데이터 차이 인정**: CloudSQL vs local DB 는 exact 포스트/랭킹/이미지 동일 불가. UI 구조 + "final like" 샘플 데이터 (bootstrap --with-sample-data + 추가 포스트) 로 근사. rankings/recent 는 seed 로 30개+ 채움.
- **이 변경으로**: page.tsx 의 buyer/sellerBoard 찾기와 header fallback/label 을 정리해, top menu 정책(오직 두 hot issue) 과 홈 recent sections 이 동시에 만족되도록 함. 배포/로컬 모두 bootstrap 적용 시 동일 메뉴 상태.
- 최종: 서버를 "기준"으로 admin 수정하면서도 로컬이 항상 동기화된 상태 유지. WORKDOC 가 항상 최신 spec 참조 문서.

(이 정책은 2026-06-09 이후 모든 admin 변경과 로컬/배포 동기화에 적용.)

## MYPPL 운영 철학 및 워크플로우 (E: 문서 반영)

### Source of Truth
- **GitHub**: 코드 원본 (Django, Frontend, Migration, Docker, bootstrap 등)
- **PostgreSQL**: 데이터 원본 (회원, 게시글, 상품, 카테고리, Hero, 메뉴, 모든 운영 설정)
- **Admin panel**: 운영 원본 (Admin에서 저장한 값이 최종)

코드(bootstrap)는 Admin 데이터를 절대 덮어쓰지 않습니다. Admin 변경 → DB에 바로 반영 → 유지.

### 개발/배포 워크플로우
1. 로컬에서 개발 (docker compose up - 로컬 postgres 사용)
2. Git commit & push (코드만)
3. 서버 배포 (GitHub Actions 또는 docker compose pull/up on VM/Vultr)
4. 데이터는 PostgreSQL이 관리 (bootstrap은 최초 설치용, 운영 DB는 Admin으로 관리)

### Docker Compose (C: 정리 완료)
- docker-compose.yml 은 이제 프로덕션(VM/Vultr)에서도 바로 사용 가능하도록 주석과 설정 업데이트.
- RUN_BOOTSTRAP=0 기본 (운영 DB 보호)
- restart: unless-stopped 추가
- db, backend, nginx 등에 대한 프로덕션 가이드 주석 추가
- 로컬 개발 vs 운영 스택 구분 명확히

사용 예:
```bash
cp .env.example .env   # 실제 값 채우기 (DB_PASSWORD 등)
docker compose build
docker compose up -d
```

### 데이터 시드 (D: 스크립트 작성 완료)
- `python manage.py seed_realistic_data --products=500 --posts=1000 --comments=3000`
- bootstrap과 별도. 기존 운영 데이터 보호하면서 대량 현실 데이터 추가.
- --clear 옵션으로 초기화 후 생성 가능 (주의: 샘플만)
- faker 없으면 간단 랜덤 데이터 사용.

### 이전 절차 (B: 문서화)
WORKDOC에 pg_dump, 복원, 이미지 이전 상세 절차 추가.

### Bootstrap (1단계 축소 완료)
- 최초 관리자/권한/필수 게시판만 생성.
- 모든 운영 설정 (메뉴, Hero, Section, 카테고리 등) 강제 동기화 제거.
- 기존 계정 비밀번호/권한 절대 건드리지 않음.
- bootstrap_community.py 상단에 철학 주석 업데이트.

이제 구조: GitHub=코드, PostgreSQL=데이터, Admin=운영, Docker Compose=배포.

---

## MYPPL 운영 철학 (전환 완료 목표)

### Source of Truth
- **GitHub** = 코드 원본 (Django, Frontend, Migration, Docker 설정 등)
- **PostgreSQL** = 데이터 원본 (회원, 게시글, 댓글, 상품, 카테고리, Hero, 메뉴, 모든 운영 설정)
- **Admin panel** = 운영 원본 (메뉴 노출, Hero, Home Section, 카테고리, 설정 등)

Admin에서 저장된 값은 최종값이다. 코드/bootstrap은 절대 Admin 데이터를 덮어쓰지 않는다.

### Bootstrap 역할
- 최초 설치 / 빈 DB / 재해복구 용도 **only**
- 상세는 `bootstrap_community.py` 상단 주석 참조
- bless/dump 는 런타임용이 아님 (일회성 마이그레이션 도구로만 사용)

### 개발/배포 흐름
1. 로컬에서 개발 (Docker Compose로 frontend + backend + postgres)
2. Git commit & push (코드만)
3. 서버에서 docker compose pull/up (또는 GitHub Actions로 이미지 빌드 후 VM 배포)
4. 데이터는 PostgreSQL이 관리 (대량 테스트 데이터는 실제 서비스 수준으로 수동/스크립트로 생성)

### 인프라 전환 (계획)
- 현재: Cloud Run + Cloud SQL (bridge 용)
- 중간: GCE VM + Docker Compose
- 최종: Vultr + Docker Compose (frontend, backend, postgres)

Cloud SQL 데이터는 pg_dump로 백업 → 새 Postgres로 복원.

### PostgreSQL 이전 절차 (B)

#### 1. Cloud SQL 백업 (현재 운영 DB)
```bash
# Cloud Shell 또는 로컬에서 cloud-sql-proxy 실행 후
pg_dump -h 127.0.0.1 -p 5432 -U ${DB_USER} -d ${DB_NAME} \
  --no-owner --no-acl -Fc > myppl_cloudsql_backup_$(date +%Y%m%d).dump

# 또는 --data-only / --schema-only 로 분리 가능
```

이미지/미디어 파일:
- Cloud Storage (GCS) bucket에서 다운로드하거나 gsutil rsync.
- 현재 media/ 볼륨이나 GCS 경로에서 수집.

#### 2. 새 PostgreSQL (Docker Compose) 복원
```bash
# VM/Vultr에서 docker compose up -d db 로 postgres 시작
docker compose exec db pg_restore -U admin -d community_db \
  --no-owner --no-acl /backups/myppl_cloudsql_backup_....dump

# 또는 plain SQL이면 psql -U admin -d community_db < backup.sql
```

#### 3. 이미지/미디어 복사
- 새 환경의 media_data 볼륨에 복사.
- 또는 volume mount 후 rsync.
- GCS를 계속 쓰는 경우 설정 유지 (USE_GCS_STORAGE).

#### 4. 검증
- 로그인/게시판/상품/이미지 확인.
- bootstrap은 절대 돌리지 말고 (RUN_BOOTSTRAP=0).
- Admin에서 메뉴/Hero 등이 그대로인지 확인.

#### 5. 롤백 대비
- 백업 파일 + GCS 스냅샷 보관.
- 새 DB에 --data-only 먼저 테스트 후 전체 복원.

이 절차는 Cloud Run에서 Docker Compose (GCE/Vultr) 로 전환할 때 사용.

---

## 운영 지침 (2026-06 이후, Bootstrap 구조 개선 완료)

### Source of Truth 원칙
- **GitHub (단일 코드 원본)**: Django/Frontend 코드, Migration, bootstrap_community.py (초기 시드 스펙만)
- **Cloud SQL / PostgreSQL (단일 운영 데이터 원본)**: 
  - 모든 admin 설정 (boards_board 의 show_in_top_menu, is_visible, sort_order, 이름, audience 등)
  - catalog_homeproductsectionconfig (홈 그리드 섹션)
  - catalog_homeheroslide (히어로 배너)
  - catalog_productcategory + 필터/옵션
  - hotdeals_hotdealcategory, marketplace_marketplacecategory
  - 상품 데이터, 회원, 댓글, 운영 로그 등 전체 운영 데이터

**결론**: Admin panel 에서 변경한 메뉴/노출/정렬/섹션 등은 PostgreSQL 에 저장되면 **그대로 유지**된다. bootstrap 이 절대 덮어쓰지 않는다.

### Bootstrap 사용 범위 (엄격 제한)
bootstrap_community (및 RUN_BOOTSTRAP=1) 는 **오직** 다음 경우에만 사용:
- 신규 개발 환경을 위한 빈 DB 생성
- 신규 서버 / 재해복구 시 초기 데이터 구축
- 명시적이고 의도적인 전체 초기화 (개발자/운영자가 직접 RUN_BOOTSTRAP=1 주입 후 실행)

**금지**:
- 운영 중인 서비스 (myppl-backend-temp 등) 에서 자동 실행
- Admin panel 로 변경한 설정을 bootstrap 이 되돌리는 행위
- 일상 배포 / 재시작 / 스케일 시 bootstrap 실행

### 환경별 설정
- **Cloud Run (myppl-backend-temp)**: RUN_BOOTSTRAP 환경변수 **완전 제거** (또는 0). entrypoint.sh 의 if 가 false 가 되어 bootstrap 이 실행되지 않음. (이미 gcloud update 로 00035-7mh revision 에 적용 완료)
- **GitHub Actions (deploy-cloud-run.yml)**: temp 서비스 배포 시 RUN_BOOTSTRAP 를 절대 --set-env-vars 에 포함하지 않음 (이미 주석으로 보호).
- **docker-compose.yml (로컬)**: backend 서비스의 RUN_BOOTSTRAP: "0" (기본). `docker compose up` 해도 bootstrap 자동 실행 안 됨. 필요 시 수동으로 컨테이너 exec 해서 `python manage.py bootstrap_community` 실행.
- **entrypoint.sh**: RUN_BOOTSTRAP=1 일 때만 실행. 상단에 운영 정책 주석 명시.

### bootstrap_community.py 보호 장치 (구현 완료)
- boards_board, HotdealCategory, MarketplaceCategory, ProductCategory 계열 테이블에 대해:
  - `if <Model>.objects.exists():` 스킵 + WARNING 로그 ("운영 데이터 존재 → bootstrap ... 스킵 (Admin 설정 유지)")
- Home sections 는 기존에 title 존재 시 스킵하는 보호가 이미 있었음 (강화 유지).
- boards 의 force UPDATE 블록 (show_in_top_menu 등)은 빈 DB 에서만 동작.
- Admin 사용자 계정 / 샘플 데이터는 예외적으로 유지 (운영 설정이 아님).

### Admin 변경 후 유지되는 흐름
1. Admin panel (클라우드 frontend) 에서 메뉴/노출/섹션/카테고리 수정 → 바로 Cloud SQL 에 저장.
2. bootstrap 실행 여부와 무관하게 설정 유지.
3. 로컬 개발 시: 로컬 DB 를 최신으로 맞추고 싶으면 수동 `bootstrap` 또는 shell 로 동기화 (하지만 운영 설정은 cloud DB 가 진실).
4. 배포/재시작 시 bootstrap 이 실행되지 않으므로 설정 원복 없음.

### 재발 방지 대책
- RUN_BOOTSTRAP 주입 경로 전수 조사 완료 (compose, workflow, entrypoint, manual, harness 외에는 없음).
- Cloud Run 서비스에서 var 제거 + 새 revision 배포.
- bootstrap 함수 상단에 명확한 정책 주석 + exists guard.
- WORKDOC + bootstrap.py + entrypoint 에 "운영 데이터는 PostgreSQL 이 단일 진실" 명시.
- 향후 bootstrap 변경 시 반드시 "운영 테이블 UPDATE 여부" 리뷰 필수.
- Admin 변경 시 사용자 → WORKDOC 기록 → (필요 시) bless 로 코드 스펙 업데이트 (선택, bootstrap 용도일 때만).

이 구조로 전환 후 Admin → PostgreSQL → 유지 가 보장된다.

(이 섹션은 2026-06 bootstrap 구조 개선 작업 완료 후 추가)
