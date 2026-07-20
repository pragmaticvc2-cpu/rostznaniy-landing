import { examSeason } from "./config.js";

export const examTypes = [
  { id: "ege", label: "ЕГЭ", classes: [10, 11], currentMin: 0, currentMax: 100, targetMin: 50, targetMax: 100 },
  { id: "oge", label: "ОГЭ", classes: [8, 9], currentMin: 2, currentMax: 5, targetMin: 3, targetMax: 5 }
];

export const classes = [8, 9, 10, 11].map((value) => ({ id: `class-${value}`, value, label: `${value} класс` }));

export const subjects = [
  { id: "math", label: "Математика", shortLabel: "Математика", icon: "π" },
  { id: "russian", label: "Русский язык", shortLabel: "Русский", icon: "А" },
  { id: "english", label: "Английский язык", shortLabel: "Английский", icon: "EN" },
  { id: "social", label: "Обществознание", shortLabel: "Обществознание", icon: "§" },
  { id: "informatics", label: "Информатика", shortLabel: "Информатика", icon: "</>" }
];

export const teachers = [
  {
    id: "elena-morozova",
    name: "Елена Морозова",
    subjectId: "math",
    image: "../assets/teacher-elena-morozova.png",
    landingImage: "assets/teacher-elena-morozova.png",
    summary: "Эксперт ЕГЭ, 12 лет готовит к профильной математике. Ведет учеников от базовых тем до сложной второй части.",
    strongTopics: ["algebra", "functions", "geometry", "word-problems"],
    formats: ["group", "individual"],
    stats: [{ value: "48", label: "учеников 90+ за год" }, { value: "+27", label: "средний прирост баллов" }],
    details: ["Разбор типичных ошибок по пробникам", "Планы для разного стартового уровня", "Подготовка к задачам второй части"]
  },
  {
    id: "anna-belova",
    name: "Анна Белова",
    subjectId: "russian",
    image: "../assets/teacher-anna-belova.png",
    landingImage: "assets/teacher-anna-belova.png",
    summary: "Филолог МГУ, проверяет сочинения по критериям ФИПИ и учит писать сильную аргументацию.",
    strongTopics: ["spelling", "punctuation", "essay", "expression"],
    formats: ["group", "individual"],
    stats: [{ value: "96%", label: "учеников без потери баллов за композицию" }, { value: "310", label: "проверенных сочинений за сезон" }],
    details: ["Разбор сочинения по критериям", "Работа с речевыми ошибками", "Системная практика аргументации"]
  },
  {
    id: "mikhail-sokolov",
    name: "Михаил Соколов",
    subjectId: "english",
    image: "../assets/teacher-mikhail-sokolov.png",
    landingImage: "assets/teacher-mikhail-sokolov.png",
    summary: "Методист международных программ, прокачивает эссе, аудирование и устную часть до уверенного результата.",
    strongTopics: ["grammar", "vocabulary", "reading", "exam-format"],
    formats: ["group", "individual"],
    stats: [{ value: "42", label: "результата 85+ за год" }, { value: "2 раза", label: "в месяц устный тренинг" }],
    details: ["Структура письменных ответов", "Персональные карточки по лексике", "Тренировка устной части и тайминга"]
  },
  {
    id: "olga-kuznetsova",
    name: "Ольга Кузнецова",
    subjectId: "social",
    image: "../assets/teacher-olga-kuznetsova.png",
    landingImage: "assets/teacher-olga-kuznetsova.png",
    summary: "Кандидат юридических наук, разбирает право, экономику и эссе на понятных схемах и кейсах.",
    strongTopics: ["law", "economics", "politics", "social-relations"],
    formats: ["group", "individual"],
    stats: [{ value: "91", label: "средний балл сильной группы" }, { value: "120+", label: "авторских схем" }],
    details: ["Право и экономика через практические ситуации", "Разбор заданий с развернутым ответом", "Понятные схемы и кейсы"]
  },
  {
    id: "artem-lebedev",
    name: "Артем Лебедев",
    subjectId: "informatics",
    image: "../assets/teacher-artem-lebedev.png",
    landingImage: "assets/teacher-artem-lebedev.png",
    summary: "Олимпиадный тренер по программированию, готовит к Python, алгоритмам и задачам второй части.",
    strongTopics: ["logic", "algorithms", "python", "spreadsheets", "number-systems"],
    formats: ["group", "individual"],
    stats: [{ value: "39", label: "учеников 80+ за год" }, { value: "100%", label: "домашних с код-ревью" }],
    details: ["Понятные решения на Python", "Алгоритмы и задачи с файлами", "Персональный разбор кода"]
  }
];

