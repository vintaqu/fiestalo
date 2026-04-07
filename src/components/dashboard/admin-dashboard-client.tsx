"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from "recharts";
import {
  Euro, CalendarDays, Users, Building2, TrendingUp, TrendingDown,
  Star, AlertTriangle, Loader2, RefreshCw, Filter, X,
  ArrowUpRight, Award, MapPin,
} from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

// ── Types ─────────────────────────────────────────────────────────
interface FilterOptions {
  owners:     { id: string; name: string | null; email: string }[];
  categories: { id: string; name: string; icon: string | null }[];
  cities:     string[];
}

interface Analytics {
  period:  { start: string; end: string; preset: string };
  kpis:    Record<string, { value: number; change?: number | null }>;
  charts:  {
    monthly:      any[];
    statusDist:   { status: string; count: number }[];
    cityDist:     { city: string; count: number }[];
    categoryDist: { name: string; icon: string; count: number }[];
  };
  tables: {
    topVenues:      any[];
    topOwners:      any[];
    recentBookings: any[];
  };
}

const PRESETS = [
  { key: "this_month", label: "Este mes" },
  { key: "last_month", label: "Mes anterior" },
  { key: "last_3",     label: "Últimos 3 meses" },
  { key: "last_6",     label: "Últimos 6 meses" },
  { key: "last_12",    label: "Últimos 12 meses" },
  { key: "this_year",  label: "Este año" },
];

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  PENDING:            { label: "Pendiente",        color: "bg-amber-100 text-amber-700" },
  AWAITING_PAYMENT:   { label: "Pago pendiente",   color: "bg-blue-100 text-blue-700" },
  CONFIRMED:          { label: "Confirmada",        color: "bg-emerald-100 text-emerald-700" },
  COMPLETED:          { label: "Completada",        color: "bg-green-100 text-green-700" },
  CANCELLED_BY_USER:  { label: "Cancelada cliente", color: "bg-red-100 text-red-700" },
  CANCELLED_BY_OWNER: { label: "Cancelada owner",   color: "bg-orange-100 text-orange-700" },
  DISPUTED:           { label: "Disputada",         color: "bg-purple-100 text-purple-700" },
};

