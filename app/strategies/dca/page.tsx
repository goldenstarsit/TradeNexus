"use client";

import { useState } from "react";

type Tab = "create" | "list";

type DcaOrder = {
  id: number;
  dropPercent: string;
};

const exchangeSymbols: Record<string, string[]> = {
  Binance: ["BTCUSDT", "ETHUSDT", "BNBUSDT", "SOLUSDT", "XRPUSDT"],
  MEXC: ["BTCUSDT", "ETHUSDT", "BNBUSDT", "SOLUSDT", "TRXUSDT"],
  HTX: ["BTCUSDT", "ETHUSDT", "SOLUSDT", "TRXUSDT", "DOGEUSDT"],
};

export default function DcaStrategyPage() {
  const [activeTab, setActiveTab] = useState<Tab>("create");
  const [showConfiguration, setShowConfiguration] = useState(false);
  const [balanceMode, setBalanceMode] = useState("Live Mode");
  const [exchange, setExchange] = useState("Binance");
  const [executionMode, setExecutionMode] = useState("Maker Only");
  const [symbol, setSymbol] = useState(exchangeSymbols.Binance[0]);
  const [dcaOrders, setDcaOrders] = useState<DcaOrder[]>([
    { id: 1, dropPercent: "" },
  ]);

  const handleExchangeChange = (value: string) => {
    setExchange(value);
    setSymbol(exchangeSymbols[value][0]);
  };

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
                      <option>Binance</option>
                      <option>MEXC</option>
                      <option>HTX</option>
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
                    >
                      {exchangeSymbols[exchange].map((item) => (
                        <option key={item}>{item}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="strategy-order-config">
                  <div className="strategy-order-section">
                    <div className="strategy-order-title">
                      <h3>Initial Order</h3>
                      <span>Minimum allowed</span>
                    </div>

                    <div className="strategy-config-field">
                      <label htmlFor="initial-order">Order Amount</label>
                      <input
                        id="initial-order"
                        type="number"
                        min="0"
                        placeholder={
                          exchange === "Binance"
                            ? "Minimum allowed: 10 USDT"
                            : exchange === "MEXC"
                              ? "Minimum allowed: 1 USDT"
                              : "Minimum allowed: 5 USDT"
                        }
                      />
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
                            <label htmlFor={`dca-${order.id}`}>
                              DCA Order {order.id}
                            </label>
                            <div className="strategy-input-suffix">
                              <input
                                id={`dca-${order.id}`}
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
                                placeholder="Price drop %"
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
                      configured percentage.
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
