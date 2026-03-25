import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { INDEXES, MultiTradeInstrumentIDs } from "../constants/instruments";

// ─────────────────────────────────────────────────────────────────────────────
// Module-level in-memory store — resets on page load, never persists
//
// store:     { [secId]: { candles: [{time,value}], current: {time,value}|null } }
// atmPrices: { [indexSecId]: { ce: number, pe: number } }
// optionMap: { [optionSecId]: { indexSecId, type: "ce"|"pe" } }
// wsRef:     holds the live WebSocket instance
// ─────────────────────────────────────────────────────────────────────────────
const store     = {};
const atmPrices = {};

export const wsRef     = { current: null };
export const optionMap = {};  // mutated by IndexPage on instrument select

// ─────────────────────────────────────────────────────────────────────────────
// Called by IndexPage whenever a new instrument is selected.
// Wipes all stored data for that index + its ATM key so charts start fresh.
// ─────────────────────────────────────────────────────────────────────────────
export function clearInstrumentData(indexSecId) {
  // Clear index price store
  store[indexSecId] = { candles: [], current: null };

  // Clear ATM combined premium store
  const atmKey = `atm_${indexSecId}`;
  store[atmKey] = { candles: [], current: null };

  // Clear ATM price tracker so old CE/PE prices don't bleed into new selection
  delete atmPrices[indexSecId];

  // Remove all entries from optionMap that belonged to this index
  Object.keys(optionMap).forEach((optSecId) => {
    if (optionMap[optSecId]?.indexSecId === indexSecId) {
      delete optionMap[optSecId];
    }
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Internal helpers
// ─────────────────────────────────────────────────────────────────────────────
const IST_OFFSET = 5.5 * 60 * 60;

function minuteBucketIST() {
  const nowIST = Math.floor(Date.now() / 1000) + IST_OFFSET;
  return nowIST - (nowIST % 60);
}

function addTick(secId, price) {
  const bucket = minuteBucketIST();
  if (!store[secId]) store[secId] = { candles: [], current: null };
  const inst = store[secId];

  if (!inst.current) {
    inst.current = { time: bucket, value: price };
  } else if (inst.current.time !== bucket) {
    inst.candles.push({ ...inst.current });
    inst.current = { time: bucket, value: price };
  } else {
    inst.current.value = price;
  }
}

function getSeries(secId) {
  const inst = store[secId];
  if (!inst) return [];
  return inst.current
    ? [...inst.candles, { ...inst.current }]
    : [...inst.candles];
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────────────────────
export default function useMarketSocket() {
  const queryClient = useQueryClient();

  useEffect(() => {
    // Fresh start on page load — wipe all index stores
    INDEXES.forEach((instrument) => {
      const secId = MultiTradeInstrumentIDs[instrument];
      store[secId] = { candles: [], current: null };
      queryClient.setQueryData(["chartData",    secId], []);
      queryClient.setQueryData(["atmChartData", secId], []);
    });

    const ws = new WebSocket("wss://ctrade.jainam.in:31102");
    wsRef.current = ws;

    ws.onopen = () => {
      console.log("✅ WebSocket Connected");
      INDEXES.forEach((instrument) => {
        const exchange =
          instrument === "SENSEX" || instrument === "BANKEX" ? "BSECM" : "NSECM";
        ws.send(
          JSON.stringify({
            Message: "Broadcast",
            EXC:     exchange,
            SECID:   MultiTradeInstrumentIDs[instrument],
          })
        );
      });
    };

    ws.onmessage = (event) => {
      try {
        const data   = JSON.parse(event.data);
        if (data.Message !== "Broadcast") return;

        const secId  = parseInt(data.SECID)||data.SECID;
        const ltp    = parseFloat(data.LTP ?? data.ltp    ?? 0);
        const change = parseFloat(data.CHN ?? data.change ?? 0);
        if (!ltp) return;

        // ── Index tick ───────────────────────────────────────
        const indexValues = Object.values(MultiTradeInstrumentIDs);
        if (indexValues.includes(secId)) {
          addTick(secId, ltp);
          queryClient.setQueryData(["marketData", secId], { ltp, change });
          queryClient.setQueryData(["chartData",  secId], getSeries(secId));
          return;
        }

        // ── Option tick (CE or PE) ───────────────────────────
        const entry = optionMap[secId];
        if (!entry) return; // not currently subscribed — ignore

        const { indexSecId, type } = entry;

        // Guard: only accumulate if this option still belongs to active selection
        if (!atmPrices[indexSecId]) atmPrices[indexSecId] = { ce: 0, pe: 0 };
        atmPrices[indexSecId][type] = ltp;

        const combined =
          (atmPrices[indexSecId].ce || 0) + (atmPrices[indexSecId].pe || 0);

        if (combined > 0) {
          const atmKey = `atm_${indexSecId}`;
          addTick(atmKey, combined);
          queryClient.setQueryData(
            ["atmChartData", indexSecId],
            getSeries(atmKey)
          );
        }
      } catch (err) {
        console.error("WS parse error", err);
      }
    };

    ws.onerror = (err) => console.error("WS Error", err);
    ws.onclose = () => {
      console.log("WS Closed");
      wsRef.current = null;
    };

    return () => {
      ws.close();
      wsRef.current = null;
    };
  }, [queryClient]);
}