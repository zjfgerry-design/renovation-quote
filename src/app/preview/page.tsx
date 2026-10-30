"use client";
import Link from "next/link";
import { useStore } from "@/components/store";
import { amount, money, total } from "@/lib/model";
export default function Preview() {
  const { data } = useStore();
  const q = data.quote;
  const valid =
    q.customer.trim() &&
    q.project.trim() &&
    /^\d{4}-\d{2}-\d{2}$/.test(q.date) &&
    q.lines.length > 0;
  return (
    <>
      <div className="page-heading no-print">
        <div>
          <div className="eyebrow">QUOTATION PREVIEW</div>
          <h1>报价单预览</h1>
          <p>检查报价信息，打印或另存为 PDF。</p>
        </div>
        <div className="actions">
          <Link className="button secondary" href="/quote">
            返回编辑
          </Link>
          <button disabled={!valid} onClick={() => window.print()}>
            打印 / 保存 PDF
          </button>
        </div>
      </div>
      {!valid && (
        <div className="storage-notice no-print">
          请先填写客户名称、项目名称、报价日期，并添加至少一项材料。{" "}
          <Link href="/quote">前往完善 →</Link>
        </div>
      )}
      <article className="quote-paper">
        <div className="document-top">
          <div>
            <div className="eyebrow">RENOVATION QUOTE</div>
            <h2>装修建材报价单</h2>
          </div>
          <span>人民币 · CNY</span>
        </div>
        <div className="document-info">
          <div>
            客户名称 <strong>{q.customer || "待填写"}</strong>
          </div>
          <div>
            报价日期 <strong>{q.date || "待填写"}</strong>
          </div>
          <div className="project-info">
            项目名称 <strong>{q.project || "待填写"}</strong>
          </div>
        </div>
        <table className="print-table">
          <thead>
            <tr>
              <th>序号</th>
              <th>材料 / 品牌 / 规格</th>
              <th>单位</th>
              <th className="numeric">单价</th>
              <th className="numeric">数量</th>
              <th className="numeric">金额</th>
            </tr>
          </thead>
          <tbody>
            {q.lines.map((l, i) => (
              <tr key={l.lineId}>
                <td>{i + 1}</td>
                <td>
                  <strong>{l.name}</strong>
                  <small className="cell-sub">
                    {l.brand} · {l.spec}
                  </small>
                </td>
                <td>{l.unit}</td>
                <td className="numeric">{money(l.price)}</td>
                <td className="numeric">{l.quantity}</td>
                <td className="numeric">{money(amount(l))}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!q.lines.length && <div className="empty">暂无报价明细</div>}
        <div className="document-total">
          <span>共 {q.lines.length} 项明细</span>
          <div>
            报价合计 <strong>{money(total(q.lines))}</strong>
          </div>
        </div>
        <div className="document-notes">
          <h3>报价说明</h3>
          <p>
            1.
            本报价根据所列材料、规格、数量编制，具体供货与施工范围以双方确认为准。
          </p>
          <p>2. 金额单位为人民币，单项金额四舍五入至分，合计为各项金额之和。</p>
          <p>3. 本单仅列示材料报价，不额外计入人工、运费或其他未列明费用。</p>
        </div>
        <div className="signatures">
          <span>报价方确认：________________</span>
          <span>客户确认：________________</span>
        </div>
        <div className="document-footer">
          装修建材智能报价系统 · 清晰报价，安心合作
        </div>
      </article>
      <p className="hint no-print">
        选择 A4 纸张，在打印对话框选择“另存为 PDF”。建议关闭浏览器页眉和页脚。
      </p>
    </>
  );
}
