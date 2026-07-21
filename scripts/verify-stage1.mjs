import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { diagnosticQuestions, subjects } from "../data/product-data.js";
import { calculateTrajectory, selectDiagnosticQuestions } from "../trajectory/engine.js";
import { storageKeys } from "../data/config.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const errors = [];
const checks = [];
const ok = (condition, message) => {
  checks.push({ condition, message });
  if (!condition) errors.push(message);
};

for (const relative of [
  "dist/client/index.html",
  "dist/client/styles.css",
  "dist/client/script.js",
  "dist/client/data/config.js",
  "dist/client/data/product-data.js",
  "dist/client/trajectory/index.html",
  "dist/client/trajectory/styles.css",
  "dist/client/trajectory/trajectory.js",
  "dist/client/trajectory/engine.js",
  "dist/client/trajectory/booking-adapter.js",
  "dist/client/assets/hero-student-season.png",
  "dist/server/index.js"
]) {
  try { await access(path.join(root, relative)); ok(true, `${relative} exists`); }
  catch { ok(false, `${relative} is missing`); }
}

for (const subject of subjects) {
  const bank = diagnosticQuestions.filter((question) => question.subject === subject.id);
  ok(bank.length >= 12, `${subject.id}: at least 12 questions`);
  for (const examTypeId of ["ege", "oge"]) {
    const selected = selectDiagnosticQuestions(subject.id, examTypeId);
    const counts = selected.reduce((result, question) => ({ ...result, [question.difficulty]: (result[question.difficulty] || 0) + 1 }), {});
    ok(selected.length === 8, `${subject.id}/${examTypeId}: 8 selected questions`);
    ok(counts.basic === 3 && counts.medium === 3 && counts.advanced === 2, `${subject.id}/${examTypeId}: 3/3/2 difficulty split`);
  }
}

for (const question of diagnosticQuestions) {
  const required = ["id", "subject", "examTypes", "topic", "difficulty", "prompt", "answerOptions", "correctAnswer", "explanation", "recommendationTag"];
  ok(required.every((key) => Object.hasOwn(question, key)), `${question.id}: complete question contract`);
  ok(Array.isArray(question.answerOptions) && question.answerOptions.length >= 2, `${question.id}: answer options`);
}

const egeProfile = { examTypeId: "ege", classValue: "11", subjectId: "math", currentValue: "58", targetValue: "85", goalId: "strong-university", hours: "6", format: "either" };
const egeQuestions = selectDiagnosticQuestions("math", "ege");
const egeAnswers = Object.fromEntries(egeQuestions.map((question) => [question.id, question.correctAnswer]));
const egeA = calculateTrajectory(egeProfile, egeAnswers);
const egeB = calculateTrajectory(egeProfile, egeAnswers);
ok(JSON.stringify(egeA) === JSON.stringify(egeB), "EGE engine is deterministic");
ok(egeA.estimatedRange.includes("баллов"), "EGE result uses score scale");
const egeLowAnswers = Object.fromEntries(egeQuestions.map((question) => [question.id, 0]));
const egeLow = calculateTrajectory(egeProfile, egeLowAnswers);
ok(egeLow.gap !== "31 баллов", "EGE gap uses Russian score declension");

const ogeProfile = { examTypeId: "oge", classValue: "9", subjectId: "informatics", currentValue: "3", targetValue: "5", goalId: "profile-class", hours: "4", format: "group" };
const ogeQuestions = selectDiagnosticQuestions("informatics", "oge");
const ogeAnswers = Object.fromEntries(ogeQuestions.map((question, index) => [question.id, index < 5 ? question.correctAnswer : (question.correctAnswer + 1) % question.answerOptions.length]));
const ogeA = calculateTrajectory(ogeProfile, ogeAnswers);
const ogeB = calculateTrajectory(ogeProfile, ogeAnswers);
ok(JSON.stringify(ogeA) === JSON.stringify(ogeB), "OGE engine is deterministic");
ok(ogeA.estimatedRange.includes("отметка") && !ogeA.estimatedRange.includes("балл"), "OGE result uses grade scale only");
ok(!ogeA.gap.includes("балл"), "OGE gap has no 100-point scale");

