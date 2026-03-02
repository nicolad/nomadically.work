// ═══════════════════════════════════════════════════════════════════════════
// MODULE: nautilus — NautilusTrader domain knowledge for integration workflows
// ═══════════════════════════════════════════════════════════════════════════
//
// Comprehensive reference extracted from:
//   https://github.com/nautechsystems/nautilus_trader/tree/develop/docs
//
// Injected into SDD phase prompts when workflow_type == "nautilus_trader_integration"
// so the DeepSeek agents have full domain context for designing and implementing
// integrations against the NautilusTrader platform.
// ═══════════════════════════════════════════════════════════════════════════

/// Full NautilusTrader documentation reference, injected as system context.
pub const NAUTILUS_TRADER_DOCS: &str = r#"
# NautilusTrader — Complete Integration Reference

NautilusTrader is an open-source, high-performance, production-grade algorithmic trading platform.
Core written in Rust with a Python API. Backtest and deploy **identical strategy code** live.
Asset-class agnostic: FX, Equities, Futures, Options, Crypto, DeFi, Betting.

Repo: https://github.com/nautechsystems/nautilus_trader (develop branch)

## Architecture

- **Domain-Driven Design (DDD)** — trading concepts as first-class domain objects
- **Event-Driven Architecture** — all state changes flow through events
- **Hexagonal Architecture (Ports and Adapters)** — venue adapters translate raw APIs to unified interface
- **Pub/Sub Messaging** — MessageBus decouples all components
- **Crash-Only Design** — startup and crash recovery share the same code path

Quality priorities: Reliability > Performance > Modularity > Testability > Maintainability > Deployability.

### Core Components

| Component | Role |
|-----------|------|
| NautilusKernel | Central orchestrator; initializes all components |
| MessageBus | Inter-component communication (Pub/Sub, Request/Response, point-to-point). Optional Redis backing |
| Cache | High-performance in-memory store for instruments, accounts, orders, positions (default: 10k ticks/bars per instrument) |
| DataEngine | Processes and routes market data to subscribers |
| ExecutionEngine | Manages order lifecycle, routes commands to adapters |
| RiskEngine | Pre-trade risk checks (price precision, quantity, notional limits) |
| Portfolio | Tracks all positions; provides PnL, net exposure, currency conversion |

### Threading Model

Single-thread for deterministic event ordering (MessageBus, strategy logic, risk, execution, cache).
Background services (network I/O, persistence, adapter async) use separate threads via Tokio.
**Only one TradingNode or BacktestNode per process** (shared global state).

### Three Contexts

| Context | Description |
|---------|-------------|
| Backtest | Historical data + simulated venues (BacktestEngine or BacktestNode) |
| Sandbox | Real-time data + simulated venues |
| Live | Real-time data + live venues (TradingNode) |

## Strategy API

```python
from nautilus_trader.trading.strategy import Strategy
from nautilus_trader.config import StrategyConfig

class MyStrategyConfig(StrategyConfig):
    bar_type: str
    fast_period: int = 10
    slow_period: int = 20

class MyStrategy(Strategy):
    def __init__(self, config: MyStrategyConfig) -> None:
        super().__init__(config)

    def on_start(self) -> None:
        self.subscribe_bars(BarType.from_str(self.config.bar_type))

    def on_bar(self, bar: Bar) -> None:
        # Trading logic
        order = self.order_factory.limit(
            instrument_id=instrument.id,
            order_side=OrderSide.BUY,
            quantity=instrument.make_qty(1.0),
            price=instrument.make_price(bar.close),
        )
        self.submit_order(order)

    def on_order_filled(self, event: OrderFilled) -> None:
        pass  # Handle fills

    def on_stop(self) -> None:
        self.cancel_all_orders()
```

Key methods: submit_order(), modify_order(), cancel_order(), cancel_all_orders(),
subscribe_bars(), subscribe_quote_ticks(), subscribe_trade_ticks(), request_bars(),
self.cache.*, self.portfolio.*, self.clock.*.

## Actor API

Lighter-weight component for data processing without order management:

```python
class MyActor(Actor):
    def on_start(self) -> None:
        self.subscribe_bars(bar_type)
    def on_bar(self, bar: Bar) -> None:
        self.publish_signal("my_signal", bar.close)
```

