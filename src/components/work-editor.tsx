"use client";
import { validateLine, workAmount, type DraftLine } from "@/lib/engineering";
import { money } from "@/lib/model";
export function LineEditor({
  lines,
  onChange,
  sourceRows,
}: {
  lines: DraftLine[];
  onChange: (lines: DraftLine[]) => void;
  sourceRows?: number[];
}) {
  return (
    <div className="table-scroll">
      <table className="work-editor">
        <thead>
          <tr>
            <th>来源 / 分类</th>
            <th>项目名称 / 工艺说明</th>
            <th>数量 / 单位</th>
            <th>材料单价（元）</th>
            <th>人工单价（元）</th>
            <th>计算金额</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((l, i) => {
            let sums = "待校对",
              error = "";
            try {
              const line = validateLine(l);
              sums = `材料 ${money(workAmount(line, "materialPrice"))} / 人工 ${money(workAmount(line, "laborPrice"))}`;
            } catch (e) {
              error = (e as Error).message;
            }
            const input = (
              key: keyof DraftLine,
              label: string,
              numeric = false,
            ) => (
              <input
                aria-label={`第${i + 1}项${label}`}
                value={l[key]}
                maxLength={numeric ? 20 : 2000}
                inputMode={numeric ? "decimal" : undefined}
                onChange={(e) =>
                  onChange(
                    lines.map((x, j) =>
                      j === i ? { ...x, [key]: e.target.value } : x,
                    ),
                  )
                }
              />
            );
            return (
              <tr key={l.id}>
                <td>
                  {sourceRows && <small>原表第 {sourceRows[i]} 行</small>}
                  {input("category", "分类")}
                </td>
                <td>
                  {input("name", "名称")}
                  <textarea
                    aria-label={`第${i + 1}项工艺说明`}
                    maxLength={2000}
                    value={l.description}
                    onChange={(e) =>
                      onChange(
                        lines.map((x, j) =>
                          j === i ? { ...x, description: e.target.value } : x,
                        ),
                      )
                    }
                  />
                </td>
                <td>
                  {input("quantity", "数量", true)}
                  {input("unit", "单位")}
                </td>
                <td>{input("materialPrice", "材料单价", true)}</td>
                <td>{input("laborPrice", "人工单价", true)}</td>
                <td>
                  <small>{sums}</small>
                  {error && <small className="danger">{error}</small>}
                </td>
                <td>
                  <button
                    className="link-button danger"
                    onClick={() => onChange(lines.filter((_, j) => j !== i))}
                  >
                    移除
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
