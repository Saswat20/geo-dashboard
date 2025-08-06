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

export const usePolygonDataUpdater = () => {
  const mountedRef = useRef(true);
  const pendingTimerRef = useRef<number | null>(null);
  const runningRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    const getState = useDashboardStore.getState;
    const updatePolygonDataAction = () => getState().updatePolygonData;

    let cancelled = false;

    const performUpdate = async () => {
      if (runningRef.current) return;
      runningRef.current = true;

      try {
        const state = getState();
        const { polygons, timeRange } = state;
        const list = Object.values(polygons);

        for (const p of list) {
          if (cancelled || !mountedRef.current) break;

          if (!p?.centroid) {
            // double-check current store before writing
            const cur = getState().polygons[p.id];
            if (cur && (cur.currentValue !== null || cur.displayColor !== '#808080')) {
              updatePolygonDataAction()(p.id, null, '#808080');
            }
            continue;
          }

          const hourly = await fetchTemperatureData(p.centroid.lat, p.centroid.lng, timeRange.start, timeRange.end);
          if (cancelled || !mountedRef.current) break;

          if (!hourly || hourly.length === 0) {
            const cur = getState().polygons[p.id];
            if (cur && (cur.currentValue !== null || cur.displayColor !== '#808080')) {
              updatePolygonDataAction()(p.id, null, '#808080');
            }
            continue;
          }

          const dayStart = startOfDay(timeRange.start);
          const startOffset = Math.max(0, differenceInHours(timeRange.start, dayStart));
          const endOffset = Math.max(startOffset, differenceInHours(timeRange.end, dayStart));
          const slice = hourly.slice(startOffset, endOffset + 1);
          const avg = calculateAverage(slice);
          const color = getColorForValue(avg, p.rules ?? []);

          // double-check against latest store values to avoid writing identical values
          const cur = getState().polygons[p.id];
          const valueChanged = cur?.currentValue !== avg;
          const colorChanged = cur?.displayColor !== color;

          if (valueChanged || colorChanged) {
            updatePolygonDataAction()(p.id, avg, color);
          }
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('Polygon updater error', err);
      } finally {
        runningRef.current = false;
      }
    };

    // debounced scheduler to coalesce rapid updates
    const scheduleUpdate = (delay = 500) => {
      if (pendingTimerRef.current) {
        clearTimeout(pendingTimerRef.current);
        pendingTimerRef.current = null;
      }
      // window.setTimeout returns number; store it
      pendingTimerRef.current = window.setTimeout(() => {
        if (!cancelled && mountedRef.current) performUpdate();
        pendingTimerRef.current = null;
      }, delay) as unknown as number;
    };

    // run initially
    scheduleUpdate(0);

    // subscribe to timeRange (stringify date to avoid unstable object identity)
    const unsubTime = useDashboardStore.subscribe(
      (s) => `${s.timeRange.start?.toString() || ''}__${s.timeRange.end?.toString() || ''}`,
      () => {
        scheduleUpdate(300); // quick debounce when time changes
      }
    );

    // subscribe to polygons keys (add/delete)
    const unsubPolys = useDashboardStore.subscribe(
      (s) => Object.keys(s.polygons).join(','),
      () => {
        scheduleUpdate(300);
      }
    );

    // subscribe to polygon rules changes (detect changes by concatenating JSON)
    const unsubRules = useDashboardStore.subscribe(
      (s) => {
        const ids = Object.keys(s.polygons);
        return ids.map((id) => JSON.stringify(s.polygons[id]?.rules ?? [])).join('|');
      },
      () => {
        scheduleUpdate(500);
      }
    );

    return () => {
      cancelled = true;
      if (pendingTimerRef.current) {
        clearTimeout(pendingTimerRef.current);
        pendingTimerRef.current = null;
      }
      unsubTime();
      unsubPolys();
      unsubRules();
    };
    // empty deps — we rely on subscriptions and imperative getState
  }, []);
};
