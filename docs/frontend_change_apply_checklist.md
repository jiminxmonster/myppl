# 프론트 수정 반영 체크리스트 (Docker 기준)

목적: `localhost:3100`이 Docker 프론트 컨테이너일 때, "코드 수정했는데 화면이 안 바뀜" 문제를 재발하지 않게 하는 표준 절차.

## 핵심 원인

- `docker-compose`의 `frontend` 서비스가 이미지 기반(`npm start`)으로 실행되면, 로컬 파일 수정이 자동 반영되지 않습니다.
- 따라서 **수정 후 반드시 frontend 이미지 재빌드/재기동**이 필요합니다.

## 표준 절차 (반드시 이 순서)

1. 코드 수정
2. 프론트 재빌드/재기동
3. 헬스체크 확인
4. 주요 URL 반영 확인
5. 브라우저 강력 새로고침
6. 로그인/API 기본 동작 확인
7. 로그인 안정화 하네스 실행

## 명령어

프로젝트 루트에서 실행:

```bash
bash scripts/frontend_apply_check.sh
```

위 스크립트가 아래를 자동 수행합니다.

- `docker compose up -d --build frontend`
- 프론트 컨테이너 상태/헬스 체크 대기
- 주요 관리자 URL HTTP 상태 확인

## 수동 확인 URL

- `http://localhost:3100/admin-panel/boards`
- `http://localhost:3100/admin-panel/product-menus`
- `http://localhost:3100/admin-panel/contents`
- `http://localhost:3100/admin-panel/posts`

## 브라우저 확인 규칙

- 수정 직후엔 일반 새로고침 대신 **강력 새로고침**(`Cmd+Shift+R`) 사용
- 여전히 미반영이면 시크릿 창에서 동일 URL 확인
- 그래도 동일하면 컨테이너가 다른 프로젝트를 바라보는지 `docker ps`와 compose 경로 확인

## 로그인/API 확인 규칙

프론트 수정 후 로그인 장애가 반복되지 않도록 아래를 함께 확인한다.

- 로그인 페이지에 표시되는 API 대상이 현재 실행 환경과 맞는지 확인
- 로컬 직접 실행 기준: `http://localhost:8000/api/v1`
- Docker nginx 기준: `/api/v1` 또는 `http://localhost:8080/api/v1`
- VM 기준: `/api/v1` 또는 `http://34.22.96.236:8080/api/v1`
- `admin / admin`, `buy / buy`, `sell / sell` 중 최소 `admin / admin`은 화면에서 로그인 확인
- 화면 로그인이 실패하면 먼저 `/api/v1/auth/login/` API 직접 호출로 200 여부 확인
- API 200이면 프론트 API base URL, 토큰 저장, 프록시, 브라우저 캐시 문제로 판단
- API 실패면 백엔드 인증, DB 계정, 마이그레이션 상태를 먼저 확인
- 로그인 문제 해결 목적으로 bootstrap, seed, DB 초기화, Docker volume 삭제를 실행하지 않음
- VM/운영 `frontend`에는 `./frontend:/app`, `/app/.next` 볼륨을 사용하지 않음
- VM/운영 `frontend` 빌드에는 `NEXT_PUBLIC_API_URL` build arg를 전달함

## 로그인 안정화 하네스

로컬 Docker nginx 기준:

```bash
scripts/auth_stability_harness.sh local-nginx
```

VM 기준:

```bash
scripts/auth_stability_harness.sh vm
```

하네스 실패 시 작업 완료로 보고하지 않는다.

## 작업 완료 체크

- [ ] `frontend` 컨테이너 `healthy` 또는 `Up` 확인
- [ ] 대상 URL에서 변경 텍스트/컴포넌트 확인
- [ ] 사용자 브라우저 강력 새로고침 완료
- [ ] 로그인 페이지 API 대상 확인
- [ ] `admin / admin` 로그인 확인
- [ ] `scripts/auth_stability_harness.sh local-nginx` 통과
- [ ] VM 반영 시 `scripts/auth_stability_harness.sh vm` 통과
