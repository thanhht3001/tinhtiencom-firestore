import { useState } from "react";
import { unlockWithPin } from "../lib/session";
import "./PinGate.css";

export default function PinGate({ onUnlock }) {
  const [pin, setPin] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await unlockWithPin(pin);
      onUnlock();
    } catch {
      setError("Mã PIN không chính xác");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="pin-gate" onSubmit={handleSubmit}>
      <p className="pin-gate-hint">Nhập mã PIN nhóm để tiếp tục</p>
      <input
        type="password"
        inputMode="numeric"
        autoFocus
        maxLength={12}
        placeholder="Mã PIN"
        value={pin}
        onChange={(e) => setPin(e.target.value)}
        required
      />
      <button type="submit" disabled={submitting || !pin}>
        {submitting ? "Đang kiểm tra..." : "Xác nhận"}
      </button>
      {error && <p className="pin-gate-error">{error}</p>}
    </form>
  );
}
