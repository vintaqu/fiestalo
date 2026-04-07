"use client";

import { useEffect, useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Loader2 } from "lucide-react";
import { formatPrice } from "@/utils/format";

interface OccupancyChartProps {
  ownerId?: string;
  adminMode?: boolean;
}

export function OccupancyChart({ ownerId, adminMode }: OccupancyChartProps) {
  const [data, setData] = useState<Array<{ month: string; revenue: number; bookings: number }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const url = adminMode
          ? "/api/admin/metrics/revenue"
          : `/api/owner/metrics/revenue`;
        const res = await fetch(url);
        const json = await res.json();
        setData(json.data ?? generateMockData());
      } catch {
        setData(generateMockData());
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [ownerId, adminMode]);

  return (
    <div className="bg-card rounded-2xl border border-border p-5 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="font-semibold">Ingresos mensuales</h3>
          <p className="text-sm text-muted-foreground">Últimos 6 meses</p>
        </div>
      </div>

      {loading ? (
        <div className="h-52 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={data} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#6366f1" stopOpacity={0.25} />
                <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `${v}€`}
            />
            <Tooltip
              contentStyle={{
                background: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "12px",
                fontSize: "13px",
              }}
              formatter={(value: number) => [formatPrice(value), "Ingresos"]}
            />
            <Area
              type="monotone"
              dataKey="revenue"
              stroke="#6366f1"
              strokeWidth={2}
              fill="url(#revenueGrad)"
              dot={false}
              activeDot={{ r: 4, fill: "#6366f1" }}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

function generateMockData() {
  const months = ["Ago", "Sep", "Oct", "Nov", "Dic", "Ene"];
  return months.map((month, i) => ({
    month,
    revenue: Math.floor(800 + Math.random() * 3000 + i * 200),
    bookings: Math.floor(3 + Math.random() * 12),
  }));
}
