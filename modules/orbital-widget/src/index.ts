import { requireNativeModule, Platform } from 'expo-modules-core';

type CapacityColor = 'cyan' | 'amber' | 'red';

interface OrbitalWidgetModuleType {
  updateWidgetColor(color: string): boolean;
  getWidgetColor(): string | null;
  reloadWidget(): void;
}

const OrbitalWidgetModule: OrbitalWidgetModuleType | null =
  Platform.OS === 'ios' ? requireNativeModule('OrbitalWidget') : null;

export function updateWidgetColor(color: CapacityColor): boolean {
  if (!OrbitalWidgetModule) {
    return false;
  }
  return OrbitalWidgetModule.updateWidgetColor(color);
}

export function getWidgetColor(): CapacityColor | null {
  if (!OrbitalWidgetModule) {
    return null;
  }
  return OrbitalWidgetModule.getWidgetColor() as CapacityColor | null;
}

export function reloadWidget(): void {
  if (!OrbitalWidgetModule) {
    return;
  }
  OrbitalWidgetModule.reloadWidget();
}

export function capacityStateToColor(state: 'resourced' | 'stretched' | 'depleted'): CapacityColor {
  switch (state) {
    case 'resourced':
      return 'cyan';
    case 'stretched':
      return 'amber';
    case 'depleted':
      return 'red';
    default:
      return 'cyan';
  }
}

export function updateWidgetFromCapacityState(state: 'resourced' | 'stretched' | 'depleted'): boolean {
  const color = capacityStateToColor(state);
  return updateWidgetColor(color);
}
