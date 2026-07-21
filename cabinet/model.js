import { examSeason } from "../data/config.js";
import {
  diagnosticQuestions,
  diagnosticTopics,
  scheduleSlots,
  subjects,
  tariffs,
  teachers
} from "../data/product-data.js";

const DAY = 86_400_000;
const difficultyOrder = { basic: 0, medium: 1, advanced: 2 };

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const numberOr = (value, fallback) => Number.isFinite(Number(value)) ? Number(value) : fallback;

function dateAt(offset, hour = 12, minute = 0) {
  const value = new Date();
  value.setHours(hour, minute, 0, 0);
  value.setDate(value.getDate() + offset);
  return value.toISOString();
}

function dateOnly(offset) {
  return dateAt(offset).slice(0, 10);
}

function topicRecord(value, fallbackLabel) {
  if (typeof value === "string") return { id: value, label: fallbackLabel || value, ratio: null };
  return { id: value?.id, label: value?.label || fallbackLabel || value?.id, ratio: Number.isFinite(value?.ratio) ? value.ratio : null };
}

export function subjectById(id) {
  return subjects.find((item) => item.id === id) || subjects[0];
}

export function teacherById(id) {
  return teachers.find((item) => item.id === id) || teachers[0];
}

export function tariffById(id) {
  return tariffs.find((item) => item.id === id) || tariffs[1];
}

export function topicById(subjectId, topicId) {
  return (diagnosticTopics[subjectId] || []).find((item) => item.id === topicId) || { id: topicId, label: topicId };
}

export function scoreLabel(profile, value, compact = false) {
  if (profile.examTypeId === "oge") return compact ? String(value) : `оценка ${value}`;
  if (compact) return String(value);
  const score = Math.abs(Math.trunc(Number(value) || 0));
  const lastTwo = score % 100;
  const last = score % 10;
  const unit = lastTwo >= 11 && lastTwo <= 14
    ? "баллов"
    : last === 1
      ? "балл"
      : last >= 2 && last <= 4
        ? "балла"
        : "баллов";
  return `${value} ${unit}`;
}

