import { examSeason, storageKeys, storageVersion } from "../data/config.js";
import {
  bookingOptions,
  classes,
  diagnosticTopics,
  examTypes,
  scheduleSlots,
  subjects,
  tariffs,
  targetGoals,
  teachers
} from "../data/product-data.js";
import { calculateTrajectory, getTariffReason, selectDiagnosticQuestions } from "./engine.js";
import { bookingAdapter } from "./booking-adapter.js";

const views = [...document.querySelectorAll("[data-view]")];
const startButton = document.querySelector("[data-start]");
const resumeNote = document.querySelector("[data-resume-note]");
const profileForm = document.querySelector("[data-profile-form]");
const profileFieldset = document.querySelector("[data-profile-fieldset]");
const profileError = document.querySelector("[data-profile-error]");
const profileBack = document.querySelector("[data-profile-back]");
const profileNext = document.querySelector("[data-profile-next]");
const profileCount = document.querySelector("[data-profile-count]");
const profileProgress = document.querySelector("[data-profile-progress]");
const profileSummary = document.querySelector("[data-profile-summary]");
const diagnosticForm = document.querySelector("[data-diagnostic-form]");
const diagnosticQuestion = document.querySelector("[data-diagnostic-question]");
const diagnosticError = document.querySelector("[data-diagnostic-error]");
const diagnosticBack = document.querySelector("[data-diagnostic-back]");
const diagnosticNext = document.querySelector("[data-diagnostic-next]");
const diagnosticCount = document.querySelector("[data-diagnostic-count]");
const diagnosticProgress = document.querySelector("[data-diagnostic-progress]");
const answeredCount = document.querySelector("[data-answered-count]");
const resultContent = document.querySelector("[data-result-content]");
const bookingDialog = document.querySelector("[data-booking-dialog]");
const bookingForm = document.querySelector("[data-booking-form]");
const bookingContent = document.querySelector("[data-booking-content]");
const bookingError = document.querySelector("[data-booking-error]");
const bookingProgress = document.querySelector("[data-booking-progress]");
const bookingBack = document.querySelector("[data-booking-back]");
const bookingNext = document.querySelector("[data-booking-next]");
const bookingActions = document.querySelector("[data-booking-actions]");
const liveRegion = document.querySelector("[data-live-region]");

const defaultProfile = {
  examTypeId: "",
  classValue: "",
  subjectId: "",
  currentValue: "",
  targetValue: "",
  goalId: "",
  hours: "",
  format: ""
};

let profile = { ...defaultProfile };
let profileStepIndex = 0;
let diagnosticIndex = 0;
let diagnosticAnswers = {};
let questions = [];
let result = null;
let selectedTeacherId = "";
let selectedTariffId = "";
let selectedSlotId = "";
let bookingStep = 0;
let bookingData = {};
let previousFocus = null;

const escapeHtml = (value) => String(value ?? "")
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#039;");

function readVersioned(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    if (parsed?.version !== storageVersion) return fallback;
    return parsed.data ?? fallback;
  } catch {
    localStorage.removeItem(key);
    return fallback;
  }
}

function writeVersioned(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify({ version: storageVersion, data }));
  } catch {
    liveRegion.textContent = "Не удалось сохранить черновик в этом браузере";
  }
}

function setView(name) {
  views.forEach((view) => view.classList.toggle("is-active", view.dataset.view === name));
  window.scrollTo({ top: 0, behavior: "smooth" });
  document.querySelector(`[data-view="${name}"] h1`)?.focus?.({ preventScroll: true });
}

function valueLabel(items, value, key = "id") {
  return items.find((item) => String(item[key]) === String(value))?.label || "Не выбрано";
}

function subjectById(id) { return subjects.find((item) => item.id === id); }
function examById(id) { return examTypes.find((item) => item.id === id); }
function teacherById(id) { return teachers.find((item) => item.id === id); }
function tariffById(id) { return tariffs.find((item) => item.id === id); }
function slotById(id) { return scheduleSlots.find((item) => item.id === id); }

document.querySelectorAll("[data-exam-season]").forEach((node) => { node.textContent = examSeason.label; });
document.querySelectorAll("[data-footer-season]").forEach((node) => { node.textContent = `сезон ${examSeason.label}`; });

const draft = readVersioned(storageKeys.trajectoryDraft, null);
if (draft?.profile) {
  profile = { ...defaultProfile, ...draft.profile };
  profileStepIndex = Math.min(7, Math.max(0, Number(draft.profileStepIndex) || 0));
  resumeNote.hidden = false;
  startButton.textContent = "Продолжить траекторию";
}

const savedAnswers = readVersioned(storageKeys.diagnosticAnswers, null);
if (savedAnswers?.subjectId === profile.subjectId && savedAnswers?.examTypeId === profile.examTypeId) {
  diagnosticAnswers = savedAnswers.answers || {};
}

const savedResult = readVersioned(storageKeys.trajectoryResult, null);
if (savedResult?.subjectId === profile.subjectId && savedResult?.examTypeId === profile.examTypeId) {
  result = savedResult;
  startButton.textContent = "Открыть сохранённый результат";
}

