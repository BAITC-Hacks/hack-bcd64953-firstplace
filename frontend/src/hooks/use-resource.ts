"use client";
import { useEffect, useEffectEvent, useState } from "react";
export function useResource<T>(key: string, loader: () => Promise<T>) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);
  const [version, setVersion] = useState(0);
  const load = useEffectEvent(loader);
  useEffect(() => {
    let active = true;
    Promise.resolve().then(async () => {
      if (!active) return;
      setLoading(true);
      setError(null);
      setData(null);
      try {
        const value = await load();
        if (active) setData(value);
      } catch (e) {
        if (active) setError(e);
      } finally {
        if (active) setLoading(false);
      }
    });
    return () => {
      active = false;
    };
  }, [key, version]);
  return {
    data,
    error,
    loading,
    reload: () => setVersion((v) => v + 1),
    setData,
  };
}
export function useAction() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [success, setSuccess] = useState("");
  async function run<T>(
    action: () => Promise<T>,
    done?: (value: T) => void,
    message = "",
  ) {
    if (busy) return;
    setBusy(true);
    setError(null);
    setSuccess("");
    try {
      const result = await action();
      done?.(result);
      if (message) setSuccess(message);
      return result;
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }
  return { busy, error, success, run, setError, setSuccess };
}
