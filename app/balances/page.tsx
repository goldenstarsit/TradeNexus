"use client";

import { useEffect, useState } from "react";

type BalanceMode = "live" | "test";
type Exchange = "binance" | "mexc" | "htx";

const exchanges: Array<[Exchange, string, string, string]> = [
  ["binance", "Binance", "B", "binance"],
  ["mexc", "MEXC", "M", "mexc"],
  ["htx", "HTX", "H", "htx"],
];

const assetCache: Partial<Record<Exchange, string[]>> = {};

interface LiveBalance {
  asset: string;
  free: number;
  locked: number;
  total?: number;
  usdtValue?: number;
}

interface TestBalance {
  asset: string;
  available: number;
  reserved: number;
  total: number;
  usdtValue: number;
}

interface LiveBalanceSnapshot {
  exchange: string;
  balances: LiveBalance[];
  timestamp: number;
}

function accountIdFor(exchange: Exchange) {
  return `${exchange}:dashboard-test`;
}

function formatUSD(value: number) {
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function BalancesPage() {
  const [mode, setMode] = useState<BalanceMode>("live");
  const [selectedExchange, setSelectedExchange] = useState<Exchange>("binance");
  const [operation, setOperation] = useState<"deposit" | "withdraw" | null>(null);
  const [formExchange, setFormExchange] = useState<Exchange>("binance");
  const [formAsset, setFormAsset] = useState("USDT");
  const [formAssets, setFormAssets] = useState<string[]>([]);
  const [formAssetsLoading, setFormAssetsLoading] = useState(false);
  const [formAmount, setFormAmount] = useState("");
  const [formBalance, setFormBalance] = useState(0);
  const [formBalanceLoading, setFormBalanceLoading] = useState(false);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");
  const [testBalances, setTestBalances] = useState<
    Record<Exchange, TestBalance[]>
  >({
    binance: [],
    mexc: [],
    htx: [],
  });
  const [liveBalances, setLiveBalances] = useState<
    Record<Exchange, LiveBalance[]>
  >({
    binance: [],
    mexc: [],
    htx: [],
  });
  const [liveBalanceLoading, setLiveBalanceLoading] = useState(false);
  const [liveBalanceError, setLiveBalanceError] = useState("");
  const [testBalanceError, setTestBalanceError] = useState("");

  useEffect(() => {
    if (operation === null || !formAsset) {
      setFormBalance(0);
      setFormBalanceLoading(false);
      return;
    }

    let cancelled = false;

    async function loadBalance() {
      setFormBalanceLoading(true);
      setFormError("");

      try {
        const response = await fetch(
          `/api/test-balances?accountId=${encodeURIComponent(
            `${formExchange}:dashboard-test`,
          )}&asset=${encodeURIComponent(formAsset)}`,
          { cache: "no-store" },
        );

        const result: unknown = await response.json();

        if (
          !response.ok ||
          typeof result !== "object" ||
          result === null ||
          !("balance" in result) ||
          typeof result.balance !== "object" ||
          result.balance === null ||
          !("total" in result.balance) ||
          typeof result.balance.total !== "number"
        ) {
          throw new Error("Failed to load current balance");
        }

        if (!cancelled) {
          setFormBalance(result.balance.total);
        }
      } catch (error) {
        if (!cancelled) {
          setFormBalance(0);
          setFormError(
            error instanceof Error
              ? error.message
              : "Failed to load current balance",
          );
        }
      } finally {
        if (!cancelled) setFormBalanceLoading(false);
      }
    }

    void loadBalance();

    return () => {
      cancelled = true;
    };
  }, [operation, formExchange, formAsset]);

  useEffect(() => {
    if (operation === null) return;
    setFormError("");
    setFormSuccess("");
  }, [operation, formExchange, formAsset]);
  useEffect(() => {
    if (mode !== "live") {
      setLiveBalanceLoading(false);
      setLiveBalanceError("");

      let cancelled = false;

      async function loadTestBalances() {
        try {
          const response = await fetch("/api/test-balance-totals", {
            cache: "no-store",
            headers: { Accept: "application/json" },
          });

          const result: unknown = await response.json();

          if (
            !response.ok ||
            typeof result !== "object" ||
            result === null ||
            !("balances" in result) ||
            !Array.isArray(result.balances)
          ) {
            throw new Error("Invalid test balance response");
          }

          const nextBalances: Record<Exchange, TestBalance[]> = {
            binance: [],
            mexc: [],
            htx: [],
          };

          for (const exchange of exchanges.map(([id]) => id)) {
            const exchangeResult = result.balances.find(
              (item: unknown) =>
                typeof item === "object" &&
                item !== null &&
                "exchange" in item &&
                item.exchange === exchange,
            );

            if (
              typeof exchangeResult !== "object" ||
              exchangeResult === null ||
              !("balances" in exchangeResult) ||
              !Array.isArray(exchangeResult.balances)
            ) {
              continue;
            }

            nextBalances[exchange] = exchangeResult.balances
              .filter(
                (balance: unknown): balance is TestBalance =>
                  typeof balance === "object" &&
                  balance !== null &&
                  "asset" in balance &&
                  typeof balance.asset === "string" &&
                  "available" in balance &&
                  typeof balance.available === "number" &&
                  "reserved" in balance &&
                  typeof balance.reserved === "number" &&
                  "total" in balance &&
                  typeof balance.total === "number" &&
                  "usdtValue" in balance &&
                  typeof balance.usdtValue === "number",
              )
              .filter((balance: TestBalance) => balance.total > 0)
              .sort(
                (a: TestBalance, b: TestBalance) =>
                  b.usdtValue - a.usdtValue,
              );
          }

          if (!cancelled) {
            setTestBalances(nextBalances);
            setTestBalanceError("");
          }
        } catch (error) {
          if (!cancelled) {
            setTestBalanceError(
              error instanceof Error
                ? error.message
                : "Failed to load test balance",
            );
          }
        }
      }

      void loadTestBalances();

      const interval = window.setInterval(() => {
        void loadTestBalances();
      }, 5000);

      return () => {
        cancelled = true;
        window.clearInterval(interval);
      };
    }

    let cancelled = false;

    async function loadLiveBalances() {
      setLiveBalanceLoading(true);
      setLiveBalanceError("");

      try {
        const response = await fetch("/api/live-balances", {
          cache: "no-store",
          headers: { Accept: "application/json" },
        });

        const result: unknown = await response.json();

        if (
          !response.ok ||
          typeof result !== "object" ||
          result === null ||
          !("balances" in result) ||
          typeof result.balances !== "object" ||
          result.balances === null
        ) {
          throw new Error("Invalid live balance response");
        }

        const rawBalances = result.balances as Record<
          string,
          unknown
        >;

        const nextBalances: Record<Exchange, LiveBalance[]> = {
          binance: [],
          mexc: [],
          htx: [],
        };

        for (const exchange of exchanges.map(([id]) => id)) {
          const raw = rawBalances[exchange];

          if (!Array.isArray(raw)) {
            continue;
          }

          nextBalances[exchange] = raw
            .filter(
              (balance: unknown): balance is LiveBalance =>
                typeof balance === "object" &&
                balance !== null &&
                "asset" in balance &&
                typeof balance.asset === "string" &&
                "free" in balance &&
                typeof balance.free === "number" &&
                "locked" in balance &&
                typeof balance.locked === "number",
            )
            .filter(
              (balance) =>
                balance.free + balance.locked > 0,
            )
            .sort(
              (a, b) =>
                b.free +
                b.locked -
                (a.free + a.locked),
            );
        }

        if (cancelled) return;

        setLiveBalances(nextBalances);

        const errors =
          "errors" in result &&
          typeof result.errors === "object" &&
          result.errors !== null
            ? result.errors
            : null;

        if (errors) {
          const messages = Object.entries(
            errors as Record<string, unknown>,
          )
            .filter(
              ([, value]) => typeof value === "string",
            )
            .map(([exchange, value]) => `${exchange}: ${value}`);

          setLiveBalanceError(messages.join(" · "));
        }
      } catch (error) {
        if (cancelled) return;

        setLiveBalanceError(
          error instanceof Error
            ? error.message
            : "Failed to load live balance",
        );
      } finally {
        if (!cancelled) {
          setLiveBalanceLoading(false);
        }
      }
    }

    void loadLiveBalances();

    return () => {
      cancelled = true;
    };
  }, [mode]);

  useEffect(() => {
    if (operation === null) {
      setFormAssets([]);
      setFormAsset("");
      setFormAssetsLoading(false);
      return;
    }

    let cancelled = false;

    async function loadAssets() {
      const cached = assetCache[formExchange];

      if (cached && cached.length > 0) {
        setFormAssets(cached);
        setFormAsset(cached.includes("USDT") ? "USDT" : (cached[0] ?? ""));
        setFormAssetsLoading(false);
        return;
      }

      setFormAssets([]);
      setFormAsset("");
      setFormAssetsLoading(true);

      try {
        const response = await fetch(
          `/api/exchange-assets?exchange=${encodeURIComponent(formExchange)}`,
          {
            cache: "no-store",
          },
        );

        const result: unknown = await response.json();

        if (!response.ok || typeof result !== "object" || result === null) {
          throw new Error("Failed to load exchange assets");
        }

        const rawAssets =
          "assets" in result && Array.isArray(result.assets)
            ? result.assets
            : [];

        const assets: string[] = [
          ...new Set(
            rawAssets.filter(
              (asset: unknown): asset is string =>
                typeof asset === "string" && asset.trim().length > 0,
            ),
          ),
        ].sort((a: string, b: string) => a.localeCompare(b));

        if (cancelled) return;

        assetCache[formExchange] = assets;
        setFormAssets(assets);
        setFormAsset(assets.includes("USDT") ? "USDT" : (assets[0] ?? ""));
      } catch (error) {
        if (cancelled) return;

        setFormAssets([]);
        setFormAsset("");
        console.error(
          `Failed to load ${formExchange} assets`,
          error,
        );
      } finally {
        if (!cancelled) {
          setFormAssetsLoading(false);
        }
      }
    }

    void loadAssets();

    return () => {
      cancelled = true;
    };
  }, [operation, formExchange]);

  const selectedLiveBalances = liveBalances[selectedExchange];
  const selectedTestBalances = testBalances[selectedExchange];

  const selectedLiveAssetCount = selectedLiveBalances.length;
  const selectedTestAssetCount = selectedTestBalances.length;

  const total = Object.values(testBalances)
    .flat()
    .reduce((sum, balance) => sum + balance.usdtValue, 0);

  return (
    <main className="min-h-screen bg-zinc-950 px-4 py-6 pb-16 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-wider text-zinc-500">
              TradeNexus
            </p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight">
              Balances
            </h1>
          </div>

          <div className="hidden">
            <button type="button" onClick={() => setMode("live")}>Live</button>
            <button type="button" onClick={() => setMode("test")}>Test</button>
          </div>
        </div>

        <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6 sm:p-8">
          <p className="text-sm font-medium text-zinc-400">
            {mode === "live" ? "LIVE BALANCE" : "TEST BALANCE"}
          </p>
          <div className="mt-2 text-4xl font-semibold tracking-tight sm:text-5xl">
            {mode === "live"
              ? `${selectedLiveAssetCount} assets`
              : `${selectedTestAssetCount} assets`}
          </div>
          <p className="mt-2 text-sm text-zinc-500">
            {mode === "live"
              ? "Real exchange balances. Values are shown in their native assets."
              : `Local test balance. Total USDT value: ${formatUSD(total)}. No real funds are involved.`}
          </p>
          {mode === "live" && liveBalanceError && (
            <p className="mt-3 text-sm text-red-300">{liveBalanceError}</p>
          )}
        </section>

        <section className="mt-6 overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900">
          <div className="flex flex-col">
            {exchanges.map(([exchange, name, logo, logoClass]) => (
              <button
                key={exchange}
                type="button"
                onClick={() => setSelectedExchange(exchange)}
                className={`flex w-full items-center justify-between border-b border-zinc-800 px-5 py-5 text-left transition last:border-b-0 sm:px-7 ${
                  selectedExchange === exchange
                    ? "bg-white text-zinc-950"
                    : "text-white hover:bg-zinc-800"
                }`}
              >
                <span className="flex items-center gap-3">
                  <span className={`exchange-logo ${logoClass}`}>{logo}</span>
                  <span>
                    <span className="block font-semibold">{name}</span>
                    <span className="block text-xs uppercase tracking-wide opacity-50">
                      {mode} · USDT
                    </span>
                  </span>
                </span>

                <span className="text-right text-sm font-semibold">
                  {mode === "live"
                    ? `${liveBalances[exchange].length} assets`
                    : `${testBalances[exchange].length} assets`}
                </span>
              </button>
            ))}
          </div>

          <div className="border-t border-zinc-800 bg-zinc-950/60 p-5 sm:p-7">
            <div className="mb-4">
              <p className="text-sm font-semibold text-white">
                {exchanges.find(([exchange]) => exchange === selectedExchange)?.[1]} Assets
              </p>
              <p className="mt-1 text-xs text-zinc-500">
                Non-zero balances
              </p>
            </div>

            <div className="overflow-hidden rounded-xl border border-zinc-800">
              {mode === "live" ? (
                selectedLiveBalances.length === 0 ? (
                  <div className="px-4 py-6 text-sm text-zinc-500">
                    {liveBalanceError
                      ? "Live balance could not be loaded."
                      : "No non-zero balances found."}
                  </div>
                ) : (
                  <div className="divide-y divide-zinc-800">
                    {selectedLiveBalances.map((balance) => {
                      const totalBalance = balance.free + balance.locked;

                      return (
                        <div
                          key={balance.asset}
                          className="flex items-center justify-between gap-4 px-4 py-4"
                        >
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-white">
                              {balance.asset}
                            </p>
                          </div>

                          <div className="shrink-0 text-right">
                            <p className="text-sm font-medium text-white">
                              {totalBalance.toLocaleString("en-US", {
                                maximumFractionDigits: 12,
                              })}
                            </p>
                            <p className="mt-1 text-xs text-zinc-500">
                              {typeof balance.usdtValue === "number"
                                ? `${balance.usdtValue.toLocaleString("en-US", {
                                    minimumFractionDigits: 8,
                                    maximumFractionDigits: 8,
                                  })} USDT`
                                : "USDT value unavailable"}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )
              ) : selectedTestBalances.length === 0 ? (
                <div className="px-4 py-6 text-sm text-zinc-500">
                  {testBalanceError
                    ? "Test balance could not be loaded."
                    : "No non-zero balances found."}
                </div>
              ) : (
                <div className="divide-y divide-zinc-800">
                  {selectedTestBalances.map((balance) => (
                    <div
                      key={balance.asset}
                      className="flex items-center justify-between gap-4 px-4 py-4"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-white">
                          {balance.asset}
                        </p>
                      </div>

                      <div className="shrink-0 text-right">
                        <p className="text-sm font-medium text-white">
                          {balance.total.toLocaleString("en-US", {
                            maximumFractionDigits: 12,
                          })}
                        </p>
                        <p className="mt-1 text-xs text-zinc-500">
                          {balance.usdtValue.toLocaleString("en-US", {
                            minimumFractionDigits: 8,
                            maximumFractionDigits: 8,
                          })}{" "}
                          USDT
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {mode === "test" && (
              <div className="mt-4 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  className="rounded-xl bg-white px-4 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-zinc-200"
                  onClick={() => {
                    setOperation("deposit");
                    setFormExchange(selectedExchange);
                    setFormAsset("");
                    setFormAmount("");
                    setFormBalance(0);
                    setFormError("");
                    setFormSuccess("");
                  }}
                >
                  Deposit
                </button>

                <button
                  type="button"
                  className="rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-zinc-800"
                  onClick={() => {
                    setOperation("withdraw");
                    setFormExchange(selectedExchange);
                    setFormAsset("");
                    setFormAmount("");
                    setFormBalance(0);
                    setFormError("");
                    setFormSuccess("");
                  }}
                >
                  Withdraw
                </button>
              </div>
            )}
          </div>
        </section>

        {operation !== null && (
          <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/70 p-4 sm:items-center">
            <div className="w-full max-w-lg rounded-2xl border border-zinc-800 bg-zinc-950 p-5 shadow-2xl sm:p-7">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
                    Test Balance
                  </p>
                  <h2 className="mt-1 text-xl font-semibold">
                    {operation === "deposit" ? "Deposit" : "Withdraw"}
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={() => setOperation(null)}
                  className="rounded-lg px-3 py-2 text-zinc-400 hover:bg-zinc-900 hover:text-white"
                  aria-label="Close"
                >
                  ✕
                </button>
              </div>

              <div className="mt-6 space-y-4">
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-zinc-300">
                    Exchange
                  </span>
                  <select
                    value={formExchange}
                    onChange={(event) => {
                      const exchange = event.target.value as Exchange;
                      setFormExchange(exchange);
                      setFormAsset("");
                      setFormAmount("");
                      setFormBalance(0);
                      setFormError("");
                      setFormSuccess("");
                    }}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-white outline-none focus:border-zinc-500"
                  >
                    {exchanges.map(([exchange, name]) => (
                      <option key={exchange} value={exchange}>
                        {name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-zinc-300">
                    Asset
                  </span>
                  <select
                    value={formAsset}
                    onChange={(event) => setFormAsset(event.target.value)}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-white outline-none focus:border-zinc-500"
                  >
                    {formAssetsLoading ? (
                      <option value="">Loading assets...</option>
                    ) : formAssets.length === 0 ? (
                      <option value="">No assets available</option>
                    ) : (
                      formAssets.map((asset) => (
                        <option key={asset} value={asset}>
                          {asset}
                        </option>
                      ))
                    )}
                  </select>
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-zinc-300">
                    Amount
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={formAmount}
                    onChange={(event) => setFormAmount(event.target.value)}
                    placeholder="Enter amount"
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-white outline-none placeholder:text-zinc-600 focus:border-zinc-500"
                  />
                </label>

                <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-zinc-400">Current {formAsset || "Asset"} Balance</span>
                    <span className="font-semibold text-white">
                      {formBalanceLoading
                        ? "Loading..."
                        : `${formBalance} ${formAsset || ""}`}
                    </span>
                  </div>

                  {formAmount && Number(formAmount) > 0 && formAsset && (
                    <div className="mt-3 flex items-center justify-between border-t border-zinc-800 pt-3 text-sm">
                      <span className="text-zinc-400">
                        After {operation === "deposit" ? "Deposit" : "Withdraw"}
                      </span>
                      <span className="font-semibold text-white">
                        {(
                          operation === "deposit"
                            ? formBalance + Number(formAmount)
                            : formBalance - Number(formAmount)
                        ).toFixed(8)}{" "}
                        {formAsset}
                      </span>
                    </div>
                  )}
                </div>

                {formError && (
                  <div className="rounded-xl border border-red-900/50 bg-red-950/30 px-4 py-3 text-sm text-red-300">
                    {formError}
                  </div>
                )}

                {formSuccess && (
                  <div className="rounded-xl border border-emerald-900/50 bg-emerald-950/30 px-4 py-3 text-sm text-emerald-300">
                    {formSuccess}
                  </div>
                )}
              </div>

              <div className="mt-6 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setOperation(null)}
                  className="rounded-xl border border-zinc-800 px-4 py-3 text-sm font-semibold text-zinc-300 hover:bg-zinc-900"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  disabled={
                    formSubmitting ||
                    !formAsset ||
                    !formAmount ||
                    Number(formAmount) <= 0 ||
                    (operation === "withdraw" && Number(formAmount) > formBalance)
                  }
                  onClick={async () => {
                    const amount = Number(formAmount);

                    if (!formAsset || !Number.isFinite(amount) || amount <= 0) {
                      setFormError("Enter a valid amount.");
                      return;
                    }

                    if (operation === "withdraw" && amount > formBalance) {
                      setFormError("Insufficient test balance.");
                      return;
                    }

                    setFormSubmitting(true);
                    setFormError("");
                    setFormSuccess("");

                    try {
                      const response = await fetch("/api/test-balances", {
                        method: "POST",
                        headers: {
                          "content-type": "application/json",
                        },
                        body: JSON.stringify({
                          accountId: `${formExchange}:dashboard-test`,
                          asset: formAsset,
                          amount,
                          action: operation,
                        }),
                      });

                      const result: unknown = await response.json();

                      if (
                        !response.ok ||
                        typeof result !== "object" ||
                        result === null ||
                        !("balance" in result) ||
                        typeof result.balance !== "object" ||
                        result.balance === null ||
                        !("total" in result.balance) ||
                        typeof result.balance.total !== "number"
                      ) {
                        throw new Error(
                          typeof result === "object" &&
                          result !== null &&
                          "error" in result &&
                          typeof result.error === "string"
                            ? result.error
                            : "Balance operation failed",
                        );
                      }

                      const updatedBalance = result.balance.total;

                      setFormBalance(updatedBalance);
                      setFormAmount("");
                      setFormSuccess(
                        `${operation === "deposit" ? "Deposit" : "Withdraw"} successful. Current balance: ${updatedBalance} ${formAsset}`,
                      );

                      const refreshResponse = await fetch(
                        "/api/test-balance-totals",
                        {
                          cache: "no-store",
                          headers: { Accept: "application/json" },
                        },
                      );

                      if (refreshResponse.ok) {
                        const refreshResult: unknown =
                          await refreshResponse.json();

                        if (
                          typeof refreshResult === "object" &&
                          refreshResult !== null &&
                          "balances" in refreshResult &&
                          Array.isArray(refreshResult.balances)
                        ) {
                          const refreshed: Record<
                            Exchange,
                            TestBalance[]
                          > = {
                            binance: [],
                            mexc: [],
                            htx: [],
                          };

                          for (const exchange of exchanges.map(
                            ([id]) => id,
                          )) {
                            const exchangeResult =
                              refreshResult.balances.find(
                                (item: unknown) =>
                                  typeof item === "object" &&
                                  item !== null &&
                                  "exchange" in item &&
                                  item.exchange === exchange,
                              );

                            if (
                              typeof exchangeResult === "object" &&
                              exchangeResult !== null &&
                              "balances" in exchangeResult &&
                              Array.isArray(exchangeResult.balances)
                            ) {
                              refreshed[exchange] =
                                exchangeResult.balances;
                            }
                          }

                          setTestBalances(refreshed);
                        }
                      }
                    } catch (error) {
                      setFormError(
                        error instanceof Error
                          ? error.message
                          : "Balance operation failed",
                      );
                    } finally {
                      setFormSubmitting(false);
                    }
                  }}
                  className="rounded-xl bg-white px-4 py-3 text-sm font-semibold text-zinc-950 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {formSubmitting
                    ? "Processing..."
                    : operation === "deposit"
                      ? "Deposit"
                      : "Withdraw"}
                </button>
              </div>
            </div>
          </div>
        )}

        {mode === "test" && (
          <section className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
            <h2 className="text-lg font-semibold">Test Balance Operations</h2>
            <p className="mt-1 text-sm text-zinc-500">
              Deposit and withdraw operations belong only to Test Balance.
            </p>
          </section>
        )}
      </div>

      <nav
        className="fixed inset-x-0 bottom-0 z-50 grid h-10 grid-cols-2 border-t border-zinc-800 bg-zinc-950/95 backdrop-blur"
        aria-label="Balance mode"
      >
        <button
          type="button"
          onClick={() => setMode("live")}
          className={`flex h-full items-center justify-center border-r border-zinc-800 text-base font-semibold transition ${
            mode === "live"
              ? "bg-white text-zinc-950"
              : "bg-zinc-950 text-zinc-400 hover:bg-zinc-900 hover:text-white"
          }`}
        >
          Live Mode
        </button>

        <button
          type="button"
          onClick={() => setMode("test")}
          className={`flex h-full items-center justify-center text-base font-semibold transition ${
            mode === "test"
              ? "bg-white text-zinc-950"
              : "bg-zinc-950 text-zinc-400 hover:bg-zinc-900 hover:text-white"
          }`}
        >
          Test Mode
        </button>
      </nav>
    </main>
  );
}
