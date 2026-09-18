# TradeNexus Exchange Architecture

## Purpose

TradeNexus uses an exchange abstraction layer so application code can work with multiple exchanges through common contracts.

The current exchange foundation supports Binance, MEXC, and HTX. Exchange-specific API details are isolated inside their respective plugins.

The exchange abstraction is intentionally independent of trading strategy and execution strategy.

Maker-only, taker-only, and hybrid execution policies belong to a later execution layer and are not part of the current Exchange Module.

## Architecture

The Exchange Module is organized around common contracts and exchange-specific plugins.

Application code communicates with the common Exchange abstraction.

The Exchange Plugin Registry and Loader manage exchange plugins.

The current supported exchange plugins are:

- Binance
- MEXC
- HTX

Each plugin contains exchange-specific implementations for market data, accounts, orders, fills, history, and WebSocket communication.

## Public Exchange API

The public Exchange entrypoint is:

`src/exchange/index.ts`

It exports the common exchange abstractions and infrastructure without requiring callers to know the internal directory structure.

The public Exchange API includes:

- domain models
- capabilities
- configuration and secrets
- HTTP client
- market data
- symbol rules
- symbol mapping
- balances
- orders
- fills
- order types
- order safety
- account management
- order and trade history
- cancel-replace
- WebSocket contracts
- plugin contracts
- plugin registry and loader
- health monitoring
- failover and recovery


## ExchangePlugin

`src/exchange/plugin/exchangePlugin.ts`

`ExchangePlugin` is the primary exchange integration contract.

An exchange plugin exposes:

- exchange metadata
- exchange capabilities
- symbols
- ticker data
- order books
- balances
- open orders
- individual orders
- order placement
- order cancellation
- cancellation of all orders

The common contract prevents application code from depending directly on Binance, MEXC, or HTX APIs.

## Capabilities

`src/exchange/capabilities/exchangeCapabilities.ts`

Capabilities describe exchange features independently from implementation details.

Current capability categories include:

- spot
- futures
- market orders
- limit orders
- maker-only orders
- cancel-replace
- order book
- WebSocket market data
- WebSocket user data
- balances
- order history
- trade history
- rate limits

Plugin registration validates consistency between declared market types and their corresponding capabilities.

Capabilities describe exchange support. They do not select a trading or execution strategy.

## Configuration and Secrets

Exchange configuration is defined independently from exchange implementation.

Configuration contains validated exchange settings such as:

- exchange identifier
- enabled or disabled state
- base URL
- supported market types

Credentials are represented through the exchange secrets abstraction and are validated without exposing secret values through the common domain model.

Secrets must not be committed to source control.

## HTTP Abstraction

`src/exchange/http/exchangeHttpClient.ts`

The common HTTP client isolates transport behavior from exchange-specific API implementations.

Responsibilities include:

- HTTP method validation
- base URL validation
- relative-path enforcement
- query validation
- header validation
- request timeout
- JSON request serialization
- JSON and text response parsing
- network error mapping
- timeout mapping
- authentication error mapping
- rate-limit error mapping
- HTTP error mapping

Exchange plugins use this abstraction instead of duplicating common HTTP behavior.


## Market Data

`src/exchange/market-data/marketData.ts`

Common market-data models include:

- `MarketTicker`
- `OrderBook`
- `OrderBookLevel`
- `MarketTrade`

Common factories normalize symbols, validate numeric values, validate timestamps, sort order-book levels, and reject crossed spreads.

Exchange-specific market-data adapters convert native exchange responses into these common models.

## Symbol Rules

`src/exchange/symbol-rules/`

Symbol rules represent exchange trading constraints such as:

- minimum quantity
- maximum quantity
- quantity step
- minimum notional
- maximum notional
- price tick size

Validation and rounding remain exchange-agnostic after native exchange rules have been mapped into the common model.

## Symbol Mapping

`src/exchange/symbol-mapping/`

The symbol mapping layer separates a canonical TradeNexus symbol from an exchange-specific symbol.

A mapping contains:

- canonical symbol
- exchange identifier
- exchange symbol
- market type

Mappings are independently maintained for each exchange and market type.

The same logical TradeNexus symbol can therefore be represented by different native symbols on different exchanges.

## Balance

`src/exchange/balance/`

The common balance model represents:

- asset
- free balance
- locked balance

A `BalanceSnapshot` also records the exchange and timestamp.

The abstraction provides normalized balance lookup and total and available balance calculations.

## Orders

`src/exchange/order/`

The common `Order` model contains:

- order ID
- client order ID
- exchange
- symbol
- side
- order type
- status
- price
- quantity
- executed quantity
- remaining quantity
- creation timestamp
- update timestamp

Common order statuses include:

- new
- open
- partially filled
- filled
- canceled
- rejected
- expired

Exchange-specific status values must be mapped into this common model.


## Order Types

`src/exchange/order-type/`

The common order-type abstraction currently covers:

- market
- limit
- maker-only
- stop-market
- stop-limit

Order-type definitions specify structural requirements such as whether price or stop price is required.

Execution policy is intentionally outside this abstraction.

## Order Safety

`src/exchange/order-safety/`

Order safety validates an order against common symbol rules and order-type requirements before an exchange request is sent.

