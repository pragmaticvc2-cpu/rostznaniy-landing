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
const trialSteps = Array.from(document.querySelectorAll(".trial-step"));
const trialProgress = Array.from(document.querySelectorAll(".trial-progress span"));
const trialBack = document.querySelector("[data-trial-back]");
const trialNext = document.querySelector("[data-trial-next]");

let trialStepIndex = 0;
let previousFocus = null;

const focusCurrentTrialField = () => {
  const field = trialSteps[trialStepIndex]?.querySelector("input, select, textarea");
  window.setTimeout(() => field?.focus({ preventScroll: true }), 80);
};

const updateTrialStep = () => {
  trialSteps.forEach((step, index) => {
    step.classList.toggle("active", index === trialStepIndex);
  });

  trialProgress.forEach((item, index) => {
    item.classList.toggle("active", index === trialStepIndex);
    item.classList.toggle("done", index < trialStepIndex);
  });

  if (trialBack) {
    trialBack.disabled = trialStepIndex === 0;
  }

  if (trialNext) {
    trialNext.textContent = trialStepIndex === trialSteps.length - 1 ? "Отправить заявку" : "Далее";
  }
};

const resetTrialFlow = () => {
  trialStepIndex = 0;
  trialForm?.reset();
  trialQuestion?.classList.remove("is-hidden");
  trialSuccess?.classList.remove("is-visible");
  trialControls?.classList.remove("is-hidden");
  updateTrialStep();
};

const openTrialModal = () => {
  if (!trialModal) return;
  previousFocus = document.activeElement;
  resetTrialFlow();
  trialModal.classList.add("is-open");
  trialModal.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");
  focusCurrentTrialField();
};

const closeTrialModal = () => {
  if (!trialModal) return;
  trialModal.classList.remove("is-open");
  trialModal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("modal-open");
  previousFocus?.focus?.({ preventScroll: true });
};

const validateCurrentTrialStep = () => {
  const field = trialSteps[trialStepIndex]?.querySelector("input, select, textarea");
  if (!field) return true;
  if (!field.checkValidity()) {
    field.reportValidity();
    return false;
  }
  return true;
};

planButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const card = button.closest(".tariff-card");

    tariffCards.forEach((item) => item.classList.remove("active"));
    card.classList.add("active");

    const subject = leadRequestForm?.elements.subject;
    if (subject && subject.selectedIndex === 0) {
      subject.focus({ preventScroll: true });
    }

    document.querySelector("#lead")?.scrollIntoView({ behavior: "smooth", block: "start" });
  });
});

details.forEach((item) => {
  item.addEventListener("toggle", () => {
    if (!item.open) return;
    details.forEach((other) => {
      if (other !== item) other.open = false;
    });
  });
});

teacherDetails.forEach((item) => {
  item.addEventListener("toggle", () => {
    if (!item.open) return;
    teacherDetails.forEach((other) => {
      if (other !== item) other.open = false;
    });
  });
});

openTrialButtons.forEach((button) => {
  button.addEventListener("click", (event) => {
    event.preventDefault();
    openTrialModal();
  });
});

closeTrialButtons.forEach((button) => {
  button.addEventListener("click", closeTrialModal);
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && trialModal?.classList.contains("is-open")) {
    closeTrialModal();
  }
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
  trialProgress.forEach((item) => {
    item.classList.remove("active");
    item.classList.add("done");
  });
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

  window.setTimeout(() => {
    button.textContent = previous;
    button.disabled = false;
  }, 2200);
});
