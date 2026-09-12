import { NextResponse } from "next/server";
import { requireOrg } from "@/lib/auth/current-user";
import { ingestCompareDataset } from "@/lib/engine/compare/ingest";
import { randomUUID } from "node:crypto";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const { orgId } = await requireOrg();
    const jobId = randomUUID();

    // Source 1: Internal Sales Ledger (CSV)
    const source1Csv = `order_id,customer_name,order_date,amount,payment_channel,order_status
ORD-1001,Acme Corporation,2026-03-01,1540.00,Stripe,COMPLETED
ORD-1002,Global Logistics LLC,2026-03-02,3200.50,Wire,COMPLETED
ORD-1003,Starlight Media,2026-03-03,890.00,CreditCard,COMPLETED
ORD-1004,Apex Innovations,2026-03-04,4500.00,Stripe,COMPLETED
ORD-1005,Nexus Robotics,2026-03-05,2100.25,ACH,COMPLETED
ORD-1006,Vanguard Retail,2026-03-06,6750.00,Wire,COMPLETED
ORD-1007,Pinnacle Systems,2026-03-07,1250.00,CreditCard,PENDING
ORD-1008,Horizon Cloud Inc,2026-03-08,980.50,Stripe,COMPLETED
ORD-1009,Beacon Health,2026-03-09,5400.00,Wire,COMPLETED
ORD-1010,Cyberdyne Dynamics,2026-03-10,3120.00,ACH,COMPLETED
ORD-1011,Omega Defense,2026-03-11,8400.00,Wire,COMPLETED
ORD-1012,Titan Manufacturing,2026-03-12,1950.00,Stripe,COMPLETED
ORD-1013,Summit Ventures,2026-03-13,4200.00,ACH,COMPLETED
ORD-1014,Echo Logistics,2026-03-14,750.00,CreditCard,COMPLETED
ORD-1015,Quantum Leap AI,2026-03-15,11200.00,Wire,COMPLETED
ORD-1015,Quantum Leap AI,2026-03-15,11200.00,Wire,COMPLETED`; // intentional duplicate to demonstrate duplicate detection

    // Source 2: Bank Settlement Statement (CSV)
    const source2Csv = `transaction_ref,client_account,settlement_date,settled_amount,payment_gateway,cleared_flag
ORD-1001,Acme Corporation,2026-03-01,1540.00,Stripe,YES
ORD-1002,Global Logistics LLC,2026-03-03,3200.50,Wire,YES
ORD-1003,Starlight Media Inc,2026-03-03,889.98,CreditCard,YES
ORD-1004,Apex Innovations,2026-03-04,4450.00,Stripe,YES
ORD-1005,Nexus Robotics,2026-03-06,2100.25,ACH,YES
ORD-1006,Vanguard Retailers,2026-03-06,6750.00,Wire,YES
ORD-1008,Horizon Cloud,2026-03-08,980.50,Stripe,YES
ORD-1009,Beacon Health Systems,2026-03-10,5395.00,Wire,YES
ORD-1010,Cyberdyne Dynamics,2026-03-10,3120.00,ACH,YES
ORD-1011,Omega Defense Ltd,2026-03-12,8400.00,Wire,YES
ORD-1012,Titan Manufacturing,2026-03-12,1948.50,Stripe,YES
ORD-1013,Summit Ventures,2026-03-13,4200.00,ACH,YES
ORD-1016,Unmatched Bank Wire,2026-03-16,3500.00,Wire,YES
ORD-1017,Direct Deposit Adjustment,2026-03-17,620.00,ACH,YES`;

    const profile1 = await ingestCompareDataset({
      orgId,
      jobId,
      sourceIndex: 1,
      filename: "internal_sales_ledger.csv",
      buffer: Buffer.from(source1Csv, "utf8"),
    });

    const profile2 = await ingestCompareDataset({
      orgId,
      jobId,
      sourceIndex: 2,
      filename: "postgres_settlement_export.csv",
      buffer: Buffer.from(source2Csv, "utf8"),
    });

    return NextResponse.json({
      success: true,
      jobId,
      source1: profile1,
      source2: profile2,
    });
  } catch (err: any) {
    console.error("Compare sample load error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to load sample dataset" },
      { status: 500 },
    );
  }
}
