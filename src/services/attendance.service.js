import {
  addDoc,
  collection,
  doc,
  getDocs,
  limit,
  query,
  runTransaction,
  serverTimestamp,
  where,
  orderBy,
} from "firebase/firestore";
import { shouldUseDemoFallback, withFirestoreFallback } from "../lib/firestoreFallback";
import { db, hasFirebaseConfig } from "../lib/firebase";
import {
  createDemoAttendance,
  getDemoAttendanceByCourseAndDate,
  listDemoAttendanceByDate,
  listDemoAttendanceByDateRange,
  listDemoAttendanceHistory,
  updateDemoAttendance,
} from "../mocks/demoStore";

function normalizeTimestamp(value) {
  if (!value) {
    return null;
  }

  if (typeof value === "string") {
    return value;
  }

  if (typeof value.toDate === "function") {
    return value.toDate().toISOString();
  }

  return value;
}

function normalizeAttendance(id, data) {
  return {
    id,
    courseId: data.courseId,
    date: data.date,
    students: data.students || {},
    createdAt: normalizeTimestamp(data.createdAt),
    updatedAt: normalizeTimestamp(data.updatedAt),
  };
}

function countFromStudentMap(studentMap) {
  const statuses = Object.values(studentMap || {});
  const absentCount = statuses.filter((status) => status === "absent").length;

  return {
    absentCount,
    presentCount: Math.max(statuses.length - absentCount, 0),
  };
}

async function findAttendanceDocs(courseId, date) {
  const attendanceQuery = query(
    collection(db, "attendance"),
    where("courseId", "==", courseId),
    where("date", "==", date),
    limit(1),
  );
  const snapshot = await getDocs(attendanceQuery);
  return snapshot.docs[0] || null;
}

export async function getAttendanceByCourseAndDate(courseId, date) {
  if (!hasFirebaseConfig) {
    return getDemoAttendanceByCourseAndDate(courseId, date);
  }

  return withFirestoreFallback(async () => {
    const match = await findAttendanceDocs(courseId, date);
    return match ? normalizeAttendance(match.id, match.data()) : null;
  }, () => getDemoAttendanceByCourseAndDate(courseId, date));
}

export async function createAttendance(payload) {
  if (!hasFirebaseConfig) {
    return createDemoAttendance(payload);
  }

  return withFirestoreFallback(async () => {
    const existingDoc = await findAttendanceDocs(payload.courseId, payload.date);
    if (existingDoc) {
      const error = new Error("Attendance already exists");
      error.code = "attendance/already-exists";
      throw error;
    }

    const newRef = await addDoc(collection(db, "attendance"), {
      courseId: payload.courseId,
      date: payload.date,
      students: payload.students,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    const savedRecord = await getAttendanceByCourseAndDate(payload.courseId, payload.date);
    return savedRecord || { id: newRef.id, ...payload };
  }, () => createDemoAttendance(payload));
}

export async function updateAttendance(payload) {
  if (!hasFirebaseConfig) {
    return updateDemoAttendance(payload);
  }

  return withFirestoreFallback(async () => {
    const existingDoc = await findAttendanceDocs(payload.courseId, payload.date);
    if (!existingDoc) {
      const error = new Error("Attendance not found");
      error.code = "attendance/not-found";
      throw error;
    }

    await runTransaction(db, async (transaction) => {
      transaction.set(
        doc(db, "attendance", existingDoc.id),
        {
          courseId: payload.courseId,
          date: payload.date,
          students: payload.students,
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );
    });

    return getAttendanceByCourseAndDate(payload.courseId, payload.date);
  }, () => updateDemoAttendance(payload));
}

export async function getAttendanceHistory(courseId, maxItems = 30) {
  if (!hasFirebaseConfig) {
    return listDemoAttendanceHistory(courseId, maxItems);
  }

  return withFirestoreFallback(async () => {
    const historyQuery = query(
      collection(db, "attendance"),
      where("courseId", "==", courseId),
      orderBy("date", "desc"),
      limit(maxItems),
    );
    const snapshot = await getDocs(historyQuery);

    return snapshot.docs.map((attendanceDoc) =>
      normalizeAttendance(attendanceDoc.id, attendanceDoc.data()),
    );
  }, () => listDemoAttendanceHistory(courseId, maxItems));
}

export async function getAttendanceByDate(date) {
  if (!hasFirebaseConfig) {
    return listDemoAttendanceByDate(date);
  }

  return withFirestoreFallback(async () => {
    const attendanceQuery = query(
      collection(db, "attendance"),
      where("date", "==", date),
    );
    const snapshot = await getDocs(attendanceQuery);

    return snapshot.docs.map((attendanceDoc) =>
      normalizeAttendance(attendanceDoc.id, attendanceDoc.data()),
    );
  }, () => listDemoAttendanceByDate(date));
}

export async function getAttendanceByDateRange(dateFrom, dateTo) {
  if (!hasFirebaseConfig) {
    return listDemoAttendanceByDateRange(dateFrom, dateTo);
  }

  return withFirestoreFallback(async () => {
    const attendanceQuery = query(
      collection(db, "attendance"),
      where("date", ">=", dateFrom),
      where("date", "<=", dateTo),
    );
    const snapshot = await getDocs(attendanceQuery);

    return snapshot.docs.map((attendanceDoc) =>
      normalizeAttendance(attendanceDoc.id, attendanceDoc.data()),
    );
  }, () => listDemoAttendanceByDateRange(dateFrom, dateTo));
}

export function getAttendanceStats(studentMap) {
  return countFromStudentMap(studentMap);
}
