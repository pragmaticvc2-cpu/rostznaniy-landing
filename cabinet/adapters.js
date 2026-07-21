import { storageKeys as trajectoryStorageKeys, storageVersion as trajectoryStorageVersion } from "../data/config.js";
import { diagnosticQuestions, scheduleSlots } from "../data/product-data.js";
import {
  buildAssignments,
  buildErrorJournal,
  buildKnowledgeMap,
  buildMockExams,
  buildNotifications,
  buildPayments,
  buildPracticeQuestions,
  buildSchedule,
  buildScoreHistory,
  buildTeacherMessages,
  buildWeeklyPlan,
  createStudentProfile,
  topicById
} from "./model.js";
import {
  cabinetStorageKeys,
  readExternalVersioned,
  readVersioned,
  removeVersioned,
  writeVersioned
} from "./storage.js";

/**
 * @typedef {Object} StudentProfile
 * @property {string} id
 * @property {string} examTypeId
 * @property {number} classValue
 * @property {string} subjectId
 * @property {number} currentValue
 * @property {number} targetValue
 * @property {string} teacherId
 * @property {string} tariffId
 * @property {string} slotId
 */

/** @typedef {{id:string, date:string, value:number, label:string, kind:string}} ScorePoint */
/** @typedef {{id:string, topicId:string, status:string, level:number, errorCount:number}} KnowledgeTopic */
/** @typedef {{id:string, title:string, type:string, dueAt:string, durationMinutes:number, status:string}} WeeklyTask */
/** @typedef {{id:string, topicId:string, source:string, status:string, nextReview:string}} ErrorEntry */

const isObject = (value) => Boolean(value && typeof value === "object" && !Array.isArray(value));
const isArray = Array.isArray;

function stageContext() {
  const bookings = readExternalVersioned(trajectoryStorageKeys.demoBookings, trajectoryStorageVersion, []);
  return {
    draft: readExternalVersioned(trajectoryStorageKeys.trajectoryDraft, trajectoryStorageVersion, null),
    result: readExternalVersioned(trajectoryStorageKeys.trajectoryResult, trajectoryStorageVersion, null),
    diagnosticAnswers: readExternalVersioned(trajectoryStorageKeys.diagnosticAnswers, trajectoryStorageVersion, {}),
    selectedTeacherId: readExternalVersioned(trajectoryStorageKeys.selectedTeacher, trajectoryStorageVersion, ""),
    selectedTariffId: readExternalVersioned(trajectoryStorageKeys.selectedTariff, trajectoryStorageVersion, ""),
    selectedSlotId: readExternalVersioned(trajectoryStorageKeys.selectedSlot, trajectoryStorageVersion, ""),
    lastBooking: Array.isArray(bookings) ? bookings[0] || null : null
  };
}

function previewProfile() {
  return createStudentProfile(stageContext());
}

const profileScopedKeys = [
  cabinetStorageKeys.scoreHistory,
  cabinetStorageKeys.knowledgeMap,
  cabinetStorageKeys.weeklyPlan,
  cabinetStorageKeys.errorJournal,
  cabinetStorageKeys.practiceSessions,
  cabinetStorageKeys.mockExams,
  cabinetStorageKeys.assignments,
  cabinetStorageKeys.notifications,
  cabinetStorageKeys.scheduleChanges,
  cabinetStorageKeys.payments,
  cabinetStorageKeys.teacherMessages
];

function profileSignature(profile) {
  if (!profile) return "";
  return JSON.stringify({
    examTypeId: profile.examTypeId,
    classValue: profile.classValue,
    subjectId: profile.subjectId,
    currentValue: profile.currentValue,
    estimatedValue: profile.estimatedValue,
    targetValue: profile.targetValue,
    teacherId: profile.teacherId,
    tariffId: profile.tariffId,
    slotId: profile.slotId,
    weakTopicIds: (profile.weakTopics || []).map((topic) => topic.id),
    strongTopicIds: (profile.strongTopics || []).map((topic) => topic.id)
  });
}

function resolveProfile(stored, current) {
  const trajectoryChanged = current.trajectorySource === "trajectory"
    && profileSignature(stored) !== profileSignature(current);
  if (trajectoryChanged) {
    removeVersioned(profileScopedKeys);
    writeVersioned(cabinetStorageKeys.studentProfile, current);
    return current;
  }
  if (stored && current.trajectorySource === "trajectory") {
    const refreshed = {
      ...stored,
      currentLabel: current.currentLabel,
      estimatedLabel: current.estimatedLabel,
      targetLabel: current.targetLabel,
      gapLabel: current.gapLabel,
      disclaimer: current.disclaimer
    };
    writeVersioned(cabinetStorageKeys.studentProfile, refreshed);
    return refreshed;
  }
  return stored || current;
}

