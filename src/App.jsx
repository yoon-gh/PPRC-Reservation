import React, { useEffect, useMemo, useState } from "react";
import { isSupabaseConfigured, supabase } from "./lib/supabaseClient";

const FACILITY_STATUS = Object.freeze({
  AVAILABLE: "available",
  IN_USE: "in_use",
  MAINTENANCE_SOON: "maintenance_soon",
});

const FACILITY_STATUS_LABEL = Object.freeze({
  [FACILITY_STATUS.AVAILABLE]: "사용 가능",
  [FACILITY_STATUS.IN_USE]: "사용 중",
  [FACILITY_STATUS.MAINTENANCE_SOON]: "점검 예정",
});

const RESERVATION_STATUS = Object.freeze({
  APPROVED: "approved",
  PENDING: "pending",
  MAINTENANCE: "maintenance",
  REJECTED: "rejected",
});

const RESERVATION_STATUS_LABEL = Object.freeze({
  [RESERVATION_STATUS.APPROVED]: "승인완료",
  [RESERVATION_STATUS.PENDING]: "승인대기",
  [RESERVATION_STATUS.MAINTENANCE]: "점검",
  [RESERVATION_STATUS.REJECTED]: "반려",
});

const CATEGORY = Object.freeze({
  ALL: "all",
  GROWTH: "growth",
  IMAGING: "imaging",
  MAINTENANCE: "maintenance",
});

const CATEGORY_LABEL = Object.freeze({
  [CATEGORY.ALL]: "전체",
  [CATEGORY.GROWTH]: "재배",
  [CATEGORY.IMAGING]: "촬영",
  [CATEGORY.MAINTENANCE]: "점검",
});

const VIEW_MODE = Object.freeze({
  USER: "user",
  ADMIN: "admin",
});

const STATUS_CLASS = {
  [FACILITY_STATUS.AVAILABLE]: "available-badge",
  [FACILITY_STATUS.IN_USE]: "in_use-badge",
  [FACILITY_STATUS.MAINTENANCE_SOON]: "maintenance_soon-badge",
  [RESERVATION_STATUS.APPROVED]: "approved-badge",
  [RESERVATION_STATUS.PENDING]: "pending-badge",
  [RESERVATION_STATUS.MAINTENANCE]: "maintenance-badge",
  [RESERVATION_STATUS.REJECTED]: "rejected-badge",
};

const categoryIcon = {
  [CATEGORY.ALL]: "📅",
  [CATEGORY.GROWTH]: "🌱",
  [CATEGORY.IMAGING]: "📷",
  [CATEGORY.MAINTENANCE]: "🛠",
};

const growthFacilities = [
  { id: "G-01", name: "컨베이어 온실", status: FACILITY_STATUS.AVAILABLE },
  { id: "G-02", name: "XYZ 생장실", status: FACILITY_STATUS.IN_USE },
  { id: "G-03", name: "인공환경재배실 1", status: FACILITY_STATUS.AVAILABLE },
  { id: "G-04", name: "인공환경재배실 2", status: FACILITY_STATUS.MAINTENANCE_SOON },
  { id: "G-05", name: "인공환경재배실 3", status: FACILITY_STATUS.AVAILABLE },
];

const imagingFacilities = [
  { id: "I-01", name: "컨베이어 엽록소형광", sensors: ["엽록소형광"], status: FACILITY_STATUS.AVAILABLE },
  { id: "I-02", name: "컨베이어 다중영상촬영실", sensors: ["다분광", "열화상", "LiDAR"], status: FACILITY_STATUS.AVAILABLE },
  { id: "I-03", name: "XYZ 다중영상촬영실", sensors: ["다분광", "초분광", "열화상"], status: FACILITY_STATUS.IN_USE },
  { id: "I-04", name: "소형 초분광 촬영실", sensors: ["초분광"], status: FACILITY_STATUS.AVAILABLE },
  { id: "I-05", name: "소형 다분광 촬영실", sensors: ["다분광"], status: FACILITY_STATUS.MAINTENANCE_SOON },
];

const allFacilities = [...growthFacilities, ...imagingFacilities];

const demoReservations = [
  {
    id: "demo-101",
    category: CATEGORY.GROWTH,
    facility: "컨베이어 온실",
    title: "배추 팁번 유도 실험",
    crop: "배추",
    user: "채소기초기반과",
    start: "2026-05-01T09:00",
    end: "2026-06-10T18:00",
    status: RESERVATION_STATUS.APPROVED,
    linked: "컨베이어 촬영 예정",
  },
  {
    id: "demo-201",
    category: CATEGORY.IMAGING,
    facility: "XYZ 다중영상촬영실",
    title: "딸기 생육 영상 촬영",
    crop: "딸기",
    user: "표현체 분석팀",
    start: "2026-05-13T10:00",
    end: "2026-05-13T12:00",
    status: RESERVATION_STATUS.APPROVED,
    linked: "XYZ 생장실 재배 예약 연계",
  },
];

