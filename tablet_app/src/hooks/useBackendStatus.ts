import { useEffect, useState } from "react";
import BASE_URL from "../services/api";

export function useBackendStatus() {
  const [status, setStatus] = useState("checking");

  useEffect(() => {
    fetch(`${BASE_URL}/`, { signal: AbortSignal.timeout(5000) })
      .then((res) => setStatus(res.ok ? "online" : "offline"))
      .catch(() => setStatus("offline"));
  }, []);

  return status;
}
