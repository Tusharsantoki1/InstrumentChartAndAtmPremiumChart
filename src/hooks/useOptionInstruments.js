import { useQuery } from "@tanstack/react-query";
import optionData from "../data/multi_trade_response_data.json";

// ─────────────────────────────────────────────────────────────────────────────
// Step sizes per symbol
// Used for ATM rounding — all NSE indices = 50, BSE = 100
// ─────────────────────────────────────────────────────────────────────────────
const STEP_SIZE = {
  SENSEX:     100,
  BANKEX:     100,
  NIFTY:       50,
  BANKNIFTY:   50,
  FINNIFTY:    50,
  MIDCPNIFTY:  50,
};

/**
 * Round spot price to the nearest ATM strike.
 * Returns a plain number e.g. 22950
 */
function calcATMStrike(symbol, spotPrice) {
  const step = STEP_SIZE[symbol.toUpperCase()] ?? 50;
  const atm  = Math.round(spotPrice / step) * step;
  console.log(
    `[useOptionInstruments] symbol=${symbol} | spotPrice=${spotPrice} | step=${step} | atmStrike=${atm}`
  );
  return atm;
}

/**
 * Parse expiry string "25MAR2026" → Date (midnight local)
 */
function parseExpiry(str) {
  const MONTHS = {
    JAN: 0, FEB: 1, MAR: 2, APR: 3, MAY: 4, JUN: 5,
    JUL: 6, AUG: 7, SEP: 8, OCT: 9, NOV: 10, DEC: 11,
  };
  const day   = parseInt(str.slice(0, 2), 10);
  const month = MONTHS[str.slice(2, 5).toUpperCase()];
  const year  = parseInt(str.slice(5), 10);
  return new Date(year, month, day);
}

/**
 * From a list of option rows, return the raw expiry_date string
 * for the nearest upcoming expiry (today or future).
 */
function getNearestExpiry(rows) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Deduplicate expiry strings, parse each, keep only future dates, sort asc
  const sorted = [...new Set(rows.map((r) => r.expiry_date))]
    .map((raw) => ({ raw, date: parseExpiry(raw) }))
    .filter(({ date }) => date >= today)
    .sort((a, b) => a.date - b.date);

  console.log(
    "[useOptionInstruments] All upcoming expiries (sorted):",
    sorted.map((e) => e.raw)
  );

  return sorted[0]?.raw ?? null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook
//
// @param symbol     {string}      e.g. "NIFTY" — must match JSON `symbol` field
// @param spotPrice  {number|null} live LTP from marketData React Query cache
//
// @returns {{
//   atmStrike : number | null
//   expiry    : string | null   e.g. "25MAR2026"
//   ceSecId   : string | null   security_id for the ATM CE
//   peSecId   : string | null   security_id for the ATM PE
//   isReady   : boolean         true when both CE and PE secIds are found
// }}
//
// NOTE: This hook ONLY returns security_id strings from the static JSON.
//       It does NOT contain live prices — live prices (LTP) are fed by the
//       WebSocket via marketSocket.js after subscribing with these security_ids.
// ─────────────────────────────────────────────────────────────────────────────
export default function useOptionInstruments(symbol, spotPrice) {
  const { data } = useQuery({
    queryKey: ["optionInstruments", symbol, spotPrice],
    enabled:  !!symbol && !!spotPrice,
    staleTime: Infinity, // result only changes if symbol or spotPrice changes

    queryFn: () => {
      console.log(
        `\n━━━ useOptionInstruments ━━━\nsymbol: ${symbol} | spotPrice: ${spotPrice}`
      );

      // ── Step 1: filter JSON by symbol ─────────────────────────────────────
      const bySymbol = optionData.filter(
        (row) => row.symbol.trim().toUpperCase() === symbol.trim().toUpperCase()
      );
      console.log(`[Step 1] Rows matching symbol "${symbol}":`, bySymbol.length);
      if (!bySymbol.length) {
        console.warn(`[Step 1] ❌ No rows found for symbol "${symbol}". Check JSON symbol field.`);
        return null;
      }

      // ── Step 2: calculate ATM strike ──────────────────────────────────────
      const atmStrike = calcATMStrike(symbol, spotPrice);
      console.log(`[Step 2] ATM Strike = ${atmStrike}`);

      // ── Step 3: find nearest expiry ───────────────────────────────────────
      const expiry = getNearestExpiry(bySymbol);
      console.log(`[Step 3] Nearest expiry = ${expiry}`);
      if (!expiry) {
        console.warn("[Step 3] ❌ No upcoming expiry found.");
        return null;
      }

      // ── Step 4: filter by expiry + ATM strike ─────────────────────────────
      // IMPORTANT: strike_price in JSON is a string like "22950.00"
      // We compare parseFloat(row.strike_price) === atmStrike (both numbers)
      const atmRows = bySymbol.filter((row) => {
        const rowStrike  = parseFloat(row.strike_price); // "22950.00" → 22950
        const rowExpiry  = row.expiry_date;
        const strikeMatch = rowStrike === atmStrike;
        const expiryMatch = rowExpiry === expiry;
        return strikeMatch && expiryMatch;
      });

      

      if (!atmRows.length) {
        // Helpful debug: show what strikes ARE available at this expiry
        const availableStrikes = [
          ...new Set(
            bySymbol
              .filter((r) => r.expiry_date === expiry)
              .map((r) => parseFloat(r.strike_price))
          ),
        ].sort((a, b) => a - b);
        console.warn(
          availableStrikes
        );
        return null;
      }

      // ── Step 5: extract CE and PE security_ids ────────────────────────────
      const ceRow = atmRows.find((r) => r.option_type.toUpperCase() === "CE");
      const peRow = atmRows.find((r) => r.option_type.toUpperCase() === "PE");


      const ceSecId = ceRow?.security_id ?? null;
      const peSecId = peRow?.security_id ?? null;


      return { atmStrike, expiry, ceSecId, peSecId };
    },
  });

  return {
    atmStrike : data?.atmStrike ?? null,
    expiry    : data?.expiry    ?? null,
    ceSecId   : data?.ceSecId   ?? null,
    peSecId   : data?.peSecId   ?? null,
    isReady   : !!(data?.ceSecId && data?.peSecId),
  };
}