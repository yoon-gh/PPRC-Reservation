-- Supabase SQL Editor에서 실행하세요.

create table if not exists public.reservations (
  id uuid primary key default gen_random_uuid(),
  category text not null check (category in ('growth', 'imaging', 'maintenance')),
  facility text not null,
  title text not null,
  crop text,
  user_name text,
  start_time text not null,
  end_time text not null,
  status text not null check (status in ('approved', 'pending', 'maintenance', 'rejected')),
  linked text,
  created_at timestamptz not null default now()
);

alter table public.reservations enable row level security;

-- 사용자 화면: 예약 현황 조회 가능
create policy "Anyone can read reservations"
on public.reservations
for select
using (true);

-- 사용자 화면: 예약 신청 가능
create policy "Anyone can insert reservations"
on public.reservations
for insert
with check (true);

-- 관리자 기능: 로그인한 사용자만 수정/삭제 가능
-- 실제 관리자 이메일 제한은 앱의 VITE_ADMIN_EMAILS에서 1차 제한합니다.
-- 더 엄격히 운영하려면 별도 profiles/admins 테이블 기반 RLS로 확장하세요.
create policy "Authenticated users can update reservations"
on public.reservations
for update
using (auth.role() = 'authenticated')
with check (auth.role() = 'authenticated');

create policy "Authenticated users can delete reservations"
on public.reservations
for delete
using (auth.role() = 'authenticated');
