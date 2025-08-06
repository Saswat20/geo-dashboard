// store/useDashboardStore.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { addDays, startOfDay } from 'date-fns';
import { DashboardState, DashboardActions, PolygonData } from '@/types';

const today = startOfDay(new Date()); // Use start of today to be consistent

const initialTimeRange = {
  start: addDays(today, -15),
  end: addDays(today, -15),
};

export const useDashboardStore = create<DashboardState & DashboardActions>()(
  persist(
    (set, get) => ({
      timeRange: initialTimeRange,
      polygons: {},
      activePolygonId: null,
      isDrawing: false,

      setTimeRange: (timeRange) => set({ timeRange }),

      toggleIsDrawing: (force) => set((state) => ({ isDrawing: force !== undefined ? force : !state.isDrawing })),

      setActivePolygonId: (id) => set({ activePolygonId: id }),

      addPolygon: (polygon) => {
        const newId = polygon.id;
        const newPolygon: PolygonData = {
          ...polygon,
          name: `Region ${Object.keys(get().polygons).length + 1}`,
          rules: [
            { id: '1', operator: '<', value: 10, color: '#ff4d4d' },
            { id: '2', operator: '<', value: 25, color: '#ffff4d' },
            { id: '3', operator: '<', value: 30, color: '#4da6ff' },
          ],
          currentValue: null,
          displayColor: '#808080',
        };
        set((state) => ({
          polygons: { ...state.polygons, [newId]: newPolygon },
          activePolygonId: newId,
          isDrawing: false,
        }));
      },

      deletePolygon: (id) => {
        const newPolygons = { ...get().polygons };
        delete newPolygons[id];
        set({
          polygons: newPolygons,
          activePolygonId: get().activePolygonId === id ? null : get().activePolygonId,
        });
      },

      updatePolygonRules: (id, rules) => {
        if (!get().polygons[id]) return;
        set((state) => ({
          polygons: { ...state.polygons, [id]: { ...state.polygons[id], rules } },
        }));
      },

      updatePolygonName: (id, name) => {
        if (!get().polygons[id]) return;
        set((state) => ({
          polygons: { ...state.polygons, [id]: { ...state.polygons[id], name } },
        }));
      },

      // <<-- idempotent updatePolygonData (only writes when value/color actually change)
      updatePolygonData: (id, value, color) => {
        const polygons = get().polygons;
        if (!polygons[id]) return;

        // check if anything actually changed to avoid re-writing identical state (prevents loops)
        const existing = polygons[id];
        const valueChanged = existing.currentValue !== value;
        const colorChanged = existing.displayColor !== color;

        if (!valueChanged && !colorChanged) {
          return;
        }

        set((state) => ({
          polygons: {
            ...state.polygons,
            [id]: {
              ...state.polygons[id],
              currentValue: value,
              displayColor: color,
            },
          },
        }));
      },
      // <<-- end updatePolygonData

    }),
    {
      name: 'dashboard-storage',
      storage: createJSONStorage(() => localStorage, {
        reviver: (key, value) => {
          if (key === 'timeRange' && value && typeof value === 'object') {
            return { start: new Date((value as any).start), end: new Date((value as any).end) };
          }
          return value;
        },
      }),
    }
  )
);
