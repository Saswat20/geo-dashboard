// hooks/usePolygonDataUpdater.ts
'use client';

import { useEffect, useRef } from 'react';
import { useDashboardStore } from '@/store/useDashboardStore';
import { fetchTemperatureData } from '@/services/openMeteoApi';
import { differenceInHours, startOfDay } from 'date-fns';
import type { ColorRule } from '@/types';

/** safe average */
const calculateAverage = (arr: (number | null | undefined)[] | null): number | null => {
  if (!arr || arr.length === 0) return null;
  const nums = arr.filter((v): v is number => typeof v === 'number' && !Number.isNaN(v));
  if (nums.length === 0) return null;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
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

const getColorForValue = (value: number | null, rules: ColorRule[] = []): string => {
  if (value === null) return '#808080';
  for (const r of rules) {
    if (checkCondition(value, r.operator, r.value)) return r.color;
  }
  return '#3388ff';
};

/**
 * usePolygonDataUpdater
 * - Imperative getState + subscribe pattern to avoid React getServerSnapshot issues.
 * - Debounced scheduling so rapid store changes don't re-run fetches repeatedly.
 * - Guards against concurrent runs and avoids writing identical values (store also guards).
 */
export const usePolygonDataUpdater = () => {
  const mountedRef = useRef(true);
  const timerRef = useRef<number | null>(null);
  const runningRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    const getState = useDashboardStore.getState;
    let cancelled = false;

    const performUpdate = async () => {
      if (runningRef.current || cancelled || !mountedRef.current) return;
      runningRef.current = true;
      try {
        const { polygons, timeRange } = getState();
        const polyList = Object.values(polygons);

        for (const p of polyList) {
          if (cancelled || !mountedRef.current) break;
          if (!p?.centroid) {
            // If store has something non-default, clear it (store's update checks equality)
            useDashboardStore.getState().updatePolygonData(p.id, null, '#808080');
            continue;
          }

          const hourly = await fetchTemperatureData(p.centroid.lat, p.centroid.lng, timeRange.start, timeRange.end);
          if (cancelled || !mountedRef.current) break;

          if (!hourly || hourly.length === 0) {
            useDashboardStore.getState().updatePolygonData(p.id, null, '#808080');
            continue;
          }

          const dayStart = startOfDay(timeRange.start);
          const startOffset = Math.max(0, differenceInHours(timeRange.start, dayStart));
          const endOffset = Math.max(startOffset, differenceInHours(timeRange.end, dayStart));
          const slice = hourly.slice(startOffset, endOffset + 1);
          const avg = calculateAverage(slice);
          const color = getColorForValue(avg, p.rules ?? []);

          // update store (the store now avoids identical writes)
          useDashboardStore.getState().updatePolygonData(p.id, avg, color);
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('Polygon updater error', err);
      } finally {
        runningRef.current = false;
      }
    };

    const schedule = (delay = 300) => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      timerRef.current = window.setTimeout(() => {
        if (!cancelled && mountedRef.current) performUpdate();
        timerRef.current = null;
      }, delay) as unknown as number;
    };

    // initial run on mount (short delay to allow store hydration)
    schedule(50);

    // subscribe: timeRange changes
    const unsubTime = useDashboardStore.subscribe(
      (s) => `${s.timeRange.start?.getTime() || 0}_${s.timeRange.end?.getTime() || 0}`,
      () => { schedule(250); }
    );

    // subscribe: polygon add/remove
    const unsubPolys = useDashboardStore.subscribe(
      (s) => Object.keys(s.polygons).join(','),
      () => { schedule(250); }
    );

    // subscribe: rules edits (stringify rules)
    const unsubRules = useDashboardStore.subscribe(
      (s) => {
        const keys = Object.keys(s.polygons);
        return keys.map((k) => JSON.stringify(s.polygons[k]?.rules ?? [])).join('|');
      },
      () => { schedule(400); }
    );

    return () => {
      cancelled = true;
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      unsubTime();
      unsubPolys();
      unsubRules();
    };
  }, []);
};
