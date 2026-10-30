"use client";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { initialData, parseData, type Data } from "@/lib/model";
const KEY = "renovation-quote-v1";
const Context = createContext<{
  data: Data;
  update: (fn: (d: Data) => Data) => void;
  ready: boolean;
  error: string;
}>(null!);
export function Store({ children }: { children: ReactNode }) {
  const [data, setData] = useState<Data>(initialData);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [blocked, setBlocked] = useState(false);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setData(parseData(raw));
    } catch {
      setError(
        "无法读取本地数据。原数据未覆盖；请备份浏览器数据后处理，当前修改仅在本次会话有效。",
      );
      setBlocked(true);
    }
    setReady(true);
  }, []);
  function update(fn: (d: Data) => Data) {
    const next = fn(data);
    setData(next);
    if (!blocked)
      try {
        localStorage.setItem(KEY, JSON.stringify(next));
        setError("");
      } catch {
        setError(
          "保存失败，浏览器存储不可用或空间不足。当前修改仅在本次会话有效。",
        );
      }
  }
  return (
    <Context.Provider value={{ data, update, ready, error }}>
      {children}
    </Context.Provider>
  );
}
export const useStore = () => useContext(Context);
