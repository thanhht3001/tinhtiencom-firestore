import { useState } from "react";
import { createMember, setMemberActive } from "../lib/firestoreApi";
import { BANKS } from "../lib/banks";
import "./QRPaymentModal.css";
import "./MemberManagerModal.css";

// Popup quản lý người dùng: tab "Thêm người" và tab "Danh sách" (bật/tắt người).
// Thay đổi xong gọi onChanged() để cha tải lại danh sách.
export default function MemberManagerModal({ members, onClose, onChanged }) {
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
            Danh sách ({members.length})
          </button>
        </nav>

        {tab === "them" ? (
          <AddMemberTab existingNames={members.map((m) => m.ten)} onClose={onClose} onSaved={onChanged} />
        ) : (
          <MemberListTab members={members} onClose={onClose} onToggled={onChanged} />
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

function MemberListTab({ members, onClose, onToggled }) {
  // pending: tên đang gọi API bật/tắt.
  const [pending, setPending] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleToggle(ten, hoatDong) {
    setError("");
    setSuccess("");
    setPending(ten);
    try {
      await setMemberActive(ten, hoatDong);
      await onToggled();
      setSuccess(hoatDong ? `Đã bật "${ten}".` : `Đã tắt "${ten}".`);
    } catch (err) {
      setError(err.code === "has-unpaid" ? err.message : "Cập nhật thất bại: " + err.message);
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="member-tab-body">
      <p className="hint">
        Người bị tắt sẽ không hiện trong các danh sách chọn. Chỉ tắt được người không còn khoản chi chưa
        chốt hoặc khoản nợ chưa thanh toán.
      </p>
      {members.length === 0 ? (
        <p className="hint">Chưa có thành viên nào.</p>
      ) : (
        <ul className="member-list">
          {members.map(({ ten, hoatDong }) => (
            <li key={ten} className="member-row">
              <span className={`member-name${hoatDong ? "" : " member-name-off"}`}>{ten}</span>
              <button
                type="button"
                role="switch"
                aria-checked={hoatDong}
                aria-label={`${hoatDong ? "Tắt" : "Bật"} ${ten}`}
                className={`member-switch${hoatDong ? " member-switch-on" : ""}`}
                onClick={() => handleToggle(ten, !hoatDong)}
                disabled={!!pending}
              >
                <span className="member-switch-knob" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {pending && <p className="hint">Đang kiểm tra "{pending}"...</p>}
      {error && <p className="status status-error">{error}</p>}
      {success && <p className="status status-success">{success}</p>}

      <div className="qr-modal-actions">
        <button type="button" className="cancel-btn" onClick={onClose} disabled={!!pending}>
          Đóng
        </button>
      </div>
    </div>
  );
}
