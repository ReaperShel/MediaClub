import type { RefObject } from "react";

export type LabelScreenPos = {
  x: number;
  y: number;
  visible: boolean;
};

export type LabelPositions = Record<string, LabelScreenPos | undefined>;

export const labelPositionsStore: {
  positions: LabelPositions;
  listeners: Set<() => void>;
  canvasEl: RefObject<HTMLElement | null>;
} = {
  positions: {},
  listeners: new Set(),
  canvasEl: { current: null },
};

export function subscribeLabelPositions(fn: () => void) {
  labelPositionsStore.listeners.add(fn);
  return () => labelPositionsStore.listeners.delete(fn);
}

export function notifyLabelPositions() {
  labelPositionsStore.listeners.forEach((fn) => fn());
}