const profileSteps = [
  { key: "examTypeId", title: "Какой экзамен планируете сдавать?", help: "Для ОГЭ и ЕГЭ используются разные шкалы результата.", options: () => examTypes },
  { key: "classValue", title: "В каком классе ученик сейчас?", help: "Показываем только классы, соответствующие выбранному экзамену.", options: () => classes.filter((item) => examById(profile.examTypeId)?.classes.includes(item.value)), compact: true },
  { key: "subjectId", title: "По какому предмету строим траекторию?", help: "В мини-диагностике будет 8 вопросов выбранного направления.", options: () => subjects },
  { key: "currentValue", title: "Какой текущий результат?", help: "Если точного результата нет, используем ответы мини-диагностики как ориентир.", custom: "current" },
  { key: "targetValue", title: "К какому результату хотите прийти?", help: "Это учебная цель, а не гарантированный прогноз результата.", custom: "target" },
  { key: "goalId", title: "Какая основная цель подготовки?", help: "Цель помогает определить интенсивность и формат маршрута.", options: () => targetGoals },
  { key: "hours", title: "Сколько времени есть на подготовку в неделю?", help: "Учитывайте занятия и самостоятельную практику.", options: () => bookingOptions.timeCommitments, compact: true },
  { key: "format", title: "Какой формат предпочтительнее?", help: "Рекомендацию можно изменить после получения результата.", options: () => bookingOptions.formats }
];

function saveDraft() {
  writeVersioned(storageKeys.trajectoryDraft, { profile, profileStepIndex });
}

function choiceMarkup(step, options) {
  return `<div class="choice-grid ${step.compact ? "compact" : ""}" role="radiogroup" aria-label="${escapeHtml(step.title)}">
    ${options.map((option, index) => {
      const value = step.key === "hours" ? option.hours : (option.value ?? option.id);
      const selected = String(profile[step.key]) === String(value);
      return `<button class="choice-button ${selected ? "is-selected" : ""}" type="button" role="radio" aria-checked="${selected}" data-choice-value="${escapeHtml(value)}" tabindex="${selected || (!profile[step.key] && index === 0) ? 0 : -1}">${escapeHtml(option.label)}</button>`;
    }).join("")}
  </div>`;
}

function currentMarkup() {
  const isOge = profile.examTypeId === "oge";
  const unknown = profile.currentValue === "unknown";
  return `<div class="number-field">
    <label for="current-value">${isOge ? "Текущая отметка от 2 до 5" : "Текущий балл от 0 до 100"}</label>
    <input id="current-value" name="current-value" type="number" min="${isOge ? 2 : 0}" max="${isOge ? 5 : 100}" step="1" value="${unknown ? "" : escapeHtml(profile.currentValue)}" ${unknown ? "disabled" : ""} inputmode="numeric">
  </div>
  <label class="unknown-toggle"><input type="checkbox" data-current-unknown ${unknown ? "checked" : ""}> Не знаю текущий результат</label>`;
}

function targetMarkup() {
  if (profile.examTypeId === "oge") {
    return choiceMarkup({ ...profileSteps[profileStepIndex], compact: true }, [3, 4, 5].map((value) => ({ value, label: `Оценка ${value}` })));
  }
  const chips = [60, 70, 80, 90].map((value) => ({ value, label: `${value}+` }));
  return `${choiceMarkup({ ...profileSteps[profileStepIndex], compact: true }, chips)}
    <div class="number-field">
      <label for="target-value">Или укажите точную учебную цель от 50 до 100</label>
      <input id="target-value" name="target-value" type="number" min="50" max="100" step="1" value="${escapeHtml(profile.targetValue)}" inputmode="numeric">
    </div>`;
}

function profileValueText(key) {
  if (key === "examTypeId") return valueLabel(examTypes, profile[key]);
  if (key === "classValue") return profile[key] ? `${profile[key]} класс` : "Не выбрано";
  if (key === "subjectId") return valueLabel(subjects, profile[key]);
  if (key === "currentValue") return profile[key] === "unknown" ? "Не знаю" : profile[key] ? (profile.examTypeId === "oge" ? `оценка ${profile[key]}` : `${profile[key]} баллов`) : "Не указано";
  if (key === "targetValue") return profile[key] ? (profile.examTypeId === "oge" ? `оценка ${profile[key]}` : `${profile[key]}+ баллов`) : "Не указано";
  if (key === "goalId") return valueLabel(targetGoals, profile[key]);
  if (key === "hours") return valueLabel(bookingOptions.timeCommitments, profile[key], "hours");
  if (key === "format") return valueLabel(bookingOptions.formats, profile[key]);
  return "Не выбрано";
}

function renderProfileSummary() {
  profileSummary.innerHTML = `<h2>Ваш маршрут</h2><dl class="summary-list">
    ${profileSteps.map((step) => `<div><dt>${escapeHtml(step.title.replace("?", ""))}</dt><dd>${escapeHtml(profileValueText(step.key))}</dd></div>`).join("")}
  </dl>`;
}

