import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import AppShell from "../components/AppShell";
import { getAttendanceHistory, getAttendanceStats } from "../services/attendance.service";
import { getCourseById } from "../services/courses.service";
import { getDayNumber, getMonthShortUpper, formatHistoryTitle } from "../utils/date";

export default function HistoryPage() {
  const navigate = useNavigate();
  const { courseId } = useParams();

  const [course, setCourse] = useState(null);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    let ignore = false;

    async function loadHistory() {
      setLoading(true);
      setError("");

      try {
        const [courseData, historyData] = await Promise.all([
          getCourseById(courseId),
          getAttendanceHistory(courseId),
        ]);

        if (!ignore) {
          setCourse(courseData);
          setRecords(historyData);
        }
      } catch (loadError) {
        if (!ignore) {
          setError("No pudimos cargar el historial.");
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    loadHistory();
    return () => {
      ignore = true;
    };
  }, [courseId]);

  const visibleRecords = useMemo(() => {
    if (filter === "flagged") {
      return records.filter((record) => getAttendanceStats(record.students).absentCount > 0);
    }

    return records;
  }, [filter, records]);

  return (
    <AppShell>
      <div className="reference-page reference-page--history">
        <header className="kinetic-topbar">
          <div className="kinetic-topbar__brand">
            <div className="teacher-avatar teacher-avatar--square">
              <img
                alt="Perfil"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuDiArFCzHy2TS2LFzTzRdMEtffPzOpJVYzRmXM25HO9RhDIj76FKB9rW0wu0FSWEv6Oz5RhOyzLU5gPdox1JRkdviOgNkr_GAR-G9l9uqLI8KsEwfbJKX94OeSFRL8q6tBWxIopH7ZAAu7MW7Ldf6RNswl9zx03quSkiw6W3tx1sb2gw1Ek6DRfbmXzIunKlGy4FZ6gDoEcOTIA50kKcUDvlfCupsbC7wo7neIbDLvhxJ2pep0HaQFf5dwmPR48korBHYzoHNtvncE"
              />
            </div>
            <h1>Kinetic Ledger</h1>
          </div>
          <button className="reference-icon-button reference-icon-button--muted" type="button">
            <span className="material-symbols-outlined">search</span>
          </button>
        </header>

        <main className="reference-main reference-main--history">
          <section className="history-heading">
            <span>AUDITORIA</span>
            <h2>Historial - {course?.name || "Curso"}</h2>
            <div className="history-heading__subtitle">
              <div />
              <p>Registro cronologico de asistencia</p>
            </div>
          </section>

          <div className="history-filters">
            <button
              className={filter === "all" ? "is-active" : ""}
              onClick={() => setFilter("all")}
              type="button"
            >
              Todos
            </button>
            <button
              className={filter === "flagged" ? "is-active" : ""}
              onClick={() => setFilter("flagged")}
              type="button"
            >
              Marcados
            </button>
          </div>

          <section className="history-list">
            {loading ? <p className="state-copy">Cargando historial...</p> : null}
            {error ? <p className="state-copy state-copy--error">{error}</p> : null}
            {!loading && !error && !visibleRecords.length ? (
              <p className="state-copy">Todavia no hay registros para mostrar.</p>
            ) : null}

            {visibleRecords.map((record) => {
              const stats = getAttendanceStats(record.students);
              const isFlagged = stats.absentCount > 0;

              return (
                <button
                  key={record.id}
                  className={`history-record-card ${isFlagged ? "is-flagged" : ""}`}
                  onClick={() => navigate(`/courses/${courseId}/history/${record.date}`)}
                  type="button"
                >
                  <div className="history-record-card__datebox">
                    <span>{getMonthShortUpper(record.date)}</span>
                    <strong>{getDayNumber(record.date)}</strong>
                  </div>

                  <div className="history-record-card__body">
                    <div className="history-record-card__headline">
                      <h3>{formatHistoryTitle(record.date)}</h3>
                      {isFlagged ? <span className="history-record-card__badge">MARCADO</span> : null}
                    </div>
                    <div className="history-record-card__stats">
                      <span className="is-green">{stats.presentCount} Presentes</span>
                      <span className={isFlagged ? "is-red" : "is-muted"}>
                        {stats.absentCount} {stats.absentCount === 1 ? "Ausente" : "Ausentes"}
                      </span>
                    </div>
                  </div>

                  <span className="material-symbols-outlined history-record-card__arrow">
                    chevron_right
                  </span>
                </button>
              );
            })}
          </section>
        </main>

        <nav className="reference-bottomnav reference-bottomnav--history">
          <button className="reference-bottomnav__item" onClick={() => navigate("/")} type="button">
            <span className="material-symbols-outlined">dashboard</span>
            <span>DASHBOARD</span>
          </button>
          <button className="reference-bottomnav__item is-active" type="button">
            <span className="material-symbols-outlined">history</span>
            <span>HISTORY</span>
          </button>
          <button className="reference-bottomnav__item" type="button">
            <span className="material-symbols-outlined">person</span>
            <span>PROFILE</span>
          </button>
        </nav>
      </div>
    </AppShell>
  );
}
