# Communitysite

작업지시서 기준으로 Django REST API, Next.js 14, PostgreSQL, Redis, Channels 구성을 단계별로 구현한 저장소입니다.

## 추가 기획 문서

- 외부 쇼핑몰 상품수집 및 필터관리 요구사항: [`docs/external_product_ingestion_spec.md`](/Users/bannykick/Documents/work/comunitysite/docs/external_product_ingestion_spec.md)

## 외부 상품수집 기능 메모

- 외부 쇼핑몰 카테고리/속성은 자동 수집 가능하도록 설계합니다.
- 사용자 노출 구조는 외부 원본을 그대로 쓰지 않고 내부 표준 카테고리/필터 체계로 승인 후 노출합니다.
- 사용자는 관심 상품 조건을 저장할 수 있고, 향후 내부 알림/이메일/카카오톡/문자 채널을 선택적으로 받을 수 있도록 확장 중입니다.
- 알림은 내부(WebSocket) + 채널별 발송 이력(`NotificationDelivery`)을 함께 저장하도록 구현했습니다.
- 이메일은 Django 메일 백엔드, 카카오/SMS는 웹훅 릴레이 URL 방식으로 연결하도록 구성했습니다.

## 로컬 실행

1. 루트의 [`.env`](/Users/bannykick/Documents/work/comunitysite/.env) 값을 확인합니다.
2. `docker compose up --build`로 전체 스택을 올립니다.
3. 기본 로컬 포트는 다음과 같습니다.

- 프론트엔드: `http://localhost:3100`
- 백엔드 API: `http://localhost:8000/api/v1`
- Nginx: `http://localhost:8080`

## 초기 데이터

기본 게시판과 관리자, 샘플 데이터를 한 번에 넣으려면 아래 명령을 실행합니다.

```bash
docker exec comunitysite-backend-1 python manage.py bootstrap_community --with-sample-data
```

기본 관리자 계정은 다음 값으로 생성됩니다.

- 아이디: `admin`
- 비밀번호: `admin`

필요하면 명령 옵션으로 값을 바꿀 수 있습니다.

## 검증 하네스

역할별 핵심 흐름을 함께 검수할 때는 아래 두 단계를 순서대로 실행하면 됩니다.

1. 검증용 고정 데이터 준비

```bash
docker compose exec -T backend python manage.py prepare_validation_harness --with-bootstrap
```

2. 역할별 스모크 검증 실행

```bash
python3 scripts/smoke_validation.py
```

이 스크립트는 아래 흐름을 한 번에 확인합니다.

- `sell / sell` 판매자 로그인
- 판매상품 등록
- `admin / admin` 관리자 승인
- 공개 상품리스트 노출
- `buy / buy` 구매자 원하는상품 등록
- 승인된 판매상품과 매칭 결과 확인

알림 채널 발송이력까지 점검하려면 아래를 추가로 실행합니다.

```bash
python3 scripts/notification_validation.py
```

## 프론트 수정 반영 표준 절차

`localhost:3100`이 Docker 프론트 컨테이너일 때는 코드 수정이 자동 반영되지 않을 수 있습니다.  
아래 스크립트로 `재빌드 -> 재기동 -> URL 확인`을 한 번에 처리합니다.

```bash
bash scripts/frontend_apply_check.sh
```

상세 절차 문서:

- [`docs/frontend_change_apply_checklist.md`](/Users/bannykick/Documents/work/comunitysite/docs/frontend_change_apply_checklist.md)

## 배포 전 점검

배포 직전에 환경변수/컨테이너/핵심 URL 상태를 한 번에 점검하려면 아래를 실행합니다.

```bash
python3 scripts/predeploy_audit.py
```

## 참고

- 현재 머신에서 `3000` 포트가 이미 다른 컨테이너에서 사용 중이라 로컬 기본 프론트 포트는 `3100`으로 잡았습니다.
- 운영 배포 시 [`.env.example`](/Users/bannykick/Documents/work/comunitysite/.env.example)를 기준으로 실제 비밀값으로 교체해야 합니다.
- Vultr Object Storage를 실제로 쓸 때는 `.env`에서 `USE_S3_STORAGE=True`로 바꾸고 `AWS_*` 값을 실키로 교체하면 됩니다.
- 쿠팡 판매자 Open API 실연동을 쓰려면 `.env`에 `COUPANG_ACCESS_KEY`, `COUPANG_SECRET_KEY`, `COUPANG_VENDOR_ID`를 추가해야 하며, 판매자 상품 불러오기는 `sellerProductId` 또는 `externalVendorSku` 기준으로 연결됩니다.
- 다중 알림 채널을 켜려면 `.env`에 `NOTIFICATION_EMAIL_FROM`, `NOTIFICATION_KAKAO_WEBHOOK_URL`, `NOTIFICATION_SMS_WEBHOOK_URL`을 설정해야 합니다.
- 결제는 현재 PortOne 실호출 전 단계이며, `payments/prepare`와 `payments/verify` API로 주문 생성과 상태 반영 골격만 구현돼 있습니다.