export function createStudentProfile(context = {}) {
  const stageProfile = context.draft?.profile || {};
  const stageResult = context.result || null;
  const booking = context.lastBooking || null;
  const examTypeId = ["ege", "oge"].includes(stageProfile.examTypeId || stageResult?.examTypeId)
    ? (stageProfile.examTypeId || stageResult.examTypeId)
    : "ege";
  const subjectId = subjects.some((item) => item.id === (stageProfile.subjectId || stageResult?.subjectId))
    ? (stageProfile.subjectId || stageResult.subjectId)
    : "math";
  const classValue = numberOr(stageProfile.classValue || stageResult?.classValue, examTypeId === "oge" ? 9 : 11);
  const defaultCurrent = examTypeId === "oge" ? 3 : 58;
  const defaultTarget = examTypeId === "oge" ? 5 : 85;
  const currentValue = clamp(numberOr(stageProfile.currentValue, defaultCurrent), examTypeId === "oge" ? 2 : 0, examTypeId === "oge" ? 5 : 100);
  const targetValue = clamp(numberOr(stageProfile.targetValue || stageResult?.targetValue, defaultTarget), examTypeId === "oge" ? 3 : 50, examTypeId === "oge" ? 5 : 100);
  const estimatedValue = clamp(numberOr(stageResult?.estimatedValue, currentValue), examTypeId === "oge" ? 2 : 0, examTypeId === "oge" ? 5 : 100);
  const subjectTopics = diagnosticTopics[subjectId] || [];
  const weakTopics = (stageResult?.weakTopics || subjectTopics.slice(0, 2)).map((item) => topicRecord(item, topicById(subjectId, item?.id || item).label));
  const weakIds = new Set(weakTopics.map((item) => item.id));
  const strongTopics = (stageResult?.strongTopics || subjectTopics.filter((item) => !weakIds.has(item.id)).slice(0, 2))
    .map((item) => topicRecord(item, topicById(subjectId, item?.id || item).label));
  const requestedTeacherId = context.selectedTeacherId || booking?.teacherId || stageResult?.recommendedTeacherIds?.[0];
  const teacher = teachers.find((item) => item.id === requestedTeacherId && item.subjectId === subjectId)
    || teachers.find((item) => item.subjectId === subjectId)
    || teachers[0];
  const requestedTariffId = context.selectedTariffId || booking?.tariffId || stageResult?.recommendedTariffId;
  const tariff = tariffs.find((item) => item.id === requestedTariffId) || tariffs[1];
  const availableSlots = scheduleSlots.filter((item) => item.teacherId === teacher.id && new Date(item.startAt) > new Date());
  const requestedSlotId = context.selectedSlotId || booking?.slotId;
  const slot = availableSlots.find((item) => item.id === requestedSlotId) || availableSlots[0] || scheduleSlots.find((item) => item.teacherId === teacher.id);
  const gapValue = Math.max(0, numberOr(stageResult?.gapValue, targetValue - estimatedValue));

  return {
    id: "rz-demo-student",
    name: booking?.studentName || "Алексей",
    examTypeId,
    examLabel: examTypeId === "oge" ? "ОГЭ" : "ЕГЭ",
    examSeason: examSeason.label,
    classValue,
    subjectId,
    subjectLabel: subjectById(subjectId).label,
    currentValue,
    estimatedValue,
    targetValue,
    gapValue,
    currentLabel: scoreLabel({ examTypeId }, currentValue),
    estimatedLabel: stageResult?.estimatedRange || scoreLabel({ examTypeId }, estimatedValue),
    targetLabel: stageResult?.target || scoreLabel({ examTypeId }, targetValue),
    gapLabel: examTypeId === "ege"
      ? scoreLabel({ examTypeId }, gapValue)
      : stageResult?.gap || `${gapValue} ${gapValue === 1 ? "ступень" : "ступени"} по шкале отметок`,
    readiness: stageResult?.readiness || (examTypeId === "oge" ? "Базовая готовность" : "Рабочая база"),
    confidence: stageResult?.confidence || "демонстрационная",
    goalId: stageProfile.goalId || (examTypeId === "oge" ? "profile-class" : "strong-university"),
    hours: numberOr(stageProfile.hours, examTypeId === "oge" ? 4 : 6),
    format: stageProfile.format || "either",
    weakTopics,
    strongTopics,
    riskFactors: stageResult?.riskFactors || ["Важно сохранять регулярность и разбирать повторяющиеся ошибки"],
    studyPlan: stageResult?.studyPlan || [],
    recommendedDuration: stageResult?.recommendedDuration || "12 недель",
    teacherId: teacher.id,
    tariffId: tariff.id,
    slotId: slot?.id || "",
    trajectorySource: stageResult ? "trajectory" : "demo",
    disclaimer: stageResult?.disclaimer || "Демонстрационная оценка не заменяет полноценную диагностику преподавателя."
  };
}

export function buildScoreHistory(profile) {
  const baseline = profile.currentValue;
  const current = profile.estimatedValue;
  if (profile.examTypeId === "oge") {
    const next = Math.min(profile.targetValue, Math.max(current, baseline) + 1);
    return [
      { id: "score-start", date: dateOnly(-70), value: baseline, label: "Стартовая отметка", kind: "actual" },
      { id: "score-check-1", date: dateOnly(-42), value: baseline, label: "Контрольная точка 1", kind: "actual" },
      { id: "score-current", date: dateOnly(-14), value: current, label: "Текущий ориентир", kind: "actual" },
      { id: "score-next", date: dateOnly(14), value: next, label: "Следующая точка", kind: "expected" },
      { id: "score-target", date: dateOnly(70), value: profile.targetValue, label: "Учебная цель", kind: "target" }
    ];
  }
  const first = clamp(Math.round((baseline * 2 + current) / 3), 0, 100);
  const second = clamp(Math.round((baseline + current * 2) / 3), 0, 100);
  const next = clamp(Math.min(profile.targetValue, Math.max(current, second) + 5), 0, 100);
  return [
    { id: "score-start", date: dateOnly(-70), value: baseline, label: "Стартовый результат", kind: "actual" },
    { id: "score-check-1", date: dateOnly(-48), value: first, label: "Контрольная точка 1", kind: "actual" },
    { id: "score-check-2", date: dateOnly(-28), value: second, label: "Контрольная точка 2", kind: "actual" },
    { id: "score-current", date: dateOnly(-10), value: current, label: "Текущая оценка", kind: "actual" },
    { id: "score-next", date: dateOnly(14), value: next, label: "Следующая точка", kind: "expected" },
    { id: "score-target", date: dateOnly(70), value: profile.targetValue, label: "Учебная цель", kind: "target" }
  ];
}

