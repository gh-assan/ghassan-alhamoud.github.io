## The wrong mental model

Most people picture the context window as a **container**. It has a capacity. You put things in. When it is full, something has to come out. A bigger container means fewer problems.

That picture is wrong, and it produces most of the bad advice in this field. The contents of a container do not interfere with each other. The contents of a context window do. Every token you add changes how the model attends to every token already there.

A better picture is an **auction for attention**. The currency is not space. It is salience: how much of the model's focus each token gets. Three consequences follow, and they run through the rest of this research.

1. **Adding correct information can lower performance.** Not because it is wrong, but because it dilutes everything else. A fixed attention budget spread over more candidates gives each one less.
2. **The value of more context rises, flattens, then turns negative.** The agent cannot work without the file it has to edit. After that, each extra token helps less, and eventually it hurts.
3. **"Does it fit?" is never the right question.** Fitting is necessary and nowhere near enough. A 40K-token context inside a 200K window can do far worse than a 12K one on the same task.

> [!key] The one-sentence version
> The context window is a budget, not a bucket, and the exchange rate is attention. See [[attention budget]].

<figure class="diagram">
<p class="diagram__title">The return curve of context (illustrative)</p>
<div class="diagram__scroll">
<svg viewBox="0 0 720 300" role="img" aria-labelledby="f1-t" class="diagram--compact">
<title id="f1-t">The value of context rises steeply, plateaus, then falls as irrelevant tokens dilute attention.</title>
<rect class="dg-box--muted" x="60" y="20" width="130" height="230" rx="6" opacity="0.5"/>
<rect class="dg-box--info" x="190" y="20" width="220" height="230" rx="6" opacity="0.6"/>
<rect class="dg-box--warn" x="410" y="20" width="270" height="230" rx="6"/>
<line class="dg-line" x1="60" y1="250" x2="690" y2="250"/>
<line class="dg-line" x1="60" y1="20" x2="60" y2="250"/>
<path class="dg-line dg-line--accent" d="M60,245 C110,120 150,70 230,60 C300,52 360,56 420,70 C500,92 580,140 680,200" stroke-width="3"/>
<text class="dg-k" x="125" y="40" text-anchor="middle">STARVED</text>
<text class="dg-s" x="125" y="58" text-anchor="middle">decisive file missing</text>
<text class="dg-k" x="300" y="40" text-anchor="middle">PRODUCTIVE</text>
<text class="dg-s" x="300" y="98" text-anchor="middle">high relevance density</text>
<text class="dg-k" x="545" y="40" text-anchor="middle">DILUTED</text>
<text class="dg-s" x="545" y="58" text-anchor="middle">each token lowers the rest</text>
<text class="dg-s" x="375" y="280" text-anchor="middle">tokens in context →</text>
<text class="dg-s" x="30" y="140" text-anchor="middle" transform="rotate(-90 30 140)">value to the task →</text>
</svg>
</div>
<figcaption>The goal is not to fill the window but to stay in the productive band. Both edges fail: too little context starves the agent, too much dilutes it. The shape is illustrative; the direction is measured.</figcaption>
</figure>

## The evidence: every model degrades with length

The claim that models get worse as input grows is not folklore. It has been measured carefully. (The small letters after each number are [[evidence label|evidence labels]]; S means a sourced study.)

Chroma's [[context rot|context-rot]] study tested **18 frontier models from four vendors** on extended needle-in-a-haystack tasks. It covered 8 input lengths and 11 needle positions [S]. **Every model got worse as input grew, at every length step tested.** Not only past 100K tokens, and not only on hard tasks. At every step, on every model, even on simple retrieval.

Four details matter more than the headline, because they tell you what to do.

| Finding | What was measured | What it means for coding agents |
|---|---|---|
| **Similarity matters** | When the question and the answer used similar words, models found the answer even in long contexts. When they did not, performance fell much faster [S]. | You ask "why is checkout slow?" and the answer is a connection-pool setting. Difficulty depends on that vocabulary gap, not on repository size. |
| **Distractors compound** | One near-miss distractor hurt; four hurt more; and *which* distractor mattered [S]. | Codebases are full of near-duplicates: three `parse_config` functions, a deprecated `AuthService` next to the live one. |
| **Coherent text is harder** | Shuffled haystacks produced *better* retrieval than coherent ones, across all 18 models [S]. | A well-written 60K-token design document is harder to pull one fact from than 60K tokens of fragments. Coherence creates plausible wrong answers. |
| **Focused beats full** | On LongMemEval, ~300 tokens of relevant text beat the full ~113K-token context containing the same text [S]. | Same information, same model. The only difference was everything around it. |

