import { useEffect } from "react";
import useMarketData from "./useMarketData";
import useOptionInstruments from "./useOptionInstruments";
import { wsRef, optionMap } from "../api/marketSocket";

const EXCHANGE_MAP = {
  SENSEX: "BSEFO",
  BANKEX: "BSEFO",
};

function getExchange(indexName) {
  return EXCHANGE_MAP[indexName.toUpperCase()] ?? "NSEFO";
}

export default function useAtmSubscription(indexName, indexSecId) {
  const { data: marketData } = useMarketData(indexSecId);
  const spotPrice = marketData?.ltp ?? null;

  const { atmStrike, expiry, ceSecId, peSecId, isReady } =
    useOptionInstruments(indexName, spotPrice);

  useEffect(() => {
    if (!isReady || !ceSecId || !peSecId) return;
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;

    const exchange = getExchange(indexName);

    optionMap[ceSecId] = { indexSecId, type: "ce" };
    optionMap[peSecId] = { indexSecId, type: "pe" };

    wsRef.current.send(
      JSON.stringify({ Message: "Broadcast", EXC: exchange, SECID: ceSecId })
    );
    wsRef.current.send(
      JSON.stringify({ Message: "Broadcast", EXC: exchange, SECID: peSecId })
    );

    return () => {
      delete optionMap[ceSecId];
      delete optionMap[peSecId];
    };
  }, [isReady, ceSecId, peSecId, indexSecId, indexName]);

  return { spotPrice, atmStrike, expiry, isReady };
}