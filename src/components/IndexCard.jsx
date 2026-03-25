import useMarketData from "../hooks/useMarketData";
import { MultiTradeInstrumentIDs } from "../constants/instruments";
export default function IndexCard({ name, isSelected, onClick }) {
  const secId    = MultiTradeInstrumentIDs[name];
  const { data } = useMarketData(secId);
  const ltp      = data?.ltp    ?? null;
  const change   = data?.change ?? 0;
  const isUp     = change >= 0;

  const dirClass = ltp ? (isUp ? "up" : "down") : "";

  return (
    <div
      className={`index-card ${isSelected ? "selected" : ""} ${dirClass}`}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onClick()}
    >
      <div className="index-card-name">{name}</div>
      <div className={`index-card-price ${ltp ? dirClass : "muted"}`}>
        {ltp
          ? `₹${ltp.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`
          : "Connecting…"}
      </div>
    </div>
  );
}