export function buildKnowledgeMap(profile) {
  const weak = new Map(profile.weakTopics.map((item) => [item.id, item]));
  const strong = new Map(profile.strongTopics.map((item) => [item.id, item]));
  return (diagnosticTopics[profile.subjectId] || []).map((topic, index) => {
    const weakTopic = weak.get(topic.id);
    const strongTopic = strong.get(topic.id);
    const ratio = weakTopic?.ratio ?? strongTopic?.ratio;
    const status = strongTopic ? "strong" : weakTopic ? (index % 2 ? "working" : "weak") : "unchecked";
    const level = ratio !== null && ratio !== undefined
      ? Math.round(ratio * 100)
      : status === "strong" ? 84 : status === "working" ? 55 : status === "weak" ? 34 : 0;
    return {
      id: `knowledge-${profile.subjectId}-${topic.id}`,
      subjectId: profile.subjectId,
      topicId: topic.id,
      label: topic.label,
      status,
      level,
      lastCheck: status === "unchecked" ? null : dateOnly(-(index + 1) * 3),
      errorCount: status === "strong" ? 1 : status === "unchecked" ? 0 : index + 2,
      action: status === "strong" ? "Закрепить на смешанном блоке" : status === "unchecked" ? "Пройти короткую проверку" : `Повторить тему «${topic.label}» и разобрать ошибки`
    };
  });
}

export function buildWeeklyPlan(profile) {
  const weakTopics = profile.weakTopics.length ? profile.weakTopics : (diagnosticTopics[profile.subjectId] || []).slice(0, 2);
  const topic = (index) => weakTopics[index % weakTopics.length];
  const firstTopic = topic(0);
  const secondTopic = topic(1);
  const thirdTopic = topic(2);
  const templates = [
    { type: "theory", topic: firstTopic, title: `Повторить опорную теорию: ${firstTopic.label}`, duration: 35, offset: 1 },
    { type: "practice", topic: firstTopic, title: `Решить мини-блок: ${firstTopic.label}`, duration: 45, offset: 2 },
    { type: "lesson", topic: secondTopic, title: `Урок с преподавателем: ${secondTopic.label}`, duration: 60, offset: 3 },
    { type: "homework", topic: secondTopic, title: `Домашнее задание: ${secondTopic.label}`, duration: 50, offset: 4 },
    { type: "errors", topic: secondTopic, title: "Разобрать повторяющиеся ошибки", duration: 30, offset: 5 },
    { type: "mock", topic: thirdTopic, title: "Контрольный мини-пробник", duration: profile.examTypeId === "oge" ? 60 : 80, offset: 6 }
  ];
  return templates.map((item, index) => ({
    id: `week-${profile.subjectId}-${index + 1}`,
    subjectId: profile.subjectId,
    subjectLabel: profile.subjectLabel,
    topicId: item.topic.id,
    topicLabel: item.topic.label,
    title: item.title,
    type: item.type,
    dueAt: dateAt(item.offset, index % 2 ? 18 : 16),
    durationMinutes: item.duration,
    status: index === 0 ? "in-progress" : "planned",
    source: "trajectory"
  }));
}

