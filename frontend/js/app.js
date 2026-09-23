const challenges = [
  {
    id: 1,
    company: "Kaspi Lab",
    mark: "K",
    title: "Чат-бот, который понимает клиентов",
    category: "ИИ и данные",
    level: "Средний",
    duration: "1–3 месяца",
    skills: ["Python", "API", "NLP"],
    description: "Создайте умного помощника: ответы на частые вопросы, сбор контактов и передача сложных обращений менеджеру.",
    result: "Интерактивный прототип чат-бота и документация проекта."
  },
  {
    id: 2,
    company: "Magnum",
    mark: "M",
    title: "Прогноз спроса для локального ритейла",
    category: "ИИ и данные",
    level: "Продвинутый",
    duration: "1–3 месяца",
    skills: ["Python", "ML", "SQL"],
    description: "Помогите магазинам точнее планировать закупки и сократить списания с помощью данных о продажах.",
    result: "Модель прогноза спроса и понятная панель с результатами."
  },
  {
    id: 3,
    company: "BilimLand",
    mark: "B",
    title: "Личный кабинет образовательной платформы",
    category: "Веб-разработка",
    level: "Средний",
    duration: "1–3 месяца",
    skills: ["HTML", "CSS", "JavaScript"],
    description: "Объедините прогресс обучения, расписание и обратную связь в одном удобном пространстве.",
    result: "Адаптивный интерфейс личного кабинета."
  },
  {
    id: 4,
    company: "Visit Almaty",
    mark: "A",
    title: "Мобильный гид по городским маршрутам",
    category: "Мобильные приложения",
    level: "Средний",
    duration: "3–6 месяцев",
    skills: ["Flutter", "API", "Figma"],
    description: "Разработайте приложение для знакомства с городом: интересные места, маршруты и рекомендации.",
    result: "Прототип приложения и сценарии городских маршрутов."
  },
  {
    id: 5,
    company: "Damu Med",
    mark: "D",
    title: "Новый опыт записи на приём",
    category: "Дизайн",
    level: "Начальный",
    duration: "До 1 месяца",
    skills: ["Figma", "UX Research"],
    description: "Исследуйте путь пациента и спроектируйте понятный интерфейс онлайн-записи к специалисту.",
    result: "Кликабельный прототип и результаты UX-исследования."
  },
  {
    id: 6,
    company: "Freedom",
    mark: "F",
    title: "Аналитика обратной связи с помощью ИИ",
    category: "ИИ и данные",
    level: "Продвинутый",
    duration: "1–3 месяца",
    skills: ["Python", "NLP", "SQL"],
    description: "Научите систему находить темы и тональность в отзывах, чтобы бизнес лучше слышал своих клиентов.",
    result: "Модель анализа отзывов и визуальный отчёт."
  }
];

const elements = {
  cards: document.querySelector("#cards"),
  empty: document.querySelector("#emptyState"),
  resultCount: document.querySelector("#resultCount"),
  navCount: document.querySelector("#navCount"),
  savedCount: document.querySelector("#savedCount"),
  search: document.querySelector("#searchInput"),
  skill: document.querySelector("#skillFilter"),
  level: document.querySelector("#levelFilter"),
  duration: document.querySelector("#durationFilter"),
  filters: document.querySelector("#filters"),
  tabs: document.querySelector("#categoryTabs"),
  modal: document.querySelector("#modalBackdrop"),
  modalContent: document.querySelector("#modalContent"),
  toast: document.querySelector("#toast"),
  sidebar: document.querySelector("#sidebar"),
  scrim: document.querySelector("#scrim")
};

let activeCategory = "Все";
let activeSection = "catalog";
let saved = JSON.parse(localStorage.getItem("ai-sana-saved") || "[]");
let toastTimer;

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;"
  })[character]);
}

