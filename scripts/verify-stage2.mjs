import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { storageKeys, storageVersion } from "../data/config.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const failures = [];
const checks = [];
const check = (condition, message) => {
  checks.push({ condition: Boolean(condition), message });
  if (!condition) failures.push(message);
};

class MemoryStorage {
  constructor() { this.values = new Map(); }
  getItem(key) { return this.values.has(key) ? this.values.get(key) : null; }
  setItem(key, value) { this.values.set(key, String(value)); }
  removeItem(key) { this.values.delete(key); }
  clear() { this.values.clear(); }
}

globalThis.localStorage = new MemoryStorage();

const storageModule = await import(`${pathToFileURL(path.join(root, "cabinet/storage.js")).href}?verify=stage2`);
const model = await import(`${pathToFileURL(path.join(root, "cabinet/model.js")).href}?verify=stage2`);
const adaptersModule = await import(`${pathToFileURL(path.join(root, "cabinet/adapters.js")).href}?verify=stage2`);

const {
  cabinetStorageKeys,
  cabinetStorageVersion,
  readVersioned,
  writeVersioned
} = storageModule;
const { cabinetAdapters, studentProfileAdapter } = adaptersModule;

for (const relative of [
  "cabinet/index.html",
  "cabinet/styles.css",
  "cabinet/cabinet.js",
  "cabinet/model.js",
  "cabinet/adapters.js",
  "cabinet/storage.js",
  "dist/client/cabinet/index.html",
  "dist/client/cabinet/styles.css",
  "dist/client/cabinet/cabinet.js",
  "dist/client/cabinet/model.js",
  "dist/client/cabinet/adapters.js",
  "dist/client/cabinet/storage.js"
]) {
  try {
    await access(path.join(root, relative));
    check(true, `${relative} exists`);
  } catch {
    check(false, `${relative} is missing`);
  }
}

const requiredAdapterNames = [
  "studentProfileAdapter",
  "scoreTrajectoryAdapter",
  "knowledgeMapAdapter",
  "weeklyPlanAdapter",
  "errorJournalAdapter",
  "practiceAdapter",
  "mockExamAdapter",
  "assignmentsAdapter",
  "notificationsAdapter",
  "scheduleAdapter",
  "paymentsAdapter",
  "teacherMessagesAdapter"
];
check(requiredAdapterNames.every((name) => name in cabinetAdapters), "all cabinet adapter contracts are exported");

const expectedKeys = [
  "rz_student_profile",
  "rz_cabinet_session",
  "rz_score_history",
  "rz_knowledge_map",
  "rz_weekly_plan",
  "rz_error_journal",
  "rz_practice_sessions",
  "rz_mock_exams",
  "rz_assignments",
  "rz_notifications",
  "rz_schedule_changes",
  "rz_payments",
  "rz_teacher_messages"
];
check(cabinetStorageVersion === 1, "cabinet storage schema is versioned");
check(JSON.stringify(Object.values(cabinetStorageKeys)) === JSON.stringify(expectedKeys), "cabinet storage keys match the Stage 2 contract");

for (const key of expectedKeys) {
  localStorage.clear();
  writeVersioned("rz_neighbor_section", { retained: true });
  localStorage.setItem(key, "{broken-json");
  const fallback = readVersioned(key, { fallback: true });
  check(fallback.fallback === true, `${key}: corrupted payload uses fallback`);
  check(localStorage.getItem(key) === null, `${key}: only corrupted payload is removed`);
  check(readVersioned("rz_neighbor_section", null)?.retained === true, `${key}: neighboring section is retained`);
}

localStorage.clear();
localStorage.setItem(cabinetStorageKeys.notifications, JSON.stringify({ version: 999, data: [{ id: "stale" }] }));
check(Array.isArray(readVersioned(cabinetStorageKeys.notifications, [])), "version mismatch uses a stable fallback");
check(localStorage.getItem(cabinetStorageKeys.notifications) === null, "version mismatch removes only the stale section");

localStorage.clear();
const demoProfile = studentProfileAdapter.enterDemo();
check(demoProfile.examTypeId === "ege" && demoProfile.subjectId === "math", "stable demo profile is EGE mathematics");
check(model.scoreLabel(demoProfile, 61) === "61 балл", "Russian score label handles 61 балл");
check(model.scoreLabel(demoProfile, 63) === "63 балла", "Russian score label handles 63 балла");
check(model.scoreLabel(demoProfile, 85) === "85 баллов", "Russian score label handles 85 баллов");

const demoState = {
  scores: cabinetAdapters.scoreTrajectoryAdapter.load(demoProfile),
  knowledge: cabinetAdapters.knowledgeMapAdapter.load(demoProfile),
  plan: cabinetAdapters.weeklyPlanAdapter.load(demoProfile),
  errors: cabinetAdapters.errorJournalAdapter.load(demoProfile),
  mocks: cabinetAdapters.mockExamAdapter.load(demoProfile),
  assignments: cabinetAdapters.assignmentsAdapter.load(demoProfile),
  notifications: cabinetAdapters.notificationsAdapter.load(demoProfile),
  schedule: cabinetAdapters.scheduleAdapter.load(demoProfile),
  payments: cabinetAdapters.paymentsAdapter.load(demoProfile),
  messages: cabinetAdapters.teacherMessagesAdapter.load(demoProfile)
};
check(demoState.scores.length >= 4, "score trajectory has control points");
check(demoState.knowledge.length >= 5 && demoState.knowledge.every((topic) => topic.subjectId === demoProfile.subjectId), "knowledge map uses only the active subject");
check(demoState.plan.length >= 5, "weekly plan is populated");
check(demoState.mocks.length >= 2, "mock exam history is populated");
check(demoState.assignments.length >= 3, "assignments are populated");
check(demoState.notifications.length >= 5, "notifications are populated");
check(demoState.schedule.items.length >= 3, "schedule contains future lessons");
check(demoState.schedule.items.every((item) => new Date(item.startAt) > new Date()), "schedule contains no past lessons");
check(demoState.payments.tariffId === demoProfile.tariffId, "payments use the selected Stage 1 tariff");
check(demoState.messages.every((message) => message.teacherId === demoProfile.teacherId), "messages use the selected Stage 1 teacher");

