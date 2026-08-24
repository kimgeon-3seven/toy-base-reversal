# Iteration 001 — Mouse lane deployment and toy barricade

## Branch and baseline

- Feature branch: `codex/feature/mouse-entry-wall-art`
- Parent revision: `51e7ef9` (`feat: overhaul toy battle presentation`)
- Portfolio prototype baseline: `2bc268b` (`Complete prototype stages 1 through 4`)

## Problems observed

### Attack preparation relied on the lower control panel

Units could be added to a lane from buttons and keyboard shortcuts, but the
battlefield entry markers themselves were not interactive. This made the
formation step feel disconnected from the battlefield and made the intended
three-lane constraint less obvious.

The lower formation panel also overlapped the third entry marker, preventing a
future direct-manipulation interaction from working consistently across all
three lanes.

### Lane composition was hard to inspect spatially

The formation panel listed every lane, but hovering a battlefield entry marker
did not explain which units were assigned to it. Players had to repeatedly move
their attention between the board and the lower panel.

### The barricade was still a prototype placeholder

The old obstacle used a small grey geometric image. It did not match the glossy
construction-toy language already established by the towers, core and units,
and it did not communicate damage.

## Implementation

- Added a dedicated entry-point resolver instead of embedding coordinate rules
  in the scene.
- Added left-click deployment and right-click removal at the three real entry
  points while preserving the existing buttons and keyboard shortcuts.
- Added a lane hover renderer that reports total units, per-archetype
  composition, selected-unit cost and invalid placement reasons.
- Moved the formation deck down so that every battlefield entry marker remains
  visible and clickable.
- Added a generated transparent toy-block barricade sprite consistent with the
  existing coral, ivory, brown and gold asset palette.
- Added a presentation policy that chooses horizontal or vertical barricade
  orientation from adjacent obstacles and exposes intact, damaged and critical
  health states.
- Added visible crack overlays and damage tinting without changing collision,
  health or balance rules.

## Design decisions

- Direct placement remains limited to the three entry points. Arbitrary grid
  deployment would undermine the lane-concentration constraint in the attack
  planning system.
- Existing UI buttons remain available for accessibility and as a fallback.
- Interaction resolution, tooltip presentation and barricade visual policy are
  independent classes so that Phaser rendering is not mixed with game rules.

## QA and regression evidence

- TypeScript build: passed
- ESLint: passed
- Automated tests: `146 passed` across `45` test files
- Production build: passed
- Browser console errors or warnings: none
- Mouse interaction checks:
  - Initial lane counts: `1,1,1`
  - Left-click lane 1: `2,1,1`
  - Right-click lane 1: `1,1,1`
  - Left-click visible lane 3 marker: `1,1,2`
- Visual checks:
  - Hover popup stayed readable on lanes 1 and 3.
  - The third entry marker was no longer covered by the formation deck.
  - The new barricade stayed readable at the in-game grid scale.

## Asset-production note

The barricade was generated with the built-in ImageGen workflow using the
existing tower, core and shield-unit assets as style references. The final
asset was verified to use a real alpha channel before integration and was saved
as `public/assets/sprites/tower-defense/obstacle-v2.png`.

## Follow-up

The next visual iteration replaces rotated single-image attack characters with
real eight-direction walk and attack animation frames on a separate feature
branch.
