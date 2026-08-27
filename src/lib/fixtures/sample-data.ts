import ExcelJS from "exceljs";

/**
 * Generate a realistic multi-table enterprise dataset with:
 * 1. Orders & Transactions (Excel sheet / source 1)
 * 2. Regional Targets & Budgets (Excel sheet / source 2)
 * 3. Products Catalog (Excel sheet / source 3)
 * 4. Customers & Accounts (Excel sheet / source 4)
 */
export async function generateSampleEnterpriseWorkbook(): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Confluence BI Sample Generator";

  // 1. Orders sheet
  const ordersSheet = workbook.addWorksheet("Orders");
  ordersSheet.columns = [
    { header: "order_id", key: "order_id", width: 14 },
    { header: "order_date", key: "order_date", width: 14 },
    { header: "customer_id", key: "customer_id", width: 14 },
    { header: "product_id", key: "product_id", width: 14 },
    { header: "region", key: "region", width: 14 },
    { header: "channel", key: "channel", width: 14 },
    { header: "quantity", key: "quantity", width: 12 },
    { header: "unit_price", key: "unit_price", width: 14 },
    { header: "discount_pct", key: "discount_pct", width: 14 },
    { header: "revenue", key: "revenue", width: 16 },
    { header: "cost", key: "cost", width: 14 },
    { header: "profit", key: "profit", width: 14 },
    { header: "status", key: "status", width: 14 },
  ];

  const regions = ["North America", "Europe", "Asia Pacific", "Latin America"];
  const channels = ["Direct Enterprise", "Online Store", "Partner Network", "Distributor"];
  const statuses = ["Completed", "Completed", "Completed", "Pending", "Returned"];

  const products = [
    { id: "PROD-001", name: "Cloud Analytics Suite", basePrice: 1250, baseCost: 350 },
    { id: "PROD-002", name: "Enterprise Gateway Server", basePrice: 3400, baseCost: 1200 },
    { id: "PROD-003", name: "Security Audit Appliance", basePrice: 2100, baseCost: 800 },
    { id: "PROD-004", name: "Edge Compute Module", basePrice: 850, baseCost: 280 },
    { id: "PROD-005", name: "Data Pipeline Connectors", basePrice: 450, baseCost: 110 },
    { id: "PROD-006", name: "Real-time Telemetry Hub", basePrice: 1800, baseCost: 650 },
    { id: "PROD-007", name: "Automated Compliance Bot", basePrice: 950, baseCost: 300 },
  ];

  const customers = [
    { id: "CUST-101", name: "Acme Global Systems", segment: "Enterprise", region: "North America" },
    { id: "CUST-102", name: "Novartis Technologies", segment: "Healthcare", region: "Europe" },
    { id: "CUST-103", name: "Tokyo Dynamics", segment: "Manufacturing", region: "Asia Pacific" },
    { id: "CUST-104", name: "Apex FinTech Capital", segment: "Financial Services", region: "North America" },
    { id: "CUST-105", name: "Starlight Retailers", segment: "Retail", region: "North America" },
    { id: "CUST-106", name: "Nordic Wind Energy", segment: "Energy", region: "Europe" },
    { id: "CUST-107", name: "São Paulo Logistics", segment: "Supply Chain", region: "Latin America" },
    { id: "CUST-108", name: "Kyoto Semiconductor", segment: "Manufacturing", region: "Asia Pacific" },
  ];

  const startDate = new Date(2025, 0, 1).getTime();
  const endDate = new Date(2026, 7, 24).getTime();

  for (let i = 1; i <= 600; i++) {
    const orderDate = new Date(startDate + Math.random() * (endDate - startDate))
      .toISOString()
      .split("T")[0];
    const customer = customers[Math.floor(Math.random() * customers.length)] || customers[0]!;
    const product = products[Math.floor(Math.random() * products.length)] || products[0]!;
    const region = Math.random() > 0.3 ? customer.region : regions[Math.floor(Math.random() * regions.length)] || "North America";
    const channel = channels[Math.floor(Math.random() * channels.length)] || "Online Store";
    const quantity = Math.floor(Math.random() * 8) + 1;
    const discount = Math.random() > 0.6 ? Number((Math.random() * 0.25).toFixed(2)) : 0;
    const unitPrice = product.basePrice * (1 + (Math.random() * 0.1 - 0.05));
    const grossRev = quantity * unitPrice;
    const revenue = Number((grossRev * (1 - discount)).toFixed(2));
    const cost = Number((quantity * product.baseCost).toFixed(2));
    const profit = Number((revenue - cost).toFixed(2));
    const status = statuses[Math.floor(Math.random() * statuses.length)] || "Completed";

    ordersSheet.addRow({
      order_id: `ORD-${10000 + i}`,
      order_date: orderDate,
      customer_id: customer.id,
      product_id: product.id,
      region,
      channel,
      quantity,
      unit_price: Number(unitPrice.toFixed(2)),
      discount_pct: discount * 100,
      revenue,
      cost,
      profit,
      status,
    });
  }

  // 2. Targets sheet
  const targetsSheet = workbook.addWorksheet("Targets");
  targetsSheet.columns = [
    { header: "target_id", key: "target_id", width: 14 },
    { header: "year_month", key: "year_month", width: 14 },
    { header: "region", key: "region", width: 16 },
    { header: "revenue_target", key: "revenue_target", width: 18 },
    { header: "target_orders", key: "target_orders", width: 16 },
  ];

  let tId = 1;
  for (let y = 2025; y <= 2026; y++) {
    for (let m = 1; m <= (y === 2026 ? 8 : 12); m++) {
      const ym = `${y}-${String(m).padStart(2, "0")}`;
      for (const r of regions) {
        targetsSheet.addRow({
          target_id: `TGT-${tId++}`,
          year_month: ym,
          region: r,
          revenue_target: Math.floor(45000 + Math.random() * 35000),
          target_orders: Math.floor(25 + Math.random() * 20),
        });
      }
    }
  }

  // 3. Products Catalog sheet
  const prodSheet = workbook.addWorksheet("Products");
  prodSheet.columns = [
    { header: "product_id", key: "product_id", width: 14 },
    { header: "product_name", key: "product_name", width: 28 },
    { header: "category", key: "category", width: 18 },
    { header: "list_price", key: "list_price", width: 14 },
    { header: "unit_cost", key: "unit_cost", width: 14 },
  ];
  for (const p of products) {
    prodSheet.addRow({
      product_id: p.id,
      product_name: p.name,
      category: p.id.includes("1") || p.id.includes("5") ? "Software" : "Hardware",
      list_price: p.basePrice,
      unit_cost: p.baseCost,
    });
  }

  // 4. Customers sheet
  const custSheet = workbook.addWorksheet("Customers");
  custSheet.columns = [
    { header: "customer_id", key: "customer_id", width: 14 },
    { header: "customer_name", key: "customer_name", width: 28 },
    { header: "industry_segment", key: "industry_segment", width: 20 },
    { header: "headquarters_region", key: "headquarters_region", width: 18 },
  ];
  for (const c of customers) {
    custSheet.addRow({
      customer_id: c.id,
      customer_name: c.name,
      industry_segment: c.segment,
      headquarters_region: c.region,
    });
  }

  const buf = await workbook.xlsx.writeBuffer();
  return Buffer.from(buf);
}
