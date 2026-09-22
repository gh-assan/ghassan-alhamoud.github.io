## Why this research exists

When a coding agent fails on a real repository, the transcript often looks reasonable. The decisive fact may be behind a compaction boundary, displaced by unused tool definitions, or contradicted by a signature the agent invented earlier.

Those failures are quiet, and they are mostly **context failures**. This research asks what should be in a coding agent's context at each step, what should not, who decides, and how you would know the decision was right.

The usual first measurement looks like this:

```chart
{
  "type": "stack",
  "title": "One 152K-token mid-session context (illustrative)",
  "categories": ["System prompt", "Tool definitions", "Instruction files", "Skill descriptions", "Retrieved code", "Tool results", "Agent messages", "User turns", "Summaries"],
  "series": [{"name": "Tokens", "values": [9000, 38000, 6500, 1800, 22000, 58000, 12000, 1700, 3000]}],
  "highlight": [1, 5],
  "valueFormat": "{v:,}",
  "categoryLabel": "Segment",
  "caption": "In this composite, tool definitions and results hold 63% of the window while the instruction file is 4%. The first audit recovers about 30% without deleting information [C].",
  "alt": "Stacked bar: tool results 38%, tool definitions 25%, retrieved code 15%, agent messages 8%, system prompt 6%, instruction files 4%, summaries 2%, skills 1%, user turns 1%."
}
```

Everything else in this research follows from taking that picture seriously: measure first, delete what is dead, shape what is loud, make every loss reversible, and stop when the numbers say your constraint has moved elsewhere.