function visibleChallenges() {
  const query = elements.search.value.trim().toLowerCase();
  return challenges.filter((challenge) => {
    const text = [challenge.title, challenge.company, challenge.description, ...challenge.skills].join(" ").toLowerCase();
    const matchesSearch = !query || text.includes(query);
    const matchesCategory = activeCategory === "Все" || challenge.category === activeCategory;
    const matchesSkill = !elements.skill.value || challenge.skills.includes(elements.skill.value);
    const matchesLevel = !elements.level.value || challenge.level === elements.level.value;
    const matchesDuration = !elements.duration.value || challenge.duration === elements.duration.value;
    const matchesSaved = activeSection !== "saved" || saved.includes(challenge.id);
    return matchesSearch && matchesCategory && matchesSkill && matchesLevel && matchesDuration && matchesSaved;
  });
}

function renderCards() {
  const items = visibleChallenges();
  elements.resultCount.textContent = items.length;
  elements.navCount.textContent = challenges.length;
  elements.savedCount.textContent = saved.length;
  elements.cards.innerHTML = items.map((challenge) => `
    <article class="card">
      <div class="card__top">
        <span class="company-logo">${escapeHtml(challenge.mark)}</span>
        <div class="company-meta"><b>${escapeHtml(challenge.company)}</b><small>Открыт приём откликов</small></div>
        <button class="bookmark ${saved.includes(challenge.id) ? "saved" : ""}" data-save="${challenge.id}" aria-label="${saved.includes(challenge.id) ? "Убрать из избранного" : "Добавить в избранное"}">${saved.includes(challenge.id) ? "♥" : "♡"}</button>
      </div>
      <span class="tag">${escapeHtml(challenge.category)}</span>
      <h3>${escapeHtml(challenge.title)}</h3>
      <p class="card__description">${escapeHtml(challenge.description)}</p>
      <div class="skills">${challenge.skills.map((skill) => `<span>${escapeHtml(skill)}</span>`).join("")}</div>
      <div class="card__details"><span>◷ ${escapeHtml(challenge.duration)}</span><span>▥ ${escapeHtml(challenge.level)}</span></div>
      <div class="card__footer"><span>● Заявка опубликована</span><button data-details="${challenge.id}">Подробнее ↗</button></div>
    </article>
  `).join("");
  elements.empty.classList.toggle("hidden", items.length !== 0);
}

function setSection(section) {
  activeSection = section;
  const isSaved = section === "saved";
  document.querySelector("#pageTitle").textContent = isSaved ? "Избранные заявки" : "Реальные задачи. Ваши решения.";
  document.querySelector("#pageSubtitle").textContent = isSaved ? "Проекты, к которым вы хотите вернуться." : "Находите задачи бизнеса, применяйте знания и создавайте то, что важно.";
  document.querySelector("#catalogTitle").firstChild.textContent = isSaved ? "Сохранённые проекты " : "Открытые заявки ";
  document.querySelector("#breadcrumb").textContent = isSaved ? "Избранное" : "Поиск заявок";
  document.querySelector("#hero").classList.toggle("hidden", isSaved);
  document.querySelectorAll("[data-section]").forEach((button) => button.classList.toggle("active", button.dataset.section === section));
  renderCards();
  document.querySelector("#catalog").scrollIntoView({ behavior: "smooth", block: "start" });
  closeMenu();
}

function toggleSaved(id) {
  saved = saved.includes(id) ? saved.filter((savedId) => savedId !== id) : [...saved, id];
  localStorage.setItem("ai-sana-saved", JSON.stringify(saved));
  renderCards();
  showToast(saved.includes(id) ? "Заявка добавлена в избранное" : "Заявка удалена из избранного");
}

