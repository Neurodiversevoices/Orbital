# CCI Architecture: Bundle & Circle Comparison

## Single Source of Truth

All CCI chart rendering flows through one file:

```
lib/cci/summaryChart.ts → renderSummaryChartSVG()
```

## Compliance Matrix

| CCI Type | Brief (App) | Artifact (PDF) | Uses summaryChart.ts |
|----------|-------------|----------------|----------------------|
| **Individual** | N/A (redirect to /cci) | `artifact.ts` | **NO** - Hardcoded SVG (golden master locked) |
| **Circle** | `brief.tsx` → `CCISummaryChart` | `artifact.ts` → `generateCircleCCIArtifactHTML` | **YES** ✓ |
| **Bundle** | `BundleCCIPreview` → `CCISummaryChart` | `bundleArtifact.ts` → `generateBundleCCIArtifactHTML` | **YES** ✓ |

## Architecture Diagram

```
                         lib/cci/summaryChart.ts
                    ┌─────────────────────────────────────┐
                    │  SINGLE SOURCE OF TRUTH             │
                    │                                     │
                    │  • SUMMARY_CHART (320×140)          │
                    │  • CAPACITY_COLORS (H/M/L)          │
                    │  • downsampleTo6Points()            │
                    │  • renderSummaryChartSVG()          │
                    └─────────────────────────────────────┘
                                    │
                    ┌───────────────┼───────────────┐
                    │               │               │
                    ▼               ▼               ▼
            ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
            │ CIRCLE CCI  │ │ BUNDLE CCI  │ │ INDIVIDUAL  │
            │             │ │             │ │ CCI         │
            └─────────────┘ └─────────────┘ └─────────────┘
                  │               │               │
        ┌─────────┴─────────┐    │         (Golden Master
        │                   │    │          Locked - NOT
        ▼                   ▼    │          using SSOT)
   ┌─────────┐         ┌─────────┐
   │ Brief   │         │Artifact │
   │ (App)   │         │ (PDF)   │
   └─────────┘         └─────────┘
```

---

## Circle CCI

### Brief (App Screen)

**File:** `app/(tabs)/brief.tsx` → `CirclesCCIBrief` component

```typescript
// brief.tsx (lines 328-332)
import { CCISummaryChart } from '../../components/CCISummaryChart';

{DEMO_CIRCLE_MEMBERS.map((member) => (
  <CCISummaryChart
    values={member.capacityHistory}
    width={isWideScreen ? width - 280 : width - 48}
    chartId={member.id}
  />
))}
```

### Artifact (PDF)

**File:** `lib/cci/artifact.ts` → `generateCircleCCIArtifactHTML()`

```typescript
// artifact.ts (lines 796-802)
import { renderSummaryChartSVG } from './summaryChart';

function generateMemberChartSVG(memberName: string, values: number[]): string {
  return renderSummaryChartSVG(values, {
    includeGradientDefs: true,
    gradientId: memberName.toLowerCase(),
  });
}

// Used in generateCircleCCIArtifactHTML:
const miaChart = generateMemberChartSVG('Mia', FABRICATED_HISTORIES.mia);
const zachChart = generateMemberChartSVG('Zach', FABRICATED_HISTORIES.zach);
// ... etc
```

### Circle CCI Data Flow

```
DEMO_CIRCLE_MEMBERS (brief.tsx)     FABRICATED_HISTORIES (demoData.ts)
         │                                    │
         │ capacityHistory[]                  │ mia, zach, lily, tyler, emma
         ▼                                    ▼
┌─────────────────────┐              ┌─────────────────────┐
│ CCISummaryChart     │              │ generateMemberChart │
│ (React Native)      │              │ SVG() (artifact.ts) │
├─────────────────────┤              ├─────────────────────┤
│ renderSummaryChart  │              │ renderSummaryChart  │
│ SVG()               │              │ SVG()               │
└─────────────────────┘              └─────────────────────┘
         │                                    │
         ▼                                    ▼
    App Screen                         Circle CCI PDF
    (5 member cards)                   (5 member charts)
```

---

## Bundle CCI

### Brief (App Screen)

**File:** `components/BundleCCIPreview.tsx`

```typescript
// BundleCCIPreview.tsx
import { CCISummaryChart } from './CCISummaryChart';

<CCISummaryChart
  values={seat.capacityHistory}
  width={140}
  chartId={seat.id}
/>
```

