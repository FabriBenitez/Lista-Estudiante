import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import AppShell from "../components/AppShell";
import { getAttendanceByCourseAndDate, getAttendanceStats } from "../services/attendance.service";
import { getCourseById } from "../services/courses.service";
import { getStudentsByCourse } from "../services/students.service";
import { formatSavedBannerTime } from "../utils/date";

export default function SaveConfirmationPage() {
  const navigate = useNavigate();
  const { courseId, date } = useParams();

  const [course, setCourse] = useState(null);
  const [students, setStudents] = useState([]);
  const [record, setRecord] = useState(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let ignore = false;

    async function loadRecord() {
      try {
        const [courseData, studentList, attendanceData] = await Promise.all([
          getCourseById(courseId),
          getStudentsByCourse(courseId),
          getAttendanceByCourseAndDate(courseId, date),
        ]);

        if (!ignore) {
          setCourse(courseData);
          setStudents(studentList);
          setRecord(attendanceData);
        }
      } catch (loadError) {
        if (!ignore) {
          setError("No pudimos cargar la confirmacion.");
        }
      }
    }

    loadRecord();
    return () => {
      ignore = true;
    };
  }, [courseId, date]);

  const summary = useMemo(() => {
    if (!record) {
      return {
        absentNames: [],
        presentCount: 0,
        absentCount: 0,
        ratio: 0,
      };
    }

    const absentNames = students
      .filter((studentItem) => record.students?.[studentItem.id] === "absent")
      .map((studentItem) => studentItem.fullName);
    const stats = getAttendanceStats(record.students);
    const ratio = students.length
      ? Math.round((stats.presentCount / students.length) * 100)
      : 0;

    return {
      absentNames,
      presentCount: stats.presentCount,
      absentCount: stats.absentCount,
      ratio,
    };
  }, [record, students]);

  async function handleCopy() {
    if (!summary.absentNames.length) {
      return;
    }

    try {
      await navigator.clipboard.writeText(summary.absentNames.join("\n"));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch (copyError) {
      setError("No pudimos copiar la lista.");
    }
  }

  return (
    <AppShell>
      <div className="reference-page reference-page--confirmation">
        <main className="reference-main reference-main--confirmation">
          <section className="confirmation-hero">
            <div className="confirmation-hero__icon">
              <span className="material-symbols-outlined">check_circle</span>
            </div>
            <h1>!Asistencia Guardada!</h1>
            <div className="confirmation-hero__time">
              <span className="material-symbols-outlined">schedule</span>
              <span>
                {record
                  ? formatSavedBannerTime(record.updatedAt || record.createdAt, date)
                  : "GUARDADO"}
              </span>
            </div>
          </section>

          <section className="confirmation-card">
            <div className="confirmation-card__header">
              <div className="confirmation-card__title">
                <span className="material-symbols-outlined">person_off</span>
                <h2>Estudiantes Ausentes</h2>
              </div>
              <span className="confirmation-card__count">{summary.absentCount}</span>
            </div>

            <div className="confirmation-card__list">
              {summary.absentNames.length ? (
                <ul>
                  {summary.absentNames.map((fullName) => (
                    <li key={fullName}>{fullName}</li>
                  ))}
                </ul>
              ) : (
                <p>No hubo ausentes en {course?.name || "este curso"}.</p>
              )}
            </div>
          </section>

          <section className="confirmation-metrics">
            <article>
              <strong className="is-green">{summary.presentCount}</strong>
              <span>PRESENTES</span>
            </article>
            <article>
              <strong className="is-blue">{summary.ratio}%</strong>
              <span>RATIO</span>
            </article>
          </section>

          {error ? <p className="state-copy state-copy--error">{error}</p> : null}

          <div className="confirmation-actions">
            <button className="confirmation-actions__primary" onClick={handleCopy} type="button">
              <span className="material-symbols-outlined">content_copy</span>
              {copied ? "Lista copiada" : "Copiar Lista de Ausentes"}
            </button>
            <button
              className="confirmation-actions__secondary"
              onClick={() => navigate("/")}
              type="button"
            >
              <span className="material-symbols-outlined">dashboard</span>
              Volver al Dashboard
            </button>
          </div>

          <div className="confirmation-finish">
            <span />
            <p>REGISTRO FINALIZADO</p>
            <span />
          </div>
        </main>

        <nav className="reference-bottomnav reference-bottomnav--dashboard">
          <button className="reference-bottomnav__item" onClick={() => navigate("/")} type="button">
            <span className="material-symbols-outlined">dashboard</span>
            <span>DASHBOARD</span>
          </button>
          <button
            className="reference-bottomnav__item is-active"
            onClick={() => navigate(`/courses/${courseId}`)}
            type="button"
          >
            <span className="material-symbols-outlined">school</span>
            <span>CLASSES</span>
          </button>
          <button className="reference-bottomnav__item" type="button">
            <span className="material-symbols-outlined">analytics</span>
            <span>REPORTS</span>
          </button>
          <button className="reference-bottomnav__item" type="button">
            <span className="material-symbols-outlined">settings</span>
            <span>SETTINGS</span>
          </button>
        </nav>
      </div>
    </AppShell>
  );
}
