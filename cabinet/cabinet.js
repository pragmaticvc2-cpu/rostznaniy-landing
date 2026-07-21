import {
  assignmentsAdapter,
  errorJournalAdapter,
  knowledgeMapAdapter,
  mockExamAdapter,
  notificationsAdapter,
  paymentsAdapter,
  practiceAdapter,
  scheduleAdapter,
  scoreTrajectoryAdapter,
  studentProfileAdapter,
  teacherMessagesAdapter,
  weeklyPlanAdapter
} from "./adapters.js";
import { diagnosticQuestions, diagnosticTopics, tariffs } from "../data/product-data.js";
import {
  getExamCountdown,
  scoreLabel,
  subjectById,
  tariffById,
  teacherById,
  topicById,
  universityGoals
} from "./model.js";

const sections = ["overview", "knowledge", "plan", "errors", "practice", "mocks", "assignments", "schedule", "teacher", "tariff"];
const dateFormatter = new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long" });
const shortDateFormatter = new Intl.DateTimeFormat("ru-RU", { day: "2-digit", month: "2-digit" });
const weekdayFormatter = new Intl.DateTimeFormat("ru-RU", { weekday: "short" });
const timeFormatter = new Intl.DateTimeFormat("ru-RU", { hour: "2-digit", minute: "2-digit" });
const fullDateFormatter = new Intl.DateTimeFormat("ru-RU", { weekday: "long", day: "numeric", month: "long" });

const escapeHtml = (value) => String(value ?? "")
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#039;");

const formatPrice = (value) => `${Number(value).toLocaleString("ru-RU")} ₽`;
const formatDuration = (minutes) => minutes >= 60 ? `${Math.floor(minutes / 60)} ч${minutes % 60 ? ` ${minutes % 60} мин` : ""}` : `${minutes} мин`;
const formatPlaces = (count) => `${count} ${count % 10 === 1 && count % 100 !== 11 ? "место" : [2, 3, 4].includes(count % 10) && ![12, 13, 14].includes(count % 100) ? "места" : "мест"}`;
const formatDate = (value) => dateFormatter.format(new Date(value));
const formatShortDate = (value) => shortDateFormatter.format(new Date(value));
const formatDateTime = (value) => `${fullDateFormatter.format(new Date(value))}, ${timeFormatter.format(new Date(value))}`;
const statusLabel = (status) => ({ planned: "Запланировано", "in-progress": "В работе", done: "Выполнено", active: "Активно", submitted: "Отправлено", checked: "Проверено", new: "Новая", review: "Нужно повторить", reviewed: "Разобрана", fixed: "Закреплена", confirmed: "Подтверждено", pending: "Ждёт разбора" }[status] || status);
const taskTypeLabel = (type) => ({ lesson: "Урок", theory: "Теория", practice: "Практика", homework: "ДЗ", mock: "Пробник", errors: "Ошибки" }[type] || type);
const sourceLabel = (source) => ({ diagnostic: "Диагностика", homework: "Домашнее задание", mock: "Пробник", practice: "Практика" }[source] || source);

const gate = document.querySelector("[data-demo-gate]");
const cabinetApp = document.querySelector("[data-cabinet-app]");
const enterButton = document.querySelector("[data-enter-demo]");
const sidebar = document.querySelector("[data-sidebar]");
const menuButton = document.querySelector("[data-menu-toggle]");
const menuBackdrop = document.querySelector("[data-menu-close]");
const productDialog = document.querySelector("[data-product-dialog]");
const productDialogTitle = document.querySelector("[data-dialog-title]");
const productDialogKicker = document.querySelector("[data-dialog-kicker]");
const productDialogContent = document.querySelector("[data-dialog-content]");
const practiceDialog = document.querySelector("[data-practice-dialog]");
const practiceForm = document.querySelector("[data-practice-form]");
const practiceProgress = document.querySelector("[data-practice-progress]");
const practiceDialogTitle = document.querySelector("[data-practice-dialog-title]");
const notificationDialog = document.querySelector("[data-notification-dialog]");
const liveRegion = document.querySelector("[data-live-region]");

let profile = studentProfileAdapter.preview();
let state = null;
let activeSection = "overview";
let planFilter = "all";
let practiceState = null;
let previousFocus = null;

function loadState() {
  profile = studentProfileAdapter.load();
  state = {
    scoreHistory: scoreTrajectoryAdapter.load(profile),
    knowledge: knowledgeMapAdapter.load(profile),
    weeklyPlan: weeklyPlanAdapter.load(profile),
    errors: errorJournalAdapter.load(profile),
    practiceSessions: practiceAdapter.sessions(),
    mocks: mockExamAdapter.load(profile),
    assignments: assignmentsAdapter.load(profile),
    notifications: notificationsAdapter.load(profile),
    schedule: scheduleAdapter.load(profile),
    payments: paymentsAdapter.load(profile),
    messages: teacherMessagesAdapter.load(profile)
  };
}

function selectedLesson() {
  return state.schedule.items.find((item) => item.id === state.schedule.selectedSlotId) || state.schedule.items[0] || null;
}

function announce(message) {
  liveRegion.textContent = "";
  window.setTimeout(() => { liveRegion.textContent = message; }, 20);
}

function renderGate() {
  gate.querySelector("[data-gate-current]").textContent = profile.currentLabel;
  gate.querySelector("[data-gate-target]").textContent = profile.targetLabel;
  const trajectoryLink = gate.querySelector("[data-gate-trajectory]");
  trajectoryLink.textContent = profile.trajectorySource === "trajectory" ? "Обновить траекторию балла →" : "Построить траекторию балла →";
}

function renderHeader() {
  document.querySelector("[data-header-context]").textContent = `${profile.examLabel} · ${profile.classValue} класс · ${profile.subjectLabel}`;
  document.querySelector("[data-profile-name]").textContent = profile.name;
  document.querySelector("[data-profile-initial]").textContent = profile.name.trim().charAt(0).toUpperCase() || "У";
  const unread = state.notifications.filter((item) => !item.read).length;
  const notificationCount = document.querySelector("[data-notification-count]");
  notificationCount.textContent = unread;
  notificationCount.hidden = unread === 0;
  document.querySelector("[data-error-count]").textContent = state.errors.filter((item) => item.status !== "fixed").length;
}

