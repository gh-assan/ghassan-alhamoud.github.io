# EntityScope query benchmark protocol

This protocol measures only the local structured-filter execution path. It does
not include natural-language translation, MCP serialization, process startup,
network transport, or an external model call.

## Environment

- Measurement date: 2026-07-28
- Database: local DuckDB file, opened read-only
- Database size: approximately 7 MB
- Corpus at measurement time:
  - 1,010 `entities` rows
  - 8,018 `entity_sources` rows
  - 479 `prospects` rows
  - 1,000 `berlin_businesses` rows
- Filter: city contains `München`, `employees_on_site <= 10`
- Result limit: 10

## Method

1. Open one read-only DuckDB connection.
2. Execute the filter 20 times as warm-up.
3. Execute the same filter 500 times.
4. Measure each call with a monotonic nanosecond timer.
5. Report median, p95, and maximum latency.

## Observed result

| Runs | Rows returned | Median | p95 | Maximum |
|---:|---:|---:|---:|---:|
| 500 | 1 | 1.972 ms | 2.329 ms | 2.709 ms |

These numbers describe one machine and one warm-cache dataset. They are not a
service-level objective and should not be generalized to larger corpora without
rerunning the protocol.

## Reproduction sketch

```python
import statistics
import time

filters = {"city": "München", "employees_on_site_max": 10}

for _ in range(20):
    execute_filter_query(connection, filters, limit=10)

samples_ms = []
for _ in range(500):
    started = time.perf_counter_ns()
    execute_filter_query(connection, filters, limit=10)
    samples_ms.append((time.perf_counter_ns() - started) / 1_000_000)

median_ms = statistics.median(samples_ms)
p95_ms = sorted(samples_ms)[474]
```
