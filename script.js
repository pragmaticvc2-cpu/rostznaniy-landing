const tariffCards = document.querySelectorAll(".tariff-card");
const planButtons = document.querySelectorAll(".plan-button");
const diagnosticForm = document.querySelector("#diagnostic-form");
const details = document.querySelectorAll(".faq details");
const storyGrid = document.querySelector(".story-grid");
const reviewsMoreButton = document.querySelector(".reviews-more");

planButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const card = button.closest(".tariff-card");

    tariffCards.forEach((item) => item.classList.remove("active"));
    card.classList.add("active");

    const subject = diagnosticForm?.elements.subject;
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

reviewsMoreButton?.addEventListener("click", () => {
  storyGrid?.classList.add("expanded");
  reviewsMoreButton.textContent = "Отзывы раскрыты";
  reviewsMoreButton.disabled = true;
});

diagnosticForm?.addEventListener("submit", (event) => {
  event.preventDefault();

  const button = diagnosticForm.querySelector(".form-submit");
  const previous = button.textContent;
  button.textContent = "Заявка сохранена (демо)";
  button.disabled = true;

  window.setTimeout(() => {
    button.textContent = previous;
    button.disabled = false;
  }, 2200);
});