Lifecycle: PRE_INITIALIZED → READY → STARTING → RUNNING → STOPPING → DISPOSED
Handlers: on_start(), on_stop(), on_reset(), on_bar(), on_quote_tick(), on_trade_tick(),
on_order_book_delta(), on_historical_data(), on_degrade(), on_fault().

System access: self.cache, self.portfolio, self.clock, self.log, self.msgbus.

## Data Types

Market data: OrderBookDelta (L1/L2/L3), OrderBookDepth10, QuoteTick, TradeTick, Bar (OHLCV),
MarkPriceUpdate, IndexPriceUpdate, FundingRateUpdate, InstrumentStatus, InstrumentClose.

Bar aggregation: Time-based (MILLISECOND..YEAR), threshold-based (TICK, VOLUME, VALUE, RENKO),
information-driven (TICK_IMBALANCE, VOLUME_IMBALANCE, VALUE_IMBALANCE, TICK_RUNS, etc.).

Instruments: Equity, CurrencyPair, Commodity, IndexInstrument, FuturesContract, FuturesSpread,
CryptoFuture, CryptoPerpetual, PerpetualContract, OptionContract, OptionSpread, CryptoOption,
BinaryOption, CFD, BettingInstrument, SyntheticInstrument.

Timestamps: Nanosecond UTC precision (ts_event = when occurred, ts_init = when created).

## Order Types & Execution

9 order types: Market, Limit, Stop-Market, Stop-Limit, Market-To-Limit, Market-If-Touched,
Limit-If-Touched, Trailing-Stop-Market, Trailing-Stop-Limit.

Time in force: GTC, IOC, FOK, GTD, DAY, AT_THE_OPEN, AT_THE_CLOSE.
Execution instructions: post-only, reduce-only, iceberg (display quantity).
Contingency: OTO, OCO, OUO, Bracket orders.
Order emulation: Use order types a venue doesn't natively support.
OMS types: NETTING (single position/instrument) or HEDGING (multiple long/short).

Execution flow: Strategy → OrderEmulator (optional) → ExecAlgorithm (optional) → RiskEngine → ExecutionEngine → ExecutionClient → Venue.
Built-in ExecAlgorithm: TWAP. Custom via subclass of ExecAlgorithm.

## Backtesting

Two API levels:
- BacktestEngine (low-level): Data fits in RAM, fine-grained control
- BacktestNode (high-level): Multiple engines, ParquetDataCatalog, streaming

Fill modeling: L2/L3 walks the book; L1 uses simulated single-level book.
Fill models: FillModel (base), BestPriceFillModel, ThreeTierFillModel, custom.
Bars → Open→High→Low→Close with adaptive ordering (~75-85% accuracy).
Account types: Cash (spot), Margin (derivatives), Betting.
Margin models: StandardMarginModel, LeveragedMarginModel.

## Live Trading (TradingNodeConfig)

```python
config = TradingNodeConfig(
    trader_id="LIVE-001",
    cache=CacheConfig(...),
    data_clients={"BINANCE": BinanceDataClientConfig(...)},
    exec_clients={"BINANCE": BinanceExecClientConfig(...)},
    timeout_connection=30.0,
    timeout_reconciliation=10.0,
    timeout_portfolio=10.0,
)
node = TradingNode(config=config)
node.add_data_client_factory("BINANCE", BinanceLiveDataClientFactory)
node.add_exec_client_factory("BINANCE", BinanceLiveExecClientFactory)
node.build()
node.run()
```

Reconciliation: Aligns internal state with venue reality. Continuous loop monitors in-flight orders.
Memory management: Configurable purging of closed orders/positions for long-running systems.
Multi-venue: Separate data/exec clients per venue in a single node.

## Building Custom Adapters (Integration Pattern)

Two-layer architecture:

### Rust Core (`crates/adapters/your_adapter/`)
- HttpClient — REST API with auth, signing, rate limiting
- WebSocketClient — Real-time streaming with orchestrator/handler
- PyO3 bindings to Python

