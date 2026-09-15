import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  writeBatch,
  runTransaction,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase";
import { computeSettlement } from "./settlement";

export async function fetchMembersAndBankInfo() {
  const snap = await getDocs(collection(db, "members"));
  const names = [];
  const bankInfo = {};
  snap.forEach((d) => {
    const data = d.data();
    if (!data.ten) return;
    names.push(data.ten);
    if (data.nganHang && data.stk && data.bin) {
      bankInfo[data.ten] = { nganHang: data.nganHang, stk: data.stk, bin: data.bin };
    }
  });
  return { names, bankInfo };
}

export async function fetchSuggestions() {
  const snap = await getDoc(doc(db, "config", "suggestions"));
  return snap.exists() ? snap.data().items || [] : [];
}

// Tạo khoản chi mới. Dùng ID do client sinh sẵn (crypto.randomUUID(), giữ nguyên
// xuyên suốt các lần gửi lại khi lỗi mạng) làm doc id cho expenses/{id} +
// expenseShares/{id}_{i} — gửi lại với cùng id chỉ ghi đè cùng nội dung
// (idempotent), không tạo trùng khoản chi. Thay cho việc dò-ID-đã-tồn-tại phía
// server như Code.gs bản Apps Script.
export async function createExpense({
  id,
  ngayChi,
  noiDung,
  soTien,
  nguoiChi,
  phuongThucChia,
  chiTiet,
  userAgent,
}) {
  const batch = writeBatch(db);
  batch.set(doc(db, "expenses", id), {
    ngayChi,
    noiDung,
    soTien,
    nguoiChi,
    phuongThucChia,
    thoiGianNhap: serverTimestamp(),
    idKy: "",
    thietBi: userAgent || "",
  });
  chiTiet.forEach((item, i) => {
    batch.set(doc(db, "expenseShares", `${id}_${i}`), {
      expenseId: id,
      ngayChi,
      nguoiChi,
      nguoiThamGia: item.nguoi,
      soTien: item.soTien,
      idKy: "",
    });
  });
  await batch.commit();
}

async function fetchOpenExpensesAndShares() {
  const [expSnap, shareSnap] = await Promise.all([
    getDocs(query(collection(db, "expenses"), where("idKy", "==", ""))),
    getDocs(query(collection(db, "expenseShares"), where("idKy", "==", ""))),
  ]);
  return {
    expenses: expSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
    shares: shareSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
  };
}

export async function previewSettlement(memberNames) {
  const { expenses, shares } = await fetchOpenExpensesAndShares();
  return computeSettlement(expenses, shares, memberNames);
}

// Chốt sổ: đọc lại danh sách đang mở NGAY TRONG transaction rồi mới tính toán +
// ghi — nếu ai đó chốt sổ hoặc thêm khoản chi mới xen giữa, Firestore tự phát
// hiện xung đột và retry lại toàn bộ callback (tương đương LockService.waitLock()
// trong Code.gs bản gốc, chỉ khác cơ chế: optimistic concurrency thay vì lock tường minh).
export async function commitSettlement({ nguoiChot, userAgent, memberNames }) {
  const { expenses: candidateExpenses, shares: candidateShares } = await fetchOpenExpensesAndShares();
  if (candidateExpenses.length === 0) throw new Error("Không có khoản chi nào để chốt sổ.");

  return runTransaction(db, async (tx) => {
    const expenses = [];
    for (const c of candidateExpenses) {
      const snap = await tx.get(doc(db, "expenses", c.id));
      if (snap.exists() && snap.data().idKy === "") expenses.push({ id: c.id, ...snap.data() });
    }
    const shares = [];
    for (const c of candidateShares) {
      const snap = await tx.get(doc(db, "expenseShares", c.id));
      if (snap.exists() && snap.data().idKy === "") shares.push({ id: c.id, ...snap.data() });
    }

    if (expenses.length === 0) {
      throw new Error("Không có khoản chi nào để chốt sổ (có thể vừa được người khác chốt).");
    }

    const ket = computeSettlement(expenses, shares, memberNames);
    const idKy = "K" + new Date().toISOString().replace(/[-:TZ.]/g, "").slice(0, 14);

    expenses.forEach((e) => tx.update(doc(db, "expenses", e.id), { idKy }));
    shares.forEach((s) => tx.update(doc(db, "expenseShares", s.id), { idKy }));

    tx.set(doc(db, "settlements", idKy), {
      kyId: idKy,
      ngayChot: serverTimestamp(),
      nguoiChot,
      thietBi: userAgent || "",
      tuNgay: ket.tuNgay,
      denNgay: ket.denNgay,
      soDongChiTieu: ket.soDongChiTieu,
      tongSoTien: ket.tongSoTien,
      perPerson: ket.perPerson,
      transactions: ket.transactions,
    });

    return { kyId: idKy, ...ket };
  });
}

export async function fetchSettlementHistory() {
  const snap = await getDocs(query(collection(db, "settlements"), orderBy("ngayChot", "desc")));
  return snap.docs.map((d) => d.data());
}

export async function markTransactionPaid({ kyId, index, nguoiDanhDau }) {
  return runTransaction(db, async (tx) => {
    const ref = doc(db, "settlements", kyId);
    const snap = await tx.get(ref);
    if (!snap.exists()) throw new Error("Không tìm thấy kỳ chốt sổ");
    const transactions = (snap.data().transactions || []).slice();
    if (!transactions[index]) throw new Error("Không tìm thấy giao dịch");
    transactions[index] = {
      ...transactions[index],
      daThanhToan: true,
      nguoiDanhDau,
      thoiGianDanhDau: new Date().toISOString(),
    };
    tx.update(ref, { transactions });
    return transactions;
  });
}
