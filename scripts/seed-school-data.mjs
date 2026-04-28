import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { deleteApp, initializeApp } from "firebase/app";
import {
  collection,
  doc,
  getDocs,
  getFirestore,
  serverTimestamp,
  terminate,
  writeBatch,
} from "firebase/firestore";
import { schoolSeeds } from "./data/schools.seed.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

function loadEnvFile(fileName) {
  const filePath = path.join(projectRoot, fileName);
  if (!fs.existsSync(filePath)) {
    return;
  }

  const content = fs.readFileSync(filePath, "utf8");
  content.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      return;
    }

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) {
      return;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim();
    if (key && !process.env[key]) {
      process.env[key] = value;
    }
  });
}

loadEnvFile(".env");
loadEnvFile(".env.local");

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
  measurementId: process.env.VITE_FIREBASE_MEASUREMENT_ID,
};

if (!Object.values(firebaseConfig).every(Boolean)) {
  throw new Error("Faltan variables de Firebase en .env o .env.local.");
}

async function ensureFirestoreApiIsReachable() {
  const response = await fetch(
    `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/(default)/documents/__healthcheck__/__ping__?key=${firebaseConfig.apiKey}`,
  );

  if (response.ok || response.status === 404) {
    return;
  }

  const payload = await response.json().catch(() => ({}));
  const message = payload?.error?.message || "";

  if (message.includes("Cloud Firestore API has not been used in project")) {
    throw new Error(
      `La API de Cloud Firestore esta deshabilitada para ${firebaseConfig.projectId}. Actívala en https://console.developers.google.com/apis/api/firestore.googleapis.com/overview?project=${firebaseConfig.projectId} y vuelve a correr el seed.`,
    );
  }

  if (message.includes("Missing or insufficient permissions")) {
    throw new Error(
      "Firestore respondio con permisos insuficientes. Habilita modo prueba o una estrategia de autenticacion antes de correr el seed.",
    );
  }

  throw new Error(
    `No se pudo validar Firestore para ${firebaseConfig.projectId}. Respuesta: ${message || response.status}`,
  );
}

await ensureFirestoreApiIsReachable();

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

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

function schoolFallbackId(schoolName) {
  return safeId("school", schoolName);
}

function courseFallbackId(schoolName, courseName) {
  return safeId("course", `${schoolName}-${courseName}`);
}

function studentFallbackId(courseId, studentName, index) {
  const suffix = index > 1 ? `-${index}` : "";
  return safeId("student", `${courseId}-${studentName}${suffix}`);
}

function chunk(array, size) {
  const chunks = [];
  for (let index = 0; index < array.length; index += size) {
    chunks.push(array.slice(index, index + size));
  }
  return chunks;
}

function pickCreatedAt(currentData) {
  return currentData?.createdAt || serverTimestamp();
}

try {
  const schoolsSnapshot = await getDocs(collection(db, "schools"));
  const coursesSnapshot = await getDocs(collection(db, "courses"));
  const studentsSnapshot = await getDocs(collection(db, "students"));

  const existingSchoolsByKey = new Map();
  schoolsSnapshot.docs.forEach((schoolDoc) => {
    existingSchoolsByKey.set(normalizeText(schoolDoc.data().name || ""), {
      id: schoolDoc.id,
      data: schoolDoc.data(),
    });
  });

  const existingCoursesByKey = new Map();
  coursesSnapshot.docs.forEach((courseDoc) => {
    const data = courseDoc.data();
    existingCoursesByKey.set(
      `${data.schoolId}::${normalizeText(data.name || "")}`,
      {
        id: courseDoc.id,
        data,
      },
    );
  });

  const existingStudentsByCourse = new Map();
  studentsSnapshot.docs.forEach((studentDoc) => {
    const data = studentDoc.data();
    if (!data.courseId) {
      return;
    }

    const courseBucket = existingStudentsByCourse.get(data.courseId) || new Map();
    const nameKey = normalizeText(data.fullName || "");
    const pool = courseBucket.get(nameKey) || [];
    pool.push({ id: studentDoc.id, data });
    courseBucket.set(nameKey, pool);
    existingStudentsByCourse.set(data.courseId, courseBucket);
  });

  const operations = [];
  const summary = {
    schools: 0,
    courses: 0,
    students: 0,
  };

  for (const schoolSeed of schoolSeeds) {
    const schoolKey = normalizeText(schoolSeed.name);
    const existingSchool = existingSchoolsByKey.get(schoolKey);
    const schoolId = existingSchool?.id || schoolFallbackId(schoolSeed.name);

    operations.push({
      ref: doc(db, "schools", schoolId),
      data: {
        name: schoolSeed.name,
        createdAt: pickCreatedAt(existingSchool?.data),
      },
    });
    summary.schools += 1;

    for (const courseSeed of schoolSeed.courses) {
      const courseKey = `${schoolId}::${normalizeText(courseSeed.name)}`;
      const existingCourse = existingCoursesByKey.get(courseKey);
      const courseId = existingCourse?.id || courseFallbackId(schoolSeed.name, courseSeed.name);

      operations.push({
        ref: doc(db, "courses", courseId),
        data: {
          name: courseSeed.name,
          schoolId,
          shift: courseSeed.shift || "",
          createdAt: pickCreatedAt(existingCourse?.data),
        },
      });
      summary.courses += 1;

      const existingPools = existingStudentsByCourse.get(courseId) || new Map();
      const reuseCounters = new Map();
      const generatedCounters = new Map();

      courseSeed.students.forEach((studentName) => {
        const studentKey = normalizeText(studentName);
        const pool = existingPools.get(studentKey) || [];
        const nextReuseIndex = reuseCounters.get(studentKey) || 0;
        const matchedStudent = pool[nextReuseIndex];
        reuseCounters.set(studentKey, nextReuseIndex + 1);

        const nextGeneratedIndex = (generatedCounters.get(studentKey) || 0) + 1;
        generatedCounters.set(studentKey, nextGeneratedIndex);

        const studentId =
          matchedStudent?.id ||
          studentFallbackId(courseId, studentName, nextGeneratedIndex);

        operations.push({
          ref: doc(db, "students", studentId),
          data: {
            fullName: studentName,
            courseId,
            isActive: true,
            createdAt: pickCreatedAt(matchedStudent?.data),
          },
        });
        summary.students += 1;
      });
    }
  }

  let batchNumber = 0;
  for (const batchOperations of chunk(operations, 400)) {
    batchNumber += 1;
    const batch = writeBatch(db);
    batchOperations.forEach((operation) => {
      batch.set(operation.ref, operation.data, { merge: true });
    });
    await batch.commit();
    console.log(`Batch ${batchNumber} aplicado con ${batchOperations.length} operaciones.`);
  }

  console.log("Seed completado.");
  console.log(`Escuelas procesadas: ${summary.schools}`);
  console.log(`Cursos procesados: ${summary.courses}`);
  console.log(`Estudiantes procesados: ${summary.students}`);
} finally {
  await terminate(db);
  await deleteApp(app);
}