### Python Layer (`nautilus_trader/adapters/your_adapter/`)
- InstrumentProvider — converts venue instruments to Nautilus types (load_all_async, load_ids_async, load_async)
- LiveDataClient / LiveMarketDataClient — market data subscriptions and historical requests
- LiveExecutionClient — order lifecycle (submit, modify, cancel, reconciliation)
- Configuration classes and factory functions

Implementation phases:
1. Rust core infrastructure (HTTP + WebSocket clients)
2. Instrument definitions
3. Market data
4. Order execution
5. Advanced features (order types, conditional orders)
6. Configuration/factories
7. Testing/documentation

### Key Interfaces to Implement

**InstrumentProvider**: `load_all_async()`, `load_ids_async()`, `load_async(instrument_id)`
**DataClient**: `subscribe()`, `unsubscribe()`, `request()` for bars, quotes, trades, order book
**ExecutionClient**: `submit_order()`, `modify_order()`, `cancel_order()`, `generate_order_status_report()`, `generate_fill_reports()`

## MessageBus

Three patterns: Point-to-Point, Pub/Sub, Request/Response.
Publishing: self.msgbus.publish("topic", message), self.publish_data(type, data), self.publish_signal(name, value).
External backing: Redis for persistence. Serialization through separate thread.

## Cache API

```python
self.cache.bars(bar_type)           # All cached bars
self.cache.bar(bar_type, index=0)   # Most recent (reverse indexing)
self.cache.quote_tick(instrument_id)
self.cache.trade_tick(instrument_id)
self.cache.order(client_order_id)
self.cache.orders_open()
self.cache.position(position_id)
self.cache.add(key, value)          # Custom data storage
```

## Data Catalog (ParquetDataCatalog)

Dual backends: Rust (core types, high-performance) and PyArrow (custom types, flexible).
Storage: local filesystem, S3, GCS, Azure blob.

## Existing Integrations (15 total)

| Integration | Type | Status |
|------------|------|--------|
| AX Exchange | Perpetuals | Beta |
| Betfair | Sports Betting | Stable |
| Binance | Crypto CEX (Spot/Futures) | Stable |
| BitMEX | Crypto CEX | Stable |
| Bybit | Crypto CEX | Stable |
| Databento | Data Provider | Stable |
| Deribit | Crypto CEX | Beta |
| dYdX | Crypto DEX | Beta |
| Hyperliquid | Crypto DEX | Beta |
| Interactive Brokers | Brokerage | Stable |
| Kraken | Crypto CEX | Beta |
| OKX | Crypto CEX | Stable |
| Polymarket | Prediction Market | Stable |
| Tardis | Crypto Data | Stable |

## Installation

```bash
pip install -U nautilus_trader
# With extras:
pip install "nautilus_trader[ib,docker]"
```

Python 3.12-3.14, Linux (x86_64/ARM64), macOS (ARM64), Windows (x86_64).
Dev setup: Rust toolchain + Clang + uv + Cap'n Proto. `uv sync --all-extras`.

## FFI Layer (Rust-Python Bridge)

C-compatible types via PyO3. CVec pattern: Rust builds/leaks a vector, foreign code uses it,
then calls type-specific drop helper exactly once. All exported symbols wrapped in abort_on_panic.

## Key Patterns for Integrations

1. Configuration-based: All components use *Config dataclasses
2. Factory pattern: *LiveDataClientFactory, *LiveExecClientFactory for TradingNode registration
3. Instrument normalization: Map venue-specific instrument data to Nautilus types
4. WebSocket management: Orchestrator pattern with reconnection handling
5. Rate limiting: Token bucket implementation per venue
6. Reconciliation: Align internal state with venue on startup and continuously
7. Serialization: Register custom types for Arrow/catalog persistence
"#;

