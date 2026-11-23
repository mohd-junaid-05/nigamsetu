# **Phase 14 — UI/UX Refinement, Design System & AI-Slop Elimination**

**Goal.** Transform the existing application into a polished, intuitive, accessible, and production-quality digital product by systematically eliminating generic AI-generated design patterns, improving visual hierarchy, correcting component alignment, standardizing the design system, and refining every user interaction.

The application should feel intentionally designed by an experienced UI/UX engineering team rather than assembled from AI-generated templates.

**This is a UI/UX modernization phase, not a product redesign or functionality rewrite.** Every existing feature, workflow, API integration, database operation, AI agent, permission rule, and business logic must continue working exactly as before.

The objective is to improve how the application looks, communicates, and behaves without changing what the application does.

## **Research foundation — Skills and engineering standards**

The following resources were identified for this phase. The implementation agent must inspect their actual instructions before modifying the application, rather than simply claiming to follow them.

| Skill or standard                                                                                                                                               | Purpose                                                                                            |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| [Anthropic Frontend Design](https://github.com/anthropics/claude-code/blob/main/plugins/frontend-design/skills/frontend-design/SKILL.md?utm_source=chatgpt.com) | Distinctive, context-specific UI design that avoids generic AI aesthetics                          |
| [Vercel Web Design Guidelines](https://www.skills.sh/vercel-labs/agent-skills/web-design-guidelines?utm_source=chatgpt.com)                                     | UI audits covering accessibility, typography, forms, interactions, responsiveness, and performance |
| [Vercel Building Components](https://vercel.com/docs/agent-resources/skills?utm_source=chatgpt.com)                                                             | Reusable, accessible components with consistent APIs and styling                                   |
| [Nielsen Norman Group Heuristics](https://www.nngroup.com/articles/ten-usability-heuristics/?utm_source=chatgpt.com)                                            | Usability principles for feedback, consistency, error prevention, and user control                 |
| [WCAG 2.2](https://www.w3.org/TR/WCAG22/?utm_source=chatgpt.com)                                                                                                | Measurable accessibility requirements                                                              |

Anthropic's design guidance emphasizes creating a product-specific visual direction before writing code, while Vercel's guidelines provide concrete engineering review criteria. Both are useful here.&#x20;

[image](https://www.google.com/s2/favicons?domain=https://github.com\&sz=32)

GitHub+3



## **Build**

### **1. Design intelligence and skill preparation**

- **Skill discovery:** Before implementation, inspect the available agent skills for frontend design, accessibility, design systems, component architecture, and browser-based UI testing.
- **Primary skills:** Prioritize Anthropic's `frontend-design`, Vercel's `web-design-guidelines`, and `building-components` where compatible with the coding agent.
- **Skill verification:** Read each skill's actual `SKILL.md`, confirm its source, inspect any executable dependencies, and avoid blindly installing untrusted community packages.
- **Design research:** Study established UX principles, including visual hierarchy, Gestalt grouping, proximity, alignment, consistency, progressive disclosure, cognitive load, Hick's Law, Fitts's Law, and responsive design.
- **Application-specific interpretation:** Apply those principles to the existing civic complaint-management application rather than copying the visual style of unrelated SaaS dashboards.
- **Design rationale:** Document why major layout, typography, color, spacing, and interaction decisions improve usability.

### **2. Complete existing UI audit**

- **Route inventory:** Identify every existing page, nested route, modal, drawer, form, dashboard, and interactive component.
- **Role inventory:** Audit citizen, official, and administrator experiences separately, including role-specific navigation and permissions.
- **Component inventory:** Locate repeated buttons, cards, badges, tables, inputs, navigation elements, alerts, loading indicators, and AI-result components.
- **Visual inspection:** Capture the existing interface at desktop, tablet, and mobile widths before changing anything.
- **AI-slop detection:** Identify excessive gradients, unnecessary glowing effects, decorative blobs, generic dashboard cards, repetitive rounded containers, inconsistent icons, oversized headings, and meaningless decorative elements.
- **Usability audit:** Identify confusing navigation, weak visual hierarchy, inconsistent spacing, ambiguous labels, excessive scrolling, misplaced actions, poor empty states, and unclear feedback.
- **Accessibility audit:** Review contrast, keyboard navigation, semantic HTML, focus indicators, form labels, screen-reader announcements, and modal behavior.
- **Issue prioritization:** Classify findings as critical, high, medium, or low based on user impact and frequency.
- **Baseline preservation:** Record current behavior and screenshots so changes can be compared objectively.

### **3. Remove generic AI-generated aesthetics**

- **Intentional visual identity:** Establish a credible, restrained, modern civic-service aesthetic appropriate for a public complaint and resolution platform.
- **Remove unnecessary decoration:** Eliminate decorative gradients, glows, shadows, floating shapes, oversized illustrations, and ornamental icons where they contribute no information.
- **Reduce card overload:** Replace excessive nested cards with appropriately structured sections, tables, lists, dividers, and whitespace.
- **Avoid template repetition:** Do not make every page follow an identical hero-heading, four-stat-card, and grid-of-cards composition.
- **Typography refinement:** Use a coherent type scale with deliberate font weights, line heights, text widths, and heading hierarchy.
- **Color discipline:** Establish a limited palette using semantic colors for statuses and actions rather than arbitrary decorative colors.
- **Icon consistency:** Use one consistent icon family, standardized sizes, and meaningful icons only.
- **Professional microcopy:** Replace robotic or exaggerated AI-generated text with simple, direct language that citizens and officials can understand.
- **Visual restraint:** Use animation, elevation, rounded corners, and accent colors only where they clarify interaction or hierarchy.
- **Brand preservation:** Retain existing product identity, logos, and established brand elements unless a change is explicitly justified.

### **4. Design system and reusable component standardization**

- **Design tokens:** Define reusable tokens for typography, colors, spacing, radii, shadows, borders, transitions, and responsive breakpoints.
- **Spacing system:** Adopt a consistent spacing scale, preferably based on 4px increments, while allowing justified exceptions.
- **Typography system:** Define consistent styles for page titles, section headings, body text, labels, metadata, captions, and numerical values.
- **Semantic colors:** Standardize success, warning, error, information, neutral, and complaint-status colors.
- **Component variants:** Standardize primary, secondary, tertiary, destructive, and disabled button styles.
- **Form components:** Align input heights, label positions, validation messages, helper text, select controls, and upload fields.
- **Status components:** Ensure complaint status, severity, verification, and escalation indicators have consistent styling and clear meanings.
- **Tables and lists:** Standardize row heights, alignment, sorting affordances, filters, pagination, and action placement.
- **Shared components:** Consolidate duplicated presentation code where safe, without modifying component contracts or business logic.
- **Theme consistency:** If light and dark themes already exist, refine both. Do not introduce an additional theme without a demonstrated need.

### **5. Layout architecture and component realignment**

- **Grid discipline:** Establish a consistent responsive grid with aligned content boundaries, gutters, and container widths.
- **Visual hierarchy:** Arrange elements according to task importance, ensuring primary actions and essential information receive the strongest emphasis.
- **Gestalt proximity:** Place related information together and separate unrelated sections through appropriate whitespace.
- **Alignment:** Correct inconsistent horizontal and vertical alignment across buttons, icons, text, cards, forms, and navigation.
- **Content density:** Balance information density according to the user's task rather than applying excessive whitespace everywhere.
- **Navigation hierarchy:** Make primary navigation, secondary navigation, breadcrumbs, and contextual actions distinguishable.
- **Action placement:** Position primary actions near the information or form they affect.
- **Dashboard composition:** Prioritize actionable complaint information over decorative metrics.
- **Modal layout:** Standardize modal widths, headers, content spacing, scroll behavior, and footer actions.
- **Responsive behavior:** Ensure layouts reflow naturally without clipping, horizontal overflow, or overlapping components.
- **Reading order:** Preserve a logical reading and keyboard focus order when repositioning elements.

### **6. Citizen experience refinement**

- **Complaint submission:** Improve the visual structure of complaint forms, evidence uploads, location inputs, and submission feedback without changing validation or submission logic.
- **Complaint tracking:** Make complaint IDs, current statuses, severity levels, timestamps, and next steps easy to identify.
- **Complaint details:** Organize descriptions, evidence, location, updates, and resolution information into clearly separated sections.
- **AI decision transparency:** Present severity, duplicate detection, verification, and escalation outputs clearly without making AI-generated assessments appear infallible.
- **Trace access:** Preserve the Phase 12 "Why this score?" interactions and make trace information readable and accessible.
- **Empty states:** Explain what citizens can do when no complaints, updates, or results are available.
- **Mobile usability:** Prioritize essential citizen workflows on smaller screens.

### **7. Official and administrator experience refinement**

- **Operational dashboard:** Improve the hierarchy of pending complaints, assigned cases, escalations, verification results, and resolution progress.
- **Complaint management:** Make filtering, searching, sorting, reviewing, and updating complaints easier to understand.
- **Data presentation:** Use tables where comparison is important and cards where individual records need contextual presentation.
- **Severity visibility:** Make severity levels distinguishable through labels and accessible semantic colors.
- **Verification results:** Clearly separate individual verification checks, composite scores, and final outcomes.
- **Escalation workflows:** Improve the layout of escalation details, generated letters, supporting evidence, and relevant actions.
- **Trace viewer:** Refine the audit interface with clear grouping of tool calls, inputs, outputs, timestamps, models, and latency.
- **Administrative navigation:** Organize navigation according to operational responsibilities without changing existing access permissions.
- **High-density interfaces:** Preserve useful information density while reducing clutter and unnecessary interaction steps.

### **8. Interaction design and feedback**

- **Interaction states:** Every interactive element must have appropriate default, hover, focus, active, disabled, and loading states.
- **Loading feedback:** Replace confusing blank areas with meaningful loading indicators or skeletons where appropriate.
- **Error communication:** Display understandable error messages with relevant recovery actions.
- **Success feedback:** Confirm successful operations without excessive or repetitive notifications.
- **Destructive actions:** Preserve existing confirmation and authorization requirements.
- **Form validation:** Keep validation messages close to the corresponding fields.
- **Progressive disclosure:** Show essential information first and reveal advanced details when needed.
- **Microinteractions:** Use subtle, purposeful transitions that clarify state changes.
- **Motion accessibility:** Respect `prefers-reduced-motion`.
- **Interaction consistency:** Identical actions must behave and appear consistently throughout the application.

### **9. Accessibility and responsive engineering**

- **WCAG target:** Aim for WCAG 2.2 Level AA across all modified interfaces.
- **Contrast:** Maintain at least 4.5:1 for normal text and 3:1 for large text, subject to applicable WCAG exceptions.
- **Keyboard access:** Ensure all interactive components are keyboard-operable with visible focus indicators.
- **Touch targets:** Meet WCAG 2.2 AA target-size requirements, including applicable 24×24 CSS pixel minimums or spacing exceptions; prefer larger targets for primary touch actions.
- **Semantic structure:** Use appropriate headings, landmarks, labels, buttons, tables, and dialogs.
- **Screen readers:** Ensure icon-only actions, status changes, validation errors, and dialogs have accessible names and announcements.
- **Responsive testing:** Validate representative widths at 320px, 375px, 768px, 1024px, and 1440px, plus intermediate sizes where layouts break.
- **Zoom support:** Verify that interfaces remain usable at 200% browser zoom and with text resizing.
- **Data overflow:** Handle long complaint descriptions, addresses, filenames, and AI responses without breaking layouts.
- **Cross-browser consistency:** Test supported Chromium, Firefox, and WebKit-based browsers where tooling is available.

### **10. Implementation and visual regression testing**

- **Incremental implementation:** Refine shared foundations first, followed by page layouts and individual components.
- **No blind rewrites:** Inspect existing code, dependencies, component contracts, and styling before editing.
- **Component preservation:** Prefer styling and structural improvements over replacing functioning components.
- **Automated checks:** Run existing linting, type checking, builds, and tests after relevant changes.
- **Visual regression:** Capture before-and-after screenshots and compare layouts for unintended changes.
- **Functional regression:** Test all critical citizen, official, and administrator workflows.
- **Browser testing:** Use existing browser automation tooling, such as Playwright where available, to validate interactions and responsive behavior.
- **Performance:** Avoid unnecessary dependencies, large animations, layout shifts, and excessive client-side rendering.
- **Final audit:** Re-run the design and accessibility review after implementation, documenting unresolved findings.

## **Constraints**

- **Core functionality must remain unchanged.** No modification to complaint submission, assignment, status transitions, severity scoring, duplicate detection, resolution verification, escalation, chat, or trace-generation logic.
- **No backend changes.** Do not alter APIs, database schemas, migrations, Supabase policies, authentication, authorization, storage, or AI model integrations.
- **No business-logic changes.** Existing calculations, thresholds, scoring formulas, validation rules, and workflow conditions must remain intact.
- **No feature removal.** Every existing page, button, action, and supported workflow must remain available.
- **No unauthorized feature additions.** This phase is for refinement, not expanding product scope.
- **No invented data.** UI improvements must not introduce fabricated complaint counts, scores, statuses, user information, or AI outputs.
- **No permission changes.** Citizens must not gain access to administrative information or other citizens' protected records.
- **No audit-log changes.** Phase 12 traces remain read-only and must retain their existing privacy and access controls.
- **No unnecessary dependencies.** New UI libraries or packages require a clear technical justification and compatibility review.
- **No arbitrary redesign.** Preserve recognizable application workflows and terminology unless a change clearly improves comprehension.
- **No inaccessible visual effects.** Aesthetic changes must not reduce contrast, readability, keyboard usability, or motion accessibility.
- **No premature implementation.** Complete the UI inventory, research, and design direction before applying large-scale changes.
- **No unverified completion claims.** A page is not considered refined until it has passed visual, responsive, accessibility, and functional checks.
- **No silent behavior changes.** If a proposed UI improvement requires changing business logic or a public component contract, document it and defer it outside this phase.

## **Acceptance check**

1\. **Research and preparation:** The agent has inspected the relevant design skills, documented the selected design principles, and established an application-specific visual direction before implementing changes.

2\. **Complete application coverage:** Every existing route and major interface has been audited, including citizen pages, official dashboards, administrator views, complaint forms, AI-result displays, and trace viewers.

3\. **AI-slop elimination:** Generic decorative gradients, excessive shadows, unnecessary glowing effects, repetitive cards, inconsistent icons, and template-like layouts have been removed or intentionally justified. The application has a coherent, recognizable visual identity.

4\. **Alignment and spacing:** Navigation elements, headings, cards, forms, buttons, icons, and tables follow consistent alignment and spacing rules. No unexplained offsets or visibly misaligned components remain.

5\. **Design-system consistency:** Shared buttons, badges, inputs, dialogs, tables, and status indicators use consistent design tokens and appropriate interaction states across the application.

6\. **Citizen workflow:** A citizen can submit a complaint, upload evidence, view its status, inspect AI decisions, and follow resolution progress using the refined interface. All operations produce the same functional outcomes as before.

7\. **Official workflow:** An official can review complaints, inspect severity scores, process existing resolution workflows, and access verification information without functional regressions.

8\. **Administrator workflow:** An administrator can access existing management tools, filter complaint records, review AI traces, and perform authorized actions with unchanged permissions and results.

9\. **AI transparency:** Clicking "Why this score?" continues to open the appropriate trace viewer. All previously available trace fields remain visible and correctly associated with the relevant decision.

10\. **Responsive quality:** The application is usable at 320px, 375px, 768px, 1024px, and 1440px widths. No essential content is clipped, hidden unintentionally, or obstructed by overlapping elements.

11\. **Accessibility:** Modified interfaces satisfy the targeted WCAG 2.2 AA criteria, including applicable contrast, keyboard, focus, labeling, and target-size requirements. Any exceptions are documented.

12\. **Interaction quality:** Buttons, inputs, dialogs, dropdowns, and interactive controls provide understandable feedback, maintain consistent behavior, and work with both pointer and keyboard input.

13\. **Functional preservation:** Existing automated tests pass, and critical end-to-end workflows produce the same API requests, data mutations, scoring results, and authorization outcomes as the baseline.

14\. **Performance preservation:** The refinement introduces no significant unexplained deterioration in loading performance, layout stability, or interaction responsiveness.

15\. **Final review:** Before-and-after screenshots are available for major pages, outstanding design issues are documented, and the final implementation passes the selected design-guideline audit.

## **Not in this phase**

New application features. Backend refactoring. Database restructuring. AI model replacement. Prompt engineering for complaint scoring. New AI agents. Changes to severity or verification algorithms. Authentication redesign. Permission changes. New analytics capabilities. Complete brand replacement. Marketing website creation. Large-scale dependency migration. Unrelated codebase refactoring.

**Implementation instruction:** Treat this as a controlled, application-wide UI/UX engineering pass. First understand the existing product, then establish a design system, then refine the interface incrementally, and finally validate every major workflow. The final result must be visually distinctive, operationally clear, accessible, responsive, and fully compatible with the existing application.

**Phase 14 is complete only when the application looks and feels professionally designed without sacrificing a single existing core capability.**