"use client";

import React from "react";
import Link from "next/link";
import { Database, Cloud, Radio, HardDrive, Plus, ShieldCheck, ArrowRight } from "lucide-react";

interface StitchConnectorsMonitorProps {
  onOpenTopology?: () => void;
}

export function StitchConnectorsMonitor({ onOpenTopology }: StitchConnectorsMonitorProps) {
  const CONNECTORS = [
    {
      name: "Snowflake Enterprise",
      icon: Cloud,
      detail: "10,420 partitions synced",
      ping: "14ms ping",
      status: "99.98% SLA",
      statusColor: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30",
    },
    {
      name: "BigQuery Production",
      icon: HardDrive,
      detail: "1.12PB indexed space",
      ping: "22ms ping",
      status: "Rolling",
      statusColor: "text-cyan-400 bg-cyan-500/10 border-cyan-500/30",
    },
    {
      name: "RDS Postgres Read Pool",
      icon: Database,
      detail: "Port 5434 • WAL #4032C8F100 current",
      ping: "4ms ping",
      status: "Replica #2",
      statusColor: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30",
    },
    {
      name: "Apache Kafka Ingress",
      icon: Radio,
      detail: "12 broker cluster",
      ping: "3ms ping",
      status: "0 Lag",
      statusColor: "text-indigo-400 bg-indigo-500/10 border-indigo-500/30",
    },
  ];

  return (
    <div className="bg-[#0a0a0a] border border-white/10 rounded-xl p-5 shadow-2xl backdrop-blur-xl flex flex-col justify-between overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-white/10">
        <div>
          <h2 className="text-base font-semibold text-white tracking-tight">Warehouse Connectors</h2>
          <p className="text-[11px] text-zinc-400">
            Cluster nodes, synchronization delay, and ping response times
          </p>
        </div>

        <Link
          href="/app/sources"
          className="inline-flex items-center gap-1 text-xs font-semibold text-white hover:text-zinc-200 bg-white/10 hover:bg-white/15 px-2.5 py-1 rounded-lg transition-colors border border-white/10"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Source</span>
        </Link>
      </div>

      {/* Connectors List */}
      <div className="space-y-2.5 mt-3">
        {CONNECTORS.map((c) => {
          const Icon = c.icon;
          return (
            <div
              key={c.name}
              className="p-3 bg-[#050505] hover:bg-[#111111] border border-white/10 rounded-lg flex items-center justify-between transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-black border border-white/10 flex items-center justify-center text-white">
                  <Icon className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-white">{c.name}</h4>
                  <p className="text-[11px] font-mono text-zinc-400">{c.detail}</p>
                </div>
              </div>

              <div className="text-right flex flex-col items-end">
                <span className="text-xs font-mono font-bold text-emerald-400">{c.ping}</span>
                <span
                  className={`text-[10px] font-mono font-medium px-1.5 py-0.5 rounded border mt-0.5 ${c.statusColor}`}
                >
                  {c.status}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="pt-3 mt-3 border-t border-white/10 flex items-center justify-between text-xs font-mono">
        <div className="flex items-center gap-1.5 text-zinc-400">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>0 Zero packet drop in VPC mesh</span>
        </div>

        {onOpenTopology ? (
          <button
            type="button"
            onClick={onOpenTopology}
            className="inline-flex items-center gap-1 text-white hover:text-zinc-300 font-semibold"
          >
            <span>Topology</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        ) : (
          <Link
            href="/app/sources"
            className="inline-flex items-center gap-1 text-white hover:text-zinc-300 font-semibold"
          >
            <span>Topology</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        )}
      </div>
    </div>
  );
}