export const tariffs = [
  {
    id: "base",
    name: "База",
    price: 4900,
    format: "group",
    intro: "Всё необходимое для уверенной подготовки",
    features: ["2 занятия в неделю в мини-группе", "Домашние задания с проверкой", "Доступ к материалам и записям", "Пробники 1 раз в месяц"]
  },
  {
    id: "standard",
    name: "Стандарт",
    price: 7900,
    format: "group",
    intro: "Оптимальный формат для высоких результатов",
    features: ["3 занятия в неделю в мини-группе", "Домашние задания с проверкой", "Доступ к материалам и записям", "Пробники 2 раза в месяц", "Разбор ошибок и консультации"]
  },
  {
    id: "premium",
    name: "Премиум",
    price: 12900,
    format: "individual",
    intro: "Максимальная поддержка и персональный подход",
    features: ["4 занятия в неделю индивидуально", "Персональный план подготовки", "Домашние задания с приоритетной проверкой", "Пробники каждую неделю", "Куратор и поддержка 24/7"]
  }
];

export const studentStories = [
  { id: "alina", name: "Алина", exam: "ЕГЭ по русскому языку", scoreFrom: "58", scoreTo: "89", image: "assets/avatar-alina-hq.png", quote: "Благодаря системной подготовке и поддержке преподавателя научилась писать сочинение и уверенно решать вторую часть. Очень довольна результатом!" },
  { id: "ilya", name: "Илья", exam: "ЕГЭ по математике (профиль)", scoreFrom: "64", scoreTo: "90", image: "assets/avatar-ilya-hq.png", quote: "Раньше не верил, что смогу написать профильную математику на 90+. Индивидуальный подход и постоянная практика сделали свое дело!" },
  { id: "maria", name: "Мария", exam: "ЕГЭ по обществознанию", scoreFrom: "71", scoreTo: "94", image: "assets/avatar-maria-hq.png", quote: "Разбор сложных тем и пробники помогли понять логику экзамена. Спасибо школе за уверенность и высокий результат!" },
  { id: "danil", name: "Данил", exam: "ОГЭ по информатике", scoreFrom: "оценка 3", scoreTo: "5", image: "assets/avatar-danil-hq.png", quote: "Куратор всегда был на связи, помогал с заданиями и объяснял понятно. Сдал ОГЭ на высокий балл и поступил в профильный класс!" },
  { id: "sofia", name: "София", exam: "ЕГЭ по английскому языку", scoreFrom: "66", scoreTo: "92", image: "assets/avatar-sofia-hq.png", quote: "Мне помогли выстроить понятный план и перестать бояться устной части. Пробники каждую неделю быстро показали прогресс." },
  { id: "nikita", name: "Никита", exam: "ЕГЭ по физике", scoreFrom: "57", scoreTo: "88", image: "assets/avatar-nikita-hq.png", quote: "На занятиях разобрали слабые темы и научили оформлять решения. К экзамену я уже понимал, где могу набрать максимум." }
];

export const diagnosticTopics = {
  math: [
    { id: "algebra", label: "Алгебра" }, { id: "functions", label: "Функции" }, { id: "probability", label: "Вероятность" },
    { id: "geometry", label: "Геометрия" }, { id: "word-problems", label: "Текстовые задачи" }
  ],
  russian: [
    { id: "spelling", label: "Орфография" }, { id: "punctuation", label: "Пунктуация" },
    { id: "expression", label: "Средства выразительности" }, { id: "essay", label: "Структура сочинения" }
  ],
  english: [
    { id: "grammar", label: "Grammar" }, { id: "vocabulary", label: "Vocabulary" },
    { id: "reading", label: "Reading" }, { id: "exam-format", label: "Exam format" }
  ],
  social: [
    { id: "economics", label: "Экономика" }, { id: "law", label: "Право" },
    { id: "politics", label: "Политика" }, { id: "social-relations", label: "Социальные отношения" }
  ],
  informatics: [
    { id: "logic", label: "Логика" }, { id: "algorithms", label: "Алгоритмы" }, { id: "python", label: "Python" },
    { id: "spreadsheets", label: "Таблицы" }, { id: "number-systems", label: "Системы счисления" }
  ]
};

