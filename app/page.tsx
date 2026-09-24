import BalanceModeToggle from "./components/balance-mode-toggle";
import Link from "next/link";
const stats = [
  { label: "Portfolio Value", value: "$24,680.42", change: "+4.82%", positive: true, icon: "◈" },
  { label: "Today's P&L", value: "+$428.16", change: "+1.77%", positive: true, icon: "↗" },
  { label: "Active Positions", value: "8", change: "3 strategies", positive: true, icon: "◎" },
  { label: "Orders Today", value: "42", change: "38 filled", positive: true, icon: "⌁" },
];

const strategies = [
  { name: "DCA Strategy", description: "Dollar Cost Averaging", status: "Active", icon: "DCA", active: true },
  { name: "Strategy 2", description: "Placeholder strategy", status: "Coming soon", icon: "S2", active: false },
  { name: "Strategy 3", description: "Placeholder strategy", status: "Coming soon", icon: "S3", active: false },
  { name: "Strategy 4", description: "Placeholder strategy", status: "Coming soon", icon: "S4", active: false },
  { name: "Strategy 5", description: "Placeholder strategy", status: "Coming soon", icon: "S5", active: false },
];

const positions = [
  { symbol: "BTC/USDT", strategy: "DCA", side: "LONG", amount: "$6,240.00", pnl: "+$186.42", positive: true },
  { symbol: "ETH/USDT", strategy: "DCA", side: "LONG", amount: "$4,180.50", pnl: "+$92.18", positive: true },
  { symbol: "SOL/USDT", strategy: "DCA", side: "LONG", amount: "$2,840.25", pnl: "-$34.62", positive: false },
  { symbol: "BNB/USDT", strategy: "DCA", side: "LONG", amount: "$1,925.80", pnl: "+$64.30", positive: true },
];

const activity = [
  { title: "BTC/USDT DCA order filled", detail: "Buy • 0.0024 BTC", time: "2 min ago", status: "success" },
  { title: "ETH/USDT DCA level reached", detail: "Level 3 • 3.0% drop", time: "8 min ago", status: "info" },
  { title: "SOL/USDT order submitted", detail: "Maker • 14.25 SOL", time: "14 min ago", status: "pending" },
  { title: "BNB/USDT position updated", detail: "Average price recalculated", time: "21 min ago", status: "success" },
];

