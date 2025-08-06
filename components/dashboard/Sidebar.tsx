
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
    <div className="flex-1 overflow-y-auto">
      <h3 className="font-semibold">My Regions</h3>
      {Object.keys(polygons).length===0 && <p className="text-gray-500">No regions drawn yet.</p>}
      {Object.values(polygons).map((p:any)=>(<div key={p.id} className="p-2 mb-2 rounded flex justify-between items-center" onClick={()=>setActivePolygonId(p.id)}><div className="flex items-center gap-2"><div className="w-4 h-4 rounded-full" style={{backgroundColor:p.displayColor}}></div><div><div className="font-medium">{p.name}</div><div className="text-xs text-gray-500">{p.currentValue!==null? p.currentValue.toFixed(2) : 'Loading...'}</div></div></div><div><Button onClick={(e:any)=>{ e.stopPropagation(); deletePolygon(p.id); }}>Delete</Button></div></div>))}
    </div>
    {active && <Card><div className="p-2 space-y-2"><Label>Region Name</Label><Input value={active.name} onChange={(e:any)=>updatePolygonName(active.id,e.target.value)} /><Label>Color Rules</Label>{active.rules.map((r:any,idx:number)=>(<div key={r.id} className="flex items-center gap-2"><select value={r.operator} onChange={(e:any)=>onRuleChange(idx,'operator',e.target.value)} className="p-1 border rounded"><option value="<">{'<'}</option><option value="<=">{'<='}</option><option value="=">{'='}</option><option value=">">{'>'}</option><option value=">=">{'>='}</option></select><Input type="number" value={r.value} onChange={(e:any)=>onRuleChange(idx,'value',e.target.value)} className="w-20" /><input type="color" value={r.color} onChange={(e:any)=>onRuleChange(idx,'color',e.target.value)} className="w-12 h-10 border-0" /></div>))}</div></Card>}
  </aside>);
}
