
import { useEffect } from 'react';
import { useDashboardStore } from '@/store/useDashboardStore';
import { fetchTemperatureData } from '@/services/openMeteoApi';
import { differenceInHours, startOfDay } from 'date-fns';
import { ColorRule } from '@/types';

const avg = (arr:number[])=>{ const v=arr.filter(x=>typeof x==='number'); if(v.length===0) return null; return v.reduce((a,b)=>a+b,0)/v.length; };
const check=(value:number,op:string,val:number)=>{ switch(op){ case '<': return value<val; case '<=': return value<=val; case '>': return value>val; case '>=': return value>=val; case '=': return value===val; default: return false; } };
const getColor=(value:number|null,rules:ColorRule[])=>{ if(value===null) return '#808080'; for(const r of rules) if(check(value,r.operator,r.value)) return r.color; return '#3388ff'; };

export const usePolygonDataUpdater = ()=>{
  const { polygons, timeRange, updatePolygonData } = useDashboardStore(s=>({ polygons:s.polygons, timeRange:s.timeRange, updatePolygonData:s.updatePolygonData }));
  useEffect(()=>{
    let mounted=true;
    const run=async()=>{
      for(const p of Object.values(polygons)){
        const data = await fetchTemperatureData(p.centroid.lat,p.centroid.lng,timeRange.start,timeRange.end);
        if(!mounted) return;
        if(!data || data.length===0){ updatePolygonData(p.id,null,'#808080'); continue; }
        const dayStart = startOfDay(timeRange.start);
        const startOffset = differenceInHours(timeRange.start, dayStart);
        const endOffset = differenceInHours(timeRange.end, dayStart);
        const s = Math.max(0,startOffset), e = Math.max(s,endOffset);
        const slice = data.slice(s, e+1);
        const average = avg(slice);
        const color = getColor(average, p.rules);
        updatePolygonData(p.id, average, color);
      }
    };
    if(Object.keys(polygons).length>0) run();
    return ()=>{ mounted=false; };
  }, [polygons, timeRange, updatePolygonData]);
};
