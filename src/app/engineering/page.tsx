"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useWork, WorkNotice } from "@/components/work-store";
import { LineEditor } from "@/components/work-editor";
import {
  draftLine,
  toDraft,
  validateLines,
  workTotals,
  workAmount,
  type DraftLine,
  type WorkQuote,
} from "@/lib/engineering";
import { money } from "@/lib/model";
export default function Engineering() {
  const { data, ready, save } = useWork();
  const [selected, setSelected] = useState("");
  const [meta, setMeta] = useState({ customer: "", project: "", date: "" });
  const [lines, setLines] = useState<DraftLine[]>([]);
  const [message, setMessage] = useState("");
  const [preview, setPreview] = useState<WorkQuote | null>(null);
  const [dirty, setDirty] = useState(false);
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("id");
    if (id) setSelected(id);
  }, []);
  const q = data.quotes.find((q) => q.id === selected);
  useEffect(() => {
    if (q) {
      setMeta({ customer: q.customer, project: q.project, date: q.date });
      setLines(q.lines.map(toDraft));
      setPreview(null);
      setDirty(false);
    }
  }, [selected, ready]);
  function store(print = false) {
    try {
      if (!q) throw Error("请先选择工程报价");
      if (!meta.project.trim()) throw Error("请填写项目名称");
      if (
        print &&
        (!meta.customer.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(meta.date))
      )
        throw Error("打印前请填写客户与有效日期");
      const next = { ...q, ...meta, lines: validateLines(lines) };
      if (
        save((d) => ({
          ...d,
          quotes: d.quotes.map((x) => (x.id === q.id ? next : x)),
        }))
      ) {
        setDirty(false);
        setMessage("工程报价已保存。");
        if (print) setPreview(next);
      }
    } catch (e) {
      setMessage((e as Error).message);
    }
  }
  return (
    <>
      <div className="page-heading no-print">
        <div>
          <div className="eyebrow">ENGINEERING QUOTATION</div>
          <h1>工程报价单</h1>
          <p>材料费与人工费独立计算，保留每份工程报价。</p>
        </div>
        <Link href="/templates" className="button">
          从模板创建报价
        </Link>
      </div>
      <WorkNotice />
      {message && (
        <div role="status" className="storage-notice no-print">
          {message}
        </div>
      )}
      <section className="panel padded no-print">
        <label>
          选择工程报价
          <select
            aria-label="选择工程报价"
            value={selected}
            onChange={(e) => {
              if (dirty && !confirm("切换会放弃未保存的工程编辑，是否继续？"))
                return;
              setSelected(e.target.value);
              setPreview(null);
              setDirty(false);
              setMessage("");
            }}
          >
            <option value="">请选择工程报价</option>
            {data.quotes.map((q) => (
              <option key={q.id} value={q.id}>
                {q.project} · {q.date}
              </option>
            ))}
          </select>
        </label>
      </section>
      {q && (
        <section className="panel padded no-print">
          <div className="form-grid three">
            {[
              ["customer", "客户名称"],
              ["project", "项目名称"],
              ["date", "报价日期"],
            ].map(([k, label]) => (
              <label key={k}>
                {label}
                <input
                  maxLength={100}
                  type={k === "date" ? "date" : "text"}
                  value={meta[k as keyof typeof meta]}
                  onChange={(e) => {
                    setMeta({ ...meta, [k]: e.target.value });
                    setPreview(null);
                    setDirty(true);
                  }}
                />
              </label>
            ))}
          </div>
          <LineEditor
            lines={lines}
            onChange={(l) => {
              setLines(l);
              setPreview(null);
              setDirty(true);
            }}
          />
          {(() => {
            try {
              const t = workTotals(validateLines(lines));
              return (
                <div className="quote-bottom wrap">
                  材料费 {money(t.material)} · 人工费 {money(t.labor)}{" "}
                  <strong>总价 {money(t.total)}</strong>
                </div>
              );
            } catch {
              return (
                <p className="danger">请修正明细中的无效字段后再保存或预览。</p>
              );
            }
          })()}
          <div className="actions wrap">
            <button
              className="secondary"
              onClick={() => {
                setLines([...lines, draftLine()]);
                setDirty(true);
                setPreview(null);
              }}
            >
              添加项目
            </button>
            <button onClick={() => store()}>保存工程报价</button>
            <button className="secondary" onClick={() => store(true)}>
              保存并预览
            </button>
            <button
              className="link-button danger"
              onClick={() => {
                if (
                  confirm("删除这份工程报价？请先确认已备份。") &&
                  save((d) => ({
                    ...d,
                    quotes: d.quotes.filter((x) => x.id !== q.id),
                  }))
                ) {
                  setSelected("");
                  setPreview(null);
                  setDirty(false);
                }
              }}
            >
              删除报价
            </button>
          </div>
          {dirty && (
            <p className="hint">当前编辑尚未保存，离开页面将丢失修改。</p>
          )}
        </section>
      )}
      {preview && (
        <>
          <div className="actions no-print">
            <button onClick={() => window.print()}>
              打印工程报价 / 保存 PDF
            </button>
          </div>
          <article className="quote-paper">
            <div className="document-top">
              <h2>工程装修报价单</h2>
              <span>人民币 · CNY</span>
            </div>
            <div className="document-info">
              <div>客户：{preview.customer}</div>
              <div>日期：{preview.date}</div>
              <div className="project-info">项目：{preview.project}</div>
            </div>
            <table className="print-table">
              <thead>
                <tr>
                  <th>分类 / 项目 / 工艺</th>
                  <th>数量 / 单位</th>
                  <th>材料单价</th>
                  <th>人工单价</th>
                  <th>材料费</th>
                  <th>人工费</th>
                </tr>
              </thead>
              <tbody>
                {preview.lines.map((l) => (
                  <tr key={l.id}>
                    <td>
                      <small>{l.category}</small>
                      <strong className="cell-sub">{l.name}</strong>
                      <small className="cell-sub">{l.description}</small>
                    </td>
                    <td>
                      {l.quantity} {l.unit}
                    </td>
                    <td>{money(l.materialPrice)}</td>
                    <td>{money(l.laborPrice)}</td>
                    <td>{money(workAmount(l, "materialPrice"))}</td>
                    <td>{money(workAmount(l, "laborPrice"))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="document-total wrap">
              材料费：{money(workTotals(preview.lines).material)} · 人工费：
              {money(workTotals(preview.lines).labor)}
              <strong>总价 {money(workTotals(preview.lines).total)}</strong>
            </div>
            <p className="hint">
              每项材料费、人工费分别四舍五入到分后汇总。未列明的税费、折扣及其他费用未计入。
            </p>
          </article>
        </>
      )}
      {ready && !data.quotes.length && (
        <div className="empty">还没有工程报价，请从模板或 Excel 导入创建。</div>
      )}
    </>
  );
}
