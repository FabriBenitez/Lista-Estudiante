export const STATUS_PRESENT = "present";
export const STATUS_ABSENT = "absent";

export function buildAttendanceId(courseId, date) {
  return `${courseId}_${date}`;
}

export function buildStudentStatusMap(studentIds, absentIds) {
  const absentSet = new Set(absentIds);
  const students = {};

  studentIds.forEach((studentId) => {
    students[studentId] = absentSet.has(studentId) ? STATUS_ABSENT : STATUS_PRESENT;
  });

  return students;
}

export function getAbsentIdsFromMap(studentMap, orderedIds = []) {
  const absentIds = Object.entries(studentMap || {})
    .filter(([, status]) => status === STATUS_ABSENT)
    .map(([studentId]) => studentId);

  if (!orderedIds.length) {
    return absentIds;
  }

  const absentSet = new Set(absentIds);
  return orderedIds.filter((studentId) => absentSet.has(studentId));
}

export function countAttendance(totalStudents, absentIds) {
  return {
    absentCount: absentIds.length,
    presentCount: Math.max(totalStudents - absentIds.length, 0),
  };
}

export function sameAbsentIds(left, right) {
  if (left.length !== right.length) {
    return false;
  }

  const leftSet = new Set(left);
  return right.every((studentId) => leftSet.has(studentId));
}