const questionIds = diagnosticQuestions.map((question) => question.id);
ok(new Set(questionIds).size === questionIds.length, "Question ids are unique");

for (const relativeHtml of ["index.html", "trajectory/index.html", "dist/client/index.html", "dist/client/trajectory/index.html"]) {
  const absoluteHtml = path.join(root, relativeHtml);
  const source = await readFile(absoluteHtml, "utf8");
  const hrefs = [...source.matchAll(/href="([^"]+)"/g)].map((match) => match[1]);
  const sources = [...source.matchAll(/src="([^"]+)"/g)].map((match) => match[1]);
  ok(!hrefs.some((href) => href === "#" || href === ""), `${relativeHtml}: no empty links`);
  ok(!/(localhost|127\.0\.0\.1|file:\/\/\/|C:\\Users)/i.test(source), `${relativeHtml}: no local machine urls`);
  const ids = new Set([...source.matchAll(/id="([^"]+)"/g)].map((match) => match[1]));
  hrefs.filter((href) => href.startsWith("#")).forEach((href) => ok(ids.has(href.slice(1)), `${relativeHtml}: anchor ${href} exists`));
  const localResources = [...hrefs, ...sources].filter((value) => !value.startsWith("#") && !/^(https?:|mailto:|tel:)/.test(value));
  for (const resource of localResources) {
    const clean = resource.split(/[?#]/)[0];
    const target = path.resolve(path.dirname(absoluteHtml), clean, clean.endsWith("/") ? "index.html" : "");
    try { await access(target); ok(true, `${relativeHtml}: ${resource} exists`); }
    catch { ok(false, `${relativeHtml}: ${resource} is missing`); }
  }
}

class MemoryStorage {
  constructor() { this.values = new Map(); }
  getItem(key) { return this.values.has(key) ? this.values.get(key) : null; }
  setItem(key, value) { this.values.set(key, String(value)); }
  removeItem(key) { this.values.delete(key); }
  clear() { this.values.clear(); }
}

globalThis.localStorage = new MemoryStorage();
const adapterUrl = `${pathToFileURL(path.join(root, "trajectory/booking-adapter.js")).href}?verify=1`;
const { bookingAdapter } = await import(adapterUrl);
localStorage.setItem(storageKeys.demoBookings, "{broken");
ok(bookingAdapter.list().length === 0, "Corrupted booking storage falls back safely");
ok(localStorage.getItem(storageKeys.demoBookings) === null, "Only corrupted booking section is reset");

const baseBooking = {
  trajectory: { examTypeId: "ege", subjectId: "math", classValue: 11, target: "85+ баллов" },
  teacherId: "elena-morozova", tariffId: "premium", slotId: "elena-morozova-slot-2",
  studentName: "Тест", parentName: "Тест", phone: "+70000000000", telegram: "", email: "", contactMethod: "phone"
};
const firstRecord = await bookingAdapter.submit(baseBooking);
const repeatRecord = await bookingAdapter.submit(baseBooking);
ok(firstRecord.id === repeatRecord.id, "Booking id is stable for the same payload");
for (let index = 0; index < 6; index += 1) await bookingAdapter.submit({ ...baseBooking, studentName: `Тест ${index}` });
ok(bookingAdapter.list().length === 5, "Booking adapter keeps at most 5 records");

console.log(JSON.stringify({
  passed: checks.filter((check) => check.condition).length,
  failed: errors.length,
  questionCounts: Object.fromEntries(subjects.map((subject) => [subject.id, diagnosticQuestions.filter((question) => question.subject === subject.id).length])),
  ege: { estimatedRange: egeA.estimatedRange, gap: egeA.gap, tariff: egeA.recommendedTariffId },
  oge: { estimatedRange: ogeA.estimatedRange, gap: ogeA.gap, tariff: ogeA.recommendedTariffId },
  errors
}, null, 2));

if (errors.length) process.exitCode = 1;