function renderMetricStrip() {
  const countdown = getExamCountdown();
  const completed = state.weeklyPlan.filter((task) => task.status === "done").length;
  const metrics = [
    ["Текущий ориентир", profile.estimatedLabel, profile.readiness],
    ["Учебная цель", profile.targetLabel, profile.examLabel],
    ["Разрыв", profile.gapLabel, profile.recommendedDuration],
    ["До экзаменационного периода", `${countdown.days} дней`, formatDate(countdown.date)],
    ["Учебная серия", "6 дней", "стабильный ритм"],
    ["План недели", `${completed} из ${state.weeklyPlan.length}`, `${state.weeklyPlan.reduce((sum, item) => sum + item.durationMinutes, 0)} мин`]
  ];
  document.querySelector("[data-metric-strip]").innerHTML = metrics.map(([label, value, note]) => `<div class="metric-item"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong><small>${escapeHtml(note)}</small></div>`).join("");
}

function scoreChartMarkup() {
  const points = state.scoreHistory;
  const min = profile.examTypeId === "oge" ? 2 : 0;
  const max = profile.examTypeId === "oge" ? 5 : 100;
  const width = 720;
  const left = 44;
  const right = 680;
  const top = 24;
  const bottom = 168;
  const x = (index) => left + (right - left) * (index / Math.max(1, points.length - 1));
  const y = (value) => bottom - ((value - min) / (max - min)) * (bottom - top);
  const actual = points.filter((point) => point.kind === "actual");
  const lastActual = actual[actual.length - 1];
  const expected = [lastActual, ...points.filter((point) => point.kind !== "actual")].filter(Boolean);
  const pointIndex = (point) => points.findIndex((item) => item.id === point.id);
  const gridValues = profile.examTypeId === "oge" ? [2, 3, 4, 5] : [0, 25, 50, 75, 100];
  const description = points.map((point) => `${point.label}: ${scoreLabel(profile, point.value)}`).join("; ");
  return `<div class="score-chart-wrap"><svg class="score-chart" viewBox="0 0 ${width} 210" role="img" aria-label="${escapeHtml(description)}"><title>${escapeHtml(description)}</title>
    ${gridValues.map((value) => `<line class="grid" x1="${left}" y1="${y(value)}" x2="${right}" y2="${y(value)}"></line><text x="4" y="${y(value) + 4}">${escapeHtml(scoreLabel(profile, value, true))}</text>`).join("")}
    <polyline class="line" points="${actual.map((point) => `${x(pointIndex(point))},${y(point.value)}`).join(" ")}"></polyline>
    <polyline class="expected" points="${expected.map((point) => `${x(pointIndex(point))},${y(point.value)}`).join(" ")}"></polyline>
    ${points.map((point, index) => `<circle class="point ${point.kind === "target" ? "point--target" : ""}" cx="${x(index)}" cy="${y(point.value)}" r="5"></circle><text x="${x(index)}" y="${Math.max(13, y(point.value) - 10)}" text-anchor="middle">${escapeHtml(scoreLabel(profile, point.value, true))}</text><text x="${x(index)}" y="194" text-anchor="middle">${escapeHtml(formatShortDate(point.date))}</text>`).join("")}
  </svg></div><p class="chart-description">Демонстрационная динамика, не официальный прогноз экзаменационного результата. ${escapeHtml(description)}.</p>`;
}

function renderScorePanel() {
  document.querySelector("[data-score-panel]").innerHTML = `<div class="panel-heading"><div><p class="eyebrow">Траектория результата</p><h2 id="score-panel-title">От текущего уровня к цели</h2><p>${escapeHtml(profile.examLabel)} · ${escapeHtml(profile.subjectLabel)}</p></div><button class="text-button" type="button" data-open-section="mocks">История пробников</button></div><div class="score-summary"><div class="score-current"><span>Текущая демонстрационная оценка</span><strong>${escapeHtml(scoreLabel(profile, profile.estimatedValue))}</strong><small>Цель: ${escapeHtml(profile.targetLabel)} · ${escapeHtml(profile.gapLabel)}</small></div>${scoreChartMarkup()}</div>`;
}

function renderNextLesson() {
  const lesson = selectedLesson();
  const teacher = teacherById(profile.teacherId);
  const node = document.querySelector("[data-next-lesson]");
  if (!lesson) {
    node.innerHTML = `<div class="empty-state"><h2 id="next-lesson-title">Ближайший урок</h2><p>Свободный слот пока не выбран.</p><a class="button button--compact" href="../trajectory/">Выбрать время</a></div>`;
    return;
  }
  const date = new Date(lesson.startAt);
  node.innerHTML = `<div class="panel-heading"><div><p class="eyebrow">Ближайший урок</p><h2 id="next-lesson-title">${escapeHtml(lesson.topic)}</h2></div><span class="row-status is-active">${escapeHtml(statusLabel(lesson.status))}</span></div><div class="lesson-date"><div class="lesson-date__day"><strong>${date.getDate()}</strong><span>${escapeHtml(new Intl.DateTimeFormat("ru-RU", { month: "short" }).format(date))}</span></div><div><h2>${escapeHtml(timeFormatter.format(date))} · ${escapeHtml(profile.subjectLabel)}</h2><p>${escapeHtml(teacher.name)} · ${lesson.format === "individual" ? "индивидуально" : "мини-группа"}</p></div></div><div class="lesson-facts"><div><span>Длительность</span><strong>${formatDuration(lesson.durationMinutes)}</strong></div><div><span>Подготовить</span><strong>Журнал ошибок и выполненное ДЗ</strong></div></div><div class="inline-actions"><button class="mini-button" type="button" data-action="lesson-details">Подробнее</button><button class="button button--primary button--compact" type="button" data-action="join-lesson">Подключиться</button></div>`;
}

function renderWeekPreview() {
  const completed = state.weeklyPlan.filter((task) => task.status === "done").length;
  const progress = Math.round((completed / Math.max(1, state.weeklyPlan.length)) * 100);
  const tasks = state.weeklyPlan.filter((task) => task.status !== "done").slice(0, 3);
  document.querySelector("[data-week-preview]").innerHTML = `<div class="panel-heading"><div><p class="eyebrow">План недели</p><h2 id="week-preview-title">${completed} из ${state.weeklyPlan.length} задач выполнено</h2></div><button class="text-button" type="button" data-open-section="plan">Открыть план</button></div><div class="progress-line" aria-label="Прогресс недели ${progress}%"><span style="width:${progress}%"></span></div><div class="preview-list">${tasks.length ? tasks.map((task) => `<label class="preview-row"><input type="checkbox" data-task-check="${escapeHtml(task.id)}"><span><b>${escapeHtml(task.title)}</b><small>${escapeHtml(taskTypeLabel(task.type))} · ${formatDuration(task.durationMinutes)}</small></span><time datetime="${escapeHtml(task.dueAt)}">${escapeHtml(formatShortDate(task.dueAt))}</time></label>`).join("") : `<div class="empty-state">Все задачи недели выполнены.</div>`}</div>`;
}