function bindChoiceButtons() {
  const buttons = [...profileFieldset.querySelectorAll("[data-choice-value]")];
  buttons.forEach((button, index) => {
    button.addEventListener("click", () => {
      const step = profileSteps[profileStepIndex];
      profile[step.key] = button.dataset.choiceValue;
      if (step.key === "examTypeId") {
        const allowedClasses = examById(profile.examTypeId)?.classes || [];
        if (!allowedClasses.includes(Number(profile.classValue))) profile.classValue = "";
        profile.currentValue = "";
        profile.targetValue = "";
      }
      saveDraft();
      renderProfileStep();
    });
    button.addEventListener("keydown", (event) => {
      if (!["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp"].includes(event.key)) return;
      event.preventDefault();
      const direction = event.key === "ArrowRight" || event.key === "ArrowDown" ? 1 : -1;
      buttons[(index + direction + buttons.length) % buttons.length]?.focus();
    });
  });
}

function bindCustomProfileFields() {
  const currentInput = profileFieldset.querySelector("#current-value");
  const unknownInput = profileFieldset.querySelector("[data-current-unknown]");
  currentInput?.addEventListener("input", () => {
    profile.currentValue = currentInput.value;
    saveDraft();
    renderProfileSummary();
  });
  unknownInput?.addEventListener("change", () => {
    profile.currentValue = unknownInput.checked ? "unknown" : "";
    saveDraft();
    renderProfileStep();
  });
  const targetInput = profileFieldset.querySelector("#target-value");
  targetInput?.addEventListener("input", () => {
    profile.targetValue = targetInput.value;
    profileFieldset.querySelectorAll("[data-choice-value]").forEach((button) => {
      const selected = button.dataset.choiceValue === targetInput.value;
      button.classList.toggle("is-selected", selected);
      button.setAttribute("aria-checked", String(selected));
    });
    saveDraft();
    renderProfileSummary();
  });
}

function renderProfileStep() {
  const step = profileSteps[profileStepIndex];
  profileCount.textContent = `Шаг ${profileStepIndex + 1} из ${profileSteps.length}`;
  profileProgress.style.width = `${((profileStepIndex + 1) / profileSteps.length) * 100}%`;
  profileError.textContent = "";
  profileBack.disabled = profileStepIndex === 0;
  profileNext.textContent = profileStepIndex === profileSteps.length - 1 ? "Перейти к вопросам" : "Далее";
  const content = step.custom === "current" ? currentMarkup() : step.custom === "target" ? targetMarkup() : choiceMarkup(step, step.options());
  profileFieldset.innerHTML = `<legend>${escapeHtml(step.title)}</legend><p class="question-help">${escapeHtml(step.help)}</p>${content}`;
  bindChoiceButtons();
  bindCustomProfileFields();
  renderProfileSummary();
  profileFieldset.querySelector("button, input")?.focus({ preventScroll: true });
}

function validateProfileStep() {
  const step = profileSteps[profileStepIndex];
  const value = profile[step.key];
  if (value === "" || value == null) return "Выберите или укажите ответ, чтобы продолжить";
  if (step.key === "currentValue" && value !== "unknown") {
    const exam = examById(profile.examTypeId);
    if (Number(value) < exam.currentMin || Number(value) > exam.currentMax) return `Укажите значение от ${exam.currentMin} до ${exam.currentMax}`;
  }
  if (step.key === "targetValue") {
    const exam = examById(profile.examTypeId);
    if (Number(value) < exam.targetMin || Number(value) > exam.targetMax) return `Укажите цель от ${exam.targetMin} до ${exam.targetMax}`;
  }
  return "";
}

startButton.addEventListener("click", () => {
  if (result) {
    selectedTeacherId = readVersioned(storageKeys.selectedTeacher, result.recommendedTeacherIds[0] || "");
    selectedTariffId = readVersioned(storageKeys.selectedTariff, result.recommendedTariffId);
    selectedSlotId = readVersioned(storageKeys.selectedSlot, result.recommendedSlots[0] || "");
    setView("result");
    renderResult();
    return;
  }
  setView("profile");
  renderProfileStep();
});

profileBack.addEventListener("click", () => {
  if (profileStepIndex === 0) return;
  profileStepIndex -= 1;
  saveDraft();
  renderProfileStep();
});

profileForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const error = validateProfileStep();
  if (error) {
    profileError.textContent = error;
    return;
  }
  if (profileStepIndex < profileSteps.length - 1) {
    profileStepIndex += 1;
    saveDraft();
    renderProfileStep();
    return;
  }
  questions = selectDiagnosticQuestions(profile.subjectId, profile.examTypeId);
  diagnosticIndex = 0;
  saveDraft();
  setView("diagnostic");
  renderDiagnostic();
});

