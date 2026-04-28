const LAST_COURSE_KEY = "lista-aula:last-course";
const DRAFT_PREFIX = "lista-aula:draft:";
const DEMO_ATTENDANCE_KEY = "lista-aula:demo-attendance";

function canUseStorage() {
  return typeof window !== "undefined" && Boolean(window.localStorage);
}

export function getLastCourseId() {
  if (!canUseStorage()) {
    return null;
  }

  return window.localStorage.getItem(LAST_COURSE_KEY);
}

export function saveLastCourseId(courseId) {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.setItem(LAST_COURSE_KEY, courseId);
}

function draftKey(courseId, date) {
  return `${DRAFT_PREFIX}${courseId}:${date}`;
}

export function getAttendanceDraft(courseId, date) {
  if (!canUseStorage()) {
    return null;
  }

  const rawDraft = window.localStorage.getItem(draftKey(courseId, date));
  return rawDraft ? JSON.parse(rawDraft) : null;
}

export function saveAttendanceDraft(courseId, date, absentIds) {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.setItem(
    draftKey(courseId, date),
    JSON.stringify({
      absentIds,
      updatedAt: new Date().toISOString(),
    }),
  );
}

export function clearAttendanceDraft(courseId, date) {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.removeItem(draftKey(courseId, date));
}

export function loadDemoAttendanceRecords() {
  if (!canUseStorage()) {
    return [];
  }

  const rawRecords = window.localStorage.getItem(DEMO_ATTENDANCE_KEY);
  return rawRecords ? JSON.parse(rawRecords) : [];
}

export function persistDemoAttendanceRecords(records) {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.setItem(DEMO_ATTENDANCE_KEY, JSON.stringify(records));
}