Validation includes:

- symbol consistency
- side validity
- order-type validity
- quantity limits
- price requirements
- stop-price requirements
- tick-size alignment
- notional limits
- maximum quantity
- maximum notional

The safety layer validates orders; it does not decide whether an order should be maker-only, taker-only, or hybrid.

## Fills and Trades

`src/exchange/fill/`

The common fill model represents executed trade information including:

- fill ID
- order ID
- exchange
- symbol
- side
- price
- quantity
- quote quantity
- fee
- fee asset
- timestamp

Exchange-specific trade responses are mapped into this common model.

## Order and Trade History

`src/exchange/history/`

Two common contracts are provided:

- `ExchangeOrderHistoryClient`
- `ExchangeTradeHistoryClient`

Common history queries support normalized fields such as:

- symbol
- order ID
- client order ID
- statuses
- start time
- end time
- limit

Exchange plugins may reject filters that their native API does not support rather than silently ignoring them.

Current exchange history adapters:

- Binance
- MEXC
- HTX

## Cancel-Replace

`src/exchange/cancel-replace/`

The common cancel-replace abstraction represents:

- existing order ID
- symbol
- replacement `ExchangeOrderRequest`

The replacement symbol must match the cancel-replace symbol.

The abstraction only defines the exchange capability contract. It does not implement a trading strategy.

## WebSocket

`src/exchange/websocket/`

The common WebSocket contract provides:

- connect
- subscribe
- unsubscribe
- send
- message listeners
- error listeners
- close
- connection state

Current exchange WebSocket implementations:

- Binance
- MEXC
- HTX


## Account Abstraction

`src/exchange/account/`

The account abstraction provides common balance access through exchange-specific account clients.

The account manager allows multiple exchange accounts to be registered and queried without exposing exchange-specific credential or API details to higher layers.

## Plugin Registry

`src/exchange/plugin/exchangePluginRegistry.ts`

The registry:

- validates plugins
- prevents duplicate exchange registration
- validates exchange IDs
- validates required plugin methods
- validates capability exchange IDs
- validates market-type and capability consistency
- provides plugin lookup and enumeration

## Plugin Loader

`src/exchange/plugin/exchangePluginLoader.ts`

The loader creates exchange plugins from supported exchange IDs and can load a selected set of exchanges into a registry.

Current supported exchanges:

- Binance
- MEXC
- HTX

## Health and Failover

`src/exchange/health/`

The health abstraction monitors exchange availability and response behavior.

`src/exchange/failover/`

The failover abstraction manages exchange availability state and recovery behavior.

These abstractions provide infrastructure for multi-exchange reliability. They do not determine trading strategy.

## Exchange Error Model

`src/exchange/domain/exchangeError.ts`

`ExchangeError` provides a common error representation with:

- exchange
- stable error code
- message
- optional original cause

Current error categories include:

- network error
- timeout
- authentication error
- rate limit
- invalid request
- exchange error
- unknown error

Exchange-specific errors should be mapped into these common categories where possible.


## Dependency Direction

The intended dependency direction is:

Application
  |
  v
Common Exchange Abstraction
  |
  v
Exchange Plugin
  |
  v
Exchange-specific API / Transport

Common exchange contracts must not depend on Binance, MEXC, or HTX-specific response formats.

Exchange-specific implementations are responsible for translating native API models into common TradeNexus models.

## Exchange Plugin Rules

A new exchange plugin should:

1. define exchange metadata
2. define supported capabilities
3. implement the `ExchangePlugin` contract
4. implement required exchange-specific clients
5. map native market data into common models
6. map native symbol rules into common rules
7. map balances into the common balance model
8. map orders into the common order model
9. map fills into the common fill model
10. implement supported history operations
11. implement supported WebSocket operations
12. add exchange-specific tests
13. register the plugin with the loader
14. pass the complete Exchange verification suite

A plugin must not modify common contracts merely to expose an exchange-specific response format.

## Execution Strategy Boundary

Execution strategy is deliberately outside the Exchange Module abstraction.

The Exchange Module provides exchange capabilities and safe order contracts.

Future execution layers may implement policies such as:

- maker-only execution
- taker execution
- hybrid execution

Those policies must consume the Exchange abstraction rather than being embedded inside exchange plugins.

## Testing

Exchange tests are located under:

`src/exchange/**/__tests__/`

The Exchange verification suite covers:

- common domain contracts
- capabilities
- configuration
- HTTP
- market data
- symbol rules
- symbol mapping
- balances
- orders
- fills
- order types
- order safety
- account abstraction
- history
- cancel-replace
- WebSocket abstraction
- plugin registry
- plugin loading
- health monitoring
- failover
- Binance
- MEXC
- HTX

The current Exchange verification suite has 130 passing tests.

## Current Status

The Exchange Module and Exchange Abstraction have been completed and verified.

Current verification:

- Exchange tests: 130/130 passing
- Exchange TypeScript errors: 0
- Root Exchange API: verified
- Git diff check: clean
- Working tree: clean
- Local `main` synchronized with `origin/main`

The public Exchange entrypoint is:

`src/exchange/index.ts`

The Exchange Module is intentionally kept independent from the later Trading Engine Integration milestones.
