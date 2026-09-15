import { setGlobalOptions } from "firebase-functions/v2";
import { onCall } from "firebase-functions/v2/https";
import { initializeApp } from "firebase-admin/app";

initializeApp();
setGlobalOptions({ region: "asia-southeast1" });

// Hàm kiểm tra kết nối end-to-end (frontend -> Functions -> Firestore) trước khi
// migrate các action từ Code.gs (verifyPin, chotSoPreview, chotSo, lichSuChot,
// danhDauThanhToan, tạo khoản chi) sang callable functions tương ứng.
export const ping = onCall(() => {
  return { result: "success", message: "pong" };
});
