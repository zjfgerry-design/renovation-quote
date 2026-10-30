import type { Metadata } from "next";
import "./globals.css";
import { Store } from "@/components/store";
import { Shell } from "@/components/shell";
export const metadata: Metadata = {
  title: "装修建材智能报价系统",
  description: "面向装修公司与建材商家的专业报价工具",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>
        <Store>
          <Shell>{children}</Shell>
        </Store>
      </body>
    </html>
  );
}
