import { useEffect, useState } from "react";
import { fetchSettlementHistory, revertSettlement } from "../lib/firestoreApi";
import { unlockWithPin } from "../lib/session";
import SettlementSummary from "./SettlementSummary";
import "./LichSuChot.css";

const formatVnd = (value) => Number(value || 0).toLocaleString("vi-VN") + " đ";

export default function LichSuChot({ thanhVienList, bankInfo, onPinRejected }) {
  const [kyList, setKyList] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [expandedKyId, setExpandedKyId] = useState(null);

  const [revertKyId, setRevertKyId] = useState(null); // kỳ đang mở form xác nhận huỷ chốt
  const [revertPin, setRevertPin] = useState("");
  const [reverting, setReverting] = useState(false);
  const [status, setStatus] = useState(null); // { type: 'success' | 'error', message }

  useEffect(() => {
    fetchSettlementHistory()
      .then(setKyList)
      .catch((err) => {
        setLoadError("Không tải được lịch sử: " + err.message);
        if (err.code === "permission-denied") onPinRejected?.();
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleTransactionUpdated(kyId, updatedTransactions) {
    setKyList((list) =>
      list.map((ky) => (ky.kyId === kyId ? { ...ky, transactions: updatedTransactions } : ky))
    );
  }

  function openRevert(kyId) {
    setRevertKyId(kyId);
    setRevertPin("");
    setStatus(null);
  }

  async function handleRevertSubmit(e) {
    e.preventDefault();
    const kyId = revertKyId;
    setStatus(null);
    setReverting(true);
    try {
      // Xác nhận lại PIN trước khi huỷ chốt, giống bước xác nhận khi chốt sổ.
      await unlockWithPin(revertPin);
      await revertSettlement(kyId);
      setKyList((list) => list.filter((ky) => ky.kyId !== kyId));
      setRevertKyId(null);
      setExpandedKyId(null);
      setStatus({
        type: "success",
        message: `Đã huỷ chốt kỳ ${kyId}. Các khoản chi đã trở về trạng thái chưa chốt.`,
      });
    } catch (err) {
      const wrongPin = err.code === "permission-denied";
      setStatus({
        type: "error",
        message: wrongPin ? "Mã PIN xác nhận không đúng." : "Huỷ chốt thất bại: " + err.message,
      });
    } finally {
      setReverting(false);
    }
  }

  if (loadError) return <p className="hint error-text">{loadError}</p>;
  if (!kyList) return <p className="hint">Đang tải lịch sử...</p>;

  return (
    <div className="lich-su-chot">
      {status && <p className={`status status-${status.type}`}>{status.message}</p>}
      {kyList.length === 0 && <p className="hint">Chưa có kỳ chốt sổ nào.</p>}

      {kyList.map((ky, i) => {
        const expanded = expandedKyId === ky.kyId;
        const ngayChot = ky.ngayChot?.toDate ? ky.ngayChot.toDate() : new Date(ky.ngayChot);
        // Chỉ cho huỷ chốt kỳ mới nhất (danh sách sắp xếp ngayChot giảm dần) và
        // khi chưa có giao dịch nào được đánh dấu đã thanh toán.
        const daCoThanhToan = (ky.transactions || []).some((t) => t.daThanhToan);
        const canRevert = i === 0 && !daCoThanhToan;
        return (
          <div className="ky-card" key={ky.kyId}>
            <button
              type="button"
              className="ky-card-header"
              onClick={() => setExpandedKyId(expanded ? null : ky.kyId)}
              aria-expanded={expanded}
            >
              <div>
                <p className="ky-card-title">
                  {ky.kyId} — {ky.nguoiChot}
                </p>
                <p className="ky-card-sub">
                  {ngayChot.toLocaleString("vi-VN")} · {ky.soDongChiTieu} khoản chi
                </p>
              </div>
              <span className="ky-card-total">{formatVnd(ky.tongSoTien)}</span>
            </button>

            {expanded && (
              <div className="ky-card-body">
                <p className="chot-so-range">
                  Từ {ky.tuNgay} đến {ky.denNgay}
                </p>
                <SettlementSummary
                  perPerson={ky.perPerson}
                  transactions={ky.transactions}
                  kyId={ky.kyId}
                  bankInfo={bankInfo}
                  enablePayment
                  thanhVienList={thanhVienList}
                  onTransactionUpdated={(updated) => handleTransactionUpdated(ky.kyId, updated)}
                />

                {i === 0 && daCoThanhToan && (
                  <p className="hint">Kỳ này đã có người thanh toán nên không thể huỷ chốt.</p>
                )}
                {canRevert &&
                  (revertKyId !== ky.kyId ? (
                    <button type="button" className="cancel-btn" onClick={() => openRevert(ky.kyId)}>
                      Huỷ chốt kỳ này
                    </button>
                  ) : (
                    <form className="pin-gate chot-so-confirm" onSubmit={handleRevertSubmit}>
                      <p className="pin-gate-hint">
                        Huỷ chốt sẽ xoá kỳ này khỏi lịch sử và trả {ky.soDongChiTieu} khoản chi về
                        trạng thái chưa chốt. Nhập lại mã PIN nhóm để xác nhận.
                      </p>
                      <input
                        type="password"
                        inputMode="numeric"
                        autoFocus
                        maxLength={12}
                        placeholder="Mã PIN"
                        value={revertPin}
                        onChange={(e) => setRevertPin(e.target.value)}
                        required
                      />
                      <div className="chot-so-confirm-actions">
                        <button type="button" className="cancel-btn" onClick={() => setRevertKyId(null)}>
                          Thôi
                        </button>
                        <button type="submit" disabled={reverting || !revertPin}>
                          {reverting ? "Đang huỷ chốt..." : "Xác nhận huỷ chốt"}
                        </button>
                      </div>
                    </form>
                  ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
