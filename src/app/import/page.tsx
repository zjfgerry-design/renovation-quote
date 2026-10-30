"use client";
import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { parseExcel, type ImportResult } from "@/lib/excel";
import {
  validateLine,
  validateLines,
  newWorkQuote,
  type DraftLine,
} from "@/lib/engineering";
import { useWork, WorkNotice } from "@/components/work-store";
import { LineEditor } from "@/components/work-editor";
export default function Import() {
  const router = useRouter();
  const { save, ready } = useWork();
  const [result, setResult] = useState<ImportResult | null>(null);
  const [lines, setLines] = useState<DraftLine[]>([]);
  const [name, setName] = useState("导入工程预算");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const request = useRef(0);
  const [sourceRows, setSourceRows] = useState<number[]>([]);
  function persist(kind: "template" | "quote") {
    try {
      if (!confirmed) throw Error("请完成字段校对并确认导入");
      const valid = validateLines(lines);
      if (!name.trim()) throw Error("请填写模板或项目名称");
      if (kind === "template") {
        if (
          save((d) => ({
            ...d,
            templates: [
              ...d.templates,
              { id: crypto.randomUUID(), name: name.trim(), lines: valid },
            ],
          }))
        )
          router.push("/templates");
      } else {
        const q = { ...newWorkQuote(valid), project: name.trim() };
        if (save((d) => ({ ...d, quotes: [...d.quotes, q] })))
          router.push(`/engineering?id=${q.id}`);
      }
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">LOCAL EXCEL IMPORT</div>
          <h1>Excel 装修预算导入</h1>
          <p>本地识别 → 逐项校对 → 确认保存，原报价保持不变。</p>
        </div>
        <Link href="/templates" className="button secondary">
          工程模板
        </Link>
      </div>
      <WorkNotice />
      <section className="panel padded">
        <h2>选择 .xlsx 预算文件</h2>
        <p>
          兼容“封面 / 预算表 / 主材计划表”，预算表按 A—I 列识别。文件最多 8
          MB、项目最多 1000 项。
        </p>
        <p>
          文件仅在浏览器内解析，不上传服务器。公式仅读取缓存，不执行公式、宏或外部链接。
        </p>
        <input
          aria-label="上传 Excel 文件"
          type="file"
          accept=".xlsx"
          disabled={busy || !ready}
          onChange={async (e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            const current = ++request.current;
            setResult(null);
            setLines([]);
            setConfirmed(false);
            setError("");
            if (!f.name.toLowerCase().endsWith(".xlsx")) {
              setError("仅支持 .xlsx 文件");
              return;
            }
            if (f.size > 8 * 1024 * 1024) {
              setError("文件超过 8 MB 限制，请拆分后再试");
              return;
            }
            setBusy(true);
            try {
              const parsed = await parseExcel(
                new Uint8Array(await f.arrayBuffer()),
              );
              if (current !== request.current) return;
              setResult(parsed);
              setLines(parsed.rows.map((r) => r.draft));
              setSourceRows(parsed.rows.map((r) => r.sourceRow));
              setName("导入工程预算");
            } catch (e) {
              setError((e as Error).message);
            } finally {
              setBusy(false);
              e.target.value = "";
            }
          }}
        />
        {busy && <p role="status">正在本地解析文件，请稍候…</p>}
      </section>
      {error && (
        <div role="alert" className="error">
          {error}
        </div>
      )}
      {result && (
        <>
          <section className="panel padded">
            <h2>识别摘要</h2>
            <p className="danger">
              当前{" "}
              {
                lines.filter((l) => {
                  try {
                    validateLine(l);
                    return false;
                  } catch {
                    return true;
                  }
                }).length
              }{" "}
              项需要修正；原表{" "}
              {result.rows.filter((r) => r.warnings.length).length}{" "}
              行有识别警告。无效字段未修正前不能保存。
            </p>
            <p>
              识别 {result.rows.length} 个项目、{result.categories.length}{" "}
              个分类；跳过 {result.skipped} 行表头、空白或汇总。当前保留{" "}
              {lines.length} 项。
            </p>
            <p>
              材料和人工合价按校对后的数量 ×
              单价重新计算，每项四舍五入到分，可能与 Excel 的汇总舍入方式不同。
            </p>
            <details>
              <summary>原始行与警告（请逐项核对）</summary>
              {result.warnings.map((w, i) => (
                <p key={i} className="danger">
                  {w}
                </p>
              ))}
              {result.rows.map((r) => (
                <div key={r.sourceRow} className="import-warning">
                  <b>
                    第 {r.sourceRow} 行：{r.draft.name}
                  </b>
                  <p>
                    原表材料合价：{r.sourceMaterial || "未提供"}；人工合价：
                    {r.sourceLabor || "未提供"}
                  </p>
                  {r.warnings.map((w, i) => (
                    <p className="danger" key={i}>
                      {w}
                    </p>
                  ))}
                </div>
              ))}
            </details>
          </section>
          <section className="panel padded">
            <h2>预算字段校对</h2>
            <p>
              空白或非法数字必须人工修正，也可移除不需要的行。模板保留数量作为默认用量，新报价仍可修改。
            </p>
            <LineEditor
              lines={lines}
              sourceRows={sourceRows}
              onChange={(next) => {
                setSourceRows(
                  next.map(
                    (l) =>
                      result.rows.find((r) => r.draft.id === l.id)!.sourceRow,
                  ),
                );
                setLines(next);
                setConfirmed(false);
              }}
            />
            <label>
              模板 / 项目名称
              <input
                value={name}
                maxLength={100}
                onChange={(e) => {
                  setName(e.target.value);
                  setConfirmed(false);
                }}
              />
            </label>
            <label className="check-label">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
              />
              我已逐项校对数量、单价、分类和警告，并确认跳过项及金额重算规则。
            </label>
            <div className="actions">
              <button
                disabled={!confirmed || !lines.length}
                onClick={() => persist("template")}
              >
                保存为模板
              </button>
              <button
                disabled={!confirmed || !lines.length}
                onClick={() => persist("quote")}
              >
                创建报价单
              </button>
            </div>
          </section>
          <section className="panel padded">
            <h2>主材计划表 · 结构化预览</h2>
            <p>此阶段仅预览，不保存为采购任务。</p>
            <div className="table-scroll">
              <table className="plan-table">
                <thead>
                  <tr>
                    <th>施工阶段</th>
                    <th>材料类别</th>
                    <th>准备事项</th>
                    <th>采购时间</th>
                  </tr>
                </thead>
                <tbody>
                  {result.plans.map((p, i) => (
                    <tr key={i}>
                      <td>{p.stage || "未填写"}</td>
                      <td>{p.category}</td>
                      <td>{p.preparation || "未填写"}</td>
                      <td>{p.purchaseTime || "未填写"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!result.plans.length && <p>未识别到主材计划。</p>}
          </section>
          <section className="panel padded">
            <details>
              <summary>封面文本预览（仅本地，不自动写入客户信息）</summary>
              {result.cover.map((s, i) => (
                <p key={i}>{s}</p>
              ))}
              {!result.cover.length && <p>未发现封面内容。</p>}
            </details>
          </section>
        </>
      )}
    </>
  );
}
