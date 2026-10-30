import type { Cell, Workbook, Worksheet } from "exceljs";
import { decimal } from "./model";
import { validateLine, workAmount, type DraftLine } from "./engineering";
export type ImportRow = {
  sourceRow: number;
  draft: DraftLine;
  warnings: string[];
  sourceMaterial: string;
  sourceLabor: string;
};
export type PlanRow = {
  stage: string;
  category: string;
  preparation: string;
  purchaseTime: string;
};
export type ImportResult = {
  rows: ImportRow[];
  skipped: number;
  categories: string[];
  plans: PlanRow[];
  cover: string[];
  warnings: string[];
};
// Check ZIP central-directory metadata before decompression. ZIP64 and very large workbooks are deliberately unsupported.
export function inspectArchive(bytes: Uint8Array) {
  if (bytes.byteLength > 8 * 1024 * 1024) throw Error("文件超过 8 MB 限制");
  const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let end = -1;
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65557); i--)
    if (v.getUint32(i, true) === 0x06054b50) {
      end = i;
      break;
    }
  if (end < 0) throw Error("不是有效的 .xlsx 文件（ZIP 目录缺失）");
  const count = v.getUint16(end + 10, true);
  let pos = v.getUint32(end + 16, true),
    size = 0;
  if (count > 3000 || v.getUint16(end + 4, true) !== 0)
    throw Error("工作簿结构过大或不受支持");
  for (let i = 0; i < count; i++) {
    if (pos + 46 > bytes.length || v.getUint32(pos, true) !== 0x02014b50)
      throw Error("工作簿压缩结构损坏");
    const inflated = v.getUint32(pos + 24, true);
    size += inflated;
    if (size > 32 * 1024 * 1024 || inflated === 0xffffffff)
      throw Error("解压后内容超过 32 MB 限制");
    pos +=
      46 +
      v.getUint16(pos + 28, true) +
      v.getUint16(pos + 30, true) +
      v.getUint16(pos + 32, true);
  }
  if (!count) throw Error("空工作簿文件");
}
function raw(cell: Cell): unknown {
  const v = cell.value;
  if (v && typeof v === "object") {
    if ("formula" in v || "sharedFormula" in v) return cell.master.result;
    if ("richText" in v) return v.richText.map((t) => t.text).join("");
    if ("text" in v) return v.text;
    return undefined;
  }
  return v;
}
function text(cell: Cell) {
  const v = raw(cell);
  return typeof v === "string" || typeof v === "number" ? String(v).trim() : "";
}
function isFormula(cell: Cell) {
  const v = cell.value;
  return (
    !!v && typeof v === "object" && ("formula" in v || "sharedFormula" in v)
  );
}
function numeric(cell: Cell, digits: number, warnings: string[]) {
  if (cell.isMerged && cell.master.address !== cell.address) {
    warnings.push(
      `${cell.address}：数值列被合并，请按原表含义人工填写，禁止重复计价`,
    );
    return "";
  }
  const v = raw(cell);
  const label = cell.address;
  if (v === null || v === undefined || v === "") {
    warnings.push(
      `${label}：${isFormula(cell) ? "公式缺少有效缓存结果" : "数值为空"}，请人工填写`,
    );
    return "";
  }
  let str = "";
  if (typeof v === "number" && Number.isFinite(v)) {
    const scaled = v * 10 ** digits;
    const nearest = Math.round(scaled);
    str =
      Math.abs(scaled - nearest) < 1e-6
        ? (nearest / 10 ** digits).toFixed(digits)
        : String(v);
  } else if (typeof v === "string") {
    str = v
      .trim()
      .replace(/^[￥¥]\s*/, "")
      .replace(/\s*元$/, "");
    if (/^[0-9]{1,3}(,[0-9]{3})+(\.[0-9]+)?$/.test(str))
      str = str.replaceAll(",", "");
  } else {
    warnings.push(`${label}：不是有效数字，请人工填写`);
    return "";
  }
  try {
    decimal(str, digits);
    return str;
  } catch {
    warnings.push(`${label}：数值无效或超出精度/范围，请人工填写`);
    return str;
  }
}
function checkSheet(sheet: Worksheet) {
  if (sheet.rowCount > 2000 || sheet.columnCount > 100)
    throw Error("工作表超过 2000 行或 100 列限制，请拆分文件");
}
export function parseWorkbook(workbook: Workbook): ImportResult {
  if (workbook.worksheets.length > 20) throw Error("工作表数量超过 20 个限制");
  workbook.worksheets.forEach(checkSheet);
  const sheet = workbook.getWorksheet("预算表");
  if (!sheet)
    throw Error(
      "未找到“预算表”工作表，请使用 A—I 列格式并将预算工作表命名为“预算表”",
    );
  const result: ImportResult = {
    rows: [],
    skipped: 0,
    categories: [],
    plans: [],
    cover: [],
    warnings: [],
  };
  let category = "未分类";
  sheet.eachRow((row, n) => {
    if (n < 5) {
      result.skipped++;
      return;
    }
    const a = text(row.getCell(1)),
      name = text(row.getCell(2));
    const compact = (a + " " + name).replace(/\s/g, "");
    if (!compact) {
      result.skipped++;
      return;
    }
    if (/[小合总]计|汇总|总价|总造价|工程造价/.test(compact)) {
      result.skipped++;
      return;
    }
    // Only the A master of a merged category header is inspected; numeric cells are never filled down.
    if (
      /^(?:[A-ZＡ-Ｚ]|[一二三四五六七八九十]+)[、．.]/.test(a) &&
      (!name ||
        (row.getCell(2).isMerged &&
          row.getCell(2).master.address === row.getCell(1).address))
    ) {
      category = a;
      if (!result.categories.includes(a)) result.categories.push(a);
      result.skipped++;
      return;
    }
    if (/序号|项目名称|施工工艺/.test(compact)) {
      result.skipped++;
      return;
    }
    if (
      row.getCell(3).isMerged &&
      /^[AB]\d+$/.test(row.getCell(3).master.address)
    ) {
      result.skipped++;
      return;
    }
    if (!name) {
      result.skipped++;
      result.warnings.push(`第 ${n} 行没有项目名称，已跳过，请核对原表`);
      return;
    }
    if (!/^\d+(?:\.\d+)?$/.test(a) && !text(row.getCell(4))) {
      result.skipped++;
      result.warnings.push(`第 ${n} 行疑似备注或费用说明，未计价，请核对原表`);
      return;
    }
    const warnings: string[] = [];
    const draft: DraftLine = {
      id: `row-${n}`,
      category,
      name,
      quantity: numeric(row.getCell(3), 3, warnings),
      unit: text(row.getCell(4)),
      materialPrice: numeric(row.getCell(5), 2, warnings),
      laborPrice: numeric(row.getCell(7), 2, warnings),
      description: text(row.getCell(9)),
    };
    if (typeof raw(row.getCell(4)) === "number") {
      draft.unit = "";
      warnings.push(
        `D${n}：单位为数字或费率，请人工改为单位并核对费用计算方式`,
      );
    }
    const sourceMaterial = text(row.getCell(6)),
      sourceLabor = text(row.getCell(8));
    for (const [col, label] of [
      [6, "材料合价"],
      [8, "人工合价"],
    ] as const) {
      const c = row.getCell(col),
        v = raw(c);
      if (isFormula(c) && (typeof v !== "number" || !Number.isFinite(v)))
        warnings.push(
          `${c.address}：${label}公式缺少有效缓存；本系统将按校对后的数量和单价重算`,
        );
    }
    try {
      const line = validateLine(draft);
      for (const [source, key, label] of [
        [sourceMaterial, "materialPrice", "材料合价"],
        [sourceLabor, "laborPrice", "人工合价"],
      ] as const) {
        if (
          source &&
          Number.isFinite(Number(source)) &&
          Math.abs(Number(source) * 100 - workAmount(line, key)) > 0.51
        )
          warnings.push(`${label}原表缓存与逐项四舍五入结果不一致，请核对`);
      }
    } catch {
      /* Editable invalid fields are intentionally retained for review. */
    }
    result.rows.push({
      sourceRow: n,
      draft,
      warnings,
      sourceMaterial,
      sourceLabor,
    });
  });
  if (!result.rows.length) throw Error("未识别到施工项目，请核对预算表结构");
  if (result.rows.length > 1000)
    throw Error("工程项目超过 1000 项，请拆分文件");
  const plan = workbook.getWorksheet("主材计划表");
  if (plan) {
    let stage = "";
    plan.eachRow((r, n) => {
      if (n < 3) return;
      stage = text(r.getCell(1)) || stage;
      const category = text(r.getCell(3));
      if (category)
        result.plans.push({
          stage,
          category,
          preparation: text(r.getCell(4)),
          purchaseTime: text(r.getCell(9)),
        });
    });
  }
  const cover = workbook.getWorksheet("封面");
  if (cover) {
    cover.eachRow((r) => {
      const values: string[] = [];
      r.eachCell((c) => {
        if (!c.isMerged || c.master.address === c.address) {
          const s = text(c);
          if (s) values.push(s);
        }
      });
      if (values.length) result.cover.push(values.join(" · "));
    });
  }
  return result;
}
export async function parseExcel(bytes: Uint8Array): Promise<ImportResult> {
  inspectArchive(bytes);
  try {
    const ExcelJS = await import("exceljs");
    const workbook = new ExcelJS.default.Workbook();
    await workbook.xlsx.load(
      bytes as unknown as Parameters<typeof workbook.xlsx.load>[0],
    );
    return parseWorkbook(workbook);
  } catch (e) {
    throw Error(
      `Excel 解析失败：${(e as Error).message}。不支持加密或损坏的工作簿。`,
    );
  }
}