function showDetails(id) {
  const challenge = challenges.find((item) => item.id === id);
  if (!challenge) return;
  elements.modalContent.innerHTML = `
    <p class="modal__company">${escapeHtml(challenge.company)} · ${escapeHtml(challenge.category)}</p>
    <h2 id="modalTitle">${escapeHtml(challenge.title)}</h2>
    <p class="modal__description">${escapeHtml(challenge.description)}</p>
    <div class="modal__grid">
      <div><b>Требуемые навыки</b><p>${challenge.skills.map(escapeHtml).join(", ")}</p></div>
      <div><b>Сложность и срок</b><p>${escapeHtml(challenge.level)} · ${escapeHtml(challenge.duration)}</p></div>
      <div><b>Ожидаемый результат</b><p>${escapeHtml(challenge.result)}</p></div>
      <div><b>Статус</b><p>Открыт приём откликов</p></div>
    </div>
    <button class="primary" data-coming>Откликнуться ↗</button>
  `;
  openModal();
}

function showComingSoon() {
  elements.modalContent.innerHTML = `
    <div class="coming-state"><span>✦</span><h2 id="modalTitle">Добавим на следующем этапе</h2><p>Сейчас готов чистый frontend без базы данных и авторизации. Эту функцию подключим постепенно вместе с backend.</p></div>
  `;
  openModal();
}

function openModal() {
  elements.modal.classList.remove("hidden");
  document.body.style.overflow = "hidden";
  document.querySelector("#modalClose").focus();
}

function closeModal() {
  elements.modal.classList.add("hidden");
  document.body.style.overflow = "";
}

function showToast(message) {
  clearTimeout(toastTimer);
  elements.toast.textContent = message;
  elements.toast.classList.remove("hidden");
  toastTimer = setTimeout(() => elements.toast.classList.add("hidden"), 2600);
}

function closeMenu() {
  elements.sidebar.classList.remove("open");
  elements.scrim.classList.remove("open");
}

document.addEventListener("click", (event) => {
  const saveButton = event.target.closest("[data-save]");
  const detailsButton = event.target.closest("[data-details]");
  const sectionButton = event.target.closest("[data-section]");
  const comingButton = event.target.closest("[data-coming]");
  const scrollButton = event.target.closest("[data-scroll]");
  if (saveButton) toggleSaved(Number(saveButton.dataset.save));
  if (detailsButton) showDetails(Number(detailsButton.dataset.details));
  if (sectionButton) setSection(sectionButton.dataset.section);
  if (comingButton) showComingSoon();
  if (scrollButton) { document.querySelector(`#${scrollButton.dataset.scroll}`).scrollIntoView({ behavior: "smooth" }); closeMenu(); }
});

elements.tabs.addEventListener("click", (event) => {
  const button = event.target.closest("[data-category]");
  if (!button) return;
  activeCategory = button.dataset.category;
  elements.tabs.querySelectorAll("button").forEach((item) => item.classList.toggle("active", item === button));
  renderCards();
});

[elements.search, elements.skill, elements.level, elements.duration].forEach((control) => control.addEventListener("input", renderCards));
document.querySelector("#clearFilters").addEventListener("click", () => {
  elements.search.value = ""; elements.skill.value = ""; elements.level.value = ""; elements.duration.value = ""; activeCategory = "Все";
  elements.tabs.querySelectorAll("button").forEach((button) => button.classList.toggle("active", button.dataset.category === "Все"));
  renderCards();
});
document.querySelector("#filterButton").addEventListener("click", () => elements.filters.classList.toggle("hidden"));
document.querySelector("#findProject").addEventListener("click", () => { document.querySelector("#catalog").scrollIntoView({ behavior: "smooth" }); elements.search.focus(); });
document.querySelector("#modalClose").addEventListener("click", closeModal);
elements.modal.addEventListener("click", (event) => { if (event.target === elements.modal) closeModal(); });
document.querySelector("#menuButton").addEventListener("click", () => { elements.sidebar.classList.add("open"); elements.scrim.classList.add("open"); });
elements.scrim.addEventListener("click", closeMenu);
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") { closeModal(); closeMenu(); }
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") { event.preventDefault(); elements.search.focus(); }
});

renderCards();
