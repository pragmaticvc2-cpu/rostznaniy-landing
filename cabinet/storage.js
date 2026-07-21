export const cabinetStorageVersion = 1;

export const cabinetStorageKeys = Object.freeze({
  studentProfile: "rz_student_profile",
  cabinetSession: "rz_cabinet_session",
  scoreHistory: "rz_score_history",
  knowledgeMap: "rz_knowledge_map",
  weeklyPlan: "rz_weekly_plan",
  errorJournal: "rz_error_journal",
  practiceSessions: "rz_practice_sessions",
  mockExams: "rz_mock_exams",
  assignments: "rz_assignments",
  notifications: "rz_notifications",
  scheduleChanges: "rz_schedule_changes",
  payments: "rz_payments",
  teacherMessages: "rz_teacher_messages"
});

function fallbackValue(fallback) {
  const value = typeof fallback === "function" ? fallback() : fallback;
  if (value === undefined) return null;
  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return value;
  }
}

export function readVersioned(key, fallback, validator = () => true) {
  const safeFallback = () => fallbackValue(fallback);
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return safeFallback();
    const parsed = JSON.parse(raw);
    if (parsed?.version !== cabinetStorageVersion || !validator(parsed.data)) {
      localStorage.removeItem(key);
      return safeFallback();
    }
    return parsed.data;
  } catch {
    try { localStorage.removeItem(key); } catch { /* Storage can be unavailable. */ }
    return safeFallback();
  }
}

export function writeVersioned(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify({ version: cabinetStorageVersion, data }));
    return true;
  } catch {
    return false;
  }
}

export function removeVersioned(keys) {
  const targetKeys = Array.isArray(keys) ? keys : [keys];
  targetKeys.forEach((key) => {
    try { localStorage.removeItem(key); } catch { /* Storage can be unavailable. */ }
  });
}

export function readExternalVersioned(key, version, fallback = null) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallbackValue(fallback);
    const parsed = JSON.parse(raw);
    if (parsed?.version !== version) return fallbackValue(fallback);
    return parsed.data ?? fallbackValue(fallback);
  } catch {
    return fallbackValue(fallback);
  }
}