function renderDiagnostic() {
  if (!questions.length) questions = selectDiagnosticQuestions(profile.subjectId, profile.examTypeId);
  const question = questions[diagnosticIndex];
  const topicLabel = diagnosticTopics[profile.subjectId]?.find((topic) => topic.id === question.topic)?.label || question.topic;
  const difficultyLabel = { basic: "Базовый", medium: "Средний", advanced: "Повышенный" }[question.difficulty];
  diagnosticCount.textContent = `Вопрос ${diagnosticIndex + 1} из ${questions.length}`;
  diagnosticProgress.style.width = `${((diagnosticIndex + 1) / questions.length) * 100}%`;
  answeredCount.textContent = String(Object.keys(diagnosticAnswers).filter((id) => questions.some((item) => item.id === id)).length);
  diagnosticError.textContent = "";
  diagnosticNext.textContent = diagnosticIndex === questions.length - 1 ? "Получить результат" : "Следующий вопрос";
  diagnosticQuestion.innerHTML = `<div class="diagnostic-meta"><span>${escapeHtml(topicLabel)}</span><span>${difficultyLabel}</span></div>
    <fieldset><legend class="diagnostic-prompt">${escapeHtml(question.prompt)}</legend>
      <div class="choice-grid" role="radiogroup" aria-label="Варианты ответа">
        ${question.answerOptions.map((option, index) => {
          const selected = Number(diagnosticAnswers[question.id]) === index;
          return `<button class="choice-button ${selected ? "is-selected" : ""}" type="button" role="radio" aria-checked="${selected}" data-answer-index="${index}" tabindex="${selected || (diagnosticAnswers[question.id] == null && index === 0) ? 0 : -1}">${escapeHtml(option)}</button>`;
        }).join("")}
      </div>
    </fieldset>`;
  const buttons = [...diagnosticQuestion.querySelectorAll("[data-answer-index]")];
  buttons.forEach((button, index) => {
    button.addEventListener("click", () => {
      diagnosticAnswers[question.id] = Number(button.dataset.answerIndex);
      writeVersioned(storageKeys.diagnosticAnswers, { subjectId: profile.subjectId, examTypeId: profile.examTypeId, answers: diagnosticAnswers });
      renderDiagnostic();
    });
    button.addEventListener("keydown", (event) => {
      if (!["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp"].includes(event.key)) return;
      event.preventDefault();
      const direction = event.key === "ArrowRight" || event.key === "ArrowDown" ? 1 : -1;
      buttons[(index + direction + buttons.length) % buttons.length]?.focus();
    });
  });
  diagnosticQuestion.querySelector("button")?.focus({ preventScroll: true });
}

diagnosticBack.addEventListener("click", () => {
  if (diagnosticIndex === 0) {
    profileStepIndex = profileSteps.length - 1;
    saveDraft();
    setView("profile");
    renderProfileStep();
    return;
  }
  diagnosticIndex -= 1;
  renderDiagnostic();
});

diagnosticForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const question = questions[diagnosticIndex];
  if (diagnosticAnswers[question.id] == null) {
    diagnosticError.textContent = "Выберите один вариант ответа";
    return;
  }
  if (diagnosticIndex < questions.length - 1) {
    diagnosticIndex += 1;
    renderDiagnostic();
    return;
  }
  result = calculateTrajectory(profile, diagnosticAnswers);
  writeVersioned(storageKeys.trajectoryResult, result);
  selectedTeacherId = result.recommendedTeacherIds[0] || "";
  selectedTariffId = result.recommendedTariffId;
  selectedSlotId = result.recommendedSlots.find((slotId) => slotById(slotId)?.teacherId === selectedTeacherId) || result.recommendedSlots[0] || "";
  writeVersioned(storageKeys.selectedTeacher, selectedTeacherId);
  writeVersioned(storageKeys.selectedTariff, selectedTariffId);
  writeVersioned(storageKeys.selectedSlot, selectedSlotId);
  setView("result");
  renderResult();
});

function placesLabel(value) {
  const mod100 = value % 100;
  const mod10 = value % 10;
  if (mod100 >= 11 && mod100 <= 14) return `${value} мест`;
  if (mod10 === 1) return `${value} место`;
  if (mod10 >= 2 && mod10 <= 4) return `${value} места`;
  return `${value} мест`;
}

const dateFormatter = new Intl.DateTimeFormat("ru-RU", { weekday: "short", day: "numeric", month: "long" });
const timeFormatter = new Intl.DateTimeFormat("ru-RU", { hour: "2-digit", minute: "2-digit" });

function slotText(slot) {
  const date = new Date(slot.startAt);
  return { date: dateFormatter.format(date), time: timeFormatter.format(date) };
}

function currentTeacherSlots() {
  return scheduleSlots
    .filter((slot) => slot.teacherId === selectedTeacherId && new Date(slot.startAt) > new Date())
    .filter((slot) => profile.format === "either" || slot.format === profile.format)
    .sort((a, b) => new Date(a.startAt) - new Date(b.startAt))
    .slice(0, 5);
}

