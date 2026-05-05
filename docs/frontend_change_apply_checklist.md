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

## 작업 완료 체크

- [ ] `frontend` 컨테이너 `healthy` 또는 `Up` 확인
- [ ] 대상 URL에서 변경 텍스트/컴포넌트 확인
- [ ] 사용자 브라우저 강력 새로고침 완료
