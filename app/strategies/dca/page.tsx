"use client";

import { useEffect, useState } from "react";

type Tab = "create" | "list";

type DcaOrder = {
  id: number;
  amount: string;
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
  const [editingDcaConfigId, setEditingDcaConfigId] = useState<number | null>(null);
  const [balanceMode, setBalanceMode] = useState("Live Mode");
  const [exchange, setExchange] = useState("binance");
  const [symbols, setSymbols] = useState<ExchangeSymbol[]>([]);
  const [symbolsLoading, setSymbolsLoading] = useState(false);
  const [symbolsError, setSymbolsError] = useState<string | null>(null);
  const [executionMode, setExecutionMode] = useState("Maker Only");
  const [symbol, setSymbol] = useState("");
  const [initialOrderAmount, setInitialOrderAmount] = useState("minQty");
  const [initialOrderCurrency, setInitialOrderCurrency] = useState("USDT");
  const [takeProfit, setTakeProfit] = useState("1");
  const [stopLoss, setStopLoss] = useState("50");
  type SavedDcaStrategy = {
    strategyType: {
      id: number;
      strategy_type: string;
    };
    config: {
      id: number;
      strategy_id: string;
      name: string;
      balance_mode: "live" | "test";
      balance_account_id: string;
      exchange_id: string;
      market_type: string;
      symbol: string;
      execution_mode: string;
      initial_order_amount: string;
      initial_order_currency: string;
      take_profit_percent: string;
      stop_loss_percent: string;
      status: "active" | "paused" | "stopped";
    };
    orders: {
      id: number;
      dca_config_id: number;
      position: number;
      amount: string;
      drop_percent: string;
    }[];
  };

  const [savedDcaStrategies, setSavedDcaStrategies] =
    useState<SavedDcaStrategy[]>([]);
  const [savedDcaStrategiesLoading, setSavedDcaStrategiesLoading] =
    useState(false);
  const [savedDcaStrategiesError, setSavedDcaStrategiesError] =
    useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const loadSavedDcaStrategies = async () => {
      setSavedDcaStrategiesLoading(true);
      setSavedDcaStrategiesError(null);

      try {
        const response = await fetch(
          "/api/strategies/dca",
          { cache: "no-store" },
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.error ||
              "Failed to load saved DCA strategies",
          );
        }

        if (!active) {
          return;
        }

        setSavedDcaStrategies(
          Array.isArray(data.strategies)
            ? data.strategies
            : [],
        );
      } catch (error) {
        if (!active) {
          return;
        }

        console.error(
          "[DCA] Failed to load saved strategies:",
          error,
        );

        setSavedDcaStrategiesError(
          error instanceof Error
            ? error.message
            : "Failed to load saved DCA strategies",
        );
      } finally {
        if (active) {
          setSavedDcaStrategiesLoading(false);
        }
      }
    };

    void loadSavedDcaStrategies();

    return () => {
      active = false;
    };
  }, []);

  const [dcaOrders, setDcaOrders] = useState<DcaOrder[]>([
    { id: 1, amount: "minQty", dropPercent: "1" },
  ]);

  useEffect(() => {
    let cancelled = false;

    async function loadSymbols() {
      setSymbolsLoading(true);
      setSymbolsError(null);
      setSymbols([]);

      const savedEditSymbol =
        editingDcaConfigId !== null ? symbol : "";

      if (editingDcaConfigId === null) {
        setSymbol("");
      }

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

        if (
          editingDcaConfigId !== null &&
          savedEditSymbol &&
          loadedSymbols.some(
            (item: ExchangeSymbol) => item.symbol === savedEditSymbol,
          )
        ) {
          setSymbol(savedEditSymbol);
        } else if (editingDcaConfigId === null) {
          setSymbol(loadedSymbols[0]?.symbol ?? "");
        }

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
  }, [exchange, editingDcaConfigId]);

  const handleExchangeChange = (value: string) => {
    setExchange(value);
    setSymbol("");
    setInitialOrderAmount("minQty");
    setInitialOrderCurrency("USDT");
  };



  const sortDcaOrders = (orders: DcaOrder[]): DcaOrder[] =>
    orders
      .map((order, index) => ({ order, index }))
      .sort((a, b) => {
        const aDrop = Number.parseFloat(a.order.dropPercent);
        const bDrop = Number.parseFloat(b.order.dropPercent);

        const aValid = Number.isFinite(aDrop);
        const bValid = Number.isFinite(bDrop);

        if (!aValid && !bValid) return a.index - b.index;
        if (!aValid) return 1;
        if (!bValid) return -1;

        return aDrop - bDrop || a.index - b.index;
      })
      .map(({ order }) => order);

  const addDcaOrder = async () => {
    const newId =
      dcaOrders.length > 0
        ? Math.max(...dcaOrders.map((order) => order.id)) + 1
        : 1;

    const dropPercent = String(dcaOrders.length + 1);

    setDcaOrders((orders) =>
      sortDcaOrders([
        ...orders,
        {
          id: newId,
          amount: "minQty",
          dropPercent,
        },
      ]),
    );


  };

  const removeDcaOrder = (id: number) => {
    setDcaOrders((orders) =>
      sortDcaOrders(orders.filter((order) => order.id !== id)),
    );
  };

  const updateDcaOrder = (
    id: number,
    field: "amount" | "dropPercent",
    value: string,
  ) => {
    setDcaOrders((orders) =>
      sortDcaOrders(
        orders.map((order) =>
          order.id === id
            ? { ...order, [field]: value }
            : order,
        ),
      ),
    );
  };

  const editDcaStrategy = (strategy: SavedDcaStrategy) => {
    const config = strategy.config;

    setEditingDcaConfigId(config.id);
    setBalanceMode(
      config.balance_mode === "live"
        ? "Live Mode"
        : "Test Mode",
    );
    setExchange(config.exchange_id);
    setExecutionMode(config.execution_mode);
    setSymbol(config.symbol);
    setInitialOrderAmount(config.initial_order_amount);
    setInitialOrderCurrency(config.initial_order_currency);
    setTakeProfit(config.take_profit_percent);
    setStopLoss(config.stop_loss_percent);

    setDcaOrders(
      sortDcaOrders(
        strategy.orders.map((order) => ({
          id: order.id,
          amount: order.amount,
          dropPercent: order.drop_percent,
        })),
      ),
    );

    setShowConfiguration(true);
    setActiveTab("create");
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
                      <span>Order amount</span>
                    </div>

                    <div className="strategy-config-field">
                      <label htmlFor="initial-order">
                        Order Amount ({initialOrderCurrency})
                      </label>
                      <input
                        id="initial-order"
                        type="text"
                        value={initialOrderAmount}
                        onChange={(event) => {
                          setInitialOrderAmount(event.target.value);
                                              }}
                      />
                    </div>
                  </div>

                  <div className="strategy-order-section">
                    <div className="strategy-order-title">
                      <h3>DCA Orders</h3>
                      <span>Trigger on price drop</span>
                    </div>

                    <div className="strategy-dca-list">
                      {sortDcaOrders(dcaOrders).map((order) => (
                        <div className="strategy-dca-row" key={order.id}>
                          <div className="strategy-dca-combined-field">
                            <div className="strategy-dca-combined-item">
                              <label htmlFor={`dca-amount-${order.id}`}>
                                Min Order Qty
                              </label>
                              <input
                                id={`dca-amount-${order.id}`}
                                type="number"
                                min="0"
                                step="0.01"
                                value={order.amount}
                                onChange={(event) =>
                                  updateDcaOrder(
                                    order.id,
                                    "amount",
                                    event.target.value,
                                  )
                                }
                                placeholder="Amount in USDT"
                              />
                            </div>

                            <div className="strategy-dca-combined-divider" />

                            <div className="strategy-dca-combined-item strategy-dca-drop">
                              <label htmlFor={`dca-drop-${order.id}`}>
                                Drop %
                              </label>
                              <input
                                id={`dca-drop-${order.id}`}
                                type="number"
                                min="0"
                                step="0.01"
                                value={order.dropPercent}
                                onChange={(event) =>
                                  updateDcaOrder(
                                    order.id,
                                    "dropPercent",
                                    event.target.value,
                                  )
                                }
                                placeholder="Drop"
                              />
                            </div>
                          </div>

                          <button
                            className="strategy-add-dca"
                            type="button"
                            onClick={() =>
                              dcaOrders[dcaOrders.length - 1]?.id === order.id
                                ? addDcaOrder()
                                : removeDcaOrder(order.id)
                            }
                            aria-label={
                              dcaOrders[dcaOrders.length - 1]?.id === order.id
                                ? "Add DCA order"
                                : "Remove DCA order"
                            }
                            title={
                              dcaOrders[dcaOrders.length - 1]?.id === order.id
                                ? "Add DCA order"
                                : "Remove DCA order"
                            }
                          >
                            {dcaOrders[dcaOrders.length - 1]?.id === order.id
                              ? "+"
                              : "−"}
                          </button>
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
                          value={takeProfit}
                        onChange={(event) => setTakeProfit(event.target.value)}
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
                          value={stopLoss}
                          onChange={(event) => setStopLoss(event.target.value)}
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
                        const isEditing =
                          editingDcaConfigId !== null;

                        const response = await fetch(
                          isEditing
                            ? `/api/strategies/dca?configId=${encodeURIComponent(
                                editingDcaConfigId,
                              )}`
                            : "/api/strategies/dca",
                          {
                            method: isEditing ? "PUT" : "POST",
                            headers: {
                              "Content-Type": "application/json",
                            },
                            body: JSON.stringify({
                              balanceMode,
                              exchange,
                              executionMode,
                              symbol,
                              initialOrderAmount,
                              initialOrderCurrency,
                              takeProfit,
                              stopLoss,
                              dcaOrders: sortDcaOrders(
                                dcaOrders,
                              ).map((order) => ({
                                amount: order.amount,
                                dropPercent: order.dropPercent,
                              })),
                            }),
                          },
                        );

                        const data = await response.json();

                        if (!response.ok) {
                          throw new Error(
                            data.error ||
                              (isEditing
                                ? "DCA configuration update failed"
                                : "DCA configuration save failed"),
                          );
                        }

                        const updatedStrategy =
                          data.strategy as SavedDcaStrategy;

                        if (isEditing) {
                          setSavedDcaStrategies((current) =>
                            current.map((strategy) =>
                              strategy.config.id ===
                              editingDcaConfigId
                                ? updatedStrategy
                                : strategy,
                            ),
                          );

                          console.log(
                            "[DCA] Strategy updated successfully:",
                            updatedStrategy,
                          );
                        } else {
                          setSavedDcaStrategies((current) => [
                            ...current,
                            updatedStrategy,
                          ]);

                          console.log(
                            "[DCA] Strategy saved successfully:",
                            updatedStrategy,
                          );
                        }

                        setEditingDcaConfigId(null);
                        setShowConfiguration(false);
                        setActiveTab("list");
                      } catch (error) {
                        console.error(
                          "[DCA CONFIGURATION SUBMIT]",
                          error,
                        );
                      }
                    }}
                  >
                    {editingDcaConfigId !== null
                      ? "Update Strategy"
                      : "Save Strategy"}
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
              {savedDcaStrategiesLoading ? (
                <div className="strategy-empty-state">
                  Loading saved DCA strategies...
                </div>
              ) : savedDcaStrategiesError ? (
                <div className="strategy-empty-state">
                  {savedDcaStrategiesError}
                </div>
              ) : savedDcaStrategies.length === 0 ? (
                <div className="strategy-empty-state">
                  No saved DCA strategies found.
                </div>
              ) : (
                <table className="strategy-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Symbol</th>
                      <th>Balance Mode</th>
                      <th>Exchange</th>
                      <th>Execution Mode</th>
                      <th>Initial Order</th>
                      <th>Take Profit</th>
                      <th>Stop Loss</th>
                      <th>DCA Orders</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {savedDcaStrategies.map((strategy, index) => (
                      <tr key={strategy.config.id}>
                        <td>{index + 1}</td>
                        <td>{strategy.config.symbol}</td>
                        <td>
                          {strategy.config.balance_mode === "live"
                            ? "Live Mode"
                            : "Test Mode"}
                        </td>
                        <td>
                          {strategy.config.exchange_id.toUpperCase()}
                        </td>
                        <td>{strategy.config.execution_mode}</td>
                        <td>
                          {strategy.config.initial_order_amount}{" "}
                          {strategy.config.initial_order_currency}
                        </td>
                        <td>
                          {strategy.config.take_profit_percent}%
                        </td>
                        <td>
                          {strategy.config.stop_loss_percent}%
                        </td>
                        <td>
                          <div className="strategy-dca-summary">
                            {strategy.orders.map((order) => (
                              <div
                                key={order.id}
                                className="strategy-dca-summary-row"
                              >
                                DCA {order.position}:{" "}
                                {order.amount} USDT @{" "}
                                {order.drop_percent}%
                              </div>
                            ))}
                          </div>
                        </td>
                        <td>
                          <div className="strategy-row-actions">
                            <button
                              className="strategy-icon-action edit"
                              type="button"
                              aria-label={`Edit strategy ${index + 1}`}
                              title="Edit"
                              onClick={() =>
                                editDcaStrategy(strategy)
                              }
                            >
                              <svg
                                viewBox="0 0 24 24"
                                aria-hidden="true"
                              >
                                <path d="M4 20h4L19.5 8.5a2.12 2.12 0 0 0 0-3L18.5 4.5a2.12 2.12 0 0 0-3 0L4 16v4Z" />
                                <path d="m14.5 5.5 4 4" />
                              </svg>
                            </button>
                            <button
                              className="strategy-icon-action remove"
                              type="button"
                              aria-label={`Remove strategy ${index + 1}`}
                              title="Remove"
                              onClick={async () => {
                                const confirmed =
                                  window.confirm(
                                    `Delete ${strategy.config.symbol} DCA strategy?`,
                                  );

                                if (!confirmed) {
                                  return;
                                }

                                try {
                                  const response =
                                    await fetch(
                                      `/api/strategies/dca?configId=${encodeURIComponent(
                                        strategy.config.id,
                                      )}`,
                                      {
                                        method: "DELETE",
                                      },
                                    );

                                  const data =
                                    await response.json();

                                  if (!response.ok) {
                                    throw new Error(
                                      data.error ||
                                        "Failed to delete DCA strategy",
                                    );
                                  }

                                  setSavedDcaStrategies(
                                    (current) =>
                                      current.filter(
                                        (item) =>
                                          item.config.id !==
                                          strategy.config.id,
                                      ),
                                  );
                                } catch (error) {
                                  console.error(
                                    "[DCA] Failed to delete strategy:",
                                    error,
                                  );

                                  window.alert(
                                    error instanceof Error
                                      ? error.message
                                      : "Failed to delete DCA strategy",
                                  );
                                }
                              }}
                            >
                              <svg
                                viewBox="0 0 24 24"
                                aria-hidden="true"
                              >
                                <path d="M4 7h16" />
                                <path d="M10 11v6M14 11v6" />
                                <path d="M6 7l1 13h10l1-13" />
                                <path d="M9 7V4h6v3" />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}
      </section>
    </main>
  );
}

