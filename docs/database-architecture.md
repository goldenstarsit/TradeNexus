# TradeNexus Database Architecture

## Purpose

TradeNexus uses a database abstraction layer so the application is not coupled to a single database engine.

The current implementation uses SQLite through `better-sqlite3`, while application-facing repositories and services depend only on the generic `DatabaseAdapter` contract.

## Architecture

```text
Application / Services
        |
        v
Repositories
        |
        v
DatabaseAdapter
        |
        +-- SQLiteAdapter
        |       |
        |       v
        |   better-sqlite3
        |
        +-- Future Database Adapter
```

## Core Components

### DatabaseAdapter

`src/database/databaseAdapter.ts`

Defines the database-independent contract:

- `exec()`

- `run()`

- `get()`

- `all()`

- `transaction()`

- `close()`

Application layers should depend on this interface rather than directly importing a database driver.

### SQLiteAdapter

`src/database/adapters/sqliteAdapter.ts`

The current SQLite implementation of `DatabaseAdapter`.

It configures WAL journal mode, foreign-key enforcement, busy timeout, and deferred, immediate, and exclusive transactions.

The SQLite driver is isolated to this adapter.

### Database Provider

`src/database/databaseProvider.ts`

`createDatabaseAdapter()` is the composition boundary between the application and a concrete database implementation.

Future database implementations can be registered here without changing repository contracts.

### Database Manager

`src/database/databaseManager.ts`

Provides application-level access to the configured database connection.

Responsibilities: lazy initialization, connection reuse, connection closing, and connection reset after close.

### Database Configuration

`src/database/databaseConfig.ts`

Defines the database driver and database file path. The current driver is SQLite and the default database file is `data/tradenexus.db`.











































## Transactions and Locking

### Generic Transactions

`src/database/transaction.ts`

`runInTransaction()` executes application operations through the generic adapter transaction API.

### Write Locks

`src/database/databaseLock.ts`

Provides:

- `runWithWriteLock()` using an immediate transaction

- `runWithExclusiveLock()` using an exclusive transaction

Locking remains behind the adapter contract.

## Migrations

Migration files are located under `src/database/migrations/`.

Each migration implements `Migration` with `id`, `name`, `up()`, and `down()`.

`MigrationRunner` creates the migration tracking table, detects applied migrations, runs pending migrations in ID order, records successful migrations, and uses transactions for migration safety.

Current migration: `001_initial_schema`.

It creates the `system_metadata` table.

## Repository Layer

Repositories are located under `src/database/repositories/`.

`BaseRepository` provides `findById()`, `findAll()`, `count()`, and `deleteById()`.

`SystemMetadataRepository` provides domain-specific metadata operations.

Repositories receive a `DatabaseAdapter` rather than a concrete SQLite connection.



## Health, Error Handling and Recovery

### Health

`src/database/databaseHealthService.ts`

`checkDatabaseHealth()` performs a minimal database query and returns health status, response time, and error information when unhealthy.

### Error Handling

`src/database/databaseError.ts`

`DatabaseError` provides a consistent database-level error type.

`toDatabaseError()` wraps unknown errors, preserves existing `DatabaseError` instances, and includes operation context.

### Recovery

`src/database/databaseRecovery.ts`

The recovery layer can close and recreate the configured database connection and verify that the replacement connection responds successfully.

## Database Replacement Strategy

The database abstraction has been explicitly verified with a non-SQLite fake adapter.

The verification demonstrates that repositories, health checks, transactions, and repository contracts can operate through the generic adapter interface without depending on SQLite.

The SQLite driver is isolated at the adapter and composition boundary.

## Testing

Database tests are located under `src/database/__tests__/`.

Current test categories include unit tests, integration tests, failure tests, locking tests, and database replacement abstraction tests.

The replacement abstraction test uses a fake `DatabaseAdapter` to verify that higher layers can operate without SQLite.

## Dependency Isolation Rule

Application and repository code must not import `better-sqlite3` directly.

The intended dependency direction is:



Application

    |

    v

Services / Repositories

    |

    v

DatabaseAdapter

    |

    v

Concrete Adapter

    |

    v

Database Driver

Currently, only `SQLiteAdapter` should depend directly on `better-sqlite3`.

## Adding Another Database

A future database implementation should implement `DatabaseAdapter`, add a concrete adapter under `src/database/adapters/`, register the driver in `createDatabaseAdapter()`, add adapter-specific tests, and run the complete verification suite.

Repositories and application services should not be modified merely because a new database adapter is introduced.

## Current Status

The database foundation provides database abstraction, SQLite implementation, provider/factory, configuration, connection management, transactions, write locking, migrations, repository abstraction, health checks, error handling, recovery support, and comprehensive verification.

M20 completed verification that the upper database layers are not inherently tied to SQLite.






