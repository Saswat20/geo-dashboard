// hooks/usePolygonDataUpdater.ts
'use client';

import { useEffect, useRef } from 'react';
import { useDashboardStore } from '@/store/useDashboardStore';
import { fetchTemperatureData } from '@/services/openMeteoApi';
import { differenceInHours, startOfDay } from 'date-fns';
import type { ColorRule } from '@/types';

/**
 * Helper: safe average
 */
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

const getColorForValue = (value: number | null, rules: ColorRule[]): string => {
  if (value === null) return '#808080';
  for (const r of rules) {
    if (checkCondition(value, r.operator, r.value)) return r.color;
  }
  return '#3388ff';
};

/**
 * Main hook — uses imperative store access + subscriptions
 */
export const usePolygonDataUpdater = () => {
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    // short helpers for store API
    const getState = useDashboardStore.getState;
    const setStateUpdater = (id: string, value: number | null, color: string) => {
      // call the store action to update polygon data
      const updateFn = useDashboardStore.getState().updatePolygonData;
      updateFn(id, value, color);
    };

    let running = false;
    let cancelled = false;

    const updateAllPolygons = async () => {
      if (running) return; // prevent concurrent runs
      running = true;
      try {
        const state = getState();
        const { polygons, timeRange } = state;
        const polyList = Object.values(polygons);

        for (const p of polyList) {
          if (cancelled || !mountedRef.current) break;
          if (!p || !p.centroid) {
            setStateUpdater(p.id, null, '#808080');
            continue;
          }

          const hourly = await fetchTemperatureData(p.centroid.lat, p.centroid.lng, timeRange.start, timeRange.end);
          if (cancelled || !mountedRef.current) break;

          if (!hourly || hourly.length === 0) {
            // only update if previously had a value to avoid unnecessary store writes
            if (p.currentValue !== null || p.displayColor !== '#808080') {
              setStateUpdater(p.id, null, '#808080');
            }
            continue;
          }

          const dayStart = startOfDay(timeRange.start);
          const startOffset = Math.max(0, differenceInHours(timeRange.start, dayStart));
          const endOffset = Math.max(startOffset, differenceInHours(timeRange.end, dayStart));
          const slice = hourly.slice(startOffset, endOffset + 1);
          const avg = calculateAverage(slice);
          const color = getColorForValue(avg, p.rules ?? []);

          const valueChanged = p.currentValue !== avg;
          const colorChanged = p.displayColor !== color;
          if (valueChanged || colorChanged) {
            setStateUpdater(p.id, avg, color);
          }
        }
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error('Polygon updater error', e);
      } finally {
        running = false;
      }
    };

    // Run once initially
    updateAllPolygons();

    // Subscribe to two things: timeRange changes and polygons added/removed
    const unsubTime = useDashboardStore.subscribe(
      (s) => s.timeRange,
      () => {
        // schedule update (microtask)
        setTimeout(() => { if (!cancelled) updateAllPolygons(); }, 0);
      }
    );

    const unsubPolys = useDashboardStore.subscribe(
      (s) => Object.keys(s.polygons).join(','),
      () => {
        // polygons list changed (add/delete); refresh
        setTimeout(() => { if (!cancelled) updateAllPolygons(); }, 0);
      }
    );

    // also subscribe to rule changes (if user edits rules of a polygon)
    const unsubRules = useDashboardStore.subscribe(
      (s) => {
        // concatenated JSON of rules hashes to detect rule edits
        const ids = Object.keys(s.polygons);
        return ids.map((id) => JSON.stringify(s.polygons[id]?.rules ?? [])).join('|');
      },
      () => {
        setTimeout(() => { if (!cancelled) updateAllPolygons(); }, 0);
      }
    );

    return () => {
      cancelled = true;
      unsubTime();
      unsubPolys();
      unsubRules();
    };
  }, []);
};