export const studentProfileAdapter = Object.freeze({
  /** @returns {StudentProfile} */
  preview() {
    return previewProfile();
  },
  /** @returns {StudentProfile} */
  load() {
    const current = previewProfile();
    const stored = readVersioned(cabinetStorageKeys.studentProfile, null, (value) => value === null || isObject(value));
    return resolveProfile(stored, current);
  },
  /** @returns {{entered:boolean, mode:string}|null} */
  session() {
    return readVersioned(cabinetStorageKeys.cabinetSession, null, (value) => value === null || isObject(value));
  },
  /** @returns {StudentProfile} */
  enterDemo() {
    const current = previewProfile();
    const stored = readVersioned(cabinetStorageKeys.studentProfile, null, (value) => value === null || isObject(value));
    const profile = resolveProfile(stored, current);
    writeVersioned(cabinetStorageKeys.studentProfile, profile);
    writeVersioned(cabinetStorageKeys.cabinetSession, { entered: true, mode: "demo", enteredAt: new Date().toISOString() });
    return profile;
  },
  save(profile) {
    return isObject(profile) && writeVersioned(cabinetStorageKeys.studentProfile, profile);
  }
});

export const scoreTrajectoryAdapter = Object.freeze({
  /** @param {StudentProfile} profile @returns {ScorePoint[]} */
  load(profile) {
    return readVersioned(cabinetStorageKeys.scoreHistory, () => buildScoreHistory(profile), isArray);
  },
  save(points) {
    return isArray(points) && writeVersioned(cabinetStorageKeys.scoreHistory, points);
  }
});

export const knowledgeMapAdapter = Object.freeze({
  /** @param {StudentProfile} profile @returns {KnowledgeTopic[]} */
  load(profile) {
    return readVersioned(cabinetStorageKeys.knowledgeMap, () => buildKnowledgeMap(profile), isArray);
  },
  save(topics) {
    return isArray(topics) && writeVersioned(cabinetStorageKeys.knowledgeMap, topics);
  },
  recordPractice(profile, topicId, ratio) {
    const topics = this.load(profile).map((topic) => topic.topicId === topicId ? {
      ...topic,
      level: Math.round(ratio * 100),
      status: ratio >= 0.8 ? "strong" : ratio >= 0.5 ? "working" : "weak",
      lastCheck: new Date().toISOString().slice(0, 10),
      errorCount: Math.max(0, 5 - Math.round(ratio * 5))
    } : topic);
    this.save(topics);
    return topics;
  }
});

export const weeklyPlanAdapter = Object.freeze({
  /** @param {StudentProfile} profile @returns {WeeklyTask[]} */
  load(profile) {
    return readVersioned(cabinetStorageKeys.weeklyPlan, () => buildWeeklyPlan(profile), isArray);
  },
  save(tasks) {
    return isArray(tasks) && writeVersioned(cabinetStorageKeys.weeklyPlan, tasks);
  },
  setStatus(profile, taskId, status) {
    const tasks = this.load(profile).map((task) => task.id === taskId ? { ...task, status } : task);
    this.save(tasks);
    return tasks;
  },
  recordPractice(profile, topicId, ratio) {
    const tasks = this.load(profile).map((task) => task.topicId === topicId && task.type === "practice"
      ? { ...task, status: ratio >= 0.6 ? "done" : "in-progress" }
      : task);
    this.save(tasks);
    return tasks;
  }
});

export const errorJournalAdapter = Object.freeze({
  /** @param {StudentProfile} profile @returns {ErrorEntry[]} */
  load(profile) {
    const context = stageContext();
    return readVersioned(cabinetStorageKeys.errorJournal, () => buildErrorJournal(profile, context.diagnosticAnswers), isArray);
  },
  save(entries) {
    return isArray(entries) && writeVersioned(cabinetStorageKeys.errorJournal, entries);
  },
  setStatus(profile, entryId, status) {
    const entries = this.load(profile).map((entry) => entry.id === entryId ? {
      ...entry,
      status,
      repeats: status === "review" ? entry.repeats + 1 : entry.repeats,
      nextReview: new Date(Date.now() + (status === "fixed" ? 14 : 3) * 86_400_000).toISOString().slice(0, 10)
    } : entry);
    this.save(entries);
    return entries;
  },
  addFromQuestions(profile, questions, answers, source = "practice") {
    const entries = this.load(profile);
    const next = [...entries];
    questions.forEach((question) => {
      if (Number(answers[question.id]) === question.correctAnswer) return;
      const id = `error-${source}-${question.id}`;
      const existingIndex = next.findIndex((entry) => entry.id === id);
      const record = {
        id,
        date: new Date().toISOString().slice(0, 10),
        subjectId: profile.subjectId,
        topicId: question.topic,
        topicLabel: topicById(profile.subjectId, question.topic).label,
        source,
        description: `В задании «${question.prompt}» выбран неверный вариант.`,
        correctApproach: question.explanation,
        priority: question.difficulty === "advanced" ? "high" : "medium",
        repeats: existingIndex >= 0 ? next[existingIndex].repeats + 1 : 0,
        status: "new",
        nextReview: new Date(Date.now() + 2 * 86_400_000).toISOString().slice(0, 10)
      };
      if (existingIndex >= 0) next.splice(existingIndex, 1, record);
      else next.unshift(record);
    });
    this.save(next);
    return next;
  }
});

