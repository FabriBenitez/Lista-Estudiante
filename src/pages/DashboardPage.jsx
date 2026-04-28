import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import AppShell from "../components/AppShell";
import { getLastCourseId, saveLastCourseId } from "../lib/localStorage";
import { getAttendanceByDate, getAttendanceByDateRange, getAttendanceStats } from "../services/attendance.service";
import { getCourses } from "../services/courses.service";
import { buildCourseMeta } from "../utils/display";
import {
  formatDashboardDate,
  getMonthStartDateString,
  getTodayDateString,
} from "../utils/date";

const quickAccessItems = [
  { icon: "person_add", label: "Nuevo" },
  { icon: "summarize", label: "Reporte" },
  { icon: "mail", label: "Padres" },
  { icon: "star", label: "Notas" },
  { icon: "event", label: "Eventos" },
];

export default function DashboardPage() {
  const navigate = useNavigate();
  const today = getTodayDateString();
  const monthStart = getMonthStartDateString(today);

  const [courses, setCourses] = useState([]);
  const [todayAttendance, setTodayAttendance] = useState([]);
  const [monthAttendance, setMonthAttendance] = useState([]);
  const [lastCourseId, setLastCourseId] = useState(getLastCourseId());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let ignore = false;

    async function loadDashboard() {
      setLoading(true);
      setError("");

      try {
        const [courseList, todayList, monthList] = await Promise.all([
          getCourses(),
          getAttendanceByDate(today),
          getAttendanceByDateRange(monthStart, today),
        ]);

        if (!ignore) {
          setCourses(courseList);
          setTodayAttendance(todayList);
          setMonthAttendance(monthList);
        }
      } catch (loadError) {
        if (!ignore) {
          setError("No pudimos cargar el dashboard.");
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    loadDashboard();
    return () => {
      ignore = true;
    };
  }, [monthStart, today]);

  const todayMap = useMemo(() => {
    return new Map(todayAttendance.map((record) => [record.courseId, record]));
  }, [todayAttendance]);

  const dashboardMetrics = useMemo(() => {
    const monthTotals = monthAttendance.reduce(
      (accumulator, record) => {
        const stats = getAttendanceStats(record.students);
        return {
          present: accumulator.present + stats.presentCount,
          total: accumulator.total + stats.presentCount + stats.absentCount,
        };
      },
      { present: 0, total: 0 },
    );

    const alertCount = todayAttendance.reduce((total, record) => {
      return total + getAttendanceStats(record.students).absentCount;
    }, 0);

    const completionRatio = courses.length
      ? todayAttendance.length / courses.length
      : 0;

    return {
      monthRatio: monthTotals.total
        ? Math.round((monthTotals.present / monthTotals.total) * 100)
        : 0,
      alertCount,
      classesToday: courses.length,
      pendingCount: Math.max(courses.length - todayAttendance.length, 0),
      completionRatio,
    };
  }, [courses.length, monthAttendance, todayAttendance]);

  const quickCourse = useMemo(() => {
    if (!courses.length) {
      return null;
    }

    const lastCourse = courses.find((course) => course.id === lastCourseId);
    if (lastCourse) {
      return lastCourse;
    }

    return courses.find((course) => !todayMap.has(course.id)) || courses[0];
  }, [courses, lastCourseId, todayMap]);

  const focusedCourseId = useMemo(() => {
    if (!courses.length) {
      return null;
    }

    const pendingCourse = courses.find((course) => !todayMap.has(course.id));
    if (!pendingCourse) {
      return quickCourse?.id || null;
    }

    if (lastCourseId && !todayMap.has(lastCourseId)) {
      return lastCourseId;
    }

    return pendingCourse.id;
  }, [courses, lastCourseId, quickCourse, todayMap]);

  function openCourse(courseId) {
    saveLastCourseId(courseId);
    setLastCourseId(courseId);
    navigate(`/courses/${courseId}`);
  }

  function statusFor(course, index) {
    if (todayMap.has(course.id)) {
      return "completed";
    }

    if (course.id === focusedCourseId) {
      return "active";
    }

    const pendingIndex = courses.findIndex((item) => item.id === focusedCourseId);
    return index > pendingIndex ? "next" : "pending";
  }

  return (
    <AppShell>
      <div className="reference-page reference-page--dashboard">
        <header className="reference-topbar">
          <div className="reference-topbar__brand">
            <button className="reference-icon-button" type="button">
              <span className="material-symbols-outlined">menu</span>
            </button>
            <h1>Attendance</h1>
          </div>
          <div className="teacher-avatar teacher-avatar--photo">
            <img
              alt="Docente"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuDiWhbon0ftXR3qOnwZAq_V1AhOv1TYo6YKrQAtnpnq_DGFbkB2-v7Ijl5DoE4SMfGBeW2GMf6PLl6h88uFMZhVFUdd1peuFUM2eSdIlx0eM1ed3Z0Wghs1ZaJNaK_6KOk-fmO-vbMOALkGVaF9TsOv-IK3Zmw85Ab72_dwXcRvKr02V98vQncIeUsNFcWGIPWMHA5KkW0shNlmv8ogLdJOF73eo5xXWOy6Fdvim2urB4vJK2eZy_VBAqWB06ztvKpFTX2h_3VmG5g"
            />
          </div>
        </header>

        <main className="reference-main reference-main--dashboard">
          <section className="dashboard-greeting">
            <p>{formatDashboardDate(today)}</p>
            <h2>Hola, Profe</h2>
          </section>

          {quickCourse ? (
            <section className="dashboard-hero">
              <div className="dashboard-hero__badge">
                <span className="material-symbols-outlined">history</span>
                Ultima clase
              </div>
              <h3>Tomar asistencia - {quickCourse.name}</h3>
              <p>{buildCourseMeta(quickCourse)} - {quickCourse.studentCount} alumnos</p>
              <button className="dashboard-hero__button" onClick={() => openCourse(quickCourse.id)} type="button">
                REANUDAR
                <span className="material-symbols-outlined">arrow_forward</span>
              </button>
              <div className="dashboard-hero__shape" />
            </section>
          ) : null}

          <section className="dashboard-metrics">
            <article className="dashboard-metric">
              <strong className="is-green">{dashboardMetrics.monthRatio}%</strong>
              <span>ASISTENCIA MES</span>
            </article>
            <article className="dashboard-metric">
              <strong className="is-red">{dashboardMetrics.alertCount}</strong>
              <span>ALERTAS</span>
            </article>
            <article className="dashboard-metric">
              <strong className="is-blue">{`${dashboardMetrics.classesToday}`.padStart(2, "0")}</strong>
              <span>CLASES HOY</span>
            </article>
            <article className="dashboard-metric">
              <strong>{`${dashboardMetrics.pendingCount}`.padStart(2, "0")}</strong>
              <span>PENDIENTES</span>
            </article>
          </section>

          <section className="dashboard-section">
            <div className="dashboard-section__header">
              <h3>Clases de Hoy</h3>
              <button className="dashboard-inline-link" type="button">
                Ver horario
                <span className="material-symbols-outlined">calendar_month</span>
              </button>
            </div>

            <div className="dashboard-progress">
              <span
                style={{
                  width: `${Math.max(10, Math.round(dashboardMetrics.completionRatio * 100))}%`,
                }}
              />
            </div>

            <div className="dashboard-course-list">
              {loading ? <p className="state-copy">Cargando cursos...</p> : null}
              {error ? <p className="state-copy state-copy--error">{error}</p> : null}
              {!loading && !error && !courses.length ? (
                <p className="state-copy">No hay cursos cargados todavia.</p>
              ) : null}

              {courses.map((course, index) => {
                const status = statusFor(course, index);
                const statusConfig = {
                  completed: {
                    icon: "check_circle",
                    label: "COMPLETADO",
                    sublabel: buildCourseMeta(course),
                    action: "more_vert",
                    actionType: "icon",
                  },
                  active: {
                    icon: "play_arrow",
                    label: "EN PROGRESO",
                    sublabel: buildCourseMeta(course),
                    action: "TOMAR",
                    actionType: "button",
                  },
                  next: {
                    icon: "schedule",
                    label: "SIGUIENTE",
                    sublabel: buildCourseMeta(course),
                    action: "chevron_right",
                    actionType: "icon",
                  },
                  pending: {
                    icon: "schedule",
                    label: "PENDIENTE",
                    sublabel: buildCourseMeta(course),
                    action: "chevron_right",
                    actionType: "icon",
                  },
                }[status];

                return (
                  <button
                    key={course.id}
                    className={`dashboard-course-card dashboard-course-card--${status}`}
                    onClick={() => openCourse(course.id)}
                    type="button"
                  >
                    <div className={`dashboard-course-card__icon dashboard-course-card__icon--${status}`}>
                      <span className="material-symbols-outlined">{statusConfig.icon}</span>
                    </div>
                    <div className="dashboard-course-card__body">
                      <h4>{course.name}</h4>
                      <div className="dashboard-course-card__meta">
                        <span>{statusConfig.sublabel}</span>
                        <span className={`dashboard-course-card__status dashboard-course-card__status--${status}`}>
                          {statusConfig.label}
                        </span>
                      </div>
                    </div>
                    {statusConfig.actionType === "button" ? (
                      <span className="dashboard-course-card__cta">{statusConfig.action}</span>
                    ) : (
                      <span className="material-symbols-outlined dashboard-course-card__arrow">
                        {statusConfig.action}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </section>

          <section className="dashboard-section dashboard-section--quick">
            <h3>Acceso Rapido</h3>
            <div className="dashboard-quick-grid">
              {quickAccessItems.map((item) => (
                <button className="dashboard-quick-item" key={item.label} type="button">
                  <div className="dashboard-quick-item__icon">
                    <span className="material-symbols-outlined">{item.icon}</span>
                  </div>
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          </section>
        </main>

        <nav className="reference-bottomnav reference-bottomnav--dashboard">
          <button className="reference-bottomnav__item is-active" type="button">
            <span className="material-symbols-outlined">dashboard</span>
            <span>DASHBOARD</span>
          </button>
          <button className="reference-bottomnav__item" type="button">
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
