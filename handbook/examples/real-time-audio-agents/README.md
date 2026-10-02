# Teaching example: output relevance

Download all three files into one directory. Run from that directory:

```bash
PYTHONDONTWRITEBYTECODE=1 python3 -m unittest discover -s . -p 'test_*.py' -v
```

The pure model checks old owners, generations, revisions, unsupported claims and overlapping still-relevant tickets. Its tests cover wait/resume races and frozen projections.

It does not execute tasks, play audio, authorize requests, verify WebAuthn or provide distributed fencing. A production system must check tenant/principal, freshness, verified evidence, bounded inputs and authoritative ownership, and synchronize final checking with actual player enqueue. Durable deduplication, remote-effect reconciliation and measured acoustic behavior require separate integration tests and trials.
