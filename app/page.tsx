
'use client';
import dynamic from 'next/dynamic';
import { useMemo } from 'react';
import { Sidebar } from '@/components/dashboard/Sidebar';
import { TimelineSlider } from '@/components/dashboard/TimelineSlider';
import { usePolygonDataUpdater } from '@/hooks/usePolygonDataUpdater';
import { useDashboardStore } from '@/store/useDashboardStore';

export default function Page() {
  usePolygonDataUpdater();
  const MapComponent = useMemo(() => dynamic(() => import('@/components/dashboard/MapComponent'), { ssr:false }), []);
  return (
    <main className="flex h-screen w-screen bg-gray-100 text-gray-800">
      <Sidebar />
      <div className="flex-1 flex flex-col p-4 gap-4">
        <TimelineSlider />
        <div className="flex-1 rounded-lg overflow-hidden shadow"><MapComponent /></div>
      </div>
    </main>
  );
}