const defaultForm = {
  category: CATEGORY.IMAGING,
  facility: imagingFacilities[0].name,
  title: "",
  user: "",
  crop: "",
  start: "2026-05-13T09:00",
  end: "2026-05-13T10:00",
  imagingMode: "재배시설 연계 촬영",
};

const adminEmails = (import.meta.env.VITE_ADMIN_EMAILS || "")
  .split(",")
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);

function getStatusLabel(status) {
  return FACILITY_STATUS_LABEL[status] || RESERVATION_STATUS_LABEL[status] || status;
}

function getCategoryLabel(category) {
  return CATEGORY_LABEL[category] || category;
}

function toDate(value) {
  return value ? new Date(value) : null;
}

function dateKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatDateTime(value) {
  const date = toDate(value);
  if (!date || Number.isNaN(date.getTime())) return "-";
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  return `${dateKey(date)} ${hh}:${mm}`;
}

function formatPeriod(reservation) {
  const start = toDate(reservation.start);
  const end = toDate(reservation.end);
  if (!start || !end) return "-";
  return dateKey(start) === dateKey(end) ? dateKey(start) : `${dateKey(start)} ~ ${dateKey(end)}`;
}

function formatTime(reservation) {
  const start = toDate(reservation.start);
  const end = toDate(reservation.end);
  if (!start || !end) return "-";
  if (reservation.category === CATEGORY.GROWTH) return "장기 재배";
  const s = `${String(start.getHours()).padStart(2, "0")}:${String(start.getMinutes()).padStart(2, "0")}`;
  const e = `${String(end.getHours()).padStart(2, "0")}:${String(end.getMinutes()).padStart(2, "0")}`;
  return `${s}–${e}`;
}

function getFacilitiesByCategory(category) {
  if (category === CATEGORY.GROWTH) return growthFacilities;
  if (category === CATEGORY.IMAGING) return imagingFacilities;
  if (category === CATEGORY.MAINTENANCE) return allFacilities;
  return allFacilities;
}

function filterReservationsByCategory(reservations, category) {
  if (category === CATEGORY.ALL) return reservations;
  return reservations.filter((reservation) => reservation.category === category);
}

function rangesOverlap(aStart, aEnd, bStart, bEnd) {
  return aStart < bEnd && bStart < aEnd;
}

function filterReservationsByMonth(reservations, monthDate) {
  const start = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1, 0, 0, 0, 0);
  const end = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 1, 0, 0, 0, 0);
  return reservations.filter((reservation) => rangesOverlap(toDate(reservation.start), toDate(reservation.end), start, end));
}

function getReservationStats(reservations) {
  return reservations.reduce(
    (acc, reservation) => {
      acc.total += 1;
      if (reservation.status === RESERVATION_STATUS.PENDING) acc.pending += 1;
      if (reservation.status === RESERVATION_STATUS.MAINTENANCE) acc.maintenance += 1;
      if (reservation.status === RESERVATION_STATUS.APPROVED) acc.approved += 1;
      if (reservation.status === RESERVATION_STATUS.REJECTED) acc.rejected += 1;
      return acc;
    },
    { total: 0, pending: 0, maintenance: 0, approved: 0, rejected: 0 }
  );
}

function findReservationConflict(reservations, candidate, ignoreId = null) {
  const candidateStart = toDate(candidate.start);
  const candidateEnd = toDate(candidate.end);

  if (!candidateStart || !candidateEnd || Number.isNaN(candidateStart.getTime()) || Number.isNaN(candidateEnd.getTime())) {
    return { type: "invalid", message: "시작/종료 일시를 올바르게 입력해 주세요." };
  }

  if (candidateStart >= candidateEnd) {
    return { type: "invalid", message: "종료 일시는 시작 일시보다 늦어야 합니다." };
  }

  const conflict = reservations.find((reservation) => {
    if (reservation.id === ignoreId) return false;
    if (reservation.status === RESERVATION_STATUS.REJECTED) return false;
    if (reservation.facility !== candidate.facility) return false;
    return rangesOverlap(candidateStart, candidateEnd, toDate(reservation.start), toDate(reservation.end));
  });

  if (!conflict) return null;
  return { type: "overlap", message: `중복 예약: ${conflict.title} (${formatDateTime(conflict.start)} ~ ${formatDateTime(conflict.end)})` };
}

