
import LightweightChart from "./LightweightChart";

export default function ChartPanel({
  title,
  secId,
  color,
  queryKey,
  parentSecId,
  liveValue,
}) {
  return (
    <div className="chart-panel">
      <div className="chart-panel-header">
        <span className="chart-panel-title">{title}</span>
        {liveValue != null && (
          <span className="chart-panel-value">
            ₹{liveValue.toFixed(2)}
          </span>
        )}
      </div>
      <div className="chart-panel-body">
        <LightweightChart
          secId={secId}
          color={color}
          queryKey={queryKey}
          parentSecId={parentSecId}
        />
      </div>
    </div>
  );
}