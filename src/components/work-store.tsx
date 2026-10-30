"use client";
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { emptyWork, parseWork, type WorkData } from "@/lib/engineering";
const KEY = "renovation-engineering-v1";
const Context = createContext<{
  data: WorkData;
  ready: boolean;
  error: string;
  save: (fn: (d: WorkData) => WorkData) => boolean;
  backup: () => void;
}>(null!);
export function WorkStore({ children }: { children: ReactNode }) {
  const [data, setData] = useState<WorkData>(emptyWork);
  const current = useRef(data);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const blocked = useRef(false);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const d = parseWork(raw);
        current.current = d;
        setData(d);
      }
    } catch {
      blocked.current = true;
      setError(
        "工程数据读取失败，原数据未覆盖。请先导出备份并检查存储；原材料报价不受影响。",
      );
    }
    setReady(true);
  }, []);
  function save(fn: (d: WorkData) => WorkData) {
    try {
      if (blocked.current)
        throw Error("工程存储已保护，请备份后修复损坏的数据，暂不能保存。");
      const next = fn(current.current);
      const raw = JSON.stringify(next);
      parseWork(raw);
      if (new Blob([raw]).size > 3 * 1024 * 1024)
        throw Error(
          "工程数据超过 3 MB 容量限制，请先备份并删除不用的模板或报价。",
        );
      localStorage.setItem(KEY, raw);
      current.current = next;
      setData(next);
      setError("");
      return true;
    } catch (e) {
      setError(
        `保存失败：${(e as Error).message}。当前编辑内容仍在页面中，请勿刷新。`,
      );
      return false;
    }
  }
  function backup() {
    try {
      const raw = JSON.stringify(
        {
          exportedAt: new Date().toISOString(),
          materialsAndQuote: localStorage.getItem("renovation-quote-v1"),
          engineering: localStorage.getItem(KEY),
        },
        null,
        2,
      );
      const url = URL.createObjectURL(
        new Blob([raw], { type: "application/json" }),
      );
      const a = document.createElement("a");
      a.href = url;
      a.download = "装修报价本地备份.json";
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      setError("备份失败，浏览器不允许读取存储。");
    }
  }
  return (
    <Context.Provider value={{ data, ready, error, save, backup }}>
      {children}
    </Context.Provider>
  );
}
export const useWork = () => useContext(Context);
export function WorkNotice() {
  const { ready, error, backup } = useWork();
  return (
    <>
      <div className="storage-notice no-print">
        工程模板与工程报价独立保存，不覆盖原材料报价。浏览器存储容量有限，清理数据会导致丢失，请定期{" "}
        <button className="link-button" onClick={backup}>
          导出本地备份
        </button>
        。备份可能包含客户资料，请妥善保管。{!ready && "正在读取工程数据…"}
      </div>
      {error && (
        <div role="alert" className="error no-print">
          {error}
        </div>
      )}
    </>
  );
}