export function buildErrorJournal(profile, diagnosticAnswers = {}) {
  const answers = diagnosticAnswers?.answers || diagnosticAnswers || {};
  const subjectQuestions = diagnosticQuestions.filter((question) => question.subject === profile.subjectId && question.examTypes.includes(profile.examTypeId));
  const wrongQuestions = subjectQuestions.filter((question) => Object.hasOwn(answers, question.id) && Number(answers[question.id]) !== question.correctAnswer);
  const usedTopics = new Set();
  const selected = [];
  [...wrongQuestions, ...profile.weakTopics.map((topic) => subjectQuestions.find((question) => question.topic === topic.id)).filter(Boolean)]
    .forEach((question) => {
      if (!question || usedTopics.has(question.topic) || selected.length >= 5) return;
      usedTopics.add(question.topic);
      selected.push(question);
    });
  if (!selected.length && subjectQuestions[0]) selected.push(subjectQuestions[0]);
  return selected.map((question, index) => ({
    id: `error-${profile.subjectId}-${question.id}`,
    date: dateOnly(-(index + 1) * 2),
    subjectId: profile.subjectId,
    topicId: question.topic,
    topicLabel: topicById(profile.subjectId, question.topic).label,
    source: "diagnostic",
    description: `В демонстрационном задании «${question.prompt}» выбран неверный подход.`,
    correctApproach: question.explanation,
    priority: index === 0 ? "high" : "medium",
    repeats: index,
    status: index === 0 ? "new" : "review",
    nextReview: dateOnly(index + 2)
  }));
}

export function buildPracticeQuestions(profile, topicId) {
  const available = diagnosticQuestions
    .filter((question) => question.subject === profile.subjectId && question.examTypes.includes(profile.examTypeId))
    .sort((a, b) => {
      const topicDelta = Number(b.topic === topicId) - Number(a.topic === topicId);
      return topicDelta || difficultyOrder[a.difficulty] - difficultyOrder[b.difficulty] || a.id.localeCompare(b.id);
    });
  return available.slice(0, 5);
}

export function buildMockExams(profile) {
  const history = buildScoreHistory(profile).filter((item) => item.kind === "actual").slice(0, 3);
  return history.map((point, index) => ({
    id: `mock-${profile.subjectId}-${index + 1}`,
    date: dateOnly(-56 + index * 21),
    subjectId: profile.subjectId,
    subjectLabel: profile.subjectLabel,
    format: index === 2 ? "Полный демонстрационный пробник" : "Тематический пробник",
    result: point.value,
    resultLabel: scoreLabel(profile, point.value),
    change: index === 0 ? 0 : point.value - history[index - 1].value,
    weakTopicIds: profile.weakTopics.slice(index, index + 2).map((topic) => topic.id),
    reviewStatus: index === 2 ? "pending" : "reviewed"
  }));
}

export function buildAssignments(profile) {
  const topics = profile.weakTopics.length ? profile.weakTopics : (diagnosticTopics[profile.subjectId] || []).slice(0, 2);
  return [
    { id: `assignment-${profile.subjectId}-1`, title: `Практика по теме «${topics[0].label}»`, topicId: topics[0].id, dueAt: dateAt(2, 20), durationMinutes: 45, materials: "Конспект и 12 демонстрационных заданий", status: "active", result: null, teacherComment: "Сначала отметь номера, в которых сомневаешься." },
    { id: `assignment-${profile.subjectId}-2`, title: `Разбор темы «${topics[1]?.label || topics[0].label}»`, topicId: topics[1]?.id || topics[0].id, dueAt: dateAt(5, 20), durationMinutes: 50, materials: "Видеоразбор и тренировочный блок", status: "planned", result: null, teacherComment: "Сравни два способа решения." },
    { id: `assignment-${profile.subjectId}-3`, title: "Работа над ошибками недели", topicId: topics[0].id, dueAt: dateAt(-1, 20), durationMinutes: 30, materials: "Журнал ошибок", status: "checked", result: "8 из 10", teacherComment: "Хороший прогресс. Повтори один тип задачи через три дня." }
  ];
}

