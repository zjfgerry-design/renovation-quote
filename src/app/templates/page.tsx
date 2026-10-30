"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useWork, WorkNotice } from "@/components/work-store";
import { LineEditor } from "@/components/work-editor";
import {
  draftLine,
  toDraft,
  validateLines,
  newWorkQuote,
  type DraftLine,
} from "@/lib/engineering";
export default function Templates() {
  const { data, ready, save } = useWork();
  const router = useRouter();
  const [id, setId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [lines, setLines] = useState<DraftLine[]>([]);
  const [editing, setEditing] = useState(false);
  const [message, setMessage] = useState("");
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">ENGINEERING TEMPLATES</div>
          <h1>工程报价模板</h1>
          <p>沉淀常用施工项目，材料与人工分开核算。</p>
        </div>
        <div className="actions">
          <Link className="button secondary" href="/import">
            Excel 导入
          </Link>
          <button
            disabled={!ready}
            onClick={() => {
              setId(null);
              setName("");
              setLines([draftLine()]);
              setEditing(true);
              setMessage("");
            }}
          >
            ＋ 新建模板
          </button>
        </div>
      </div>
      <WorkNotice />
      {message && (
        <div role="status" className="storage-notice">
          {message}
        </div>
      )}
      {editing && (
        <section className="panel padded">
          <h2>{id ? "编辑模板" : "新建模板"}</h2>
          <label>
            模板名称
            <input
              value={name}
              maxLength={100}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <LineEditor lines={lines} onChange={setLines} />
          <div className="actions">
            <button
              className="secondary"
              onClick={() => setLines([...lines, draftLine()])}
            >
              添加施工项目
            </button>
            <button className="secondary" onClick={() => setEditing(false)}>
              取消编辑
            </button>
            <button
              onClick={() => {
                try {
                  if (!name.trim()) throw Error("请填写模板名称");
                  const template = {
                    id: id || crypto.randomUUID(),
                    name: name.trim(),
                    lines: validateLines(lines),
                  };
                  if (
                    save((d) => ({
                      ...d,
                      templates: id
                        ? d.templates.map((t) => (t.id === id ? template : t))
                        : [...d.templates, template],
                    }))
                  ) {
                    setEditing(false);
                    setMessage("模板已保存。");
                  }
                } catch (e) {
                  setMessage((e as Error).message);
                }
              }}
            >
              保存模板
            </button>
          </div>
        </section>
      )}
      <div className="steps">
        {data.templates.map((t) => (
          <section className="card" key={t.id}>
            <h2>{t.name}</h2>
            <p>
              {t.lines.length} 项施工 ·{" "}
              {new Set(t.lines.map((l) => l.category)).size} 个分类
            </p>
            <div className="actions wrap">
              <button
                onClick={() => {
                  const q = newWorkQuote(t.lines);
                  if (save((d) => ({ ...d, quotes: [...d.quotes, q] })))
                    router.push(`/engineering?id=${q.id}`);
                }}
              >
                创建新报价
              </button>
              <button
                className="secondary"
                onClick={() => {
                  setId(t.id);
                  setName(t.name);
                  setLines(t.lines.map(toDraft));
                  setEditing(true);
                  setMessage("");
                }}
              >
                编辑
              </button>
              <button
                className="link-button danger"
                onClick={() => {
                  if (confirm(`删除模板“${t.name}”？已有工程报价不受影响。`))
                    save((d) => ({
                      ...d,
                      templates: d.templates.filter((x) => x.id !== t.id),
                    }));
                }}
              >
                删除
              </button>
            </div>
          </section>
        ))}
      </div>
      {ready && !data.templates.length && !editing && (
        <section className="panel empty">
          <h2>还没有工程模板</h2>
          <p>新建常用施工项目，或通过 Excel 预算导入保存模板。</p>
        </section>
      )}
    </>
  );
}
