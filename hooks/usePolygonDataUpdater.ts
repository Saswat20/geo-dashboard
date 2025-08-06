// hooks/usePolygonDataUpdater.ts
'use client';

import { useEffect, useRef } from 'react';
import { useDashboardStore } from '@/store/useDashboardStore';
import { fetchTemperatureData } from '@/services/openMeteoApi';
import { differenceInHours, startOfDay } from 'date-fns';
import type { ColorRule } from '@/types';

/**
 * Guard: average calculator
 */
const calculateAverage = (arr: (number | null | undefined)[] | null): number | null => {
  if (!arr || arr.length === 0) return null;
  const vals = arr.filter((v): v is number => typeof v === 'number' && !Number.isNaN(v));
  if (vals.length === 0) return null;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
};

const checkCondition = (value: number, operator: string, ruleValue: number): boolean => {
  switch (operator) {
    case '<': return value < ruleValue;
    case '<=': return value <= ruleValue;
    case '>': return value > ruleValue;
    case '>=': return value >= ruleValue;
    case '=': return value === ruleValue;
    default: return false;
  }
};

const getColorForValue = (value: number | null, rules: ColorRule[]): string => {
  if (value === null) return '#808080';
  // iterate rules in provided order (assuming user order)
  for (const r of rules) {
    if (checkCondition(value, r.operator, r.value)) return r.color;
  }
  return '#3388ff';
};

export const usePolygonDataUpdater = () => {
  // SELECTORS: use separate selectors for stability (no new objects created)
  const polygons = useDashboardStore((s) => s.polygons);
  const timeRange = useDashboardStore((s) => s.timeRange);
  const updatePolygonData = useDashboardStore((s) => s.updatePolygonData);

  // keep a ref to avoid racing and to detect if component is unmounted
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    if (!polygons || Object.keys(polygons).length === 0) return;

    let cancelled = false;

    const run = async () => {
      // iterate polygons snapshot
      const polyList = Object.values(polygons);
      for (const p of polyList) {
        // defensive: skip if no centroid
        if (!p?.centroid) {
          updatePolygonData(p.id, null, '#808080');
          continue;
        }

        // fetch hourly data (cached in service)
        const hourly = await fetchTemperatureData(p.centroid.lat, p.centroid.lng, timeRange.start, timeRange.end);
        if (cancelled || !mountedRef.current) return;

        if (!hourly || hourly.length === 0) {
          // only update if value actually different (to avoid loop)
          const prev = p.currentValue;
          if (prev !== null) updatePolygonData(p.id, null, '#808080');
          continue;
        }

        // compute slice offsets safely
        const dayStart = startOfDay(timeRange.start);
        const startOffset = Math.max(0, differenceInHours(timeRange.start, dayStart));
        const endOffset = Math.max(startOffset, differenceInHours(timeRange.end, dayStart));

        const slice = hourly.slice(startOffset, endOffset + 1);
        const avg = calculateAverage(slice);

        // compute color using this polygon's rules
        const color = getColorForValue(avg, p.rules ?? []);

        // only write if changed (value OR color)
        const valueChanged = (p.currentValue !== avg);
        const colorChanged = (p.displayColor !== color);

        if (valueChanged || colorChanged) {
          // update store once per polygon
          updatePolygonData(p.id, avg, color);
        }
      }
    };

    run().catch((err) => {
      // fail silently but log
      // eslint-disable-next-line no-console
      console.error('Polygon updater error', err);
    });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeRange.start?.toString(), timeRange.end?.toString(), JSON.stringify(Object.keys(polygons))]);
};