export function buildNotifications(profile) {
  return [
    { id: "notice-plan", type: "plan", title: "Опубликован новый план недели", text: `Фокус: ${profile.weakTopics[0]?.label || profile.subjectLabel}.`, createdAt: dateAt(-1, 10), read: false },
    { id: "notice-lesson", type: "lesson", title: "Напоминание об уроке", text: "Подготовьте журнал ошибок и выполненное домашнее задание.", createdAt: dateAt(-1, 15), read: false },
    { id: "notice-homework", type: "homework", title: "Домашнее задание проверено", text: "Комментарий преподавателя доступен в разделе заданий.", createdAt: dateAt(-2, 18), read: false },
    { id: "notice-error", type: "error", title: "Новая ошибка в журнале", text: "Добавлена ошибка из последней диагностики.", createdAt: dateAt(-3, 12), read: true },
    { id: "notice-repeat", type: "repeat", title: "Тема требует повторения", text: profile.weakTopics[0]?.label || profile.subjectLabel, createdAt: dateAt(-4, 9), read: true },
    { id: "notice-mock", type: "mock", title: "Опубликован результат пробника", text: "Откройте разбор и перенесите ошибки в журнал.", createdAt: dateAt(-5, 16), read: true },
    { id: "notice-lessons", type: "payment", title: "Осталось мало занятий", text: "Проверьте остаток занятий в разделе тарифа.", createdAt: dateAt(-6, 11), read: true }
  ];
}

export function buildSchedule(profile) {
  const teacher = teacherById(profile.teacherId);
  const slots = scheduleSlots
    .filter((item) => item.teacherId === teacher.id && item.subjectId === profile.subjectId && new Date(item.startAt) > new Date())
    .slice(0, 4);
  return slots.map((slot, index) => ({
    ...slot,
    topic: profile.weakTopics[index % Math.max(1, profile.weakTopics.length)]?.label || profile.subjectLabel,
    durationMinutes: 60,
    status: index === 0 ? "confirmed" : "planned"
  }));
}

export function buildPayments(profile) {
  const tariff = tariffById(profile.tariffId);
  const lessonCount = tariff.id === "premium" ? 16 : tariff.id === "standard" ? 12 : 8;
  return {
    tariffId: tariff.id,
    price: tariff.price,
    lessonsTotal: lessonCount,
    lessonsUsed: Math.min(lessonCount - 1, 5),
    nextPaymentAt: dateOnly(17),
    history: [
      { id: "payment-1", date: dateOnly(-43), amount: tariff.price, status: "demo-paid" },
      { id: "payment-2", date: dateOnly(-13), amount: tariff.price, status: "demo-paid" }
    ]
  };
}

export function buildTeacherMessages(profile) {
  const teacher = teacherById(profile.teacherId);
  return [{
    id: "message-welcome",
    author: "teacher",
    text: `${profile.name}, на ближайшем уроке разберём тему «${profile.weakTopics[0]?.label || profile.subjectLabel}» и сверим план недели.`,
    createdAt: dateAt(-1, 17),
    teacherId: teacher.id
  }];
}

export function getExamCountdown() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let examDate = new Date(examSeason.year, 4, 31);
  examDate.setHours(0, 0, 0, 0);
  if (examDate < today) examDate = new Date(today.getFullYear() + 1, 4, 31);
  return { days: Math.max(0, Math.ceil((examDate - today) / DAY)), date: examDate.toISOString() };
}

export const universityGoals = Object.freeze([
  { id: "msu", name: "МГУ", image: "../assets/university-msu.png" },
  { id: "hse", name: "ВШЭ", image: "../assets/university-hse.png" },
  { id: "mipt", name: "МФТИ", image: "../assets/university-mipt.png" }
]);
