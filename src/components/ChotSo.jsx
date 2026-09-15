import { useEffect, useState } from "react";
import { previewSettlement, commitSettlement } from "../lib/firestoreApi";
import { unlockWithPin } from "../lib/session";
import SettlementSummary from "./SettlementSummary";
import "./ChotSo.css";

export default function ChotSo({ thanhVienList, onPinRejected }) {
  const [preview, setPreview] = useState(null);
  const [loadError, setLoadError] = useState("");

  const [nguoiChot, setNguoiChot] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmPin, setConfirmPin] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState(null); // { type: 'success' | 'error', message }
  const [result, setResult] = useState(null); // kết quả sau khi chốt thành công

  useEffect(() => {
    previewSettlement(thanhVienList)
      .then(setPreview)
      .catch((err) => {
        setLoadError("Không tải được số liệu: " + err.message);
        if (err.code === "permission-denied") onPinRejected?.();
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleConfirmSubmit(e) {
    e.preventDefault();
    setStatus(null);
    setSubmitting(true);
    try {
      // Xác nhận lại PIN trước khi chốt - dùng lại đúng cơ chế unlock (Firestore
      // Rules so khớp config/pin phía server), không phải chỉ là bước UI cho có.
      await unlockWithPin(confirmPin);
      const data = await commitSettlement({
        nguoiChot,
        userAgent: navigator.userAgent,
        memberNames: thanhVienList,
      });
      setResult(data);
      setShowConfirm(false);
      setStatus({ type: "success", message: `Đã chốt sổ xong (kỳ ${data.kyId}).` });
    } catch (err) {
      const wrongPin = err.code === "permission-denied";
      setStatus({
        type: "error",
        message: wrongPin ? "Mã PIN xác nhận không đúng." : "Chốt sổ thất bại: " + err.message,
      });
    } finally {
      setSubmitting(false);
    }
  }

  if (loadError) {
    return <p className="hint error-text">{loadError}</p>;
  }

  if (result) {
    return (
      <div className="chot-so">
        {status && <p className={`status status-${status.type}`}>{status.message}</p>}
        <SettlementSummary perPerson={result.perPerson} transactions={result.transactions} />
      </div>
    );
  }

  if (!preview) {
    return <p className="hint">Đang tải số liệu...</p>;
  }

  if (preview.soDongChiTieu === 0) {
    return <p className="hint">Không có khoản chi nào để chốt sổ.</p>;
  }

  return (
    <div className="chot-so">
      <p className="chot-so-range">
        Từ {preview.tuNgay} đến {preview.denNgay} — {preview.soDongChiTieu} khoản chi
      </p>

      <SettlementSummary perPerson={preview.perPerson} transactions={preview.transactions} />

      <div className="field">
        <label htmlFor="nguoiChot">Người thực hiện chốt sổ</label>
        <select
          id="nguoiChot"
          value={nguoiChot}
          onChange={(e) => setNguoiChot(e.target.value)}
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

      {!showConfirm ? (
        <button
          type="button"
          className="submit-btn"
          disabled={!nguoiChot}
          onClick={() => setShowConfirm(true)}
        >
          Chốt sổ
        </button>
      ) : (
        <form className="pin-gate chot-so-confirm" onSubmit={handleConfirmSubmit}>
          <p className="pin-gate-hint">Nhập lại mã PIN nhóm để xác nhận chốt sổ</p>
          <input
            type="password"
            inputMode="numeric"
            autoFocus
            maxLength={12}
            placeholder="Mã PIN"
            value={confirmPin}
            onChange={(e) => setConfirmPin(e.target.value)}
            required
          />
          <div className="chot-so-confirm-actions">
            <button type="button" className="cancel-btn" onClick={() => setShowConfirm(false)}>
              Huỷ
            </button>
            <button type="submit" disabled={submitting || !confirmPin}>
              {submitting ? "Đang chốt sổ..." : "Xác nhận chốt sổ"}
            </button>
          </div>
        </form>
      )}

      {status && <p className={`status status-${status.type}`}>{status.message}</p>}
    </div>
  );
}
