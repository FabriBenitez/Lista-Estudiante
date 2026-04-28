import {
  loadDemoAttendanceRecords,
  persistDemoAttendanceRecords,
} from "../lib/localStorage";
import { schoolSeeds } from "../../scripts/data/schools.seed.mjs";

function normalizeText(value) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function safeId(prefix, value) {
  return `${prefix}-${normalizeText(value)}`;
}

const baseSchools = schoolSeeds.map((schoolSeed) => ({
  id: safeId("school", schoolSeed.name),
  name: schoolSeed.name,
}));

const baseCourses = schoolSeeds.flatMap((schoolSeed) =>
  schoolSeed.courses.map((courseSeed) => ({
    id: safeId("course", `${schoolSeed.name}-${courseSeed.name}`),
    schoolId: safeId("school", schoolSeed.name),
    name: courseSeed.name,
    shift: courseSeed.shift || "",
    createdAt: "2026-04-01T08:00:00.000Z",
  })),
);

const studentsByCourse = Object.fromEntries(
  schoolSeeds.flatMap((schoolSeed) =>
    schoolSeed.courses.map((courseSeed) => {
      const courseId = safeId("course", `${schoolSeed.name}-${courseSeed.name}`);
      return [
        courseId,
        courseSeed.students.map((studentName, index) => ({
          id: safeId("student", `${courseId}-${studentName}-${index + 1}`),
          fullName: studentName,
          courseId,
          isActive: true,
          createdAt: "2026-04-01T08:00:00.000Z",
        })),
      ];
    }),
  ),
);

function buildAttendanceId(courseId, date) {
  return `${courseId}_${date}`;
}

function schoolNameFor(schoolId) {
  return baseSchools.find((school) => school.id === schoolId)?.name || "Colegio";
}

function attachCourseMeta(course) {
  const latestRecord = loadDemoAttendanceRecords()
    .filter((record) => record.courseId === course.id)
    .sort((left, right) => right.date.localeCompare(left.date))[0];

  return {
    ...course,
    schoolName: schoolNameFor(course.schoolId),
    studentCount: (studentsByCourse[course.id] || []).filter(
      (studentItem) => studentItem.isActive !== false,
    ).length,
    lastAttendanceDate: latestRecord?.date || null,
    lastAttendanceAt: latestRecord?.updatedAt || latestRecord?.createdAt || null,
  };
}

export async function getDemoCourses() {
  return baseCourses.map(attachCourseMeta).sort((left, right) => left.name.localeCompare(right.name));
}

export async function getDemoCourseById(courseId) {
  const course = baseCourses.find((item) => item.id === courseId);
  return course ? attachCourseMeta(course) : null;
}

export async function getDemoStudentsByCourse(courseId) {
  return (studentsByCourse[courseId] || []).filter((studentItem) => studentItem.isActive !== false);
}

export async function getDemoAttendanceByCourseAndDate(courseId, date) {
  const attendanceId = buildAttendanceId(courseId, date);
  return (
    loadDemoAttendanceRecords().find((record) => {
      return record.id === attendanceId || (record.courseId === courseId && record.date === date);
    }) || null
  );
}

export async function listDemoAttendanceHistory(courseId, maxItems = 30) {
  return loadDemoAttendanceRecords()
    .filter((record) => record.courseId === courseId)
    .sort((left, right) => right.date.localeCompare(left.date))
    .slice(0, maxItems);
}

export async function listDemoAttendanceByDate(date) {
  return loadDemoAttendanceRecords().filter((record) => record.date === date);
}

export async function listDemoAttendanceByDateRange(dateFrom, dateTo) {
  return loadDemoAttendanceRecords().filter((record) => {
    return record.date >= dateFrom && record.date <= dateTo;
  });
}

export async function createDemoAttendance(payload) {
  const records = loadDemoAttendanceRecords();
  const existingRecord = records.find((record) => {
    return record.courseId === payload.courseId && record.date === payload.date;
  });

  if (existingRecord) {
    const error = new Error("Attendance already exists");
    error.code = "attendance/already-exists";
    throw error;
  }

  const record = {
    ...payload,
    id: buildAttendanceId(payload.courseId, payload.date),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  persistDemoAttendanceRecords([...records, record]);
  return record;
}

export async function updateDemoAttendance(payload) {
  const records = loadDemoAttendanceRecords();
  const currentRecord = records.find((record) => {
    return record.courseId === payload.courseId && record.date === payload.date;
  });

  if (!currentRecord) {
    const error = new Error("Attendance not found");
    error.code = "attendance/not-found";
    throw error;
  }

  const updatedRecord = {
    ...currentRecord,
    ...payload,
    updatedAt: new Date().toISOString(),
  };

  persistDemoAttendanceRecords(
    records.map((record) => (record.id === currentRecord.id ? updatedRecord : record)),
  );

  return updatedRecord;
}
