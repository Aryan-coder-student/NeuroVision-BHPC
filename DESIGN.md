---
version: alpha
name: "NeuroVision Clinical AI"
description: "A restrained, high-contrast clinical workspace for tenant-isolated imaging and patient workflows."
colors:
  primary: "#ededed"
  background: "#000000"
  surface: "#0a0a0a"
  surface-raised: "#121212"
  text: "#e4e4e7"
  text-strong: "#ffffff"
  text-muted: "#a1a1aa"
  border: "#27272a"
  focus: "#3b82f6"
  success: "#4ade80"
  warning: "#facc15"
  danger: "#ee7d77"
typography:
  sans:
    fontFamily: "Inter, system-ui, sans-serif"
  mono:
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace"
rounded:
  DEFAULT: "0px"
spacing:
  page: "28px"
  panel: "20px"
  grid-gap: "16px"
components:
  button: {}
  card: {}
  input: {}
  table: {}
---

# NeuroVision Clinical AI Design System

## Overview

### Creative North Star

The interface follows the visual discipline of a radiology reading workstation: dark, quiet surfaces; crisp diagnostic hierarchy; and restrained status color reserved for information that changes a clinical decision.

### Product context and register

- **Audience and primary job:** Authorized clinical and research staff reviewing tenant-scoped patients, scans, models, and reports.
- **Target markets and evidence:** Current UI evidence uses `en-IN` date presentation; no formal market policy is documented.
- **Locales and language policy:** Current owned UI is English. User-facing dates use explicit Indian English formatting where the existing screen establishes it.
- **Usage scene:** Desktop-first, repeated professional use with dense records and occasional urgent alerts.
- **Register:** Product UI inside the authenticated shell; public landing and authentication routes may carry more brand expression.
- **Memorable signature:** Technical uppercase labels and monochrome diagnostic surfaces, with color appearing only for focus and semantic status.
- **Restraint:** Forms, tables, permissions, and error recovery remain conventional and immediately readable.
- **Anti-references:** Avoid consumer wellness styling, decorative medical imagery, rounded dashboard templates, and neon decoration that competes with clinical data.
- **Token ownership/runtime mapping:** This document mirrors the canonical runtime values in `frontend/src/index.css`; CSS variables remain the runtime source of truth. Feature CSS must consume those variables rather than copy palette values.

## Colors

Black and near-black surfaces establish the reading-workstation character. White and zinc text provide hierarchy. Blue is reserved for focus and selected technical states; green, yellow, and muted red retain their semantic success, warning, and danger meanings. Static panels use borders instead of shadows.

## Typography

Inter is the interface family for compact, legible controls and clinical records. Monospace is limited to patient IDs, technical identifiers, and machine-readable values. Uppercase tracking is reserved for short utility labels, never body copy or long instructions.

## Layout

The authenticated shell uses a fixed 220px sidebar, a compact sticky top bar, 28px page padding, 16px grid gaps, and bordered panels. Data tables own horizontal overflow. Long forms retain document scrolling and collapse to one column below the established content width.

## Elevation & Depth

Hierarchy comes from tonal surface changes and one-pixel borders. Shadows are not used on static application panels. Sticky navigation may layer above content without introducing decorative depth.

## Shapes

Application surfaces and controls use square corners. Circular geometry is limited to status dots, spinners, and intrinsically circular indicators.

## Components

### Foundational visual states

Hover uses the next surface tone; keyboard focus uses a visible blue two-pixel outline; disabled and busy controls retain their footprint and reduce opacity. Loading, empty, error, success, and read-only states must contain explanatory text rather than color alone.

### Buttons and actions

Primary actions use the light accent surface with dark text. Secondary actions are transparent with visible borders. Icon-only controls require an accessible name and tooltip. Busy actions keep the same dimensions and block duplicate submission.

### Navigation and data display

Sidebar navigation uses Lucide outline icons with text labels. Tables use native semantics, uppercase column labels, visible overflow, and stable panel geometry. Rows must not appear clickable unless a real detail action exists.

Clinical intelligence is a patient-level navigation mode. The global sidebar exposes organization dashboard and patient registry; selecting a patient opens a persistent identity header and patient tabs for segmentation, VQA, history, and reports. A clinical tool must never infer a patient from the most recent record.

### Forms and overlays

Inputs use dark secondary surfaces, square borders, persistent labels, inline help, and associated text errors. Product forms disable native validation bubbles and focus the first invalid field. Clinical identity fields must not invite free-form medical history.

### Iconography

Lucide React is the canonical icon family, normally at 12–18px with outline strokes. Icons support labels and do not replace unfamiliar action text.

### Motion

Motion is brief and state-driven: hover transitions around 150ms and continuous rotation only for active loading. Reduced-motion preferences collapse nonessential transitions and animation.

### Content and data visualization

Copy uses direct clinical operations such as “Register patient” and “Try again.” Patient identifiers remain visually distinct from names. Success and error messages explain the completed action or recovery path without exposing backend internals.

## Do's and Don'ts

- **Do:** Keep tenant scope and permission state visible wherever records are created or reviewed.
- **Do:** Separate stable patient identity from repeatable scans, encounters, and reports.
- **Do:** Keep organization and patient scope visible throughout every clinical tool.
- **Don't:** Add speculative patient PII fields without an approved domain and privacy contract.
- **Don't:** use decorative gradients, rounded cards, or color-only status inside clinical workflows.