function renderTeacherCard(teacher) {
  const selected = teacher.id === selectedTeacherId;
  const subject = subjectById(teacher.subjectId);
  const weakMatches = result.weakTopics.filter((topic) => teacher.strongTopics.includes(topic.id)).map((topic) => topic.label);
  return `<article class="teacher-choice ${selected ? "is-selected" : ""}">
    <div class="teacher-main"><img src="${escapeHtml(teacher.image)}" alt="${escapeHtml(teacher.name)}"><div><small>${escapeHtml(subject.label)}</small><h3>${escapeHtml(teacher.name)}</h3><p>${escapeHtml(teacher.summary)}</p></div></div>
    <p class="fit-reason">${weakMatches.length ? `Подходит для работы с темами: ${escapeHtml(weakMatches.join(", "))}.` : "Подходит для системной работы с текущим разрывом до цели."}</p>
    <div class="card-actions"><button class="small-action" type="button" data-teacher-details="${teacher.id}">Подробнее</button><button class="small-action primary" type="button" data-select-teacher="${teacher.id}">${selected ? "Выбран" : "Выбрать время"}</button></div>
    <div class="teacher-details" data-teacher-detail-panel="${teacher.id}" hidden><ul>${teacher.details.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul><p>Формат: ${teacher.formats.map((id) => valueLabel(bookingOptions.formats, id)).join(", ")}.</p></div>
  </article>`;
}

function renderTariffCard(tariff, isAlternative = false) {
  const selected = tariff.id === selectedTariffId;
  const recommended = tariff.id === result.recommendedTariffId;
  return `<article class="tariff-choice ${selected ? "is-selected" : ""}">
    <span class="aside-kicker">${recommended ? "Рекомендуемый тариф" : isAlternative ? "Альтернативный вариант" : "Формат"}</span>
    <h3>${escapeHtml(tariff.name)}</h3><p class="tariff-price">${tariff.price.toLocaleString("ru-RU")} ₽ <small>/ месяц</small></p>
    <p>${recommended ? escapeHtml(getTariffReason(result)) : escapeHtml(tariff.intro)}</p>
    <ul>${tariff.features.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
    <button class="small-action primary" type="button" data-select-tariff="${tariff.id}">${selected ? "Выбран" : "Выбрать тариф"}</button>
  </article>`;
}