function renderKnowledgePreview() {
  const visible = [...state.knowledge].sort((a, b) => a.level - b.level).slice(0, 4);
  document.querySelector("[data-knowledge-preview]").innerHTML = `<div class="panel-heading"><div><p class="eyebrow">Карта знаний</p><h2 id="knowledge-preview-title">Темы, которые требуют внимания</h2></div><button class="text-button" type="button" data-open-section="knowledge">Вся карта</button></div><div class="knowledge-bars">${visible.map((topic) => `<div class="knowledge-bar is-${escapeHtml(topic.status)}"><div class="knowledge-bar__head"><span>${escapeHtml(topic.label)}</span><span>${topic.status === "unchecked" ? "не проверена" : `${topic.level}%`}</span></div><div class="progress-line"><span style="width:${topic.level}%"></span></div></div>`).join("")}</div>`;
}

function renderUniversities() {
  const node = document.querySelector("[data-universities]");
  const shouldShow = profile.goalId === "strong-university";
  node.hidden = !shouldShow;
  if (!shouldShow) return;
  node.innerHTML = `<div class="university-row"><div><p class="eyebrow">Целевые ориентиры</p><h2 id="universities-title">Демонстрационные цели</h2><p>Не официальные проходные баллы.</p></div>${universityGoals.map((item) => `<div class="university-item"><img src="${escapeHtml(item.image)}" alt="Эмблема ${escapeHtml(item.name)}"><strong>${escapeHtml(item.name)}</strong></div>`).join("")}<div class="university-gap"><strong>${escapeHtml(profile.targetLabel)}</strong><span>${escapeHtml(profile.subjectLabel)} · текущий разрыв ${escapeHtml(profile.gapLabel)}</span></div></div>`;
}

function renderKnowledge() {
  document.querySelector("[data-knowledge-grid]").innerHTML = state.knowledge.map((topic) => {
    const status = statusLabel(topic.status === "working" ? "in-progress" : topic.status === "strong" ? "done" : topic.status === "weak" ? "new" : "planned");
    const meterColor = topic.status === "strong" ? "var(--mint)" : topic.status === "weak" ? "var(--danger)" : "var(--cyan)";
    return `<article class="knowledge-card"><div><span class="status status--${escapeHtml(topic.status)}">${escapeHtml(status)}</span><h2>${escapeHtml(topic.label)}</h2><p>${escapeHtml(topic.action)}</p><dl><div><dt>Последняя проверка</dt><dd>${topic.lastCheck ? escapeHtml(formatDate(topic.lastCheck)) : "Не было"}</dd></div><div><dt>Ошибок</dt><dd>${topic.errorCount}</dd></div></dl><button class="mini-button" type="button" data-practice-topic="${escapeHtml(topic.topicId)}">Потренироваться</button></div><div class="topic-meter" style="--level:${topic.level};--meter-color:${meterColor}" aria-label="Уровень темы ${topic.level}%"><strong>${topic.status === "unchecked" ? "—" : `${topic.level}%`}</strong></div></article>`;
  }).join("");
}

function renderWeeklyPlan() {
  const completed = state.weeklyPlan.filter((task) => task.status === "done").length;
  const totalMinutes = state.weeklyPlan.reduce((sum, item) => sum + item.durationMinutes, 0);
  document.querySelector("[data-week-load]").textContent = `${completed} из ${state.weeklyPlan.length} задач · общая нагрузка ${formatDuration(totalMinutes)}.`;
  const progress = Math.round((completed / Math.max(1, state.weeklyPlan.length)) * 100);
  document.querySelector("[data-week-progress-ring]").style.setProperty("--progress", progress);
  document.querySelector("[data-week-progress-ring]").innerHTML = `<strong>${progress}%</strong>`;
  const filtered = state.weeklyPlan.filter((task) => planFilter === "all" || (planFilter === "done" ? task.status === "done" : task.status !== "done"));
  document.querySelector("[data-weekly-plan]").innerHTML = filtered.length ? filtered.map((task) => `<article class="task-row"><span class="task-type">${escapeHtml(taskTypeLabel(task.type))}</span><div><h2>${escapeHtml(task.title)}</h2><p>${escapeHtml(task.topicLabel)} · ${escapeHtml(task.subjectLabel)}</p></div><div class="task-meta"><span>Срок</span><strong>${escapeHtml(formatDateTime(task.dueAt))}</strong></div><div class="task-meta"><span>Нагрузка</span><strong>${formatDuration(task.durationMinutes)}</strong></div><div><span class="row-status ${task.status === "done" ? "is-done" : task.status === "in-progress" ? "is-active" : ""}">${escapeHtml(statusLabel(task.status))}</span><button class="mini-button" type="button" data-task-toggle="${escapeHtml(task.id)}">${task.status === "done" ? "Вернуть" : "Выполнить"}</button></div></article>`).join("") : `<div class="empty-state">В этом фильтре задач нет.</div>`;
}

function populateErrorFilters() {
  const topicSelect = document.querySelector("[data-error-topic-filter]");
  const current = topicSelect.value || "all";
  topicSelect.innerHTML = `<option value="all">Все темы</option>${state.knowledge.map((topic) => `<option value="${escapeHtml(topic.topicId)}">${escapeHtml(topic.label)}</option>`).join("")}`;
  topicSelect.value = [...topicSelect.options].some((option) => option.value === current) ? current : "all";
}

