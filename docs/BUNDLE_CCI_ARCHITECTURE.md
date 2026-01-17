# Bundle CCI Architecture

## Single Source of Truth

All Bundle CCI chart rendering flows through one file:

```
lib/cci/summaryChart.ts → renderSummaryChartSVG()
```

## Architecture Diagram

```
                    lib/cci/summaryChart.ts
                    ┌─────────────────────────────────────┐
                    │  SINGLE SOURCE OF TRUTH             │
                    │                                     │
                    │  • SUMMARY_CHART dimensions         │
                    │  • CAPACITY_COLORS (H/M/L)          │
                    │  • downsampleTo6Points()            │
                    │  • renderSummaryChartSVG()          │
                    └─────────────────────────────────────┘
                                    │
                                    │ exports
                                    │
          ┌─────────────────────────┼─────────────────────────┐
          │                         │                         │
          ▼                         ▼                         ▼
┌─────────────────────┐  ┌─────────────────────┐  ┌─────────────────────┐
│ CCISummaryChart.tsx │  │ bundleArtifact.ts   │  │ bundle-cci-export   │
│ (React Native)      │  │ (HTML Generator)    │  │ -pdf.ts (Script)    │
├─────────────────────┤  ├─────────────────────┤  ├─────────────────────┤
│ import { render-    │  │ import { render-    │  │ import { generate-  │
│   SummaryChartSVG } │  │   SummaryChartSVG } │  │   BundleCCIArtifact │
│                     │  │                     │  │   HTML }            │
│ <SvgXml xml={svg}/> │  │ Chart SVG embedded  │  │                     │
│                     │  │ in HTML template    │  │ Playwright → PDF    │
└─────────────────────┘  └─────────────────────┘  └─────────────────────┘
          │                         │                         │
          ▼                         ▼                         ▼
┌─────────────────────┐  ┌─────────────────────┐  ┌─────────────────────┐
│ BundleCCIPreview    │  │ Plan Mode iframe    │  │ output/bundle-cci-  │
│ (App Brief Screen)  │  │ preview             │  │ {seats}.pdf         │
└─────────────────────┘  └─────────────────────┘  └─────────────────────┘
```

## File Reference

### Core Source of Truth

| File | Purpose |
|------|---------|
| `lib/cci/summaryChart.ts` | Chart dimensions, colors, and SVG rendering |

**Key Exports:**
```typescript
export const SUMMARY_CHART = {
  width: 320,
  height: 140,
  padding: { left: 32, right: 8, top: 8, bottom: 24 },
  graphWidth: 280,
  graphHeight: 108,
  bandHeight: 36,
};

export const CAPACITY_COLORS = {
  resourced: '#00E5FF',  // Cyan - High (≥66%)
  stretched: '#E8A830',  // Amber - Medium (33-66%)
  depleted: '#F44336',   // Red - Low (<33%)
  background: '#0a0b10',
};

export function renderSummaryChartSVG(
  values: number[],
  options?: SummaryChartOptions
): string;

export function downsampleTo6Points(data: number[], targetPoints?: number): number[];
export function getCapacityColor(value: number): string;
```

### Brief (App Screen)

| File | Purpose |
|------|---------|
| `components/BundleCCIPreview.tsx` | Main bundle preview component |
| `components/CCISummaryChart.tsx` | React Native chart wrapper |

**Code Path (Brief):**
```typescript
// BundleCCIPreview.tsx
import { CCISummaryChart } from './CCISummaryChart';

<CCISummaryChart
  values={seat.capacityHistory}
  width={140}
  chartId={seat.id}
/>

// CCISummaryChart.tsx
import { renderSummaryChartSVG } from '../lib/cci/summaryChart';

const svgString = renderSummaryChartSVG(values, {
  includeGradientDefs: true,
  gradientId: chartId,
});

<SvgXml xml={svgString} width={displayWidth} height={displayHeight} />
```

### Artifact (PDF/Print)

| File | Purpose |
|------|---------|
| `lib/cci/bundleArtifact.ts` | HTML artifact generator |
| `scripts/bundle-cci-export-pdf.ts` | PDF export script |

**Code Path (Artifact):**
```typescript
// bundleArtifact.ts
import { renderSummaryChartSVG, CAPACITY_COLORS } from './summaryChart';

function generateSeatChartSVG(seat: BundleSeatData): string {
  return renderSummaryChartSVG(seat.capacityHistory, {
    includeGradientDefs: true,
    gradientId: seat.id,
  });
}

// bundle-cci-export-pdf.ts
import { generateBundleCCIArtifactHTML } from '../lib/cci/bundleArtifact';

const html = generateBundleCCIArtifactHTML(seatCount);
// → Playwright renders to PDF
```

### Supporting Files

| File | Purpose |
|------|---------|
| `lib/cci/bundleDemoData.ts` | Demo data generation for bundles |
| `components/BundleSeatAvatar.tsx` | Avatar component with capacity ring |

## Chart Rendering Guarantees

Because all rendering flows through `renderSummaryChartSVG()`:

1. **Visual Parity**: Brief and Artifact charts are pixel-identical
2. **Color Consistency**: H/M/L colors match everywhere
3. **Dimension Lock**: 320×140px chart dimensions enforced
4. **Downsampling**: 90-day data → 6 points (same algorithm)
5. **Bezier Curves**: Same smooth interpolation everywhere

## Commands

```bash
# Generate Bundle CCI PDF
npm run bundle:export              # 10 seats (default)
npm run bundle:export -- 15        # 15 seats
npm run bundle:export -- 20        # 20 seats

# Output location
output/bundle-cci-{seats}.pdf
```

## Visual Elements

### Chart (320×140)
- 6 downsampled data points
- Bezier curve interpolation
- Area fill with gradient
- Multi-layer node markers (dark ring → colored core → white center)
- H/M/L zone bands with dashed dividers
- Oct/Nov/Dec x-axis labels

### Bundle Artifact Layout
- 5 seats per row (grid)
- Mini chart cards with avatar + state indicator
- Stats summary (Resourced/Stretched/Depleted counts)
- Combined aggregate chart
- Chain of custody metadata
- Privacy notice (avatars only, no PII)

## Plan Mode

`BundleCCIPreview` includes a toggle between:
- **Interactive**: Tap seats to view full chart in modal
- **Plan Mode**: iframe preview of PDF artifact HTML

Both modes use the same `renderSummaryChartSVG()` source.
