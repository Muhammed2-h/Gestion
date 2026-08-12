# Auth Page UI Redesign Spec

## 1. Context and Goals
The current Gestion authentication page (`Auth.tsx`) has a split-view layout but suffers from poor visual hierarchy, unbalanced columns, excessive empty space, and styling inconsistencies compared to the rest of the app's established design tokens. 

The goal is to refine the visual design significantly while keeping the existing content, branding (dark theme, green accent), and authentication logic entirely unchanged. The design must feel modern, premium, clean, and intentional.

## 2. Layout & Proportions
- **Architecture:** Split View (50/50 split on desktop).
- **Left Column (Branding):** 
  - Will be vertically centered with proper max-width bounding so the text doesn't stretch awkwardly.
  - Reduced empty space.
  - Tighter logo and brand name alignment.
- **Right Column (Form):** 
  - **Floating Card:** The login form will sit inside the standardized `Card` component (using `bg-bg-card` and standard border radius/shadow).
  - The card will have improved padding (e.g., `p-10`) to breathe, but proportions will be balanced to not look overwhelmingly large.
  - Background behind the card will be `bg-bg-secondary` or standard dark to provide subtle contrast against the floating card.

## 3. Typography & Hierarchy
- **Left Column:**
  - Logo and Title: Tighten spacing, ensure the brand name aligns properly with the 'G' icon.
  - Subtitle: Better line-height and balanced weight to feel less disconnected.
  - Features: Reduce padding/spacing between feature items. Make the feature icons use a subtle background (e.g. `bg-accent/10` with `text-accent`) rather than harsh borders.
- **Right Column:**
  - Form Heading: Standardized sizing (e.g. `text-2xl font-bold`) and properly positioned at the top of the card.
  - Secondary Links (e.g., "Forgot password?"): Made less visually distracting (using `text-muted` or `text-secondary` and standardizing the hover state).

## 4. Components (Inputs & Buttons)
- **Inputs:** 
  - Standardized height (`h-11`).
  - Use the established `form-input` styling (`bg-bg-primary`, `border-border`, subtle focus rings).
  - Labels and inputs will be visually connected using tighter margins (e.g. `mb-1.5` instead of larger gaps).
  - Internal spacing and icon alignment (left-padded icons) will be vertically centered.
- **Buttons:** 
  - Proportions: The primary CTA will have a standardized height (`h-11` or `h-12`) and solid weighting without excessive gradients.
  - Consistent border radii throughout all interactive elements.

## 5. Responsiveness & Functional Integrity
- The split view will gracefully degrade to a single stacked view or hide the branding column entirely on mobile/tablet screens.
- Absolutely zero changes to the underlying Zustand `useAuthStore` logic or React Router redirects.

## 6. Implementation Notes
- Modify `src/pages/Auth.tsx` only.
- Utilize existing `index.css` utility classes and design tokens (`var(--color-bg-card)`, `var(--radius-md)`, etc.).
- Do not introduce new third-party CSS libraries or inline styles.
