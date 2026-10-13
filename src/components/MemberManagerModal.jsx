import { useState } from "react";
import { createMember, deleteMember } from "../lib/firestoreApi";
import { BANKS } from "../lib/banks";
import "./QRPaymentModal.css";
import "./MemberManagerModal.css";

// Popup quản lý người dùng: tab "Thêm người" và tab "Danh sách" (xoá người).
// Thay đổi xong gọi onChanged() để cha tải lại danh sách.
export default function MemberManagerModal({ existingNames, onClose, onChanged }) {
  const [tab, setTab] = useState("them");

  return (
    <div className="qr-modal-overlay" onMouseDown={onClose}>
      <div className="qr-modal member-modal" onMouseDown={(e) => e.stopPropagation()}>
        <p className="qr-modal-title">
          <strong>Quản lý người dùng</strong>
        </p>
        <nav className="tabs member-tabs">
          <button
            type="button"
            className={`tab${tab === "them" ? " tab-active" : ""}`}
            onClick={() => setTab("them")}
          >
            Thêm người
          </button>
          <button
            type="button"
            className={`tab${tab === "danhSach" ? " tab-active" : ""}`}
            onClick={() => setTab("danhSach")}
          >
            Danh sách ({existingNames.length})
          </button>
        </nav>

        {tab === "them" ? (
          <AddMemberTab existingNames={existingNames} onClose={onClose} onSaved={onChanged} />
        ) : (
          <MemberListTab names={existingNames} onClose={onClose} onDeleted={onChanged} />
        )}
      </div>
    </div>
  );
}

function AddMemberTab({ existingNames, onClose, onSaved }) {
  const [ten, setTen] = useState("");
  const [nganHang, setNganHang] = useState("");
  const [stk, setStk] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSuccess("");
    const name = ten.trim();
    if (!name) return setError("Vui lòng nhập tên.");
    if (existingNames.some((n) => n.toLowerCase() === name.toLowerCase())) {
      return setError("Tên này đã tồn tại.");
    }
    if (!!nganHang !== !!stk.trim()) {
      return setError("Cần chọn ngân hàng và nhập số tài khoản cùng lúc (hoặc để trống cả hai).");
    }
    const bank = BANKS.find((b) => b.ten === nganHang);

    setSubmitting(true);
    try {
      await createMember({ ten: name, nganHang: bank?.ten, stk: stk.trim(), bin: bank?.bin });
      await onSaved();
      setTen("");
      setNganHang("");
      setStk("");
      setSuccess(`Đã thêm "${name}".`);
    } catch (err) {
      setError("Lưu thất bại: " + err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="member-tab-body" onSubmit={handleSubmit}>
      <div className="field">
        <label htmlFor="memTen">Tên</label>
        <input type="text" id="memTen" value={ten} onChange={(e) => setTen(e.target.value)} autoFocus required />
      </div>
      <div className="field">
        <label htmlFor="memNganHang">Ngân hàng (tuỳ chọn)</label>
        <select id="memNganHang" value={nganHang} onChange={(e) => setNganHang(e.target.value)}>
          <option value="">-- Chọn ngân hàng --</option>
          {BANKS.map((b) => (
            <option key={b.bin} value={b.ten}>
              {b.ten}
            </option>
          ))}
        </select>
      </div>
      <div className="field">
        <label htmlFor="memStk">Số tài khoản (tuỳ chọn)</label>
        <input type="text" id="memStk" inputMode="numeric" value={stk} onChange={(e) => setStk(e.target.value)} />
      </div>

      {error && <p className="hint error-text">{error}</p>}
      {success && <p className="status status-success">{success}</p>}

      <div className="qr-modal-actions">
        <button type="button" className="cancel-btn" onClick={onClose} disabled={submitting}>
          Đóng
        </button>
        <button type="submit" className="submit-btn" disabled={submitting}>
          {submitting ? "Đang lưu..." : "Lưu"}
        </button>
      </div>
    </form>
  );
}

function MemberListTab({ names, onClose, onDeleted }) {
  // confirming: tên đang chờ xác nhận xoá; deleting: tên đang gọi API xoá.
  const [confirming, setConfirming] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleDelete(ten) {
    setError("");
    setSuccess("");
    setDeleting(ten);
    try {
      await deleteMember(ten);
      await onDeleted();
      setSuccess(`Đã xoá "${ten}".`);
    } catch (err) {
      setError(err.code === "has-unpaid" ? err.message : "Xoá thất bại: " + err.message);
    } finally {
      setDeleting(null);
      setConfirming(null);
    }
  }

  return (
    <div className="member-tab-body">
      <p className="hint">Chỉ xoá được người không còn khoản chi chưa chốt hoặc khoản nợ chưa thanh toán.</p>
      {names.length === 0 ? (
        <p className="hint">Chưa có thành viên nào.</p>
      ) : (
        <ul className="member-list">
          {names.map((ten) => (
            <li key={ten} className="member-row">
              <span className="member-name">{ten}</span>
              {confirming === ten ? (
                <span className="member-row-actions">
                  <button
                    type="button"
                    className="member-btn"
                    onClick={() => setConfirming(null)}
                    disabled={deleting === ten}
                  >
                    Huỷ
                  </button>
                  <button
                    type="button"
                    className="member-btn member-btn-danger"
                    onClick={() => handleDelete(ten)}
                    disabled={deleting === ten}
                  >
                    {deleting === ten ? "Đang kiểm tra..." : "Xác nhận xoá"}
                  </button>
                </span>
              ) : (
                <button
                  type="button"
                  className="member-btn member-btn-danger"
                  onClick={() => {
                    setError("");
                    setSuccess("");
                    setConfirming(ten);
                  }}
                  disabled={!!deleting}
                >
                  Xoá
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {error && <p className="status status-error">{error}</p>}
      {success && <p className="status status-success">{success}</p>}

      <div className="qr-modal-actions">
        <button type="button" className="cancel-btn" onClick={onClose} disabled={!!deleting}>
          Đóng
        </button>
      </div>
    </div>
  );
}
