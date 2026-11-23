---
name: building-components
description: Vercel's component construction principles for robust, accessible, composable UI primitives. Standardizes component variants, states, composition, and styling contracts.
---

# Building Components — Component Construction Principles

## Principles of Robust UI Components

1. **Consistent API Contracts:**
   - Props should follow predictable naming conventions (`variant`, `size`, `disabled`, `isLoading`, `className`).
   - Style merging using `clsx` and `twMerge` (or `tailwind-merge`) so consumer `className` props override defaults safely without specificity bugs.

2. **Primitive Token Hierarchy:**
   - **Buttons:**
     - `primary`: Solid brand accent (`bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-xs`).
     - `secondary`: Subtle surface (`bg-surface hover:bg-surface-hover text-foreground border border-border`).
     - `outline`: Border-led (`border border-border hover:bg-surface text-foreground`).
     - `ghost`: Borderless (`hover:bg-surface-hover text-foreground/80 hover:text-foreground`).
     - `destructive`: Red alert (`bg-red-600/10 hover:bg-red-600/20 text-red-600 dark:text-red-400 border border-red-500/25`).
   - **Badges / Status Chips:**
     - High contrast background with matching tinted border: e.g. `bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 font-medium`.
     - Always paired with a solid dot or icon for color-blind accessibility.

3. **Loading & Empty States:**
   - Skeletons should mirror the exact height and layout of the real content to eliminate layout shift (CLS = 0).
   - Empty states must state what is missing, why it is missing, and provide a clear recovery or next action.

4. **Zero AI-Slop Component Rules:**
   - Don't wrap plain text in generic card containers.
   - Don't use oversized radii (`rounded-3xl` or `rounded-2xl` on 28px chips). Use `rounded-md` (6px) or `rounded-lg` (8px) for buttons, inputs, and chips.
   - Keep borders crisp: single 1px borders with explicit semantic tokens.
