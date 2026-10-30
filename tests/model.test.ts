import { test } from "node:test";
import assert from "node:assert/strict";
import {
  decimal,
  amount,
  total,
  initialData,
  parseData,
} from "../src/lib/model";
test("十进制金额精确转换，拒绝无效和过大输入", () => {
  assert.equal(decimal("0.29", 2), 29);
  assert.equal(decimal("12.3", 2), 1230);
  for (const v of ["-1", "NaN", "1e3", "1.001", "", "1000001"])
    assert.throws(() => decimal(v, 2));
});
test("分与千分数量使用整数四舍五入，不积累浮点误差", () => {
  const m = initialData().materials[0];
  const line = { ...m, price: 10, lineId: "a", quantity: "0.15" };
  assert.equal(amount(line), 2);
  assert.equal(total([line, line, line]), 6);
  assert.equal(amount({ ...line, price: 29, quantity: "3" }), 87);
});
test("演示数据至少十条，保存与读取保持快照", () => {
  const d = initialData();
  assert.ok(d.materials.length >= 10);
  d.quote.lines = [{ ...d.materials[0], lineId: "a", quantity: "1.234" }];
  assert.deepEqual(parseData(JSON.stringify(d)), d);
  d.materials[0].price = 1;
  assert.notEqual(d.quote.lines[0].price, 1);
});
test("拒绝损坏数据与非法数量", () => {
  assert.throws(() => parseData("{"));
  const d = initialData();
  d.quote.lines = [{ ...d.materials[0], lineId: "a", quantity: "0" }];
  assert.throws(() => parseData(JSON.stringify(d)));
  d.quote.lines[0].quantity = "hello";
  assert.throws(() => parseData(JSON.stringify(d)));
});
