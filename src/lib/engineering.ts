import { amount, decimal, today } from "./model";
export type WorkLine = {
  id: string;
  category: string;
  name: string;
  unit: string;
  quantity: string;
  materialPrice: number;
  laborPrice: number;
  description: string;
};
export type WorkTemplate = { id: string; name: string; lines: WorkLine[] };
export type WorkQuote = {
  id: string;
  customer: string;
  project: string;
  date: string;
  lines: WorkLine[];
};
export type WorkData = {
  version: 1;
  templates: WorkTemplate[];
  quotes: WorkQuote[];
};
export type DraftLine = {
  id: string;
  category: string;
  name: string;
  unit: string;
  quantity: string;
  materialPrice: string;
  laborPrice: string;
  description: string;
};
export const emptyWork: WorkData = { version: 1, templates: [], quotes: [] };
export function draftLine(): DraftLine {
  return {
    id: crypto.randomUUID(),
    category: "一般施工",
    name: "",
    unit: "㎡",
    quantity: "1",
    materialPrice: "0.00",
    laborPrice: "0.00",
    description: "",
  };
}
export function toDraft(l: WorkLine): DraftLine {
  return {
    ...l,
    materialPrice: (l.materialPrice / 100).toFixed(2),
    laborPrice: (l.laborPrice / 100).toFixed(2),
  };
}
export function validateLine(d: DraftLine): WorkLine {
  if (!d.category.trim() || !d.name.trim() || !d.unit.trim())
    throw Error("分类、项目名称和单位不能为空");
  if ([d.category, d.name, d.unit, d.description].some((x) => x.length > 2000))
    throw Error("字段过长（最多 2000 字）");
  decimal(d.quantity, 3);
  return {
    ...d,
    category: d.category.trim(),
    name: d.name.trim(),
    unit: d.unit.trim(),
    materialPrice: decimal(d.materialPrice, 2),
    laborPrice: decimal(d.laborPrice, 2),
  };
}
export function workAmount(l: WorkLine, kind: "materialPrice" | "laborPrice") {
  return amount({ price: l[kind], quantity: l.quantity } as Parameters<
    typeof amount
  >[0]);
}
export function workTotals(lines: WorkLine[]) {
  let material = 0n,
    labor = 0n;
  for (const l of lines) {
    material += BigInt(workAmount(l, "materialPrice"));
    labor += BigInt(workAmount(l, "laborPrice"));
  }
  if (material + labor > BigInt(Number.MAX_SAFE_INTEGER))
    throw Error("总金额超出安全范围");
  return {
    material: Number(material),
    labor: Number(labor),
    total: Number(material + labor),
  };
}
export function validateLines(d: DraftLine[]) {
  if (!d.length) throw Error("至少需要一项工程");
  if (d.length > 1000) throw Error("最多支持 1000 项工程");
  const lines = d.map((l, i) => {
    try {
      return validateLine(l);
    } catch (e) {
      throw Error(`第 ${i + 1} 项：${(e as Error).message}`);
    }
  });
  workTotals(lines);
  return lines;
}
export function newWorkQuote(lines: WorkLine[]): WorkQuote {
  return {
    id: crypto.randomUUID(),
    customer: "",
    project: "新工程报价",
    date: today(),
    lines: lines.map((l) => ({ ...l, id: crypto.randomUUID() })),
  };
}
export function parseWork(raw: string): WorkData {
  const d = JSON.parse(raw);
  if (
    d?.version !== 1 ||
    !Array.isArray(d.templates) ||
    !Array.isArray(d.quotes)
  )
    throw Error("工程数据格式错误");
  const strings = (o: Record<string, unknown>, keys: string[]) =>
    keys.every((k) => typeof o?.[k] === "string");
  const check = (o: WorkTemplate | WorkQuote) => {
    if (
      !strings(o as unknown as Record<string, unknown>, ["id"]) ||
      !Array.isArray(o.lines)
    )
      throw Error("工程数据格式错误");
    if (o.lines.length)
      validateLines(
        o.lines.map((l: WorkLine) => {
          if (
            !strings(l as unknown as Record<string, unknown>, [
              "id",
              "category",
              "name",
              "unit",
              "quantity",
              "description",
            ]) ||
            ![l.materialPrice, l.laborPrice].every(
              (p) => Number.isSafeInteger(p) && p >= 0 && p <= 100_000_000,
            )
          )
            throw Error("工程明细格式错误");
          return toDraft(l);
        }),
      );
  };
  d.templates.forEach((t: WorkTemplate) => {
    if (typeof t.name !== "string") throw Error("模板格式错误");
    check(t);
  });
  d.quotes.forEach((q: WorkQuote) => {
    if (
      !strings(q as unknown as Record<string, unknown>, [
        "customer",
        "project",
        "date",
      ])
    )
      throw Error("报价格式错误");
    check(q);
  });
  return d;
}
