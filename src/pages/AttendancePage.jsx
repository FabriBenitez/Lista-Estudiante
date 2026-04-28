import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import AppShell from "../components/AppShell";
import {
  clearAttendanceDraft,
  getAttendanceDraft,
  saveAttendanceDraft,
  saveLastCourseId,
} from "../lib/localStorage";
import {
  createAttendance,
  getAttendanceByCourseAndDate,
  getAttendanceStats,
  updateAttendance,
} from "../services/attendance.service";
import { getCourseById } from "../services/courses.service";
import { getStudentsByCourse } from "../services/students.service";
import {
  buildStudentStatusMap,
  getAbsentIdsFromMap,
  sameAbsentIds,
} from "../utils/attendance";
import { buildCourseTitle, buildStudentBadge, splitStudentName } from "../utils/display";
import { getTodayDateString, toMillis } from "../utils/date";

const studentPhotos = [
  "https://lh3.googleusercontent.com/aida-public/AB6AXuCypz4vKgXvZwmIZ7B6wqcnHwNkOVTFHJFMm5hiH9FXKq61lnOQOnw9-rMR1a5yz-FQbbXd8zaIQtFECdrgwKWXX9WIQIoF4R1ZZN3HyPMO_76GNCwcPKvBAPS6NJ8yFBeamOdSk2gbfb0tCuwk0idcXx68-xNAloQmCBbubdvcXomaTuixQZUmjKeBI4fYFpSkdRp1i01nAqJwqCvNAYnPRMVy_WxoBgMkcjzOU4uNDAESyhCo-R7vR0pqYouZXU9wyo78pLyNn0k",
  "https://lh3.googleusercontent.com/aida-public/AB6AXuBgvmG2yHIWDIpAIOFYWZengZakiJ67Td-CQNtVtLUH301E7cVbhHmIX6MUCFGIaNZgC87gzlgBZxuZ7SPFPFlTVF42ibes5HgXVTpWEpGVhZikjXbLZO-dcvFfDXPO3rmuiWCKKhuo9m1OZcORx2vOOKtEwBp1nUH-q4fVQ124wTmlnxO8-8yUh5L5uCu_55KiLVBp7rhvm9B5M1yu8jRgmOMk4_lhneGxW1OtKr3W8Oo4dJ3UB5WeXStMlJ4_lCo2Mt6mTBazVwI",
  "https://lh3.googleusercontent.com/aida-public/AB6AXuCVwOrFKHEZwSuqrrjO-tn9AYm9o3RY86LPSvqDjsnA_erxtwwY-dOf9oDOBw8Xk3th3MLQyJ7AFMXoSMphZ3pxPBvh_CDvEeC42kWKZdqLRFNSjcUFySQFDRyg1tUqBl98zZNntn30EiVhk6C3avzmHFxXK3NL1lBDgS7jMVA100gGmUFn3yQY0QmvGI6TMuL3NUUW3wovgOqWvVk_XmDkxt_dKJnHyOOpvJilAzTSR79mJVtZkKGAivoAjICDQpqwC7YUTNYhSm4",
  "https://lh3.googleusercontent.com/aida-public/AB6AXuDpH39Kb2Wxh52CP4WlRerzvlURalPRJu0QTUs3LMTzsJKK0bprDGXdFsg-UnSsIxfgA39BukVy7p0rt8JskHlqvmJhPSsHeBxzVtkSOCJR5ara7ZRqUPR1Zrx7Ik6IQ-2Df_9-YiD9P1y_kIvmMcqCpG1uRpLUBGi43T4aE6krSEkTYQ4b9rMqTYn1_3aEl_rYUz2TQLqsArhwyqekMf9i2XUDSHpVXTfkU72ozBG0sGlHgt5haJWjeTcnSzZ7YO0lP1p0Z6wZtgE",
  "https://lh3.googleusercontent.com/aida-public/AB6AXuBv8Dcwk_4JgUq2WXZ2XJ0uoBsQ5y9-Y9pKE3XlIYZiyi2-VpcOHWduMfUxRuf21ZtrNZdJjKHFTMT1Q-zfs5qPDZ8wh0C-Q189z0H5Os3eznY33HEVw_rgtNpa91NtiLPl-biJUuDumnREi5X0Am3Hj-QoCQQHsEE2BLs2MuZTgh5cnl9jkbZwDvkOjgl-ugODP4l2DVQIcNSEZ-IpdQIco_6kzAPzzh0JR5BVxHX027qLxeKUxbEt4WdKLtkK4en-iWDSP07XDI0",
];