const q = (id, subject, examTypesValue, topic, difficulty, prompt, answerOptions, correctAnswer, explanation, recommendationTag = topic) => ({
  id, subject, examTypes: examTypesValue, topic, difficulty, prompt, answerOptions, correctAnswer, explanation, recommendationTag
});

export const diagnosticQuestions = [
  q("math-01", "math", ["ege", "oge"], "algebra", "basic", "Решите уравнение: 3x + 5 = 20.", ["3", "5", "8", "15"], 1, "3x = 15, поэтому x = 5."),
  q("math-02", "math", ["ege", "oge"], "probability", "basic", "В коробке 5 синих и 5 белых карточек. Какова вероятность достать синюю?", ["0,2", "0,5", "1", "5"], 1, "Благоприятных исходов 5 из 10: 5/10 = 0,5."),
  q("math-03", "math", ["ege", "oge"], "geometry", "basic", "Периметр квадрата равен 28 см. Чему равна сторона?", ["4 см", "7 см", "14 см", "28 см"], 1, "Сторона квадрата равна четверти периметра: 28 / 4 = 7."),
  q("math-04", "math", ["ege", "oge"], "word-problems", "basic", "Товар стоил 800 ₽ и подорожал на 10%. Какова новая цена?", ["810 ₽", "880 ₽", "900 ₽", "720 ₽"], 1, "10% от 800 ₽ — 80 ₽, новая цена 880 ₽."),
  q("math-05", "math", ["ege", "oge"], "functions", "medium", "Для функции y = 2x − 3 найдите y при x = 4.", ["5", "8", "11", "−5"], 0, "2 · 4 − 3 = 5."),
  q("math-06", "math", ["ege", "oge"], "algebra", "medium", "Какое из чисел является корнем x² − 9 = 0?", ["2", "3", "4", "9"], 1, "x² = 9, корни равны 3 и −3."),
  q("math-07", "math", ["ege", "oge"], "geometry", "medium", "В прямоугольном треугольнике катеты 6 и 8. Найдите гипотенузу.", ["10", "12", "14", "48"], 0, "По теореме Пифагора: √(36 + 64) = 10."),
  q("math-08", "math", ["ege", "oge"], "probability", "medium", "Кубик бросают один раз. Вероятность выпадения числа больше 4 равна...", ["1/6", "1/3", "1/2", "2/3"], 1, "Подходят два исхода из шести: 5 и 6, то есть 2/6 = 1/3."),
  q("math-09", "math", ["ege"], "functions", "advanced", "График y = (x − 2)² смещён относительно y = x²...", ["на 2 влево", "на 2 вправо", "на 2 вверх", "на 2 вниз"], 1, "Замена x на x − 2 смещает параболу на 2 вправо."),
  q("math-10", "math", ["ege"], "algebra", "advanced", "При каком a уравнение x² − 2x + a = 0 имеет один корень?", ["−1", "0", "1", "2"], 2, "Один корень при D = 0: 4 − 4a = 0, значит a = 1."),
  q("math-11", "math", ["ege", "oge"], "word-problems", "advanced", "Два работника выполняют заказ за 6 часов. Первый один — за 10 часов. За сколько часов выполнит заказ второй?", ["12", "15", "16", "20"], 1, "Скорость второго: 1/6 − 1/10 = 1/15 заказа в час."),
  q("math-12", "math", ["ege", "oge"], "geometry", "advanced", "Площадь круга увеличили в 4 раза. Радиус при этом...", ["увеличился в 2 раза", "увеличился в 4 раза", "увеличился в 8 раз", "не изменился"], 0, "Площадь пропорциональна квадрату радиуса, поэтому радиус вырос в 2 раза."),

  q("rus-01", "russian", ["ege", "oge"], "spelling", "basic", "В каком слове пишется приставка ПРИ-?", ["пр…красный", "пр…одолеть", "пр…ехать", "пр…градить"], 2, "Приближение обозначается приставкой ПРИ-: приехать."),
  q("rus-02", "russian", ["ege", "oge"], "punctuation", "basic", "Где нужна запятая: «Когда стемнело мы вернулись домой»?", ["после «Когда»", "после «стемнело»", "после «мы»", "запятая не нужна"], 1, "Придаточная часть отделяется от главной запятой."),
  q("rus-03", "russian", ["ege", "oge"], "spelling", "basic", "Выберите слово без ошибки.", ["рассчитать", "расчитать", "разсчитать", "расщитать"], 0, "Нормативное написание: рассчитать."),
  q("rus-04", "russian", ["ege", "oge"], "expression", "basic", "«Лес проснулся» — это пример...", ["метафоры", "литоты", "градации", "антитезы"], 0, "Действие живого существа перенесено на лес — это метафора (олицетворение)."),
  q("rus-05", "russian", ["ege", "oge"], "punctuation", "medium", "Выберите верное оформление прямой речи.", ["Автор сказал, «Начинаем». ", "Автор сказал: «Начинаем». ", "Автор сказал — «Начинаем». ", "Автор сказал «Начинаем»:"], 1, "После слов автора перед прямой речью ставится двоеточие."),
  q("rus-06", "russian", ["ege", "oge"], "spelling", "medium", "В каком варианте НЕ пишется слитно?", ["(не)решённая задача", "далеко (не)простой вопрос", "(не)был готов", "вовсе (не)интересный"], 0, "Без зависимых слов полное причастие может писаться слитно: нерешённая."),
  q("rus-07", "russian", ["ege", "oge"], "essay", "medium", "Что должно связывать пример и комментарий в сочинении?", ["Только объём", "Смысловая связь", "Количество цитат", "Сложные термины"], 1, "Важно объяснить смысловую связь примеров, а не просто перечислить их."),
  q("rus-08", "russian", ["ege", "oge"], "expression", "medium", "Какое средство используется: «звонкая тишина»?", ["Эпитет", "Оксюморон", "Гипербола", "Анафора"], 1, "Сочетание противоречивых понятий — оксюморон."),
  q("rus-09", "russian", ["ege"], "punctuation", "advanced", "В каком случае вводное слово нужно обособить?", ["Он однако продолжил работу", "Он как будто устал", "Он именно так ответил", "Он даже улыбнулся"], 0, "«Однако» в середине предложения выступает вводным словом и обособляется."),
  q("rus-10", "russian", ["ege"], "essay", "advanced", "Какой тезис лучше подходит для аргументированного комментария?", ["Текст хороший", "Автор пишет о жизни", "Ответственность проявляется в готовности отвечать за последствия выбора", "Мне понравился герой"], 2, "Тезис должен быть конкретным и допускать доказательство примерами."),
  q("rus-11", "russian", ["ege", "oge"], "spelling", "advanced", "В каком слове пишется НН?", ["краше…ый пол", "ветре…ый день", "глиня…ый кувшин", "ю…ый спортсмен"], 0, "В полном причастии с зависимым словом: крашенный мастером пол."),
  q("rus-12", "russian", ["ege", "oge"], "punctuation", "advanced", "Почему обособляется оборот: «Устав от дороги, путешественники остановились»?", ["Это обращение", "Это деепричастный оборот", "Это вводная конструкция", "Это приложение"], 1, "Деепричастный оборот обособляется независимо от позиции."),

  q("eng-01", "english", ["ege", "oge"], "grammar", "basic", "Choose the correct form: She ___ to school every day.", ["go", "goes", "going", "gone"], 1, "Present Simple with she requires the -s ending."),
  q("eng-02", "english", ["ege", "oge"], "vocabulary", "basic", "Choose the closest meaning of “rapid”.", ["slow", "quick", "quiet", "late"], 1, "Rapid means quick or fast."),
  q("eng-03", "english", ["ege", "oge"], "grammar", "basic", "Choose the correct article: I saw ___ interesting film.", ["a", "an", "the", "no article"], 1, "Before a vowel sound use “an”."),
  q("eng-04", "english", ["ege", "oge"], "reading", "basic", "Text: “The library closes at six.” When does it close?", ["At five", "At six", "At seven", "At noon"], 1, "The answer is stated directly in the sentence."),
  q("eng-05", "english", ["ege", "oge"], "grammar", "medium", "Choose the correct form: If it rains, we ___ at home.", ["stay", "stayed", "will stay", "would stay"], 2, "First conditional: if + Present Simple, will + verb."),
  q("eng-06", "english", ["ege", "oge"], "vocabulary", "medium", "Which verb collocates with “a decision”?", ["do", "make", "take up", "put"], 1, "The standard collocation is “make a decision”."),
  q("eng-07", "english", ["ege", "oge"], "reading", "medium", "“Although the task was difficult, Mia completed it.” What is true?", ["Mia stopped", "The task was easy", "Mia finished despite difficulty", "Mia asked for another task"], 2, "Although signals contrast: the difficulty did not prevent completion."),
  q("eng-08", "english", ["ege", "oge"], "exam-format", "medium", "What makes an email opening appropriate?", ["No greeting", "A clear greeting and purpose", "Only emojis", "A copied conclusion"], 1, "A greeting and clear purpose make the message coherent and appropriate."),
  q("eng-09", "english", ["ege"], "grammar", "advanced", "Choose the correct form: By next June, she ___ the course.", ["finishes", "will finish", "will have finished", "finished"], 2, "Future Perfect describes completion before a future point."),
  q("eng-10", "english", ["ege"], "vocabulary", "advanced", "Choose the best word: The evidence was ___ enough to change their opinion.", ["compelling", "ordinary", "vacant", "fragile"], 0, "Compelling evidence is convincing and persuasive."),
  q("eng-11", "english", ["ege", "oge"], "reading", "advanced", "A writer lists a claim, evidence and a limitation. What is the main purpose?", ["To entertain only", "To present a balanced argument", "To avoid a conclusion", "To describe weather"], 1, "Evidence plus a limitation usually signals a balanced argument."),
  q("eng-12", "english", ["ege", "oge"], "exam-format", "advanced", "Which revision improves coherence?", ["Remove all linking words", "Arrange ideas logically and add relevant connectors", "Repeat the same sentence", "Use only short nouns"], 1, "Logical order and relevant connectors make the response coherent."),

  q("soc-01", "social", ["ege", "oge"], "economics", "basic", "Что относится к фактору производства «труд»?", ["Оборудование", "Работа программиста", "Земельный участок", "Деньги фирмы"], 1, "Труд — физические и интеллектуальные усилия людей."),
  q("soc-02", "social", ["ege", "oge"], "law", "basic", "Какой документ обладает высшей юридической силой в России?", ["Указ", "Конституция", "Приказ", "Договор компании"], 1, "Конституция обладает высшей юридической силой."),
  q("soc-03", "social", ["ege", "oge"], "politics", "basic", "Что является признаком государства?", ["Единая мода", "Публичная власть", "Общие увлечения", "Одинаковая профессия"], 1, "Государство обладает публичной властью и суверенитетом."),
  q("soc-04", "social", ["ege", "oge"], "social-relations", "basic", "Семья как малая группа характеризуется...", ["личными контактами", "только официальными связями", "отсутствием норм", "неограниченным составом"], 0, "Для малой группы характерны непосредственные личные контакты."),
  q("soc-05", "social", ["ege", "oge"], "economics", "medium", "При росте спроса и неизменном предложении цена обычно...", ["снижается", "растёт", "исчезает", "не связана со спросом"], 1, "Рост спроса при неизменном предложении создаёт давление на цену вверх."),
  q("soc-06", "social", ["ege", "oge"], "law", "medium", "Какое право относится к личным?", ["Право на жизнь", "Право избирать", "Право на забастовку", "Право на социальное обеспечение"], 0, "Право на жизнь относится к личным (гражданским) правам."),
  q("soc-07", "social", ["ege", "oge"], "politics", "medium", "Разделение властей предполагает наличие...", ["только парламента", "законодательной, исполнительной и судебной ветвей", "одной партии", "только местного управления"], 1, "Классическая модель включает три самостоятельные ветви власти."),
  q("soc-08", "social", ["ege", "oge"], "social-relations", "medium", "Социальная мобильность — это...", ["изменение положения человека или группы", "изменение погоды", "рост цен", "принятие закона"], 0, "Мобильность означает переход между социальными позициями."),
  q("soc-09", "social", ["ege"], "economics", "advanced", "Центральный банк повышает ключевую ставку. Какой эффект наиболее вероятен?", ["Кредиты становятся дешевле", "Кредиты становятся дороже", "Налоги исчезают", "Импорт прекращается"], 1, "Рост ключевой ставки обычно повышает стоимость кредитов."),
  q("soc-10", "social", ["ege"], "law", "advanced", "Что отличает административный проступок от преступления?", ["Меньшая общественная опасность", "Отсутствие нормы права", "Всегда устная форма", "Только имущественный ущерб"], 0, "Проступок характеризуется меньшей общественной опасностью и иной ответственностью."),
  q("soc-11", "social", ["ege", "oge"], "politics", "advanced", "Политический плюрализм означает...", ["запрет дискуссий", "многообразие взглядов и объединений", "отсутствие выборов", "власть одной семьи"], 1, "Плюрализм предполагает конкуренцию политических взглядов и организаций."),
  q("soc-12", "social", ["ege", "oge"], "social-relations", "advanced", "Какой пример иллюстрирует достигаемый статус?", ["Возраст", "Место рождения", "Профессия врача", "Родство"], 2, "Профессия приобретается через выбор, обучение и деятельность."),

  q("inf-01", "informatics", ["ege", "oge"], "logic", "basic", "Каково значение выражения ИСТИНА И ЛОЖЬ?", ["ИСТИНА", "ЛОЖЬ", "1 или 0 случайно", "не определено"], 1, "Конъюнкция истинна, только когда истинны оба высказывания."),
  q("inf-02", "informatics", ["ege", "oge"], "number-systems", "basic", "Чему равно двоичное число 101₂ в десятичной системе?", ["3", "4", "5", "6"], 2, "1·4 + 0·2 + 1·1 = 5."),
  q("inf-03", "informatics", ["ege", "oge"], "python", "basic", "Что выведет Python: print(2 + 3 * 4)?", ["20", "14", "24", "11"], 1, "Умножение выполняется раньше сложения: 2 + 12 = 14."),
  q("inf-04", "informatics", ["ege", "oge"], "algorithms", "basic", "Алгоритм должен быть...", ["неоднозначным", "конечным и понятным исполнителю", "только графическим", "обязательно длинным"], 1, "Определённость, понятность и конечность — базовые свойства алгоритма."),
  q("inf-05", "informatics", ["ege", "oge"], "spreadsheets", "medium", "Какая формула суммирует ячейки A1:A5?", ["=ADD(A1:A5)", "=SUM(A1:A5)", "=A1-A5", "=COUNT(A1;A5)"], 1, "Для суммы диапазона используется функция SUM."),
  q("inf-06", "informatics", ["ege", "oge"], "logic", "medium", "Когда выражение НЕ A истинно?", ["Когда A истинно", "Когда A ложно", "Всегда", "Никогда"], 1, "Отрицание меняет логическое значение на противоположное."),
  q("inf-07", "informatics", ["ege", "oge"], "python", "medium", "Что выведет код: x=3; x+=2; print(x)?", ["2", "3", "5", "32"], 2, "Оператор += увеличивает x на 2, получается 5."),
  q("inf-08", "informatics", ["ege", "oge"], "number-systems", "medium", "Как записать десятичное 15 в шестнадцатеричной системе?", ["E", "F", "10", "15"], 1, "Цифра F соответствует десятичному числу 15."),
  q("inf-09", "informatics", ["ege"], "algorithms", "advanced", "Какова сложность бинарного поиска в отсортированном массиве?", ["O(1)", "O(log n)", "O(n)", "O(n²)"], 1, "На каждом шаге область поиска уменьшается вдвое."),
  q("inf-10", "informatics", ["ege"], "python", "advanced", "Что выведет: print([x*x for x in range(3)])?", ["[1, 4, 9]", "[0, 1, 4]", "[0, 1, 2]", "[3, 3, 3]"], 1, "range(3) даёт 0, 1, 2; их квадраты — 0, 1, 4."),
  q("inf-11", "informatics", ["ege", "oge"], "spreadsheets", "advanced", "Формулу =$A1*B$2 копируют вправо. Что не изменится?", ["Столбец A и строка 2", "Только строка 1", "Только столбец B", "Все ссылки"], 0, "Знак $ фиксирует столбец A и строку 2."),
  q("inf-12", "informatics", ["ege", "oge"], "logic", "advanced", "Выражение A ИЛИ (НЕ A) принимает значение...", ["всегда истина", "всегда ложь", "равно A", "не определено"], 0, "Высказывание и его отрицание охватывают все случаи — это закон исключённого третьего.")
];

