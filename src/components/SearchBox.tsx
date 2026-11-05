import React, { useState, useEffect, useRef } from 'react';
import { Search, Loader2, X, MapPin } from 'lucide-react';

interface SearchResult {
  place_id: number;
  lat: string;
  lon: string;
  display_name: string;
  type: string;
}

interface SearchBoxProps {
  onSelectLocation: (lat: number, lon: number, name: string) => void;
  placeholder?: string;
  className?: string;
}

export const SearchBox: React.FC<SearchBoxProps> = ({ 
  onSelectLocation, 
  placeholder = "Search place, city, or address...",
  className = ""
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!query.trim() || query.length < 3) {
      setResults([]);
      setLoading(false);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
            query
          )}&limit=5&addressdetails=1`,
          {
            headers: {
              'Accept-Language': 'en',
            },
          }
        );
        if (response.ok) {
          const data = await response.json();
          setResults(data);
          setIsOpen(true);
        }
      } catch (err) {
        console.error('Nominatim search error:', err);
      } finally {
        setLoading(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (item: SearchResult) => {
    const lat = parseFloat(item.lat);
    const lon = parseFloat(item.lon);
    onSelectLocation(lat, lon, item.display_name);
    setQuery(item.display_name.split(',')[0]);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      <div className="relative flex items-center">
        <div className="absolute left-4 text-slate-400 pointer-events-none">
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
          ) : (
            <Search className="w-5 h-5" />
          )}
        </div>
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            onSelectLocation(0, 0, e.target.value); // Use onSelectLocation as an onChange callback hack
            if (e.target.value.length >= 0) setIsOpen(true);
          }}
          onFocus={() => {
            if (results.length > 0) setIsOpen(true);
          }}
          placeholder={placeholder}
          className="w-full pl-12 pr-4 py-3.5 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200/80 dark:border-slate-800 rounded-2xl text-sm sm:text-base text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all shadow-xl"
        />
        {/* Clear button removed as per requirements to only show back arrows */}
      </div>

      {isOpen && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg z-[100] overflow-y-auto max-h-[50dvh] divide-y divide-slate-100 dark:divide-slate-800">
          {results.map((item) => (
            <button
              key={item.place_id}
              onClick={() => handleSelect(item)}
              className="w-full px-3.5 py-2.5 text-left flex items-start gap-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
            >
              <MapPin className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
              <div className="overflow-hidden">
                <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                  {item.display_name.split(',')[0]}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                  {item.display_name}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
