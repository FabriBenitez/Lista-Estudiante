import { collection, getDocs, query, where } from "firebase/firestore";
import { withFirestoreFallback } from "../lib/firestoreFallback";
import { db, hasFirebaseConfig } from "../lib/firebase";
import { getDemoStudentsByCourse } from "../mocks/demoStore";

export async function getStudentsByCourse(courseId) {
  if (!hasFirebaseConfig) {
    return getDemoStudentsByCourse(courseId);
  }

  const students = await withFirestoreFallback(async () => {
    const studentsQuery = query(
      collection(db, "students"),
      where("courseId", "==", courseId),
    );
    const snapshot = await getDocs(studentsQuery);

    return snapshot.docs
      .map((studentDoc) => ({
        id: studentDoc.id,
        ...studentDoc.data(),
      }))
      .filter((studentItem) => studentItem.isActive !== false)
      .sort((left, right) => left.fullName.localeCompare(right.fullName, "es"));
  }, () => getDemoStudentsByCourse(courseId));

  return students.length ? students : getDemoStudentsByCourse(courseId);
}
