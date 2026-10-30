import { test, expect } from "@playwright/test";
test("材料管理、报价、刷新持久化及打印预览", async ({ page }) => {
  await page.goto("/materials");
  await expect(page.getByText("柔光通体砖", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "添加材料" }).click();
  await page.getByLabel("材料名称", { exact: true }).fill("测试木板");
  await page.getByLabel("品牌", { exact: true }).fill("演示品牌");
  await page.getByLabel("规格型号").fill("20mm");
  await page.getByLabel("单价").fill("0.29");
  await page.getByRole("button", { name: "保存材料" }).click();
  const row = page.getByRole("row").filter({ hasText: "测试木板" });
  await expect(row).toContainText("¥0.29");
  await row.getByRole("button", { name: "编辑" }).click();
  await page.getByLabel("单价").fill("0.30");
  await page.getByRole("button", { name: "保存材料" }).click();
  await page.goto("/quote");
  await page.getByLabel("客户名称").fill("演示客户");
  await page.getByLabel("项目名称").fill("演示住宅装修");
  await page
    .getByLabel("从材料库添加")
    .selectOption({ label: "测试木板 · 20mm · ¥0.30/㎡" });
  await page.getByLabel("数量", { exact: true }).fill("3");
  await page.getByRole("button", { name: "添加到报价" }).click();
  await expect(page.getByText("¥0.90")).toHaveCount(2);
  await page.getByLabel("测试木板数量").fill("2.5");
  await page.getByLabel("测试木板数量").blur();
  await expect(page.getByText("¥0.75")).toHaveCount(2);
  await page.reload();
  await expect(page.getByLabel("客户名称")).toHaveValue("演示客户");
  await expect(page.getByText("¥0.75")).toHaveCount(2);
  await page.goto("/materials");
  page.once("dialog", (d) => d.accept());
  await page
    .getByRole("row")
    .filter({ hasText: "测试木板" })
    .getByRole("button", { name: "删除" })
    .click();
  await expect(
    page.getByRole("row").filter({ hasText: "测试木板" }),
  ).toHaveCount(0);
  await page.goto("/preview");
  await expect(
    page.getByRole("button", { name: "打印 / 保存 PDF" }),
  ).toBeEnabled();
  await expect(page.locator(".quote-paper")).toContainText("测试木板");
  await expect(page.locator(".document-total")).toContainText("¥0.75");
  await page.emulateMedia({ media: "print" });
  await expect(page.locator(".sidebar")).toBeHidden();
  await page.pdf({ path: "/tmp/renovation-quote-test.pdf", format: "A4" });
  await page.emulateMedia({ media: "screen" });
  await page.goto("/quote");
  await page.getByRole("button", { name: "移除" }).click();
  await expect(page.getByText("报价单还没有材料")).toBeVisible();
});
test("移动布局与损坏数据保护", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(390);
  await page.evaluate(() =>
    localStorage.setItem("renovation-quote-v1", "broken"),
  );
  await page.reload();
  await expect(
    page.getByRole("alert").filter({ hasText: "原数据未覆盖" }),
  ).toContainText("原数据未覆盖");
  await page.goto("/quote");
  await page.getByLabel("客户名称").fill("本次会话");
  expect(
    await page.evaluate(() => localStorage.getItem("renovation-quote-v1")),
  ).toBe("broken");
});
