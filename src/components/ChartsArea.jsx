
import { useQuery } from "@tanstack/react-query";
import useMarketData from "../hooks/useMarketData";
import useAtmSubscription from "../hooks/useAtmSubscription";
import AtmInfoBar from "./AtmInfoBar";
import ChartPanel from "./ChartPanel";


export default function ChartsArea({ indexName, indexSecId, onClose }) {
  const { data: marketData } = useMarketData(indexSecId);
  const ltp    = marketData?.ltp    ?? null;
  const change = marketData?.change ?? 0;
  const isUp   = change >= 0;

  // All ATM subscription side-effects live here, not in a UI-only component
  const atmSubscription = useAtmSubscription(indexName, indexSecId);

  // Read the latest ATM combined premium for the header badge
  const { data: atmPoints = [] } = useQuery({
    queryKey: ["atmChartData", indexSecId],
    queryFn:  () => [],
    enabled:  false,
  });
  const latestAtmValue =
    atmPoints.length > 0 ? atmPoints[atmPoints.length - 1].value : null;

  return (
    <div className="charts-area">
      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="charts-area-header">
        <div className="charts-area-name">{indexName}</div>
        {ltp && (
          <div className={`charts-area-ltp ${isUp ? "up" : "down"}`}>
            ₹{ltp.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </div>
        )}
        <button className="charts-area-close" onClick={onClose}>✕</button>
      </div>

      {/* ── ATM info bar ─────────────────────────────────────────── */}
      <AtmInfoBar {...atmSubscription} />

      {/* ── Chart panels ─────────────────────────────────────────── */}
      <div className="charts-row">
        <ChartPanel
          title={`${indexName} Spot Price`}
          secId={indexSecId}
          color="#2563eb"
        />
        <ChartPanel
          title="ATM Combined Premium (CE + PE)"
          secId={`atm_${indexSecId}`}
          queryKey="atmChartData"
          parentSecId={indexSecId}
          color="#9333ea"
          liveValue={latestAtmValue}
        />
      </div>
    </div>
  );
}