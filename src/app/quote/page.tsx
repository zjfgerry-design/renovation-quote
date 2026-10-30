"use client";
import Link from "next/link";
import { useState } from "react";
import { useStore } from "@/components/store";
import { amount, decimal, money, total } from "@/lib/model";
export default function Quote() {
  const { data, update } = useStore();
  const q = data.quote;
  const [selected, setSelected] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [error, setError] = useState("");
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">NEW QUOTATION</div>
          <h1>创建报价单</h1>
          <p>选好材料，填好数量，报价自动为您算清。</p>
        </div>
        <Link className="button" href="/preview">
          预览报价单 →
        </Link>
      </div>
      <section className="panel padded">
        <h2>01 · 客户与项目信息</h2>
        <div className="form-grid three">
          {[
            ["customer", "客户名称"],
            ["project", "项目名称"],
            ["date", "报价日期"],
          ].map(([k, l]) => (
            <label key={k}>
              {l}
              <input
                type={k === "date" ? "date" : "text"}
                maxLength={100}
                value={q[k as "customer" | "project" | "date"]}
                onChange={(e) =>
                  update((d) => ({
                    ...d,
                    quote: { ...d.quote, [k]: e.target.value },
                  }))
                }
              />
            </label>
          ))}
        </div>
      </section>
      <section className="panel">
        <div className="panel-toolbar">
          <h2>
            02 · 报价明细 <span className="count">{q.lines.length}</span>
          </h2>
          <Link className="text-link" href="/materials">
            管理材料库 ↗
          </Link>
        </div>
        <form
          className="add-row"
          onSubmit={(e) => {
            e.preventDefault();
            try {
              if (decimal(quantity, 3) <= 0) throw Error("数量必须大于 0");
              const m = data.materials.find((m) => m.id === selected);
              if (!m) throw Error("请先选择材料");
              update((d) => ({
                ...d,
                quote: {
                  ...d.quote,
                  lines: [
                    ...d.quote.lines,
                    { ...m, lineId: crypto.randomUUID(), quantity },
                  ],
                },
              }));
              setError("");
            } catch (e) {
              setError((e as Error).message);
            }
          }}
        >
          <label>
            从材料库添加
            <select
              required
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
            >
              <option value="">请选择材料</option>
              {data.materials.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} · {m.spec} · {money(m.price)}/{m.unit}
                </option>
              ))}
            </select>
          </label>
          <label>
            数量
            <input
              required
              inputMode="decimal"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
            />
          </label>
          <button>＋ 添加到报价</button>
        </form>
        {error && (
          <div role="alert" className="error">
            {error}
          </div>
        )}
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>材料 / 规格</th>
                <th>单位</th>
                <th className="numeric">单价</th>
                <th>数量</th>
                <th className="numeric">金额</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {q.lines.map((l) => (
                <tr key={l.lineId}>
                  <td>
                    <strong>{l.name}</strong>
                    <small className="cell-sub">
                      {l.brand} · {l.spec}
                    </small>
                  </td>
                  <td>{l.unit}</td>
                  <td className="numeric">{money(l.price)}</td>
                  <td>
                    <input
                      className="quantity"
                      aria-label={`${l.name}数量`}
                      inputMode="decimal"
                      value={drafts[l.lineId] ?? l.quantity}
                      onChange={(e) =>
                        setDrafts({ ...drafts, [l.lineId]: e.target.value })
                      }
                      onBlur={() => {
                        const value = drafts[l.lineId] ?? l.quantity;
                        try {
                          if (decimal(value, 3) <= 0)
                            throw Error("数量必须大于 0");
                          update((d) => ({
                            ...d,
                            quote: {
                              ...d.quote,
                              lines: d.quote.lines.map((x) =>
                                x.lineId === l.lineId
                                  ? { ...x, quantity: value }
                                  : x,
                              ),
                            },
                          }));
                          setError("");
                        } catch (e) {
                          setError(
                            `${l.name}：${(e as Error).message}，已恢复原数量`,
                          );
                        }
                        setDrafts((prev) => {
                          const next = { ...prev };
                          delete next[l.lineId];
                          return next;
                        });
                      }}
                    />
                  </td>
                  <td className="numeric">
                    <strong>{money(amount(l))}</strong>
                  </td>
                  <td>
                    <button
                      className="link-button danger"
                      onClick={() =>
                        update((d) => ({
                          ...d,
                          quote: {
                            ...d.quote,
                            lines: d.quote.lines.filter(
                              (x) => x.lineId !== l.lineId,
                            ),
                          },
                        }))
                      }
                    >
                      移除
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {q.lines.length === 0 && (
          <div className="empty">
            <h3>报价单还没有材料</h3>
            <p>从上方选择材料，开始编制您的第一份报价。</p>
          </div>
        )}
        <div className="quote-bottom">
          <span>共 {q.lines.length} 项明细 · 数量最多三位小数</span>
          <div>
            报价总金额 <strong>{money(total(q.lines))}</strong>
          </div>
        </div>
      </section>
      <div className="hint">
        单价采用添加材料时的快照。单项金额四舍五入到分，总额为各单项金额之和。
      </div>
    </>
  );
}
