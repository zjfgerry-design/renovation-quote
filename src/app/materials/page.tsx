"use client";
import { useState } from "react";
import { useStore } from "@/components/store";
import { decimal, money, type Material } from "@/lib/model";
const blank = { name: "", brand: "", spec: "", unit: "㎡", price: "" };
export default function Materials() {
  const { data, update } = useStore();
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(blank);
  const [error, setError] = useState("");
  function edit(m?: Material) {
    setEditing(m?.id || null);
    setForm(m ? { ...m, price: (m.price / 100).toFixed(2) } : blank);
    setError("");
    setOpen(true);
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">MATERIAL LIBRARY</div>
          <h1>材料管理</h1>
          <p>把常用材料整理好，让每次报价更从容。</p>
        </div>
        <button onClick={() => edit()}>＋ 添加材料</button>
      </div>
      <section className="panel">
        <div className="panel-toolbar">
          <h2>
            材料库 <span className="count">{data.materials.length}</span>
          </h2>
          <input
            aria-label="搜索材料"
            placeholder="搜索材料名称、品牌或规格…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>材料名称</th>
                <th>品牌</th>
                <th>规格型号</th>
                <th>单位</th>
                <th className="numeric">单价（元）</th>
                <th className="numeric">操作</th>
              </tr>
            </thead>
            <tbody>
              {data.materials
                .filter((m) =>
                  `${m.name} ${m.brand} ${m.spec}`.includes(search),
                )
                .map((m) => (
                  <tr key={m.id}>
                    <td>
                      <strong>{m.name}</strong>
                    </td>
                    <td>{m.brand || "—"}</td>
                    <td>{m.spec || "—"}</td>
                    <td>{m.unit}</td>
                    <td className="numeric">{money(m.price)}</td>
                    <td className="numeric">
                      <button className="link-button" onClick={() => edit(m)}>
                        编辑
                      </button>
                      <button
                        className="link-button danger"
                        onClick={() => {
                          if (
                            confirm(
                              `删除“${m.name}”？已添加的报价明细将保留原始信息。`,
                            )
                          )
                            update((d) => ({
                              ...d,
                              materials: d.materials.filter(
                                (x) => x.id !== m.id,
                              ),
                            }));
                        }}
                      >
                        删除
                      </button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
        {!data.materials.filter((m) =>
          `${m.name} ${m.brand} ${m.spec}`.includes(search),
        ).length && (
          <div className="empty">暂无匹配材料，请添加材料或调整搜索。</div>
        )}
        <div className="panel-note">
          材料价格调整不会改变已添加到报价单的明细，确保历史报价稳定。
        </div>
      </section>
      {open && (
        <div className="modal-backdrop">
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="material-title"
          >
            <h2 id="material-title">{editing ? "编辑材料" : "添加材料"}</h2>
            <p>建立清晰的材料信息，方便后续快速报价。</p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                try {
                  const price = decimal(form.price, 2);
                  if (!form.name.trim() || !form.unit.trim())
                    throw Error("请填写材料名称和单位");
                  const m = {
                    ...form,
                    name: form.name.trim(),
                    unit: form.unit.trim(),
                    price,
                    id: editing || crypto.randomUUID(),
                  };
                  update((d) => ({
                    ...d,
                    materials: editing
                      ? d.materials.map((x) => (x.id === editing ? m : x))
                      : [...d.materials, m],
                  }));
                  setOpen(false);
                } catch (e) {
                  setError((e as Error).message);
                }
              }}
            >
              <div className="form-grid">
                {[
                  ["name", "材料名称"],
                  ["brand", "品牌"],
                  ["spec", "规格型号"],
                  ["unit", "单位"],
                  ["price", "单价（元，最多两位小数）"],
                ].map(([key, label]) => (
                  <label key={key}>
                    {label}
                    <input
                      autoFocus={key === "name"}
                      required={["name", "unit", "price"].includes(key)}
                      maxLength={key === "price" ? 12 : 80}
                      inputMode={key === "price" ? "decimal" : undefined}
                      value={form[key as keyof typeof blank]}
                      onChange={(e) =>
                        setForm({ ...form, [key]: e.target.value })
                      }
                    />
                  </label>
                ))}
              </div>
              {error && (
                <p role="alert" className="error">
                  {error}
                </p>
              )}
              <div className="actions">
                <button
                  type="button"
                  className="secondary"
                  onClick={() => setOpen(false)}
                >
                  取消
                </button>
                <button type="submit">保存材料</button>
              </div>
            </form>
          </section>
        </div>
      )}
    </>
  );
}
