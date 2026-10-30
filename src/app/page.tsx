"use client";
import Link from "next/link";
import { useStore } from "@/components/store";
import { money, total } from "@/lib/model";
export default function Home() {
  const { data } = useStore();
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">您的报价工作台</div>
          <h1>好项目，从一份清晰的报价开始。</h1>
          <p>管理常用材料，快速编制报价，让生意更简单。</p>
        </div>
        <Link href="/quote" className="button">
          ＋ 创建报价单
        </Link>
      </div>
      <section className="hero">
        <div>
          <span className="hero-tag">为装修与建材生意而设计</span>
          <h2>
            从材料清单，
            <br />
            到专业报价。
          </h2>
          <p>
            告别反复核算与繁琐排版。选好材料，填好数量，
            <br className="desktop" />
            一份整洁的报价单即刻就绪。
          </p>
          <Link className="button light" href="/quote">
            开始制作报价 <span>↗</span>
          </Link>
        </div>
        <div className="hero-art" aria-hidden="true">
          <div className="paper">
            <div className="paper-top">
              QUOTATION <span>↗</span>
            </div>
            <b>每一项，都明明白白。</b>
            <div className="paper-line" />
            <div className="paper-row">
              <span>精选材料</span>
              <span>精准核算</span>
            </div>
            {[1, 2, 3].map((i) => (
              <div className="paper-row" key={i}>
                <i />
                <i />
              </div>
            ))}
            <div className="paper-total">
              报价合计 <b>¥ 12,860.00</b>
            </div>
          </div>
          <div className="art-stamp">✓ 清晰 · 专业 · 高效</div>
        </div>
      </section>
      <div className="stats">
        <div className="card">
          <span>
            材料库 <b>▦</b>
          </span>
          <strong>
            {data.materials.length}
            <small>种材料</small>
          </strong>
          <p>常用建材，随时调用</p>
        </div>
        <div className="card">
          <span>
            当前报价明细 <b>▤</b>
          </span>
          <strong>
            {data.quote.lines.length}
            <small>项明细</small>
          </strong>
          <p>{data.quote.project || "开始记录您的第一个项目"}</p>
        </div>
        <div className="card">
          <span>
            当前报价总额 <b>¥</b>
          </span>
          <strong>{money(total(data.quote.lines))}</strong>
          <p>按明细逐项核算，精确到分</p>
        </div>
      </div>
      <div className="section-heading">
        <h2>三步，完成一份专业报价</h2>
        <span>简单的流程，高效的日常</span>
      </div>
      <div className="steps">
        {[
          [
            "01",
            "整理材料库",
            "维护材料、规格和单价，建立专属的常用材料库。",
            "/materials",
            "管理材料",
          ],
          [
            "02",
            "填写项目报价",
            "输入客户与项目信息，选择材料并填写用量。",
            "/quote",
            "编辑报价",
          ],
          [
            "03",
            "预览并打印",
            "自动生成 A4 报价单，可打印或另存为 PDF。",
            "/preview",
            "预览报价",
          ],
        ].map(([n, t, d, h, l]) => (
          <Link href={h} className="card step" key={n}>
            <span className="step-number">{n}</span>
            <h3>{t}</h3>
            <p>{d}</p>
            <span className="text-link">{l} →</span>
          </Link>
        ))}
      </div>
    </>
  );
}