The coherence result surprises people most. A beautiful, consistent architecture document is, for retrieval, a field of attractive wrong answers.

### Position: two regimes

Where a token sits in the window changes how much attention it gets. The pattern changes as the window fills.

| How full the window is | Attention pattern | Source |
|---|---|---|
| Under about 50% | U-shape: the start and end are favoured, the middle loses more than 30% accuracy | [S] |
| Over about 50% | The U collapses into a recency gradient: recent tokens first, then the middle, and the *start last* | [S] |

```chart
{
  "type": "line",
  "title": "Relative attention by position in the window (illustrative shape)",
  "x": ["Start", "25%", "Middle", "75%", "End"],
  "series": [
    {"name": "Window under ~50% full", "values": [85, 62, 52, 64, 90]},
    {"name": "Window over ~50% full", "values": [38, 46, 55, 72, 94]}
  ],
  "min": 0, "max": 100,
  "valueFormat": "{v}",
  "yLabel": "relative attention",
  "categoryLabel": "Position",
  "caption": "Early in a session your instruction file sits in a favoured slot. Past about half full, the same tokens become the least attended. Shape illustrative; regimes from the positional-attention literature [S].",
  "alt": "Two lines. Under half full, attention is U-shaped with high start and end. Over half full, attention rises steadily from low at the start to high at the end."
}
```

The second regime explains a familiar complaint: an agent stops following instructions late in a session. The system prompt and instruction file sit at the start of the window. In a fresh session that is a privileged slot. At 70% full, it is the least attended region.

> [!key] Why agents "stop following CLAUDE.md"
> Your rules do not fade because the model forgot them. They fade because they are now early tokens in a full window. The fix is not a sterner instruction. It is re-stating the rule near the action, or resetting the session. See [[position decay]].

### Advertised length is not effective length

Benchmarks built for long contexts show the same gap. RULER runs 13 tasks at lengths up to 256K. Multi-needle benchmarks ask for the *n*-th of several identical-looking needles. Both find models falling off well before their advertised limits [S]. LongBench-v2 mixes documents, dialogue, code repositories and structured data. Its human baseline is 53.7% and leading models score in the low 60s [S]. These are hard tasks, not solved toys. See [[effective context length]].

> [!warning] The honest caveat
> All of this was measured on retrieval tasks over mostly static text. An agent's context is different: it is a growing transcript the agent wrote itself, including its own mistakes. Degradation there is plausibly *worse*, because self-written distractors are maximally plausible. But that transfer is reasoning, not measurement [D].

## Five forces acting on every token

Every context decision trades off five forces. Naming them turns arguments about taste into arguments about quantities.

<figure class="diagram">
<p class="diagram__title">The five forces</p>
<div class="diagram__scroll">
<svg viewBox="0 0 720 250" role="img" aria-labelledby="f3-t">
<title id="f3-t">Five forces act on every token: dilution, position, recency as truth, cache, and information loss.</title>
<rect class="dg-box--accent" x="285" y="95" width="150" height="60" rx="10"/>
<text class="dg-t dg-t--lg" x="360" y="122" text-anchor="middle">a token in</text>
<text class="dg-t dg-t--lg" x="360" y="141" text-anchor="middle">context</text>
<rect class="dg-box" x="20" y="20" width="200" height="62" rx="8"/>
<text class="dg-t" x="120" y="45" text-anchor="middle">1 · Dilution</text>
<text class="dg-s" x="120" y="65" text-anchor="middle">shares a fixed attention budget</text>
<rect class="dg-box" x="500" y="20" width="200" height="62" rx="8"/>
<text class="dg-t" x="600" y="45" text-anchor="middle">2 · Position</text>
<text class="dg-s" x="600" y="65" text-anchor="middle">only start and end are premium</text>
<rect class="dg-box" x="20" y="168" width="200" height="62" rx="8"/>
<text class="dg-t" x="120" y="193" text-anchor="middle">3 · Recency as truth</text>
<text class="dg-s" x="120" y="213" text-anchor="middle">the latest claim usually wins</text>
<rect class="dg-box" x="500" y="168" width="200" height="62" rx="8"/>
<text class="dg-t" x="600" y="193" text-anchor="middle">4 · Cache</text>
<text class="dg-s" x="600" y="213" text-anchor="middle">prefix-exact; edits are costly</text>
<rect class="dg-box" x="260" y="190" width="200" height="50" rx="8"/>
<text class="dg-t" x="360" y="211" text-anchor="middle">5 · Information loss</text>
<text class="dg-s" x="360" y="229" text-anchor="middle">every cut deletes something</text>
<line class="dg-line" x1="220" y1="60" x2="285" y2="105"/>
<line class="dg-line" x1="500" y1="60" x2="435" y2="105"/>
<line class="dg-line" x1="220" y1="195" x2="285" y2="150"/>
<line class="dg-line" x1="500" y1="195" x2="435" y2="150"/>
<line class="dg-line" x1="360" y1="155" x2="360" y2="190"/>
</svg>
</div>
<figcaption>Every technique in this research pushes on one or more of these forces. When two techniques conflict, it is usually because they push the same force in opposite directions.</figcaption>
</figure>