const weakTopicId = demoProfile.weakTopics[0].id;
const practiceA = cabinetAdapters.practiceAdapter.questions(demoProfile, weakTopicId);
const practiceB = cabinetAdapters.practiceAdapter.questions(demoProfile, weakTopicId);
check(practiceA.length === 5, "mini-practice contains five questions");
check(JSON.stringify(practiceA.map((item) => item.id)) === JSON.stringify(practiceB.map((item) => item.id)), "mini-practice selection is deterministic");

const wrongAnswers = Object.fromEntries(practiceA.map((question) => [question.id, (question.correctAnswer + 1) % question.answerOptions.length]));
const practiceResult = cabinetAdapters.practiceAdapter.submit(demoProfile, weakTopicId, practiceA, wrongAnswers);
check(practiceResult.correct === 0 && practiceResult.total === 5, "mini-practice returns a stable score");
check(cabinetAdapters.errorJournalAdapter.load(demoProfile).some((entry) => entry.source === "practice"), "practice errors are added to the journal");

const setStageValue = (key, data) => localStorage.setItem(key, JSON.stringify({ version: storageVersion, data }));
setStageValue(storageKeys.trajectoryDraft, {
  profile: {
    examTypeId: "oge",
    classValue: 9,
    subjectId: "informatics",
    currentValue: 3,
    targetValue: 5,
    goalId: "profile-class",
    hours: 4,
    format: "group"
  }
});
setStageValue(storageKeys.trajectoryResult, {
  examTypeId: "oge",
  classValue: 9,
  subjectId: "informatics",
  estimatedValue: 3,
  estimatedRange: "предполагаемая отметка 3",
  targetValue: 5,
  target: "оценка 5",
  gapValue: 2,
  gap: "2 ступени по шкале отметок",
  readiness: "Базовая готовность",
  weakTopics: [{ id: "logic", label: "Логика", ratio: 0.35 }],
  strongTopics: [{ id: "tables", label: "Таблицы", ratio: 0.8 }],
  riskFactors: ["Нужна регулярная практика"],
  recommendedTeacherIds: ["artem-lebedev"],
  recommendedTariffId: "standard",
  disclaimer: "Предварительная оценка"
});
setStageValue(storageKeys.selectedTeacher, "artem-lebedev");
setStageValue(storageKeys.selectedTariff, "standard");

const ogeProfile = studentProfileAdapter.load();
check(ogeProfile.examTypeId === "oge" && ogeProfile.subjectId === "informatics", "new Stage 1 trajectory replaces a stale demo profile");
check(localStorage.getItem(cabinetStorageKeys.scoreHistory) === null, "profile change resets only profile-scoped score history");
check(model.scoreLabel(ogeProfile, 5) === "оценка 5", "OGE labels use the grade scale");
const ogeScores = cabinetAdapters.scoreTrajectoryAdapter.load(ogeProfile);
check(ogeScores.every((point) => point.value >= 2 && point.value <= 5), "OGE score trajectory stays on the 2–5 scale");
check(!ogeScores.some((point) => model.scoreLabel(ogeProfile, point.value).includes("балл")), "OGE trajectory does not expose a 100-point result");

for (const relativeHtml of ["index.html", "trajectory/index.html", "cabinet/index.html", "dist/client/cabinet/index.html"]) {
  const source = await readFile(path.join(root, relativeHtml), "utf8");
  const hrefs = [...source.matchAll(/href="([^"]+)"/g)].map((match) => match[1]);
  check(!hrefs.some((href) => href === "#" || href === ""), `${relativeHtml}: no empty links`);
  check(!/(localhost|127\.0\.0\.1|file:\/\/\/|C:\\Users)/i.test(source), `${relativeHtml}: no local machine URLs`);
  check(!hrefs.some((href) => /^\/(trajectory|cabinet)(\/|$)/.test(href)), `${relativeHtml}: no base-path-breaking route links`);
}

console.log(JSON.stringify({
  passed: checks.filter((item) => item.condition).length,
  failed: failures.length,
  adapterCount: requiredAdapterNames.length,
  storageKeyCount: expectedKeys.length,
  demo: {
    subject: demoProfile.subjectId,
    planTasks: demoState.plan.length,
    knowledgeTopics: demoState.knowledge.length,
    practiceQuestions: practiceA.length
  },
  oge: {
    subject: ogeProfile.subjectId,
    current: ogeProfile.currentLabel,
    target: ogeProfile.targetLabel
  },
  failures
}, null, 2));

if (failures.length) process.exitCode = 1;
