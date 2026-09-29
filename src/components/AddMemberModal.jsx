import { useState } from "react";
import { createMember } from "../lib/firestoreApi";
import "./QRPaymentModal.css";

// Popup thêm người dùng mới. Lưu xong gọi onSaved() để cha tải lại danh sách.
export default function AddMemberModal({ existingNames, onClose, onSaved }) {
  const [ten, setTen] = useState("");
  const [nganHang, setNganHang] = useState("");
  const [stk, setStk] = useState("");
  const [bin, setBin] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    const name = ten.trim();
    if (!name) return setError("Vui lòng nhập tên.");
    if (existingNames.some((n) => n.toLowerCase() === name.toLowerCase())) {
      return setError("Tên này đã tồn tại.");
    }
    const bankFilled = [nganHang, stk, bin].filter((v) => v.trim()).length;
    if (bankFilled > 0 && bankFilled < 3) {
      return setError("Thông tin ngân hàng cần nhập đủ 3 ô (hoặc để trống cả 3).");
    }

    setSubmitting(true);
    try {
      await createMember({ ten: name, nganHang: nganHang.trim(), stk: stk.trim(), bin: bin.trim() });
      await onSaved();
    } catch (err) {
      setError("Lưu thất bại: " + err.message);
      setSubmitting(false);
    }
  }

  return (
    <div className="qr-modal-overlay" onMouseDown={onClose}>
      <form className="qr-modal" onMouseDown={(e) => e.stopPropagation()} onSubmit={handleSubmit}>
        <p className="qr-modal-title">
          <strong>Thêm người dùng</strong>
        </p>

        <div className="field">
          <label htmlFor="memTen">Tên</label>
          <input type="text" id="memTen" value={ten} onChange={(e) => setTen(e.target.value)} autoFocus required />
        </div>
        <div className="field">
          <label htmlFor="memNganHang">Ngân hàng (tuỳ chọn)</label>
          <input type="text" id="memNganHang" value={nganHang} onChange={(e) => setNganHang(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="memStk">Số tài khoản (tuỳ chọn)</label>
          <input type="text" id="memStk" inputMode="numeric" value={stk} onChange={(e) => setStk(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="memBin">Mã BIN ngân hàng (tuỳ chọn)</label>
          <input type="text" id="memBin" inputMode="numeric" value={bin} onChange={(e) => setBin(e.target.value)} />
        </div>

        {error && <p className="hint error-text">{error}</p>}

        <div className="qr-modal-actions">
          <button type="button" className="cancel-btn" onClick={onClose} disabled={submitting}>
            Đóng
          </button>
          <button type="submit" className="submit-btn" disabled={submitting}>
            {submitting ? "Đang lưu..." : "Lưu"}
          </button>
        </div>
      </form>
    </div>
  );
}
