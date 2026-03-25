import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import useMarketSocket from "../api/marketSocket";
import { clearInstrumentData } from "../api/marketSocket";
import { MultiTradeInstrumentIDs } from "../constants/instruments";
import InstrumentList from "../components/InstrumentList";
import ChartsArea from "../components/ChartsArea";

export default function IndexPage() {
  useMarketSocket();

  const queryClient = useQueryClient();
  const [selectedIndex, setSelectedIndex] = useState(null);

  const selectedSecId = selectedIndex
    ? MultiTradeInstrumentIDs[selectedIndex]
    : null;

  // Clear stale data for the incoming instrument before charts mount
  useEffect(() => {
    if (!selectedSecId) return;

    clearInstrumentData(selectedSecId);
    queryClient.setQueryData(["chartData",    selectedSecId], []);
    queryClient.setQueryData(["atmChartData", selectedSecId], []);
  }, [selectedSecId, queryClient]);

  function handleSelect(name) {
    // Clicking the active card deselects it
    setSelectedIndex((prev) => (prev === name ? null : name));
  }

  return (
    <div className="page">
      <InstrumentList
        selectedIndex={selectedIndex}
        onSelect={handleSelect}
      />

      {/* key={selectedIndex} forces full remount on switch — charts start blank */}
      {selectedIndex && selectedSecId && (
        <ChartsArea
          key={selectedIndex}
          indexName={selectedIndex}
          indexSecId={selectedSecId}
          onClose={() => setSelectedIndex(null)}
        />
      )}
    </div>
  );
}