### Artifact (PDF)

**File:** `lib/cci/bundleArtifact.ts`

```typescript
// bundleArtifact.ts
import { renderSummaryChartSVG, CAPACITY_COLORS } from './summaryChart';

function generateSeatChartSVG(seat: BundleSeatData): string {
  return renderSummaryChartSVG(seat.capacityHistory, {
    includeGradientDefs: true,
    gradientId: seat.id,
  });
}
```

### Bundle CCI Data Flow

```
generateBundleSeatData()
(bundleDemoData.ts)
         │
         │ BundleSeatData[]
         │ (10/15/20 seats)
         ▼
┌─────────────────────┐              ┌─────────────────────┐
│ BundleCCIPreview    │              │ bundleArtifact.ts   │
│ → CCISummaryChart   │              │ → generateSeatChart │
├─────────────────────┤              ├─────────────────────┤
│ renderSummaryChart  │              │ renderSummaryChart  │
│ SVG()               │              │ SVG()               │
└─────────────────────┘              └─────────────────────┘
         │                                    │
         ▼                                    ▼
    App Screen                         Bundle CCI PDF
    (5 per row grid)                   (5 per row grid)
    + Aggregate chart                  + Aggregate chart
```

---

## Key Differences: Circle vs Bundle

| Aspect | Circle CCI | Bundle CCI |
|--------|------------|------------|
| **Members** | 5 named individuals (Mia, Zach, Lily, Tyler, Emma) | 10/15/20 anonymous seats |
| **Avatars** | Photos from pravatar.cc | Colored circles with initials |
| **Identity** | Full names + usernames | Anonymous (no PII) |
| **Data Source** | `FABRICATED_HISTORIES` (demoData.ts) | `generateBundleSeatData()` (bundleDemoData.ts) |
| **Layout** | Horizontal cards (info + chart) | 5-per-row grid |
| **Aggregate** | No | Yes (combined average chart) |
| **Stats** | Per-member notes | Resourced/Stretched/Depleted counts |

---

## Shared Components

Both Circle and Bundle use the same underlying components:

| Component | Circle CCI | Bundle CCI |
|-----------|------------|------------|
| `CCISummaryChart.tsx` | ✓ (brief) | ✓ (brief) |
| `renderSummaryChartSVG()` | ✓ (artifact) | ✓ (artifact) |
| `CAPACITY_COLORS` | ✓ | ✓ |
| `SUMMARY_CHART` dimensions | ✓ (320×140) | ✓ (320×140) |

---

## Individual CCI (Exception)

**Individual CCI does NOT use the single source of truth.**

**File:** `lib/cci/artifact.ts` → `generateCCIArtifactHTML()`

The Individual CCI artifact (lines 24-732) contains a **hardcoded SVG chart** embedded directly in the HTML template. This is marked as "GOLDEN MASTER LOCKED" and should not be modified.

```typescript
// artifact.ts (line 1-12)
/**
 * CCI-Q4 Artifact Generator
 *
 * GOLDEN MASTER LOCKED: This file reproduces the EXACT HTML/CSS/SVG
 * from output/cci_ultra.html which generated the golden master PDF.
 *
 * DO NOT MODIFY VISUAL OUTPUT.
 * DO NOT REFACTOR STYLES.
 * DO NOT "IMPROVE" LAYOUT.
 */
```

The hardcoded chart is at lines 551-647 in artifact.ts.

---

## Commands

```bash
# Circle CCI (no separate script - part of cci:export)
npm run cci:export

# Bundle CCI
npm run bundle:export              # 10 seats (default)
npm run bundle:export -- 15        # 15 seats
npm run bundle:export -- 20        # 20 seats

# Output locations
output/cci_ultra.pdf               # Individual CCI
output/bundle-cci-{seats}.pdf      # Bundle CCI
```

---

## Visual Parity Guarantees

For Circle and Bundle CCI (using summaryChart.ts):

1. **Brief ↔ Artifact**: Charts are pixel-identical
2. **Color Consistency**: H/M/L colors (#00E5FF/#E8A830/#F44336)
3. **Dimensions**: 320×140px locked
4. **Downsampling**: 90-day → 6 points (same algorithm)
5. **Bezier Curves**: Same interpolation everywhere
