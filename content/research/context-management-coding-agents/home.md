## Why this research exists

When a coding agent fails on a real repository, the transcript usually looks reasonable. The agent did not fail to reason. The fact it needed was three compactions ago, or 42,000 tokens of unused tool definitions crowded out the file it should have read, or a signature it hallucinated at turn 12 became settled fact by turn 40.

Those failures are quiet, and they are mostly **context failures**. This research asks what should be in a coding agent's context at each step, what should not, who decides, and how you would know the decision was right.

The usual first measurement looks like this:

```chart
{
  "type": "stack",
  "title": "Where 152K tokens of a typical mid-session context go",
  "categories": ["System prompt", "Tool definitions", "Instruction files", "Skill descriptions", "Retrieved code", "Tool results", "Agent messages", "User turns", "Summaries"],
  "series": [{"name": "Tokens", "values": [9000, 38000, 6500, 1800, 22000, 58000, 12000, 1700, 3000]}],
  "highlight": [1, 5],
  "valueFormat": "{v:,}",
  "categoryLabel": "Segment",
  "caption": "Tool definitions and tool results hold 63% of the window; most teams are tuning the instruction file, at 4%. A first audit typically recovers about 30% of the window with no loss of information [C].",
  "alt": "Stacked bar: tool results 38%, tool definitions 25%, retrieved code 15%, agent messages 8%, system prompt 6%, instruction files 4%, summaries 2%, skills 1%, user turns 1%."
}
```

Everything else in this research follows from taking that picture seriously: measure first, delete what is dead, shape what is loud, make every loss reversible, and stop when the numbers say your constraint has moved elsewhere.
