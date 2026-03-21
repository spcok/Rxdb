import React, { useEffect, useState, useTransition } from 'react';
import { getFullWeather, FullWeatherData, WeatherDaily, WeatherHourly } from '../../services/weatherService';
import { analyzeFlightWeather } from '../../services/geminiService';
import { useOrgSettings } from '../settings/useOrgSettings';
import { 
    CloudSun, CloudRain, Sun, 
    Cloud, CloudLightning, Snowflake, Navigation, 
    Sparkles, Loader2, ShieldAlert, CloudFog, RefreshCw, Play
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';

const WeatherView: React.FC = () => {
  const { settings } = useOrgSettings();
  const [data, setData] = useState<FullWeatherData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  
  // AI Advisor State
  const [isPendingAi, startTransitionAi] = useTransition();
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  // Network State Listener
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // 1. Fetch Data with Cleanup and Error Handling
  useEffect(() => {
    let isMounted = true;
    
    const loadData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const weather = await getFullWeather('Maidstone, Kent, UK');
        
        if (isMounted) {
          if (weather) {
            setData(weather);
            if (weather.daily && weather.daily.length > 0) {
              // Safely access the first daily date
              const firstDay = weather.daily[0];
              if (typeof firstDay.date === 'string') {
                setSelectedDate(firstDay.date);
              }
            }
          } else {
            setError('STATION OFFLINE');
          }
        }
      } catch (err) {
        console.error('Weather fetch error:', err);
        if (isMounted) {
          setError('STATION OFFLINE');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };
    loadData();

    return () => { isMounted = false; };
  }, [settings?.address]);

  const handleGenerateAiAnalysis = () => {
      if (!navigator.onLine) {
          console.warn("Offline: AI Flight Advisor disabled.");
          return;
      }
      if (!data) return;
      
      // Filter strictly to the 11:00-16:00 window
      const flightWindowData = data.hourly.filter((h: WeatherHourly) => {
          const hour = new Date(String(h.time)).getHours();
          return hour >= 11 && hour <= 16;
      });
      
      console.log("🌦️ [AI Advisor] Sending 11:00-16:00 data to Edge Function...");
      startTransitionAi(async () => {
          try {
            const analysis = await analyzeFlightWeather(flightWindowData);
            console.log("Weather AI Analysis Received:", analysis);
            setAiAnalysis(analysis);
          } catch (err) {
            console.error('AI Analysis error:', err);
            setAiAnalysis('### Error\nFailed to generate safety audit. Please try again.');
          }
      });
  };

  useEffect(() => { setAiAnalysis(null); }, [selectedDate]);

  if (isLoading) {
    return (
        <div className="flex flex-col items-center justify-center h-96 text-slate-400 gap-3">
            <Loader2 size={48} className="animate-spin text-emerald-600" />
            <p className="font-black uppercase tracking-[0.2em] text-xs">Initializing Telemetry...</p>
        </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-slate-400 gap-4">
        <ShieldAlert size={48} className="opacity-20" />
        <div className="p-12 text-center text-slate-400 font-bold uppercase tracking-widest">
          {error || 'STATION OFFLINE'}
        </div>
      </div>
    );
  }

  const { current, daily, hourly } = data;
  const selectedHourly = hourly.filter((h: WeatherHourly) => String(h.time).startsWith(selectedDate));

  const WeatherIcon = ({ code, size = 24, className = "" }: { code: number, size?: number, className?: string }) => {
     if (code === 0) return <Sun size={size} className={`text-yellow-400 ${className}`} />;
     if (code <= 3) return <CloudSun size={size} className={`text-slate-400 ${className}`} />;
     if (code <= 48) return <CloudFog size={size} className={`text-slate-400 ${className}`} />;
     if (code <= 67) return <CloudRain size={size} className={`text-blue-400 ${className}`} />;
     if (code <= 77) return <Snowflake size={size} className={`text-cyan-400 ${className}`} />;
     if (code <= 82) return <CloudRain size={size} className={`text-blue-500 ${className}`} />;
     if (code <= 99) return <CloudLightning size={size} className={`text-purple-500 ${className}`} />;
     return <Cloud size={size} className={`text-slate-400 ${className}`} />;
  };

  // Safely cast current values for logic
  const temp = typeof current.temperature === 'number' ? current.temperature : 0;
  const windGust = typeof current.windGust === 'number' ? current.windGust : 0;
  const windSpeed = typeof current.windSpeed === 'number' ? current.windSpeed : 0;

  return (
    <div className="space-y-6 mt-4 border border-slate-200 rounded-2xl p-6">
      
      {/* TOP HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">WEATHER</h1>
          <p className="text-sm text-slate-500 mt-1">Live conditions and forecasting.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          
          {/* SIDEBAR: LIVE & AI */}
          <div className="xl:col-span-4 space-y-6">
              {/* CURRENT WEATHER CARD */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm relative overflow-hidden flex flex-col justify-between">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-yellow-400/10 blur-[80px] -mr-20 -mt-20 rounded-full pointer-events-none"></div>
                  <div className="relative z-10 flex-1 flex flex-col">
                      <div className="flex justify-between items-start mb-2">
                          <div>
                              <p className="text-xs font-bold uppercase tracking-widest text-emerald-500 mb-2">Local Telemetry</p>
                              <div className="flex items-start">
                                <h1 className="text-6xl font-medium tracking-tight text-slate-900">{Math.round(temp)}</h1>
                                <span className="text-2xl font-medium text-slate-500 mt-2">°C</span>
                              </div>
                          </div>
                          <WeatherIcon code={Number(current.weatherCode) || 0} size={56} className="filter drop-shadow-sm mt-2" />
                      </div>
                      
                      <p className="text-xl font-medium text-slate-800 mb-auto mt-2">{String(current.description || 'Unknown')}</p>
                      
                      <div className="grid grid-cols-2 gap-6 mt-6">
                          <div>
                              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">WIND SPEED</p>
                              <div className="flex items-baseline gap-1">
                                <p className="text-2xl font-black text-slate-900">{String(windSpeed)}</p>
                                <span className="text-sm font-bold text-slate-400">MPH</span>
                              </div>
                              <div className="flex items-center gap-1.5 mt-1 text-slate-500">
                                  <Navigation size={12} style={{transform: `rotate(${Number(current.windDirection) || 0}deg)`}} className="text-slate-400"/>
                                  <span className="text-[10px] font-bold">{String(current.windDirection || 0)}°</span>
                              </div>
                          </div>
                          <div>
                              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">GUSTS</p>
                              <div className="flex items-baseline gap-1">
                                <p className="text-2xl font-black text-rose-500">{String(windGust)}</p>
                                <span className="text-sm font-bold text-rose-300">MPH</span>
                              </div>
                              <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">PEAK</p>
                          </div>
                      </div>
                  </div>
              </div>

              {/* AI ADVISOR CARD */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                  <div className="p-6 flex justify-between items-center">
                      <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                          <Sparkles className="text-emerald-500" size={18}/> Flight AI Advisor
                      </h2>
                      <button 
                        onClick={handleGenerateAiAnalysis}
                        disabled={isPendingAi || isOffline}
                        className="bg-slate-900 hover:bg-black text-white px-5 py-2.5 rounded-full font-bold uppercase text-xs tracking-widest transition-all flex items-center gap-2 disabled:opacity-50"
                        title={isOffline ? "AI Analysis requires an internet connection" : ""}
                      >
                        {isPendingAi ? <Loader2 size={14} className="animate-spin"/> : aiAnalysis ? <RefreshCw size={14}/> : <Play size={14}/>}
                        {isOffline ? 'Offline' : aiAnalysis ? 'Update' : 'Run Audit'}
                      </button>
                  </div>

                  <div className="px-6 pb-6 flex-1 flex flex-col overflow-y-auto scrollbar-thin">
                      {isOffline && !aiAnalysis && (
                          <div className="flex-1 flex flex-col items-center justify-center text-amber-600 text-center">
                              <ShieldAlert size={40} className="mb-4 opacity-50" />
                              <p className="text-sm font-black uppercase tracking-widest">Connection Required</p>
                              <p className="text-sm font-medium mt-2 text-amber-700/70">AI Analysis requires an internet connection.</p>
                          </div>
                      )}
                      {!aiAnalysis && !isPendingAi && !isOffline ? (
                          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 text-center py-8">
                              <ShieldAlert size={40} className="mb-4 opacity-20" />
                              <p className="text-sm font-black uppercase tracking-widest text-slate-300">Safety Analysis Pending</p>
                              <p className="text-sm font-medium mt-2 text-slate-400">Cross-reference forecast with flight protocols.</p>
                          </div>
                      ) : isPendingAi ? (
                          <div className="flex-1 flex flex-col items-center justify-center space-y-4">
                              <Loader2 size={40} className="animate-spin text-emerald-500" />
                              <p className="text-sm font-black text-slate-400 uppercase tracking-widest">Analyzing Atmos...</p>
                          </div>
                      ) : (
                          <div className="prose prose-slate prose-sm max-w-none">
                               <ReactMarkdown 
                                components={{
                                    h3: ({...props}) => <h3 className="text-xs font-black uppercase tracking-widest text-emerald-800 mb-2 border-b border-emerald-100 pb-1" {...props} />,
                                    ul: ({...props}) => <ul className="list-disc pl-4 text-slate-700 font-medium text-sm space-y-1" {...props} />,
                                    p: ({...props}) => <p className="text-sm font-medium text-slate-600 leading-relaxed mb-3" {...props} />,
                                    strong: ({...props}) => <strong className="text-slate-900 font-bold" {...props} />
                                }}
                              >
                                  {aiAnalysis || ''}
                              </ReactMarkdown>
                          </div>
                      )}
                  </div>
              </div>
          </div>

          {/* MAIN: FORECAST TABLE */}
          <div className="xl:col-span-8 space-y-6">
              
              {/* DATE TABS */}
              <div className="bg-slate-100/50 p-2 rounded-2xl border border-slate-200 shadow-sm flex flex-nowrap gap-2 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-slate-200">
                  {daily.slice(0, 7).map((day: WeatherDaily) => {
                      const dateObj = new Date(String(day.date));
                      const isSelected = day.date === selectedDate;
                      return (
                          <button 
                            key={String(day.date)}
                            onClick={() => setSelectedDate(String(day.date))}
                            className={`flex-none min-w-[80px] sm:min-w-[100px] px-4 py-4 rounded-xl flex flex-col items-center transition-all ${
                                isSelected ? 'bg-slate-900 text-white shadow-md' : 'bg-white text-slate-500 hover:bg-slate-50 border border-slate-100'
                            }`}
                          >
                              <span className={`text-[10px] font-black uppercase tracking-widest mb-1 ${isSelected ? 'opacity-80' : 'text-slate-400'}`}>
                                {dateObj.toLocaleDateString('en-GB', {weekday: 'short'})}
                              </span>
                              <span className={`text-sm font-black tabular-nums mb-2 ${isSelected ? 'text-white' : 'text-slate-700'}`}>
                                {dateObj.getDate()} {dateObj.toLocaleDateString('en-GB', {month: 'short'}).toUpperCase()}
                              </span>
                              <div className="flex items-center gap-1.5">
                                  <WeatherIcon code={Number(day.weatherCode) || 0} size={14} className={isSelected ? 'text-slate-300' : 'text-slate-400'} />
                                  <span className={`text-xs font-bold ${isSelected ? 'text-white' : 'text-slate-600'}`}>{Math.round(Number(day.maxTemp) || 0)}°</span>
                              </div>
                          </button>
                      );
                  })}
              </div>

              {/* HOURLY TABLE */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-slate-100 flex flex-col items-start gap-2">
                        <h2 className="text-xl font-medium text-slate-800">Hourly Forecast</h2>
                        <span className="px-3 py-1 bg-slate-100 border border-slate-200 rounded-full text-xs font-medium text-slate-700 shadow-sm">
                            {selectedDate ? new Date(selectedDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '---'}
                        </span>
                    </div>
                    
                    <div className="w-full">
                        <table className="w-full text-left border-collapse table-fixed">
                            <thead>
                                <tr className="border-b border-slate-200">
                                    <th className="pl-2 pr-1 sm:px-2 py-4 text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest text-left w-[15%] sm:w-[10%]">Time</th>
                                    <th className="px-1 sm:px-2 py-4 text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest text-left w-[25%] sm:w-[20%]">Status</th>
                                    <th className="px-1 sm:px-2 py-4 text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest text-center w-[15%] sm:w-[15%]">Temp</th>
                                    <th className="px-1 sm:px-2 py-4 text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest text-center w-[30%] sm:w-[35%]">Wind / Gust</th>
                                    <th className="pr-2 pl-1 sm:px-2 py-4 text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest text-right w-[15%] sm:w-[20%]">Precip</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {selectedHourly.map((hour: WeatherHourly, idx: number) => {
                                    const dateObj = new Date(String(hour.time));
                                    const timeStr = dateObj.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
                                    
                                    return (
                                        <tr key={idx} className="hover:bg-slate-50/50 transition-colors bg-white">
                                            <td className="pl-2 pr-1 sm:px-2 py-3 sm:py-5 text-left">
                                                <span className="font-black text-slate-900 text-[10px] sm:text-xs tabular-nums">{timeStr}</span>
                                            </td>
                                            <td className="px-1 sm:px-2 py-3 sm:py-5 text-left">
                                                <div className="flex items-center gap-0.5 sm:gap-3">
                                                    <div className="hidden sm:block">
                                                        <WeatherIcon code={Number(hour.weatherCode) || 0} size={18} className="text-slate-400" />
                                                    </div>
                                                    <span className="text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-wide truncate max-w-[50px] sm:max-w-none">{String(hour.description || 'Unknown')}</span>
                                                </div>
                                            </td>
                                            <td className="px-1 sm:px-2 py-3 sm:py-5 text-center">
                                                <span className="font-black text-slate-900 tabular-nums text-[11px] sm:text-sm">{Math.round(Number(hour.temp) || 0)}°</span>
                                            </td>
                                            <td className="px-1 sm:px-2 py-3 sm:py-5 text-center">
                                                <div className="flex items-center justify-center gap-1 sm:gap-4">
                                                    <div className="flex items-center gap-0.5 sm:gap-2">
                                                        <Navigation 
                                                            size={12} 
                                                            style={{transform: `rotate(${Number(hour.windDirection) || 0}deg)`}} 
                                                            className="text-blue-500 sm:w-3.5 sm:h-3.5 w-2.5 h-2.5"
                                                        />
                                                        <span className="font-black text-slate-900 tabular-nums text-[10px] sm:text-sm">{Math.round(Number(hour.windSpeed) || 0)}</span>
                                                    </div>
                                                    <div className="flex flex-col items-start">
                                                        <span className="text-[10px] font-black text-rose-500 uppercase leading-none mb-0.5 transform scale-[0.6] sm:scale-[0.7] origin-left -ml-0.5 sm:ml-0">GUSTS</span>
                                                        <span className="font-black tabular-nums text-rose-600 leading-none text-[10px] sm:text-sm">
                                                            {Math.round(Number(hour.windGust) || 0)}
                                                        </span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="pr-2 pl-1 sm:px-2 py-3 sm:py-5 text-right">
                                                <div className="flex items-center gap-0.5 sm:gap-3 justify-end">
                                                    <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden w-24 hidden sm:block">
                                                        <div 
                                                            className="h-full transition-all duration-1000 bg-slate-300"
                                                            style={{ width: `${Number(hour.precipProb) || 0}%` }}
                                                        />
                                                    </div>
                                                    <span className="font-bold tabular-nums text-slate-400 min-w-[3ch] text-right text-[9px] sm:text-[10px]">{String(hour.precipProb || 0)}%</span>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
              </div>
          </div>
      </div>
    </div>
  );
};

export default WeatherView;
