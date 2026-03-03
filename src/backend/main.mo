import Map "mo:core/Map";
import Outcall "http-outcalls/outcall";
import List "mo:core/List";
import Runtime "mo:core/Runtime";
import Principal "mo:core/Principal";
import Text "mo:core/Text";
import AccessControl "authorization/access-control";
import MixinAuthorization "authorization/MixinAuthorization";

// Support full text search with authorization
actor {
  // Initialize the access control system
  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);

  // User Profile type
  public type UserProfile = {
    name : Text;
  };

  let userProfiles = Map.empty<Principal, UserProfile>();

  // User Profile Management
  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can access profiles");
    };
    userProfiles.get(caller);
  };

  public query ({ caller }) func getUserProfile(user : Principal) : async ?UserProfile {
    if (caller != user and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Can only view your own profile");
    };
    userProfiles.get(user);
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can save profiles");
    };
    userProfiles.add(caller, profile);
  };

  // Portfolio Data Types
  public type MutualFundHolding = {
    id : Text;
    schemeCode : Text;
    schemeName : Text;
    units : Float;
    purchaseNAV : Float;
    purchaseDate : Text;
    currentNAV : Float;
    lastUpdated : Int;
  };

  public type StockHolding = {
    id : Text;
    symbol : Text;
    exchange : Text;
    companyName : Text;
    quantity : Float;
    buyPrice : Float;
    buyDate : Text;
    currentPrice : Float;
    assetType : Text; // "stock" or "etf"
    lastUpdated : Int;
  };

  public type DebtHolding = {
    id : Text;
    debtType : Text; // "epf"/"ppf"/"fd"/"other"
    name : Text;
    principal : Float;
    interestRate : Float;
    startDate : Text;
    maturityDate : Text;
    currentValue : Float;
    lastUpdated : Int;
  };

  public type NpsHolding = {
    id : Text;
    pfmId : Text;
    schemeName : Text;
    tier : Text; // "I" or "II"
    units : Float;
    purchaseNAV : Float;
    purchaseDate : Text;
    currentNAV : Float;
    lastUpdated : Int;
  };

  public type SgbHolding = {
    id : Text;
    symbol : Text;
    name : Text;
    units : Float;
    issuePricePerGram : Float;
    purchaseDate : Text;
    maturityDate : Text;
    currentPricePerGram : Float;
    lastUpdated : Int;
  };

  public type Transaction = {
    id : Text;
    assetType : Text;
    assetName : Text;
    transactionType : Text; // "buy" or "sell"
    quantity : Float;
    price : Float;
    date : Text;
    notes : Text;
  };

  // Store all data per principal
  let userMutualFunds = Map.empty<Principal, Map.Map<Text, MutualFundHolding>>();
  let userStocks = Map.empty<Principal, Map.Map<Text, StockHolding>>();
  let userDebts = Map.empty<Principal, Map.Map<Text, DebtHolding>>();
  let userNps = Map.empty<Principal, Map.Map<Text, NpsHolding>>();
  let userSgbs = Map.empty<Principal, Map.Map<Text, SgbHolding>>();
  let userTransactions = Map.empty<Principal, Map.Map<Text, Transaction>>();

  // Transform function for HTTP outcalls (public, no auth needed)
  public query func transform(input : Outcall.TransformationInput) : async Outcall.TransformationOutput {
    Outcall.transform(input);
  };

  // HTTP Outcall Functions - require user authentication
  public shared ({ caller }) func fetchMFData(schemeCode : Text) : async Text {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can fetch mutual fund data");
    };
    let url = "https://api.mfapi.in/mf/" # schemeCode;
    await Outcall.httpGetRequest(url, [], transform);
  };

  public shared ({ caller }) func searchMutualFunds(q : Text) : async Text {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can search mutual funds");
    };
    let url = "https://api.mfapi.in/mf/search?q=" # q;
    await Outcall.httpGetRequest(url, [], transform);
  };

  public shared ({ caller }) func fetchStockPrice(symbol : Text) : async Text {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can fetch stock prices");
    };
    let url = "https://query1.finance.yahoo.com/v8/finance/chart/" # symbol # "?interval=1d&range=1d";
    let headers = List.fromArray<{ name : Text; value : Text }>([
      { name = "User-Agent"; value = "Mozilla/5.0 (compatible)" },
      { name = "Accept"; value = "application/json" },
    ]);
    await Outcall.httpGetRequest(url, headers.toArray(), transform);
  };

  public shared ({ caller }) func fetchNPSNav(pfmId : Text) : async Text {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can fetch NPS NAV data");
    };
    let url = "https://npsnav.in/api/" # pfmId;
    await Outcall.httpGetRequest(url, [], transform);
  };

  // CRUD APIs for Mutual Funds
  public query ({ caller }) func getMutualFunds() : async [MutualFundHolding] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can access mutual funds");
    };
    switch (userMutualFunds.get(caller)) {
      case (null) { [] };
      case (?funds) { funds.values().toArray() };
    };
  };

  public shared ({ caller }) func addMutualFund(holding : MutualFundHolding) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can add mutual funds");
    };
    let funds = switch (userMutualFunds.get(caller)) {
      case (null) { Map.empty<Text, MutualFundHolding>() };
      case (?f) { f };
    };
    funds.add(holding.id, holding);
    userMutualFunds.add(caller, funds);
  };

  public shared ({ caller }) func updateMutualFund(id : Text, holding : MutualFundHolding) : async Bool {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can update mutual funds");
    };
    switch (userMutualFunds.get(caller)) {
      case (null) { Runtime.trap("No mutual funds found for caller") };
      case (?funds) {
        if (not funds.containsKey(id)) {
          Runtime.trap("Holding with this ID does not exist");
        };
        funds.add(id, holding);
        true;
      };
    };
  };

  public shared ({ caller }) func deleteMutualFund(id : Text) : async Bool {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can delete mutual funds");
    };
    switch (userMutualFunds.get(caller)) {
      case (null) { Runtime.trap("No mutual funds found for caller") };
      case (?funds) {
        if (not funds.containsKey(id)) {
          Runtime.trap("Holding with this ID does not exist");
        };
        funds.remove(id);
        true;
      };
    };
  };

  // CRUD APIs for Stocks
  public query ({ caller }) func getStocks() : async [StockHolding] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can access stocks");
    };
    switch (userStocks.get(caller)) {
      case (null) { [] };
      case (?stocks) { stocks.values().toArray() };
    };
  };

  public shared ({ caller }) func addStock(holding : StockHolding) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can add stocks");
    };
    let stocks = switch (userStocks.get(caller)) {
      case (null) { Map.empty<Text, StockHolding>() };
      case (?s) { s };
    };
    stocks.add(holding.id, holding);
    userStocks.add(caller, stocks);
  };

  public shared ({ caller }) func updateStock(id : Text, holding : StockHolding) : async Bool {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can update stocks");
    };
    switch (userStocks.get(caller)) {
      case (null) { Runtime.trap("No stocks found for caller") };
      case (?stocks) {
        if (not stocks.containsKey(id)) {
          Runtime.trap("Holding with this ID does not exist");
        };
        stocks.add(id, holding);
        true;
      };
    };
  };

  public shared ({ caller }) func deleteStock(id : Text) : async Bool {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can delete stocks");
    };
    switch (userStocks.get(caller)) {
      case (null) { Runtime.trap("No stocks found for caller") };
      case (?stocks) {
        if (not stocks.containsKey(id)) {
          Runtime.trap("Holding with this ID does not exist");
        };
        stocks.remove(id);
        true;
      };
    };
  };

  // CRUD APIs for Debt Holdings
  public query ({ caller }) func getDebtHoldings() : async [DebtHolding] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can access debt holdings");
    };
    switch (userDebts.get(caller)) {
      case (null) { [] };
      case (?debts) { debts.values().toArray() };
    };
  };

  public shared ({ caller }) func addDebt(holding : DebtHolding) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can add debt holdings");
    };
    let debts = switch (userDebts.get(caller)) {
      case (null) { Map.empty<Text, DebtHolding>() };
      case (?d) { d };
    };
    debts.add(holding.id, holding);
    userDebts.add(caller, debts);
  };

  public shared ({ caller }) func updateDebt(id : Text, holding : DebtHolding) : async Bool {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can update debt holdings");
    };
    switch (userDebts.get(caller)) {
      case (null) { Runtime.trap("No debt holdings found for caller") };
      case (?debts) {
        if (not debts.containsKey(id)) {
          Runtime.trap("Holding with this ID does not exist");
        };
        debts.add(id, holding);
        true;
      };
    };
  };

  public shared ({ caller }) func deleteDebt(id : Text) : async Bool {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can delete debt holdings");
    };
    switch (userDebts.get(caller)) {
      case (null) { Runtime.trap("No debt holdings found for caller") };
      case (?debts) {
        if (not debts.containsKey(id)) {
          Runtime.trap("Holding with this ID does not exist");
        };
        debts.remove(id);
        true;
      };
    };
  };

  // CRUD APIs for NPS Holdings
  public query ({ caller }) func getNpsHoldings() : async [NpsHolding] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can access NPS holdings");
    };
    switch (userNps.get(caller)) {
      case (null) { [] };
      case (?nps) { nps.values().toArray() };
    };
  };

  public shared ({ caller }) func addNps(holding : NpsHolding) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can add NPS holdings");
    };
    let nps = switch (userNps.get(caller)) {
      case (null) { Map.empty<Text, NpsHolding>() };
      case (?n) { n };
    };
    nps.add(holding.id, holding);
    userNps.add(caller, nps);
  };

  public shared ({ caller }) func updateNps(id : Text, holding : NpsHolding) : async Bool {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can update NPS holdings");
    };
    switch (userNps.get(caller)) {
      case (null) { Runtime.trap("No NPS holdings found for caller") };
      case (?nps) {
        if (not nps.containsKey(id)) {
          Runtime.trap("Holding with this ID does not exist");
        };
        nps.add(id, holding);
        true;
      };
    };
  };

  public shared ({ caller }) func deleteNps(id : Text) : async Bool {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can delete NPS holdings");
    };
    switch (userNps.get(caller)) {
      case (null) { Runtime.trap("No NPS holdings found for caller") };
      case (?nps) {
        if (not nps.containsKey(id)) {
          Runtime.trap("Holding with this ID does not exist");
        };
        nps.remove(id);
        true;
      };
    };
  };

  // CRUD APIs for SGB Holdings
  public query ({ caller }) func getSgbHoldings() : async [SgbHolding] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can access SGB holdings");
    };
    switch (userSgbs.get(caller)) {
      case (null) { [] };
      case (?sgbs) { sgbs.values().toArray() };
    };
  };

  public shared ({ caller }) func addSgb(holding : SgbHolding) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can add SGB holdings");
    };
    let sgbs = switch (userSgbs.get(caller)) {
      case (null) { Map.empty<Text, SgbHolding>() };
      case (?s) { s };
    };
    sgbs.add(holding.id, holding);
    userSgbs.add(caller, sgbs);
  };

  public shared ({ caller }) func updateSgb(id : Text, holding : SgbHolding) : async Bool {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can update SGB holdings");
    };
    switch (userSgbs.get(caller)) {
      case (null) { Runtime.trap("No SGB holdings found for caller") };
      case (?sgbs) {
        if (not sgbs.containsKey(id)) {
          Runtime.trap("Holding with this ID does not exist");
        };
        sgbs.add(id, holding);
        true;
      };
    };
  };

  public shared ({ caller }) func deleteSgb(id : Text) : async Bool {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can delete SGB holdings");
    };
    switch (userSgbs.get(caller)) {
      case (null) { Runtime.trap("No SGB holdings found for caller") };
      case (?sgbs) {
        if (not sgbs.containsKey(id)) {
          Runtime.trap("Holding with this ID does not exist");
        };
        sgbs.remove(id);
        true;
      };
    };
  };

  // CRUD APIs for Transactions
  public query ({ caller }) func getTransactions() : async [Transaction] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can access transactions");
    };
    switch (userTransactions.get(caller)) {
      case (null) { [] };
      case (?txs) { txs.values().toArray() };
    };
  };

  public shared ({ caller }) func addTransaction(transaction : Transaction) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can add transactions");
    };
    let txs = switch (userTransactions.get(caller)) {
      case (null) { Map.empty<Text, Transaction>() };
      case (?t) { t };
    };
    txs.add(transaction.id, transaction);
    userTransactions.add(caller, txs);
  };

  public shared ({ caller }) func deleteTransaction(id : Text) : async Bool {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can delete transactions");
    };
    switch (userTransactions.get(caller)) {
      case (null) { Runtime.trap("No transactions found for caller") };
      case (?txs) {
        if (not txs.containsKey(id)) {
          Runtime.trap("Transaction with this ID does not exist");
        };
        txs.remove(id);
        true;
      };
    };
  };
};