function renderResult() {
  if (!result) return;
  selectedTeacherId = readVersioned(storageKeys.selectedTeacher, selectedTeacherId || result.recommendedTeacherIds[0]);
  selectedTariffId = readVersioned(storageKeys.selectedTariff, selectedTariffId || result.recommendedTariffId);
  selectedSlotId = readVersioned(storageKeys.selectedSlot, selectedSlotId || result.recommendedSlots[0]);
  const subject = subjectById(result.subjectId);
  const exam = examById(result.examTypeId);
  const matchedTeachers = result.recommendedTeacherIds.map(teacherById).filter(Boolean);
  const recommendedTariff = tariffById(result.recommendedTariffId);
  const alternativeTariff = tariffById(result.alternativeTariffId);
  const slots = currentTeacherSlots();
  if (!slots.some((slot) => slot.id === selectedSlotId)) {
    selectedSlotId = slots[0]?.id || "";
    writeVersioned(storageKeys.selectedSlot, selectedSlotId);
  }
  const goalNote = profile.goalId === "strong-university" ? `<p class="disclaimer">МГУ, ВШЭ и МФТИ могут использоваться только как демонстрационные цели. Демонстрационный ориентир, не официальный проходной балл.</p>` : "";
  resultContent.innerHTML = `<div class="result-hero">
    <div class="result-heading"><p class="eyebrow">Ориентировочная траектория · ${escapeHtml(exam.label)} · ${escapeHtml(subject.label)}</p><h1 id="result-title">Ваш разрыв до цели стал понятнее</h1><p>${result.diagnostic.correct} из ${result.diagnostic.total} ответов в мини-диагностике. Ниже — рекомендуемый план при текущей учебной нагрузке.</p></div>
    <div class="result-score"><span>Предварительная оценка</span><strong>${escapeHtml(result.estimatedRange)}</strong><small>Уверенность: ${escapeHtml(result.confidence)}</small></div>
  </div>
  <div class="result-grid">
    <div class="result-metric"><span>Цель</span><strong>${escapeHtml(result.target)}</strong></div>
    <div class="result-metric"><span>Разрыв</span><strong>${escapeHtml(result.gap)}</strong></div>
    <div class="result-metric"><span>Готовность</span><strong>${escapeHtml(result.readiness)}</strong></div>
  </div>
  ${goalNote}
  <section class="result-section"><div class="section-title-row"><div><p class="eyebrow">Карта тем</p><h2>Что уже получается и что тормозит рост</h2></div><p>Рекомендуемая нагрузка: ${result.recommendedHoursPerWeek} ч/нед.</p></div>
    <div class="topic-columns"><div class="topic-box"><h3>Сильные темы</h3><div class="topic-tags">${result.strongTopics.map((topic) => `<span>${escapeHtml(topic.label)}</span>`).join("")}</div></div><div class="topic-box weak"><h3>Слабые темы</h3><div class="topic-tags">${result.weakTopics.map((topic) => `<span>${escapeHtml(topic.label)}</span>`).join("")}</div></div></div>
    <ul class="risk-list">${result.riskFactors.map((risk) => `<li>${escapeHtml(risk)}</li>`).join("")}</ul>
  </section>
  <section class="result-section"><div class="section-title-row"><div><p class="eyebrow">Визуальная траектория</p><h2>От текущего уровня к цели</h2></div><p>${escapeHtml(result.recommendedDuration)}</p></div>
    <div class="trajectory-line" aria-label="Траектория подготовки"><div class="trajectory-node"><small>Сейчас</small><strong>${escapeHtml(result.estimatedRange)}</strong></div><div class="trajectory-node"><small>Этап 1</small><strong>Закрыть базовые пробелы</strong></div><div class="trajectory-node"><small>Этап 2</small><strong>Стабилизировать результат</strong></div><div class="trajectory-node"><small>Цель</small><strong>${escapeHtml(result.target)}</strong></div></div>
  </section>
  <section class="result-section"><div class="section-title-row"><div><p class="eyebrow">Персональный план</p><h2>Учебный маршрут на ${escapeHtml(result.recommendedDuration)}</h2></div><p>Прогноз при текущей учебной нагрузке</p></div>
    <div class="plan-grid">${result.studyPlan.map((stage) => `<article class="plan-stage"><span>${escapeHtml(stage.period)}</span><h3>${escapeHtml(stage.goal)}</h3><dl><div><dt>Темы</dt><dd>${escapeHtml(stage.topics.join(", ") || "Базовый экзаменационный блок")}</dd></div><div><dt>Занятия</dt><dd>${stage.lessons} занятий</dd></div><div><dt>Практика</dt><dd>${escapeHtml(stage.practice)}</dd></div><div><dt>Контрольная точка</dt><dd>${escapeHtml(stage.checkpoint)}</dd></div><div><dt>Ожидаемый ориентир</dt><dd>${escapeHtml(stage.expected)}</dd></div></dl></article>`).join("")}</div>
    ${result.intensive ? `<p class="intensity-note">При текущей нагрузке цель требует корректировки или более интенсивного формата.</p><div class="alternative-list"><span>Увеличить часы</span><span>Изменить срок</span><span>Выбрать индивидуальный тариф</span><span>Начать с базового этапа</span></div>` : ""}
  </section>
  <section class="result-section"><div class="section-title-row"><div><p class="eyebrow">Преподаватель</p><h2>Кто поможет пройти маршрут</h2></div><p>1–2 варианта по предмету и слабым темам</p></div><div class="selection-grid">${matchedTeachers.map(renderTeacherCard).join("")}</div></section>
  <section class="result-section"><div class="section-title-row"><div><p class="eyebrow">Формат обучения</p><h2>Тариф под текущий разрыв</h2></div><p>Цены и наполнение сохранены с главной страницы</p></div><div class="selection-grid">${renderTariffCard(recommendedTariff)}${alternativeTariff ? renderTariffCard(alternativeTariff, true) : ""}</div></section>
  <section class="result-section"><div class="section-title-row"><div><p class="eyebrow">Ближайшие слоты</p><h2>Выберите время пробного урока</h2></div><p>${escapeHtml(teacherById(selectedTeacherId)?.name || "Преподаватель")}</p></div>
    <div class="slot-grid">${slots.map((slot) => { const formatted = slotText(slot); return `<button class="slot-button ${slot.id === selectedSlotId ? "is-selected" : ""}" type="button" data-select-slot="${slot.id}"><strong>${escapeHtml(formatted.date)}</strong><span>${escapeHtml(formatted.time)}</span><small>${valueLabel(bookingOptions.formats, slot.format)} · ${placesLabel(slot.places)}</small></button>`; }).join("") || "<p>Подходящие слоты появятся после уточнения формата с менеджером.</p>"}</div>
  </section>
  <div class="result-cta"><div><h2>Траектория готова к обсуждению</h2><p>В заявку уже переданы экзамен, цель, слабые темы, преподаватель, тариф и выбранное время.</p></div><button class="primary-action" type="button" data-open-booking ${!selectedTeacherId || !selectedTariffId || !selectedSlotId ? "disabled" : ""}>Оставить единую заявку</button></div>
  <p class="disclaimer">${escapeHtml(result.disclaimer)}</p>
  <div class="result-tools"><button class="ghost-action" type="button" data-edit-profile>Изменить ответы</button><button class="ghost-action" type="button" data-repeat-diagnostic>Пройти вопросы заново</button></div>`;
  bindResultActions();
}

