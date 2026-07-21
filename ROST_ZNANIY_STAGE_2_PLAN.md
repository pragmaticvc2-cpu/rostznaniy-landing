# РостЗнаний: план Stage 2

## Текущая архитектура

- Проект является статическим приложением на HTML, CSS и нативных JavaScript ES-модулях.
- Главная страница находится в `index.html`, продуктовый сценарий Stage 1 — в `trajectory/`.
- `data/product-data.js` остается единым каталогом предметов, тем, вопросов, преподавателей, тарифов, историй и слотов.
- `trajectory/engine.js` рассчитывает детерминированный результат отдельно для ЕГЭ и ОГЭ.
- `trajectory/booking-adapter.js` сохраняет до пяти демонстрационных заявок в versioned localStorage.
- `scripts/build-site.mjs` формирует production-копию в `dist/client`; исходные файлы остаются source of truth.

## Состояние Stage 1

- Реализован восьмишаговый профиль, диагностика из восьми вопросов и предварительная траектория.
- Результат включает сильные и слабые темы, учебный маршрут, преподавателя, тариф и ближайшие слоты.
- ЕГЭ отображается в баллах, ОГЭ — только в отметках и уровнях готовности.
- Единый booking flow передает контекст траектории и создает локальную демо-заявку.
- Главная страница содержит относительные CTA на `trajectory/` и использует общий экзаменационный сезон.

## Риски

- Browser-аудит должен подтвердить реальные переходы, модальные окна и сохранение состояния Stage 1.
- Поврежденный localStorage не должен выводить из строя ни trajectory, ни отдельные разделы кабинета.
- GitHub Pages размещает проект под repository base path, поэтому переходы должны оставаться относительными.
- Динамические слоты и даты должны формироваться из одного Date-значения и не становиться прошедшими.
- Разделы кабинета требуют независимых fallback, иначе один поврежденный ключ сломает весь dashboard.
- На мобильных экранах таблицы, dialog, sidebar и график не должны создавать горизонтальный overflow.

## План кабинета

1. Выполнить production build и browser-аудит главной и trajectory на целевых viewport.
2. Исправить только воспроизведенные дефекты Stage 1.
3. Создать маршрут `cabinet/` с демонстрационным входом и безопасным fallback-профилем.
4. Связать профиль с `rz_trajectory_result`, выбранными преподавателем, тарифом, слотом и последней демо-заявкой.
5. Реализовать dashboard, траекторию результата, карту знаний, недельный план и журнал ошибок.
6. Добавить детерминированную мини-практику, пробники, задания, расписание, уведомления, тариф и локальную переписку.
7. Добавить относительные точки входа из главной, trajectory success screen и footer.
8. Выполнить build, локальный verifier и browser-проверку основных сценариев.

## Предполагаемые компоненты

- `cabinet/index.html` — семантический каркас, demo gate, навигация, dashboard и доступные dialog.
- `cabinet/styles.css` — продуктовая сетка, адаптивные карточки, таблицы, график, состояния и focus styles.
- `cabinet/cabinet.js` — orchestration, рендеринг, навигация по разделам и UI-события.
- `cabinet/storage.js` — versioned localStorage с изолированным сбросом поврежденного ключа.
- `cabinet/model.js` — стабильный demo profile и преобразование результата Stage 1 в модель кабинета.
- `cabinet/adapters.js` — JSDoc-контракты и mock-адаптеры будущего backend.
- `scripts/verify-stage2.mjs` — легкая локальная проверка без новых зависимостей.

## Схема данных

- Student profile: exam type, class, subject, baseline, target, goal, teacher, tariff и slot.
- Score history: стабильные контрольные точки с разными шкалами ЕГЭ/ОГЭ.
- Knowledge map: topic id, status, level, last check, errors и recommended action.
- Weekly plan: task id, type, topic, due date, duration, status и source.
- Error journal: source, topic, description, correct approach, priority, repeats, status и next review.
- Practice sessions: topic, question ids, answers, score и created date.
- Mock exams, assignments, notifications, schedule changes, payments и teacher messages используют стабильные id.

## Критерии готовности

- `dist/client/index.html`, `dist/client/trajectory/index.html` и `dist/client/cabinet/index.html` создаются одной build-командой.
- Кабинет открывается напрямую, после reload и при пустом или поврежденном localStorage.
- Контекст trajectory и демо-заявки переносится без повторного выбора известных параметров.
- ЕГЭ и ОГЭ нигде не смешивают балльную и отметочную шкалы.
- Недельный план, журнал, практика, задания, расписание и уведомления сохраняются независимо.
- Основные сценарии доступны с клавиатуры, dialog закрываются кнопкой, backdrop и Escape.
- На 375, 430, 768 и 1440 px нет overflow страницы, обрезанных действий или недоступного контента.
- Build и verifier проходят без ошибок, console и network остаются чистыми.
- Создан локальный отчет и checkpoint commit; push и deployment не выполняются.
