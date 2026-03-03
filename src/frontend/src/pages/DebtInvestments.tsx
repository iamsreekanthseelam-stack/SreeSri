import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { type DebtHolding, usePortfolio } from "@/context/PortfolioContext";
import { cn } from "@/lib/utils";
import {
  calcCompoundInterest,
  calcSimpleInterest,
  daysBetween,
  formatDate,
  formatINR,
  formatPercent,
  freqToTimesPerYear,
  gainLossClass,
  todayStr,
  yearsBetween,
} from "@/utils/format";
import { Landmark, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

// ─── Debt Calculations ────────────────────────────────────────────────────

function calcDebtCurrentValue(holding: DebtHolding): number {
  const today = todayStr();
  const years = yearsBetween(holding.startDate, today);

  switch (holding.debtType) {
    case "fd": {
      const freq = freqToTimesPerYear(
        String(holding.metadata.compoundingFrequency || "quarterly"),
      );
      return calcCompoundInterest(
        holding.principal,
        holding.interestRate,
        years,
        freq,
      );
    }
    case "ppf":
    case "epf": {
      return calcSimpleInterest(holding.currentValue, holding.interestRate, 0);
      // Use stored currentValue as base (user-maintained)
    }
    default:
      return calcSimpleInterest(holding.principal, holding.interestRate, years);
  }
}

function calcMaturityValue(holding: DebtHolding): number {
  const years = yearsBetween(holding.startDate, holding.maturityDate);

  switch (holding.debtType) {
    case "fd": {
      const freq = freqToTimesPerYear(
        String(holding.metadata.compoundingFrequency || "quarterly"),
      );
      return calcCompoundInterest(
        holding.principal,
        holding.interestRate,
        years,
        freq,
      );
    }
    default:
      return calcSimpleInterest(holding.principal, holding.interestRate, years);
  }
}

// ─── Debt Modal ───────────────────────────────────────────────────────────

type DebtType = DebtHolding["debtType"];

interface DebtFormData {
  debtType: DebtType;
  name: string;
  principal: string;
  interestRate: string;
  startDate: string;
  maturityDate: string;
  currentValue: string;
  // type-specific
  yearlyContribution: string;
  compoundingFrequency: string;
  bankName: string;
  units: string;
  issuePrice: string;
}

function emptyForm(debtType: DebtType): DebtFormData {
  const defaults: Record<DebtType, Partial<DebtFormData>> = {
    epf: {
      interestRate: "8.25",
      maturityDate: "2045-04-01",
      yearlyContribution: "120000",
    },
    ppf: {
      interestRate: "7.1",
      maturityDate: "2034-04-01",
      yearlyContribution: "50000",
    },
    fd: {
      interestRate: "7.5",
      compoundingFrequency: "quarterly",
      bankName: "",
    },
    other: { interestRate: "8" },
  };
  return {
    debtType,
    name: "",
    principal: "",
    interestRate: defaults[debtType]?.interestRate ?? "8",
    startDate: todayStr(),
    maturityDate: defaults[debtType]?.maturityDate ?? "",
    currentValue: "",
    yearlyContribution: defaults[debtType]?.yearlyContribution ?? "",
    compoundingFrequency:
      defaults[debtType]?.compoundingFrequency ?? "quarterly",
    bankName: defaults[debtType]?.bankName ?? "",
    units: defaults[debtType]?.units ?? "1",
    issuePrice: "",
  };
}

interface DebtModalProps {
  open: boolean;
  onClose: () => void;
  defaultType: DebtType;
  editData?: DebtHolding | null;
}

function DebtModal({ open, onClose, defaultType, editData }: DebtModalProps) {
  const { addDebt, updateDebt, addTransaction } = usePortfolio();
  const [form, setForm] = useState<DebtFormData>(() => emptyForm(defaultType));

  const [lastOpen, setLastOpen] = useState(false);
  if (open !== lastOpen) {
    setLastOpen(open);
    if (open) {
      if (editData) {
        setForm({
          debtType: editData.debtType,
          name: editData.name,
          principal: String(editData.principal),
          interestRate: String(editData.interestRate),
          startDate: editData.startDate,
          maturityDate: editData.maturityDate,
          currentValue: String(editData.currentValue),
          yearlyContribution: String(
            editData.metadata.yearlyContribution ?? "",
          ),
          compoundingFrequency: String(
            editData.metadata.compoundingFrequency ?? "quarterly",
          ),
          bankName: String(editData.metadata.bankName ?? ""),
          units: String(editData.metadata.units ?? "1"),
          issuePrice: String(editData.metadata.issuePrice ?? ""),
        });
      } else {
        setForm(emptyForm(defaultType));
      }
    }
  }

  function setField(f: keyof DebtFormData, v: string) {
    setForm((prev) => ({ ...prev, [f]: v }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const principal = Number.parseFloat(form.principal);
    const interestRate = Number.parseFloat(form.interestRate);
    const currentValue = form.currentValue
      ? Number.parseFloat(form.currentValue)
      : principal;

    if (!form.name || Number.isNaN(principal) || Number.isNaN(interestRate)) {
      toast.error("Please fill all required fields.");
      return;
    }

    const metadata: Record<string, string | number | boolean> = {};
    if (form.yearlyContribution)
      metadata.yearlyContribution = Number.parseFloat(form.yearlyContribution);
    if (form.compoundingFrequency)
      metadata.compoundingFrequency = form.compoundingFrequency;
    if (form.bankName) metadata.bankName = form.bankName;
    if (form.units) metadata.units = Number.parseFloat(form.units);
    if (form.issuePrice)
      metadata.issuePrice = Number.parseFloat(form.issuePrice);

    if (editData) {
      updateDebt(editData.id, {
        name: form.name,
        principal,
        interestRate,
        startDate: form.startDate,
        maturityDate: form.maturityDate,
        currentValue,
        metadata,
      });
      toast.success("Debt investment updated.");
    } else {
      addDebt({
        debtType: form.debtType,
        name: form.name,
        principal,
        interestRate,
        startDate: form.startDate,
        maturityDate: form.maturityDate,
        currentValue,
        metadata,
      });
      addTransaction({
        assetType: "debt",
        assetName: form.name,
        transactionType: "buy",
        quantity: 1,
        price: principal,
        date: form.startDate,
        notes: `${form.debtType.toUpperCase()} investment`,
      });
      toast.success("Debt investment added.");
    }
    onClose();
  }

  const t = form.debtType;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        className="bg-card border-border text-foreground sm:max-w-lg"
        data-ocid="debt.dialog"
      >
        <DialogHeader>
          <DialogTitle className="font-display text-lg">
            {editData ? "Edit Investment" : `Add ${t.toUpperCase()} Investment`}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {!editData && (
            <div className="space-y-1.5">
              <Label>Investment Type</Label>
              <Select
                value={form.debtType}
                onValueChange={(v) => setForm(emptyForm(v as DebtType))}
              >
                <SelectTrigger className="bg-background border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  {(["epf", "ppf", "fd", "other"] as DebtType[]).map((dt) => (
                    <SelectItem key={dt} value={dt}>
                      {dt.toUpperCase()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="d-name">Name / Description</Label>
            <Input
              id="d-name"
              placeholder={
                t === "fd"
                  ? "SBI Fixed Deposit"
                  : t === "epf"
                    ? "Employee Provident Fund"
                    : "Investment Name"
              }
              className="bg-background border-border"
              value={form.name}
              onChange={(e) => setField("name", e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="d-principal">
                {t === "epf" || t === "ppf"
                  ? "Opening Balance (₹)"
                  : "Principal (₹)"}
              </Label>
              <Input
                id="d-principal"
                type="number"
                step="100"
                min="0"
                placeholder="100000"
                className="bg-background border-border"
                value={form.principal}
                onChange={(e) => setField("principal", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="d-rate">Interest Rate (%)</Label>
              <Input
                id="d-rate"
                type="number"
                step="0.1"
                min="0"
                max="30"
                placeholder="7.5"
                className="bg-background border-border"
                value={form.interestRate}
                onChange={(e) => setField("interestRate", e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="d-start">Start Date</Label>
              <Input
                id="d-start"
                type="date"
                className="bg-background border-border"
                value={form.startDate}
                max={todayStr()}
                onChange={(e) => setField("startDate", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="d-maturity">Maturity Date</Label>
              <Input
                id="d-maturity"
                type="date"
                className="bg-background border-border"
                value={form.maturityDate}
                onChange={(e) => setField("maturityDate", e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="d-current">Current Value (₹)</Label>
            <Input
              id="d-current"
              type="number"
              step="100"
              min="0"
              placeholder="Leave blank to use principal"
              className="bg-background border-border"
              value={form.currentValue}
              onChange={(e) => setField("currentValue", e.target.value)}
            />
          </div>

          {/* Type-specific fields */}
          {(t === "epf" || t === "ppf") && (
            <div className="space-y-1.5">
              <Label htmlFor="d-yearly">Yearly Contribution (₹)</Label>
              <Input
                id="d-yearly"
                type="number"
                step="1000"
                min="0"
                className="bg-background border-border"
                value={form.yearlyContribution}
                onChange={(e) => setField("yearlyContribution", e.target.value)}
              />
            </div>
          )}

          {t === "fd" && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Compounding Frequency</Label>
                <Select
                  value={form.compoundingFrequency}
                  onValueChange={(v) => setField("compoundingFrequency", v)}
                >
                  <SelectTrigger className="bg-background border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border">
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="quarterly">Quarterly</SelectItem>
                    <SelectItem value="halfyearly">Half-yearly</SelectItem>
                    <SelectItem value="annually">Annually</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="d-bank">Bank Name</Label>
                <Input
                  id="d-bank"
                  placeholder="SBI"
                  className="bg-background border-border"
                  value={form.bankName}
                  onChange={(e) => setField("bankName", e.target.value)}
                />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              data-ocid="debt.cancel_button"
              className="border-border"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              data-ocid="debt.add.submit_button"
              className="bg-primary text-primary-foreground"
            >
              {editData ? "Save Changes" : "Add Investment"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Debt Table ───────────────────────────────────────────────────────────

interface DebtTableProps {
  holdings: DebtHolding[];
  onEdit: (h: DebtHolding) => void;
  onDelete: (id: string, name: string) => void;
}

function DebtTable({ holdings, onEdit, onDelete }: DebtTableProps) {
  if (holdings.length === 0) {
    return (
      <div
        data-ocid="debt.empty_state"
        className="py-12 flex flex-col items-center gap-3 text-muted-foreground"
      >
        <Landmark className="w-10 h-10 opacity-30" />
        <p className="text-sm">No holdings in this category.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="border-b border-border">
          <tr>
            <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Name
            </th>
            <th className="px-3 py-2.5 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Principal
            </th>
            <th className="px-3 py-2.5 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Rate
            </th>
            <th className="px-3 py-2.5 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Current Value
            </th>
            <th className="px-3 py-2.5 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Maturity Value
            </th>
            <th className="px-3 py-2.5 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Interest Earned
            </th>
            <th className="px-3 py-2.5 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Days to Maturity
            </th>
            <th className="px-3 py-2.5 text-right pr-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {holdings.map((d, i) => {
            const current = calcDebtCurrentValue(d);
            const maturity = calcMaturityValue(d);
            const interest = current - d.principal;
            const daysToMaturity = d.maturityDate
              ? daysBetween(todayStr(), d.maturityDate)
              : null;
            const idx = i + 1;

            return (
              <tr
                key={d.id}
                data-ocid={`debt.item.${idx}`}
                className="border-b border-border/50 hover:bg-accent/30 transition-colors"
              >
                <td className="px-4 py-3">
                  <p className="font-medium text-foreground">{d.name}</p>
                  <p className="text-xs text-muted-foreground">
                    Started: {formatDate(d.startDate)}
                    {d.maturityDate &&
                      ` · Matures: ${formatDate(d.maturityDate)}`}
                  </p>
                </td>
                <td className="px-3 py-3 text-right number-tabular text-muted-foreground">
                  {formatINR(d.principal)}
                </td>
                <td className="px-3 py-3 text-right number-tabular font-medium text-primary">
                  {d.interestRate}%
                </td>
                <td className="px-3 py-3 text-right number-tabular font-semibold">
                  {formatINR(current)}
                </td>
                <td className="px-3 py-3 text-right number-tabular font-semibold text-primary">
                  {formatINR(maturity)}
                </td>
                <td
                  className={cn(
                    "px-3 py-3 text-right number-tabular font-semibold",
                    gainLossClass(interest),
                  )}
                >
                  {formatINR(interest)}
                  <span className="text-xs ml-1 text-muted-foreground">
                    (
                    {formatPercent(
                      d.principal > 0 ? (interest / d.principal) * 100 : 0,
                    )}
                    )
                  </span>
                </td>
                <td className="px-3 py-3 text-right number-tabular">
                  {daysToMaturity !== null ? (
                    <span
                      className={cn(
                        "text-sm font-medium",
                        daysToMaturity < 0
                          ? "text-loss"
                          : daysToMaturity < 180
                            ? "text-primary"
                            : "text-muted-foreground",
                      )}
                    >
                      {daysToMaturity < 0 ? "Matured" : `${daysToMaturity}d`}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
                <td className="px-3 py-3 pr-4">
                  <div className="flex items-center justify-end gap-1.5">
                    <Button
                      data-ocid={`debt.edit_button.${idx}`}
                      variant="ghost"
                      size="icon"
                      className="w-7 h-7 hover:bg-accent"
                      onClick={() => onEdit(d)}
                    >
                      <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                    </Button>
                    <Button
                      data-ocid={`debt.delete_button.${idx}`}
                      variant="ghost"
                      size="icon"
                      className="w-7 h-7 hover:bg-loss/20 hover:text-loss"
                      onClick={() => onDelete(d.id, d.name)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── Debt Page ────────────────────────────────────────────────────────────

type DebtTab = "epf" | "ppf" | "fd" | "other";

const DEBT_TABS: { id: DebtTab; label: string; ocid: string }[] = [
  { id: "epf", label: "EPF", ocid: "debt.epf.tab" },
  { id: "ppf", label: "PPF", ocid: "debt.ppf.tab" },
  { id: "fd", label: "FD", ocid: "debt.fd.tab" },
  { id: "other", label: "Other", ocid: "debt.other.tab" },
];

export default function DebtInvestments() {
  const { debtHoldings, deleteDebt, totals } = usePortfolio();
  const [activeTab, setActiveTab] = useState<DebtTab>("epf");
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<DebtHolding | null>(null);

  const totalGain = totals.debtValue - totals.debtInvested;
  const totalGainPct =
    totals.debtInvested > 0 ? (totalGain / totals.debtInvested) * 100 : 0;

  const filtered = debtHoldings.filter((d) => d.debtType === activeTab);

  function handleDelete(id: string, name: string) {
    if (confirm(`Remove "${name}" from portfolio?`)) {
      deleteDebt(id);
      toast.success("Investment removed.");
    }
  }

  function handleEdit(h: DebtHolding) {
    setEditTarget(h);
    // Only set active tab for types shown in this page (sgb is now separate)
    if (
      h.debtType === "epf" ||
      h.debtType === "ppf" ||
      h.debtType === "fd" ||
      h.debtType === "other"
    ) {
      setActiveTab(h.debtType);
    }
    setModalOpen(true);
  }

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-display font-bold">Debt Investments</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {debtHoldings.length} holdings · {formatINR(totals.debtValue)} ·{" "}
            <span className={gainLossClass(totalGain)}>
              {formatINR(totalGain)} ({formatPercent(totalGainPct)})
            </span>
          </p>
        </div>
        <Button
          data-ocid="debt.add.open_modal_button"
          onClick={() => {
            setEditTarget(null);
            setModalOpen(true);
          }}
          className="bg-primary text-primary-foreground gap-2"
          size="sm"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Investment
        </Button>
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Total Invested", value: formatINR(totals.debtInvested) },
          { label: "Current Value", value: formatINR(totals.debtValue) },
          {
            label: "Interest Earned",
            value: formatINR(totalGain),
            cls: gainLossClass(totalGain),
          },
        ].map((s) => (
          <Card key={s.label} className="bg-card border-border">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p
                className={cn(
                  "text-lg font-display font-bold number-tabular mt-0.5",
                  s.cls,
                )}
              >
                {s.value}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1.5 bg-secondary/50 p-1.5 rounded-lg w-fit">
        {DEBT_TABS.map((tab) => {
          const count = debtHoldings.filter(
            (d) => d.debtType === tab.id,
          ).length;
          return (
            <button
              key={tab.id}
              data-ocid={tab.ocid}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "px-3 py-1.5 rounded-md text-sm font-medium transition-all",
                activeTab === tab.id
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent",
              )}
            >
              {tab.label}
              {count > 0 && (
                <span
                  className={cn(
                    "ml-1.5 text-xs px-1.5 py-0.5 rounded-full",
                    activeTab === tab.id
                      ? "bg-primary-foreground/20 text-primary-foreground"
                      : "bg-border text-muted-foreground",
                  )}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Table */}
      <Card className="bg-card border-border shadow-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">
            {activeTab.toUpperCase()} Holdings
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <DebtTable
            holdings={filtered}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        </CardContent>
      </Card>

      <DebtModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditTarget(null);
        }}
        defaultType={activeTab}
        editData={editTarget}
      />
    </div>
  );
}
