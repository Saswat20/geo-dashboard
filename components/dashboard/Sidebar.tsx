
'use client';
import { useDashboardStore } from '@/store/useDashboardStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';

export function Sidebar(){
  const { polygons, activePolygonId, setActivePolygonId, deletePolygon, updatePolygonName, updatePolygonRules, isDrawing, toggleIsDrawing } = useDashboardStore();
  const active = activePolygonId ? polygons[activePolygonId] : null;
  const onRuleChange = (idx:number, field:string, val:any)=>{ if(!active) return; const nr=[...active.rules]; (nr[idx] as any)[field] = field==='value'? parseFloat(val)||0 : val; updatePolygonRules(active.id, nr); };
  return (<aside className="w-96 bg-white border-r p-4 flex flex-col gap-4">
    <h2 className="text-2xl font-bold">Controls</h2>
    <Button onClick={()=>toggleIsDrawing()}>{isDrawing? 'Cancel Drawing' : 'Draw New Region'}</Button>
     <div className="flex items-center gap-2">
    <Button onClick={refreshAllPolygons} variant="outline">Refresh Data</Button>
    <span className="text-sm text-gray-500">Fetches current timeline values for all regions</span>
  </div>

    {active && <Card><div className="p-2 space-y-2"><Label>Region Name</Label><Input value={active.name} onChange={(e:any)=>updatePolygonName(active.id,e.target.value)} /><Label>Color Rules</Label>{active.rules.map((r:any,idx:number)=>(<div key={r.id} className="flex items-center gap-2"><select value={r.operator} onChange={(e:any)=>onRuleChange(idx,'operator',e.target.value)} className="p-1 border rounded"><option value="<">{'<'}</option><option value="<=">{'<='}</option><option value="=">{'='}</option><option value=">">{'>'}</option><option value=">=">{'>='}</option></select><Input type="number" value={r.value} onChange={(e:any)=>onRuleChange(idx,'value',e.target.value)} className="w-20" /><input type="color" value={r.color} onChange={(e:any)=>onRuleChange(idx,'color',e.target.value)} className="w-12 h-10 border-0" /></div>))}</div></Card>}
  </aside>);
}
