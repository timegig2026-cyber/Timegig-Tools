import React from 'react';
import { Compass, Moon, Sun, Code2 } from 'lucide-react';

interface NavbarProps {
  darkMode: boolean;
  onToggleDarkMode: () => void;
  onOpenDeveloperModal: () => void;
  activeTab: 'telemetry' | 'waypoints' | 'layers' | 'measure';
  onSelectTab: (tab: 'telemetry' | 'waypoints' | 'layers' | 'measure') => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  darkMode,
  onToggleDarkMode,
  onOpenDeveloperModal,
  activeTab,
  onSelectTab,
}) => {
  return (
    <header className="flex items-center justify-between gap-8 px-6 py-3.5 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 z-30 transition-colors">
      {/* Zone 1: Brand title, one line wordmark */}
      <div className="flex items-center gap-2.5 whitespace-nowrap shrink-0">
        <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-xs">
          <Compass className="w-5 h-5 text-white" />
        </div>
        <span className="text-base font-bold tracking-tight text-slate-900 dark:text-slate-100">
          OpenMap Geolocation
        </span>
      </div>

      {/* Zone 2: 4 nav links, single-line labels */}
      <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600 dark:text-slate-400">
        <button
          onClick={() => onSelectTab('telemetry')}
          className={`hover:text-blue-600 dark:hover:text-blue-400 transition-colors whitespace-nowrap shrink-0 ${
            activeTab === 'telemetry' ? 'text-blue-600 dark:text-blue-400 font-semibold' : ''
          }`}
        >
          Live Tracking
        </button>
        <button
          onClick={() => onSelectTab('waypoints')}
          className={`hover:text-blue-600 dark:hover:text-blue-400 transition-colors whitespace-nowrap shrink-0 ${
            activeTab === 'waypoints' ? 'text-blue-600 dark:text-blue-400 font-semibold' : ''
          }`}
        >
          Waypoints
        </button>
        <button
          onClick={() => onSelectTab('layers')}
          className={`hover:text-blue-600 dark:hover:text-blue-400 transition-colors whitespace-nowrap shrink-0 ${
            activeTab === 'layers' ? 'text-blue-600 dark:text-blue-400 font-semibold' : ''
          }`}
        >
          Map Styles
        </button>
        <button
          onClick={() => onSelectTab('measure')}
          className={`hover:text-blue-600 dark:hover:text-blue-400 transition-colors whitespace-nowrap shrink-0 ${
            activeTab === 'measure' ? 'text-blue-600 dark:text-blue-400 font-semibold' : ''
          }`}
        >
          Ruler Tool
        </button>
      </nav>

      {/* Zone 3: 1 primary action + theme toggle */}
      <div className="flex items-center gap-3 shrink-0">
        <button
          onClick={onToggleDarkMode}
          aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
          className="p-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
        <button
          onClick={onOpenDeveloperModal}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-lg shadow-xs transition-colors whitespace-nowrap shrink-0"
        >
          <Code2 className="w-3.5 h-3.5" />
          <span>Embed Template</span>
        </button>
      </div>
    </header>
  );
};
