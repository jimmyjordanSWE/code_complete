# Code Complete

> WIP / Concept: AI-powered micro-edits for VS Code.

## Overview

Code Complete explores a faster way to use LLMs for code editing inside the editor.

Instead of writing prompts or triggering full-file transformations, the user interacts directly with code by hovering, selecting a logical scope, and applying predefined edit actions.

The goal is to make common edits feel closer to a native editor feature than a separate AI workflow.

## Core Idea

1. Hover over code.
2. Detect and highlight a logical scope such as a line, block, function, or class.
3. Lock the selection with a shortcut or mouse action.
4. Show a menu of predefined edit actions.
5. Send the selected scope to an LLM with a task-specific prompt.
6. Apply the returned patch to the selected code.

## Example Actions

- Refactor
- Simplify
- Review
- Explain
- Custom prompt

## Design Principles

- Zero prompt friction
- Scope-aware editing
- Minimal context
- Patch-based updates

## Current Challenges

- Efficient and accurate scope highlighting in VS Code
- End-to-end latency low enough to feel interactive
- Determining whether CLI-based model integration gives a better UX than direct API calls

## Status

Early prototype. The project is currently focused on interaction design, editor integration, and latency tradeoffs.
