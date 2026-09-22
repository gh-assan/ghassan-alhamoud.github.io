"""
research_charts.py — render `chart` blocks (JSON) into theme-aware inline SVG.

One chart system for every research programme: authors declare data, the
build renders marks, axes, labels and a "View data" table. Colours come from
CSS tokens (--chart-1, --chart-2, --chart-muted) so light and dark themes are
both covered; text always uses text tokens, never the series colour.

Supported types
  hbar   horizontal bars; one or two series (grouped)          magnitude / comparison
  line   one or two series over a numeric or categorical x     change / trajectory
  stack  one 100% horizontal stacked bar with a legend         composition of a whole
"""

import html
import json
import math
import re

TONES = {"1": "ch-s1", "2": "ch-s2", "muted": "ch-muted", "bad": "ch-bad"}
FONT_W = 6.4  # approx px per char at 11px for label layout


def esc(s):
    return html.escape(str(s), quote=True)


def fmt(value, spec):
    fmt_str = spec.get("valueFormat", "{v}")
    if isinstance(value, float) and value.is_integer():
        value = int(value)
    return fmt_str.format(v=value)


def axis_fmt(spec):
    """Axis ticks drop series-level precision: general number format, valueFormat's literals kept."""
    template = re.sub(r"\{v[^}]*\}", "{:g}", spec.get("valueFormat", "{v}"))
    return lambda t: template.format(t)


def nice_max(v):
    if v <= 0:
        return 1
    exp = math.floor(math.log10(v))
    base = 10 ** exp
    for m in (1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10):
        if m * base >= v:
            return m * base
    return 10 * base


def ticks(maximum, n=4):
    step = maximum / n
    return [round(step * i, 6) for i in range(n + 1)]


def data_table(spec):
    series = spec["series"]
    head = "".join(f"<th scope=\"col\">{esc(s['name'])}</th>" for s in series)
    rows = []
    cats = spec.get("categories") or [str(x) for x in spec.get("x", [])]
    for i, c in enumerate(cats):
        cells = "".join(
            f"<td>{esc(fmt(s['values'][i], spec)) if s['values'][i] is not None else '—'}</td>"
            for s in series
        )
        rows.append(f"<tr><th scope=\"row\">{esc(c)}</th>{cells}</tr>")
    first = esc(spec.get("categoryLabel", ""))
    return (
        '<details class="chart-data"><summary>View data</summary>'
        f'<div class="table-scroll"><table><thead><tr><th scope="col">{first}</th>{head}</tr></thead>'
        f'<tbody>{"".join(rows)}</tbody></table></div></details>'
    )


def legend(series):
    if len(series) < 2:
        return ""
    items = "".join(
        f'<span class="chart-legend__item"><span class="chart-legend__key {TONES.get(s.get("tone", str(i + 1)), "ch-s1")}"></span>{esc(s["name"])}</span>'
        for i, s in enumerate(series)
    )
    return f'<div class="chart-legend" aria-hidden="true">{items}</div>'


def rounded_bar(x, y, w, h, cls, tip):
    """Bar with a 4px rounded data-end (right side), square at the baseline."""
    r = min(4, h / 2, w)
    if w <= 0:
        return ""
    d = (
        f"M{x:.1f},{y:.1f} h{max(w - r, 0):.1f} "
        f"a{r},{r} 0 0 1 {r},{r} v{max(h - 2 * r, 0):.1f} "
        f"a{r},{r} 0 0 1 -{r},{r} h-{max(w - r, 0):.1f} z"
    )
    return f'<path class="ch-mark {cls}" d="{d}" data-tip="{esc(tip)}"/>'