function bindResultActions() {
  resultContent.querySelectorAll("[data-teacher-details]").forEach((button) => button.addEventListener("click", () => {
    const panel = resultContent.querySelector(`[data-teacher-detail-panel="${button.dataset.teacherDetails}"]`);
    panel.hidden = !panel.hidden;
    button.textContent = panel.hidden ? "Подробнее" : "Скрыть";
  }));
  resultContent.querySelectorAll("[data-select-teacher]").forEach((button) => button.addEventListener("click", () => {
    selectedTeacherId = button.dataset.selectTeacher;
    writeVersioned(storageKeys.selectedTeacher, selectedTeacherId);
    selectedSlotId = "";
    renderResult();
  }));
  resultContent.querySelectorAll("[data-select-tariff]").forEach((button) => button.addEventListener("click", () => {
    selectedTariffId = button.dataset.selectTariff;
    writeVersioned(storageKeys.selectedTariff, selectedTariffId);
    renderResult();
  }));
  resultContent.querySelectorAll("[data-select-slot]").forEach((button) => button.addEventListener("click", () => {
    selectedSlotId = button.dataset.selectSlot;
    writeVersioned(storageKeys.selectedSlot, selectedSlotId);
    renderResult();
  }));
  resultContent.querySelector("[data-open-booking]")?.addEventListener("click", openBooking);
  resultContent.querySelector("[data-edit-profile]")?.addEventListener("click", () => {
    profileStepIndex = 0;
    saveDraft();
    setView("profile");
    renderProfileStep();
  });
  resultContent.querySelector("[data-repeat-diagnostic]")?.addEventListener("click", () => {
    diagnosticAnswers = {};
    writeVersioned(storageKeys.diagnosticAnswers, { subjectId: profile.subjectId, examTypeId: profile.examTypeId, answers: {} });
    questions = selectDiagnosticQuestions(profile.subjectId, profile.examTypeId);
    diagnosticIndex = 0;
    setView("diagnostic");
    renderDiagnostic();
  });
}

function bookingSummaryMarkup() {
  const subject = subjectById(profile.subjectId);
  const teacher = teacherById(selectedTeacherId);
  const tariff = tariffById(selectedTariffId);
  const slot = slotById(selectedSlotId);
  const formatted = slot ? slotText(slot) : null;
  return `<div class="booking-summary"><div><span>Траектория</span><strong>${escapeHtml(examById(profile.examTypeId)?.label)} · ${escapeHtml(subject?.label)}</strong></div><div><span>Цель</span><strong>${escapeHtml(result.target)}</strong></div><div><span>Преподаватель</span><strong>${escapeHtml(teacher?.name)}</strong></div><div><span>Тариф</span><strong>${escapeHtml(tariff?.name)}</strong></div><div><span>Время</span><strong>${formatted ? `${escapeHtml(formatted.date)}, ${escapeHtml(formatted.time)}` : "Уточняется"}</strong></div><div><span>Слабые темы</span><strong>${escapeHtml(result.weakTopics.map((topic) => topic.label).join(", "))}</strong></div></div>`;
}

function openBooking() {
  previousFocus = document.activeElement;
  bookingStep = 0;
  bookingData = { studentName: "", parentName: "", phone: "", telegram: "", email: "", contactMethod: "phone" };
  writeVersioned(storageKeys.bookingDraft, { examTypeId: profile.examTypeId, subjectId: profile.subjectId, teacherId: selectedTeacherId, tariffId: selectedTariffId, slotId: selectedSlotId });
  renderBooking();
  bookingDialog.showModal();
  bookingDialog.querySelector("button, input")?.focus();
}

function closeBooking() {
  if (bookingDialog.open) bookingDialog.close();
  bookingData = {};
  previousFocus?.focus?.();
}

function renderBooking() {
  bookingError.textContent = "";
  bookingProgress.style.width = `${((bookingStep + 1) / 4) * 100}%`;
  bookingBack.disabled = bookingStep === 0;
  bookingNext.textContent = bookingStep === 3 ? "Подтвердить демо-заявку" : "Далее";
  bookingActions.hidden = false;
  if (bookingStep === 0) {
    bookingContent.innerHTML = `<h3>Проверьте выбранную траекторию</h3><p>Все параметры уже перенесены. Повторно выбирать их не нужно.</p>${bookingSummaryMarkup()}`;
  } else if (bookingStep === 1) {
    bookingContent.innerHTML = `<h3>Данные ученика</h3><p>Контактные данные пока не сохраняются.</p><div class="booking-fields"><label class="full">Имя ученика<input name="studentName" autocomplete="name" required value="${escapeHtml(bookingData.studentName)}"></label><label>Класс<input value="${escapeHtml(profile.classValue)} класс" readonly></label><label>Текущий результат<input value="${escapeHtml(profileValueText("currentValue"))}" readonly></label><label class="full">Учебная цель<input value="${escapeHtml(result.target)}" readonly></label></div>`;
  } else if (bookingStep === 2) {
    bookingContent.innerHTML = `<h3>Как связаться</h3><p>Укажите удобный контакт. Он попадёт только в подтверждённую демо-заявку.</p><div class="booking-fields"><label class="full">Имя родителя или ученика<input name="parentName" autocomplete="name" required value="${escapeHtml(bookingData.parentName)}"></label><label>Телефон<input name="phone" inputmode="tel" autocomplete="tel" placeholder="+7 900 000-00-00" value="${escapeHtml(bookingData.phone)}"></label><label>Telegram<input name="telegram" placeholder="@username" value="${escapeHtml(bookingData.telegram)}"></label><label>Email<input name="email" type="email" autocomplete="email" placeholder="name@example.ru" value="${escapeHtml(bookingData.email)}"></label><label>Предпочтительный способ<select name="contactMethod">${bookingOptions.contactMethods.map((item) => `<option value="${item.id}" ${item.id === bookingData.contactMethod ? "selected" : ""}>${escapeHtml(item.label)}</option>`).join("")}</select></label><p class="contact-note">Достаточно заполнить один контакт: телефон, Telegram или email.</p></div>`;
  } else {
    bookingContent.innerHTML = `<h3>Подтверждение</h3><p>Проверьте итог. Это локальная демонстрационная заявка, данные никуда не отправляются.</p>${bookingSummaryMarkup()}<label class="consent-row"><input name="consent" type="checkbox" required> Подтверждаю сохранение этой демо-заявки локально в браузере и согласен на обратную связь в рабочей версии продукта.</label>`;
  }
}

