
'use client';
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw/dist/leaflet.draw.css';
import { MapContainer, TileLayer, FeatureGroup, Polygon, Tooltip } from 'react-leaflet';
import { EditControl } from 'react-leaflet-draw';
import L from 'leaflet';
import { useDashboardStore } from '@/store/useDashboardStore';
import { useRef } from 'react';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png'
});

const centroid = (pts:any[])=>{ let lat=0,lng=0; for(const p of pts){ lat+=p.lat; lng+=p.lng; } return { lat: lat/pts.length, lng: lng/pts.length }; };

export default function MapComponent(){
  const { polygons, addPolygon, setActivePolygonId, isDrawing, toggleIsDrawing, deletePolygon, updatePolygonLatlngs } = useDashboardStore();
  const fgRef = useRef<any>(null);

  const onCreated = (e:any)=>{
    const { layerType, layer } = e;
    if(layerType==='polygon'){
      const latlngs = layer.getLatLngs()[0].map((p:any)=>({lat:p.lat,lng:p.lng}));
      if(latlngs.length<3 || latlngs.length>12){ alert('Polygon must have 3-12 points'); layer.remove(); return; }
      const c = centroid(latlngs);
      const id = `poly_${Date.now()}`;
      addPolygon({ id, latlngs, centroid:c, dataSource:'temperature_2m' });
      toggleIsDrawing(false);
    }
  };

  const onEdited = (e:any)=>{
    const layers = e.layers;
    layers.eachLayer((layer:any)=>{
      if(layer instanceof L.Polygon){
        const latlngs = layer.getLatLngs()[0].map((p:any)=>({lat:p.lat,lng:p.lng}));
        const c = centroid(latlngs);
        // find nearest polygon by centroid
        let best=null; let bd=Infinity;
        for(const p of Object.values(polygons)){ const d = Math.abs(p.centroid.lat-c.lat)+Math.abs(p.centroid.lng-c.lng); if(d<bd){ bd=d; best=p; } }
        if(best && bd<0.5) updatePolygonLatlngs(best.id, latlngs, c);
      }
    });
  };

  const onDeleted = (e:any)=>{
    const layers = e.layers;
    layers.eachLayer((layer:any)=>{
      if(layer instanceof L.Polygon){
        const latlngs = layer.getLatLngs()[0].map((p:any)=>({lat:p.lat,lng:p.lng}));
        const c = centroid(latlngs);
        let best=null; let bd=Infinity;
        for(const p of Object.values(polygons)){ const d = Math.abs(p.centroid.lat-c.lat)+Math.abs(p.centroid.lng-c.lng); if(d<bd){ bd=d; best=p; } }
        if(best && bd<0.5) deletePolygon(best.id);
      }
    });
  };

  return (
    <MapContainer center={[22.3511148,78.6677428]} zoom={5} minZoom={5} maxZoom={5} scrollWheelZoom={false} doubleClickZoom={false} className="h-full w-full">
      <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" attribution="&copy; OpenStreetMap contributors" />
      <FeatureGroup ref={fgRef}>
        <EditControl position="topright" onCreated={onCreated} onEdited={onEdited} onDeleted={onDeleted} onDrawStart={()=>toggleIsDrawing(true)} onDrawStop={()=>toggleIsDrawing(false)} draw={{ rectangle:false, circle:false, circlemarker:false, marker:false, polyline:false, polygon:{allowIntersection:false, shapeOptions:{color:'#0ea5e9'}} }} edit={{ featureGroup: fgRef.current as any, edit:true, remove:true }} />
      </FeatureGroup>
      {Object.values(polygons).map((p:any)=>(
        <Polygon key={p.id} positions={p.latlngs} pathOptions={{ color:p.displayColor, fillColor:p.displayColor, weight:2, fillOpacity:0.6 }} eventHandlers={{ click: ()=> setActivePolygonId(p.id) }}>
          <Tooltip sticky><div className="font-medium">{p.name}</div><div className="text-xs">{p.currentValue!==null? p.currentValue.toFixed(2)+'°C':'Loading...'}</div></Tooltip>
        </Polygon>
      ))}
    </MapContainer>
  );
}
