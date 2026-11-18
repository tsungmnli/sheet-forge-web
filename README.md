# sheet-forge-web

수학 시험지 사진에서 문항을 골라 한글(hwpx) 문제지로 내보내는 서비스 [sheet-forge](https://sheet.tsungmn.com)의 웹 화면입니다. 수학 과외 선생님이 컴퓨터에 익숙하지 않아도 쓸 수 있도록, 한 화면에 한 가지 일만 하게 만들었습니다.

API 서버는 [sheet-forge-api](https://github.com/tsungmnli/sheet-forge-api), Kubernetes 배포 설정은 [sheet-forge-config](https://github.com/tsungmnli/sheet-forge-config)에 있습니다.

## 화면

| 화면 | 하는 일 |
| --- | --- |
| 로그인, 초대 가입, 비밀번호 재설정 | 가입은 초대 메일의 링크로만 합니다 |
| 홈 | 이어서 할 일과 최근 시험지 |
| 시험지, 사진 작업 | 시험지 사진을 올리고 풀어야 할 문제 칸을 고르거나 고칩니다 |
| 문제 | 읽어 온 글·수식·선택지·그림을 보고 고친 뒤 확인합니다. 수식은 수식 편집기로 입력합니다 |
| 문제지 | 확인한 문제를 담아 순서와 쪽 설정을 정하고 hwpx로 내보냅니다 |
| 휴지통, 설정 | 지운 항목 복구(30일), 학생 이름 표시 방식과 원본 사진 보관 기간 |
| 도움말, 이용약관, 개인정보 | 사용법과 안내 |

## 내 컴퓨터에서 실행해 보기

필요한 것: Node.js 22 이상, 실행 중인 [sheet-forge-api](https://github.com/tsungmnli/sheet-forge-api) (기본 `http://localhost:8000`)

```bash
npm ci
npm run dev
```

`http://localhost:3000`을 엽니다. 개발 중에는 `/api` 요청이 API 서버로 자동 전달됩니다. API가 다른 주소에 있으면 이렇게 실행하세요.

```bash
API_PROXY_TARGET=http://다른주소:8000 npm run dev
```

API를 개발 모드(로그인 끔)로 띄웠다면 로그인 없이 바로 쓸 수 있습니다.

## 빌드와 실행

```bash
npm run build
npm start          # 3000번 포트
```

Docker 이미지로 실행할 수도 있습니다.

```bash
docker build -t sheet-forge-web .
docker run --rm -p 3000:3000 sheet-forge-web
```

## 운영 환경에 올리기

웹과 API를 **같은 주소(호스트)** 에 두는 구성을 전제로 합니다. 브라우저가 `/api`로 API를 부르고, 로그인 쿠키도 같은 주소에서만 쓰므로 별도의 CORS·주소 설정이 필요 없습니다.

| 경로 | 보낼 곳 |
| --- | --- |
| `/` 와 그 밖의 모든 경로 | 이 웹 (3000번 포트) |
| `/api/...` | API 서버. **`/api` 접두어를 떼고** 전달(`/api/exams` → `/exams`) |

프록시를 직접 구성한다면 업로드할 사진이 크므로 요청 본문 한도를 API의 설정(기본 32MB)보다 크게 두세요. Kubernetes에서는 [sheet-forge-config](https://github.com/tsungmnli/sheet-forge-config)가 이 구성을 그대로 만들어 줍니다.

빌드할 때나 실행할 때 따로 넣을 환경 변수는 없습니다.

## 기술 스택

Next.js 16(App Router), React 19, Mantine 9, 수식 입력 [MathLive](https://mathlive.io), 수식 표시 KaTeX.

```
app/          페이지(로그인 등은 (auth), 나머지는 (app))
components/   화면 단위 컴포넌트(page/)와 공통 컴포넌트(common/)
lib/          API 호출(api.ts), 로그인, 타입, 업로드 등
theme/        색·글꼴 등 테마
```
