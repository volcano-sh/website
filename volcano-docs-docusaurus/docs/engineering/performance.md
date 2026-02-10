---
title: Engineering Performance Notes
---

# Performance & Architecture Engineering

:::info Goal
Maintain Lighthouse score >95, Core Web Vitals (CWV) optimized, and low JS bundle size.
:::

## Typography System
We implemented a self-hosted font strategy to prevent layout shifts (CLS) and blocking render.
- **Font Stack**: Space Grotesk (Headings), Inter (Body), JetBrains Mono (Code).
- **Loading**: `font-display: swap` ensures text is visible immediately.
- **Optimization**: Variable fonts used where possible to reduce request count.

## Animation & Motion
- **Library**: `framer-motion` handles complex orchestrations (hero, diagrams).
- **Reduced Motion**: All animations respect `prefers-reduced-motion: reduce`.
  - Terminal typing -> Instant text.
  - Floating diagrams -> Static.
  - Transitions -> Instant.
- **CSS Animations**: Used for simple loops (hover ripples, glows) to run on the compositor thread.

## Components Architecture

### Scheduler Diagram
- **SVG-based**: Lightweight (under 10KB gzipped) compared to Canvas/WebGL.
- **Interactive**: Hover states managed via React state, but styling via CSS modules for performance.
- **Mobile Fallback**: Switches to a static card grid on screens under 768px to save battery and screen real estate.

### Terminal Demo
- **No heavy libs**: Typewriter effect implemented via CSS keyframes or lightweight state intervals.
- **Viewport Aware**: Only animates when `useInView` triggers, saving CPU cycles when off-screen.

## Bundle Optimization
- **Code Splitting**: Docusaurus handles route-based splitting.
- **Tree Shaking**: `framer-motion` imports are tree-shakable.
- **Client Modules**: Global styles and fonts loaded via `client-modules.js` to avoid blocking critical CSS.

## Lighthouse Checklist
- [x] **Performance**: Images lazy loaded, fonts swapped, JS deferred.
- [x] **Accessibility**: ARIA labels on interactive diagrams, semantic HTML, sufficient contrast.
- [x] **Best Practices**: HTTPS, no console errors, correct aspect ratios.
- [x] **SEO**: Meta tags, semantic headings structure.

## Future Improvements
- Add `requestIdleCallback` for non-critical metrics logging.
- Implement more aggressive SVG optimization (SVGO).
- Add e2e visual regression tests.