export default function Home() {
  return (
    <main className="dashboard-shell">
      <aside className="sidebar">
        <nav className="navigation" aria-label="Main navigation">
          <div className="nav-label">Workspace</div>
          <a className="nav-item active" href="/">
            <span>⌂</span> Overview
          </a>
          <a className="nav-item" href="#">
            <span>◈</span> Exchanges
          </a>
          <a className="nav-item" href="#">
            <span>◇</span> Strategies
          </a>
          <a className="nav-item" href="#">
            <span>◎</span> Positions
          </a>
          <a className="nav-item" href="#">
            <span>⌁</span> Orders
          </a>

          <div className="nav-label nav-label-spaced">System</div>
          <a className="nav-item" href="#">
            <span>◌</span> Activity
          </a>
          <a className="nav-item" href="#">
            <span>⚙</span> Settings
          </a>
        </nav>

        <div className="sidebar-status">
          <div className="status-dot" />
          <div>
            <strong>System Operational</strong>
            <span>All services healthy</span>
          </div>
        </div>
      </aside>

      <section className="main-content">
        <header className="topbar">
          <div className="header-brand">
            <div className="brand-mark">T</div>
            <div>
              <strong>TradeNexus</strong>
              <span>Trading Platform</span>
            </div>
          </div>
          <div className="topbar-actions">
            <button className="icon-button" aria-label="Notifications">♢</button>
            <div className="account">
              <div className="avatar">ZI</div>
              <div className="account-copy">
                <strong>Trading Account</strong>
                <span>Live environment</span>
              </div>
              <span className="chevron">⌄</span>
            </div>
          </div>
        </header>

        <BalanceModeToggle />

        <section className="strategies-section" aria-label="Trading strategies">
          <div className="strategies-heading">
            <div>
              <p className="eyebrow">STRATEGIES</p>
              <h2>Trading Strategies</h2>
              <p className="strategies-subtitle">Select and manage your trading strategies.</p>
            </div>
            <span className="strategy-count">5 Strategies</span>
          </div>

          <div className="strategies-list">
            {strategies.map((strategy, index) => (
              <article
                className={strategy.active ? "strategy-list-card active" : "strategy-list-card"}
                key={strategy.name}
              >
                <div className={strategy.active ? "strategy-list-icon active" : "strategy-list-icon"}>
                  {strategy.icon}
                </div>

                <div className="strategy-list-info">
                  <div className="strategy-list-title">
                    <strong>{strategy.name}</strong>
                    {index === 0 && <span className="strategy-primary-badge">Primary</span>}
                  </div>
                  <span>{strategy.description}</span>
                </div>

                <div className={strategy.active ? "strategy-list-status active" : "strategy-list-status"}>
                  <span />
                  {strategy.status}
                </div>

                {strategy.active ? (
                  <Link className="strategy-action" href="/strategies/dca">
                    Manage
                    <span>→</span>
                  </Link>
                ) : (
                  <button
                    className="strategy-action disabled"
                    type="button"
                    disabled
                  >
                    Soon
                    <span>→</span>
                  </button>
                )}
              </article>
            ))}
          </div>
          <div className="all-strategies-link-wrap">
            <a className="all-strategies-link" href="/strategies">
              All Strategies <span>→</span>
            </a>
          </div>
        </section>

        <div className="content">
          <div className="page-heading">
            <div>
              <p className="eyebrow">OVERVIEW</p>
              <h1>Trading Dashboard</h1>
              <p className="subtitle">Monitor your strategies, positions and execution in one place.</p>
            </div>
            <div className="live-badge">
              <span />
              Live
            </div>
          </div>



          <section className="stats-grid" aria-label="Trading statistics">
            {stats.slice(1).map((stat) => (
              <article className="stat-card" key={stat.label}>
                <div className="stat-top">
                  <span className="stat-label">{stat.label}</span>
                  <span className="stat-icon">{stat.icon}</span>
                </div>
                <div className="stat-value">{stat.value}</div>
                <div className={stat.positive ? "stat-change positive" : "stat-change"}>
                  {stat.change}
                  <span className="change-context">
                    {stat.label === "Today's P&L" ? " today" : ""}
                  </span>
                </div>
              </article>
            ))}
          </section>

          <section className="main-grid">
            <article className="panel positions-panel">
              <div className="panel-header">
                <div>
                  <h2>Active Positions</h2>
                  <p>Currently running trading positions</p>
                </div>
                <a href="#" className="view-link">View all <span>→</span></a>
              </div>

              <div className="position-list">
                {positions.map((position) => (
                  <div className="position-row" key={position.symbol}>
                    <div className="asset">
                      <div className="coin-icon">{position.symbol.charAt(0)}</div>
                      <div>
                        <strong>{position.symbol}</strong>
                        <span>{position.strategy} • {position.side}</span>
                      </div>
                    </div>
                    <div className="position-amount">
                      <strong>{position.amount}</strong>
                      <span>Position value</span>
                    </div>
                    <div className={position.positive ? "position-pnl positive" : "position-pnl negative"}>
                      {position.pnl}
                    </div>
                  </div>
                ))}
              </div>
            </article>

            <article className="panel strategy-panel">
              <div className="panel-header">
                <div>
                  <h2>Strategies</h2>
                  <p>Strategy activity</p>
                </div>
                <a href="#" className="view-link">Manage <span>→</span></a>
              </div>

              <div className="strategy-card">
                <div className="strategy-icon">DCA</div>
                <div className="strategy-info">
                  <strong>Dollar Cost Averaging</strong>
                  <span>5 active symbols</span>
                </div>
                <div className="running">
                  <span />
                  Running
                </div>
              </div>

              <div className="strategy-metrics">
                <div>
                  <span>Active cycles</span>
                  <strong>8</strong>
                </div>
                <div>
                  <span>Orders today</span>
                  <strong>42</strong>
                </div>
                <div>
                  <span>Win rate</span>
                  <strong>78.4%</strong>
                </div>
              </div>
            </article>
          </section>

          <section className="bottom-grid">
            <article className="panel">
              <div className="panel-header">
                <div>
                  <h2>Recent Activity</h2>
                  <p>Latest execution events</p>
                </div>
                <a href="#" className="view-link">Activity log <span>→</span></a>
              </div>

              <div className="activity-list">
                {activity.map((item) => (
                  <div className="activity-row" key={item.title}>
                    <div className={`activity-indicator ${item.status}`} />
                    <div className="activity-copy">
                      <strong>{item.title}</strong>
                      <span>{item.detail}</span>
                    </div>
                    <time>{item.time}</time>
                  </div>
                ))}
              </div>
            </article>

            <article className="panel health-panel">
              <div className="panel-header">
                <div>
                  <h2>System Health</h2>
                  <p>Connected services</p>
                </div>
                <span className="healthy-label">Healthy</span>
              </div>

              <div className="health-list">
                <div className="health-row">
                  <span>Exchange connectivity</span>
                  <strong><i />Operational</strong>
                </div>
                <div className="health-row">
                  <span>Database</span>
                  <strong><i />Operational</strong>
                </div>
                <div className="health-row">
                  <span>Strategy engine</span>
                  <strong><i />Operational</strong>
                </div>
                <div className="health-row">
                  <span>Order execution</span>
                  <strong><i />Operational</strong>
                </div>
              </div>
            </article>
          </section>

          <footer className="dashboard-footer">
            <span>TradeNexus</span>
            <span>Dashboard • Live data integration coming next</span>
          </footer>
        </div>
      </section>

      <nav className="mobile-nav" aria-label="Mobile navigation">
        <a className="mobile-nav-item active" href="/"><span>⌂</span>Home</a>
        <a className="mobile-nav-item" href="#"><span>◎</span>Positions</a>
        <a className="mobile-nav-item" href="#"><span>⌁</span>Orders</a>
        <a className="mobile-nav-item" href="#"><span>◇</span>Strategies</a>
        <a className="mobile-nav-item" href="#"><span>⚙</span>More</a>
      </nav>
    </main>
  );
}
