# Multi-Tenant Migration — Phase 1: Control-Plane Database

Phase 1 of the per-gym-database isolation migration. Adds a second, always-on Postgres
database (`gymbios_control`) holding a skeleton tenant registry, completely isolated from
the primary `GYMBIOS` database — no existing behavior changes in this phase. See
`com.company.project.controlplane.config.ControlPlaneDataSourceConfig` for the persistence
setup.

## Local setup (one-time)

Create the control-plane database on your local Postgres instance:

```sql
CREATE DATABASE gymbios_control;
```

On next boot, Flyway automatically creates the schema (`db/migration-control/V1__control_plane_foundation.sql`)
against this database — no manual DDL needed.

## Running the one-time backfill

`tenants` starts empty. To copy today's `gyms` rows into it, run the app once with the
backfill flag enabled via an environment variable (relaxed binding maps this to
`control-plane.backfill.enabled`):

```
CONTROL_PLANE_BACKFILL_ENABLED=true mvn spring-boot:run
```

(or set `CONTROL_PLANE_BACKFILL_ENABLED=true` in the environment before starting the packaged
jar). Passing it as a `--control-plane.backfill.enabled=true` program argument also works, but
must be its own `-Dspring-boot.run.arguments` value — do not comma-join it with other
arguments in the same `-D` flag, as Maven does not split on commas.

This is idempotent — it skips any gym whose slug already exists as a tenant — so it's safe
to re-run later for gyms created after the initial backfill. It does not populate
`tenant_connections`, `tenant_stats`, `tenant_provisioning_log`, or `platform_users`; those
stay empty until a later phase wires them up.

## What this phase does NOT do

- No tenant routing — the app still reads/writes exclusively to the primary `GYMBIOS`
  database for all existing functionality.
- No ongoing sync between `gyms` and `tenants` — the backfill is a one-time/manually
  re-run step, not a live trigger on gym creation.
- No GYMBIOS_ADMIN auth changes — `platform_users` is a schema placeholder only.
