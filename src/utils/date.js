export function getTodayDateString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = `${now.getMonth() + 1}`.padStart(2, "0");
  const day = `${now.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function isToday(dateString) {
  return dateString === getTodayDateString();
}

export function getMonthStartDateString(baseDateString = getTodayDateString()) {
  const [year, month] = baseDateString.split("-");
  return `${year}-${month}-01`;
}

export function formatLongDate(dateString) {
  const date = new Date(`${dateString}T00:00:00`);
  return new Intl.DateTimeFormat("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(date);
}

export function formatDashboardDate(dateString) {
  return formatLongDate(dateString).toUpperCase();
}

export function formatHistoryTitle(dateString) {
  const date = new Date(`${dateString}T00:00:00`);
  const formatted = new Intl.DateTimeFormat("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(date);

  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

export function formatShortDate(dateString) {
  const date = new Date(`${dateString}T00:00:00`);
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function formatSavedTime(value, baseDateString) {
  if (!value) {
    return "";
  }

  const date = value instanceof Date ? value : new Date(value);
  const timeLabel = new Intl.DateTimeFormat("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);

  if (baseDateString && isToday(baseDateString)) {
    return `Hoy ${timeLabel}`;
  }

  return `${formatShortDate(baseDateString)} ${timeLabel}`;
}

export function formatSavedBannerTime(value, baseDateString) {
  if (!value) {
    return "";
  }

  const date = value instanceof Date ? value : new Date(value);
  const timeLabel = new Intl.DateTimeFormat("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);

  if (baseDateString && isToday(baseDateString)) {
    return `HOY A LAS ${timeLabel}`;
  }

  return `${formatShortDate(baseDateString).toUpperCase()} ${timeLabel}`;
}

export function getMonthShortUpper(dateString) {
  const date = new Date(`${dateString}T00:00:00`);
  return new Intl.DateTimeFormat("es-AR", { month: "short" })
    .format(date)
    .replace(".", "")
    .toUpperCase();
}

export function getDayNumber(dateString) {
  const date = new Date(`${dateString}T00:00:00`);
  return `${date.getDate()}`.padStart(2, "0");
}

export function toMillis(value) {
  if (!value) {
    return 0;
  }

  if (typeof value === "string") {
    return new Date(value).getTime();
  }

  if (value instanceof Date) {
    return value.getTime();
  }

  if (typeof value.toDate === "function") {
    return value.toDate().getTime();
  }

  return 0;
}