function collectBookingStep() {
  if (bookingStep === 1) {
    const input = bookingForm.elements.studentName;
    if (!input.value.trim()) return "Укажите имя ученика";
    bookingData.studentName = input.value.trim();
  }
  if (bookingStep === 2) {
    const fields = bookingForm.elements;
    if (!fields.parentName.value.trim()) return "Укажите имя родителя или ученика";
    if (!fields.phone.value.trim() && !fields.telegram.value.trim() && !fields.email.value.trim()) return "Укажите хотя бы один способ связи";
    if (fields.email.value && !fields.email.checkValidity()) return "Проверьте формат email";
    bookingData = {
      ...bookingData,
      parentName: fields.parentName.value.trim(),
      phone: fields.phone.value.trim(),
      telegram: fields.telegram.value.trim(),
      email: fields.email.value.trim(),
      contactMethod: fields.contactMethod.value
    };
  }
  if (bookingStep === 3 && !bookingForm.elements.consent.checked) return "Подтвердите согласие перед сохранением";
  return "";
}

bookingForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const error = collectBookingStep();
  if (error) {
    bookingError.textContent = error;
    return;
  }
  if (bookingStep < 3) {
    bookingStep += 1;
    renderBooking();
    bookingContent.querySelector("input, select, button")?.focus();
    return;
  }
  bookingNext.disabled = true;
  try {
    const record = await bookingAdapter.submit({
      trajectory: {
        examTypeId: profile.examTypeId,
        subjectId: profile.subjectId,
        classValue: Number(profile.classValue),
        currentValue: profile.currentValue,
        target: result.target,
        weakTopics: result.weakTopics.map((topic) => topic.label),
        summary: `${result.readiness}; разрыв ${result.gap}; план ${result.recommendedDuration}`
      },
      teacherId: selectedTeacherId,
      tariffId: selectedTariffId,
      slotId: selectedSlotId,
      ...bookingData
    });
    const teacher = teacherById(record.teacherId);
    const tariff = tariffById(record.tariffId);
    const slot = slotById(record.slotId);
    const formatted = slotText(slot);
    bookingContent.innerHTML = `<div class="booking-success"><span class="success-mark">✓</span><h3>Демо-заявка сохранена</h3><p>${escapeHtml(subjectById(profile.subjectId).label)} · ${escapeHtml(teacher.name)} · ${escapeHtml(formatted.date)}, ${escapeHtml(formatted.time)} · тариф «${escapeHtml(tariff.name)}».</p><p>Краткий план: ${escapeHtml(record.trajectory.summary)}. В рабочей версии менеджер свяжется выбранным способом.</p><div class="card-actions"><a class="primary-action" href="../cabinet/">Открыть кабинет ученика</a><button class="ghost-action" type="button" data-success-close>Закрыть</button></div></div>`;
    bookingActions.hidden = true;
    bookingProgress.style.width = "100%";
    bookingError.textContent = "";
    bookingContent.querySelector("[data-success-close]").addEventListener("click", closeBooking);
    liveRegion.textContent = `Демо-заявка ${record.id} сохранена`;
  } catch (submitError) {
    bookingError.textContent = submitError.message;
    bookingNext.disabled = false;
  }
});

bookingBack.addEventListener("click", () => {
  if (bookingStep === 0) return;
  bookingStep -= 1;
  renderBooking();
});
document.querySelector("[data-booking-close]").addEventListener("click", closeBooking);
bookingDialog.addEventListener("cancel", (event) => { event.preventDefault(); closeBooking(); });
bookingDialog.addEventListener("click", (event) => { if (event.target === bookingDialog) closeBooking(); });

window.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && event.target?.matches?.("[role=radio]")) event.target.click();
});
