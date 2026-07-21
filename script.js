import { examSeason } from "./data/config.js";
import { classes, studentStories, subjects, tariffs, teachers } from "./data/product-data.js";

const escapeHtml = (value) => String(value ?? "")
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#039;");

const subjectName = (id) => subjects.find((subject) => subject.id === id)?.label || id;

function renderTeachers() {
  const grid = document.querySelector("[data-teacher-grid]");
  if (!grid) return;
  grid.innerHTML = teachers.map((teacher) => `<article class="teacher-card">
    <img class="teacher-photo" src="${escapeHtml(teacher.landingImage)}" alt="${escapeHtml(teacher.name)}">
    <div><small>${escapeHtml(subjectName(teacher.subjectId))}</small><h3>${escapeHtml(teacher.name)}</h3><p>${escapeHtml(teacher.summary)}</p>
      <details><summary>Узнать подробнее</summary><div class="teacher-more"><div class="teacher-stats">${teacher.stats.map((stat) => `<span><b>${escapeHtml(stat.value)}</b> ${escapeHtml(stat.label)}</span>`).join("")}</div><ul>${teacher.details.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul></div></details>
    </div>
  </article>`).join("");
}

function renderStories() {
  const grid = document.querySelector("[data-story-grid]");
  if (!grid) return;
  grid.innerHTML = studentStories.map((story, index) => `<article class="story-card ${index > 3 ? "is-hidden" : ""}">
    <img src="${escapeHtml(story.image)}" alt="${escapeHtml(story.name)}"><div><h3>${escapeHtml(story.name)}</h3><small>${escapeHtml(story.exam)}</small><p class="score"><span>${escapeHtml(story.scoreFrom)}</span><b>→</b><strong>${escapeHtml(story.scoreTo)}</strong></p></div><p>«${escapeHtml(story.quote)}»</p>
  </article>`).join("");
}

function renderTariffs() {
  const grid = document.querySelector("[data-tariff-grid]");
  if (!grid) return;
  const icons = { base: "plane", standard: "star", premium: "crown" };
  grid.innerHTML = tariffs.map((tariff) => `<article class="tariff-card ${tariff.id === "standard" ? "featured active" : ""}" data-plan="${escapeHtml(tariff.name)}">
    ${tariff.id === "standard" ? '<span class="badge">Популярный выбор</span>' : ""}<span class="tariff-icon ${icons[tariff.id]}"><svg><use href="#icon-${icons[tariff.id]}"></use></svg></span><h3>${escapeHtml(tariff.name)}</h3><p class="tariff-intro">${escapeHtml(tariff.intro)}</p><p class="price">${tariff.price.toLocaleString("ru-RU")} ₽ <small>/ месяц</small></p><ul>${tariff.features.map((feature) => `<li>${escapeHtml(feature)}</li>`).join("")}</ul><button class="btn primary plan-button" type="button">Выбрать тариф</button>
  </article>`).join("");
}

function fillCatalogSelects() {
  document.querySelectorAll("[data-subject-select]").forEach((select) => {
    const placeholder = select.dataset.placeholder || "Выберите предмет";
    select.innerHTML = `<option value="">${escapeHtml(placeholder)}</option>${subjects.map((subject) => `<option value="${subject.id}">${escapeHtml(subject.label)}</option>`).join("")}`;
  });
  document.querySelectorAll("[data-class-select]").forEach((select) => {
    select.innerHTML = `<option value="">Выберите класс</option>${classes.map((item) => `<option value="${item.value}">${escapeHtml(item.label)}</option>`).join("")}`;
  });
}

document.documentElement.dataset.examSeason = examSeason.label;
renderTeachers();
renderStories();
renderTariffs();
fillCatalogSelects();

const tariffCards = document.querySelectorAll(".tariff-card");
const planButtons = document.querySelectorAll(".plan-button");
const leadRequestForm = document.querySelector("#lead-request-form");
const details = document.querySelectorAll(".faq details");
const teacherDetails = document.querySelectorAll(".teacher-card details");
const storyGrid = document.querySelector(".story-grid");
const reviewsMoreButton = document.querySelector(".reviews-more");
const trialModal = document.querySelector("#trial-modal");
const openTrialButtons = document.querySelectorAll("[data-open-trial]");
const closeTrialButtons = document.querySelectorAll("[data-close-trial]");
const trialForm = document.querySelector("#trial-modal-form");
const trialQuestion = document.querySelector(".trial-question");
const trialSuccess = document.querySelector(".trial-success");
const trialControls = document.querySelector(".trial-controls");
const trialSteps = [...document.querySelectorAll(".trial-step")];
const trialProgress = [...document.querySelectorAll(".trial-progress span")];
const trialBack = document.querySelector("[data-trial-back]");
const trialNext = document.querySelector("[data-trial-next]");
const mobileNav = document.querySelector("[data-mobile-nav]");
const mobileNavToggle = document.querySelector("[data-mobile-nav-toggle]");

