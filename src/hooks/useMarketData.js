import { useQuery } from "@tanstack/react-query";

export default function useMarketData(secId) {
  return useQuery({
    queryKey: ["marketData", secId],
    queryFn: () => null, // no fetch
    enabled: false, // prevent auto call
    initialData: null,
  });
};