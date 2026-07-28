# Workspace index benchmark protocol

## Scope

Measure two operations separately:

1. parse a generated JSON registry from already-read local bytes;
2. locate a known ID in the parsed registry.

Do not describe either result as full rebuild time, agent startup time, or semantic search latency.

## Environment to record

- operating system and kernel
- CPU model
- Python version
- workspace file count
- registry byte size and schema version
- exact commit or registry digest

## Parse benchmark

Read `Registry/index.json` into `raw` before timing. Run `json.loads(raw)` 500 times with `time.perf_counter_ns()`. Report median, p95, and max in milliseconds.

## Lookup benchmark

Parse once. Select known IDs from different registry sections. Perform 5,000 in-memory lookups, rotating IDs. Report median, p95, and max. State whether the implementation uses a linear scan or a prebuilt ID map.

## Correctness gates

- parsed schema version is supported;
- declared section counts equal entry counts;
- IDs required to be unique are unique;
- every indexed path exists at build time;
- cross-references resolve;
- a failed rebuild leaves the previous valid registry intact.

## 28 July 2026 snapshot

- Intel Core i5-2410M @ 2.30 GHz
- Linux 6.12
- 2,408 observed files
- 302,261-byte registry
- parse: 2.142 ms median, 2.545 ms p95, 5.8 ms max, 500 runs
- warm linear ID scan: 0.0153 ms median, 0.0263 ms p95, 0.0717 ms max, 5,000 runs