The five forces are useful only if they change a decision. This matrix is the operating version; later chapters supply the measurements.

| Force | What changes | Engineering response |
|---|---|---|
| **Dilution** | More candidates reduce the salience of each one. Track [[relevance density]], not window utilisation. | Prefer a small relevant read to a large complete one. |
| **Position** | The start is favoured only while the window is relatively empty; the end remains favoured. | Restate a critical constraint next to the action it governs. |
| **Recency as truth** | When facts conflict, the later one usually wins. The earlier one still remains as a distractor. | Replace the session after a poisoned fact; do not argue with the transcript. |
| **Cache** | [[Prefix caching]] stops at the first changed byte. A timestamp or reordered tool list can invalidate everything after it. | Keep the prefix stable and price any rewrite before adopting it. See [chapter 10](ch:metrics-and-economics#belief-1-cutting-tokens-cuts-cost). |
| **Information loss** | Every summary, mask or truncation removes detail; only some removals can be reversed. | Offload first, then compress. Prefer an address to a paraphrase. |

> [!key] A rule worth memorising
> You cannot delete from a transcript by talking to it. That is why resetting a session beats arguing with it.

For information loss, the decisive distinction is recoverability:

| Loss type | Recoverable? | Example |
|---|---|---|
| **Reversible offload** | Yes: the content still exists and has an address | Tool output written to a file, replaced in context by its path |
| **Lossy compression** | No: a paraphrase cannot be inverted | An LLM summary of the transcript |
| **Hard truncation** | No, unless it was logged elsewhere | Dropping the oldest turns first |
| **Masking** | Depends: masked-but-kept is recoverable, masked-and-dropped is not | Replacing old tool output with placeholders |

**Reversibility is usually worth more than compression ratio.** The measured addressable-recall comparison is in [chapter 6](ch:compaction-and-memory#result-4-lossless-addressable-compaction-beats-every-lossy-baseline).

## Five ways context fails

Drew Breunig's four failure modes have become the field's shared vocabulary. Here they are in coding-agent terms, plus a fifth that this research adds.

<figure class="diagram">
<p class="diagram__title">The five failure modes, and how visible each one is</p>
<div class="diagram__scroll">
<svg viewBox="0 0 720 230" role="img" aria-labelledby="f4-t">
<title id="f4-t">Poisoning, distraction, confusion and clash leave traces in the transcript. Starvation leaves none.</title>
<rect class="dg-box" x="10" y="20" width="130" height="120" rx="8"/>
<text class="dg-t" x="75" y="46" text-anchor="middle">Poisoning</text>
<text class="dg-s" x="75" y="70" text-anchor="middle">a false fact</text>
<text class="dg-s" x="75" y="86" text-anchor="middle">becomes canon</text>
<rect class="dg-box" x="152" y="20" width="130" height="120" rx="8"/>
<text class="dg-t" x="217" y="46" text-anchor="middle">Distraction</text>
<text class="dg-s" x="217" y="70" text-anchor="middle">the agent copies</text>
<text class="dg-s" x="217" y="86" text-anchor="middle">its own history</text>
<rect class="dg-box" x="294" y="20" width="130" height="120" rx="8"/>
<text class="dg-t" x="359" y="46" text-anchor="middle">Confusion</text>
<text class="dg-s" x="359" y="70" text-anchor="middle">irrelevant context</text>
<text class="dg-s" x="359" y="86" text-anchor="middle">gets used</text>
<rect class="dg-box" x="436" y="20" width="130" height="120" rx="8"/>
<text class="dg-t" x="501" y="46" text-anchor="middle">Clash</text>
<text class="dg-s" x="501" y="70" text-anchor="middle">contradictions</text>
<text class="dg-s" x="501" y="86" text-anchor="middle">get blended</text>
<rect class="dg-box--accent" x="580" y="20" width="130" height="120" rx="8"/>
<text class="dg-t" x="645" y="46" text-anchor="middle">Starvation</text>
<text class="dg-s" x="645" y="70" text-anchor="middle">a needed fact</text>
<text class="dg-s" x="645" y="86" text-anchor="middle">never arrives</text>
<line class="dg-line dg-line--info" x1="10" y1="175" x2="566" y2="175"/>
<text class="dg-k" x="288" y="200" text-anchor="middle">LEAVES A TRACE IN THE TRANSCRIPT</text>
<line class="dg-line dg-line--accent dg-line--dash" x1="580" y1="175" x2="710" y2="175"/>
<text class="dg-k" x="645" y="200" text-anchor="middle">SILENT</text>
<text class="dg-s" x="645" y="218" text-anchor="middle">survives review</text>
</svg>
</div>
<figcaption>Four failures leave evidence you can find. Starvation produces a clean-looking trajectory and a wrong answer, which is why it is the one most likely to reach production.</figcaption>
</figure>

The diagram gives the taxonomy. This table gives the diagnostic action.

| Failure | The tell | Containment |
|---|---|---|
| **Poisoning** | A confident symbol or API claim first appeared in an assistant message, not tool output. Compaction may [[laundering|launder]] it into a settled fact. | Restart from before the false claim and reground it in tool output. |
| **Distraction** | The same tool and arguments recur three times without new information. | Reset with a short note of what was tried and ruled out; instrument a [[loop detector]]. |
| **[[confusion|Confusion]]** | The agent chooses something applicable but wrong for the situation, such as web search instead of local grep. | Remove irrelevant material or tools. The measured tool-count effect is in [chapter 8](ch:tool-surface#the-measured-damage). |
| **Clash** | Output blends current and withdrawn requirements. | Keep one current decision record; treat the transcript as evidence, not state. |
| **Starvation** | The decisive file was never read, so the trajectory looks clean and ends wrong. | Run a [[read-coverage]] audit and improve retrieval. |

> [!warning] Starvation argues for more context, not less
> It is the one failure that the subtraction default does not fix. The answer is not "add more". It is "add the right thing", which is a retrieval-quality problem. See [chapter 5](ch:retrieval).

## Why coding agents are a special case

Four properties separate coding agents from research or browser agents. Each changes what good context management looks like.

| Property | What it means | Practical consequence |
|---|---|---|
| **The filesystem is task, memory and ground truth at once** | The agent edits the very thing it reads from. A file read at turn 5 and edited at turn 30 is a fact that expired without notice. | Re-read before you re-edit. Just-in-time retrieval is unusually strong because the repository is always current. |
| **Verification is executable** | Tests, compilers and linters turn many claims into machine-checkable results. A lost fact may become a failing check rather than a plausible falsehood. | The strength and speed of your test suite set how much compaction risk you can afford. No context technique compensates for missing checks. |
| **Tool output is huge and mostly disposable** | A `pytest` run, an `npm install`, a lockfile diff: thousands of tokens where one line matters. Input tokens were measured at **99.75–99.87% of total usage** in tool-heavy agents [S]. | Almost all your spend is context, and most of context is tool output and history. Output shaping reports 60–90% reductions on common commands [P]. |
| **Structure is a precise retrieval signal** | Directory layout, import graphs, symbol tables and test-to-source mapping can be recomputed from source without an embedding model. | Start with structural retrieval for code; add semantic retrieval only where vocabulary gaps justify it. |

## The operations you can perform on context

LangChain's frame is the cleanest decomposition available, and this research adopts it. Everything you can do to a context is one of four operations. We add a fifth that comes first.

<figure class="diagram">
<p class="diagram__title">Prevent, then Write, Select, Compress, Isolate</p>
<div class="diagram__scroll">
<svg viewBox="0 0 720 200" role="img" aria-labelledby="f5-t">
<title id="f5-t">Prevention stops tokens from existing; the four operations write, select, compress and isolate the ones that do.</title>
<rect class="dg-box--accent" x="10" y="60" width="130" height="80" rx="10"/>
<text class="dg-k" x="75" y="84" text-anchor="middle">OPERATION 0</text>
<text class="dg-t dg-t--lg" x="75" y="106" text-anchor="middle">Prevent</text>
<text class="dg-s" x="75" y="126" text-anchor="middle">never generate it</text>
<line class="dg-line dg-line--accent" x1="140" y1="100" x2="178" y2="100"/>
<polygon class="dg-head--accent" points="178,95 188,100 178,105"/>
<rect class="dg-box" x="195" y="15" width="245" height="78" rx="8"/>
<text class="dg-t" x="210" y="40">Write</text>
<text class="dg-s" x="210" y="60">keep it outside the window</text>
<text class="dg-s" x="210" y="78">plan files, logs, memory</text>
<rect class="dg-box" x="460" y="15" width="250" height="78" rx="8"/>
<text class="dg-t" x="475" y="40">Select</text>
<text class="dg-s" x="475" y="60">pull it into the window</text>
<text class="dg-s" x="475" y="78">grep, file reads, recall</text>
<rect class="dg-box" x="195" y="107" width="245" height="78" rx="8"/>
<text class="dg-t" x="210" y="132">Compress</text>
<text class="dg-s" x="210" y="152">fewer tokens, same task value</text>
<text class="dg-s" x="210" y="170">compaction, masking, shaping</text>
<rect class="dg-box" x="460" y="107" width="250" height="78" rx="8"/>
<text class="dg-t" x="475" y="132">Isolate</text>
<text class="dg-s" x="475" y="152">split across boundaries</text>
<text class="dg-s" x="475" y="170">sub-agents, session resets</text>
</svg>
</div>
<figcaption>Prevention is the cheapest operation and the most neglected, because it is unglamorous. About half the wins in the <a href="15-optimisation-plan.html">optimisation plan</a> are prevention.</figcaption>
</figure>

| Operation | Definition | Coding-agent examples | Main risk |
|---|---|---|---|
| **Prevent** | Stop the tokens from existing at all | Output shaping, ignore files, fewer tools, quiet flags | Hiding a line you needed |
| **Write** | Put information outside the window so it survives | Scratch files, plan files, decision logs, memory | Memory nobody reads; staleness |
| **Select** | Pull information into the window | grep, file reads, symbol lookup, recall | The wrong thing, or too much |
| **Compress** | Fewer tokens, same task-relevant content | Compaction, summaries, masking | Losing the decisive fact for good |
| **Isolate** | Split context across boundaries | Sub-agents, session resets, per-task scope | Losing shared understanding |

The operations are not independent. Whatever you compress should have been written somewhere first, so it can be recovered. Each isolated context needs its own selection. And compression fights the cache, because a compaction rewrites the prompt. Most real disasters are interactions between operations, not one bad operation.

## What "good" looks like

Here is a definition that later chapters can be checked against.

> [!key] A well-managed context
> At each step, the tokens present are the **smallest set** that makes the correct next action **inferable**. Everything absent is **recoverable** on demand. And keeping it that way **costs less** than the errors it prevents.

Each clause is a testable property.

| Property | Violated by | How to test it |
|---|---|---|
| **Sufficiency**: the next action is inferable | Starvation | Read-coverage audits on failures |
| **Minimality**: the smallest such set | Distraction, confusion, dilution | Relevance density; remove a segment and see if the solve rate moves |
| **Recoverability**: what is missing can be fetched | Lossy compaction with no offload | After each compaction, ask: could the agent get that back? |
| **Economy**: it costs less than it saves | Elaborate memory nobody queries | The cost model in [chapter 10](ch:metrics-and-economics) |

Notice what is *not* in the definition: completeness, correctness of every token, or "full understanding of the codebase". Those are the goals people usually chase, and chasing them causes most of the damage.
