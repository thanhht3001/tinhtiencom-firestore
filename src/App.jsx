import { useEffect, useState } from "react";
import ExpenseForm from "./components/ExpenseForm";
import ChotSo from "./components/ChotSo";
import LichSuChot from "./components/LichSuChot";
import PinGate from "./components/PinGate";
import { isUnlocked, lock } from "./lib/session";
import { fetchMembersAndBankInfo, fetchSuggestions } from "./lib/firestoreApi";
import "./App.css";

const TABS = [
  { key: "chiTieu", label: "Kê khai chi tiêu" },
  { key: "chotSo", label: "Chốt sổ" },
  { key: "lichSu", label: "Lịch sử chốt" },
];

function App() {
  // authChecked: đã xong bước kiểm tra "thiết bị này có session hợp lệ trong
  // Firestore không" hay chưa (thay cho việc đọc cờ trong localStorage như bản
  // cũ - giờ trạng thái unlock nằm ở Firestore, cần 1 lần round-trip để biết).
  const [authChecked, setAuthChecked] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [tab, setTab] = useState("chiTieu");
  // Danh sách thành viên + thông tin ngân hàng + gợi ý nội dung: dùng chung cho
  // cả 3 tab, chỉ fetch 1 lần sau khi unlock thay vì để mỗi tab tự fetch lại.
  const [sharedData, setSharedData] = useState(null);
  const [sharedDataError, setSharedDataError] = useState("");

  useEffect(() => {
    isUnlocked()
      .then(setUnlocked)
      .catch(() => setUnlocked(false))
      .finally(() => setAuthChecked(true));
  }, []);

  useEffect(() => {
    if (!unlocked) return;
    let cancelled = false;

    Promise.all([fetchMembersAndBankInfo(), fetchSuggestions()])
      .then(([{ names, bankInfo }, danhMucNoiDung]) => {
        if (cancelled) return;
        setSharedData({ thanhVienList: names, bankInfo, danhMucNoiDung });
        setSharedDataError("");
      })
      .catch((err) => {
        if (cancelled) return;
        setSharedDataError("Không tải được dữ liệu: " + err.message);
      });

    return () => {
      cancelled = true;
    };
  }, [unlocked]);

  async function handleLock() {
    await lock();
    setUnlocked(false);
    setSharedData(null);
    setSharedDataError("");
  }

  if (!authChecked) {
    return (
      <main className="page">
        <div className="card">
          <h1>Kê khai chi tiêu</h1>
          <div className="loading-state">
            <span className="spinner" aria-hidden="true" />
            <span>Đang tải...</span>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="page">
      <div className="card">
        <h1>Kê khai chi tiêu</h1>
        {unlocked ? (
          <>
            <nav className="tabs">
              {TABS.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  className={`tab${tab === t.key ? " tab-active" : ""}`}
                  onClick={() => setTab(t.key)}
                >
                  {t.label}
                </button>
              ))}
            </nav>
            {sharedDataError && <p className="hint error-text">{sharedDataError}</p>}
            {!sharedData && !sharedDataError && (
              <div className="loading-state">
                <span className="spinner" aria-hidden="true" />
                <span>Đang tải dữ liệu...</span>
              </div>
            )}
            {sharedData && (
              <>
                {tab === "chiTieu" && (
                  <ExpenseForm
                    thanhVienList={sharedData.thanhVienList}
                    danhMucNoiDung={sharedData.danhMucNoiDung}
                    onPinRejected={handleLock}
                  />
                )}
                {tab === "chotSo" && (
                  <ChotSo thanhVienList={sharedData.thanhVienList} onPinRejected={handleLock} />
                )}
                {tab === "lichSu" && (
                  <LichSuChot
                    thanhVienList={sharedData.thanhVienList}
                    bankInfo={sharedData.bankInfo}
                    onPinRejected={handleLock}
                  />
                )}
              </>
            )}
          </>
        ) : (
          <PinGate onUnlock={() => setUnlocked(true)} />
        )}
      </div>
    </main>
  );
}

export default App;