def render_hbar(spec):
    cats = spec["categories"]
    series = spec["series"]
    ns = len(series)
    label_w = spec.get("labelWidth") or min(
        260, max(90, int(max(len(c) for c in cats) * FONT_W) + 16)
    )
    width = 720
    plot_x = label_w
    plot_w = width - label_w - 90
    bar_h = 18 if ns == 1 else 14
    gap_inner = 2
    group_h = ns * bar_h + (ns - 1) * gap_inner
    row_h = group_h + 16
    top = 8
    height = top + len(cats) * row_h + 26
    all_vals = [v for s in series for v in s["values"] if v is not None]
    maximum = spec.get("max") or nice_max(max(all_vals))
    parts = [
        f'<svg viewBox="0 0 {width} {height}" role="img" aria-labelledby="{spec["_id"]}-t" class="chart chart--hbar">',
        f'<title id="{spec["_id"]}-t">{esc(spec.get("alt") or spec["caption"])}</title>',
    ]
    for t in ticks(maximum):
        tx = plot_x + plot_w * (t / maximum)
        parts.append(f'<line class="ch-grid" x1="{tx:.1f}" y1="{top - 4}" x2="{tx:.1f}" y2="{height - 22}"/>')
        parts.append(
            f'<text class="ch-axis" x="{tx:.1f}" y="{height - 6}" text-anchor="middle">{esc(axis_fmt(spec)(t))}</text>'
        )
    for i, c in enumerate(cats):
        gy = top + i * row_h + 8
        parts.append(
            f'<text class="ch-label" x="{plot_x - 10}" y="{gy + group_h / 2 + 4:.1f}" text-anchor="end">{esc(c)}</text>'
        )
        for j, s in enumerate(series):
            v = s["values"][i]
            if v is None:
                continue
            by = gy + j * (bar_h + gap_inner)
            bw = plot_w * (v / maximum)
            tone = s.get("tone") or str(j + 1)
            hi = spec.get("highlight")
            if ns == 1 and hi is not None and i not in (hi if isinstance(hi, list) else [hi]):
                tone = "muted"
            parts.append(rounded_bar(plot_x, by, bw, bar_h, TONES.get(tone, "ch-s1"),
                                     f"{s['name']} · {c}: {fmt(v, spec)}"))
            parts.append(
                f'<text class="ch-value" x="{plot_x + bw + 6:.1f}" y="{by + bar_h / 2 + 4:.1f}">{esc(fmt(v, spec))}</text>'
            )
    parts.append(f'<line class="ch-base" x1="{plot_x}" y1="{top - 4}" x2="{plot_x}" y2="{height - 22}"/>')
    parts.append("</svg>")
    return "".join(parts), width


def render_line(spec):
    xs = spec["x"]
    series = spec["series"]
    width, height = 720, spec.get("height", 300)
    long_names = any(len(s['name']) > 16 for s in series)
    left, right, top, bottom = 56, (24 if long_names else 120), 30, 40
    pw, ph = width - left - right, height - top - bottom
    all_vals = [v for s in series for v in s["values"] if v is not None]
    ymin = spec.get("min", 0)
    ymax = spec.get("max") or nice_max(max(all_vals))
    numeric = all(isinstance(x, (int, float)) for x in xs)
    xmin, xmax = (min(xs), max(xs)) if numeric else (0, len(xs) - 1)

    def px(i):
        x = xs[i] if numeric else i
        return left + pw * ((x - xmin) / ((xmax - xmin) or 1))

    def py(v):
        return top + ph * (1 - (v - ymin) / ((ymax - ymin) or 1))

    parts = [
        f'<svg viewBox="0 0 {width} {height}" role="img" aria-labelledby="{spec["_id"]}-t" class="chart chart--line">',
        f'<title id="{spec["_id"]}-t">{esc(spec.get("alt") or spec["caption"])}</title>',
    ]
    for t in ticks(ymax - ymin):
        val = ymin + t
        y = py(val)
        parts.append(f'<line class="ch-grid" x1="{left}" y1="{y:.1f}" x2="{left + pw}" y2="{y:.1f}"/>')
        parts.append(f'<text class="ch-axis" x="{left - 8}" y="{y + 4:.1f}" text-anchor="end">{esc(axis_fmt(spec)(val))}</text>')
    for i, x in enumerate(xs):
        parts.append(
            f'<text class="ch-axis" x="{px(i):.1f}" y="{height - bottom + 18}" text-anchor="middle">{esc(x)}</text>'
        )
    if spec.get("xLabel"):
        parts.append(f'<text class="ch-axis ch-axis--title" x="{left + pw / 2:.1f}" y="{height - 4}" text-anchor="middle">{esc(spec["xLabel"])}</text>')
    if spec.get("yLabel"):
        parts.append(f'<text class="ch-axis ch-axis--title" x="{left - 8}" y="{top - 16}" text-anchor="start">{esc(spec["yLabel"])}</text>')
    for ann in spec.get("annotations", []):
        i = xs.index(ann["x"]) if not numeric else None
        ax = px(i) if i is not None else left + pw * ((ann["x"] - xmin) / ((xmax - xmin) or 1))
        parts.append(f'<line class="ch-annot" x1="{ax:.1f}" y1="{top}" x2="{ax:.1f}" y2="{top + ph}"/>')
        parts.append(f'<text class="ch-annot-text" x="{ax + 6:.1f}" y="{top + 12}">{esc(ann["text"])}</text>')
    label_ys = []
    for j, s in enumerate(series):
        tone = TONES.get(s.get("tone") or str(j + 1), "ch-s1")
        pts = [(px(i), py(v)) for i, v in enumerate(s["values"]) if v is not None]
        d = " ".join(("M" if k == 0 else "L") + f"{x:.1f},{y:.1f}" for k, (x, y) in enumerate(pts))
        parts.append(f'<path class="ch-line {tone}" d="{d}"/>')
        for i, v in enumerate(s["values"]):
            if v is None:
                continue
            parts.append(
                f'<circle class="ch-dot {tone}" cx="{px(i):.1f}" cy="{py(v):.1f}" r="4" data-tip="{esc(s["name"])} · {esc(xs[i])}: {esc(fmt(v, spec))}"/>'
            )
        if long_names:
            continue
        lx, ly = pts[-1]
        for prev in label_ys:
            if abs(prev - ly) < 14:
                ly = prev + (14 if ly >= prev else -14)
        label_ys.append(ly)
        parts.append(f'<text class="ch-label" x="{lx + 10:.1f}" y="{ly + 4:.1f}">{esc(s["name"])}</text>')
    parts.append(f'<line class="ch-base" x1="{left}" y1="{top + ph}" x2="{left + pw}" y2="{top + ph}"/>')
    parts.append("</svg>")
    return "".join(parts), width


