import { signInAnonymously, onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, setDoc, deleteDoc } from "firebase/firestore";
import { auth, db } from "../firebase";

let authReadyPromise = null;

// Đảm bảo có 1 danh tính ẩn danh ổn định cho thiết bị này (Firebase Auth tự lưu
// lại giữa các lần tải trang). Đây chỉ là "định danh" để Firestore Rules gắn
// session unlock vào — không phải tài khoản người dùng thật, không cần đăng ký.
export function ensureAnonymousUser() {
  if (!authReadyPromise) {
    authReadyPromise = new Promise((resolve, reject) => {
      const unsub = onAuthStateChanged(
        auth,
        (user) => {
          if (user) {
            unsub();
            resolve(user);
          }
        },
        (err) => {
          unsub();
          reject(err);
        }
      );
      signInAnonymously(auth).catch((err) => {
        unsub();
        reject(err);
      });
    });
  }
  return authReadyPromise;
}

export async function isUnlocked() {
  const user = await ensureAnonymousUser();
  const snap = await getDoc(doc(db, "sessions", user.uid));
  return snap.exists();
}

// "Đăng nhập": tạo document sessions/{uid} kèm PIN vừa nhập. Firestore Rules so
// khớp field này với config/pin ngay trong điều kiện ghi (chạy phía server) — ghi
// thành công nghĩa là đúng PIN, bị từ chối (permission-denied) nghĩa là sai PIN.
// Client không bao giờ đọc được giá trị PIN thật. Xoá session cũ trước để lần
// thử nào cũng được Firestore xếp loại "create" (rules chỉ cho create, chặn update).
export async function unlockWithPin(pin) {
  const user = await ensureAnonymousUser();
  const ref = doc(db, "sessions", user.uid);
  await deleteDoc(ref).catch(() => {});
  await setDoc(ref, { pin, unlockedAt: Date.now() });
}

export async function lock() {
  const user = await ensureAnonymousUser();
  await deleteDoc(doc(db, "sessions", user.uid)).catch(() => {});
}
