import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface http_header {
    value: string;
    name: string;
}
export interface http_request_result {
    status: bigint;
    body: Uint8Array;
    headers: Array<http_header>;
}
export interface SgbHolding {
    id: string;
    maturityDate: string;
    purchaseDate: string;
    name: string;
    lastUpdated: bigint;
    currentPricePerGram: number;
    units: number;
    issuePricePerGram: number;
    symbol: string;
}
export interface TransformationOutput {
    status: bigint;
    body: Uint8Array;
    headers: Array<http_header>;
}
export interface StockHolding {
    id: string;
    currentPrice: number;
    lastUpdated: bigint;
    buyDate: string;
    buyPrice: number;
    companyName: string;
    quantity: number;
    assetType: string;
    exchange: string;
    symbol: string;
}
export interface NpsHolding {
    id: string;
    purchaseDate: string;
    tier: string;
    lastUpdated: bigint;
    purchaseNAV: number;
    schemeName: string;
    units: number;
    pfmId: string;
    currentNAV: number;
}
export interface TransformationInput {
    context: Uint8Array;
    response: http_request_result;
}
export interface MutualFundHolding {
    id: string;
    purchaseDate: string;
    lastUpdated: bigint;
    purchaseNAV: number;
    schemeCode: string;
    schemeName: string;
    units: number;
    currentNAV: number;
}
export interface DebtHolding {
    id: string;
    principal: number;
    maturityDate: string;
    name: string;
    lastUpdated: bigint;
    currentValue: number;
    interestRate: number;
    debtType: string;
    startDate: string;
}
export interface UserProfile {
    name: string;
}
export interface Transaction {
    id: string;
    transactionType: string;
    date: string;
    notes: string;
    quantity: number;
    assetName: string;
    assetType: string;
    price: number;
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface backendInterface {
    addDebt(holding: DebtHolding): Promise<void>;
    addMutualFund(holding: MutualFundHolding): Promise<void>;
    addNps(holding: NpsHolding): Promise<void>;
    addSgb(holding: SgbHolding): Promise<void>;
    addStock(holding: StockHolding): Promise<void>;
    addTransaction(transaction: Transaction): Promise<void>;
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    deleteDebt(id: string): Promise<boolean>;
    deleteMutualFund(id: string): Promise<boolean>;
    deleteNps(id: string): Promise<boolean>;
    deleteSgb(id: string): Promise<boolean>;
    deleteStock(id: string): Promise<boolean>;
    deleteTransaction(id: string): Promise<boolean>;
    fetchMFData(schemeCode: string): Promise<string>;
    fetchNPSNav(pfmId: string): Promise<string>;
    fetchStockPrice(symbol: string): Promise<string>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getDebtHoldings(): Promise<Array<DebtHolding>>;
    getMutualFunds(): Promise<Array<MutualFundHolding>>;
    getNpsHoldings(): Promise<Array<NpsHolding>>;
    getSgbHoldings(): Promise<Array<SgbHolding>>;
    getStocks(): Promise<Array<StockHolding>>;
    getTransactions(): Promise<Array<Transaction>>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    isCallerAdmin(): Promise<boolean>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    searchMutualFunds(q: string): Promise<string>;
    transform(input: TransformationInput): Promise<TransformationOutput>;
    updateDebt(id: string, holding: DebtHolding): Promise<boolean>;
    updateMutualFund(id: string, holding: MutualFundHolding): Promise<boolean>;
    updateNps(id: string, holding: NpsHolding): Promise<boolean>;
    updateSgb(id: string, holding: SgbHolding): Promise<boolean>;
    updateStock(id: string, holding: StockHolding): Promise<boolean>;
}
