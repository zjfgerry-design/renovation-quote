import { test, expect } from "@playwright/test";
import ExcelJS from "exceljs";
async function workbook(missing = false) {
  const w = new ExcelJS.Workbook();
  const s = w.addWorksheet("预算表");
  s.mergeCells("A5:I5");
  s.getCell("A5").value = "A、演示施工";
  s.getRow(6).values = [
    1,
    "测试工程",
    { formula: "1+1", ...(missing ? {} : { result: 2 }) },
    "㎡",
    0.29,
    0.58,
    10,
    20,
    "演示工艺",
  ];
  s.getRow(7).values = ["", "小 计", "", "", "", 0.58, "", 20];
  const p = w.addWorksheet("主材计划表");
  p.getCell("A3").value = "前期";
  p.getCell("C3").value = "瓷砖";
  p.getCell("D3").value = "核尺寸";
  p.getCell("I3").value = "开工前";
  return Buffer.from(await w.xlsx.writeBuffer());
}
test("浏览器本地导入、人工核对、保存模板、创建并编辑打印工程报价，原报价不受影响", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/quote");
  await page.getByLabel("客户名称").fill("原报价演示客户");
  const old = await page.evaluate(() =>
    localStorage.getItem("renovation-quote-v1"),
  );
  await page.goto("/import");
  const uploads: string[] = [];
  page.on("request", (r) => {
    if (r.method() === "POST") uploads.push(r.url());
  });
  await page.getByLabel("上传 Excel 文件").setInputFiles({
    name: "演示预算.xlsx",
    mimeType:
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    buffer: await workbook(true),
  });
  await expect(page.getByText("识别摘要", { exact: true })).toBeVisible();
  await expect(page.getByLabel("第1项数量")).toHaveValue("");
  await page.getByLabel("我已逐项校对", { exact: false }).check();
  await page.getByRole("button", { name: "保存为模板", exact: true }).click();
  await expect(
    page.getByRole("alert").filter({ hasText: "第 1 项" }),
  ).toBeVisible();
  await page.getByLabel("第1项数量").fill("2");
  await expect(
    page.getByLabel("我已逐项校对", { exact: false }),
  ).not.toBeChecked();
  await page.getByLabel("模板 / 项目名称").fill("测试模板");
  await page.getByLabel("我已逐项校对", { exact: false }).check();
  await page.getByRole("button", { name: "保存为模板", exact: true }).click();
  await expect(page).toHaveURL(/templates/);
  await page.getByRole("button", { name: "创建新报价" }).click();
  await expect(page).toHaveURL(/engineering\?id=/);
  await page.getByLabel("客户名称").fill("工程演示客户");
  await page.getByLabel("第1项数量").fill("3");
  await page.getByLabel("第1项材料单价").fill("0.30");
  await page.getByRole("button", { name: "保存并预览" }).click();
  await expect(page.locator(".quote-paper")).toContainText("¥30.90");
  await page.emulateMedia({ media: "print" });
  await expect(page.locator(".sidebar")).toBeHidden();
  await page.pdf({ path: "/tmp/engineering-quote-test.pdf", format: "A4" });
  await page.emulateMedia({ media: "screen" });
  await page.screenshot({
    path: "/tmp/engineering-quote-preview.png",
    fullPage: true,
  });
  await page.reload();
  await expect(page.getByLabel("客户名称")).toHaveValue("工程演示客户");
  await expect(page.getByLabel("第1项数量")).toHaveValue("3");
  expect(
    await page.evaluate(() => localStorage.getItem("renovation-quote-v1")),
  ).toBe(old);
  expect(uploads).toEqual([]);
  expect(errors).toEqual([]);
});
test("直接导入创建报价及存储配额失败不误报成功", async ({ page }) => {
  await page.goto("/import");
  await page.getByLabel("上传 Excel 文件").setInputFiles({
    name: "演示.xlsx",
    mimeType:
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    buffer: await workbook(),
  });
  await expect(page.getByText("识别摘要", { exact: true })).toBeVisible();
  await page.getByLabel("我已逐项校对", { exact: false }).check();
  await page.evaluate(() => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (k, v) {
      if (k === "renovation-engineering-v1")
        throw new DOMException("配额不足", "QuotaExceededError");
      original.call(this, k, v);
    };
  });
  await page.getByRole("button", { name: "创建报价单", exact: true }).click();
  await expect(
    page.getByRole("alert").filter({ hasText: "保存失败" }),
  ).toBeVisible();
  await expect(page).toHaveURL(/import/);
  await page.reload();
  await page.getByLabel("上传 Excel 文件").setInputFiles({
    name: "演示.xlsx",
    mimeType:
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    buffer: await workbook(),
  });
  await expect(page.getByText("识别摘要", { exact: true })).toBeVisible();
  await page.getByLabel("我已逐项校对", { exact: false }).check();
  await page.getByRole("button", { name: "创建报价单", exact: true }).click();
  await expect(page).toHaveURL(/engineering\?id=/);
});