function getCalendarDays(year, monthIndex) {
  const first = new Date(year, monthIndex, 1);
  const start = new Date(year, monthIndex, 1 - first.getDay());
  const days = [];
  for (let i = 0; i < 42; i += 1) {
    const day = new Date(start);
    day.setDate(start.getDate() + i);
    days.push({ date: day, key: dateKey(day), inMonth: day.getMonth() === monthIndex });
  }
  return { days, label: `${year}년 ${monthIndex + 1}월` };
}

function getReservationsForDay(reservations, day) {
  const dayStart = new Date(day);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);
  return reservations.filter((reservation) => rangesOverlap(toDate(reservation.start), toDate(reservation.end), dayStart, dayEnd));
}

function csvEscape(value) {
  const text = String(value ?? "");
  return `"${text.replaceAll('"', '""')}"`;
}

function buildReservationsCsv(reservations) {
  const headers = ["ID", "구분", "시설/장비", "예약명", "작목", "신청자/소속", "시작", "종료", "연계", "상태"];
  const rows = reservations.map((reservation) => [
    reservation.id,
    getCategoryLabel(reservation.category),
    reservation.facility,
    reservation.title,
    reservation.crop,
    reservation.user,
    formatDateTime(reservation.start),
    formatDateTime(reservation.end),
    reservation.linked,
    getStatusLabel(reservation.status),
  ]);
  return [headers, ...rows].map((row) => row.map(csvEscape).join(",")).join("\n");
}

