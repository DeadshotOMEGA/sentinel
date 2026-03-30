---
name: deep-research
description: Conduct structured multi-source research, synthesize evidence, compare options, and produce actionable conclusions. Designed for technical, product, and market investigations.
version: 1.0.0
---

# Deep Research

## Purpose

Produce high-confidence research outputs by systematically gathering, evaluating, and synthesizing evidence from multiple sources.

The goal is not just to summarize information but to:

- uncover insights
- compare alternatives
- identify tradeoffs
- generate actionable recommendations

This skill prioritizes **accuracy, traceability, and structured reasoning**.

---

# Auto Trigger

Activate automatically when the user asks to:

Research  
Investigate  
Compare  
Analyze  
Study  
Evaluate  
Find best approach  
Find alternatives  
Do market research  
Deep dive  
Explore tradeoffs  
Explain architecture  
Review competitors  
Understand how something works

Or when the request includes:

- pricing models
- SaaS strategy
- architecture decisions
- technology comparisons
- best practices
- documentation synthesis
- standards
- market demand
- technical feasibility

---

# When To Use

Use this skill when the user needs:

- market research
- competitor analysis
- pricing strategy research
- architecture tradeoff analysis
- product discovery
- best practice investigation
- documentation analysis
- repo comprehension
- multi-source synthesis

Examples:

- “Research credit-based SaaS pricing models”
- “Compare Supabase vs Firebase for SaaS apps”
- “Find how modern AI tools implement SEO audits”
- “Investigate best way to implement usage billing”

---

# When NOT To Use

Do not use this skill for:

- direct coding tasks
- UI implementation
- simple factual questions
- trivial explanations
- quick summaries

Use it when **depth and rigor are required.**

---

# Research Principles

Follow these principles:

1. **Multi-source verification**

Never rely on a single source if alternatives exist.

2. **Primary sources first**

Prefer:

- official documentation
- engineering blogs
- academic papers
- real product examples

3. **Separate facts from interpretation**

Clearly distinguish:

- evidence
- analysis
- conclusions

4. **Avoid speculation**

If evidence is missing, state uncertainty.

5. **Prefer recent information**

Technology and SaaS evolve quickly.

---

# Research Workflow

## Step 1 — Clarify the question

Define:

- the core question
- constraints
- desired outcome
- success criteria

Example:

Instead of:

“How do subscriptions work?”

Define:

“What SaaS pricing model is best for an AI audit product targeting SMEs?”

---

## Step 2 — Define research scope

Identify:

- domains to investigate
- industries or competitors
- relevant technologies
- potential solution categories

---

## Step 3 — Gather sources

Collect evidence from:

- official documentation
- industry reports
- engineering blogs
- product case studies
- real implementations

Look for:

- concrete examples
- real metrics
- architecture patterns

---

## Step 4 — Extract insights

For each source:

Identify:

- key findings
- patterns
- best practices
- limitations

---

## Step 5 — Compare approaches

Build comparison tables:

Example structure:

| Approach | Advantages | Disadvantages | Complexity | Cost |
| -------- | ---------- | ------------- | ---------- | ---- |

---

## Step 6 — Synthesize conclusions

Answer:

- what works
- what does not work
- why
- under which conditions

---

## Step 7 — Produce recommendations

Provide:

- best approach
- alternatives
- tradeoffs
- implementation implications

---

# Research Quality Checklist

Before finishing verify:

- multiple sources were considered
- conclusions follow from evidence
- tradeoffs are clearly explained
- recommendations are actionable
- uncertainties are disclosed

---

# Output Structure

Always return results in this structure:

1. Research Question
2. Scope and Context
3. Key Findings
4. Evidence Summary
5. Comparative Analysis
6. Tradeoffs
7. Recommended Approach
8. Alternative Approaches
9. Implementation Considerations
10. Open Questions / Unknowns

---

# Example Invocation

Explicit:

$deep-research Investigate whether SaaS credit-based billing or subscription billing is better for an AI audit platform targeting SMEs.

Implicit:

“Research pricing models for AI SaaS tools and recommend the best option.”

---

# Research Depth Levels

If not specified assume **deep analysis**.

Levels:

Light

- 3–5 insights

Standard

- detailed comparison

Deep

- multiple frameworks + strategic recommendation

---

# Special Modes

## Architecture Research

Focus on:

- scalability
- reliability
- cost
- operational complexity

## Market Research

Focus on:

- demand
- competitor positioning
- pricing
- customer pain points

## Product Research

Focus on:

- user workflows
- UX patterns
- monetization models

---

# Research Anti-Patterns

Avoid:

- generic summaries
- repeating documentation
- speculation without evidence
- ignoring tradeoffs
- vague recommendations