function renderErrors() {
  const topicFilter = document.querySelector("[data-error-topic-filter]").value || "all";
  const statusFilter = document.querySelector("[data-error-status-filter]").value || "all";
  const sort = document.querySelector("[data-error-sort]").value || "priority";
  const priorities = { high: 0, medium: 1, low: 2 };
  let entries = state.errors.filter((entry) => (topicFilter === "all" || entry.topicId === topicFilter) && (statusFilter === "all" || entry.status === statusFilter));
  entries = [...entries].sort((a, b) => sort === "date" ? new Date(b.date) - new Date(a.date) : sort === "review" ? new Date(a.nextReview) - new Date(b.nextReview) : priorities[a.priority] - priorities[b.priority]);
  document.querySelector("[data-error-journal]").innerHTML = entries.length ? entries.map((entry) => `<article class="error-row"><div><span class="error-source">${escapeHtml(sourceLabel(entry.source))} · ${escapeHtml(formatShortDate(entry.date))}</span><h2>${escapeHtml(entry.topicLabel)}</h2><p>${escapeHtml(entry.description)}</p></div><div class="error-approach"><h2>Правильный подход</h2><p>${escapeHtml(entry.correctApproach)}</p></div><div><span class="row-status ${entry.status === "fixed" ? "is-done" : entry.status === "new" ? "is-active" : ""}">${escapeHtml(statusLabel(entry.status))}</span><p>Повторений: ${entry.repeats}<br>Следующее: ${escapeHtml(formatDate(entry.nextReview))}</p></div><div class="error-actions"><button class="mini-button" type="button" data-error-action="reviewed" data-error-id="${escapeHtml(entry.id)}">Разобрать</button><button class="mini-button" type="button" data-error-action="review" data-error-id="${escapeHtml(entry.id)}">Повторить</button><button class="mini-button" type="button" data-error-action="fixed" data-error-id="${escapeHtml(entry.id)}">Закреплено</button></div></article>`).join("") : `<div class="empty-state">Ошибок с выбранными параметрами нет.</div>`;
}

function renderPractice() {
  const weak = state.knowledge.filter((topic) => topic.status === "weak" || topic.status === "working");
  const candidates = weak.length ? weak : state.knowledge.slice(0, 2);
  document.querySelector("[data-practice-launch]").innerHTML = `<div class="practice-intro"><p class="eyebrow">Быстрый тренировочный режим</p><h2>5 вопросов по одной теме</h2><p>Результат обновит карту знаний, недельный план и журнал ошибок. Задания не являются официальным экзаменационным вариантом.</p><button class="button button--primary" type="button" data-practice-topic="${escapeHtml(candidates[0]?.topicId || "")}">Начать по теме «${escapeHtml(candidates[0]?.label || profile.subjectLabel)}»</button></div><div class="practice-topic-list"><strong>Выберите тему</strong>${candidates.map((topic) => `<button class="practice-topic-button" type="button" data-practice-topic="${escapeHtml(topic.topicId)}"><span>${escapeHtml(topic.label)}</span><span>${topic.level}% →</span></button>`).join("")}</div>`;
  document.querySelector("[data-practice-history]").innerHTML = state.practiceSessions.length ? state.practiceSessions.slice(0, 5).map((session) => `<div class="history-row"><span>${escapeHtml(topicById(profile.subjectId, session.topicId).label)}</span><strong>${session.correct} из ${session.total}</strong><time datetime="${escapeHtml(session.createdAt)}">${escapeHtml(formatShortDate(session.createdAt))}</time></div>`).join("") : `<div class="practice-history-empty">Практика ещё не запускалась.</div>`;
}

function renderMocks() {
  document.querySelector("[data-mock-list]").innerHTML = state.mocks.map((mock) => `<article class="data-row"><time datetime="${escapeHtml(mock.date)}">${escapeHtml(formatDate(mock.date))}</time><div><h2>${escapeHtml(mock.format)}</h2><p>${escapeHtml(mock.subjectLabel)} · слабые темы: ${mock.weakTopicIds.map((id) => escapeHtml(topicById(profile.subjectId, id).label)).join(", ") || "нет"}</p></div><strong class="data-result">${escapeHtml(mock.resultLabel)}</strong><span class="${mock.change > 0 ? "change-positive" : ""}">${mock.change > 0 ? `+${mock.change}` : mock.change || "старт"}</span><div class="inline-actions"><button class="mini-button" type="button" data-mock-action="review" data-mock-id="${escapeHtml(mock.id)}">Открыть разбор</button><button class="mini-button" type="button" data-mock-action="errors" data-mock-id="${escapeHtml(mock.id)}">Добавить ошибки</button></div></article>`).join("");
}

function renderAssignments() {
  document.querySelector("[data-assignment-list]").innerHTML = state.assignments.map((assignment) => `<article class="assignment-card"><span class="row-status ${assignment.status === "checked" ? "is-done" : assignment.status === "active" ? "is-active" : ""}">${escapeHtml(statusLabel(assignment.status))}</span><h2>${escapeHtml(assignment.title)}</h2><p>${escapeHtml(assignment.materials)}</p><dl><div><dt>Срок</dt><dd>${escapeHtml(formatDateTime(assignment.dueAt))}</dd></div><div><dt>Время</dt><dd>${formatDuration(assignment.durationMinutes)}</dd></div>${assignment.result ? `<div><dt>Результат</dt><dd>${escapeHtml(assignment.result)}</dd></div>` : ""}</dl><div class="inline-actions"><button class="mini-button" type="button" data-assignment-action="open" data-assignment-id="${escapeHtml(assignment.id)}">Открыть</button>${!['submitted','checked'].includes(assignment.status) ? `<button class="button button--primary button--compact" type="button" data-assignment-action="submit" data-assignment-id="${escapeHtml(assignment.id)}">Сдать</button>` : ""}</div></article>`).join("");
}

function renderSchedule() {
  document.querySelector("[data-schedule-list]").innerHTML = state.schedule.items.length ? state.schedule.items.map((lesson) => `<article class="schedule-row"><div class="schedule-date"><strong>${escapeHtml(formatDate(lesson.startAt))}</strong><span>${escapeHtml(weekdayFormatter.format(new Date(lesson.startAt)))}</span></div><strong class="schedule-time">${escapeHtml(timeFormatter.format(new Date(lesson.startAt)))}</strong><div><h2>${escapeHtml(lesson.topic)}</h2><p>${escapeHtml(teacherById(lesson.teacherId).name)} · ${lesson.format === "individual" ? "индивидуально" : "мини-группа"}</p></div><span class="row-status ${lesson.id === state.schedule.selectedSlotId ? "is-active" : ""}">${lesson.id === state.schedule.selectedSlotId ? "Ближайший" : escapeHtml(statusLabel(lesson.status))}</span><div class="inline-actions"><button class="mini-button" type="button" data-schedule-action="details" data-slot-id="${escapeHtml(lesson.id)}">Подробнее</button><button class="mini-button" type="button" data-schedule-action="reschedule" data-slot-id="${escapeHtml(lesson.id)}">Перенести</button><button class="mini-button" type="button" data-schedule-action="cancel" data-slot-id="${escapeHtml(lesson.id)}">Отменить</button></div></article>`).join("") : `<div class="empty-state">Будущих занятий пока нет.</div>`;
}

