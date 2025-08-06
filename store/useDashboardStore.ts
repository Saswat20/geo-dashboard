
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { DashboardState, DashboardActions, PolygonData, ColorRule } from '@/types';
import { addDays, startOfDay } from 'date-fns';
const today = startOfDay(new Date());
const initial = { timeRange: { start: addDays(today,-15), end: addDays(today,-15) }, polygons:{}, activePolygonId:null, isDrawing:false };
export const useDashboardStore = create<DashboardState & DashboardActions>()(persist((set,get)=>({ ...initial,
  setTimeRange:(r)=>set({timeRange:r}),
  toggleIsDrawing:(f)=>set(s=>({isDrawing: f!==undefined?f:!s.isDrawing})),
  setActivePolygonId:(id)=>set({activePolygonId:id}),
  addPolygon:(poly)=>{ const id=poly.id; const defaultRules:ColorRule[]=[{id:'1',operator:'<',value:10,color:'#ff4d4d'},{id:'2',operator:'<',value:25,color:'#ffff4d'},{id:'3',operator:'<',value:30,color:'#4da6ff'}]; const newPoly:PolygonData={...poly,name:`Region ${Object.keys(get().polygons).length+1}`,rules:defaultRules,currentValue:null,displayColor:'#808080'}; set(s=>({polygons:{...s.polygons,[id]:newPoly},activePolygonId:id,isDrawing:false})); },
  deletePolygon:(id)=>set(s=>{ const np={...s.polygons}; delete np[id]; return {polygons:np, activePolygonId: s.activePolygonId===id?null:s.activePolygonId}; }),
  updatePolygonRules:(id,rules)=>set(s=>({polygons:{...s.polygons,[id]:{...s.polygons[id],rules}}})),
  updatePolygonData:(id,value,color)=>set(s=>({polygons:{...s.polygons,[id]:{...s.polygons[id],currentValue:value,displayColor:color}}})),
  updatePolygonName:(id,name)=>set(s=>({polygons:{...s.polygons,[id]:{...s.polygons[id],name}}}))
}), { name:'dashboard-storage', storage:createJSONStorage(()=>localStorage, { reviver:(k,v)=> { if (k==='timeRange' && v && typeof v==='object') return { start:new Date(v.start), end:new Date(v.end) }; return v; } }) } ));
