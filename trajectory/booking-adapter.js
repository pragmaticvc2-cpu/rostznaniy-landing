import { storageKeys, storageVersion } from "../data/config.js";

function hash(value) {
  let result = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    result ^= value.charCodeAt(index);
    result = Math.imul(result, 16777619);
  }
  return (result >>> 0).toString(36);
}

function safeRead(key, fallback) {
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

function safeWrite(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify({ version: storageVersion, data }));
    return true;
  } catch {
    return false;
  }
}

function stablePayload(booking) {
  return JSON.stringify({
    examTypeId: booking.trajectory.examTypeId,
    subjectId: booking.trajectory.subjectId,
    classValue: booking.trajectory.classValue,
    target: booking.trajectory.target,
    teacherId: booking.teacherId,
    tariffId: booking.tariffId,
    slotId: booking.slotId,
    studentName: booking.studentName,
    contactMethod: booking.contactMethod,
    phone: booking.phone,
    telegram: booking.telegram,
    email: booking.email
  });
}

export const bookingAdapter = {
  kind: "local-demo",
  async submit(booking) {
    const id = `rz-demo-${hash(stablePayload(booking))}`;
    const existing = safeRead(storageKeys.demoBookings, []);
    const record = { ...booking, id, createdAt: new Date().toISOString(), status: "demo-saved" };
    const next = [record, ...existing.filter((item) => item.id !== id)].slice(0, 5);
    if (!safeWrite(storageKeys.demoBookings, next)) throw new Error("Не удалось сохранить демо-заявку в браузере");
    return record;
  },
  list() {
    return safeRead(storageKeys.demoBookings, []);
  }
};

export const futureBookingTransports = Object.freeze({
  api: null,
  telegram: null,
  email: null,
  crm: null,
  googleSheets: null
});

