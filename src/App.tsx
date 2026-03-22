import { useState, useRef, useEffect } from 'react';
import { Settings2, Maximize2, Minimize2 } from 'lucide-react';
import RainCanvas from './components/RainCanvas';

export default function App() {
  const [showSettings, setShowSettings] = useState(false);
  const [showTypeSettings, setShowTypeSettings] = useState(false);
  const [rippleIntensity, setRippleIntensity] = useState(100);
  const [volume, setVolume] = useState(72);
  const [fontFamily, setFontFamily] = useState('sans');
  const [fontSize, setFontSize] = useState('medium');
  const [text, setText] = useState('');
  const [syncStatus, setSyncStatus] = useState('');
  const [showSyncStatus, setShowSyncStatus] = useState(false);
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);
  const [showSavedTime, setShowSavedTime] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState({
    isOpen: false,
    message: '',
    confirmText: '确定',
    onConfirm: () => {}
  });

  const ambientAudioRef = useRef<HTMLAudioElement>(null);
  const dropAudioRef = useRef<HTMLAudioElement>(null);
  const streamAudioRef = useRef<HTMLAudioElement>(null);
  const fadeOutTimeoutRef = useRef<number | undefined>(undefined);
  const fadeOutIntervalRef = useRef<number | undefined>(undefined);
  const savedTimeTimeoutRef = useRef<number | undefined>(undefined);
  const typingTimeoutRef = useRef<number | undefined>(undefined);
  const statusClearTimeoutRef = useRef<number | undefined>(undefined);

  // Sync volume state to audio elements
  useEffect(() => {
    if (ambientAudioRef.current) {
      ambientAudioRef.current.volume = (volume / 100) * 0.6; // Increased volume for ambient background
    }
    if (dropAudioRef.current) {
      dropAudioRef.current.volume = (volume / 100) * 0.2; // Small, quiet drop
    }
    if (streamAudioRef.current && !fadeOutIntervalRef.current) {
      streamAudioRef.current.volume = (volume / 100) * 0.15; // Very subtle
    }
  }, [volume]);

  // Autoplay ambient sound on first user interaction
  useEffect(() => {
    const savedText = localStorage.getItem('flow-text');
    if (savedText) {
      setText(savedText);
    }

    const playAmbient = () => {
      if (ambientAudioRef.current && ambientAudioRef.current.paused) {
        ambientAudioRef.current.play().catch(() => {});
      }
    };
    window.addEventListener('click', playAmbient, { once: true });
    window.addEventListener('keydown', playAmbient, { once: true });
    return () => {
      window.removeEventListener('click', playAmbient);
      window.removeEventListener('keydown', playAmbient);
    };
  }, []);

  const handleGlobalClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    // Prevent toggling when clicking inside the writing panel or controls
    if (
      target.tagName === 'TEXTAREA' || 
      target.tagName === 'INPUT' || 
      target.tagName === 'BUTTON' || 
      target.closest('button') || 
      target.closest('input') ||
      target.closest('.glass-panel') ||
      target.closest('.type-settings-panel')
    ) {
      return;
    }

    if (ambientAudioRef.current) {
      if (ambientAudioRef.current.paused) {
        ambientAudioRef.current.play().catch(() => {});
      } else {
        ambientAudioRef.current.pause();
      }
    }
  };

  const handleTyping = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value;
    setText(newText);
    
    setSyncStatus('正在输入……');
    setShowSyncStatus(true);
    if (statusClearTimeoutRef.current) clearTimeout(statusClearTimeoutRef.current);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    typingTimeoutRef.current = window.setTimeout(() => {
      localStorage.setItem('flow-text', newText);
      setSyncStatus('已自动保存');
      setShowSyncStatus(true);
      
      const now = new Date();
      setLastSavedTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      
      statusClearTimeoutRef.current = window.setTimeout(() => {
        setShowSyncStatus(false);
      }, 3000);
    }, 1500);
  };

  const handleSave = () => {
    localStorage.setItem('flow-text', text);
    setSyncStatus('已手动保存');
    setShowSyncStatus(true);
    
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    if (statusClearTimeoutRef.current) clearTimeout(statusClearTimeoutRef.current);
    
    statusClearTimeoutRef.current = window.setTimeout(() => {
      setShowSyncStatus(false);
    }, 3000);

    const now = new Date();
    const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setLastSavedTime(timeString);
    setShowSavedTime(true);

    if (savedTimeTimeoutRef.current) clearTimeout(savedTimeTimeoutRef.current);
    savedTimeTimeoutRef.current = window.setTimeout(() => {
      setShowSavedTime(false);
    }, 3000);
  };

  const handleWordCountClick = () => {
    if (lastSavedTime) {
      setShowSavedTime(true);
      if (savedTimeTimeoutRef.current) clearTimeout(savedTimeTimeoutRef.current);
      savedTimeTimeoutRef.current = window.setTimeout(() => {
        setShowSavedTime(false);
      }, 3000);
    }
  };

  const handleClearClick = () => {
    if (!text) return; // 如果没有内容，不需要清空
    setConfirmConfig({
      isOpen: true,
      message: '确定要清空当前内容吗？',
      confirmText: '清空',
      onConfirm: () => {
        setText('');
        localStorage.removeItem('flow-text');
        setConfirmConfig(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const handleExport = () => {
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `flow-writing-${new Date().toISOString().slice(0,10)}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleSettingsToggle = () => {
    setShowSettings(!showSettings);
    if (!showSettings) {
      if (dropAudioRef.current) {
        dropAudioRef.current.currentTime = 0;
        dropAudioRef.current.play().catch(() => {});
      }
      if (streamAudioRef.current) {
        clearTimeout(fadeOutTimeoutRef.current);
        clearInterval(fadeOutIntervalRef.current);
        fadeOutIntervalRef.current = undefined;
        
        streamAudioRef.current.volume = (volume / 100) * 0.4;
        streamAudioRef.current.currentTime = 0;
        streamAudioRef.current.play().catch(() => {});
        
        // Match the 4s ripple animation: play for 2s, fade out over 2s
        fadeOutTimeoutRef.current = window.setTimeout(() => {
          let currentVol = (volume / 100) * 0.4;
          const fadeStep = currentVol / 20; // 20 steps over 2 seconds = 100ms per step
          
          fadeOutIntervalRef.current = window.setInterval(() => {
            currentVol -= fadeStep;
            if (currentVol <= 0.01) {
              clearInterval(fadeOutIntervalRef.current);
              fadeOutIntervalRef.current = undefined;
              if (streamAudioRef.current) {
                streamAudioRef.current.pause();
                streamAudioRef.current.volume = (volume / 100) * 0.4; // reset for next time
              }
            } else if (streamAudioRef.current) {
              streamAudioRef.current.volume = currentVol;
            }
          }, 100);
        }, 2000);
      }
    }
  };

  const getFontClass = () => {
    switch (fontFamily) {
      case 'serif': return 'font-serif';
      case 'kaiti': return 'font-[KaiTi,STKaiti,serif]';
      case 'heiti': return 'font-[SimHei,STHeiti,sans-serif] font-medium';
      case 'sans':
      default: return 'font-sans';
    }
  };

  const getSizeClass = () => {
    switch (fontSize) {
      case 'small': return 'text-base sm:text-lg';
      case 'large': return 'text-2xl sm:text-3xl';
      case 'medium':
      default: return 'text-lg sm:text-xl';
    }
  };

  return (
    <div 
      className="relative min-h-screen w-full overflow-hidden flex flex-col items-center justify-between font-sans text-white"
      onClick={handleGlobalClick}
    >
      {/* Typography Settings Button & Menu */}
      <div className="absolute top-6 left-6 z-50 type-settings-panel">
        <button 
          onClick={() => setShowTypeSettings(!showTypeSettings)}
          className={`w-12 h-12 rounded-full backdrop-blur-md border flex items-center justify-center transition-all duration-300 ease-out hover:scale-105 ${
            showTypeSettings 
              ? 'bg-white/[0.15] text-white border-white/30 shadow-lg' 
              : 'bg-black/[0.2] text-white/80 border-white/10 hover:bg-white/[0.1] hover:border-white/20'
          }`}
        >
          <span className="font-serif text-xl leading-none">T</span>
        </button>

        {/* Typography Menu */}
        <div 
          className={`absolute top-16 left-0 w-48 rounded-2xl bg-[#1A1A1A]/90 backdrop-blur-xl border border-white/10 shadow-2xl p-4 transition-all duration-300 origin-top-left ${
            showTypeSettings 
              ? 'opacity-100 scale-100 pointer-events-auto' 
              : 'opacity-0 scale-95 pointer-events-none'
          }`}
        >
          <div className="flex flex-col gap-4">
            {/* Font Family */}
            <div className="flex flex-col gap-2">
              <span className="text-[10px] text-white/40 font-medium tracking-widest uppercase">字体</span>
              <div className="flex flex-col gap-1">
                {[
                  { id: 'serif', label: '衬线' },
                  { id: 'sans', label: '无衬线' },
                  { id: 'kaiti', label: '楷体' },
                  { id: 'heiti', label: '黑体' }
                ].map((font) => (
                  <button
                    key={font.id}
                    onClick={() => setFontFamily(font.id)}
                    className={`text-left px-3 py-2 text-sm rounded-xl transition-colors ${
                      fontFamily === font.id 
                        ? 'bg-white/10 text-white' 
                        : 'text-white/70 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    {font.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="h-px w-full bg-white/10" />

            {/* Font Size */}
            <div className="flex flex-col gap-2">
              <span className="text-[10px] text-white/40 font-medium tracking-widest uppercase">字号</span>
              <div className="flex items-center justify-between bg-black/40 rounded-xl p-1">
                {[
                  { id: 'small', label: '小' },
                  { id: 'medium', label: '中' },
                  { id: 'large', label: '大' }
                ].map((size) => (
                  <button
                    key={size.id}
                    onClick={() => setFontSize(size.id)}
                    className={`flex-1 py-2 text-sm rounded-lg transition-all ${
                      fontSize === size.id 
                        ? 'bg-white/15 text-white shadow-sm' 
                        : 'text-white/50 hover:text-white/80'
                    }`}
                  >
                    {size.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Background: Dynamic Canvas Rain Simulation */}
      <div className="absolute inset-0 z-0 bg-gray-900 overflow-hidden">
        {/* Using a deep, lush green forest scene */}
        <RainCanvas 
          imageUrl="https://images.unsplash.com/photo-1448375240586-882707db888b?q=80&w=1920&auto=format&fit=crop" 
          intensity={rippleIntensity / 100}
        />

        {/* Subtle Vignette Overlay (Darker edges, clear center) */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.6)_100%)] pointer-events-none" />
      </div>
      
      {/* Main Content Wrapper */}
      <div className={`relative z-10 w-full ${isExpanded ? 'max-w-5xl' : 'max-w-3xl'} px-6 flex flex-col items-center justify-center flex-1 pb-20 pt-12 transition-all duration-700 ease-[cubic-bezier(0.25,1,0.5,1)]`}>
        
        {/* Frosted Glass Writing Panel (Reduced Size) */}
        <div 
          className={`glass-panel relative w-full aspect-[4/3] sm:aspect-[16/10] ${isExpanded ? 'max-h-[700px]' : 'max-h-[480px]'} rounded-[1.5rem] bg-white/[0.15] backdrop-blur-2xl border border-white/20 flex flex-col p-8 sm:p-10 overflow-hidden transition-all duration-700 ease-[cubic-bezier(0.25,1,0.5,1)] hover:-translate-y-2 hover:scale-[1.01] shadow-[0_0_100px_rgba(167,243,208,0.1),0_30px_60px_-15px_rgba(0,0,0,0.3),inset_0_1px_2px_rgba(255,255,255,0.3)] hover:shadow-[0_0_120px_rgba(167,243,208,0.15),0_40px_80px_-20px_rgba(0,0,0,0.5),inset_0_1px_2px_rgba(255,255,255,0.5)]`}
        >
           
           <div className="relative z-10 w-full h-full flex flex-col">
             {/* Expand Button Area */}
             <div className="absolute top-0 right-0 w-16 h-16 flex items-start justify-end group/expand z-20 -mt-2 -mr-2">
               <button
                 onClick={(e) => {
                   e.stopPropagation();
                   setIsExpanded(!isExpanded);
                 }}
                 className="p-2 text-white/40 hover:text-white/90 transition-all duration-500 opacity-0 translate-y-2 group-hover/expand:opacity-100 group-hover/expand:translate-y-0"
                 title={isExpanded ? "缩小" : "放大"}
               >
                 {isExpanded ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
               </button>
             </div>

             {/* Text Input Area */}
             <textarea 
               value={text}
               placeholder="开始你的心流写作……" 
               onChange={handleTyping}
               className={`custom-scrollbar w-full h-full pb-10 bg-transparent text-white/90 placeholder:text-white/50 focus:placeholder:text-white/30 outline-none border-none font-light tracking-wide drop-shadow-sm transition-all duration-700 resize-none ${getFontClass()} ${getSizeClass()}`}
             />

             {/* Bottom Bar: Word Count & Actions */}
             <div className={`absolute bottom-0 left-0 right-6 flex items-center justify-between transition-opacity duration-700 ${text.length > 0 ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
               <div 
                 className="relative flex flex-col items-start cursor-pointer group"
                 onClick={handleWordCountClick}
               >
                 <div className="flex items-center gap-3">
                   <div className="text-white/40 text-sm tracking-widest font-medium group-hover:text-white/60 transition-colors">
                     {text.length} 字
                   </div>
                   <div className={`text-white/30 text-xs tracking-widest font-light transition-all duration-700 ease-out ${showSyncStatus ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}>
                     {syncStatus}
                   </div>
                 </div>
                 <div 
                   className={`absolute top-full left-0 mt-1 text-white/30 text-[10px] tracking-wider whitespace-nowrap transition-all ease-out ${
                     showSavedTime 
                       ? 'duration-300 opacity-100 translate-y-0' 
                       : 'duration-[3000ms] opacity-0 translate-y-2 pointer-events-none'
                   }`}
                 >
                   保存于 {lastSavedTime}
                 </div>
               </div>
               <div className="flex items-center gap-6">
                 <button onClick={handleSave} className="text-white/50 hover:text-white/90 transition-colors text-sm tracking-widest font-medium">
                   保存
                 </button>
                 <button onClick={handleClearClick} className="text-white/50 hover:text-white/90 transition-colors text-sm tracking-widest font-medium">
                   清空
                 </button>
                 <button onClick={handleExport} className="text-white/50 hover:text-white/90 transition-colors text-sm tracking-widest font-medium">
                   导出
                 </button>
               </div>
             </div>
           </div>
        </div>

      </div>

      {/* Bottom Controls */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-4 z-10 w-full max-w-md px-6">
        
        {/* Settings Button with Ripple */}
        <div className="relative mb-2">
          {showSettings && (
            <div className="absolute inset-0 rounded-full bg-blue-50/10 border border-white/20 animate-ripple pointer-events-none" />
          )}
          <button 
            onClick={handleSettingsToggle}
            className={`relative w-10 h-10 rounded-full backdrop-blur-md border flex items-center justify-center transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:scale-110 hover:-translate-y-1 hover:shadow-[0_12px_24px_-8px_rgba(0,0,0,0.5)] ${
              showSettings 
                ? 'bg-white/[0.25] text-white border-white/40 shadow-[0_8px_16px_-6px_rgba(0,0,0,0.4)]' 
                : 'bg-white/[0.1] text-white/70 border-white/20 hover:text-white hover:bg-white/[0.25] hover:border-white/40'
            }`}
          >
            <Settings2 size={16} />
          </button>
        </div>

        {/* Sliders Panel */}
        <div 
          className={`w-full flex items-center justify-between gap-8 px-8 py-4 rounded-2xl bg-white/[0.1] backdrop-blur-xl border border-white/20 shadow-lg transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${
            showSettings 
              ? 'opacity-100 translate-y-0 pointer-events-auto' 
              : 'opacity-0 translate-y-10 pointer-events-none'
          }`}
        >
          {/* Ripple Slider */}
          <div className="flex-1 flex flex-col gap-2">
            <div className="flex justify-between text-[10px] text-white/60 tracking-wider">
              <span>💧 涟漪</span>
              <span>{rippleIntensity} %</span>
            </div>
            <div className="relative w-full flex items-center">
              <input 
                type="range" 
                min="0" 
                max="100" 
                value={rippleIntensity}
                onChange={(e) => setRippleIntensity(Number(e.target.value))}
                className="w-full h-1 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-sm"
                style={{ background: `linear-gradient(to right, rgba(255,255,255,0.6) ${rippleIntensity}%, rgba(255,255,255,0.2) ${rippleIntensity}%)` }}
              />
            </div>
          </div>

          {/* Volume Slider */}
          <div className="flex-1 flex flex-col gap-2">
            <div className="flex justify-between text-[10px] text-white/60 tracking-wider">
              <span>🔊 音量</span>
              <span>{volume} %</span>
            </div>
            <div className="relative w-full flex items-center">
              <input 
                type="range" 
                min="0" 
                max="100" 
                value={volume}
                onChange={(e) => setVolume(Number(e.target.value))}
                className="w-full h-1 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-sm"
                style={{ background: `linear-gradient(to right, rgba(255,255,255,0.6) ${volume}%, rgba(255,255,255,0.2) ${volume}%)` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Custom Confirm Dialog */}
      <div 
        className={`fixed inset-0 z-[100] flex items-center justify-center transition-all duration-700 ease-[cubic-bezier(0.25,1,0.5,1)] ${
          confirmConfig.isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      >
        {/* Backdrop */}
        <div 
          className="absolute inset-0 bg-black/20 backdrop-blur-sm"
          onClick={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))}
        />
        
        {/* Dialog Box */}
        <div 
          className={`relative glass-panel w-full max-w-sm p-8 rounded-[1.5rem] bg-white/[0.15] backdrop-blur-2xl border border-white/20 shadow-2xl flex flex-col items-center gap-8 transition-all duration-700 ease-[cubic-bezier(0.25,1,0.5,1)] ${
            confirmConfig.isOpen ? 'translate-y-0 scale-100 opacity-100' : 'translate-y-8 scale-95 opacity-0'
          }`}
        >
          <p className="text-white/90 text-lg font-light tracking-wide text-center">
            {confirmConfig.message}
          </p>
          <div className="flex items-center gap-4 w-full justify-center">
            <button 
              onClick={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))}
              className="px-6 py-2.5 rounded-full bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/10 transition-all duration-300 text-sm tracking-widest"
            >
              取消
            </button>
            <button 
              onClick={confirmConfig.onConfirm}
              className="px-6 py-2.5 rounded-full bg-white/10 border border-white/20 text-white/90 hover:bg-white/20 hover:text-white transition-all duration-300 text-sm tracking-widest"
            >
              {confirmConfig.confirmText}
            </button>
          </div>
        </div>
      </div>

      {/* Audio Elements */}
      <audio 
        ref={ambientAudioRef} 
        src="https://raw.githubusercontent.com/skyorigin9-coder/sy/main/loswin23-flowing-river-water-459071.mp3" 
        loop 
        crossOrigin="anonymous"
      />
      <audio 
        ref={dropAudioRef} 
        src="https://cdn.freesound.org/previews/411/411642_5121236-lq.mp3" 
        crossOrigin="anonymous"
      />
      <audio 
        ref={streamAudioRef} 
        src="https://actions.google.com/sounds/v1/water/babbling_brook.ogg" 
        crossOrigin="anonymous"
      />
    </div>
  );
}
