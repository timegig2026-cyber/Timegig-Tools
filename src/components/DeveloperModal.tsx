import React, { useState } from 'react';
import { X, Copy, Check, Terminal, FileCode2, ExternalLink } from 'lucide-react';

interface DeveloperModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DeveloperModal: React.FC<DeveloperModalProps> = ({ isOpen, onClose }) => {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  if (!isOpen) return null;

  const handleCopy = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const reactSnippet = `import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

export function SimpleOsmUserMap() {
  const mapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mapRef.current) return;

    // 1. Initialize map
    const map = L.map(mapRef.current).setView([0, 0], 2);

    // 2. Add OpenStreetMap tile layer (100% Free, No API key)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);

    // 3. Track user location via browser HTML5 Geolocation API
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude, accuracy } = position.coords;

          // Pan to user location
          map.setView([latitude, longitude], 15);

          // User marker with accuracy radius
          L.marker([latitude, longitude]).addTo(map)
            .bindPopup('You are here! Accuracy: &plusmn;' + Math.round(accuracy) + 'm')
            .openPopup();

          L.circle([latitude, longitude], {
            radius: accuracy,
            color: '#2563eb',
            fillColor: '#3b82f6',
            fillOpacity: 0.15,
          }).addTo(map);
        },
        (error) => console.error('Geolocation failed:', error.message),
        { enableHighAccuracy: true, timeout: 10000 }
      );
    }

    return () => { map.remove(); };
  }, []);

  return <div ref={mapRef} style={{ width: '100%', height: '500px' }} />;
}`;

  const htmlSnippet = `<!DOCTYPE html>
<html>
<head>
  <title>OpenStreetMap Free Location Map</title>
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <style>#map { height: 100vh; width: 100%; margin: 0; }</style>
</head>
<body>
  <div id="map"></div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    const map = L.map('map').setView([0, 0], 2);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    navigator.geolocation.getCurrentPosition((pos) => {
      const lat = pos.coords.latitude;
      const lon = pos.coords.longitude;
      map.setView([lat, lon], 16);
      L.marker([lat, lon]).addTo(map).bindPopup('Your location').openPopup();
      L.circle([lat, lon], { radius: pos.coords.accuracy }).addTo(map);
    });
  </script>
</body>
</html>`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-2xl max-h-[90vh] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <FileCode2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Template Code & Integration Guide
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content body */}
        <div className="overflow-y-auto p-6 space-y-6 text-sm text-slate-600 dark:text-slate-300">
          {/* Quick Info Box */}
          <div className="p-4 bg-blue-50 dark:bg-blue-950/40 rounded-xl border border-blue-100 dark:border-blue-900/50">
            <h3 className="font-semibold text-blue-900 dark:text-blue-300 text-xs uppercase tracking-wider mb-1">
              Zero API Cost Architecture
            </h3>
            <p className="text-xs text-blue-800 dark:text-blue-200/90 leading-relaxed">
              This template uses <strong>OpenStreetMap</strong> raster tiles, browser-native{' '}
              <strong>HTML5 Geolocation</strong>, and the free <strong>Nominatim</strong> reverse
              geocoder. It requires no billing accounts, credit cards, or API secrets.
            </p>
          </div>

          {/* Snippet 1: React + Leaflet */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5" /> React Component (TypeScript)
              </span>
              <button
                onClick={() => handleCopy(reactSnippet, 1)}
                className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline"
              >
                {copiedIndex === 1 ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" /> Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" /> Copy Code
                  </>
                )}
              </button>
            </div>
            <pre className="p-4 bg-slate-900 text-slate-100 rounded-xl text-xs font-mono overflow-x-auto leading-relaxed border border-slate-800">
              {reactSnippet}
            </pre>
          </div>

          {/* Snippet 2: Vanilla HTML */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <FileCode2 className="w-3.5 h-3.5" /> Single File Standalone HTML
              </span>
              <button
                onClick={() => handleCopy(htmlSnippet, 2)}
                className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline"
              >
                {copiedIndex === 2 ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" /> Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" /> Copy Code
                  </>
                )}
              </button>
            </div>
            <pre className="p-4 bg-slate-900 text-slate-100 rounded-xl text-xs font-mono overflow-x-auto leading-relaxed border border-slate-800">
              {htmlSnippet}
            </pre>
          </div>

          {/* Guidelines */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-xs space-y-2">
            <h4 className="font-semibold text-slate-900 dark:text-white">OpenStreetMap Tile Policy</h4>
            <ul className="list-disc pl-5 space-y-1 text-slate-500 dark:text-slate-400">
              <li>Always include the required copyright attribution string (&copy; OpenStreetMap contributors).</li>
              <li>For massive production traffic (&gt; 1M hits/mo), consider caching or free tile CDN providers like CartoDB or MapTiler.</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 border border-slate-200 dark:border-slate-600 rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