/// Phase-specific NT context injected into system prompts
pub fn nt_phase_context(phase: &str) -> &'static str {
    match phase {
        "explore" => r#"
NAUTILUS TRADER INTEGRATION CONTEXT:
When exploring, focus on:
- Which NautilusTrader adapter pattern fits (Data-only, Execution-only, or Full adapter)
- Target venue/service API capabilities and rate limits
- Instrument types needed (check NT's supported instrument list)
- Data types available (L1/L2/L3 book, trades, bars, custom)
- Order types the venue supports vs what NT can emulate
- WebSocket vs REST vs FIX for real-time data
- Authentication and signing requirements
- Existing similar adapters to use as reference (e.g., Binance for CEX, IB for traditional)
"#,
        "propose" => r#"
NAUTILUS TRADER INTEGRATION CONTEXT:
When proposing, structure around the NT adapter implementation phases:
1. Rust core (HTTP client, WebSocket client, PyO3 bindings)
2. Instrument definitions and provider
3. Market data client
4. Execution client
5. Advanced features (conditional orders, etc.)
6. Configuration and factories
7. Tests and documentation
Identify which existing adapter is closest and can serve as a template.
"#,
        "spec" => r#"
NAUTILUS TRADER INTEGRATION CONTEXT:
When writing specs, ensure requirements cover:
- InstrumentProvider: load_all_async(), load_ids_async(), load_async()
- DataClient: subscribe/unsubscribe for bars, quotes, trades, order book
- ExecutionClient: submit_order, modify_order, cancel_order, order status reports, fill reports
- Reconciliation: startup alignment and continuous monitoring
- Supported order types, time-in-force, execution instructions
- Instrument mapping (venue symbols → NT InstrumentId format)
- Rate limiting compliance
- Error handling and reconnection behavior
- Configuration classes (DataClientConfig, ExecClientConfig, InstrumentProviderConfig)
Scenarios should test both backtest and live contexts.
"#,
        "design" => r#"
NAUTILUS TRADER INTEGRATION CONTEXT:
When designing, follow the NT two-layer adapter architecture:
- Rust core in crates/adapters/{name}/ (HttpClient, WebSocketClient, PyO3 bindings)
- Python layer in nautilus_trader/adapters/{name}/ (provider, data client, exec client, config, factories)
Key design decisions:
- WebSocket orchestrator/handler pattern for real-time data
- Instrument parsing and normalization strategy
- Order state machine mapping (venue states → NT OrderStatus)
- Fill report generation and deduplication
- Symbol convention (e.g., BTCUSDT vs BTC/USDT, -PERP suffix for perpetuals)
- Config hierarchy (env vars, direct params, defaults)
- Which order types to support natively vs emulate
Reference the Binance adapter for crypto venues or IB adapter for traditional venues.
"#,
        "tasks" => r#"
NAUTILUS TRADER INTEGRATION CONTEXT:
Task phases should follow:
Phase 1: Rust core (HTTP + WS clients, auth, types)
Phase 2: Instrument provider + config classes
Phase 3: Data client (subscriptions, historical data, bar aggregation)
Phase 4: Execution client (order submission, modification, cancellation, reports)
Phase 5: Factory classes for TradingNode registration
Phase 6: Integration tests (backtest with recorded data + live paper trading)
Phase 7: Documentation (README, config reference, symbol guide)
"#,
        "apply" => r#"
NAUTILUS TRADER INTEGRATION CONTEXT:
When implementing:
- Follow NT coding standards (Rust: cargo fmt + clippy, Python: ruff + mypy)
- Use existing adapter code as templates (browse crates/adapters/ and nautilus_trader/adapters/)
- All instrument prices and quantities must respect venue precision (size_precision, price_precision)
- WebSocket handlers must be non-blocking on the event loop
- HTTP clients must implement rate limiting
- Config classes use msgspec.Struct (not dataclasses)
- Register factories in the adapter's __init__.py
- Add type stubs for PyO3 bindings
"#,
        "verify" => r#"
NAUTILUS TRADER INTEGRATION CONTEXT:
When verifying, check:
- InstrumentProvider correctly maps all venue instrument types
- Data subscriptions deliver correct NT data types (QuoteTick, TradeTick, Bar, OrderBookDelta)
- Order lifecycle events fire correctly (Submitted → Accepted → Filled/Cancelled/Rejected)
- Reconciliation aligns with venue state on startup
- Rate limiting prevents 429 errors
- Reconnection logic handles WebSocket drops gracefully
- Configuration validates required fields
- All prices/quantities use instrument precision (no precision mismatches)
- Custom data types registered with Arrow for catalog persistence
"#,
        "archive" => "",
        _ => "",
    }
}
