import { useEffect, useState } from "react";
import ExpenseForm from "./components/ExpenseForm";
import ChotSo from "./components/ChotSo";
import LichSuChot from "./components/LichSuChot";
import PinGate, { PIN_STORAGE_KEY } from "./components/PinGate";
import { APPS_SCRIPT_URL } from "./config";
import "./App.css";

const TABS = [
  { key: "chiTieu", label: "Kê khai chi tiêu" },
  { key: "chotSo", label: "Chốt sổ" },
  { key: "lichSu", label: "Lịch sử chốt" },
];

// Apps Script Web App đôi khi phản hồi chậm (cold start) hoặc lỗi kết nối thoáng qua,
// nên thử lại vài lần trước khi báo lỗi hẳn cho người dùng.
const MAX_FETCH_ATTEMPTS = 3;
const RETRY_DELAY_MS = 2000;

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function App() {
  const [unlocked, setUnlocked] = useState(() => !!localStorage.getItem(PIN_STORAGE_KEY));
  const [tab, setTab] = useState("chiTieu");
  // Danh sách thành viên + gợi ý nội dung chi: dùng chung cho cả 3 tab, chỉ fetch 1 lần
  // sau khi unlock thay vì để mỗi tab tự fetch lại khi mount.
  const [sharedData, setSharedData] = useState(null);
  const [sharedDataError, setSharedDataError] = useState("");
  const [retryAttempt, setRetryAttempt] = useState(0);

  useEffect(() => {
    if (!unlocked) return;
    let cancelled = false;

    async function loadSharedData() {
      for (let attempt = 1; attempt <= MAX_FETCH_ATTEMPTS; attempt++) {
        if (cancelled) return;
        setRetryAttempt(attempt);
        try {
          const res = await fetch(APPS_SCRIPT_URL);
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          let data;
          try {
            data = await res.json();
          } catch {
            throw new Error("invalid-json");
          }
          if (cancelled) return;
          setSharedData({
            thanhVienList: data.thanhVien || [],
            danhMucNoiDung: data.danhMucNoiDung || [],
          });
          setSharedDataError("");
          return;
        } catch (err) {
          if (cancelled) return;
          if (attempt === MAX_FETCH_ATTEMPTS) {
            setSharedDataError(
              err.message === "invalid-json"
                ? "Máy chủ (Google Apps Script) trả về dữ liệu không hợp lệ. Vui lòng tải lại trang; nếu vẫn lỗi, kiểm tra lại APPS_SCRIPT_URL trong src/config.js."
                : "Không kết nối được máy chủ (Google Apps Script) sau nhiều lần thử — máy chủ có thể đang phản hồi chậm. Vui lòng tải lại trang; nếu vẫn lỗi, kiểm tra lại APPS_SCRIPT_URL trong src/config.js."
            );
            return;
          }
          await delay(RETRY_DELAY_MS * attempt);
        }
      }
    }

    loadSharedData();
    return () => {
      cancelled = true;
    };
  }, [unlocked]);

  function handleLock() {
    localStorage.removeItem(PIN_STORAGE_KEY);
    setUnlocked(false);
    setSharedData(null);
    setSharedDataError("");
    setRetryAttempt(0);
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
                <span>
                  {retryAttempt > 1
                    ? `Đang tải dữ liệu... (thử lại lần ${retryAttempt}/${MAX_FETCH_ATTEMPTS})`
                    : "Đang tải dữ liệu..."}
                </span>
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
                  <LichSuChot thanhVienList={sharedData.thanhVienList} onPinRejected={handleLock} />
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
