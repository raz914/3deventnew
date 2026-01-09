import { useState, useEffect } from 'react'
import './App.css'
import manieroBg from './assets/maniero_background_1767972613370.png'
import virtualTourBg from './assets/virtual_tour_background_1767972628743.png'
import logo from './assets/logo.png'

function App() {
  const [progress, setProgress] = useState(0)
  const [showContent, setShowContent] = useState(false)

  useEffect(() => {
    if (showContent) return;

    const timer = setInterval(() => {
      setProgress((prevProgress) => {
        if (prevProgress >= 100) {
          clearInterval(timer);
          setShowContent(true);
          return 100;
        }
        const diff = Math.random() * 25;
        return Math.min(prevProgress + diff, 100);
      });
    }, 100);

    return () => clearInterval(timer);
  }, [showContent]);

  if (!showContent) {
    return (
      <div className={`flex flex-col items-center justify-center min-h-screen bg-black text-white px-4 transition-all duration-500`}>
        <div className="relative mb-12 flex flex-col items-center">
          <img src={logo} alt="Logo" className="h-24 md:h-32 w-auto object-contain" />
        </div>

        {/* Progress Section */}
        <div className="w-full max-w-xs flex flex-col items-center">
          <div className="w-full h-[2px] bg-white/10 rounded-full overflow-hidden mb-4 relative">
            <div
              className="h-full bg-white transition-all duration-300 ease-out shadow-[0_0_15px_rgba(255,255,255,0.8)]"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="font-medium text-sm tracking-widest text-white/70">
            {Math.round(progress)}%
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-8 relative overflow-hidden animate-slide-up">
      {/* Background Subtle Gradient */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,_rgba(30,58,138,0.1)_0%,_transparent_50%)]" />

      <div className="absolute top-10 left-10 z-50">
        <img src={logo} alt="Logo" className="h-12 w-auto object-contain" />
      </div>

      {/* Cards Container */}
      <div className="max-w-7xl mx-auto h-[80vh] flex items-center justify-center">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full h-[60vh]">
          <Card
            title="NEW SCENE MANIERO MONTECASSIANO"
            image={manieroBg}
            delay="delay-0"
            hoverType="border"
          />
          <Card
            title="VIRTUAL TOUR"
            image={virtualTourBg}
            delay="delay-100"
            hoverType="gradient"
            isLarge
          />
          <Card
            title="GUIDE VIDEO TUTORIAL"
            isDark
            delay="delay-200"
            hoverType="solid"
            isLarge
          >
            <div className="flex flex-col items-center justify-center h-full opacity-40 group-hover:opacity-100 transition-opacity duration-500">
              <div className="w-16 h-12 border-2 border-white rounded-lg relative flex items-center justify-center mb-2">
                <div className="w-0 h-0 border-t-[6px] border-t-transparent border-l-[10px] border-l-white border-b-[6px] border-b-transparent ml-1" />
                <div className="absolute -bottom-2 -right-2 w-6 h-6 bg-white rounded-full flex items-center justify-center">
                  <div className="w-3 h-3 border-2 border-black rounded-sm" />
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}

function Card({ title, image, children, isDark, delay, hoverType, isLarge }) {
  const hoverOverlayClass =
    hoverType === 'gradient' ? 'card-hover-overlay-gradient' :
      hoverType === 'solid' ? 'card-hover-overlay-solid' : '';

  return (
    <div className={`group relative h-full overflow-hidden rounded-sm cursor-pointer border-[1px] border-white/20 transition-all duration-500 ease-out ${isLarge ? 'hover:scale-110' : 'hover:scale-105'} card-glow animate-fade-in ${delay}`}>
      {/* Background Image */}
      {image ? (
        <div
          className="absolute inset-0 bg-cover bg-center transition-transform duration-1000 group-hover:scale-110"
          style={{ backgroundImage: `url(${image})` }}
        />
      ) : (
        <div className="absolute inset-0 bg-neutral-900" />
      )}

      {/* Dark Overlay (Behind Hover) */}
      <div className={`absolute inset-0 z-0 ${isDark ? 'bg-black/60' : 'bg-black/20'} transition-opacity duration-500 group-hover:opacity-0`} />

      {/* Special Hover Overlay (Z-10) */}
      {hoverOverlayClass && <div className={`absolute inset-0 z-10 ${hoverOverlayClass}`} />}

      {/* Gradient Overlay for Text Readability (Z-5) */}
      <div className="absolute inset-0 z-5 card-gradient-overlay" />

      {/* Content (Z-20) */}
      <div className="absolute inset-0 p-6 flex flex-col justify-between z-20">
        <div className="flex-1">
          {children}
        </div>
        <div className="flex items-center space-x-3">
          <div className="w-6 h-6 rounded-full border border-white/50 flex items-center justify-center text-xs group-hover:border-white transition-colors">
            +
          </div>
          <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-white/90 group-hover:text-white transition-colors">
            {title}
          </span>
        </div>
      </div>
    </div>
  )
}

export default App
