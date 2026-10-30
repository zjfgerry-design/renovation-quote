export type Material = {
  id: string;
  name: string;
  brand: string;
  spec: string;
  unit: string;
  price: number;
};
export type Line = Material & { lineId: string; quantity: string };
export type Quote = {
  customer: string;
  project: string;
  date: string;
  lines: Line[];
};
export type Data = { version: 1; materials: Material[]; quote: Quote };
export const MAX = 100_000_000;
export function decimal(value: string, digits: number): number {
  if (!new RegExp(`^\\d+(?:\\.\\d{1,${digits}})?$`).test(value))
    throw new Error(`请输入非负数字，最多 ${digits} 位小数`);
  const [whole, fraction = ""] = value.split(".");
  const result =
    Number(whole) * 10 ** digits + Number(fraction.padEnd(digits, "0"));
  if (!Number.isSafeInteger(result) || result > MAX)
    throw new Error("数值超出允许范围");
  return result;
}
export const money = (cents: number) =>
  new Intl.NumberFormat("zh-CN", { style: "currency", currency: "CNY" }).format(
    cents / 100,
  );
export function amount(line: Line): number {
  const thousandths = decimal(line.quantity, 3);
  const result = (BigInt(line.price) * BigInt(thousandths) + 500n) / 1000n;
  if (result > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error("金额超出范围");
  return Number(result);
}
export const total = (lines: Line[]) =>
  lines.reduce((sum, line) => sum + amount(line), 0);
export function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
export function initialData(): Data {
  const rows = [
    ["柔光通体砖", "栖木", "800×800 mm", "片", 6800],
    ["耐水腻子粉", "筑青", "20 kg / 袋", "袋", 4800],
    ["净味内墙漆", "云涂", "5 L / 桶", "桶", 26800],
    ["实木复合地板", "木屿", "15 mm 橡木色", "㎡", 18900],
    ["全屋踢脚线", "木屿", "80 mm / 白色", "米", 1800],
    ["防水涂料", "筑青", "18 kg / 桶", "桶", 22800],
    ["厨房石英石台面", "石序", "20 mm / 浅灰", "米", 58000],
    ["不锈钢水槽", "澄器", "760×450 mm", "套", 46900],
    ["冷热水龙头", "澄器", "304 不锈钢", "套", 19900],
    ["阻燃电线", "安禾", "2.5 mm² / 100 m", "卷", 23800],
    ["PPR 给水管", "安禾", "25 mm / 4 m", "根", 3600],
    ["吸顶灯", "明间", "36 W / 暖白", "套", 15900],
  ];
  return {
    version: 1,
    materials: rows.map((r, i) => ({
      id: `demo-${i}`,
      name: String(r[0]),
      brand: String(r[1]),
      spec: String(r[2]),
      unit: String(r[3]),
      price: Number(r[4]),
    })),
    quote: { customer: "", project: "", date: today(), lines: [] },
  };
}
export function parseData(raw: string): Data {
  const d = JSON.parse(raw);
  const material = (m: Material) =>
    m &&
    ["id", "name", "brand", "spec", "unit"].every(
      (k) => typeof m[k as keyof Material] === "string",
    ) &&
    m.name.trim() &&
    Number.isSafeInteger(m.price) &&
    m.price >= 0 &&
    m.price <= MAX;
  if (
    d.version !== 1 ||
    !Array.isArray(d.materials) ||
    !d.materials.every(material) ||
    !d.quote ||
    !["customer", "project", "date"].every(
      (k) => typeof d.quote[k] === "string",
    ) ||
    !Array.isArray(d.quote.lines) ||
    !d.quote.lines.every(
      (l: Line) =>
        material(l) &&
        typeof l.lineId === "string" &&
        typeof l.quantity === "string" &&
        decimal(l.quantity, 3) > 0,
    )
  )
    throw new Error("保存数据格式无效");
  total(d.quote.lines);
  return d;
}
