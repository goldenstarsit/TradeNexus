"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type BalanceMode = "live" | "test";
type Exchange = "binance" | "mexc" | "htx";

const exchanges: Array<[Exchange, string, string, string]> = [
  ["binance", "Binance", "B", "binance"],
  ["mexc", "MEXC", "M", "mexc"],
  ["htx", "HTX", "H", "htx"],
];

function accountIdFor(exchange: Exchange) {
  return `${exchange}:dashboard-test`;
}

function formatUsdt(value: number) {
  return `${value.toLocaleString("en-US", {
    minimumFractionDigits: 8,
    maximumFractionDigits: 8,
  })} USDT`;
}

export default function BalanceModeToggle() {
  const router = useRouter();

  const [mode, setMode] = useState<BalanceMode>("live");

  const [testBalances, setTestBalances] = useState<Record<Exchange, number>>({
    binance: 0,
    mexc: 0,
    htx: 0,
  });

  const [liveBalances, setLiveBalances] = useState<Record<Exchange, number>>({
    binance: 0,
    mexc: 0,
    htx: 0,
  });

  const [liveLoading, setLiveLoading] = useState(false);
  const [error, setError] = useState("");

  const isLive = mode === "live";

  const testTotal =
    testBalances.binance +
    testBalances.mexc +
    testBalances.htx;

  const liveTotal =
    liveBalances.binance +
    liveBalances.mexc +
    liveBalances.htx;

  async function loadTestBalances() {
    try {
      setError("");

      const response = await fetch("/api/test-balance-totals", {
        cache: "no-store",
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error ?? "Failed to load test balance totals",
        );
      }

      if (!result || !Array.isArray(result.balances)) {
        throw new Error("Invalid test balance totals response");
      }

      const totals: Record<Exchange, number> = {
        binance: 0,
        mexc: 0,
        htx: 0,
      };

      for (const balance of result.balances) {
        if (
          balance &&
          typeof balance.exchange === "string" &&
          typeof balance.totalUsdt === "number"
        ) {
          const exchange = balance.exchange as Exchange;

          if (exchange in totals) {
            totals[exchange] = balance.totalUsdt;
          }
        }
      }

      setTestBalances(totals);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Failed to load test balances",
      );
    }
  }

  async function loadLiveBalances() {
    try {
      setLiveLoading(true);
      setError("");

      const response = await fetch("/api/live-balance-totals", {
        cache: "no-store",
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error ?? "Failed to load live balance totals",
        );
      }

      if (!result || !Array.isArray(result.balances)) {
        throw new Error("Invalid live balance totals response");
      }

      const totals: Record<Exchange, number> = {
        binance: 0,
        mexc: 0,
        htx: 0,
      };

      for (const balance of result.balances) {
        if (
          balance &&
          typeof balance.exchange === "string" &&
          typeof balance.totalUsdt === "number"
        ) {
          const exchange = balance.exchange as Exchange;

          if (exchange in totals) {
            totals[exchange] = balance.totalUsdt;
          }
        }
      }

      setLiveBalances(totals);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Failed to load live balances",
      );
    } finally {
      setLiveLoading(false);
    }
  }

  useEffect(() => {
    if (isLive) {
      void loadLiveBalances();

      const interval = window.setInterval(() => {
        void loadLiveBalances();
      }, 5000);

      return () => {
        window.clearInterval(interval);
      };
    }

    void loadTestBalances();

    const interval = window.setInterval(() => {
      void loadTestBalances();
    }, 5000);

    return () => {
      window.clearInterval(interval);
    };
  }, [isLive]);

  return (
    <section
      className="balance-header"
      aria-label={
        isLive
          ? "Live exchange balances"
          : "Test balance section"
      }
    >
      <div className="balance-primary">
        <div className="balance-value-row">
          <div className="balance-value-content">
            <div className="balance-label">
              <span className="portfolio-pulse" />
              {isLive ? "LIVE BALANCE" : "TEST BALANCE"}
            </div>

            <div className="balance-value">
              {isLive
                ? formatUsdt(liveTotal)
                : formatUsdt(testTotal)}
            </div>

            <div className="balance-change">
              {isLive ? (
                <span>USDT value of all live exchange balances</span>
              ) : (
                <>
                  <span>↗ $0.00</span>
                  <strong>0.00%</strong>
                  <small>Today</small>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="balance-exchanges">
        {isLive
          ? exchanges.map(
              ([exchangeId, name, logo, logoClass]) => (
                <div
                  className="balance-exchange"
                  key={exchangeId}
                >
                  <div
                    className={`exchange-logo ${logoClass}`}
                  >
                    {logo}
                  </div>

                  <div>
                    <span>{name}</span>
                    <strong>
                      {formatUsdt(liveBalances[exchangeId])}
                    </strong>
                  </div>
                </div>
              ),
            )
          : exchanges.map(
              ([exchangeId, name, logo, logoClass]) => (
                <div
                  className="balance-exchange"
                  key={exchangeId}
                >
                  <div
                    className={`exchange-logo ${logoClass}`}
                  >
                    {logo}
                  </div>

                  <div>
                    <span>{name}</span>
                    <strong>
                      {formatUsdt(testBalances[exchangeId])}
                    </strong>
                  </div>
                </div>
              ),
            )}
      </div>

      <div className="balance-test-actions">
        <button
          type="button"
          className={`balance-mode-toggle ${
            isLive ? "live" : "test"
          }`}
          onClick={() => router.push("/balances")}
          aria-label={
            isLive
              ? "Open live balance"
              : "Open test balance"
          }
          title={
            isLive
              ? "Open Live Balance"
              : "Open Test Balance"
          }
        >
          <span
            className="balance-mode-icon"
            aria-hidden="true"
          >
            $
          </span>
        </button>

        <button
          type="button"
          className={`balance-mode-toggle ${
            isLive ? "live" : "test"
          }`}
          onClick={() =>
            setMode(isLive ? "test" : "live")
          }
          aria-label={
            isLive
              ? "Switch to test balance"
              : "Switch to live balance"
          }
          title={
            isLive
              ? "Switch to Test Balance"
              : "Switch to Live Balance"
          }
        >
          <span
            className="balance-mode-icon"
            aria-hidden="true"
          >
            {isLive ? "T" : "L"}
          </span>
        </button>
      </div>
    </section>
  );
}
