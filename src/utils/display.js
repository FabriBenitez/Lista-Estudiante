export function formatShiftLabel(shift) {
  if (!shift) {
    return "";
  }

  const normalized = shift.toString().trim().toLowerCase();

  if (normalized.includes("man")) {
    return "Turno manana";
  }

  if (normalized.includes("tar")) {
    return "Turno tarde";
  }

  if (normalized.includes("noc")) {
    return "Turno noche";
  }

  return shift;
}

export function buildCourseMeta(course) {
  const parts = [course.schoolName, formatShiftLabel(course.shift)].filter(Boolean);
  return parts.join(" - ");
}

export function buildCourseTitle(course) {
  return course.name || "Curso";
}

export function splitStudentName(fullName) {
  if (!fullName) {
    return ["ESTUDIANTE", ""];
  }

  if (fullName.includes(",")) {
    const [lastName, firstName] = fullName.split(",");
    return [lastName.trim().toUpperCase(), firstName.trim()];
  }

  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) {
    return [parts[0].toUpperCase(), ""];
  }

  const lastName = parts[parts.length - 1].toUpperCase();
  const firstName = parts.slice(0, -1).join(" ");
  return [lastName, firstName];
}

export function buildStudentBadge(student, index) {
  if (student.legacyId) {
    return `ID: ${student.legacyId}`;
  }

  return `ID: ${(index + 1).toString().padStart(2, "0")} · ${student.id.slice(0, 4).toUpperCase()}`;
}
