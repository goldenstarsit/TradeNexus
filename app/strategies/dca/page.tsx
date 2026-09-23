"use client";

import { useEffect, useState } from "react";

type Tab = "create" | "list";

type DcaOrder = {
  id: number;
  dropPercent: string;
};

type ExchangeSymbol = {
  symbol: string;
  baseAsset: string;
  quoteAsset: string;
  marketType: string;
};

const exchanges = [
  { id: "binance", name: "Binance" },
  { id: "mexc", name: "MEXC" },
  { id: "htx", name: "HTX" },
] as const;



export default function DcaStrategyPage() {
  const [activeTab, setActiveTab] = useState<Tab>("create");
  const [showConfiguration, setShowConfiguration] = useState(false);
  const [balanceMode, setBalanceMode] = useState("Live Mode");
  const [exchange, setExchange] = useState("binance");
  const [symbols, setSymbols] = useState<ExchangeSymbol[]>([]);
  const [symbolsLoading, setSymbolsLoading] = useState(false);
  const [symbolsError, setSymbolsError] = useState<string | null>(null);
  const [executionMode, setExecutionMode] = useState("Maker Only");
  const [symbol, setSymbol] = useState("");
  const [initialOrderAmount, setInitialOrderAmount] = useState("");
  const [initialOrderMinimum, setInitialOrderMinimum] = useState<number | null>(null);
  const [initialOrderCurrency, setInitialOrderCurrency] = useState("USDT");
  const [initialOrderLoading, setInitialOrderLoading] = useState(false);
  const [initialOrderError, setInitialOrderError] = useState<string | null>(null);
  const [dcaOrders, setDcaOrders] = useState<DcaOrder[]>([
    { id: 1, dropPercent: "" },
  ]);

  useEffect(() => {
    let cancelled = false;

    async function loadSymbols() {
      setSymbolsLoading(true);
      setSymbolsError(null);
      setSymbols([]);
      setSymbol("");

      try {
        const response = await fetch(
          `/api/exchange-symbols?exchange=${encodeURIComponent(exchange)}`,
          { cache: "no-store" },
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to load symbols");
        }

        if (cancelled) return;

        const loadedSymbols = Array.isArray(data.symbols)
          ? data.symbols
          : [];

        setSymbols(loadedSymbols);
        setSymbol(loadedSymbols[0]?.symbol ?? "");

        if (loadedSymbols.length === 0) {
          setSymbolsError("No spot symbols are available for this exchange.");
        }
      } catch (error) {
        if (cancelled) return;

        setSymbolsError(
          error instanceof Error
            ? error.message
            : "Failed to load exchange symbols",
        );
      } finally {
        if (!cancelled) {
          setSymbolsLoading(false);
        }
      }
    }

    void loadSymbols();

    return () => {
      cancelled = true;
    };
  }, [exchange]);

  const handleExchangeChange = (value: string) => {
    setExchange(value);
    setSymbol("");
    setInitialOrderAmount("");
    setInitialOrderMinimum(null);
    setInitialOrderCurrency("USDT");
    setInitialOrderError(null);
  };

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    async function loadInitialOrderMinimum() {
      if (!exchange || !symbol) {
        setInitialOrderLoading(false);
        setInitialOrderMinimum(null);
        setInitialOrderAmount("");
        setInitialOrderCurrency("USDT");
        setInitialOrderError(null);
        return;
      }

      const requestedExchange = exchange;
      const requestedSymbol = symbol;

      setInitialOrderLoading(true);
      setInitialOrderMinimum(null);
      setInitialOrderAmount("");
      setInitialOrderCurrency("USDT");
      setInitialOrderError(null);

      let lastError: unknown = null;

      for (let attempt = 1; attempt <= 2; attempt += 1) {
        if (!active || controller.signal.aborted) return;

        try {
          const response = await fetch(
            `/api/exchange-symbol-rules?exchange=${encodeURIComponent(
              requestedExchange,
            )}&symbol=${encodeURIComponent(requestedSymbol)}`,
            {
              cache: "no-store",
              signal: controller.signal,
            },
          );

          const data = await response.json();

          if (!response.ok) {
            throw new Error(
              data.error ||
                `Failed to load minimum order amount for ${requestedSymbol}`,
            );
          }

          const minimum = Number(data.minimumOrderAmount);

          if (!Number.isFinite(minimum) || minimum <= 0) {
            throw new Error(
              `Exchange returned an invalid minimum order amount for ${requestedSymbol}`,
            );
          }

          if (
            !active ||
            controller.signal.aborted ||
            requestedExchange !== exchange ||
            requestedSymbol !== symbol
          ) {
            return;
          }

          const currency =
            typeof data.minimumOrderAmountCurrency === "string" &&
            data.minimumOrderAmountCurrency.trim()
              ? data.minimumOrderAmountCurrency.toUpperCase()
              : typeof data.quoteAsset === "string" &&
                  data.quoteAsset.trim()
                ? data.quoteAsset.toUpperCase()
                : "USDT";

          setInitialOrderMinimum(minimum);
          setInitialOrderCurrency(currency);
          setInitialOrderAmount(String(minimum));
          setInitialOrderError(null);
          setInitialOrderLoading(false);

          return;
        } catch (error) {
          if (
            controller.signal.aborted ||
            !active
          ) {
            return;
          }

          lastError = error;

          if (attempt < 2) {
            await new Promise((resolve) =>
              setTimeout(resolve, 350),
            );
          }
        }
      }

      if (!active || controller.signal.aborted) return;

      setInitialOrderMinimum(null);
      setInitialOrderAmount("");
      setInitialOrderLoading(false);
      setInitialOrderError(
        lastError instanceof Error
          ? lastError.message
          : "Failed to load minimum order amount",
      );
    }

    void loadInitialOrderMinimum();

    return () => {
      active = false;
      controller.abort();
    };
  }, [exchange, symbol]);

  const initialOrderValue = Number(initialOrderAmount);
  const formatUsdtValue = (value: number): string =>
    Number.isFinite(value)
      ? value.toFixed(8).replace(/\.?0+$/, "")
      : "0";

  const formattedInitialOrderMinimum =
    initialOrderMinimum !== null
      ? formatUsdtValue(initialOrderMinimum)
      : null;

  const initialOrderBelowMinimum =
    initialOrderMinimum !== null &&
    initialOrderAmount !== "" &&
    (!Number.isFinite(initialOrderValue) ||
      initialOrderValue < initialOrderMinimum);

  const addDcaOrder = () => {
    setDcaOrders((orders) => [
      ...orders,
      { id: orders.length + 1, dropPercent: "" },
    ]);
  };

  const updateDcaOrder = (id: number, value: string) => {
    setDcaOrders((orders) =>
      orders.map((order) =>
        order.id === id ? { ...order, dropPercent: value } : order,
      ),
    );
  };

  return (
    <main className="strategy-management-page">
      <section className="strategy-management-header">
        <div>
          <p className="eyebrow">STRATEGY MANAGEMENT</p>
          <h1>DCA Strategy</h1>
          <p className="subtitle">
            Create and manage your Dollar Cost Averaging strategies.
          </p>
        </div>

        <a className="back-to-dashboard" href="/">
          ← Dashboard
        </a>
      </section>

      <section className="strategy-management-card">
        <div
          className="strategy-tabs"
          role="tablist"
          aria-label="DCA strategy management"
        >
          <button
            className={
              activeTab === "create"
                ? "strategy-tab active"
                : "strategy-tab"
            }
            type="button"
            role="tab"
            aria-selected={activeTab === "create"}
            onClick={() => setActiveTab("create")}
          >
            Create Strategy
          </button>

          <button
            className={
              activeTab === "list"
                ? "strategy-tab active"
                : "strategy-tab"
            }
            type="button"
            role="tab"
            aria-selected={activeTab === "list"}
            onClick={() => setActiveTab("list")}
          >
            List of Strategies
          </button>
        </div>

        {activeTab === "create" ? (
          <div className="strategy-tab-content">
            {!showConfiguration ? (
              <div className="strategy-create-start">
                <div className="strategy-tab-title">
                  <h2>Create DCA Strategy</h2>
                  <p>
                    Configure a new Dollar Cost Averaging strategy.
                  </p>
                </div>

                <button
                  className="strategy-primary-action"
                  type="button"
                  onClick={() => setShowConfiguration(true)}
                >
                  Create Strategy
                  <span>→</span>
                </button>
              </div>
            ) : (
              <div className="strategy-configuration">
                <div className="strategy-tab-title">
                  <h2>DCA Strategy Configuration</h2>
                  <p>
                    Select the basic configuration for your DCA strategy.
                  </p>
                </div>

                <div className="strategy-config-grid">
                  <div className="strategy-config-field">
                    <label htmlFor="balance-mode">Balance Mode</label>
                    <select
                      id="balance-mode"
                      value={balanceMode}
                      onChange={(event) => setBalanceMode(event.target.value)}
                    >
                      <option>Live Mode</option>
                      <option>Test Mode</option>
                    </select>
                  </div>

                  <div className="strategy-config-field">
                    <label htmlFor="exchange">Exchange</label>
                    <select
                      id="exchange"
                      value={exchange}
                      onChange={(event) =>
                        handleExchangeChange(event.target.value)
                      }
                    >
                      {exchanges.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="strategy-config-field">
                    <label htmlFor="execution-mode">Execution Mode</label>
                    <select
                      id="execution-mode"
                      value={executionMode}
                      onChange={(event) =>
                        setExecutionMode(event.target.value)
                      }
                    >
                      <option>Maker Only</option>
                      <option>Taker Only</option>
                      <option>Hybrid</option>
                    </select>
                  </div>

                  <div className="strategy-config-field">
                    <label htmlFor="symbol">
                      Symbol <span className="field-hint">(Spot)</span>
                    </label>
                    <select
                      id="symbol"
                      value={symbol}
                      onChange={(event) => setSymbol(event.target.value)}
                      disabled={symbolsLoading || symbols.length === 0}
                    >
                      {symbolsLoading ? (
                        <option value="">Loading symbols...</option>
                      ) : symbols.length === 0 ? (
                        <option value="">No symbols available</option>
                      ) : (
                        symbols.map((item) => (
                          <option key={item.symbol} value={item.symbol}>
                            {item.symbol}
                          </option>
                        ))
                      )}
                    </select>
                    {symbolsError && (
                      <p className="strategy-field-description">
                        {symbolsError}
                      </p>
                    )}
                  </div>
                </div>

                <div className="strategy-order-config">
                  <div className="strategy-order-section">
                    <div className="strategy-order-title">
                      <h3>Initial Order</h3>
                      <span>
                        {initialOrderLoading
                          ? "Loading minimum..."
                          : initialOrderMinimum !== null
                            ? `Minimum ${formattedInitialOrderMinimum} ${initialOrderCurrency}`
                            : "Minimum unavailable"}
                      </span>
                    </div>

                    <div className="strategy-config-field">
                      <label htmlFor="initial-order">
                        Order Amount ({initialOrderCurrency})
                      </label>
                      <input
                        id="initial-order"
                        type="number"
                        min={initialOrderMinimum ?? 0}
                        step="any"
                        value={initialOrderAmount}
                        disabled={initialOrderLoading || initialOrderMinimum === null}
                        onChange={(event) => {
                          setInitialOrderAmount(event.target.value);
                          setInitialOrderError(null);
                        }}
                        aria-invalid={
                          initialOrderBelowMinimum || initialOrderError
                            ? true
                            : undefined
                        }
                      />
                      {initialOrderBelowMinimum && initialOrderMinimum !== null && (
                        <p className="strategy-field-description">
                          Minimum allowed is {formattedInitialOrderMinimum}{" "}
                          {initialOrderCurrency}.
                        </p>
                      )}
                      {initialOrderError && (
                        <p className="strategy-field-description">
                          {initialOrderError}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="strategy-order-section">
                    <div className="strategy-order-title">
                      <h3>DCA Orders</h3>
                      <span>Trigger on price drop</span>
                    </div>

                    <div className="strategy-dca-list">
                      {dcaOrders.map((order) => (
                        <div className="strategy-dca-row" key={order.id}>
                          <div className="strategy-config-field">
                            <label htmlFor={`dca-amount-${order.id}`}>
                              Amount
                            </label>
                            <input
                              id={`dca-amount-${order.id}`}
                              type="number"
                              min="0"
                              step="0.01"
                              placeholder="Amount in USDT"
                            />
                          </div>

                          <div className="strategy-config-field">
                            <label htmlFor={`dca-drop-${order.id}`}>
                              Drop %
                            </label>
                            <div className="strategy-input-suffix">
                              <input
                                id={`dca-drop-${order.id}`}
                                type="number"
                                min="0"
                                step="0.01"
                                value={order.dropPercent}
                                onChange={(event) =>
                                  updateDcaOrder(
                                    order.id,
                                    event.target.value,
                                  )
                                }
                                placeholder="From initial order"
                              />
                              <span>%</span>
                            </div>
                          </div>

                          {order.id === dcaOrders.length && (
                            <button
                              className="strategy-add-dca"
                              type="button"
                              onClick={addDcaOrder}
                              aria-label="Add DCA order"
                              title="Add DCA order"
                            >
                              +
                            </button>
                          )}
                        </div>
                      ))}
                    </div>

                    <p className="strategy-field-description">
                      Each DCA order is triggered when the price falls by the
                      configured percentage from the Initial Order price.
                    </p>
                  </div>

                  <div className="strategy-order-section">
                    <div className="strategy-config-field">
                      <label htmlFor="take-profit">Take Profit</label>
                      <div className="strategy-input-suffix">
                        <input
                          id="take-profit"
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="2"
                        />
                        <span>%</span>
                      </div>
                    </div>
                  </div>

                  <div className="strategy-order-section">
                    <div className="strategy-config-field">
                      <label htmlFor="stop-loss">Stop Loss</label>
                      <div className="strategy-input-suffix">
                        <input
                          id="stop-loss"
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="50"
                        />
                        <span>%</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="strategy-config-actions">
                  <button
                    className="strategy-secondary-action"
                    type="button"
                    onClick={() => setShowConfiguration(false)}
                  >
                    Back
                  </button>

                  <button
                    className="strategy-primary-action"
                    type="button"
                    onClick={async () => {
                      try {
                        const response = await fetch(
                          "/api/strategies/dca-submit-debug",
                          {
                            method: "POST",
                            headers: {
                              "Content-Type": "application/json",
                            },
                            body: JSON.stringify({
                              balanceMode,
                              exchange,
                              executionMode,
                              symbol,
                            }),
                          },
                        );

                        if (!response.ok) {
                          throw new Error("DCA configuration submit failed");
                        }
                      } catch (error) {
                        console.error(
                          "[DCA CONFIGURATION SUBMIT]",
                          error,
                        );
                      }
                    }}
                  >
                    Save Strategy
                    <span>→</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="strategy-tab-content">
            <div className="strategy-tab-title">
              <h2>List of Strategies</h2>
              <p>View and manage your existing DCA strategies.</p>
            </div>

            <div className="strategy-table-wrapper">
              <table className="strategy-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Symbol</th>
                    <th>Balance Mode</th>
                    <th>Exchange</th>
                    <th>Execution Mode</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>1</td>
                    <td>BTCUSDT</td>
                    <td>Live Mode</td>
                    <td>Binance</td>
                    <td>Maker Only</td>
                    <td>
                      <div className="strategy-row-actions">
                        <button
                          className="strategy-icon-action edit"
                          type="button"
                          aria-label="Edit strategy 1"
                          title="Edit"
                        >
                          <svg viewBox="0 0 24 24" aria-hidden="true">
                            <path d="M4 20h4L19.5 8.5a2.12 2.12 0 0 0 0-3L18.5 4.5a2.12 2.12 0 0 0-3 0L4 16v4Z" />
                            <path d="m14.5 5.5 4 4" />
                          </svg>
                        </button>
                        <button
                          className="strategy-icon-action remove"
                          type="button"
                          aria-label="Remove strategy 1"
                          title="Remove"
                        >
                          <svg viewBox="0 0 24 24" aria-hidden="true">
                            <path d="M4 7h16" />
                            <path d="M10 11v6M14 11v6" />
                            <path d="M6 7l1 13h10l1-13" />
                            <path d="M9 7V4h6v3" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                  <tr>
                    <td>2</td>
                    <td>ETHUSDT</td>
                    <td>Test Mode</td>
                    <td>MEXC</td>
                    <td>Hybrid</td>
                    <td>
                      <div className="strategy-row-actions">
                        <button className="strategy-icon-action edit" type="button" aria-label="Edit strategy 2" title="Edit">
                          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4L19.5 8.5a2.12 2.12 0 0 0 0-3L18.5 4.5a2.12 2.12 0 0 0-3 0L4 16v4Z" /><path d="m14.5 5.5 4 4" /></svg>
                        </button>
                        <button className="strategy-icon-action remove" type="button" aria-label="Remove strategy 2" title="Remove">
                          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16" /><path d="M10 11v6M14 11v6" /><path d="M6 7l1 13h10l1-13" /><path d="M9 7V4h6v3" /></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                  <tr>
                    <td>3</td>
                    <td>SOLUSDT</td>
                    <td>Live Mode</td>
                    <td>HTX</td>
                    <td>Taker Only</td>
                    <td>
                      <div className="strategy-row-actions">
                        <button className="strategy-icon-action edit" type="button" aria-label="Edit strategy 3" title="Edit">
                          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4L19.5 8.5a2.12 2.12 0 0 0 0-3L18.5 4.5a2.12 2.12 0 0 0-3 0L4 16v4Z" /><path d="m14.5 5.5 4 4" /></svg>
                        </button>
                        <button className="strategy-icon-action remove" type="button" aria-label="Remove strategy 3" title="Remove">
                          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16" /><path d="M10 11v6M14 11v6" /><path d="M6 7l1 13h10l1-13" /><path d="M9 7V4h6v3" /></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                  <tr>
                    <td>4</td>
                    <td>BNBUSDT</td>
                    <td>Test Mode</td>
                    <td>Binance</td>
                    <td>Maker Only</td>
                    <td>
                      <div className="strategy-row-actions">
                        <button className="strategy-icon-action edit" type="button" aria-label="Edit strategy 4" title="Edit">
                          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4L19.5 8.5a2.12 2.12 0 0 0 0-3L18.5 4.5a2.12 2.12 0 0 0-3 0L4 16v4Z" /><path d="m14.5 5.5 4 4" /></svg>
                        </button>
                        <button className="strategy-icon-action remove" type="button" aria-label="Remove strategy 4" title="Remove">
                          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16" /><path d="M10 11v6M14 11v6" /><path d="M6 7l1 13h10l1-13" /><path d="M9 7V4h6v3" /></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
