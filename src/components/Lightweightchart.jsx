import { useEffect, useRef } from "react";
import { createChart, ColorType, LineSeries } from "lightweight-charts";
import { useQuery } from "@tanstack/react-query";


export default function LightweightChart({
  secId,
  queryKey    = "chartData",
  parentSecId = null,
  color       = "#2563eb",
}) {
  const containerRef = useRef(null);
  const chartRef     = useRef(null);
  const seriesRef    = useRef(null);

  // Determine which React Query key to subscribe to
  const resolvedKey = queryKey === "atmChartData"
    ? ["atmChartData", parentSecId]
    : ["chartData", secId];

  const { data: points = [] } = useQuery({
    queryKey: resolvedKey,
    queryFn:  () => [],
    enabled:  false,
  });

  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;

    const chart = createChart(container, {
      width:  container.clientWidth,
      height: container.clientHeight,
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor:  "#888",
      },
      grid: {
        vertLines: { visible: false },
        horzLines: { color: "#f0f0f0" },
      },
      rightPriceScale: {
        borderVisible: false,
        scaleMargins: { top: 0.15, bottom: 0.15 },
      },
      timeScale: {
        borderVisible:  false,
        timeVisible:    true,
        secondsVisible: false,
        tickMarkFormatter: (time) => {
          const d = new Date(time * 1000);
          const h = String(d.getUTCHours()).padStart(2, "0");
          const m = String(d.getUTCMinutes()).padStart(2, "0");
          return `${h}:${m}`;
        },
      },
      handleScroll: { mouseWheel: true, pressedMouseMove: true },
      handleScale:  { mouseWheel: true, pinch: true },
    });

    const series = chart.addSeries(LineSeries, {
      color,
      lineWidth:              2,
      crosshairMarkerVisible: true,
      priceLineVisible:       true,
      lastValueVisible:       true,
    });

    chartRef.current  = chart;
    seriesRef.current = series;

    const ro = new ResizeObserver(() => {
      chart.applyOptions({ width: container.clientWidth });
    });
    ro.observe(container);

    return () => {
      ro.disconnect();
      chart.remove();
      chartRef.current  = null;
      seriesRef.current = null;
    };
  }, [secId, color]);


  useEffect(() => {
    if (!seriesRef.current || !points.length) return;
    seriesRef.current.setData(points);
    chartRef.current?.timeScale().scrollToRealTime();
  }, [points]);

  return <div ref={containerRef} className="chart-container" />;
}