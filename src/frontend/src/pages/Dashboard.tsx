import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { usePortfolio } from "@/context/PortfolioContext";
import { cn } from "@/lib/utils";
import {
  formatINR,
  formatINRWithSign,
  formatPercent,
  gainLossClass,
} from "@/utils/format";
import {
  Clock,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const CHART_COLORS = [
  "oklch(0.76 0.15 80)", // amber – MF
  "oklch(0.62 0.18 162)", // teal – Stocks
  "oklch(0.55 0.20 264)", // blue – ETFs
  "oklch(0.70 0.18 30)", // orange – Debt
  "oklch(0.65 0.20 310)", // purple – NPS
  "oklch(0.72 0.18 50)", // gold – SGB
];

// ─── Portfolio Value Trend ────────────────────────────────────────────────

function usePortfolioTrend() {
  const { mutualFunds, stocks, debtHoldings } = usePortfolio();

  return useMemo(() => {
    // Find earliest purchase date
    const allDates: string[] = [
      ...mutualFunds.map((m) => m.purchaseDate),
      ...stocks.map((s) => s.buyDate),
      ...debtHoldings.map((d) => d.startDate),
    ];
    if (allDates.length === 0) return [];

    const earliest = allDates.reduce((a, b) => (a < b ? a : b));
    const start = new Date(earliest);
    const end = new Date();

    // Generate monthly data points
    const points: { month: string; value: number; invested: number }[] = [];
    const cur = new Date(start.getFullYear(), start.getMonth(), 1);

    while (cur <= end) {
      const dateStr = cur.toISOString().split("T")[0];
      const label = cur.toLocaleDateString("en-IN", {
        month: "short",
        year: "2-digit",
      });

      // For each holding, interpolate value at this point
      let val = 0;
      let inv = 0;

      for (const mf of mutualFunds) {
        if (mf.purchaseDate <= dateStr) {
          const progress = Math.min(
            1,
            (cur.getTime() - new Date(mf.purchaseDate).getTime()) /
              (end.getTime() - new Date(mf.purchaseDate).getTime() || 1),
          );
          const navInterp =
            mf.purchaseNAV + (mf.currentNAV - mf.purchaseNAV) * progress;
          val += mf.units * navInterp;
          inv += mf.units * mf.purchaseNAV;
        }
      }
      for (const s of stocks) {
        if (s.buyDate <= dateStr) {
          const progress = Math.min(
            1,
            (cur.getTime() - new Date(s.buyDate).getTime()) /
              (end.getTime() - new Date(s.buyDate).getTime() || 1),
          );
          const priceInterp =
            s.buyPrice + (s.currentPrice - s.buyPrice) * progress;
          val += s.quantity * priceInterp;
          inv += s.quantity * s.buyPrice;
        }
      }
      for (const d of debtHoldings) {
        if (d.startDate <= dateStr) {
          const progress = Math.min(
            1,
            (cur.getTime() - new Date(d.startDate).getTime()) /
              (end.getTime() - new Date(d.startDate).getTime() || 1),
          );
          val += d.principal + (d.currentValue - d.principal) * progress;
          inv += d.principal;
        }
      }

      points.push({
        month: label,
        value: Math.round(val),
        invested: Math.round(inv),
      });
      cur.setMonth(cur.getMonth() + 1);
    }

    // Limit to last 24 points
    return points.slice(-24);
  }, [mutualFunds, stocks, debtHoldings]);
}

// ─── Stat Card ────────────────────────────────────────────────────────────

interface StatCardProps {
  label: string;
  value: string;
  subValue?: string;
  subClass?: string;
  icon?: React.ElementType;
  iconColor?: string;
  loading?: boolean;
}

function StatCard({
  label,
  value,
  subValue,
  subClass,
  icon: Icon,
  iconColor,
  loading,
}: StatCardProps) {
  if (loading) {
    return (
      <Card className="bg-card border-border">
        <CardContent className="p-5">
          <Skeleton className="h-4 w-24 mb-3" />
          <Skeleton className="h-8 w-36" />
        </CardContent>
      </Card>
    );
  }
  return (
    <Card className="bg-card border-border shadow-card">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <p className="text-sm text-muted-foreground font-medium">{label}</p>
          {Icon && (
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: `${iconColor}22` }}
            >
              <Icon className="w-4 h-4" style={{ color: iconColor }} />
            </div>
          )}
        </div>
        <p className="mt-2 text-2xl font-display font-bold number-tabular">
          {value}
        </p>
        {subValue && (
          <p
            className={cn("text-sm mt-1 font-medium number-tabular", subClass)}
          >
            {subValue}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Category Card ────────────────────────────────────────────────────────

interface CategoryCardProps {
  label: string;
  value: number;
  invested: number;
  color: string;
  pct: number;
}

function CategoryCard({
  label,
  value,
  invested,
  color,
  pct,
}: CategoryCardProps) {
  const gain = value - invested;
  const gainPct = invested > 0 ? (gain / invested) * 100 : 0;

  return (
    <Card className="bg-card border-border shadow-card overflow-hidden">
      <div className="h-1" style={{ backgroundColor: color }} />
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-semibold text-foreground">{label}</p>
          <span
            className="text-xs font-bold px-2 py-0.5 rounded-full"
            style={{ backgroundColor: `${color}20`, color }}
          >
            {pct.toFixed(1)}%
          </span>
        </div>
        <p className="text-xl font-display font-bold number-tabular">
          {formatINR(value)}
        </p>
        <p
          className={cn(
            "text-xs mt-1 number-tabular font-medium",
            gainLossClass(gain),
          )}
        >
          {formatINRWithSign(gain)} ({formatPercent(gainPct)})
        </p>
      </CardContent>
    </Card>
  );
}

// ─── Custom Tooltip ───────────────────────────────────────────────────────

function CustomAreaTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number; name: string; color: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-popover border border-border rounded-lg p-3 shadow-card">
      <p className="text-xs text-muted-foreground mb-2">{label}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2 text-sm">
          <span
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: p.color }}
          />
          <span className="text-muted-foreground capitalize">{p.name}:</span>
          <span className="font-semibold number-tabular">
            {formatINR(p.value)}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────

export default function Dashboard() {
  const {
    totals,
    isRefreshingMF,
    isRefreshingStocks,
    lastRefreshed,
    refreshMFPrices,
    refreshStockPrices,
  } = usePortfolio();

  const [refreshing, setRefreshing] = useState(false);

  const isRefreshing = isRefreshingMF || isRefreshingStocks || refreshing;

  const trendData = usePortfolioTrend();

  const pieData = useMemo(
    () =>
      [
        { name: "Mutual Funds", value: totals.mfValue },
        { name: "Stocks", value: totals.stockValue },
        { name: "ETFs", value: totals.etfValue },
        { name: "Debt", value: totals.debtValue },
        { name: "NPS", value: totals.npsValue },
        { name: "SGB", value: totals.sgbValue },
      ].filter((d) => d.value > 0),
    [totals],
  );

  async function handleRefresh() {
    setRefreshing(true);
    try {
      await Promise.all([refreshMFPrices(), refreshStockPrices()]);
    } finally {
      setRefreshing(false);
    }
  }

  const categories: CategoryCardProps[] = [
    {
      label: "Mutual Funds",
      value: totals.mfValue,
      invested: totals.mfInvested,
      color: CHART_COLORS[0],
      pct:
        totals.totalValue > 0 ? (totals.mfValue / totals.totalValue) * 100 : 0,
    },
    {
      label: "Stocks",
      value: totals.stockValue,
      invested: totals.stockInvested,
      color: CHART_COLORS[1],
      pct:
        totals.totalValue > 0
          ? (totals.stockValue / totals.totalValue) * 100
          : 0,
    },
    {
      label: "ETFs",
      value: totals.etfValue,
      invested: totals.etfInvested,
      color: CHART_COLORS[2],
      pct:
        totals.totalValue > 0 ? (totals.etfValue / totals.totalValue) * 100 : 0,
    },
    {
      label: "Debt",
      value: totals.debtValue,
      invested: totals.debtInvested,
      color: CHART_COLORS[3],
      pct:
        totals.totalValue > 0
          ? (totals.debtValue / totals.totalValue) * 100
          : 0,
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">
            Portfolio Overview
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <Clock className="w-3.5 h-3.5 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              {lastRefreshed
                ? `Updated ${new Date(lastRefreshed).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}`
                : "Fetching latest prices…"}
            </p>
          </div>
        </div>
        <Button
          data-ocid="dashboard.refresh.button"
          onClick={handleRefresh}
          disabled={isRefreshing}
          variant="outline"
          size="sm"
          className="border-border text-foreground hover:bg-accent gap-2"
        >
          <RefreshCw
            className={cn("w-3.5 h-3.5", isRefreshing && "animate-spin")}
          />
          {isRefreshing ? "Refreshing…" : "Refresh"}
        </Button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Portfolio Value"
          value={formatINR(totals.totalValue)}
          subValue={`${formatINRWithSign(totals.totalGain)} (${formatPercent(totals.totalGainPercent)})`}
          subClass={gainLossClass(totals.totalGain)}
          icon={Wallet}
          iconColor="oklch(0.76 0.15 80)"
        />
        <StatCard
          label="Total Invested"
          value={formatINR(totals.totalInvested)}
          subValue="Cost basis"
          subClass="text-muted-foreground"
          icon={Wallet}
          iconColor="oklch(0.55 0.20 264)"
        />
        <StatCard
          label="Total Gain / Loss"
          value={formatINR(Math.abs(totals.totalGain))}
          subValue={formatPercent(totals.totalGainPercent)}
          subClass={gainLossClass(totals.totalGain)}
          icon={totals.totalGain >= 0 ? TrendingUp : TrendingDown}
          iconColor={
            totals.totalGain >= 0
              ? "oklch(0.65 0.18 142)"
              : "oklch(0.62 0.22 25)"
          }
        />
        <StatCard
          label="Return on Investment"
          value={formatPercent(totals.totalGainPercent)}
          subValue={totals.totalGain >= 0 ? "In profit" : "At loss"}
          subClass={gainLossClass(totals.totalGain)}
          icon={totals.totalGain >= 0 ? TrendingUp : TrendingDown}
          iconColor={
            totals.totalGain >= 0
              ? "oklch(0.65 0.18 142)"
              : "oklch(0.62 0.22 25)"
          }
        />
      </div>

      {/* Category Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {categories.map((c) => (
          <CategoryCard key={c.label} {...c} />
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Portfolio Trend Chart */}
        <Card className="lg:col-span-2 bg-card border-border shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">
              Portfolio Value Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart
                data={trendData}
                margin={{ top: 5, right: 5, bottom: 0, left: 0 }}
              >
                <defs>
                  <linearGradient id="gradValue" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="5%"
                      stopColor="oklch(0.76 0.15 80)"
                      stopOpacity={0.25}
                    />
                    <stop
                      offset="95%"
                      stopColor="oklch(0.76 0.15 80)"
                      stopOpacity={0}
                    />
                  </linearGradient>
                  <linearGradient id="gradInvested" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="5%"
                      stopColor="oklch(0.55 0.20 264)"
                      stopOpacity={0.15}
                    />
                    <stop
                      offset="95%"
                      stopColor="oklch(0.55 0.20 264)"
                      stopOpacity={0}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="oklch(0.28 0.025 255)"
                />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 10, fill: "oklch(0.55 0.015 255)" }}
                  tickLine={false}
                  axisLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tickFormatter={(v: number) => formatINR(v)}
                  tick={{ fontSize: 10, fill: "oklch(0.55 0.015 255)" }}
                  tickLine={false}
                  axisLine={false}
                  width={65}
                />
                <Tooltip content={<CustomAreaTooltip />} />
                <Legend
                  wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
                  formatter={(v) => (
                    <span style={{ color: "oklch(0.85 0.01 255)" }}>{v}</span>
                  )}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  name="Current Value"
                  stroke="oklch(0.76 0.15 80)"
                  strokeWidth={2}
                  fill="url(#gradValue)"
                  dot={false}
                />
                <Area
                  type="monotone"
                  dataKey="invested"
                  name="Invested"
                  stroke="oklch(0.55 0.20 264)"
                  strokeWidth={1.5}
                  fill="url(#gradInvested)"
                  dot={false}
                  strokeDasharray="4 2"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Asset Allocation Donut */}
        <Card className="bg-card border-border shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">
              Asset Allocation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell
                      key={entry.name}
                      fill={CHART_COLORS[index % CHART_COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(v: number, name: string) => [formatINR(v), name]}
                  contentStyle={{
                    background: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: "8px",
                    fontSize: 12,
                    color: "var(--foreground)",
                  }}
                  labelStyle={{ display: "none" }}
                  itemStyle={{ color: "var(--foreground)" }}
                />
              </PieChart>
            </ResponsiveContainer>
            {/* Legend */}
            <div className="space-y-2 mt-2">
              {pieData.map((d, i) => (
                <div
                  key={d.name}
                  className="flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
                      style={{
                        backgroundColor: CHART_COLORS[i % CHART_COLORS.length],
                      }}
                    />
                    <span className="text-muted-foreground">{d.name}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-semibold number-tabular">
                      {formatINR(d.value)}
                    </span>
                    <span className="text-muted-foreground ml-1.5">
                      {totals.totalValue > 0
                        ? `${((d.value / totals.totalValue) * 100).toFixed(1)}%`
                        : "0%"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
