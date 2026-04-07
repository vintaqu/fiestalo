"use client";

import { motion } from "framer-motion";
import {
  TrendingUp,
  TrendingDown,
  Euro,
  Calendar,
  Building2,
  CheckCircle,
} from "lucide-react";
import { formatPrice, formatNumber } from "@/utils/format";
import { cn } from "@/lib/utils";

interface KPI {
  label: string;
  value: number;
  total?: number;
  type: "currency" | "number" | "percent";
  change?: number | null;
  icon: "euro" | "calendar" | "building" | "check";
}

const ICONS = {
  euro: Euro,
  calendar: Calendar,
  building: Building2,
  check: CheckCircle,
};

const COLORS = [
  "from-violet-500 to-purple-600",
  "from-blue-500 to-cyan-600",
  "from-emerald-500 to-teal-600",
  "from-amber-500 to-orange-600",
];

export function DashboardKPIs({ kpis }: { kpis: KPI[] }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      {kpis.map((kpi, i) => {
        const Icon = ICONS[kpi.icon];
        const isPositive = (kpi.change ?? 0) >= 0;

        return (
          <motion.div
            key={kpi.label}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07 }}
            className="bg-card rounded-2xl border border-border p-5 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between mb-4">
              <div
                className={cn(
                  "w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center",
                  COLORS[i % COLORS.length]
                )}
              >
                <Icon className="w-5 h-5 text-white" />
              </div>
              {kpi.change !== null && kpi.change !== undefined && (
                <span
                  className={cn(
                    "flex items-center gap-0.5 text-xs font-medium px-2 py-1 rounded-full",
                    isPositive
                      ? "text-emerald-700 bg-emerald-50 dark:bg-emerald-950 dark:text-emerald-400"
                      : "text-red-700 bg-red-50 dark:bg-red-950 dark:text-red-400"
                  )}
                >
                  {isPositive ? (
                    <TrendingUp className="w-3 h-3" />
                  ) : (
                    <TrendingDown className="w-3 h-3" />
                  )}
                  {Math.abs(kpi.change).toFixed(0)}%
                </span>
              )}
            </div>

            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">{kpi.label}</p>
              <p className="text-2xl font-bold tracking-tight">
                {kpi.type === "currency"
                  ? formatPrice(kpi.value)
                  : kpi.type === "percent"
                    ? `${kpi.value}%`
                    : formatNumber(kpi.value)}
                {kpi.total !== undefined && (
                  <span className="text-sm font-normal text-muted-foreground ml-1">
                    / {kpi.total}
                  </span>
                )}
              </p>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
