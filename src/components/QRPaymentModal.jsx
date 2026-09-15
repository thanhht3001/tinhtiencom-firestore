import { useState } from "react";
import { markTransactionPaid } from "../lib/firestoreApi";
import "./QRPaymentModal.css";

const formatVnd = (value) => Number(value || 0).toLocaleString("vi-VN") + " đ";

function buildVietQrUrl({ bin, stk, soTien, addInfo, accountName }) {
  const params = new URLSearchParams({
    amount: String(soTien),
    addInfo,
    accountName,
  });
  return `https://img.vietqr.io/image/${bin}-${stk}-compact2.png?${params.toString()}`;
}

// Modal hiện mã QR VietQR cho 1 giao dịch gợi ý chuyển khoản (chỉ dùng ở màn Lịch sử chốt sổ).
// "Đóng" chỉ tắt modal, không đổi trạng thái. "Đã thanh toán" ghi vào settlements/{kyId}.
export default function QRPaymentModal({ tu, den, soTien, kyId, index, bin, stk, thanhVienList, onClose, onConfirmed }) {
  const [nguoiDanhDau, setNguoiDanhDau] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const qrUrl = buildVietQrUrl({
    bin,
    stk,
    soTien,
    addInfo: `Thanh toan ${kyId}`,
    accountName: den,
  });

  async function handleConfirm() {
    setError("");
    setSubmitting(true);
    try {
      const transactions = await markTransactionPaid({ kyId, index, nguoiDanhDau });
      onConfirmed(transactions);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="qr-modal-overlay" onMouseDown={onClose}>
      <div className="qr-modal" onMouseDown={(e) => e.stopPropagation()}>
        <p className="qr-modal-title">
          <strong>{tu}</strong> chuyển cho <strong>{den}</strong>: {formatVnd(soTien)}
        </p>

        <img className="qr-modal-image" src={qrUrl} alt="Mã QR chuyển khoản" />

        <div className="field">
          <label htmlFor="nguoiDanhDau">Người xác nhận đã thanh toán</label>
          <select
            id="nguoiDanhDau"
            value={nguoiDanhDau}
            onChange={(e) => setNguoiDanhDau(e.target.value)}
            disabled={thanhVienList.length === 0}
          >
            <option value="" disabled>
              -- Chọn tên --
            </option>
            {thanhVienList.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </div>

        {error && <p className="hint error-text">{error}</p>}

        <div className="qr-modal-actions">
          <button type="button" className="cancel-btn" onClick={onClose}>
            Đóng
          </button>
          <button
            type="button"
            className="submit-btn"
            disabled={!nguoiDanhDau || submitting}
            onClick={handleConfirm}
          >
            {submitting ? "Đang lưu..." : "Đã thanh toán"}
          </button>
        </div>
      </div>
    </div>
  );
}