function renderTeacher() {
  const teacher = teacherById(profile.teacherId);
  const lesson = selectedLesson();
  const lastMessage = state.messages[state.messages.length - 1];
  document.querySelector("[data-teacher-workspace]").innerHTML = `<article class="teacher-profile"><div class="teacher-person"><img src="${escapeHtml(teacher.image)}" alt="${escapeHtml(teacher.name)}"><div><p class="eyebrow">${escapeHtml(profile.subjectLabel)}</p><h2>${escapeHtml(teacher.name)}</h2><p>${escapeHtml(teacher.summary)}</p></div></div><div class="teacher-topics">${profile.weakTopics.map((topic) => `<span>${escapeHtml(topic.label)}</span>`).join("")}</div><div class="teacher-note">Подходит для работы с текущим разрывом до цели и темами: ${profile.weakTopics.map((topic) => escapeHtml(topic.label)).join(", ")}.</div><p>Ближайший урок: <strong>${lesson ? escapeHtml(formatDateTime(lesson.startAt)) : "не выбран"}</strong></p></article><article class="message-preview"><p class="eyebrow">Демо-переписка</p><h2>Сообщение преподавателя</h2><div class="message-bubble">${escapeHtml(lastMessage?.text || "Сообщений пока нет.")}</div><button class="button button--primary button--compact" type="button" data-action="message-teacher">Написать преподавателю</button></article>`;
}

function renderTariff() {
  const tariff = tariffById(profile.tariffId);
  const payments = state.payments;
  const remaining = Math.max(0, payments.lessonsTotal - payments.lessonsUsed);
  document.querySelector("[data-tariff-workspace]").innerHTML = `<article class="tariff-summary"><p class="eyebrow">Текущий тариф</p><h2>${escapeHtml(tariff.name)}</h2><div class="tariff-summary__price">${formatPrice(tariff.price)} <small>/ месяц</small></div><p>${escapeHtml(tariff.intro)}</p><div class="lesson-balance"><div><span>Занятий</span><strong>${payments.lessonsTotal}</strong></div><div><span>Использовано</span><strong>${payments.lessonsUsed}</strong></div><div><span>Осталось</span><strong>${remaining}</strong></div></div><p>Следующая демонстрационная дата оплаты: <strong>${escapeHtml(formatDate(payments.nextPaymentAt))}</strong></p></article><article class="payment-history"><p class="eyebrow">Демо-история</p><h2>Платежи</h2>${payments.history.map((payment) => `<div class="payment-row"><time datetime="${escapeHtml(payment.date)}">${escapeHtml(formatDate(payment.date))}</time><strong>${formatPrice(payment.amount)}</strong><span>Оплачено (демо)</span></div>`).join("")}</article>`;
}

function renderNotifications() {
  const list = document.querySelector("[data-notification-list]");
  list.innerHTML = state.notifications.map((item) => `<article class="notification-item ${item.read ? "" : "is-unread"}"><span class="notification-dot"></span><div><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.text)} · ${escapeHtml(formatDateTime(item.createdAt))}</p></div>${item.read ? "" : `<button class="mini-button" type="button" data-notification-read="${escapeHtml(item.id)}">Прочитано</button>`}</article>`).join("");
}

function renderAll() {
  renderHeader();
  document.querySelector("[data-today-label]").textContent = new Intl.DateTimeFormat("ru-RU", { weekday: "long", day: "numeric", month: "long" }).format(new Date());
  document.querySelector("[data-student-first-name]").textContent = profile.name.split(/\s+/)[0];
  document.querySelector("[data-overview-summary]").textContent = `${profile.examLabel}, ${profile.classValue} класс · ${profile.subjectLabel}. Фокус недели: ${profile.weakTopics.map((topic) => topic.label).slice(0, 2).join(" и ") || "системная практика"}.`;
  renderMetricStrip();
  renderScorePanel();
  renderNextLesson();
  renderWeekPreview();
  renderKnowledgePreview();
  renderUniversities();
  renderKnowledge();
  renderWeeklyPlan();
  populateErrorFilters();
  renderErrors();
  renderPractice();
  renderMocks();
  renderAssignments();
  renderSchedule();
  renderTeacher();
  renderTariff();
  renderNotifications();
}

function showSection(sectionId, updateHash = true) {
  activeSection = sections.includes(sectionId) ? sectionId : "overview";
  document.querySelectorAll("[data-section]").forEach((section) => {
    const active = section.dataset.section === activeSection;
    section.hidden = !active;
    section.classList.toggle("is-active", active);
  });
  document.querySelectorAll("[data-nav]").forEach((link) => {
    if (link.dataset.nav === activeSection) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  });
  if (updateHash) history.replaceState(null, "", `#${activeSection}`);
  document.querySelector("#cabinet-main")?.focus({ preventScroll: true });
  window.scrollTo({ top: 0, behavior: "smooth" });
  closeMenu();
}

function openMenu() {
  sidebar.classList.add("is-open");
  menuBackdrop.hidden = false;
  menuButton.setAttribute("aria-expanded", "true");
  document.body.classList.add("menu-open");
  sidebar.querySelector("a")?.focus();
}

function closeMenu() {
  if (!sidebar.classList.contains("is-open")) return;
  sidebar.classList.remove("is-open");
  menuBackdrop.hidden = true;
  menuButton.setAttribute("aria-expanded", "false");
  document.body.classList.remove("menu-open");
}

function trapFocus(event, dialog) {
  if (event.key !== "Tab" || !dialog.open) return;
  const focusable = [...dialog.querySelectorAll('button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])')].filter((element) => !element.hidden);
  if (!focusable.length) return;
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
  else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
}

function openProductDialog({ title, kicker = "Демонстрационный режим", html }) {
  previousFocus = document.activeElement;
  productDialogTitle.textContent = title;
  productDialogKicker.textContent = kicker;
  productDialogContent.innerHTML = html;
  productDialog.showModal();
  document.body.classList.add("dialog-open");
  productDialog.querySelector("[data-dialog-close]")?.focus();
}

function closeProductDialog() {
  if (!productDialog.open) return;
  productDialog.close();
  document.body.classList.remove("dialog-open");
  previousFocus?.focus?.({ preventScroll: true });
}

