import {
  diagnosticQuestions,
  diagnosticTopics,
  scheduleSlots,
  studyPlanTemplates,
  tariffs,
  teachers
} from "../data/product-data.js";

const difficultyWeight = { basic: 1, medium: 1.5, advanced: 2 };

const stableNumber = (value) => [...value].reduce((total, letter) => total + letter.charCodeAt(0), 0);

const rotate = (items, offset) => {
  if (!items.length) return [];
  const normalized = offset % items.length;
  return [...items.slice(normalized), ...items.slice(0, normalized)];
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

function scoreUnit(value) {
  const score = Math.abs(Math.trunc(Number(value) || 0));
  const lastTwo = score % 100;
  const last = score % 10;
  if (lastTwo >= 11 && lastTwo <= 14) return "баллов";
  if (last === 1) return "балл";
  if (last >= 2 && last <= 4) return "балла";
  return "баллов";
}

export function selectDiagnosticQuestions(subjectId, examTypeId) {
  const seed = stableNumber(`${subjectId}-${examTypeId}`);
  const available = diagnosticQuestions.filter(
    (question) => question.subject === subjectId && question.examTypes.includes(examTypeId)
  );

  const take = (difficulty, count, salt) => rotate(
    available.filter((question) => question.difficulty === difficulty),
    seed + salt
  ).slice(0, count);

  return [
    ...take("basic", 3, 0),
    ...take("medium", 3, 1),
    ...take("advanced", 2, 2)
  ];
}

function scoreDiagnostic(questions, answers) {
  const topicStats = new Map();
  let earned = 0;
  let possible = 0;

  questions.forEach((question) => {
    const weight = difficultyWeight[question.difficulty];
    const correct = Number(answers[question.id]) === question.correctAnswer;
    possible += weight;
    if (correct) earned += weight;

    const current = topicStats.get(question.topic) || { earned: 0, possible: 0, correct: 0, total: 0 };
    current.possible += weight;
    current.total += 1;
    if (correct) {
      current.earned += weight;
      current.correct += 1;
    }
    topicStats.set(question.topic, current);
  });

  return {
    ratio: possible ? earned / possible : 0,
    earned,
    possible,
    topicStats
  };
}

function topicSummary(subjectId, topicStats) {
  const labels = new Map((diagnosticTopics[subjectId] || []).map((topic) => [topic.id, topic.label]));
  const ranked = [...topicStats.entries()]
    .map(([id, value]) => ({ id, label: labels.get(id) || id, ratio: value.possible ? value.earned / value.possible : 0 }))
    .sort((a, b) => b.ratio - a.ratio || a.label.localeCompare(b.label, "ru"));

  const strongTopics = ranked.filter((topic) => topic.ratio >= 0.68).slice(0, 3);
  const weakTopics = [...ranked].sort((a, b) => a.ratio - b.ratio || a.label.localeCompare(b.label, "ru")).slice(0, 3);

  return {
    strongTopics: strongTopics.length ? strongTopics : ranked.slice(0, 2),
    weakTopics
  };
}

function durationFor(gap, classValue, hours, readiness) {
  let weeks = 8;
  if (gap > 12) weeks += 2;
  if (gap > 24) weeks += 2;
  if (gap > 36) weeks += 2;
  if (hours <= 2) weeks += 2;
  if (classValue === 8 || classValue === 10) weeks = Math.max(weeks, 10);
  if (readiness === "Нужна базовая опора") weeks = Math.max(weeks, 12);
  return clamp(weeks, 8, 16);
}

function makeStudyPlan({ subjectId, weakTopics, weeks, hours, targetLabel, intensive }) {
  const templates = studyPlanTemplates[subjectId] || [];
  const selected = weakTopics.map((topic) => templates.find((template) => template.topicId === topic.id)).filter(Boolean);
  const fallback = templates.filter((template) => !selected.includes(template));
  const ordered = [...selected, ...fallback];
  const segments = weeks >= 14 ? [4, 5, weeks - 9] : weeks >= 11 ? [3, 4, weeks - 7] : [2, 3, weeks - 5];
  const goals = ["Закрыть базовые пробелы", "Стабилизировать решение экзаменационных блоков", "Закрепить стратегию и темп"];

  return segments.map((length, index) => {
    const topics = ordered.slice(index, index + 2).map((template) => template?.title).filter(Boolean);
    const start = segments.slice(0, index).reduce((sum, item) => sum + item, 0) + 1;
    const end = start + length - 1;
    return {
      id: `stage-${index + 1}`,
      period: `${start}–${end} неделя`,
      goal: goals[index],
      topics,
      lessons: Math.max(2, Math.round((hours / 2) * length)),
      practice: `${Math.max(1, hours - 2)} ч самостоятельной практики в неделю`,
      checkpoint: index === 2 ? `Итоговый демонстрационный пробник и сверка с целью «${targetLabel}»` : `Контрольный мини-пробник по темам этапа`,
      expected: index === 0 ? "Стабильное решение базовых заданий" : index === 1 ? "Сокращение повторяющихся ошибок" : "Уверенный маршрут по работе и контроль времени",
      intensive
    };
  });
}

function matchTeachers(subjectId, weakTopics, format) {
  const weakIds = new Set(weakTopics.map((topic) => topic.id));
  return teachers
    .filter((teacher) => teacher.subjectId === subjectId)
    .map((teacher) => ({
      teacher,
      score: teacher.strongTopics.filter((topic) => weakIds.has(topic)).length * 3 + (format === "either" || teacher.formats.includes(format) ? 2 : 0)
    }))
    .sort((a, b) => b.score - a.score || a.teacher.name.localeCompare(b.teacher.name, "ru"))
    .slice(0, 2)
    .map(({ teacher }) => teacher);
}

function matchTariff({ gap, hours, format, targetValue, examTypeId }) {
  const ambitious = examTypeId === "ege" ? targetValue >= 85 : targetValue >= 5;
  if (format === "individual" || gap >= (examTypeId === "ege" ? 28 : 1.5) || (ambitious && hours >= 6)) return "premium";
  if (gap >= (examTypeId === "ege" ? 12 : 0.7) || hours >= 4 || ambitious) return "standard";
  return "base";
}

function recommendedSlotsFor(teacherIds, subjectId, format) {
  const allowed = new Set(teacherIds);
  return scheduleSlots
    .filter((slot) => allowed.has(slot.teacherId) && slot.subjectId === subjectId)
    .filter((slot) => format === "either" || slot.format === format)
    .filter((slot) => new Date(slot.startAt) > new Date())
    .sort((a, b) => new Date(a.startAt) - new Date(b.startAt))
    .slice(0, 5);
}

export function calculateTrajectory(profile, answers) {
  const questions = selectDiagnosticQuestions(profile.subjectId, profile.examTypeId);
  const diagnostic = scoreDiagnostic(questions, answers);
  const topics = topicSummary(profile.subjectId, diagnostic.topicStats);
  const hasCurrent = profile.currentValue !== "unknown" && profile.currentValue !== "" && profile.currentValue != null;
  const currentValue = hasCurrent ? Number(profile.currentValue) : null;
  const targetValue = Number(profile.targetValue);
  const hours = Number(profile.hours || 4);

  let estimatedRange;
  let estimatedValue;
  let gap;
  let readiness;
  let targetLabel;

  if (profile.examTypeId === "ege") {
    const diagnosticValue = Math.round(30 + diagnostic.ratio * 65);
    estimatedValue = hasCurrent ? Math.round(currentValue * 0.45 + diagnosticValue * 0.55) : diagnosticValue;
    const spread = hasCurrent ? 5 : 8;
    estimatedRange = `${clamp(estimatedValue - spread, 0, 100)}–${clamp(estimatedValue + spread, 0, 100)} баллов`;
    gap = Math.max(0, targetValue - estimatedValue);
    readiness = diagnostic.ratio >= 0.76 ? "Уверенная база" : diagnostic.ratio >= 0.5 ? "Рабочая готовность" : "Нужна базовая опора";
    targetLabel = `${targetValue}+ баллов`;
  } else {
    const diagnosticGrade = diagnostic.ratio >= 0.82 ? 5 : diagnostic.ratio >= 0.57 ? 4 : diagnostic.ratio >= 0.32 ? 3 : 2;
    estimatedValue = hasCurrent ? Math.round((currentValue + diagnosticGrade * 2) / 3) : diagnosticGrade;
    estimatedValue = clamp(estimatedValue, 2, 5);
    estimatedRange = `предполагаемая отметка ${estimatedValue}`;
    gap = Math.max(0, targetValue - estimatedValue);
    readiness = estimatedValue >= 5 ? "Высокая готовность" : estimatedValue >= 4 ? "Рабочая готовность" : estimatedValue >= 3 ? "Базовая готовность" : "Нужна базовая опора";
    targetLabel = `оценка ${targetValue}`;
  }

  const recommendedHoursPerWeek = gap > (profile.examTypeId === "ege" ? 25 : 1) ? 6 : gap > (profile.examTypeId === "ege" ? 10 : 0) ? 4 : 3;
  const intensive = hours < recommendedHoursPerWeek;
  const weeks = durationFor(profile.examTypeId === "ege" ? gap : gap * 20, Number(profile.classValue), hours, readiness);
  const matchedTeachers = matchTeachers(profile.subjectId, topics.weakTopics, profile.format);
  const recommendedTariffId = matchTariff({ gap, hours, format: profile.format, targetValue, examTypeId: profile.examTypeId });
  const slotList = recommendedSlotsFor(matchedTeachers.map((teacher) => teacher.id), profile.subjectId, profile.format);
  const riskFactors = [];
  if (intensive) riskFactors.push("Доступная нагрузка ниже рекомендуемой для текущего разрыва");
  if (!hasCurrent) riskFactors.push("Стартовый результат указан приблизительно по мини-диагностике");
  if (topics.weakTopics.some((topic) => topic.ratio === 0)) riskFactors.push("Есть темы без верных ответов в демонстрационном блоке");
  if (!riskFactors.length) riskFactors.push("Важно сохранять регулярность занятий и контрольных точек");

  const result = {
    version: 1,
    examTypeId: profile.examTypeId,
    subjectId: profile.subjectId,
    classValue: Number(profile.classValue),
    estimatedRange,
    estimatedValue,
    target: targetLabel,
    targetValue,
    gap: profile.examTypeId === "ege" ? `${Math.round(gap)} ${scoreUnit(gap)}` : `${gap} ${gap === 1 ? "ступень" : "ступени"} по шкале отметок`,
    gapValue: gap,
    readiness,
    strongTopics: topics.strongTopics,
    weakTopics: topics.weakTopics,
    riskFactors,
    recommendedHoursPerWeek,
    recommendedDuration: `${weeks} недель`,
    recommendedTeacherIds: matchedTeachers.map((teacher) => teacher.id),
    recommendedTariffId,
    alternativeTariffId: recommendedTariffId === "premium" ? "standard" : recommendedTariffId === "standard" ? "premium" : "standard",
    recommendedSlots: slotList.map((slot) => slot.id),
    confidence: hasCurrent ? "средняя" : "ориентировочная",
    intensive,
    disclaimer: "Результат является предварительной оценкой и не заменяет полноценную диагностику преподавателя.",
    studyPlan: makeStudyPlan({ subjectId: profile.subjectId, weakTopics: topics.weakTopics, weeks, hours, targetLabel, intensive }),
    diagnostic: { correct: [...diagnostic.topicStats.values()].reduce((sum, item) => sum + item.correct, 0), total: questions.length, ratio: diagnostic.ratio }
  };

  return result;
}

export function getTariffReason(result) {
  const tariff = tariffs.find((item) => item.id === result.recommendedTariffId);
  if (tariff?.id === "premium") return "Индивидуальный темп помогает быстрее закрыть крупный разрыв и регулярно разбирать сложные темы.";
  if (tariff?.id === "standard") return "Три занятия в неделю и регулярный разбор ошибок соответствуют рекомендуемой нагрузке.";
  return "Мини-группа и базовая регулярность подходят для умеренного разрыва до цели.";
}
