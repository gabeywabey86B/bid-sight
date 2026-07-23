import { useCallback, useEffect, useRef, useState } from "react";

// Fetch on mount, optionally poll every intervalMs. Replaces the
// useState+useEffect+.catch triplicated across pages.
export function useApi(fetchFn, { intervalMs } = {}) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const fetchRef = useRef(fetchFn);
  fetchRef.current = fetchFn;

  const refetch = useCallback(
    () => fetchRef.current().then(setData).catch((err) => setError(err.message)),
    []
  );

  useEffect(() => {
    refetch();
    if (!intervalMs) return;
    const id = setInterval(refetch, intervalMs);
    return () => clearInterval(id);
  }, [refetch, intervalMs]);

  return { data, error, refetch };
}