function openNotifications() {
  previousFocus = document.activeElement;
  renderNotifications();
  notificationDialog.showModal();
  document.body.classList.add("dialog-open");
  notificationDialog.querySelector("[data-notifications-close]")?.focus();
}

function closeNotifications() {
  if (!notificationDialog.open) return;
  notificationDialog.close();
  document.body.classList.remove("dialog-open");
  previousFocus?.focus?.({ preventScroll: true });
}

function openPractice(topicId) {
  const topic = topicById(profile.subjectId, topicId);
  const questions = practiceAdapter.questions(profile, topicId);
  practiceState = { topicId, topic, questions, index: 0, answers: {}, finished: false };
  previousFocus = document.activeElement;
  practiceDialogTitle.textContent = topic.label;
  renderPracticeStep();
  practiceDialog.showModal();
  document.body.classList.add("dialog-open");
  practiceForm.querySelector("input, button")?.focus();
}

function closePractice() {
  if (!practiceDialog.open) return;
  practiceDialog.close();
  document.body.classList.remove("dialog-open");
  previousFocus?.focus?.({ preventScroll: true });
}

function renderPracticeStep() {
  if (!practiceState) return;
  if (practiceState.finished) {
    const session = practiceState.session;
    practiceProgress.style.width = "100%";
    practiceForm.innerHTML = `<div class="practice-result"><p class="eyebrow">Практика завершена</p><h3>${escapeHtml(practiceState.topic.label)}</h3><strong>${session.correct} из ${session.total}</strong><p>Карта знаний, недельный план и журнал ошибок обновлены локально.</p><div class="practice-disclaimer">Демонстрационные задания для знакомства с логикой продукта.</div><div class="dialog-actions"><button class="button button--primary" type="button" data-practice-result-close>Вернуться в кабинет</button></div></div>`;
    return;
  }
  const question = practiceState.questions[practiceState.index];
  const progress = Math.round(((practiceState.index + 1) / practiceState.questions.length) * 100);
  practiceProgress.style.width = `${progress}%`;
  practiceForm.innerHTML = `<div class="practice-question-meta"><span>Вопрос ${practiceState.index + 1} из ${practiceState.questions.length}</span><span>${escapeHtml(topicById(profile.subjectId, question.topic).label)} · ${escapeHtml(question.difficulty)}</span></div><fieldset><legend>${escapeHtml(question.prompt)}</legend><div class="answer-list">${question.answerOptions.map((option, index) => `<label class="answer-option"><input type="radio" name="practice-answer" value="${index}" ${Number(practiceState.answers[question.id]) === index ? "checked" : ""} required><span>${escapeHtml(option)}</span></label>`).join("")}</div></fieldset><div class="practice-disclaimer">Демонстрационные задания для знакомства с логикой продукта.</div><div class="dialog-actions">${practiceState.index > 0 ? `<button class="button button--secondary" type="button" data-practice-back>Назад</button>` : ""}<button class="button button--primary" type="submit">${practiceState.index === practiceState.questions.length - 1 ? "Завершить" : "Следующий вопрос"}</button></div>`;
}

function refreshAfterStateChange(message) {
  loadState();
  renderAll();
  showSection(activeSection, false);
  if (message) announce(message);
}

function lessonDialogHtml() {
  const lesson = selectedLesson();
  const teacher = teacherById(profile.teacherId);
  if (!lesson) return `<div class="empty-state">Урок пока не выбран.</div>`;
  return `<h3>${escapeHtml(lesson.topic)}</h3><p>${escapeHtml(formatDateTime(lesson.startAt))}</p><div class="dialog-grid"><div><span>Преподаватель</span><strong>${escapeHtml(teacher.name)}</strong></div><div><span>Предмет</span><strong>${escapeHtml(profile.subjectLabel)}</strong></div><div><span>Формат</span><strong>${lesson.format === "individual" ? "Индивидуально" : "Мини-группа"}</strong></div><div><span>Длительность</span><strong>${formatDuration(lesson.durationMinutes)}</strong></div></div><h3>Что подготовить</h3><p>Журнал ошибок, выполненное домашнее задание и вопросы по теме «${escapeHtml(lesson.topic)}».</p><div class="dialog-actions"><button class="button button--primary" type="button" data-dialog-demo-join>Подключиться</button></div>`;
}

function openMessageDialog() {
  const teacher = teacherById(profile.teacherId);
  openProductDialog({ title: `Сообщение: ${teacher.name}`, kicker: "Локальная демо-переписка", html: `<div class="message-bubble">${escapeHtml(state.messages[state.messages.length - 1]?.text || "")}</div><form class="dialog-form" data-message-form><label>Ваше сообщение<textarea name="message" maxlength="500" placeholder="Напишите вопрос о занятии или теме" required></textarea></label><p>Сообщение не отправляется наружу и сохраняется только в этом браузере.</p><div class="dialog-actions"><button class="button button--primary" type="submit">Сохранить демо-сообщение</button></div></form>` });
}

function openTariffComparison() {
  openProductDialog({ title: "Сравнение тарифов", kicker: "Без реальной оплаты", html: `<div class="dialog-grid">${tariffs.map((tariff) => `<div><span>${tariff.id === profile.tariffId ? "Текущий тариф" : "Альтернатива"}</span><strong>${escapeHtml(tariff.name)} · ${formatPrice(tariff.price)}</strong><p>${escapeHtml(tariff.features.slice(0, 2).join(" · "))}</p><button class="mini-button" type="button" data-select-tariff="${escapeHtml(tariff.id)}" ${tariff.id === profile.tariffId ? "disabled" : ""}>${tariff.id === profile.tariffId ? "Выбран" : "Выбрать в демо"}</button></div>`).join("")}</div><p>Изменение не запускает платёж и используется только для демонстрации интерфейса.</p>` });
}

function openRescheduleDialog() {
  const options = state.schedule.items.map((slot) => `<option value="${escapeHtml(slot.id)}" ${slot.id === state.schedule.selectedSlotId ? "selected" : ""}>${escapeHtml(formatDateTime(slot.startAt))} · ${slot.format === "individual" ? "индивидуально" : "мини-группа"} · ${formatPlaces(slot.places)}</option>`).join("");
  openProductDialog({ title: "Перенести занятие", kicker: "Локальное расписание", html: `<form class="dialog-form" data-reschedule-form><label>Новое время<select name="slotId" required>${options}</select></label><p>Выбор сохранится в этом браузере и не изменит реальное расписание.</p><div class="dialog-actions"><button class="button button--primary" type="submit">Сохранить новое время</button></div></form>` });
}