const CHART_COLORS = ["#6366f1", "#06b6d4", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

// ── Helpers ───────────────────────────────────────────────────────
const fmt = (n: number) =>
  new Intl.NumberFormat("es-ES", { maximumFractionDigits: 2 }).format(n);
const fmtCur = (n: number) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(n);
const fmtPct = (n: number | null | undefined) =>
  n == null ? null : `${n > 0 ? "+" : ""}${n}%`;

// ── AdminDashboardClient ──────────────────────────────────────────
export function AdminDashboardClient({ filterOptions }: { filterOptions: FilterOptions }) {
  const router      = useRouter();
  const searchParams = useSearchParams();

  // Filters state
  const [preset,     setPreset]     = useState(searchParams.get("preset")     ?? "this_month");
  const [ownerId,    setOwnerId]    = useState(searchParams.get("ownerId")    ?? "");
  const [city,       setCity]       = useState(searchParams.get("city")       ?? "");
  const [categoryId, setCategoryId] = useState(searchParams.get("categoryId") ?? "");
  const [showFilters, setShowFilters] = useState(false);

  // Data state
  const [data,    setData]    = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeChart, setActiveChart] = useState<"revenue" | "bookings" | "users">("revenue");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ preset });
      if (ownerId)    params.set("ownerId",    ownerId);
      if (city)       params.set("city",       city);
      if (categoryId) params.set("categoryId", categoryId);
      const res = await fetch(`/api/admin/analytics?${params}`);
      setData(await res.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [preset, ownerId, city, categoryId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const activeFilters = [ownerId, city, categoryId].filter(Boolean).length;

  const kpis = data?.kpis;

  // ── Render ──────────────────────────────────────────────────────
  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Panel de administración</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {data?.period
              ? `${new Date(data.period.start).toLocaleDateString("es-ES", { day: "numeric", month: "long" })} — ${new Date(data.period.end).toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" })}`
              : "Cargando..."}
          </p>
        </div>

        {/* Alerts */}
        <div className="flex items-center gap-2 flex-wrap">
          {kpis?.pendingVenues?.value > 0 && (
            <Link href="/admin/venues?status=PENDING_REVIEW">
              <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-700 px-3 py-1.5 rounded-xl text-xs font-medium hover:bg-amber-100 transition-colors cursor-pointer">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                {kpis.pendingVenues.value} espacios pendientes
              </div>
            </Link>
          )}
          {kpis?.pendingReviews?.value > 0 && (
            <Link href="/admin/reviews?status=pending">
              <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 text-blue-700 px-3 py-1.5 rounded-xl text-xs font-medium hover:bg-blue-100 transition-colors cursor-pointer">
                <Star className="w-3 h-3" />
                {kpis.pendingReviews.value} reseñas por moderar
              </div>
            </Link>
          )}
        </div>
      </div>

      {/* Filter toolbar */}
      <div className="bg-card border border-border rounded-2xl p-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Preset selector */}
          <div className="flex flex-wrap gap-1.5">
            {PRESETS.map((p) => (
              <button
                key={p.key}
                onClick={() => setPreset(p.key)}
                className={cn(
                  "text-xs px-3 py-1.5 rounded-lg font-medium transition-all",
                  preset === p.key
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-muted-foreground hover:text-foreground"
                )}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="h-5 w-px bg-border hidden sm:block" />

          {/* Advanced filters toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              "flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium transition-all border",
              showFilters || activeFilters > 0
                ? "bg-primary/10 border-primary/30 text-primary"
                : "border-border text-muted-foreground hover:text-foreground"
            )}
          >
            <Filter className="w-3.5 h-3.5" />
            Filtros avanzados
            {activeFilters > 0 && (
              <span className="bg-primary text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                {activeFilters}
              </span>
            )}
          </button>

          {activeFilters > 0 && (
            <button
              onClick={() => { setOwnerId(""); setCity(""); setCategoryId(""); }}
              className="text-xs text-muted-foreground hover:text-destructive flex items-center gap-1 transition-colors"
            >
              <X className="w-3 h-3" />Limpiar filtros
            </button>
          )}

          <button onClick={fetchData} className="ml-auto text-muted-foreground hover:text-foreground transition-colors">
            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
          </button>
        </div>

        {/* Advanced filter row */}
        {showFilters && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4 pt-4 border-t border-border">
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">Propietario</label>
              <select
                value={ownerId}
                onChange={(e) => setOwnerId(e.target.value)}
                className="w-full h-9 px-3 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="">Todos los propietarios</option>
                {filterOptions.owners.map((o) => (
                  <option key={o.id} value={o.id}>{o.name ?? o.email}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">Ciudad</label>
              <select
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full h-9 px-3 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="">Todas las ciudades</option>
                {filterOptions.cities.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">Categoría</label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full h-9 px-3 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="">Todas las categorías</option>
                {filterOptions.categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* KPI grid — 8 cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {loading ? (
          Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-card border border-border rounded-2xl p-5 h-28 animate-pulse">
              <div className="h-3 bg-secondary rounded w-2/3 mb-3" />
              <div className="h-7 bg-secondary rounded w-1/2" />
            </div>
          ))
        ) : kpis && [
          { key: "gmv",          label: "Volumen (GMV)",         icon: Euro,         fmt: fmtCur, highlight: true },
          { key: "commission",   label: "Comisiones",            icon: TrendingUp,   fmt: fmtCur, highlight: false },
          { key: "bookings",     label: "Reservas",              icon: CalendarDays, fmt: fmt,    highlight: false },
          { key: "avgTicket",    label: "Ticket medio",          icon: ArrowUpRight, fmt: fmtCur, highlight: false },
          { key: "newUsers",     label: "Nuevos usuarios",       icon: Users,        fmt: fmt,    highlight: false },
          { key: "totalUsers",   label: "Usuarios totales",      icon: Users,        fmt: fmt,    highlight: false },
          { key: "activeVenues", label: "Espacios activos",      icon: Building2,    fmt: fmt,    highlight: false },
          { key: "cancelRate",   label: "Tasa cancelación",      icon: AlertTriangle,fmt: (v: number) => `${v}%`, highlight: false, inverse: true },
        ].map(({ key, label, icon: Icon, fmt: fmtFn, highlight, inverse }) => {
          const kpi    = kpis[key];
          const change = kpi?.change;
          const isPos  = inverse ? (change ?? 0) < 0 : (change ?? 0) > 0;
          return (
            <div key={key} className={cn(
              "bg-card border border-border rounded-2xl p-5 relative overflow-hidden",
              highlight && "border-primary/30 bg-primary/5"
            )}>
              <div className="flex items-start justify-between mb-3">
                <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center",
                  highlight ? "bg-primary text-white" : "bg-secondary text-muted-foreground"
                )}>
                  <Icon className="w-4 h-4" />
                </div>
                {change != null && (
                  <span className={cn(
                    "text-xs font-semibold flex items-center gap-0.5",
                    isPos ? "text-emerald-600" : "text-red-500"
                  )}>
                    {isPos ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    {Math.abs(change)}%
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mb-1">{label}</p>
              <p className={cn("text-2xl font-bold tabular-nums", highlight && "text-primary")}>
                {fmtFn(kpi?.value ?? 0)}
              </p>
            </div>
          );
        })}
      </div>

      {/* Main chart */}
      <div className="bg-card border border-border rounded-2xl p-5">
        <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
          <div>
            <h3 className="font-semibold">Evolución mensual</h3>
            <p className="text-sm text-muted-foreground">Últimos 12 meses</p>
          </div>
          <div className="flex gap-1.5">
            {(["revenue", "bookings", "users"] as const).map((c) => (
              <button
                key={c}
                onClick={() => setActiveChart(c)}
                className={cn(
                  "text-xs px-3 py-1.5 rounded-lg font-medium transition-all",
                  activeChart === c ? "bg-primary text-white" : "bg-secondary text-muted-foreground hover:text-foreground"
                )}
              >
                {c === "revenue" ? "Ingresos" : c === "bookings" ? "Reservas" : "Usuarios"}
              </button>
            ))}
          </div>
        </div>
        {loading ? (
          <div className="h-64 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            {activeChart === "revenue" ? (
              <AreaChart data={data?.charts.monthly} margin={{ top: 5, right: 5, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6366f1" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="g2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}€`} />
                <Tooltip
                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "12px", fontSize: "12px" }}
                  formatter={(v: number, name: string) => [fmtCur(v), name === "revenue" ? "GMV" : "Comisiones"]}
                />
                <Legend formatter={(v) => v === "revenue" ? "GMV" : "Comisiones"} />
                <Area type="monotone" dataKey="revenue"    stroke="#6366f1" strokeWidth={2} fill="url(#g1)" dot={false} activeDot={{ r: 4 }} />
                <Area type="monotone" dataKey="commission" stroke="#10b981" strokeWidth={2} fill="url(#g2)" dot={false} activeDot={{ r: 4 }} />
              </AreaChart>
            ) : activeChart === "bookings" ? (
              <BarChart data={data?.charts.monthly} margin={{ top: 5, right: 5, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "12px", fontSize: "12px" }}
                />
                <Legend />
                <Bar dataKey="bookings"  name="Reservas"    fill="#6366f1" radius={[4,4,0,0]} />
                <Bar dataKey="cancelled" name="Canceladas"  fill="#f87171" radius={[4,4,0,0]} />
              </BarChart>
            ) : (
              <AreaChart data={data?.charts.monthly} margin={{ top: 5, right: 5, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="g3" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#06b6d4" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#06b6d4" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "12px", fontSize: "12px" }}
                  formatter={(v: number) => [v, "Nuevos usuarios"]}
                />
                <Area type="monotone" dataKey="newUsers" name="Nuevos usuarios" stroke="#06b6d4" strokeWidth={2} fill="url(#g3)" dot={false} activeDot={{ r: 4 }} />
              </AreaChart>
            )}
          </ResponsiveContainer>
        )}
      </div>

      {/* Second row: distributions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Status distribution */}
        <div className="bg-card border border-border rounded-2xl p-5">
          <h3 className="font-semibold mb-4">Estado de reservas</h3>
          {loading ? (
            <div className="h-40 flex items-center justify-center"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
          ) : (
            <div className="space-y-2.5">
              {data?.charts.statusDist.map((s, i) => {
                const total = data.charts.statusDist.reduce((a, b) => a + b.count, 0);
                const pct   = total > 0 ? Math.round((s.count / total) * 100) : 0;
                const info  = STATUS_LABELS[s.status] ?? { label: s.status, color: "bg-gray-100 text-gray-600" };
                return (
                  <div key={s.status} className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                    <span className="text-xs text-muted-foreground flex-1 truncate">{info.label}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-1.5 bg-secondary rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: CHART_COLORS[i % CHART_COLORS.length] }} />
                      </div>
                      <span className="text-xs font-medium tabular-nums w-8 text-right">{s.count}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* City distribution */}
        <div className="bg-card border border-border rounded-2xl p-5">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-muted-foreground" />
            Espacios por ciudad
          </h3>
          {loading ? (
            <div className="h-40 flex items-center justify-center"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
          ) : (
            <div className="space-y-2.5">
              {data?.charts.cityDist.map((c, i) => {
                const total = data.charts.cityDist.reduce((a, b) => a + b.count, 0);
                const pct   = total > 0 ? Math.round((c.count / total) * 100) : 0;
                return (
                  <div key={c.city} className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground flex-1 truncate">{c.city}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-1.5 bg-secondary rounded-full overflow-hidden">
                        <div className="h-full rounded-full bg-primary/70" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-xs font-medium tabular-nums w-8 text-right">{c.count}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Category distribution */}
        <div className="bg-card border border-border rounded-2xl p-5">
          <h3 className="font-semibold mb-4">Por categoría</h3>
          {loading ? (
            <div className="h-40 flex items-center justify-center"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
          ) : (
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie
                  data={data?.charts.categoryDist}
                  dataKey="count"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={70}
                  innerRadius={40}
                  paddingAngle={3}
                >
                  {data?.charts.categoryDist.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "12px", fontSize: "12px" }}
                />
                <Legend iconType="circle" iconSize={8} formatter={(v) => <span className="text-xs">{v}</span>} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Top tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Top Venues */}
        <div className="bg-card border border-border rounded-2xl p-5">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Award className="w-4 h-4 text-amber-500" />
            Top espacios por ingresos
          </h3>
          {loading ? (
            <div className="h-40 flex items-center justify-center"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
          ) : (data?.tables.topVenues.length ?? 0) === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Sin datos en este período</p>
          ) : (
            <div className="space-y-0 divide-y divide-border">
              {data?.tables.topVenues.map((v, i) => (
                <div key={v.venueId} className="flex items-center gap-3 py-2.5">
                  <span className="text-xs font-bold text-muted-foreground w-5">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{v.title}</p>
                    <p className="text-xs text-muted-foreground">{v.city} · {v.ownerName} · {v.bookings} reservas</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold">{fmtCur(v.revenue)}</p>
                    <p className="text-xs text-muted-foreground">{fmtCur(v.commission)} comisión</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top Owners */}
        <div className="bg-card border border-border rounded-2xl p-5">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" />
            Top propietarios
          </h3>
          {loading ? (
            <div className="h-40 flex items-center justify-center"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
          ) : (data?.tables.topOwners.length ?? 0) === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Sin datos en este período</p>
          ) : (
            <div className="space-y-0 divide-y divide-border">
              {data?.tables.topOwners.map((o, i) => (
                <div key={o.ownerId} className="flex items-center gap-3 py-2.5">
                  <span className="text-xs font-bold text-muted-foreground w-5">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{o.name || "Anónimo"}</p>
                    <p className="text-xs text-muted-foreground">{o.bookings} reservas</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold">{fmtCur(o.revenue)}</p>
                    <p className="text-xs text-muted-foreground">{fmtCur(o.commission)} comisión</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent bookings */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h3 className="font-semibold">Actividad reciente</h3>
          <Link href="/admin/bookings" className="text-xs text-primary hover:underline">Ver todas →</Link>
        </div>
        {loading ? (
          <div className="h-32 flex items-center justify-center"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-secondary/40 text-xs text-muted-foreground">
                <tr>
                  <th className="text-left px-5 py-2.5 font-medium">Cliente</th>
                  <th className="text-left px-4 py-2.5 font-medium">Espacio</th>
                  <th className="text-left px-4 py-2.5 font-medium">Fecha</th>
                  <th className="text-left px-4 py-2.5 font-medium">Horario</th>
                  <th className="text-right px-4 py-2.5 font-medium">Total</th>
                  <th className="text-right px-5 py-2.5 font-medium">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {data?.tables.recentBookings.map((b: any) => {
                  const statusInfo = STATUS_LABELS[b.status] ?? { label: b.status, color: "bg-gray-100 text-gray-600" };
                  return (
                    <tr key={b.id} className="hover:bg-secondary/20 transition-colors">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary shrink-0">
                            {b.tenant?.name?.charAt(0)?.toUpperCase() ?? "?"}
                          </div>
                          <div>
                            <p className="font-medium truncate max-w-[120px]">{b.tenant?.name}</p>
                            <p className="text-xs text-muted-foreground truncate max-w-[120px]">{b.tenant?.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground max-w-[140px]">
                        <p className="truncate">{b.venue?.title}</p>
                        <p className="text-xs truncate">{b.venue?.city}</p>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                        {new Date(b.date).toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "2-digit" })}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                        {b.startTime}–{b.endTime}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold tabular-nums whitespace-nowrap">
                        {fmtCur(Number(b.total))}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <span className={cn("text-xs font-medium px-2 py-1 rounded-full", statusInfo.color)}>
                          {statusInfo.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