function downloadReservationsCsv(reservations, filename = "phenotyping_reservations.csv") {
  const csv = buildReservationsCsv(reservations);
  const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function mapDbToReservation(row) {
  return {
    id: row.id,
    category: row.category,
    facility: row.facility,
    title: row.title,
    crop: row.crop || "",
    user: row.user_name || "",
    start: row.start_time,
    end: row.end_time,
    status: row.status,
    linked: row.linked || "",
  };
}

function mapReservationToDb(reservation) {
  return {
    category: reservation.category,
    facility: reservation.facility,
    title: reservation.title,
    crop: reservation.crop,
    user_name: reservation.user,
    start_time: reservation.start,
    end_time: reservation.end,
    status: reservation.status,
    linked: reservation.linked,
  };
}

function runPrototypeTests() {
  console.assert(getStatusLabel(RESERVATION_STATUS.PENDING) === "승인대기", "예약 상태 라벨 변환 실패");
  console.assert(getCategoryLabel(CATEGORY.IMAGING) === "촬영", "카테고리 라벨 변환 실패");
  console.assert(rangesOverlap(new Date("2026-05-13T10:00"), new Date("2026-05-13T11:00"), new Date("2026-05-13T10:30"), new Date("2026-05-13T12:00")) === true, "겹치는 시간 탐지 실패");
  console.assert(rangesOverlap(new Date("2026-05-13T08:00"), new Date("2026-05-13T09:00"), new Date("2026-05-13T09:00"), new Date("2026-05-13T10:00")) === false, "맞닿은 시간은 중복이 아니어야 함");
  console.assert(findReservationConflict(demoReservations, { facility: "XYZ 다중영상촬영실", start: "2026-05-13T11:00", end: "2026-05-13T12:30" })?.type === "overlap", "중복 예약 탐지 실패");
  console.assert(filterReservationsByMonth(demoReservations, new Date(2026, 4, 1)).length === 2, "월간 예약 필터 실패");
  console.assert(getCalendarDays(2026, 4).days.length === 42, "캘린더 42칸 생성 실패");
  console.assert(buildReservationsCsv(demoReservations).includes("\n"), "CSV 줄바꿈 생성 실패");
}

runPrototypeTests();

function StatusBadge({ status }) {
  return <span className={`badge ${STATUS_CLASS[status] || ""}`}>{getStatusLabel(status)}</span>;
}

function Button({ children, variant = "dark", ...props }) {
  return <button className={`btn ${variant}`} {...props}>{children}</button>;
}

function SectionTitle({ icon, title, subtitle }) {
  return (
    <div className="section-title">
      <div className="icon-box">{icon}</div>
      <div>
        <h2>{title}</h2>
        <p>{subtitle}</p>
      </div>
    </div>
  );
}

function FacilityCard({ item }) {
  const showSensorMemo = item.name.includes("다중영상촬영실") && Array.isArray(item.sensors);
  return (
    <div className={`card facility ${item.status}`}>
      <div>
        <small>{item.id}</small>
        <h3>{item.name}</h3>
        {showSensorMemo && <div className="sensor-note">센서: {item.sensors.join(", ")}</div>}
      </div>
      <StatusBadge status={item.status} />
    </div>
  );
}

function ReservationForm({ reservations, onAddReservation, disabled }) {
  const [form, setForm] = useState(defaultForm);
  const [message, setMessage] = useState(null);
  const selectableFacilities = getFacilitiesByCategory(form.category);
  const isImaging = form.category === CATEGORY.IMAGING;
  const isMaintenance = form.category === CATEGORY.MAINTENANCE;

  function updateForm(field, value) {
    if (field === "category") {
      const facilities = getFacilitiesByCategory(value);
      setForm((prev) => ({ ...prev, category: value, facility: facilities[0]?.name || "" }));
      setMessage(null);
      return;
    }
    setForm((prev) => ({ ...prev, [field]: value }));
    setMessage(null);
  }

  async function submitReservation(event) {
    event.preventDefault();
    const candidate = {
      id: crypto.randomUUID ? crypto.randomUUID() : `local-${Date.now()}`,
      category: form.category,
      facility: form.facility,
      title: form.title.trim() || (isMaintenance ? "장비 점검" : "신규 예약"),
      crop: isMaintenance ? "-" : form.crop.trim() || "미입력",
      user: form.user.trim() || "미입력",
      start: form.start,
      end: form.end,
      status: isMaintenance ? RESERVATION_STATUS.MAINTENANCE : RESERVATION_STATUS.PENDING,
      linked: isMaintenance ? "예약 불가" : isImaging ? form.imagingMode : "미연계",
    };

    const conflict = findReservationConflict(reservations, candidate);
    if (conflict) {
      setMessage({ type: "error", text: conflict.message });
      return;
    }

    const result = await onAddReservation(candidate);
    if (result?.error) {
      setMessage({ type: "error", text: result.error });
      return;
    }
    setMessage({ type: "success", text: "예약 신청이 저장되었습니다. 관리자가 승인하면 확정됩니다." });
  }

  return (
    <div className="card form-card">
      <form onSubmit={submitReservation}>
        <div className="table-head" style={{ padding: 0, border: 0, marginBottom: 14 }}>
          <div>
            <h3>예약 신청</h3>
            <p>동일 시설·장비의 시간 중복 여부를 확인한 뒤 저장합니다.</p>
          </div>
          <Button type="submit" disabled={disabled}>＋ 신청 저장</Button>
        </div>
        {message && <div className={`message ${message.type}`}>{message.text}</div>}
        {disabled && <div className="setup-note">Supabase 환경변수가 설정되지 않아 저장 기능이 비활성화되었습니다.</div>}
        <div className="form-grid">
          <label>예약 구분
            <select value={form.category} onChange={(e) => updateForm("category", e.target.value)}>
              <option value={CATEGORY.IMAGING}>{getCategoryLabel(CATEGORY.IMAGING)}</option>
              <option value={CATEGORY.GROWTH}>{getCategoryLabel(CATEGORY.GROWTH)}</option>
              <option value={CATEGORY.MAINTENANCE}>{getCategoryLabel(CATEGORY.MAINTENANCE)}</option>
            </select>
          </label>
          <label>예약 대상
            <select value={form.facility} onChange={(e) => updateForm("facility", e.target.value)}>
              {selectableFacilities.map((facility) => <option key={facility.id} value={facility.name}>{facility.name}</option>)}
            </select>
          </label>
          <label>예약명
            <input value={form.title} onChange={(e) => updateForm("title", e.target.value)} placeholder="예: 배추 팁번 촬영" />
          </label>
          <label>신청자/소속
            <input value={form.user} onChange={(e) => updateForm("user", e.target.value)} placeholder="예: 채소기초기반과 홍길동" />
          </label>
          {!isMaintenance && (
            <label className="full">작목
              <input value={form.crop} onChange={(e) => updateForm("crop", e.target.value)} placeholder="예: 배추, 딸기, 고추" />
            </label>
          )}
          <label>시작 일시
            <input value={form.start} onChange={(e) => updateForm("start", e.target.value)} type="datetime-local" />
          </label>
          <label>종료 일시
            <input value={form.end} onChange={(e) => updateForm("end", e.target.value)} type="datetime-local" />
          </label>
          {isImaging && (
            <label className="full">촬영 방식
              <select value={form.imagingMode} onChange={(e) => updateForm("imagingMode", e.target.value)}>
                <option>재배시설 연계 촬영</option>
                <option>독립 촬영</option>
              </select>
            </label>
          )}
        </div>
      </form>
    </div>
  );
}

function MonthlyCalendar({ reservations, selectedCategory, month, onMonthChange }) {
  const { days, label } = useMemo(() => getCalendarDays(month.getFullYear(), month.getMonth()), [month]);
  const visibleReservations = useMemo(() => filterReservationsByCategory(reservations, selectedCategory), [reservations, selectedCategory]);

  function moveMonth(offset) {
    onMonthChange(new Date(month.getFullYear(), month.getMonth() + offset, 1));
  }

  return (
    <div className="card calendar-card">
      <div className="calendar-head">
        <div>
          <h3>월간 캘린더</h3>
          <p>선택한 구분의 예약을 월 단위로 표시합니다.</p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <Button type="button" variant="light" onClick={() => moveMonth(-1)}>이전</Button>
          <div className="calendar-title">{label}</div>
          <Button type="button" variant="light" onClick={() => moveMonth(1)}>다음</Button>
        </div>
      </div>
      <div className="calendar-grid">
        {["일", "월", "화", "수", "목", "금", "토"].map((day) => <div key={day} className="day-name">{day}</div>)}
        {days.map(({ date, key, inMonth }) => {
          const dayReservations = getReservationsForDay(visibleReservations, date);
          const visible = dayReservations.slice(0, 3);
          const extra = dayReservations.length - visible.length;
          return (
            <div key={key} className={`day ${inMonth ? "" : "muted"}`}>
              <strong>{date.getDate()}</strong>
              {visible.map((reservation) => (
                <div key={`${reservation.id}-${key}`} className={`event ${STATUS_CLASS[reservation.status]}`} title={`${reservation.facility} / ${reservation.title}`}>
                  {categoryIcon[reservation.category]} {reservation.facility} · {reservation.title}
                </div>
              ))}
              {extra > 0 && <div className="sensor-note">+{extra}건 더 있음</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ReservationTable({ reservations }) {
  return (
    <div className="card table-card">
      <div className="table-head">
        <div>
          <h3>예약 현황</h3>
          <p>재배는 기간 단위, 촬영은 시간 단위로 표시합니다.</p>
        </div>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>구분</th><th>시설/장비</th><th>예약명</th><th>작목</th><th>기간/일자</th><th>시간</th><th>연계</th><th>상태</th>
            </tr>
          </thead>
          <tbody>
            {reservations.map((reservation) => (
              <tr key={reservation.id}>
                <td>{getCategoryLabel(reservation.category)}</td>
                <td>{reservation.facility}</td>
                <td><strong>{reservation.title}</strong></td>
                <td>{reservation.crop}</td>
                <td>{formatPeriod(reservation)}</td>
                <td>{formatTime(reservation)}</td>
                <td>↔ {reservation.linked}</td>
                <td><StatusBadge status={reservation.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AdminLogin({ session, onLogin, onLogout, isAdmin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState(null);

  async function submit(event) {
    event.preventDefault();
    if (!isSupabaseConfigured || !supabase) {
      setMessage({ type: "error", text: "Supabase 환경변수가 설정되지 않았습니다." });
      return;
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setMessage({ type: "error", text: error.message });
      return;
    }

    const signedEmail = data.user?.email?.toLowerCase();
    if (!adminEmails.includes(signedEmail)) {
      await supabase.auth.signOut();
      setMessage({ type: "error", text: "관리자 이메일 목록에 없는 계정입니다." });
      return;
    }

    setMessage(null);
    onLogin(data.session);
  }

  if (session && isAdmin) {
    return (
      <div className="card login-card">
        <h3>관리자 로그인됨</h3>
        <p>{session.user.email}</p>
        <Button type="button" variant="light" onClick={onLogout}>로그아웃</Button>
      </div>
    );
  }

  return (
    <div className="card login-card">
      <h3>관리자 로그인</h3>
      {!isSupabaseConfigured && <div className="setup-note">`.env.local`에 Supabase URL과 Anon Key를 먼저 설정해야 합니다.</div>}
      {adminEmails.length === 0 && <div className="setup-note">`.env.local`의 VITE_ADMIN_EMAILS에 관리자 이메일을 입력해야 합니다.</div>}
      {message && <div className={`message ${message.type}`}>{message.text}</div>}
      <form onSubmit={submit} className="form-grid" style={{ gridTemplateColumns: "1fr" }}>
        <label>관리자 이메일
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@example.com" />
        </label>
        <label>비밀번호
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
        <Button type="submit" disabled={!isSupabaseConfigured || adminEmails.length === 0}>로그인</Button>
      </form>
    </div>
  );
}

function AdminReservationPanel({ reservations, selectedMonthReservations, onUpdateReservation, onDeleteReservation }) {
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState(null);
  const [message, setMessage] = useState(null);

  function startEdit(reservation) {
    setEditingId(reservation.id);
    setDraft({ ...reservation });
    setMessage(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setDraft(null);
    setMessage(null);
  }

  function updateDraft(field, value) {
    setDraft((prev) => ({ ...prev, [field]: value }));
    setMessage(null);
  }

  async function saveDraft() {
    const conflict = findReservationConflict(reservations, draft, draft.id);
    if (conflict) {
      setMessage({ type: "error", text: conflict.message });
      return;
    }
    const result = await onUpdateReservation(draft.id, draft);
    if (result?.error) {
      setMessage({ type: "error", text: result.error });
      return;
    }
    setMessage({ type: "success", text: "예약 정보가 수정되었습니다." });
    setEditingId(null);
    setDraft(null);
  }

  async function quickStatus(id, status) {
    await onUpdateReservation(id, { status });
  }

  return (
    <div className="card table-card">
      <div className="table-head">
        <div>
          <h3>관리자 예약 승인·수정</h3>
          <p>전체 예약을 수정할 수 있으며, 다운로드는 현재 캘린더 월에 해당하는 예약만 내려받습니다.</p>
        </div>
        <Button type="button" variant="light" onClick={() => downloadReservationsCsv(selectedMonthReservations, "phenotyping_reservations_current_month.csv")}>엑셀용 CSV 다운로드</Button>
      </div>
      {message && <div className={`message ${message.type}`} style={{ margin: 16 }}>{message.text}</div>}
      <div className="table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>상태</th><th>구분</th><th>시설/장비</th><th>예약명</th><th>작목</th><th>신청자</th><th>시작</th><th>종료</th><th>관리</th>
            </tr>
          </thead>
          <tbody>
            {reservations.map((reservation) => {
              const isEditing = editingId === reservation.id;
              const row = isEditing ? draft : reservation;
              const facilities = getFacilitiesByCategory(row.category);

              return (
                <tr key={reservation.id}>
                  <td>{isEditing ? (
                    <select value={row.status} onChange={(e) => updateDraft("status", e.target.value)}>
                      {Object.values(RESERVATION_STATUS).map((status) => <option key={status} value={status}>{getStatusLabel(status)}</option>)}
                    </select>
                  ) : <StatusBadge status={reservation.status} />}</td>
                  <td>{isEditing ? (
                    <select value={row.category} onChange={(e) => {
                      const nextCategory = e.target.value;
                      const firstFacility = getFacilitiesByCategory(nextCategory)[0]?.name || "";
                      setDraft((prev) => ({ ...prev, category: nextCategory, facility: firstFacility }));
                    }}>
                      {[CATEGORY.GROWTH, CATEGORY.IMAGING, CATEGORY.MAINTENANCE].map((category) => <option key={category} value={category}>{getCategoryLabel(category)}</option>)}
                    </select>
                  ) : getCategoryLabel(reservation.category)}</td>
                  <td>{isEditing ? (
                    <select value={row.facility} onChange={(e) => updateDraft("facility", e.target.value)}>
                      {facilities.map((facility) => <option key={facility.id} value={facility.name}>{facility.name}</option>)}
                    </select>
                  ) : reservation.facility}</td>
                  <td>{isEditing ? <input value={row.title} onChange={(e) => updateDraft("title", e.target.value)} /> : <strong>{reservation.title}</strong>}</td>
                  <td>{isEditing ? <input value={row.crop} onChange={(e) => updateDraft("crop", e.target.value)} /> : reservation.crop}</td>
                  <td>{isEditing ? <input value={row.user} onChange={(e) => updateDraft("user", e.target.value)} /> : reservation.user}</td>
                  <td>{isEditing ? <input type="datetime-local" value={row.start} onChange={(e) => updateDraft("start", e.target.value)} /> : formatDateTime(reservation.start)}</td>
                  <td>{isEditing ? <input type="datetime-local" value={row.end} onChange={(e) => updateDraft("end", e.target.value)} /> : formatDateTime(reservation.end)}</td>
                  <td>
                    {isEditing ? (
                      <div className="actions">
                        <Button type="button" onClick={saveDraft}>저장</Button>
                        <Button type="button" variant="light" onClick={cancelEdit}>취소</Button>
                      </div>
                    ) : (
                      <div className="actions">
                        {reservation.status === RESERVATION_STATUS.PENDING && <Button type="button" onClick={() => quickStatus(reservation.id, RESERVATION_STATUS.APPROVED)}>승인</Button>}
                        {reservation.status === RESERVATION_STATUS.PENDING && <Button type="button" variant="light" onClick={() => quickStatus(reservation.id, RESERVATION_STATUS.REJECTED)}>반려</Button>}
                        <Button type="button" variant="light" onClick={() => startEdit(reservation)}>수정</Button>
                        <Button type="button" variant="danger" onClick={() => onDeleteReservation(reservation.id)}>삭제</Button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function App() {
  const [tab, setTab] = useState(CATEGORY.ALL);
  const [viewMode, setViewMode] = useState(VIEW_MODE.USER);
  const [calendarMonth, setCalendarMonth] = useState(new Date(2026, 4, 1));
  const [reservationsState, setReservationsState] = useState([]);
  const [loading, setLoading] = useState(false);
  const [session, setSession] = useState(null);

  const isAdmin = Boolean(session?.user?.email && adminEmails.includes(session.user.email.toLowerCase()));

  useEffect(() => {
    async function init() {
      if (!isSupabaseConfigured || !supabase) return;
      setLoading(true);
      const { data: sessionData } = await supabase.auth.getSession();
      setSession(sessionData.session);
      const { data, error } = await supabase.from("reservations").select("*").order("created_at", { ascending: true });
      if (!error && data) setReservationsState(data.map(mapDbToReservation));
      setLoading(false);
    }
    init();
  }, []);

  async function addReservation(reservation) {
    if (!isSupabaseConfigured || !supabase) return { error: "Supabase가 설정되지 않았습니다." };
    const { data, error } = await supabase.from("reservations").insert(mapReservationToDb(reservation)).select().single();
    if (error) return { error: error.message };
    setReservationsState((prev) => [...prev, mapDbToReservation(data)]);
    return { ok: true };
  }

  async function updateReservation(id, patch) {
    if (!isAdmin) return { error: "관리자 권한이 필요합니다." };
    if (!isSupabaseConfigured || !supabase) return { error: "Supabase가 설정되지 않았습니다." };

    const current = reservationsState.find((reservation) => reservation.id === id);
    const nextReservation = { ...current, ...patch };
    const { data, error } = await supabase.from("reservations").update(mapReservationToDb(nextReservation)).eq("id", id).select().single();
    if (error) return { error: error.message };

    setReservationsState((prev) => prev.map((reservation) => reservation.id === id ? mapDbToReservation(data) : reservation));
    return { ok: true };
  }

  async function deleteReservation(id) {
    if (!isAdmin) return { error: "관리자 권한이 필요합니다." };
    if (!isSupabaseConfigured || !supabase) return { error: "Supabase가 설정되지 않았습니다." };

    const { error } = await supabase.from("reservations").delete().eq("id", id);
    if (error) return { error: error.message };
    setReservationsState((prev) => prev.filter((reservation) => reservation.id !== id));
    return { ok: true };
  }

  async function logoutAdmin() {
    if (supabase) await supabase.auth.signOut();
    setSession(null);
  }

  async function loadDemoData() {
    if (!isSupabaseConfigured || !supabase) {
      setReservationsState(demoReservations);
      return;
    }

    for (const reservation of demoReservations) {
      const exists = findReservationConflict(reservationsState, reservation);
      if (!exists) {
        await supabase.from("reservations").insert(mapReservationToDb(reservation));
      }
    }

    const { data } = await supabase.from("reservations").select("*").order("created_at", { ascending: true });
    if (data) setReservationsState(data.map(mapDbToReservation));
  }

  const selectedMonthReservations = useMemo(() => filterReservationsByMonth(reservationsState, calendarMonth), [reservationsState, calendarMonth]);
  const filteredReservations = useMemo(() => filterReservationsByCategory(selectedMonthReservations, tab), [selectedMonthReservations, tab]);
  const reservationStats = useMemo(() => getReservationStats(selectedMonthReservations), [selectedMonthReservations]);

  const facilityStatusStats = useMemo(() => {
    return allFacilities.reduce((acc, facility) => {
      acc[facility.status] = (acc[facility.status] || 0) + 1;
      return acc;
    }, {});
  }, []);

  const dashboardCards = [
    { label: "해당 월 전체 예약", value: reservationStats.total, icon: categoryIcon[CATEGORY.ALL], helper: `${calendarMonth.getFullYear()}년 ${calendarMonth.getMonth() + 1}월 기준` },
    { label: "사용 가능 시설", value: facilityStatusStats[FACILITY_STATUS.AVAILABLE] || 0, icon: "🟢", helper: "현재 예약 가능 상태" },
    { label: "사용 중 시설", value: facilityStatusStats[FACILITY_STATUS.IN_USE] || 0, icon: "🔵", helper: "현재 사용 중" },
    { label: "점검 예정 시설", value: facilityStatusStats[FACILITY_STATUS.MAINTENANCE_SOON] || 0, icon: "🟡", helper: "점검 확인 필요" },
  ];

  return (
    <div className="app">
      <div className="container">
        <header className="header">
          <div>
            <p><strong>Phenotyping Facility Reservation System</strong></p>
            <h1>표현체 연구시설 사용일정 공유 웹</h1>
            <p>재배시설은 장기 재배 예약으로, 촬영시설은 시간 단위 예약으로 분리 관리합니다. 예약 데이터는 Supabase 공용 DB에 저장됩니다.</p>
            {loading && <p>예약 데이터를 불러오는 중입니다...</p>}
          </div>
          <div className="mode-tabs">
            <button type="button" onClick={() => setViewMode(VIEW_MODE.USER)} className={viewMode === VIEW_MODE.USER ? "active" : ""}>사용자</button>
            <button type="button" onClick={() => setViewMode(VIEW_MODE.ADMIN)} className={viewMode === VIEW_MODE.ADMIN ? "active" : ""}>관리자</button>
            <button type="button" onClick={loadDemoData}>예시 불러오기</button>
          </div>
        </header>

        <section className="dashboard">
          {dashboardCards.map((card) => (
            <div key={card.label} className="card stat">
              <div>
                <div className="label">{card.label}</div>
                <div className="value">{card.value}</div>
                <div className="helper">{card.helper}</div>
              </div>
              <div className="icon">{card.icon}</div>
            </div>
          ))}
        </section>

        {viewMode === VIEW_MODE.USER && (
          <>
            <section>
              <SectionTitle icon={categoryIcon[CATEGORY.GROWTH]} title="재배시설" subtitle="기간 단위로 예약하고, 필요 시 촬영 예약과 연결합니다." />
              <div className="grid-5" style={{ marginTop: 14 }}>
                {growthFacilities.map((item) => <FacilityCard key={item.id} item={item} />)}
              </div>
            </section>

            <section>
              <SectionTitle icon={categoryIcon[CATEGORY.IMAGING]} title="촬영시설 및 장비" subtitle="시간 단위 예약, 연계 촬영과 독립 촬영을 구분합니다." />
              <div className="grid-5" style={{ marginTop: 14 }}>
                {imagingFacilities.map((item) => <FacilityCard key={item.id} item={item} />)}
              </div>
            </section>

            <section className="two-col">
              <ReservationForm reservations={reservationsState} onAddReservation={addReservation} disabled={!isSupabaseConfigured} />
              <div className="card rules">
                <h3>예약 운영 규칙</h3>
                <p><strong>재배 예약</strong>은 작목, 재배기간, 처리조건, 식물체 수를 기준으로 승인합니다.</p>
                <p><strong>촬영 예약</strong>은 촬영시설, 센서, 촬영시간, 연계 재배 예약 여부를 기준으로 승인합니다.</p>
                <p>동일 시설·장비의 시간이 겹치면 저장되지 않으며, 기존 예약 정보가 경고로 표시됩니다.</p>
                <p>점검, 보정, 수리 일정도 중복 방지 대상에 포함됩니다.</p>
              </div>
            </section>
          </>
        )}

        {viewMode === VIEW_MODE.ADMIN && (
          <>
            <AdminLogin session={session} onLogin={setSession} onLogout={logoutAdmin} isAdmin={isAdmin} />
            {isAdmin && (
              <AdminReservationPanel
                reservations={reservationsState}
                selectedMonthReservations={selectedMonthReservations}
                onUpdateReservation={updateReservation}
                onDeleteReservation={deleteReservation}
              />
            )}
          </>
        )}

        <section>
          <div className="filter-row">
            {[CATEGORY.ALL, CATEGORY.GROWTH, CATEGORY.IMAGING, CATEGORY.MAINTENANCE].map((name) => (
              <button key={name} type="button" onClick={() => setTab(name)} className={`chip ${tab === name ? "active" : ""}`}>{getCategoryLabel(name)}</button>
            ))}
          </div>
        </section>

        <MonthlyCalendar reservations={reservationsState} selectedCategory={tab} month={calendarMonth} onMonthChange={setCalendarMonth} />
        <ReservationTable reservations={filteredReservations} />
      </div>
    </div>
  );
}