function handleDocumentClick(event) {
  const nav = event.target.closest("[data-nav]");
  if (nav) { event.preventDefault(); showSection(nav.dataset.nav); return; }
  const openSection = event.target.closest("[data-open-section]");
  if (openSection) { showSection(openSection.dataset.openSection); return; }
  const topicButton = event.target.closest("[data-practice-topic]");
  if (topicButton?.dataset.practiceTopic) { openPractice(topicButton.dataset.practiceTopic); return; }
  const taskCheck = event.target.closest("[data-task-check]");
  if (taskCheck) {
    weeklyPlanAdapter.setStatus(profile, taskCheck.dataset.taskCheck, taskCheck.checked ? "done" : "planned");
    refreshAfterStateChange(taskCheck.checked ? "Задача выполнена" : "Задача возвращена в план");
    return;
  }
  const taskToggle = event.target.closest("[data-task-toggle]");
  if (taskToggle) {
    const task = state.weeklyPlan.find((item) => item.id === taskToggle.dataset.taskToggle);
    weeklyPlanAdapter.setStatus(profile, task.id, task.status === "done" ? "planned" : "done");
    refreshAfterStateChange(task.status === "done" ? "Задача возвращена в план" : "Задача выполнена");
    return;
  }
  const errorAction = event.target.closest("[data-error-action]");
  if (errorAction) {
    errorJournalAdapter.setStatus(profile, errorAction.dataset.errorId, errorAction.dataset.errorAction);
    refreshAfterStateChange(`Статус ошибки: ${statusLabel(errorAction.dataset.errorAction)}`);
    return;
  }
  const mockAction = event.target.closest("[data-mock-action]");
  if (mockAction) {
    const mock = state.mocks.find((item) => item.id === mockAction.dataset.mockId);
    if (mockAction.dataset.mockAction === "review") {
      mockExamAdapter.markReviewed(profile, mock.id);
      openProductDialog({ title: "Разбор пробника", kicker: mock.resultLabel, html: `<h3>${escapeHtml(mock.format)}</h3><p>Основной фокус разбора: ${mock.weakTopicIds.map((id) => escapeHtml(topicById(profile.subjectId, id).label)).join(", ") || "стабильность выполнения"}.</p><div class="dialog-grid"><div><span>Результат</span><strong>${escapeHtml(mock.resultLabel)}</strong></div><div><span>Изменение</span><strong>${mock.change > 0 ? `+${mock.change}` : mock.change || "старт"}</strong></div></div><p>Это демонстрационная контрольная точка, а не официальный результат экзамена.</p>` });
    } else {
      const questions = diagnosticQuestions.filter((question) => question.subject === profile.subjectId && mock.weakTopicIds.includes(question.topic)).slice(0, 2);
      errorJournalAdapter.addFromQuestions(profile, questions, {}, "mock");
      refreshAfterStateChange("Ошибки пробника добавлены в журнал");
      showSection("errors");
    }
    return;
  }
  const assignmentAction = event.target.closest("[data-assignment-action]");
  if (assignmentAction) {
    const assignment = state.assignments.find((item) => item.id === assignmentAction.dataset.assignmentId);
    if (assignmentAction.dataset.assignmentAction === "submit") {
      assignmentsAdapter.setStatus(profile, assignment.id, "submitted");
      refreshAfterStateChange("Домашнее задание локально отправлено");
    } else {
      openProductDialog({ title: assignment.title, kicker: statusLabel(assignment.status), html: `<p>${escapeHtml(assignment.materials)}</p><div class="dialog-grid"><div><span>Тема</span><strong>${escapeHtml(topicById(profile.subjectId, assignment.topicId).label)}</strong></div><div><span>Срок</span><strong>${escapeHtml(formatDateTime(assignment.dueAt))}</strong></div><div><span>Ожидаемое время</span><strong>${formatDuration(assignment.durationMinutes)}</strong></div><div><span>Результат</span><strong>${escapeHtml(assignment.result || "Ещё нет")}</strong></div></div><h3>Комментарий преподавателя</h3><p>${escapeHtml(assignment.teacherComment)}</p>` });
    }
    return;
  }
  const scheduleAction = event.target.closest("[data-schedule-action]");
  if (scheduleAction) {
    const lesson = state.schedule.items.find((item) => item.id === scheduleAction.dataset.slotId);
    if (scheduleAction.dataset.scheduleAction === "reschedule") openRescheduleDialog();
    else if (scheduleAction.dataset.scheduleAction === "cancel") openProductDialog({ title: "Отмена занятия", kicker: "Демонстрационный режим", html: `<h3>${escapeHtml(formatDateTime(lesson.startAt))}</h3><p>В рабочей версии запрос уйдёт куратору. В демо-кабинете расписание не отменяется.</p><div class="dialog-actions"><button class="button button--primary" type="button" data-dialog-close-secondary>Понятно</button></div>` });
    else openProductDialog({ title: lesson.topic, kicker: profile.subjectLabel, html: lessonDialogHtml() });
    return;
  }
  const action = event.target.closest("[data-action]")?.dataset.action;
  if (action === "lesson-details") openProductDialog({ title: "Ближайший урок", kicker: profile.subjectLabel, html: lessonDialogHtml() });
  if (action === "join-lesson") openProductDialog({ title: "Видеокомната", kicker: "Демонстрационный режим", html: `<h3>Подключение недоступно в концепте</h3><p>В рабочем продукте здесь откроется защищённая видеокомната урока.</p><div class="dialog-actions"><button class="button button--primary" type="button" data-dialog-close-secondary>Понятно</button></div>` });
  if (action === "message-teacher") openMessageDialog();
  if (event.target.closest("[data-change-tariff]")) openTariffComparison();
  if (event.target.closest("[data-plan-next-mock]")) openProductDialog({ title: "Следующий пробник", kicker: "Планирование", html: `<h3>${escapeHtml(profile.subjectLabel)}</h3><p>Следующая демонстрационная контрольная точка добавлена в план на ${escapeHtml(formatDate(new Date(Date.now() + 7 * 86_400_000)))}.</p><div class="dialog-actions"><button class="button button--primary" type="button" data-dialog-close-secondary>Готово</button></div>` });
  if (event.target.closest("[data-start-weak-practice]")) {
    const weak = state.knowledge.find((topic) => topic.status === "weak") || state.knowledge[0];
    openPractice(weak.topicId);
  }
  if (event.target.closest("[data-profile-menu]")) openProductDialog({ title: profile.name, kicker: "Демо-профиль", html: `<div class="dialog-grid"><div><span>Экзамен</span><strong>${escapeHtml(profile.examLabel)}</strong></div><div><span>Класс</span><strong>${profile.classValue} класс</strong></div><div><span>Предмет</span><strong>${escapeHtml(profile.subjectLabel)}</strong></div><div><span>Цель</span><strong>${escapeHtml(profile.targetLabel)}</strong></div></div><p>Профиль сформирован из trajectory или стабильных демонстрационных данных.</p>` });
}

