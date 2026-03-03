import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { type Transaction, usePortfolio } from "@/context/PortfolioContext";
import { cn } from "@/lib/utils";
import { formatDate, formatINR } from "@/utils/format";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  Download,
  Receipt,
  Trash2,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

const TYPE_LABELS: Record<Transaction["assetType"], string> = {
  mutualfund: "Mutual Fund",
  stock: "Stock",
  etf: "ETF",
  debt: "Debt",
};

const TYPE_COLORS: Record<Transaction["assetType"], string> = {
  mutualfund: "bg-chart-1/20 text-chart-1",
  stock: "bg-chart-2/20 text-chart-2",
  etf: "bg-chart-3/20 text-chart-3",
  debt: "bg-chart-4/20 text-chart-4",
};

export default function Transactions() {
  const { transactions, deleteTransaction } = usePortfolio();
  const [filterType, setFilterType] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const filtered = useMemo(() => {
    return transactions
      .filter((t) => {
        if (filterType !== "all" && t.assetType !== filterType) return false;
        if (dateFrom && t.date < dateFrom) return false;
        if (dateTo && t.date > dateTo) return false;
        return true;
      })
      .sort((a, b) => (a.date < b.date ? 1 : -1));
  }, [transactions, filterType, dateFrom, dateTo]);

  function handleDelete(id: string) {
    if (confirm("Delete this transaction record?")) {
      deleteTransaction(id);
      toast.success("Transaction deleted.");
    }
  }

  function exportCSV() {
    const headers = [
      "Date",
      "Asset Type",
      "Asset Name",
      "Type",
      "Quantity",
      "Price",
      "Value",
      "Notes",
    ];
    const rows = filtered.map((t) => [
      t.date,
      TYPE_LABELS[t.assetType],
      `"${t.assetName}"`,
      t.transactionType,
      t.quantity,
      t.price,
      t.quantity * t.price,
      `"${t.notes}"`,
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `transactions_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${filtered.length} transactions.`);
  }

  const totalBuyValue = filtered
    .filter((t) => t.transactionType === "buy")
    .reduce((s, t) => s + t.quantity * t.price, 0);

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-display font-bold">Transactions</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {filtered.length} records · Total invested:{" "}
            {formatINR(totalBuyValue)}
          </p>
        </div>
        <Button
          data-ocid="transactions.export.button"
          variant="outline"
          size="sm"
          onClick={exportCSV}
          className="border-border gap-2"
        >
          <Download className="w-3.5 h-3.5" />
          Export CSV
        </Button>
      </div>

      {/* Filters */}
      <Card className="bg-card border-border">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-1.5 min-w-[160px]">
              <Label className="text-xs">Asset Type</Label>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger
                  data-ocid="transactions.filter.select"
                  className="bg-background border-border h-8 text-sm"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="mutualfund">Mutual Fund</SelectItem>
                  <SelectItem value="stock">Stock</SelectItem>
                  <SelectItem value="etf">ETF</SelectItem>
                  <SelectItem value="debt">Debt</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">From</Label>
              <Input
                data-ocid="transactions.date_from.input"
                type="date"
                className="bg-background border-border h-8 text-sm w-36"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">To</Label>
              <Input
                data-ocid="transactions.date_to.input"
                type="date"
                className="bg-background border-border h-8 text-sm w-36"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>

            {(filterType !== "all" || dateFrom || dateTo) && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-muted-foreground hover:text-foreground"
                onClick={() => {
                  setFilterType("all");
                  setDateFrom("");
                  setDateTo("");
                }}
              >
                Clear filters
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="bg-card border-border shadow-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">
            Transaction History
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div
              data-ocid="transactions.empty_state"
              className="py-16 flex flex-col items-center gap-3 text-muted-foreground"
            >
              <Receipt className="w-10 h-10 opacity-30" />
              <p className="text-sm">No transactions match your filters.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-border">
                  <tr>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Date
                    </th>
                    <th className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Asset
                    </th>
                    <th className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Type
                    </th>
                    <th className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Txn
                    </th>
                    <th className="px-3 py-2.5 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Qty
                    </th>
                    <th className="px-3 py-2.5 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Price
                    </th>
                    <th className="px-3 py-2.5 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Value
                    </th>
                    <th className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Notes
                    </th>
                    <th className="px-3 py-2.5 text-right pr-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Del
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((tx, i) => {
                    const idx = i + 1;
                    return (
                      <tr
                        key={tx.id}
                        data-ocid={`transactions.item.${idx}`}
                        className="border-b border-border/50 hover:bg-accent/30 transition-colors"
                      >
                        <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                          {formatDate(tx.date)}
                        </td>
                        <td className="px-3 py-3 max-w-[180px]">
                          <p className="text-foreground font-medium truncate">
                            {tx.assetName}
                          </p>
                        </td>
                        <td className="px-3 py-3">
                          <span
                            className={cn(
                              "text-xs font-semibold px-2 py-0.5 rounded-full",
                              TYPE_COLORS[tx.assetType],
                            )}
                          >
                            {TYPE_LABELS[tx.assetType]}
                          </span>
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-1.5">
                            {tx.transactionType === "buy" ? (
                              <ArrowUpCircle className="w-3.5 h-3.5 text-gain" />
                            ) : (
                              <ArrowDownCircle className="w-3.5 h-3.5 text-loss" />
                            )}
                            <span
                              className={cn(
                                "text-xs font-semibold capitalize",
                                tx.transactionType === "buy"
                                  ? "text-gain"
                                  : "text-loss",
                              )}
                            >
                              {tx.transactionType}
                            </span>
                          </div>
                        </td>
                        <td className="px-3 py-3 text-right number-tabular text-muted-foreground">
                          {tx.quantity % 1 === 0
                            ? tx.quantity
                            : tx.quantity.toFixed(3)}
                        </td>
                        <td className="px-3 py-3 text-right number-tabular text-muted-foreground">
                          {formatINR(tx.price)}
                        </td>
                        <td className="px-3 py-3 text-right number-tabular font-semibold">
                          {formatINR(tx.quantity * tx.price)}
                        </td>
                        <td className="px-3 py-3 text-muted-foreground text-xs max-w-[120px] truncate">
                          {tx.notes || "—"}
                        </td>
                        <td className="px-3 py-3 pr-4">
                          <Button
                            data-ocid={`transactions.delete_button.${idx}`}
                            variant="ghost"
                            size="icon"
                            className="w-7 h-7 hover:bg-loss/20 hover:text-loss"
                            onClick={() => handleDelete(tx.id)}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {filtered.length > 0 && (
        <p className="text-xs text-muted-foreground text-center">
          Showing {filtered.length} of {transactions.length} transactions
        </p>
      )}
    </div>
  );
}
