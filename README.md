# Code Complete

> ⚠️ Heavy Work In Progress

## Current blockers / research
- Poor and slow rendering of highlights in VScode
- Standard LLMS are to slow. 
- Forcing CLI integration (gemini CLI, claude cider etc) might provide better workflow.

## Overview

Large Language Models (LLMs) are extremely good at large-scale planning, code generation, and agentic workflows. However, there is still a gap when it comes to **fast, low-level code editing**.

Current LLM tools tend to require typing prompts, switching context, or running full-file transformations. This interrupts flow.

**Code Complete** aims to solve this by making **LLM-powered micro-edits so fast and intuitive that the keyboard is no longer required for many coding tasks.**

The goal is to turn common editing operations into **instant context-aware actions**.

---

## Core Idea

Instead of writing prompts, the developer interacts directly with the code:

1. The user **hovers over code**.
2. Logical **scopes are automatically detected and highlighted** (line, block, function, class, etc.).
3. A **keyboard shortcut or mouse button** locks the selection.
4. A **popup action menu** appears with predefined editing operations.
5. The user selects an operation.
6. The selected code is sent to an **LLM with a predefined system prompt**.
7. The LLM returns a patch that updates the selected section.

The interaction is designed to be **fast enough to feel like a native editor feature** rather than a separate AI tool.

---

## Example Actions

Possible predefined actions include:

* **Refactor**
  Improve structure without changing behavior.

* **Simplify**
  Reduce complexity and improve readability.

* **Review**
  Analyze the code and suggest improvements or potential issues.

* **Explain**
  Generate a concise explanation of what the code does.

* **Prompt**
  Allow the user to enter a one-off custom instruction.

Each action corresponds to a **specific system prompt template** that guides the LLM.

---

## Design Principles

### 1. Zero Prompt Friction

Users should not need to write prompts for common tasks.

### 2. Scope-Aware Editing

Operations should apply to logical code units such as:

* expression
* block
* function
* class
* file section

### 3. Minimal Context

Only the necessary code region (plus optional surrounding context) is sent to the LLM.

---

## Potential Features

* Scope detection using syntax trees
* Patch-based editing instead of full rewrites
* Keyboard-free workflows
* Customizable action menus
* Local or remote LLM support
* Streaming edits for faster feedback

---

## Status

Early concept / prototype.


