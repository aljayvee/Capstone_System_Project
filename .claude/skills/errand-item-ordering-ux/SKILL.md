---
name: errand-item-ordering-ux
description: >-
  Design and audit on-demand errand and pabili item ordering screens, merchant store
  menus, item customization sheets, and checkout action docks based on the 15 design
  invariants and 3 conversion mechanisms adapted from uxpeak. Covers merchant banner
  icon contrast, store catalog visual harmony, trust signal proximity, pure item title
  hierarchy, zero redundant price labels, embedded dynamic totals in errand CTAs,
  and thumb-zone persistent action docks. Use this whenever designing or auditing
  errand forms, item picker modals, store menus, or errand review action bars in
  CustomerApp or the Web portal.
---

# Errand & Pabili Item Ordering UX

Companion to `.agents/rules/ui-layout-principles.md` and `.agents/rules/ux-psychology.md`.
While those rules govern general UI layout and user psychology, this skill defines the
systemic heuristics for **on-demand errand-running, merchant store selection, pabili item ordering,
and conversion action docks** in the SUGO Express logistics ecosystem.

---

## 1. The Systemic Errand Design Philosophy

In an on-demand errand service like SUGO Express:
1. **Design for an Unpredictable Merchant Ecosystem, Not One Clean Mockup**:
   - Store cover photos vary wildly: bright daylight bakery signs, dim pharmacy interiors, high-contrast supermarket shelves. Action icons, back buttons, and status tags MUST remain 100% legible against ANY photo background.
2. **High-Velocity Ordering Over Endless Browsing**:
   - Customers want to get an errand runner dispatched quickly: list items, specify brands and quantities, see clear estimated pricing, and confirm. Every micro-friction point (repetitive stepper tapping, hidden prices, unreadable icons) directly causes order abandonment.
3. **Subconscious Perceived Trust**:
   - In cash-on-delivery (COD) errands, trust is paramount. Customers are trusting a rider with their money and purchases. Misaligned cards, harsh lines, shouting typography, or hidden fees make the app feel unpolished and untrustworthy.

---

## 2. The 15 Errand Item Ordering Invariants

### 1. Merchant Banner Icon Contrast Over Cover Photos
- **The Defect**: Navigation icons (`<` Back, Search, Share, Favorite) sitting directly on top of store cover photos work only when the photo is dark. On bright daylight photos (e.g., pharmacy storefronts, bakery displays) the icons completely disappear.
- **The Rule**: Navigation and action buttons overlaying merchant or item imagery MUST be wrapped in a subtle frosted or solid background pill container (`bg-slate-900/60 backdrop-blur-md border border-white/10` or `colors.card`) with guaranteed contrast.
- **Implementation**:
  ```tsx
  <TouchableOpacity
    style={{
      backgroundColor: 'rgba(15, 23, 42, 0.65)',
      borderRadius: 20,
      padding: 8,
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.15)',
    }}
  >
    <ChevronLeft size={20} color="#FFFFFF" />
  </TouchableOpacity>
  ```

### 2. Catalog Imagery Consistency & Aspect Ratios
- **The Defect**: Mixed aspect ratios, uncentered photos, or lifestyle images (e.g., hands holding a bag) distract from the product and break the visual rhythm of the merchant catalog grid.
- **The Rule**: Item thumbnails and store listing cards MUST use standardized aspect ratios ($1:1$ square or $4:3$) with centered focal points and neutral card backing.

### 3. Strict Layout Grid Alignment
- **The Defect**: Margins drifting between 12px, 16px, and 24px across different cards makes the interface feel messy and unmanaged.
- **The Rule**: Enforce a strict horizontal gutter (standard `Spacing.lg = 18dp` to `24px`) across store headers, item lists, and review summaries.

### 4. Supportive, Calm Color Palette (Brand Saturated Accents Reserved for CTAs)
- **The Defect**: Saturated primary colors scattered across non-critical chips, badges, and borders shout at the customer and weaken visual hierarchy.
- **The Rule**: Use calm, neutral slates for card backgrounds and secondary badges. Reserve the solid brand red (`#E53935` / `#F62459`) strictly for primary conversion actions (`[ Add to Errand ]`, `[ Dispatch Rider ]`).

### 5. Single-Family Typography Hierarchy
- **The Defect**: Introducing multiple font families makes the ordering flow feel fragmented.
- **The Rule**: Use a single clean font family. Establish the complete hierarchy using size, weight (`600` semi-bold vs. `700` bold), line-height, and color contrast.

### 6. Concise, Non-Redundant Badges & Letter-Spaced Tags
- **The Defect**: Badges with verbose text like `"OFFICIAL STORE PARTNER"` or crowded uppercase labels create visual noise.
- **The Rule**: Badges must be scannable in under 1 second (`VERIFIED`, `FAST QUEUE`, `AIR-CON`). Small uppercase tags must declare subtle letter-spacing (`letterSpacing: 0.5`) so the letters breathe.

### 7. Balanced Item Titles (Prominent Without Shouting)
- **The Defect**: Product titles set in ultra-black heavy weights shout at the user and overpower price and quantity details.
- **The Rule**: Use balanced font weights (`600–700`) and proportional sizing (`FontSizes.lg` to `xl`) so the title is clear and scannable without visual aggression.

