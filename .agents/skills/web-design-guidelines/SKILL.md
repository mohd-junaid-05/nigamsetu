---
name: web-design-guidelines
description: Vercel's web design and engineering guidelines covering accessibility (WCAG 2.2 AA), typography, forms, touch targets, responsive breakpoints, feedback states, and performance.
---

# Web Design Guidelines — Engineering Criteria

## 1. Accessibility (WCAG 2.2 Level AA)

1. **Color Contrast:**
   - Normal text (< 18pt or < 14pt bold): minimum contrast ratio of **4.5:1** against its background.
   - Large text (>= 18pt or >= 14pt bold): minimum contrast ratio of **3.0:1**.
   - UI components and graphical objects: minimum contrast ratio of **3.0:1** for borders and state indicators.
   - Do not rely on color alone to convey meaning (e.g. combine color with an icon and text label for Severity and Status).

2. **Touch Targets & Sizing (WCAG 2.2 SC 2.5.8):**
   - Minimum target size: at least **24x24 CSS pixels** with sufficient spacing, or **44x44 CSS pixels** for primary mobile touch targets (bottom navigation, submit button, camera capture trigger).

3. **Keyboard Navigation & Focus Visible (WCAG 2.2 SC 2.4.7):**
   - All interactive controls (buttons, links, form inputs, modal close triggers) must be reachable via `Tab` and activatable via `Enter` / `Space`.
   - Focus rings must be unambiguously visible: `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-zinc-950`.

4. **Semantic HTML & Screen Reader Labels (WCAG 2.2 SC 1.3.1, 4.1.2):**
   - Icon-only buttons must have `aria-label` or `sr-only` text.
   - Forms must have associated `<label>` elements or `aria-labelledby`.
   - Status indicators must use semantic markup (`role="status"` or `aria-live="polite"` for dynamic updates).
   - Modal dialogs must trap focus, render with `role="dialog"`, have `aria-modal="true"`, and close on `Escape`.

5. **Reduced Motion (WCAG 2.2 SC 2.3.3):**
   - Respect `@media (prefers-reduced-motion: reduce)`.
   - Disable or minimize continuous spinning, pulsing, or bouncy transforms when the user prefers reduced motion.

## 2. Responsive Breakpoints

Ensure flawless layout reflow across standard breakpoints without horizontal scroll or layout clipping:
- **320px - 375px:** Ultra-compact mobile (SE, small Android). Single-column flow, edge-to-edge touch targets, sticky bottom action bars.
- **768px:** Tablet view. Multi-column category grids, collapsible sidebar or drawer layout.
- **1024px:** Small desktop / laptop. 2-panel or 3-panel layout with fixed heights and internal scrollbars.
- **1440px+:** Wide desktop display. Maximum content container width (`max-w-7xl`), equal margins, stable visual balance.

## 3. Form Design & Validation
- Validation errors must appear directly adjacent to the input that caused them.
- Error messages must be constructive and human-readable ("Please select an evidence photo", "File size exceeds 10MB limit").
- Inputs should have sensible autocomplete, keyboard type (`type="email"`, `inputMode="decimal"`), and clear visual focus rings.