def render_stack(spec):
    cats = spec["categories"]
    vals = spec["series"][0]["values"]
    total = sum(vals)
    width, height = 720, 64
    x = 0.0
    parts = [
        f'<svg viewBox="0 0 {width} {height}" role="img" aria-labelledby="{spec["_id"]}-t" class="chart chart--stack">',
        f'<title id="{spec["_id"]}-t">{esc(spec.get("alt") or spec["caption"])}</title>',
    ]
    hi = spec.get("highlight", [])
    hi = hi if isinstance(hi, list) else [hi]
    for i, (c, v) in enumerate(zip(cats, vals)):
        w = width * v / total
        tone = "ch-s1" if i in hi else ("ch-s2" if i in spec.get("highlight2", []) else "ch-muted")
        pct = 100 * v / total
        parts.append(
            f'<rect class="ch-mark {tone}" x="{x + 1:.1f}" y="4" width="{max(w - 2, 0.5):.1f}" height="34" rx="3" '
            f'data-tip="{esc(c)}: {esc(fmt(v, spec))} ({pct:.0f}%)"/>'
        )
        if w > 46:
            parts.append(
                f'<text class="ch-inbar {"ch-inbar--on" if tone != "ch-muted" else ""}" x="{x + w / 2:.1f}" y="26" text-anchor="middle">{pct:.0f}%</text>'
            )
        x += w
    parts.append("</svg>")
    # legend below as HTML list with values (identity is never colour alone)
    items = []
    for i, (c, v) in enumerate(zip(cats, vals)):
        tone = "ch-s1" if i in hi else ("ch-s2" if i in spec.get("highlight2", []) else "ch-muted")
        items.append(
            f'<li><span class="chart-legend__key {tone}"></span><span>{esc(c)}</span>'
            f'<span class="chart-stack__v">{esc(fmt(v, spec))} · {100 * v / total:.0f}%</span></li>'
        )
    return "".join(parts) + f'<ol class="chart-stack__legend">{"".join(items)}</ol>', width


RENDERERS = {"hbar": render_hbar, "line": render_line, "stack": render_stack}


def render_chart(raw_json, chart_id):
    spec = json.loads(raw_json)
    spec["_id"] = chart_id
    if "caption" not in spec:
        raise ValueError(f"chart {chart_id}: caption is required")
    kind = spec.get("type", "hbar")
    if kind not in RENDERERS:
        raise ValueError(f"chart {chart_id}: unknown type {kind}")
    svg, _ = RENDERERS[kind](spec)
    title = f'<p class="diagram__title">{esc(spec["title"])}</p>' if spec.get("title") else ""
    note = f'<p class="chart-note">{spec["note"]}</p>' if spec.get("note") else ""
    return (
        f'<figure class="diagram rs-chart" id="{chart_id}">{title}'
        f'{legend(spec["series"]) if kind != "stack" else ""}'
        f'<div class="diagram__scroll">{svg}</div>{note}'
        f'<figcaption>{spec["caption"]}</figcaption>'
        f'{data_table(spec)}</figure>'
    )
