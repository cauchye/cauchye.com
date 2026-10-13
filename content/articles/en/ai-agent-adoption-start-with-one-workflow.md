---
title: 'Start AI Agent Adoption with One Workflow: Automating Business Processes Beyond the Pilot'
slug: ai-agent-adoption-start-with-one-workflow
locale: en
excerpt: Adopting AI agents starts with deciding which piece of work to hand over and how far, not with picking a tool. Here is a practical way to begin with one workflow, keep permissions small, and design the human checkpoints, with links to the primary sources behind it.
publishedAt: 2026-10-14T00:00:00+09:00
translationOf: ja/ai-agent-adoption-start-with-one-workflow
tags: [AI Agents, Automation, Governance, Operations]
---

Most conversations about bringing AI agents into a business start with "which tool should we choose?" In our view, the tool is rarely what decides whether adoption works. What decides it is whether you have settled **which work to hand over, how far, and under whose review**.

This article lays out a way to start AI agent adoption and business process automation with a single workflow. Where we state facts, we link to public primary sources. The rest is practical guidance from the perspective of forward deployed engineering (FDE): engineers who work inside the business and carry the work through to implementation. Measurable results differ from one process to another, so we do not quote figures here.

## Separate "workflows" from "agents" first

"AI agent" is used for a wide range of systems. A useful starting point is the distinction Anthropic drew in [Building effective agents](https://www.anthropic.com/engineering/building-effective-agents), published on December 19, 2024:

- Workflows are "systems where LLMs and tools are orchestrated through predefined code paths."
- Agents are "systems where LLMs dynamically direct their own processes and tool usage."

The same article says: "we recommend finding the simplest solution possible, and only increasing complexity when needed."

We think that order applies directly to business process automation. If the steps of a process are known, build it as a workflow first. Give an agent discretion only where the steps cannot be written down in advance. You do not need to aim for an agent that can do everything.

## Four tests for choosing the first workflow

Before planning a company-wide rollout, narrow the scope to one workflow. These are the four things we look at.

1. It happens often. Work that recurs several times a week lets you see the effect of each improvement quickly.
1. Its input and output are clear. Good candidates are tasks where you can say in one sentence what comes in and what counts as done.
1. Mistakes can be undone. Start with work a person reviews before it leaves the team: drafts, research, tabulation, first-pass ticket triage.
1. The people who do the work can take part. The person who knows the process best needs time to look at results and say what to fix.

Leave out, at first, work that includes actions that are hard to reverse: payments, signing contracts, sending to customers automatically, deleting production data. If such work is in scope, put a human approval immediately before the action.

## Grant only the permissions the work needs

The more tools an agent holds, the more it can do, and the larger the effect of a wrong action. OWASP's [LLM06:2025 Excessive Agency](https://genai.owasp.org/llmrisk/llm062025-excessive-agency/) describes the vulnerability that lets damaging actions be performed in response to unexpected, ambiguous or manipulated outputs from an LLM, and names three root causes: excessive functionality, excessive permissions, and excessive autonomy. Its mitigations include "Minimize extension permissions" and "Require user approval."

Translated into an adoption design, these are the decisions to make:

- What it can read: the data the agent may consult, limited to the folders, repositories, and tables the workflow needs.
- What it can write: where it may create or change things. At first, drafts, branches, and test environments only.
- What needs human approval: sending anything outside, changing production, deleting, and anything involving payment.
- What is recorded: logs that show afterwards who asked, what was read, and what was executed.

Anthropic's article makes a related point about agents: "We recommend extensive testing in sandboxed environments, along with the appropriate guardrails." Narrow permissions are not there to make the agent less useful. They are what lets you widen, step by step, the range of work you are comfortable handing over.

## Define "it worked" before you start

Pilots often end at "it seems useful" because nobody set a passing bar beforehand. For the chosen workflow, write down three things first.

- Definition of done: what state can go to the next step without a person reworking it.
- How to check: collect ten to twenty real past cases so the same inputs can be run and compared.
- When to stop: which repeated failures mean the design is reviewed or the workflow is dropped from scope.

The evaluation cases keep their value after launch. When a model or tool is updated, or a prompt or procedure changes, running the same cases tells you whether the change broke the work.

## An example: one workflow running in four weeks

The following is one way to proceed. The duration depends on how complex the work is and how much time the people involved can give.

- Week 1: Observe the work. Sit with the person who does it, and write down the inputs, decisions, outputs, and exceptions. Collect the evaluation cases.
- Week 2: Build the smallest version. Fix the parts a workflow can cover as set steps, and use a model only where judgment is needed. Permissions are read and draft only.
- Week 3: Work alongside the team. Use it on real cases, gather corrections every day, and fold them into the steps and instructions.
- Week 4: Make it operational. Document the approval steps, how logs are reviewed, who to contact, and the stop conditions. Decide which workflow comes next.

What matters here is that the builders are where the work happens. Instead of building from a requirements document, they build while watching the work and fix things on the spot. We believe that closeness is where the value of the FDE way of working lies.

## Do not bolt governance on afterwards

Once one workflow is running, other teams ask to use it too. Without shared rules, each team ends up operating differently. Before expanding, settle at least the following:

- Which tools may be used, and how accounts are managed
- What information may and may not be entered
- The list of actions that need human approval
- Who to contact when something goes wrong, and how to stop

You do not have to design a framework from scratch. The U.S. National Institute of Standards and Technology (NIST), for example, released the [AI Risk Management Framework](https://www.nist.gov/itl/ai-risk-management-framework) (AI RMF 1.0), a framework intended for voluntary use, on January 26, 2023, and a Generative AI Profile (NIST-AI-600-1) on July 26, 2024. The framework's diagram is built from four elements: Govern, Map, Measure, and Manage. It can serve as a checklist when you write your own policies.

## Summary

- Choose one workflow to hand over before you choose a tool.
- Build the known steps as a workflow, and give an agent discretion only where it is needed.
- Grant only the permissions the work needs, and put human approval in front of actions that are hard to reverse.
- Prepare a definition of done and evaluation cases before starting.
- Put the builders where the work happens, and fix things together with the people who do it.

CAUCHYE ASIA supports AI agent adoption. If you are working through which workflow to choose or how to design permissions, [tell us about it](/en/contact).

## Primary sources

- [Building effective agents](https://www.anthropic.com/engineering/building-effective-agents) (Anthropic, December 19, 2024)
- [LLM06:2025 Excessive Agency](https://genai.owasp.org/llmrisk/llm062025-excessive-agency/) (OWASP Gen AI Security Project)
- [AI Risk Management Framework](https://www.nist.gov/itl/ai-risk-management-framework) (NIST)
