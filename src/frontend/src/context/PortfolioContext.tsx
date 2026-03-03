import type { backendInterface } from "@/backend";
import {
  fetchMFNAV,
  fetchNPSNav,
  fetchSGBPrice,
  fetchStockPrice,
} from "@/utils/priceService";
import {
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";

// ─── Types ─────────────────────────────────────────────────────────────────

export interface MutualFundHolding {
  id: string;
  schemeCode: string;
  schemeName: string;
  units: number;
  purchaseNAV: number;
  purchaseDate: string;
  currentNAV: number;
  lastUpdated: number;
}

export interface StockHolding {
  id: string;
  symbol: string;
  exchange: string;
  companyName: string;
  quantity: number;
  buyPrice: number;
  buyDate: string;
  currentPrice: number;
  assetType: "stock" | "etf";
  lastUpdated: number;
}

export interface DebtHolding {
  id: string;
  debtType: "epf" | "ppf" | "fd" | "other";
  name: string;
  principal: number;
  interestRate: number;
  startDate: string;
  maturityDate: string;
  currentValue: number;
  metadata: Record<string, string | number | boolean>;
  lastUpdated: number;
}

export interface NpsHolding {
  id: string;
  pfmId: string; // scheme code used with npsnav.in/api
  schemeName: string;
  tier: "I" | "II";
  units: number;
  purchaseNAV: number;
  purchaseDate: string;
  currentNAV: number;
  lastUpdated: number;
}

export interface SgbHolding {
  id: string;
  symbol: string; // e.g. "SGBMAR29" - used to fetch live price
  name: string; // e.g. "SGB Jan 2029"
  units: number; // grams
  issuePricePerGram: number;
  purchaseDate: string;
  maturityDate: string;
  currentPricePerGram: number;
  lastUpdated: number;
}

export interface Transaction {
  id: string;
  assetType: "mutualfund" | "stock" | "etf" | "debt";
  assetName: string;
  transactionType: "buy" | "sell";
  quantity: number;
  price: number;
  date: string;
  notes: string;
}

// ─── Computed Totals ───────────────────────────────────────────────────────

export interface PortfolioTotals {
  mfValue: number;
  mfInvested: number;
  stockValue: number;
  stockInvested: number;
  etfValue: number;
  etfInvested: number;
  debtValue: number;
  debtInvested: number;
  npsValue: number;
  npsInvested: number;
  sgbValue: number;
  sgbInvested: number;
  totalValue: number;
  totalInvested: number;
  totalGain: number;
  totalGainPercent: number;
}

// ─── Context Interface ─────────────────────────────────────────────────────

interface PortfolioContextValue {
  mutualFunds: MutualFundHolding[];
  stocks: StockHolding[];
  debtHoldings: DebtHolding[];
  npsHoldings: NpsHolding[];
  sgbHoldings: SgbHolding[];
  transactions: Transaction[];
  totals: PortfolioTotals;
  isRefreshingMF: boolean;
  isRefreshingStocks: boolean;
  isRefreshingNPS: boolean;
  isRefreshingSGB: boolean;
  lastRefreshed: number | null;
  isLoadingData: boolean;

  addMutualFund: (
    holding: Omit<MutualFundHolding, "id" | "lastUpdated">,
  ) => Promise<void>;
  updateMutualFund: (
    id: string,
    updates: Partial<MutualFundHolding>,
  ) => Promise<void>;
  deleteMutualFund: (id: string) => Promise<void>;

  addStock: (
    holding: Omit<StockHolding, "id" | "lastUpdated">,
  ) => Promise<void>;
  updateStock: (id: string, updates: Partial<StockHolding>) => Promise<void>;
  deleteStock: (id: string) => Promise<void>;

  addDebt: (holding: Omit<DebtHolding, "id" | "lastUpdated">) => Promise<void>;
  updateDebt: (id: string, updates: Partial<DebtHolding>) => Promise<void>;
  deleteDebt: (id: string) => Promise<void>;

  addNps: (holding: Omit<NpsHolding, "id" | "lastUpdated">) => Promise<void>;
  updateNps: (id: string, updates: Partial<NpsHolding>) => Promise<void>;
  deleteNps: (id: string) => Promise<void>;

  addSgb: (holding: Omit<SgbHolding, "id" | "lastUpdated">) => Promise<void>;
  updateSgb: (id: string, updates: Partial<SgbHolding>) => Promise<void>;
  deleteSgb: (id: string) => Promise<void>;

  addTransaction: (tx: Omit<Transaction, "id">) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;

  refreshMFPrices: () => Promise<void>;
  refreshStockPrices: () => Promise<void>;
  refreshNPSPrices: () => Promise<void>;
  refreshSGBPrices: () => Promise<void>;

  clearAllData: () => void;
}

// ─── Backend conversion helpers ────────────────────────────────────────────

/** Convert backend MutualFundHolding (bigint lastUpdated) → frontend type */
function fromBackendMF(
  h: import("@/backend.d").MutualFundHolding,
): MutualFundHolding {
  return { ...h, lastUpdated: Number(h.lastUpdated) };
}

function toBackendMF(
  h: MutualFundHolding,
): import("@/backend.d").MutualFundHolding {
  return { ...h, lastUpdated: BigInt(h.lastUpdated) };
}

function fromBackendStock(h: import("@/backend.d").StockHolding): StockHolding {
  return {
    ...h,
    assetType: h.assetType as "stock" | "etf",
    lastUpdated: Number(h.lastUpdated),
  };
}

function toBackendStock(h: StockHolding): import("@/backend.d").StockHolding {
  return { ...h, lastUpdated: BigInt(h.lastUpdated) };
}

/** Backend DebtHolding has no metadata field - we store metadata as JSON in the `name` field via a separator, or just ignore it.
 * Since the backend type omits metadata, we map: frontend DebtHolding ↔ backend DebtHolding
 * metadata is kept in frontend state only (not persisted to backend).
 * For backward compatibility, metadata is stored as a JSON suffix in the `name` field.
 */
function fromBackendDebt(h: import("@/backend.d").DebtHolding): DebtHolding {
  // Try to extract metadata from name if it contains a JSON suffix
  let name = h.name;
  let metadata: Record<string, string | number | boolean> = {};
  const sep = "|||";
  const sepIdx = h.name.lastIndexOf(sep);
  if (sepIdx !== -1) {
    try {
      metadata = JSON.parse(h.name.slice(sepIdx + sep.length)) as Record<
        string,
        string | number | boolean
      >;
      name = h.name.slice(0, sepIdx);
    } catch {
      // ignore parse errors
    }
  }
  return {
    ...h,
    name,
    debtType: h.debtType as "epf" | "ppf" | "fd" | "other",
    metadata,
    lastUpdated: Number(h.lastUpdated),
  };
}

function toBackendDebt(h: DebtHolding): import("@/backend.d").DebtHolding {
  const sep = "|||";
  const metaStr = Object.keys(h.metadata).length
    ? sep + JSON.stringify(h.metadata)
    : "";
  return {
    id: h.id,
    debtType: h.debtType,
    name: h.name + metaStr,
    principal: h.principal,
    interestRate: h.interestRate,
    startDate: h.startDate,
    maturityDate: h.maturityDate,
    currentValue: h.currentValue,
    lastUpdated: BigInt(h.lastUpdated),
  };
}

function fromBackendNps(h: import("@/backend.d").NpsHolding): NpsHolding {
  return {
    ...h,
    tier: h.tier as "I" | "II",
    lastUpdated: Number(h.lastUpdated),
  };
}

function toBackendNps(h: NpsHolding): import("@/backend.d").NpsHolding {
  return { ...h, lastUpdated: BigInt(h.lastUpdated) };
}

function fromBackendSgb(h: import("@/backend.d").SgbHolding): SgbHolding {
  return { ...h, lastUpdated: Number(h.lastUpdated) };
}

function toBackendSgb(h: SgbHolding): import("@/backend.d").SgbHolding {
  return { ...h, lastUpdated: BigInt(h.lastUpdated) };
}

function fromBackendTx(t: import("@/backend.d").Transaction): Transaction {
  return {
    ...t,
    assetType: t.assetType as "mutualfund" | "stock" | "etf" | "debt",
    transactionType: t.transactionType as "buy" | "sell",
  };
}

function toBackendTx(t: Transaction): import("@/backend.d").Transaction {
  return { ...t };
}

// ─── Compute Totals ────────────────────────────────────────────────────────

function computeTotals(
  mfs: MutualFundHolding[],
  stocks: StockHolding[],
  debt: DebtHolding[],
  nps: NpsHolding[],
  sgb: SgbHolding[],
): PortfolioTotals {
  const mfValue = mfs.reduce((s, h) => s + h.units * h.currentNAV, 0);
  const mfInvested = mfs.reduce((s, h) => s + h.units * h.purchaseNAV, 0);

  const allStocks = stocks.filter((s) => s.assetType === "stock");
  const allEtfs = stocks.filter((s) => s.assetType === "etf");

  const stockValue = allStocks.reduce(
    (s, h) => s + h.quantity * h.currentPrice,
    0,
  );
  const stockInvested = allStocks.reduce(
    (s, h) => s + h.quantity * h.buyPrice,
    0,
  );
  const etfValue = allEtfs.reduce((s, h) => s + h.quantity * h.currentPrice, 0);
  const etfInvested = allEtfs.reduce((s, h) => s + h.quantity * h.buyPrice, 0);

  const debtValue = debt.reduce((s, h) => s + h.currentValue, 0);
  const debtInvested = debt.reduce((s, h) => s + h.principal, 0);

  const npsValue = nps.reduce((s, h) => s + h.units * h.currentNAV, 0);
  const npsInvested = nps.reduce((s, h) => s + h.units * h.purchaseNAV, 0);

  const sgbValue = sgb.reduce((s, h) => s + h.units * h.currentPricePerGram, 0);
  const sgbInvested = sgb.reduce(
    (s, h) => s + h.units * h.issuePricePerGram,
    0,
  );

  const totalValue =
    mfValue + stockValue + etfValue + debtValue + npsValue + sgbValue;
  const totalInvested =
    mfInvested +
    stockInvested +
    etfInvested +
    debtInvested +
    npsInvested +
    sgbInvested;
  const totalGain = totalValue - totalInvested;
  const totalGainPercent =
    totalInvested > 0 ? (totalGain / totalInvested) * 100 : 0;

  return {
    mfValue,
    mfInvested,
    stockValue,
    stockInvested,
    etfValue,
    etfInvested,
    debtValue,
    debtInvested,
    npsValue,
    npsInvested,
    sgbValue,
    sgbInvested,
    totalValue,
    totalInvested,
    totalGain,
    totalGainPercent,
  };
}

// ─── Context ───────────────────────────────────────────────────────────────

const PortfolioContext = createContext<PortfolioContextValue | null>(null);

function uid(): string {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

interface PortfolioProviderProps {
  children: ReactNode;
  actor: backendInterface;
}

export function PortfolioProvider({ children, actor }: PortfolioProviderProps) {
  // ── State ──────────────────────────────────────────────────────────────
  const [mutualFunds, setMutualFunds] = useState<MutualFundHolding[]>([]);
  const [stocks, setStocks] = useState<StockHolding[]>([]);
  const [debtHoldings, setDebt] = useState<DebtHolding[]>([]);
  const [npsHoldings, setNps] = useState<NpsHolding[]>([]);
  const [sgbHoldings, setSgb] = useState<SgbHolding[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);

  const [isRefreshingMF, setRefreshingMF] = useState(false);
  const [isRefreshingStocks, setRefreshingStocks] = useState(false);
  const [isRefreshingNPS, setRefreshingNPS] = useState(false);
  const [isRefreshingSGB, setRefreshingSGB] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<number | null>(null);

  // ── Load all data from canister on mount ───────────────────────────────
  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      setIsLoadingData(true);
      try {
        const [mfs, stks, debt, nps, sgb, txs] = await Promise.all([
          actor.getMutualFunds(),
          actor.getStocks(),
          actor.getDebtHoldings(),
          actor.getNpsHoldings(),
          actor.getSgbHoldings(),
          actor.getTransactions(),
        ]);
        if (cancelled) return;
        setMutualFunds(mfs.map(fromBackendMF));
        setStocks(stks.map(fromBackendStock));
        setDebt(debt.map(fromBackendDebt));
        setNps(nps.map(fromBackendNps));
        setSgb(sgb.map(fromBackendSgb));
        setTransactions(txs.map(fromBackendTx));
      } catch (err) {
        if (!cancelled) {
          console.error("Failed to load portfolio data:", err);
          toast.error("Failed to load portfolio data from canister.");
        }
      } finally {
        if (!cancelled) setIsLoadingData(false);
      }
    }

    void loadData();
    return () => {
      cancelled = true;
    };
  }, [actor]);

  // ── Computed totals ────────────────────────────────────────────────────
  const totals = computeTotals(
    mutualFunds,
    stocks,
    debtHoldings,
    npsHoldings,
    sgbHoldings,
  );

  // ── CRUD: Mutual Funds ─────────────────────────────────────────────────
  const addMutualFund = useCallback(
    async (holding: Omit<MutualFundHolding, "id" | "lastUpdated">) => {
      const h: MutualFundHolding = {
        ...holding,
        id: uid(),
        lastUpdated: Date.now(),
      };
      setMutualFunds((prev) => [...prev, h]);
      try {
        await actor.addMutualFund(toBackendMF(h));
      } catch (err) {
        setMutualFunds((prev) => prev.filter((x) => x.id !== h.id));
        toast.error("Failed to save mutual fund. Please try again.");
        throw err;
      }
    },
    [actor],
  );

  const updateMutualFund = useCallback(
    async (id: string, updates: Partial<MutualFundHolding>) => {
      let previous: MutualFundHolding | undefined;
      setMutualFunds((prev) => {
        previous = prev.find((h) => h.id === id);
        return prev.map((h) =>
          h.id === id ? { ...h, ...updates, lastUpdated: Date.now() } : h,
        );
      });
      try {
        const updated = mutualFunds.find((h) => h.id === id);
        if (updated) {
          await actor.updateMutualFund(
            id,
            toBackendMF({ ...updated, ...updates, lastUpdated: Date.now() }),
          );
        }
      } catch (err) {
        if (previous) {
          setMutualFunds((prev) =>
            prev.map((h) => (h.id === id ? previous! : h)),
          );
        }
        toast.error("Failed to update mutual fund. Please try again.");
        throw err;
      }
    },
    [actor, mutualFunds],
  );

  const deleteMutualFund = useCallback(
    async (id: string) => {
      let previous: MutualFundHolding | undefined;
      setMutualFunds((prev) => {
        previous = prev.find((h) => h.id === id);
        return prev.filter((h) => h.id !== id);
      });
      try {
        await actor.deleteMutualFund(id);
      } catch (err) {
        if (previous) {
          setMutualFunds((prev) => [...prev, previous!]);
        }
        toast.error("Failed to delete mutual fund. Please try again.");
        throw err;
      }
    },
    [actor],
  );

  // ── CRUD: Stocks ───────────────────────────────────────────────────────
  const addStock = useCallback(
    async (holding: Omit<StockHolding, "id" | "lastUpdated">) => {
      const h: StockHolding = {
        ...holding,
        id: uid(),
        lastUpdated: Date.now(),
      };
      setStocks((prev) => [...prev, h]);
      try {
        await actor.addStock(toBackendStock(h));
      } catch (err) {
        setStocks((prev) => prev.filter((x) => x.id !== h.id));
        toast.error("Failed to save stock/ETF. Please try again.");
        throw err;
      }
    },
    [actor],
  );

  const updateStock = useCallback(
    async (id: string, updates: Partial<StockHolding>) => {
      let previous: StockHolding | undefined;
      setStocks((prev) => {
        previous = prev.find((h) => h.id === id);
        return prev.map((h) =>
          h.id === id ? { ...h, ...updates, lastUpdated: Date.now() } : h,
        );
      });
      try {
        const updated = stocks.find((h) => h.id === id);
        if (updated) {
          await actor.updateStock(
            id,
            toBackendStock({ ...updated, ...updates, lastUpdated: Date.now() }),
          );
        }
      } catch (err) {
        if (previous) {
          setStocks((prev) => prev.map((h) => (h.id === id ? previous! : h)));
        }
        toast.error("Failed to update stock/ETF. Please try again.");
        throw err;
      }
    },
    [actor, stocks],
  );

  const deleteStock = useCallback(
    async (id: string) => {
      let previous: StockHolding | undefined;
      setStocks((prev) => {
        previous = prev.find((h) => h.id === id);
        return prev.filter((h) => h.id !== id);
      });
      try {
        await actor.deleteStock(id);
      } catch (err) {
        if (previous) {
          setStocks((prev) => [...prev, previous!]);
        }
        toast.error("Failed to delete stock/ETF. Please try again.");
        throw err;
      }
    },
    [actor],
  );

  // ── CRUD: Debt ─────────────────────────────────────────────────────────
  const addDebt = useCallback(
    async (holding: Omit<DebtHolding, "id" | "lastUpdated">) => {
      const h: DebtHolding = { ...holding, id: uid(), lastUpdated: Date.now() };
      setDebt((prev) => [...prev, h]);
      try {
        await actor.addDebt(toBackendDebt(h));
      } catch (err) {
        setDebt((prev) => prev.filter((x) => x.id !== h.id));
        toast.error("Failed to save debt holding. Please try again.");
        throw err;
      }
    },
    [actor],
  );

  const updateDebt = useCallback(
    async (id: string, updates: Partial<DebtHolding>) => {
      let previous: DebtHolding | undefined;
      setDebt((prev) => {
        previous = prev.find((h) => h.id === id);
        return prev.map((h) =>
          h.id === id ? { ...h, ...updates, lastUpdated: Date.now() } : h,
        );
      });
      try {
        const updated = debtHoldings.find((h) => h.id === id);
        if (updated) {
          await actor.updateDebt(
            id,
            toBackendDebt({ ...updated, ...updates, lastUpdated: Date.now() }),
          );
        }
      } catch (err) {
        if (previous) {
          setDebt((prev) => prev.map((h) => (h.id === id ? previous! : h)));
        }
        toast.error("Failed to update debt holding. Please try again.");
        throw err;
      }
    },
    [actor, debtHoldings],
  );

  const deleteDebt = useCallback(
    async (id: string) => {
      let previous: DebtHolding | undefined;
      setDebt((prev) => {
        previous = prev.find((h) => h.id === id);
        return prev.filter((h) => h.id !== id);
      });
      try {
        await actor.deleteDebt(id);
      } catch (err) {
        if (previous) {
          setDebt((prev) => [...prev, previous!]);
        }
        toast.error("Failed to delete debt holding. Please try again.");
        throw err;
      }
    },
    [actor],
  );

  // ── CRUD: NPS ──────────────────────────────────────────────────────────
  const addNps = useCallback(
    async (holding: Omit<NpsHolding, "id" | "lastUpdated">) => {
      const h: NpsHolding = { ...holding, id: uid(), lastUpdated: Date.now() };
      setNps((prev) => [...prev, h]);
      try {
        await actor.addNps(toBackendNps(h));
      } catch (err) {
        setNps((prev) => prev.filter((x) => x.id !== h.id));
        toast.error("Failed to save NPS holding. Please try again.");
        throw err;
      }
    },
    [actor],
  );

  const updateNps = useCallback(
    async (id: string, updates: Partial<NpsHolding>) => {
      let previous: NpsHolding | undefined;
      setNps((prev) => {
        previous = prev.find((h) => h.id === id);
        return prev.map((h) =>
          h.id === id ? { ...h, ...updates, lastUpdated: Date.now() } : h,
        );
      });
      try {
        const updated = npsHoldings.find((h) => h.id === id);
        if (updated) {
          await actor.updateNps(
            id,
            toBackendNps({ ...updated, ...updates, lastUpdated: Date.now() }),
          );
        }
      } catch (err) {
        if (previous) {
          setNps((prev) => prev.map((h) => (h.id === id ? previous! : h)));
        }
        toast.error("Failed to update NPS holding. Please try again.");
        throw err;
      }
    },
    [actor, npsHoldings],
  );

  const deleteNps = useCallback(
    async (id: string) => {
      let previous: NpsHolding | undefined;
      setNps((prev) => {
        previous = prev.find((h) => h.id === id);
        return prev.filter((h) => h.id !== id);
      });
      try {
        await actor.deleteNps(id);
      } catch (err) {
        if (previous) {
          setNps((prev) => [...prev, previous!]);
        }
        toast.error("Failed to delete NPS holding. Please try again.");
        throw err;
      }
    },
    [actor],
  );

  // ── CRUD: SGB ──────────────────────────────────────────────────────────
  const addSgb = useCallback(
    async (holding: Omit<SgbHolding, "id" | "lastUpdated">) => {
      const h: SgbHolding = { ...holding, id: uid(), lastUpdated: Date.now() };
      setSgb((prev) => [...prev, h]);
      try {
        await actor.addSgb(toBackendSgb(h));
      } catch (err) {
        setSgb((prev) => prev.filter((x) => x.id !== h.id));
        toast.error("Failed to save SGB holding. Please try again.");
        throw err;
      }
    },
    [actor],
  );

  const updateSgb = useCallback(
    async (id: string, updates: Partial<SgbHolding>) => {
      let previous: SgbHolding | undefined;
      setSgb((prev) => {
        previous = prev.find((h) => h.id === id);
        return prev.map((h) =>
          h.id === id ? { ...h, ...updates, lastUpdated: Date.now() } : h,
        );
      });
      try {
        const updated = sgbHoldings.find((h) => h.id === id);
        if (updated) {
          await actor.updateSgb(
            id,
            toBackendSgb({ ...updated, ...updates, lastUpdated: Date.now() }),
          );
        }
      } catch (err) {
        if (previous) {
          setSgb((prev) => prev.map((h) => (h.id === id ? previous! : h)));
        }
        toast.error("Failed to update SGB holding. Please try again.");
        throw err;
      }
    },
    [actor, sgbHoldings],
  );

  const deleteSgb = useCallback(
    async (id: string) => {
      let previous: SgbHolding | undefined;
      setSgb((prev) => {
        previous = prev.find((h) => h.id === id);
        return prev.filter((h) => h.id !== id);
      });
      try {
        await actor.deleteSgb(id);
      } catch (err) {
        if (previous) {
          setSgb((prev) => [...prev, previous!]);
        }
        toast.error("Failed to delete SGB holding. Please try again.");
        throw err;
      }
    },
    [actor],
  );

  // ── CRUD: Transactions ─────────────────────────────────────────────────
  const addTransaction = useCallback(
    async (tx: Omit<Transaction, "id">) => {
      const t: Transaction = { ...tx, id: uid() };
      setTransactions((prev) => [t, ...prev]);
      try {
        await actor.addTransaction(toBackendTx(t));
      } catch (err) {
        setTransactions((prev) => prev.filter((x) => x.id !== t.id));
        toast.error("Failed to save transaction. Please try again.");
        throw err;
      }
    },
    [actor],
  );

  const deleteTransaction = useCallback(
    async (id: string) => {
      let previous: Transaction | undefined;
      setTransactions((prev) => {
        previous = prev.find((t) => t.id === id);
        return prev.filter((t) => t.id !== id);
      });
      try {
        await actor.deleteTransaction(id);
      } catch (err) {
        if (previous) {
          setTransactions((prev) => [...prev, previous!]);
        }
        toast.error("Failed to delete transaction. Please try again.");
        throw err;
      }
    },
    [actor],
  );

  // ── Price Refresh ──────────────────────────────────────────────────────
  const mfRef = useRef(mutualFunds);
  const stocksRef = useRef(stocks);
  const npsRef = useRef(npsHoldings);
  const sgbRef = useRef(sgbHoldings);

  useEffect(() => {
    mfRef.current = mutualFunds;
  }, [mutualFunds]);

  useEffect(() => {
    stocksRef.current = stocks;
  }, [stocks]);

  useEffect(() => {
    npsRef.current = npsHoldings;
  }, [npsHoldings]);

  useEffect(() => {
    sgbRef.current = sgbHoldings;
  }, [sgbHoldings]);

  const refreshMFPrices = useCallback(async () => {
    setRefreshingMF(true);
    try {
      const updated = await Promise.all(
        mfRef.current.map(async (mf) => {
          const nav = await fetchMFNAV(mf.schemeCode);
          return nav !== null
            ? { ...mf, currentNAV: nav, lastUpdated: Date.now() }
            : mf;
        }),
      );
      setMutualFunds(updated);
      // Persist updated prices to canister
      await Promise.all(
        updated
          .filter((u, i) => u.currentNAV !== mfRef.current[i]?.currentNAV)
          .map((u) =>
            actor.updateMutualFund(u.id, toBackendMF(u)).catch(() => {}),
          ),
      );
    } finally {
      setRefreshingMF(false);
      setLastRefreshed(Date.now());
    }
  }, [actor]);

  const refreshStockPrices = useCallback(async () => {
    setRefreshingStocks(true);
    try {
      const updated = await Promise.all(
        stocksRef.current.map(async (s) => {
          const price = await fetchStockPrice(s.symbol);
          return price !== null
            ? { ...s, currentPrice: price, lastUpdated: Date.now() }
            : s;
        }),
      );
      setStocks(updated);
      // Persist updated prices to canister
      await Promise.all(
        updated
          .filter(
            (u, i) => u.currentPrice !== stocksRef.current[i]?.currentPrice,
          )
          .map((u) =>
            actor.updateStock(u.id, toBackendStock(u)).catch(() => {}),
          ),
      );
    } finally {
      setRefreshingStocks(false);
      setLastRefreshed(Date.now());
    }
  }, [actor]);

  const refreshNPSPrices = useCallback(async () => {
    setRefreshingNPS(true);
    try {
      const current = npsRef.current;
      if (current.length === 0) return;

      // Deduplicate: fetch NAV once per unique pfmId to avoid parallel
      // duplicate HTTP outcalls (ICP consensus issues) and rate limiting.
      const uniquePfmIds = [...new Set(current.map((h) => h.pfmId))];
      const navMap = new Map<string, number | null>();

      // Fetch sequentially to avoid hammering npsnav.in
      for (const pfmId of uniquePfmIds) {
        const nav = await fetchNPSNav(pfmId, actor);
        navMap.set(pfmId, nav);
      }

      const now = Date.now();
      const updated = current.map((h) => {
        const nav = navMap.get(h.pfmId);
        return nav !== null && nav !== undefined
          ? { ...h, currentNAV: nav, lastUpdated: now }
          : h;
      });

      setNps(updated);

      // Persist updated prices to canister
      const changedIds = new Set<string>();
      for (let i = 0; i < updated.length; i++) {
        if (updated[i].currentNAV !== current[i]?.currentNAV) {
          changedIds.add(updated[i].id);
        }
      }
      await Promise.all(
        updated
          .filter((u) => changedIds.has(u.id))
          .map((u) => actor.updateNps(u.id, toBackendNps(u)).catch(() => {})),
      );

      // User feedback
      const successCount = [...navMap.values()].filter(
        (v) => v !== null,
      ).length;
      if (successCount === 0) {
        toast.error(
          "Could not fetch NPS NAVs. Check your PFM codes or try again.",
        );
      } else if (successCount < uniquePfmIds.length) {
        toast.warning(
          `Updated ${successCount}/${uniquePfmIds.length} NPS NAVs. Some PFM codes may be invalid.`,
        );
      } else {
        toast.success("NPS NAVs updated successfully.");
      }
    } finally {
      setRefreshingNPS(false);
      setLastRefreshed(Date.now());
    }
  }, [actor]);

  const refreshSGBPrices = useCallback(async () => {
    setRefreshingSGB(true);
    try {
      const updated = await Promise.all(
        sgbRef.current.map(async (h) => {
          const price = await fetchSGBPrice(h.symbol);
          return price !== null
            ? { ...h, currentPricePerGram: price, lastUpdated: Date.now() }
            : h;
        }),
      );
      setSgb(updated);
      // Persist updated prices to canister
      await Promise.all(
        updated
          .filter(
            (u, i) =>
              u.currentPricePerGram !== sgbRef.current[i]?.currentPricePerGram,
          )
          .map((u) => actor.updateSgb(u.id, toBackendSgb(u)).catch(() => {})),
      );
    } finally {
      setRefreshingSGB(false);
      setLastRefreshed(Date.now());
    }
  }, [actor]);

  // ── Auto-refresh on mount and every 5 minutes ──────────────────────────
  const didMount = useRef(false);
  useEffect(() => {
    if (isLoadingData) return; // Wait for data to load before refreshing
    if (didMount.current) return;
    didMount.current = true;

    void refreshMFPrices();
    void refreshStockPrices();
    void refreshNPSPrices();
    void refreshSGBPrices();

    const intervalId = setInterval(
      () => {
        void refreshMFPrices();
        void refreshStockPrices();
        void refreshNPSPrices();
        void refreshSGBPrices();
      },
      5 * 60 * 1000,
    );
    return () => clearInterval(intervalId);
  }, [
    isLoadingData,
    refreshMFPrices,
    refreshStockPrices,
    refreshNPSPrices,
    refreshSGBPrices,
  ]);

  // ── Clear all local state (called on logout) ───────────────────────────
  const clearAllData = useCallback(() => {
    setMutualFunds([]);
    setStocks([]);
    setDebt([]);
    setNps([]);
    setSgb([]);
    setTransactions([]);
    didMount.current = false;
  }, []);

  return (
    <PortfolioContext.Provider
      value={{
        mutualFunds,
        stocks,
        debtHoldings,
        npsHoldings,
        sgbHoldings,
        transactions,
        totals,
        isRefreshingMF,
        isRefreshingStocks,
        isRefreshingNPS,
        isRefreshingSGB,
        lastRefreshed,
        isLoadingData,
        addMutualFund,
        updateMutualFund,
        deleteMutualFund,
        addStock,
        updateStock,
        deleteStock,
        addDebt,
        updateDebt,
        deleteDebt,
        addNps,
        updateNps,
        deleteNps,
        addSgb,
        updateSgb,
        deleteSgb,
        addTransaction,
        deleteTransaction,
        refreshMFPrices,
        refreshStockPrices,
        refreshNPSPrices,
        refreshSGBPrices,
        clearAllData,
      }}
    >
      {children}
    </PortfolioContext.Provider>
  );
}

export function usePortfolio(): PortfolioContextValue {
  const ctx = useContext(PortfolioContext);
  if (!ctx)
    throw new Error("usePortfolio must be used within PortfolioProvider");
  return ctx;
}