function handleProductDialogClick(event) {
  if (event.target === productDialog || event.target.closest("[data-dialog-close], [data-dialog-close-secondary]")) { closeProductDialog(); return; }
  if (event.target.closest("[data-dialog-demo-join]")) {
    productDialogTitle.textContent = "Видеокомната";
    productDialogContent.innerHTML = `<h3>Демонстрационная функция</h3><p>Подключение к реальному уроку не выполняется.</p><div class="dialog-actions"><button class="button button--primary" type="button" data-dialog-close-secondary>Закрыть</button></div>`;
  }
  const tariffButton = event.target.closest("[data-select-tariff]");
  if (tariffButton) {
    profile = { ...profile, tariffId: tariffButton.dataset.selectTariff };
    studentProfileAdapter.save(profile);
    paymentsAdapter.refresh(profile);
    closeProductDialog();
    refreshAfterStateChange(`Выбран тариф «${tariffById(profile.tariffId).name}»`);
  }
}

function handleProductDialogSubmit(event) {
  event.preventDefault();
  if (event.target.matches("[data-message-form]")) {
    const text = event.target.elements.message.value;
    teacherMessagesAdapter.send(profile, text);
    closeProductDialog();
    refreshAfterStateChange("Демо-сообщение сохранено локально");
  }
  if (event.target.matches("[data-reschedule-form]")) {
    const slotId = event.target.elements.slotId.value;
    const saved = scheduleAdapter.reschedule(profile, slotId);
    closeProductDialog();
    refreshAfterStateChange(saved ? "Новое время сохранено локально" : "Не удалось сохранить время");
  }
}

enterButton.addEventListener("click", () => {
  profile = studentProfileAdapter.enterDemo();
  gate.hidden = true;
  cabinetApp.hidden = false;
  loadState();
  renderAll();
  showSection(location.hash.slice(1) || "overview", false);
});

menuButton.addEventListener("click", () => sidebar.classList.contains("is-open") ? closeMenu() : openMenu());
menuBackdrop.addEventListener("click", closeMenu);
document.addEventListener("click", handleDocumentClick);
document.querySelectorAll("[data-plan-filter]").forEach((button) => button.addEventListener("click", () => {
  planFilter = button.dataset.planFilter;
  document.querySelectorAll("[data-plan-filter]").forEach((item) => item.classList.toggle("is-active", item === button));
  renderWeeklyPlan();
}));
document.querySelectorAll("[data-error-topic-filter], [data-error-status-filter], [data-error-sort]").forEach((field) => field.addEventListener("change", renderErrors));

productDialog.addEventListener("click", handleProductDialogClick);
productDialog.addEventListener("submit", handleProductDialogSubmit);
productDialog.addEventListener("cancel", (event) => { event.preventDefault(); closeProductDialog(); });
productDialog.addEventListener("keydown", (event) => {
  if (event.key === "Escape") { event.preventDefault(); closeProductDialog(); return; }
  trapFocus(event, productDialog);
});

document.querySelector("[data-practice-close]").addEventListener("click", closePractice);
practiceDialog.addEventListener("click", (event) => { if (event.target === practiceDialog || event.target.closest("[data-practice-result-close]")) closePractice(); });
practiceDialog.addEventListener("cancel", (event) => { event.preventDefault(); closePractice(); });
practiceDialog.addEventListener("keydown", (event) => {
  if (event.key === "Escape") { event.preventDefault(); closePractice(); return; }
  trapFocus(event, practiceDialog);
});
practiceForm.addEventListener("click", (event) => {
  if (!event.target.closest("[data-practice-back]")) return;
  practiceState.index = Math.max(0, practiceState.index - 1);
  renderPracticeStep();
});
practiceForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const question = practiceState.questions[practiceState.index];
  const selected = practiceForm.elements["practice-answer"]?.value;
  if (selected === undefined || selected === "") { announce("Выберите вариант ответа"); return; }
  practiceState.answers[question.id] = Number(selected);
  if (practiceState.index < practiceState.questions.length - 1) {
    practiceState.index += 1;
    renderPracticeStep();
    practiceForm.querySelector("input")?.focus();
    return;
  }
  practiceState.session = practiceAdapter.submit(profile, practiceState.topicId, practiceState.questions, practiceState.answers);
  practiceState.finished = true;
  loadState();
  renderAll();
  renderPracticeStep();
  announce("Практика завершена, данные кабинета обновлены");
});

document.querySelector("[data-notifications-open]").addEventListener("click", openNotifications);
document.querySelector("[data-notifications-close]").addEventListener("click", closeNotifications);
notificationDialog.addEventListener("click", (event) => {
  if (event.target === notificationDialog) { closeNotifications(); return; }
  const readButton = event.target.closest("[data-notification-read]");
  if (readButton) {
    notificationsAdapter.markRead(profile, readButton.dataset.notificationRead);
    refreshAfterStateChange("Уведомление прочитано");
    renderNotifications();
  }
});
notificationDialog.addEventListener("cancel", (event) => { event.preventDefault(); closeNotifications(); });
notificationDialog.addEventListener("keydown", (event) => {
  if (event.key === "Escape") { event.preventDefault(); closeNotifications(); return; }
  trapFocus(event, notificationDialog);
});
document.querySelector("[data-notifications-read-all]").addEventListener("click", () => {
  notificationsAdapter.markAllRead(profile);
  refreshAfterStateChange("Все уведомления прочитаны");
  renderNotifications();
});

window.addEventListener("hashchange", () => showSection(location.hash.slice(1) || "overview", false));
window.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && sidebar.classList.contains("is-open")) closeMenu();
});

renderGate();
const session = studentProfileAdapter.session();
if (session?.entered) {
  gate.hidden = true;
  cabinetApp.hidden = false;
  loadState();
  renderAll();
  showSection(location.hash.slice(1) || "overview", false);
}
