
'use client';
import { useState, useEffect } from 'react';
import { addDays, differenceInHours, addHours, format, startOfDay } from 'date-fns';
import { useDashboardStore } from '@/store/useDashboardStore';
import { Button } from '@/components/ui/button';

const today = startOfDay(new Date());
const windowStart = addDays(today, -15);
const windowEnd = addDays(today, 15);
const totalHours = differenceInHours(windowEnd, windowStart);

export function TimelineSlider(){
  const { timeRange, setTimeRange } = useDashboardStore();
  const [single, setSingle] = useState(false);
  const [val, setVal] = useState<[number,number]>(()=>{ const s=Math.max(0,differenceInHours(timeRange.start,windowStart)); const e=Math.min(totalHours,differenceInHours(timeRange.end,windowStart)); return [s,e]; });
  useEffect(()=>{ const s=Math.max(0,differenceInHours(timeRange.start,windowStart)); const e=Math.min(totalHours,differenceInHours(timeRange.end,windowStart)); setVal([s,e]); },[timeRange]);
  const apply=(v:[number,number])=>{ const ns=addHours(windowStart,v[0]); const ne=addHours(windowStart, single? v[0] : v[1]); setTimeRange({ start:ns, end:ne }); };
  return (<div className="p-4 bg-white rounded shadow">
    <div className="flex justify-between"><div className="text-sm">{format(timeRange.start,'MMM d, yyyy HH:mm')}</div><div className="text-sm">{format(timeRange.end,'MMM d, yyyy HH:mm')}</div></div>
    <div className="flex gap-2 mt-2"><input type="range" min={0} max={totalHours} value={val[0]} onChange={(e:any)=>{ const nv=[parseInt(e.target.value), val[1]]; setVal(nv); }} onMouseUp={()=>apply(val)} className="w-full" />{!single && <input type="range" min={0} max={totalHours} value={val[1]} onChange={(e:any)=>{ const nv=[val[0], parseInt(e.target.value)]; setVal(nv); }} onMouseUp={()=>apply(val)} className="w-full" />}</div>
    <div className="flex justify-between text-xs text-gray-500 mt-2"><span>{format(windowStart,'MMM d')}</span><span>Today</span><span>{format(windowEnd,'MMM d')}</span></div>
    <div className="mt-2"><Button onClick={()=>setSingle(!single)}>{single? 'Single' : 'Range'}</Button></div>
  </div>);
}
