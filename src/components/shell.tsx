"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useStore } from "./store";
export function Shell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const { ready, error } = useStore();
  return (
    <div className="app">
      <aside className="sidebar">
        <Link href="/" className="logo">
          <span className="logo-mark">筑</span>
          <span>
            装修建材<span className="logo-sub">RENOVATION QUOTE</span>
          </span>
        </Link>
        <div className="workspace-label">
          工作空间 <span>MVP</span>
        </div>
        <nav>
          {[
            ["/", "◈", "工作台"],
            ["/materials", "▦", "材料管理"],
            ["/quote", "＋", "创建报价单"],
            ["/preview", "▤", "报价单预览"],
            ["/templates", "▦", "工程报价模板"],
            ["/import", "⇧", "Excel 预算导入"],
            ["/engineering", "▤", "工程报价单"],
          ].map(([href, icon, name]) => (
            <Link
              key={href}
              href={href}
              className={path === href ? "active" : ""}
            >
              <span>{icon}</span>
              {name}
            </Link>
          ))}
        </nav>
        <div className="sidebar-foot">
          <span className="status-dot" /> 本地演示工作空间
          <p>轻松报价，专注每一个好项目。</p>
        </div>
      </aside>
      <div className="main-wrap">
        <header className="topbar">
          <span>
            工作空间 <span className="slash">/</span>{" "}
            {
              (
                {
                  "/": "工作台",
                  "/materials": "材料管理",
                  "/quote": "创建报价单",
                  "/preview": "报价单预览",
                  "/templates": "工程报价模板",
                  "/import": "Excel 预算导入",
                  "/engineering": "工程报价单",
                } as Record<string, string>
              )[path]
            }
          </span>
          <span className="badge">无需登录 · 本地使用</span>
        </header>
        <main>
          <div className="storage-notice">
            ⓘ
            数据仅保存在当前浏览器中，清理浏览器数据可能导致丢失。演示材料均为虚构数据。
          </div>
          {error && (
            <div role="alert" className="error">
              {error}
            </div>
          )}
          {ready ? children : <p className="empty">正在读取本地工作空间…</p>}
        </main>
        <footer>
          装修建材智能报价系统 <span>让每一份报价，都清晰有据。</span>
        </footer>
      </div>
    </div>
  );
}