export const studyPlanTemplates = Object.fromEntries(
  Object.entries(diagnosticTopics).map(([subjectId, topics]) => [subjectId, topics.map((topic) => ({
    id: `${subjectId}-${topic.id}-plan`,
    topicId: topic.id,
    title: topic.label,
    practice: `Практика по теме «${topic.label}» с разбором ошибок`,
    checkpoint: `Контрольный мини-блок: ${topic.label}`
  }))])
);

export const targetGoals = [
  { id: "grades", label: "Повысить школьную успеваемость" },
  { id: "calm-exam", label: "Сдать экзамен без стресса" },
  { id: "profile-class", label: "Поступить в профильный класс" },
  { id: "strong-university", label: "Поступить в сильный вуз" },
  { id: "score-80", label: "Набрать 80+" },
  { id: "score-90", label: "Набрать 90+" },
  { id: "undecided", label: "Пока не определились" }
];

export const bookingOptions = {
  timeCommitments: [
    { id: "hours-2", label: "До 2 часов в неделю", hours: 2 },
    { id: "hours-4", label: "3–4 часа", hours: 4 },
    { id: "hours-6", label: "5–6 часов", hours: 6 },
    { id: "hours-8", label: "7+ часов", hours: 8 }
  ],
  formats: [
    { id: "group", label: "Мини-группа" },
    { id: "individual", label: "Индивидуально" },
    { id: "either", label: "Готов рассмотреть оба" }
  ],
  contactMethods: [
    { id: "phone", label: "Телефон" }, { id: "telegram", label: "Telegram" }, { id: "email", label: "Email" }
  ]
};

