import { collection, doc, getDoc, getDocs } from "firebase/firestore";
import { withFirestoreFallback } from "../lib/firestoreFallback";
import { db, hasFirebaseConfig } from "../lib/firebase";
import { getDemoCourseById, getDemoCourses } from "../mocks/demoStore";

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

function normalizeCourse(id, data, schoolsMap, studentCountMap) {
  return {
    id,
    name: data.name || "Curso",
    schoolId: data.schoolId || "",
    schoolName: schoolsMap.get(data.schoolId) || "Colegio",
    shift: data.shift || "",
    createdAt: normalizeTimestamp(data.createdAt),
    studentCount: studentCountMap.get(id) || 0,
  };
}

async function loadSchoolsMap() {
  const snapshot = await getDocs(collection(db, "schools"));
  return new Map(
    snapshot.docs.map((schoolDoc) => [schoolDoc.id, schoolDoc.data().name || "Colegio"]),
  );
}

async function loadStudentCountMap() {
  const snapshot = await getDocs(collection(db, "students"));
  const counts = new Map();

  snapshot.docs.forEach((studentDoc) => {
    const data = studentDoc.data();
    if (data.isActive === false || !data.courseId) {
      return;
    }

    counts.set(data.courseId, (counts.get(data.courseId) || 0) + 1);
  });

  return counts;
}

export async function getCourses() {
  if (!hasFirebaseConfig) {
    return getDemoCourses();
  }

  const courses = await withFirestoreFallback(async () => {
    const [coursesSnapshot, schoolsMap, studentCountMap] = await Promise.all([
      getDocs(collection(db, "courses")),
      loadSchoolsMap(),
      loadStudentCountMap(),
    ]);

    return coursesSnapshot.docs
      .map((courseDoc) =>
        normalizeCourse(courseDoc.id, courseDoc.data(), schoolsMap, studentCountMap),
      )
      .sort((left, right) => left.name.localeCompare(right.name));
  }, getDemoCourses);

  return courses.length ? courses : getDemoCourses();
}

export async function getCourseById(courseId) {
  if (!hasFirebaseConfig) {
    return getDemoCourseById(courseId);
  }

  const course = await withFirestoreFallback(async () => {
    const [courseSnapshot, schoolsMap, studentCountMap] = await Promise.all([
      getDoc(doc(db, "courses", courseId)),
      loadSchoolsMap(),
      loadStudentCountMap(),
    ]);

    if (!courseSnapshot.exists()) {
      return null;
    }

    return normalizeCourse(courseSnapshot.id, courseSnapshot.data(), schoolsMap, studentCountMap);
  }, () => getDemoCourseById(courseId));

  return course || getDemoCourseById(courseId);
}