let trialStepIndex = 0;
let previousFocus = null;

function focusCurrentTrialField() {
  const field = trialSteps[trialStepIndex]?.querySelector("input, select, textarea");
  window.setTimeout(() => field?.focus({ preventScroll: true }), 80);
}

function updateTrialStep() {
  trialSteps.forEach((step, index) => step.classList.toggle("active", index === trialStepIndex));
  trialProgress.forEach((item, index) => {
    item.classList.toggle("active", index === trialStepIndex);
    item.classList.toggle("done", index < trialStepIndex);
  });
  if (trialBack) trialBack.disabled = trialStepIndex === 0;
  if (trialNext) trialNext.textContent = trialStepIndex === trialSteps.length - 1 ? "Отправить заявку" : "Далее";
}

function resetTrialFlow() {
  trialStepIndex = 0;
  trialForm?.reset();
  trialQuestion?.classList.remove("is-hidden");
  trialSuccess?.classList.remove("is-visible");
  trialControls?.classList.remove("is-hidden");
  updateTrialStep();
}

function openTrialModal() {
  if (!trialModal) return;
  previousFocus = document.activeElement;
  resetTrialFlow();
  trialModal.classList.add("is-open");
  trialModal.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");
  focusCurrentTrialField();
}

function closeTrialModal() {
  if (!trialModal) return;
  trialModal.classList.remove("is-open");
  trialModal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("modal-open");
  previousFocus?.focus?.({ preventScroll: true });
}

function setMobileNav(open) {
  if (!mobileNav || !mobileNavToggle) return;
  mobileNav.hidden = !open;
  mobileNavToggle.setAttribute("aria-expanded", String(open));
  mobileNavToggle.setAttribute("aria-label", open ? "Закрыть меню" : "Открыть меню");
  document.body.classList.toggle("mobile-nav-open", open);
}

function validateCurrentTrialStep() {
  const field = trialSteps[trialStepIndex]?.querySelector("input, select, textarea");
  if (!field || field.checkValidity()) return true;
  field.reportValidity();
  return false;
}

planButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const card = button.closest(".tariff-card");
    tariffCards.forEach((item) => item.classList.remove("active"));
    card.classList.add("active");
    const subject = leadRequestForm?.elements.subject;
    if (subject && subject.selectedIndex === 0) subject.focus({ preventScroll: true });
    document.querySelector("#lead")?.scrollIntoView({ behavior: "smooth", block: "start" });
  });
});

details.forEach((item) => item.addEventListener("toggle", () => {
  if (item.open) details.forEach((other) => { if (other !== item) other.open = false; });
}));
teacherDetails.forEach((item) => item.addEventListener("toggle", () => {
  if (item.open) teacherDetails.forEach((other) => { if (other !== item) other.open = false; });
}));
openTrialButtons.forEach((button) => button.addEventListener("click", (event) => { event.preventDefault(); openTrialModal(); }));
closeTrialButtons.forEach((button) => button.addEventListener("click", closeTrialModal));

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && trialModal?.classList.contains("is-open")) closeTrialModal();
  if (event.key === "Escape" && !mobileNav?.hidden) {
    setMobileNav(false);
    mobileNavToggle?.focus({ preventScroll: true });
  }
});

mobileNavToggle?.addEventListener("click", () => setMobileNav(mobileNav.hidden));
mobileNav?.addEventListener("click", (event) => {
  if (event.target.closest("a")) setMobileNav(false);
});

trialBack?.addEventListener("click", () => {
  if (trialStepIndex === 0) return;
  trialStepIndex -= 1;
  updateTrialStep();
  focusCurrentTrialField();
});
trialNext?.addEventListener("click", () => {
  if (!validateCurrentTrialStep()) return;
  if (trialStepIndex < trialSteps.length - 1) {
    trialStepIndex += 1;
    updateTrialStep();
    focusCurrentTrialField();
    return;
  }
  trialForm?.requestSubmit();
});
trialForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  if (!validateCurrentTrialStep()) return;
  trialQuestion?.classList.add("is-hidden");
  trialControls?.classList.add("is-hidden");
  trialSuccess?.classList.add("is-visible");
  trialProgress.forEach((item) => { item.classList.remove("active"); item.classList.add("done"); });
});

reviewsMoreButton?.addEventListener("click", () => {
  storyGrid?.classList.add("expanded");
  reviewsMoreButton.textContent = "Отзывы раскрыты";
  reviewsMoreButton.disabled = true;
});

leadRequestForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  const button = leadRequestForm.querySelector(".form-submit");
  const previous = button.textContent;
  button.textContent = "Заявка сохранена (демо)";
  button.disabled = true;
  window.setTimeout(() => { button.textContent = previous; button.disabled = false; }, 2200);
});
