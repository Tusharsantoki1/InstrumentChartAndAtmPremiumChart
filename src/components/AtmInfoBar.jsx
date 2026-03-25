
export default function AtmInfoBar({ atmStrike, expiry, isReady, spotPrice }) {
  if (!spotPrice) return null;

  return (
    <div className="atm-info">
      <span className="atm-label">ATM</span>
      <span className="atm-strike">{atmStrike ?? "—"}</span>
      {expiry && <span className="atm-expiry">{expiry}</span>}
      {isReady
        ? <span className="atm-ready">ready</span>
        : <span className="atm-waiting">Calculating…</span>
      }
    </div>
  );
}