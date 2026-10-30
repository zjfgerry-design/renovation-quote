import { test } from "node:test";
import assert from "node:assert/strict";
import ExcelJS from "exceljs";
import { parseWorkbook, parseExcel, inspectArchive } from "../src/lib/excel";
import {
  validateLines,
  workTotals,
  parseWork,
  emptyWork,
} from "../src/lib/engineering";
function fixture() {
  const w = new ExcelJS.Workbook();
  const s = w.addWorksheet("预算表");
  s.getCell("A2").value = "序号";
  s.getCell("B2").value = "项目名称";
  s.mergeCells("A5:I5");
  s.getCell("A5").value = "A、拆除施工项目";
  s.getRow(6).values = [
    1,
    "演示拆除",
    { formula: "1+1", result: 2 },
    "㎡",
    0.29,
    { formula: "C6*E6", result: 0.58 },
    10,
    20,
    "人工拆除",
  ];
  s.getRow(7).values = ["", "小    计", "", "", "", 0.58, "", 20];
  s.mergeCells("A8:B8");
  s.getCell("A8").value = "工程总造价";
  s.mergeCells("B9:I9");
  s.getCell("A9").value = 1;
  s.getCell("B9").value = "合并的结算说明";
  const p = w.addWorksheet("主材计划表");
  p.mergeCells("A3:A4");
  p.getCell("A3").value = "前期施工";
  p.getRow(3).getCell(3).value = "瓷砖";
  p.getCell("D3").value = "核对尺寸";
  p.getCell("I3").value = "开工前";
  p.getCell("C4").value = "门窗";
  return w;
}
test("识别分类，跳过多层表头、空行、小计、总价和合并备注；计划合并阶段填充", () => {
  const r = parseWorkbook(fixture());
  assert.equal(r.rows.length, 1);
  assert.equal(r.rows[0].draft.quantity, "2.000");
  assert.equal(r.rows[0].draft.category, "A、拆除施工项目");
  assert.equal(r.plans.length, 2);
  assert.equal(r.plans[1].stage, "前期施工");
  const t = workTotals(validateLines(r.rows.map((r) => r.draft)));
  assert.deepEqual(t, { material: 58, labor: 2000, total: 2058 });
});
test("公式无缓存、错误缓存、外部公式都不执行或默认为零", () => {
  const w = fixture();
  w.getWorksheet("预算表")!.getCell("C6").value = {
    formula: "[remote.xlsx]A1",
  };
  const r = parseWorkbook(w);
  assert.equal(r.rows[0].draft.quantity, "");
  assert.match(r.rows[0].warnings.join(), /公式缺少有效缓存/);
  assert.throws(() => validateLines(r.rows.map((x) => x.draft)));
  w.getWorksheet("预算表")!.getCell("C6").value = {
    formula: "1/0",
    result: { error: "#DIV/0!" },
  };
  assert.equal(parseWorkbook(w).rows[0].draft.quantity, "");
});
test("显式零缓存保留为零，不当成缺失；高精度数量保留但需人工核对", () => {
  const w = fixture(),
    s = w.getWorksheet("预算表")!;
  s.getCell("C6").value = { formula: "1-1", result: 0 };
  let r = parseWorkbook(w);
  assert.equal(r.rows[0].draft.quantity, "0.000");
  assert.equal(workTotals(validateLines(r.rows.map((x) => x.draft))).total, 0);
  s.getCell("C6").value = { formula: "1/3", result: 0.3333333 };
  r = parseWorkbook(w);
  assert.equal(r.rows[0].draft.quantity, "0.3333333");
  assert.throws(() => validateLines(r.rows.map((x) => x.draft)));
});
test("千分位、币种符号及负数、缺失单价与合并数字异常", () => {
  const w = fixture(),
    s = w.getWorksheet("预算表")!;
  s.getCell("E6").value = "￥1,234.50";
  assert.equal(parseWorkbook(w).rows[0].draft.materialPrice, "1234.50");
  s.getCell("E6").value = -5;
  assert.throws(() => validateLines(parseWorkbook(w).rows.map((x) => x.draft)));
  s.getCell("E6").value = null;
  assert.equal(parseWorkbook(w).rows[0].draft.materialPrice, "");
  s.mergeCells("F6:G6");
  assert.equal(parseWorkbook(w).rows[0].draft.laborPrice, "");
});
test("真实 xlsx 字节往返，以及损坏/空/超限文件拒绝", async () => {
  const w = fixture();
  const bytes = new Uint8Array(await w.xlsx.writeBuffer());
  const r = await parseExcel(bytes);
  assert.equal(r.rows.length, 1);
  assert.throws(() => inspectArchive(new Uint8Array([1, 2, 3])));
  assert.throws(() => inspectArchive(new Uint8Array(9 * 1024 * 1024)));
  await assert.rejects(() => parseExcel(new Uint8Array([1, 2, 3])));
  assert.throws(() => parseWorkbook(new ExcelJS.Workbook()));
});
test("工程存储验证不改变旧数据，拒绝无效单价与损坏数据", () => {
  assert.deepEqual(parseWork(JSON.stringify(emptyWork)), emptyWork);
  assert.throws(() => parseWork("{"));
  const l = validateLines(parseWorkbook(fixture()).rows.map((x) => x.draft));
  assert.throws(() =>
    parseWork(
      JSON.stringify({
        version: 1,
        quotes: [],
        templates: [
          { id: "a", name: "a", lines: [{ ...l[0], materialPrice: -1 }] },
        ],
      }),
    ),
  );
});