export default function AttendancePage() {
  const navigate = useNavigate();
  const { courseId, date } = useParams();

  const selectedDate = date || getTodayDateString();
  const [course, setCourse] = useState(null);
  const [students, setStudents] = useState([]);
  const [attendanceRecord, setAttendanceRecord] = useState(null);
  const [absentIds, setAbsentIds] = useState([]);
  const [initialAbsentIds, setInitialAbsentIds] = useState([]);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let ignore = false;

    async function loadAttendance() {
      setLoading(true);
      setError("");

      try {
        const [courseData, studentList, record] = await Promise.all([
          getCourseById(courseId),
          getStudentsByCourse(courseId),
          getAttendanceByCourseAndDate(courseId, selectedDate),
        ]);

        if (ignore) {
          return;
        }

        saveLastCourseId(courseId);

        const orderedIds = studentList.map((studentItem) => studentItem.id);
        const remoteAbsentIds = record
          ? getAbsentIdsFromMap(record.students, orderedIds)
          : [];
        const draft = getAttendanceDraft(courseId, selectedDate);
        const draftIsNewer =
          draft &&
          toMillis(draft.updatedAt) > toMillis(record?.updatedAt || record?.createdAt);
        const nextAbsentIds = draftIsNewer ? draft.absentIds : remoteAbsentIds;

        setCourse(courseData);
        setStudents(studentList);
        setAttendanceRecord(record);
        setInitialAbsentIds(remoteAbsentIds);
        setAbsentIds(nextAbsentIds);
      } catch (loadError) {
        if (!ignore) {
          setError("No pudimos cargar la asistencia.");
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    loadAttendance();
    return () => {
      ignore = true;
    };
  }, [courseId, selectedDate]);

  const stats = useMemo(() => {
    const studentsMap = buildStudentStatusMap(
      students.map((studentItem) => studentItem.id),
      absentIds,
    );
    return getAttendanceStats(studentsMap);
  }, [absentIds, students]);

  const hasChanges = !sameAbsentIds(absentIds, initialAbsentIds);
  const canSave = !attendanceRecord || hasChanges;
  const attendanceRate = students.length
    ? Math.round((stats.presentCount / students.length) * 100)
    : 0;

  function toggleStudent(studentId) {
    setAbsentIds((currentIds) => {
      const nextIds = currentIds.includes(studentId)
        ? currentIds.filter((id) => id !== studentId)
        : [...currentIds, studentId];

      saveAttendanceDraft(courseId, selectedDate, nextIds);
      return nextIds;
    });
  }

  async function handleSave() {
    if (!course || !students.length || !canSave) {
      return;
    }

    setIsSaving(true);
    setError("");

    const payload = {
      courseId,
      date: selectedDate,
      students: buildStudentStatusMap(
        students.map((studentItem) => studentItem.id),
        absentIds,
      ),
    };

    try {
      let savedRecord = null;

      if (attendanceRecord) {
        savedRecord = await updateAttendance(payload);
      } else {
        try {
          savedRecord = await createAttendance(payload);
        } catch (saveError) {
          if (saveError.code === "attendance/already-exists") {
            savedRecord = await updateAttendance(payload);
          } else {
            throw saveError;
          }
        }
      }

      clearAttendanceDraft(courseId, selectedDate);
      setAttendanceRecord(savedRecord);
      setInitialAbsentIds(absentIds);
      navigate(`/courses/${courseId}/confirmation/${selectedDate}`);
    } catch (saveError) {
      setError("No pudimos guardar la asistencia.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <AppShell>
      <div className="reference-page reference-page--attendance">
        <header className="kinetic-topbar">
          <div className="kinetic-topbar__brand">
            <div className="teacher-avatar teacher-avatar--square">
              <img
                alt="Perfil"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuDcZul4uC1P59n2quCSQmanhnzgLXFy2Ru2sp0cdt_ZfqsOaREcWTitFx4Q3aYVSC6MAkkP6ZKnosuLBdnu1fjAslC4diW7bkvFcmk9CSvfRVH4IlwLbUvW24sH7K5JmznQk4JbrLYUcvNX1OhRGEOZZShRD9RPZ_bpR1iKFT1E9N8A4l5gJZsPVg3XkwyWu8Ls1I_2MZJscY2qIO_zXFyKZbbdkXM3H7v9jrJHw08NT_HIpew_y5Z1YDVwxqZsXNm42QAWSxjdC6c"
              />
            </div>
            <h1>Kinetic Ledger</h1>
          </div>
          <button className="reference-icon-button reference-icon-button--muted" type="button">
            <span className="material-symbols-outlined">search</span>
          </button>
        </header>

        <main className="reference-main reference-main--attendance">
          <section className="attendance-heading">
            <div>
              <h2>{course ? buildCourseTitle(course) : "Cargando"}</h2>
              <p>{students.length} Alumnos</p>
            </div>
            <div className="attendance-heading__progress">
              <span>PROGRESO</span>
              <div className="attendance-heading__bar">
                <div style={{ width: `${attendanceRate}%` }} />
              </div>
            </div>
          </section>

          {loading ? <p className="state-copy">Cargando asistencia...</p> : null}
          {error ? <p className="state-copy state-copy--error">{error}</p> : null}

          <section className="attendance-list">
            {students.map((studentItem, index) => {
              const [lineOne, lineTwo] = splitStudentName(studentItem.fullName);
              const isAbsent = absentIds.includes(studentItem.id);

              return (
                <button
                  key={studentItem.id}
                  className={`attendance-student-card ${isAbsent ? "is-absent" : "is-present"}`}
                  onClick={() => toggleStudent(studentItem.id)}
                  type="button"
                >
                  <div className="attendance-student-card__avatar">
                    <img alt={studentItem.fullName} src={studentPhotos[index % studentPhotos.length]} />
                  </div>
                  <div className="attendance-student-card__body">
                    <h3>
                      <span>{lineOne}</span>
                      {lineTwo ? <span>{lineTwo}</span> : null}
                    </h3>
                    <p>{buildStudentBadge(studentItem, index)}</p>
                  </div>
                  <div className="attendance-student-card__status">
                    <strong>{isAbsent ? "AUSENTE" : "PRESENTE"}</strong>
                    <span className="attendance-student-card__toggle">
                      <span className="material-symbols-outlined">
                        {isAbsent ? "close" : "check"}
                      </span>
                    </span>
                  </div>
                </button>
              );
            })}
          </section>

          <section className="attendance-notes">
            <div className="attendance-notes__title">
              <span className="material-symbols-outlined">sticky_note_2</span>
              <h4>NOTAS DE LA SESION</h4>
            </div>
            <textarea
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Anadir observaciones sobre el grupo..."
              value={notes}
            />
          </section>
        </main>

        <div className="attendance-bottom-sheet">
          <button
            className="attendance-save-button"
            disabled={isSaving || !canSave || loading}
            onClick={handleSave}
            type="button"
          >
            {isSaving ? "GUARDANDO..." : "FINALIZAR Y GUARDAR"}
            <span className="material-symbols-outlined">send</span>
          </button>

          <nav className="reference-bottomnav reference-bottomnav--minimal">
            <button className="reference-bottomnav__item is-active" onClick={() => navigate("/")} type="button">
              <span className="material-symbols-outlined">dashboard</span>
              <span>DASHBOARD</span>
            </button>
            <button
              className="reference-bottomnav__item"
              onClick={() => navigate(`/courses/${courseId}/history`)}
              type="button"
            >
              <span className="material-symbols-outlined">history</span>
              <span>HISTORY</span>
            </button>
            <button className="reference-bottomnav__item" type="button">
              <span className="material-symbols-outlined">person</span>
              <span>PROFILE</span>
            </button>
          </nav>
        </div>
      </div>
    </AppShell>
  );
}