const atFutureDay = (dayOffset, hour, minute = 0) => {
  const value = new Date();
  value.setHours(hour, minute, 0, 0);
  value.setDate(value.getDate() + dayOffset);
  return value.toISOString();
};

export const scheduleSlots = teachers.flatMap((teacher, teacherIndex) => [
  { id: `${teacher.id}-slot-1`, teacherId: teacher.id, subjectId: teacher.subjectId, startAt: atFutureDay(2 + teacherIndex, 17), format: "group", places: 5 },
  { id: `${teacher.id}-slot-2`, teacherId: teacher.id, subjectId: teacher.subjectId, startAt: atFutureDay(4 + teacherIndex, 19), format: "individual", places: 1 },
  { id: `${teacher.id}-slot-3`, teacherId: teacher.id, subjectId: teacher.subjectId, startAt: atFutureDay(7 + teacherIndex, 16, 30), format: "group", places: 2 },
  { id: `${teacher.id}-slot-4`, teacherId: teacher.id, subjectId: teacher.subjectId, startAt: atFutureDay(9 + teacherIndex, 18), format: "individual", places: 1 }
]).sort((a, b) => new Date(a.startAt) - new Date(b.startAt));

export const productMeta = { id: "rost-znaniy", name: "РостЗнаний", examSeason };
