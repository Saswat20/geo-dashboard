
import { format } from 'date-fns';
const API_URL = 'https://archive-api.open-meteo.com/v1/archive';
const cache = new Map<string, number[]>();
export const fetchTemperatureData = async (lat:number, lon:number, startDate:Date, endDate:Date) => {
  const startStr = format(startDate,'yyyy-MM-dd');
  const endStr = format(endDate,'yyyy-MM-dd');
  const key = `${lat.toFixed(4)}_${lon.toFixed(4)}_${startStr}_${endStr}`;
  if (cache.has(key)) return cache.get(key) || [];
  const url = `${API_URL}?latitude=${lat.toFixed(4)}&longitude=${lon.toFixed(4)}&start_date=${startStr}&end_date=${endStr}&hourly=temperature_2m`;
  try { const res = await fetch(url); if(!res.ok){ console.error('err', await res.text()); return []; } const data = await res.json(); const arr = data?.hourly?.temperature_2m || []; cache.set(key,arr); return arr; } catch(e){ console.error(e); return []; }
};
