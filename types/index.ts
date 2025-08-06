
import { LatLngExpression } from 'leaflet';
export interface TimeRange { start: Date; end: Date; }
export type Operator = '>' | '>=' | '<' | '<=' | '=';
export interface ColorRule { id: string; operator: Operator; value: number; color: string; }
export type DataSource = 'temperature_2m';
export interface PolygonData { id:string; name:string; latlngs: LatLngExpression[]; centroid:{lat:number;lng:number}; dataSource:DataSource; rules:ColorRule[]; currentValue:number|null; displayColor:string; }
export interface DashboardState { timeRange:TimeRange; polygons:Record<string,PolygonData>; activePolygonId:string|null; isDrawing:boolean; }
export interface DashboardActions { setTimeRange:(r:TimeRange)=>void; addPolygon:(p:Omit<PolygonData,'name'|'rules'|'currentValue'|'displayColor'>)=>void; deletePolygon:(id:string)=>void; setActivePolygonId:(id:string|null)=>void; updatePolygonRules:(id:string,rules:ColorRule[])=>void; updatePolygonData:(id:string,value:number|null,color:string)=>void; updatePolygonName:(id:string,name:string)=>void; toggleIsDrawing:(force?:boolean)=>void; }
