import { useEffect, useMemo, useState } from "react";
import { subscribeOpenExpenses } from "../lib/firestoreApi";
import "./ChiTieuChuaChot.css";

const SO_DONG_XEM_TRUOC = 5;

const formatVnd = (value) => Number(value || 0).toLocaleString("vi-VN") + " đ";

// ngayChi lưu dạng "yyyy-MM-dd" -> "dd/MM" (xem nhanh) hoặc "dd/MM/yyyy" (popup)
function formatNgay(ngayChi, coNam) {
  const [y, m, d] = String(ngayChi || "").split("-");
  if (!d) return String(ngayChi || "");
  return coNam ? `${d}/${m}/${y}` : `${d}/${m}`;
}

// Bỏ dấu tiếng Việt + chữ thường để gõ "an trua" vẫn khớp "Ăn trưa".
function boDau(text) {
  return String(text || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase();
}

function khopTuKhoa(exp, tuKhoa) {
  const q = boDau(tuKhoa).trim();
  if (!q) return true;
  const chuoi = boDau(
    [exp.noiDung, exp.nguoiChi, formatNgay(exp.ngayChi, true), ...exp.thamGia.map((t) => t.nguoi)].join(" ")
  );
  if (chuoi.includes(q)) return true;
  // Tìm theo số tiền: bỏ dấu chấm/phẩy/khoảng trắng, VD "150.000" hoặc "150000"
  const so = q.replace(/[.,\s]/g, "");
  return /^\d+$/.test(so) && String(exp.soTien).includes(so);
}

// Các khoản chi chưa chốt sổ: xem nhanh 5 dòng mới nhập (mờ) dưới form, bấm vào
// để mở popup xem toàn bộ + tìm kiếm.
export default function ChiTieuChuaChot({ onPinRejected }) {
  const [list, setList] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [moPopup, setMoPopup] = useState(false);

  useEffect(() => {
    return subscribeOpenExpenses(
      (data) => {
        setList(data);
        setLoadError("");
      },
      (err) => {
        setLoadError("Không tải được danh sách chi tiêu: " + err.message);
        if (err.code === "permission-denied") onPinRejected?.();
      }
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loadError) return <p className="hint error-text">{loadError}</p>;
  if (!list) return <p className="hint recent-hint">Đang tải các khoản chi gần đây...</p>;
  if (list.length === 0) return <p className="hint recent-hint">Chưa có khoản chi nào trong kỳ này.</p>;

  return (
    <>
      <button type="button" className="recent-preview" onClick={() => setMoPopup(true)}>
        <span className="recent-preview-title">
          Đã nhập gần đây ({list.length} khoản chưa chốt) — bấm để xem tất cả
        </span>
        {list.slice(0, SO_DONG_XEM_TRUOC).map((exp) => (
          <span className="recent-row" key={exp.id}>
            <span className="recent-date">{formatNgay(exp.ngayChi, false)}</span>
            <span className="recent-desc">{exp.noiDung}</span>
            <span className="recent-who">{exp.nguoiChi}</span>
            <span className="recent-amount">{formatVnd(exp.soTien)}</span>
          </span>
        ))}
      </button>
      {moPopup && <PopupChiTieu list={list} onClose={() => setMoPopup(false)} />}
    </>
  );
}

function PopupChiTieu({ list, onClose }) {
  const [tuKhoa, setTuKhoa] = useState("");
  const [moRongId, setMoRongId] = useState(null);

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const ketQua = useMemo(() => list.filter((exp) => khopTuKhoa(exp, tuKhoa)), [list, tuKhoa]);
  const tongTien = ketQua.reduce((sum, exp) => sum + exp.soTien, 0);

  return (
    <div className="qr-modal-overlay" onMouseDown={onClose}>
      <div className="qr-modal history-modal" onMouseDown={(e) => e.stopPropagation()}>
        <p className="qr-modal-title">
          <strong>Khoản chi chưa chốt sổ</strong>
        </p>
        <input
          type="search"
          className="history-search"
          placeholder="Tìm nội dung, người, ngày, số tiền..."
          value={tuKhoa}
          onChange={(e) => setTuKhoa(e.target.value)}
          autoFocus
        />
        <p className="history-summary">
          {ketQua.length} khoản · {formatVnd(tongTien)}
        </p>
        <div className="history-list">
          {ketQua.length === 0 && <p className="hint">Không có khoản nào khớp.</p>}
          {ketQua.map((exp) => {
            const moRong = moRongId === exp.id;
            return (
              <div className="history-item" key={exp.id}>
                <button
                  type="button"
                  className="history-item-head"
                  onClick={() => setMoRongId(moRong ? null : exp.id)}
                  aria-expanded={moRong}
                >
                  <span className="history-item-main">
                    <span className="history-item-desc">{exp.noiDung}</span>
                    <span className="history-item-meta">
                      {formatNgay(exp.ngayChi, true)} · {exp.nguoiChi} chi · {exp.thamGia.length} người
                    </span>
                  </span>
                  <span className="history-item-amount">{formatVnd(exp.soTien)}</span>
                </button>
                {moRong && (
                  <div className="history-item-detail">
                    <p className="history-item-method">{exp.phuongThucChia}</p>
                    {exp.thamGia.map((t) => (
                      <div className="history-share" key={t.nguoi}>
                        <span>{t.nguoi}</span>
                        <span>{formatVnd(t.soTien)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <div className="qr-modal-actions">
          <button type="button" className="cancel-btn" onClick={onClose}>
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
