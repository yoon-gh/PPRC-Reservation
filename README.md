# 표현체 연구시설 예약 시스템

React + Vite + Supabase 기반 프로토타입입니다.

## 1. 설치

```bash
npm install
npm run dev
```

## 2. Supabase 설정

1. Supabase 프로젝트 생성
2. `supabase/schema.sql` 내용을 Supabase SQL Editor에서 실행
3. Supabase Authentication > Users에서 관리자 이메일/비밀번호 사용자 생성
4. `.env.example`을 복사해 `.env.local` 생성

```bash
cp .env.example .env.local
```

`.env.local`에 아래 값 입력:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
VITE_ADMIN_EMAILS=admin@example.com
```

## 3. 실행

```bash
npm run dev
```

## 4. 배포

```bash
npm run build
```

Vercel에 배포할 때 Environment Variables에 `.env.local`과 동일한 값을 넣어야 합니다.

## 5. 기능

- 사용자 예약 신청
- Supabase 공용 DB 저장
- 새로고침/다른 PC에서도 예약 공유
- 관리자 이메일 로그인
- 관리자 승인/반려/수정/삭제
- 현재 캘린더 월 기준 CSV 다운로드
- 동일 시설·장비 시간 중복 방지