export const practiceAdapter = Object.freeze({
  questions(profile, topicId) {
    return buildPracticeQuestions(profile, topicId);
  },
  sessions() {
    return readVersioned(cabinetStorageKeys.practiceSessions, [], isArray);
  },
  submit(profile, topicId, questions, answers) {
    const correct = questions.filter((question) => Number(answers[question.id]) === question.correctAnswer).length;
    const session = {
      id: `practice-${profile.subjectId}-${topicId}-${this.sessions().length + 1}`,
      subjectId: profile.subjectId,
      topicId,
      questionIds: questions.map((question) => question.id),
      answers,
      correct,
      total: questions.length,
      ratio: questions.length ? correct / questions.length : 0,
      createdAt: new Date().toISOString()
    };
    const sessions = [session, ...this.sessions()].slice(0, 20);
    writeVersioned(cabinetStorageKeys.practiceSessions, sessions);
    errorJournalAdapter.addFromQuestions(profile, questions, answers, "practice");
    knowledgeMapAdapter.recordPractice(profile, topicId, session.ratio);
    weeklyPlanAdapter.recordPractice(profile, topicId, session.ratio);
    return session;
  }
});

export const mockExamAdapter = Object.freeze({
  load(profile) {
    return readVersioned(cabinetStorageKeys.mockExams, () => buildMockExams(profile), isArray);
  },
  save(items) {
    return isArray(items) && writeVersioned(cabinetStorageKeys.mockExams, items);
  },
  markReviewed(profile, examId) {
    const items = this.load(profile).map((item) => item.id === examId ? { ...item, reviewStatus: "reviewed" } : item);
    this.save(items);
    return items;
  }
});

export const assignmentsAdapter = Object.freeze({
  load(profile) {
    return readVersioned(cabinetStorageKeys.assignments, () => buildAssignments(profile), isArray);
  },
  setStatus(profile, assignmentId, status) {
    const items = this.load(profile).map((item) => item.id === assignmentId ? { ...item, status } : item);
    writeVersioned(cabinetStorageKeys.assignments, items);
    return items;
  }
});

export const notificationsAdapter = Object.freeze({
  load(profile) {
    return readVersioned(cabinetStorageKeys.notifications, () => buildNotifications(profile), isArray);
  },
  markRead(profile, notificationId) {
    const items = this.load(profile).map((item) => item.id === notificationId ? { ...item, read: true } : item);
    writeVersioned(cabinetStorageKeys.notifications, items);
    return items;
  },
  markAllRead(profile) {
    const items = this.load(profile).map((item) => ({ ...item, read: true }));
    writeVersioned(cabinetStorageKeys.notifications, items);
    return items;
  }
});

export const scheduleAdapter = Object.freeze({
  load(profile) {
    const changes = readVersioned(cabinetStorageKeys.scheduleChanges, { selectedSlotId: profile.slotId }, isObject);
    const items = buildSchedule(profile);
    return { items, selectedSlotId: changes.selectedSlotId || items[0]?.id || "" };
  },
  reschedule(profile, slotId) {
    const valid = scheduleSlots.some((slot) => slot.id === slotId && slot.teacherId === profile.teacherId && new Date(slot.startAt) > new Date());
    if (!valid) return false;
    return writeVersioned(cabinetStorageKeys.scheduleChanges, { selectedSlotId: slotId, changedAt: new Date().toISOString(), status: "demo-rescheduled" });
  }
});

export const paymentsAdapter = Object.freeze({
  load(profile) {
    return readVersioned(cabinetStorageKeys.payments, () => buildPayments(profile), isObject);
  },
  refresh(profile) {
    const payments = buildPayments(profile);
    writeVersioned(cabinetStorageKeys.payments, payments);
    return payments;
  }
});

export const teacherMessagesAdapter = Object.freeze({
  load(profile) {
    return readVersioned(cabinetStorageKeys.teacherMessages, () => buildTeacherMessages(profile), isArray);
  },
  send(profile, text) {
    const cleanText = String(text || "").trim().slice(0, 500);
    if (!cleanText) return this.load(profile);
    const messages = this.load(profile);
    const message = { id: `message-demo-${messages.length + 1}`, author: "student", text: cleanText, createdAt: new Date().toISOString(), teacherId: profile.teacherId };
    const next = [...messages, message].slice(-30);
    writeVersioned(cabinetStorageKeys.teacherMessages, next);
    return next;
  }
});

export const cabinetAdapters = Object.freeze({
  studentProfileAdapter,
  scoreTrajectoryAdapter,
  knowledgeMapAdapter,
  weeklyPlanAdapter,
  errorJournalAdapter,
  practiceAdapter,
  mockExamAdapter,
  assignmentsAdapter,
  notificationsAdapter,
  scheduleAdapter,
  paymentsAdapter,
  teacherMessagesAdapter
});

export const adapterContracts = Object.freeze({
  futureBackend: ["load", "save", "submit"],
  currentTransport: "versioned-localStorage",
  externalRequests: false,
  questionSource: diagnosticQuestions.length
});