### 8. Readable Paragraph Line-Height & Softened Contrast
- **The Defect**: Item notes and store delivery instructions with tight line-height create eye fatigue.
- **The Rule**: Body text MUST declare line-height $\ge 1.4\text{–}1.6$ with slightly muted contrast (`colors.textMuted` / `text-slate-400`). *Headlines attract attention; paragraphs support understanding.*

### 9. Merchant Rating & Trust Proximity
- **The Defect**: Ratings and review counts buried at the bottom of the screen hide essential trust signals.
- **The Rule**: Place store ratings (`★ 4.9 (120+)`) and verified status directly adjacent to the store or item title in the hero block. Customers must instantly answer: *What is it, and can I trust it?*

### 10. Monochromatic, Consistent Benefit Icons
- **The Defect**: Benefit chips (`COD Available`, `Cold Stored`, `Official Receipt`) with mixed icon styles (filled vs. outlined) and rainbow colors create visual clutter.
- **The Rule**: Standardize all benefit chips to share monochromatic stroke weights, uniform chip padding, and neutral background surfaces.

### 11. Soft Hairline Dividers (Zero "Divider Hell")
- **The Defect**: Thick, dark lines chop the errand screen into disjointed horizontal blocks.
- **The Rule**: Replace heavy dividing rules with ultra-subtle hairline borders (`rgba(255,255,255,0.06)` or `colors.border`) and macro-whitespace.

### 12. Gestalt Spacing Balance
- **The Defect**: Arbitrary large gaps between related data disconnect the item context.
- **The Rule**: Apply Gestalt proximity: micro-spacing ($4\text{–}8\text{px}$) for closely related data (Item Name + Estimated Price + Quantity); macro-spacing ($18\text{–}24\text{px}$) between distinct sections (Store Info vs. Item Customization).

### 13. Zero Redundant "Price:" / "Qty:" Labels
- **The Defect**: Writing `Price: ₱85.00` wastes visual space. The currency symbol already communicates price.
- **The Rule**: NEVER prefix prices with `"Price:"`. Render `₱85.00` directly with bold numerical hierarchy.

### 14. Pure Item Titles & Early Estimated Price
- **The Defect**: Putting package weights into titles (e.g., `"Fresh Mangoes 1kg"`) is misleading when customers can change quantity. Placing the price far down delays purchase decisions.
- **The Rule**: Keep item titles pure (`"Fresh Mangoes"`). Place the unit in the selector. Display the estimated unit price prominently in the upper hero block alongside the title.

### 15. Ergonomic Purchase Stepper & Dynamic Total in CTA
- **The Defect**: All-caps shouting `ADD TO CART` button disconnected from the quantity stepper forces two disjointed actions across the screen.
- **The Rule**: Place the quantity stepper directly adjacent to the primary CTA in the bottom action bar. Display the unit (`kg`, `pcs`, `packs`) inside the stepper, and embed the dynamic total price inside the button (`[ Add to Errand • ₱179.00 ]`).

---

## 3. The 3 Advanced Errand Conversion Mechanisms

### Mechanism 1: Scrollable Card Sheet with Sticky Store Header Transition
- The store information, search bar, and item catalog live inside a soft card sheet that slides upward over the merchant cover image during scroll.
- When the cover photo scrolls out of view, the store title and rating smoothly condense into the sticky top navigation header so the customer never loses store context while scrolling through a 50-item menu.

### Mechanism 2: Persistent Sticky Bottom Errand Action Dock (Thumb Zone)
- In item selection and errand building screens, the quantity stepper, running item count, and primary conversion CTA remain persistently pinned in the bottom thumb reach zone (`bottom: 0`, `paddingBottom: safeAreaInsets.bottom`).
- Customers don't always decide to add an item at the top; when they finish reading store notes or item options deep down the page, they can convert immediately without having to scroll back to the top.

### Mechanism 3: Predefined 1-Tap Quantity Presets
- Above or beside the custom stepper, provide quick-select pill chips (`[ 1x ]`, `[ 2x ]`, `[ 3x ]`, `[ 5x ]` or common weights `[ 500g ]`, `[ 1kg ]`, `[ 2kg ]`).
- Customers can tap once to set common quantities, eliminating repetitive `+` clicking while retaining the custom stepper for exact numbers.

---

## 4. Screen Audit Checklist for Errand & Item Screens

Before shipping or approving any errand item, store catalog, or review screen, verify:

- [ ] **Banner Legibility**: Do floating navigation buttons over store photos have frosted background pill containers?
- [ ] **Trust Proximity**: Is the store rating and verified badge anchored directly adjacent to the title?
- [ ] **No Redundant Labels**: Are prices rendered cleanly (`₱85.00`) without `"Price:"` prefix?
- [ ] **Pure Titles**: Are package weights and quantities omitted from the item title string?
- [ ] **Dynamic CTA Total**: Does the primary conversion button display the dynamic calculated total (`Add to Errand • ₱{total}`)?
- [ ] **Thumb-Zone Dock**: Is the primary action bar pinned to the bottom thumb zone with safe-area padding?
- [ ] **1-Tap Presets**: Are 1-tap quantity pills available for high-frequency quantities?
- [ ] **Soft Dividers**: Are section dividers subtle hairline borders rather than heavy dark lines?
- [ ] **Single Font**: Is the typographic scale derived from a single font family using weight and size contrast?
