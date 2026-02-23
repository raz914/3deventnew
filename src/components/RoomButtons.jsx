import { useState } from 'react';
import homeIcon from '../assets/homeIcon.png';
import soundIcon from '../assets/soundIcon.png';
import locationIcon from '../assets/locationIcon.png';
import infoIcon from '../assets/info.png';
import fullscreenIcon from '../assets/fullscreen.png';

const buttons = [
  { id: 1, icon: homeIcon, alt: 'Home' },
  { id: 2, icon: locationIcon, alt: 'Location' },
  { id: 3, icon: soundIcon, alt: 'Sound' },
  { id: 4, icon: infoIcon, alt: 'Info' },
  { id: 5, icon: fullscreenIcon, alt: 'Fullscreen' },
  { id: 6, icon: locationIcon, alt: 'Placeholders' },
];

export default function RoomButtons({
  onClick,
  isAudioPlaying = false,
  hotspotsEnabled = true,
  isFullscreen = false,
  placeholdersPanelOpen = false,
}) {
  const [touchHandled, setTouchHandled] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const isIPhone = /iPhone/.test(navigator.userAgent);
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

  const getLabel = (id) => {
    if (id === 1) return 'Main Scene';
    if (id === 2) return 'Coordinates';
    if (id === 3) return `Sound: ${isAudioPlaying ? 'On' : 'Off'}`;
    if (id === 4) return `Infos: ${hotspotsEnabled ? 'On' : 'Off'}`;
    if (id === 5) return `Full Screen: ${isFullscreen ? 'On' : 'Off'}`;
    if (id === 6) return `Placeholders: ${placeholdersPanelOpen ? 'On' : 'Off'}`;
    return '';
  };

  const handleClick = (e, id) => {
    if (touchHandled && (isIPhone || isIOS)) {
      setTouchHandled(false);
      return;
    }
    if (id === 3 && (isIPhone || isIOS)) {
      e.preventDefault();
      e.stopPropagation();
    }
    onClick?.(id);
  };

  return (
    <div
      className="fixed top-1/2 -translate-y-1/2 left-2 z-50 transform-gpu"
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => setIsExpanded(false)}
    >
      <div
        className={`relative group flex flex-col gap-0.5 py-3 px-2 bg-black/40 md:bg-white/20 md:backdrop-blur-md border border-white/20 rounded-2xl shadow-lg transition-all duration-300 ease-out overflow-hidden ${isExpanded ? 'md:w-48' : 'md:w-[60px]'}`}
      >
        {buttons.map(({ id, icon, alt }) => (
          <button
            key={id}
            type="button"
            onClick={(e) => handleClick(e, id)}
            className={`relative bg-transparent p-1.5 rounded-md md:hover:bg-white/20 active:bg-white/30 transition-all duration-200 touch-manipulation flex items-center text-white ${
              id === 3 && isAudioPlaying ? 'bg-white/30 ring-2 ring-white/50' : ''
            } ${id === 4 && !hotspotsEnabled ? 'bg-white/30 ring-2 ring-white/50' : ''} ${
              id === 5 && isFullscreen ? 'bg-white/30 ring-2 ring-white/50' : ''
            } ${id === 6 && placeholdersPanelOpen ? 'bg-white/30 ring-2 ring-white/50' : ''}`}
            onTouchStart={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.3)';
              if (id === 3 && (isIPhone || isIOS)) e.currentTarget.setAttribute('data-audio-gesture', 'true');
            }}
            onTouchEnd={(e) => {
              const element = e.currentTarget;
              if (id === 3 && (isIPhone || isIOS)) {
                setTouchHandled(true);
                e.preventDefault();
                onClick?.(id);
              }
              setTimeout(() => {
                if (element) element.style.backgroundColor = '';
              }, 150);
            }}
            onTouchCancel={(e) => {
              if (e.currentTarget) e.currentTarget.style.backgroundColor = '';
            }}
          >
            <img
              src={icon}
              alt={alt}
              className={`w-7 h-7 transition-transform duration-100 md:hover:scale-110 active:scale-110 pointer-events-none ${
                id === 3 && isAudioPlaying ? 'animate-pulse' : ''
              } ${id === 4 && !hotspotsEnabled ? 'animate-pulse' : ''} ${id === 5 && isFullscreen ? 'animate-pulse' : ''} ${
                id === 6 && placeholdersPanelOpen ? 'animate-pulse' : ''
              }`}
            />
            <span
              className={`ml-3 hidden md:inline-block text-white text-lg font-medium whitespace-nowrap select-none transition-all duration-300 ease-out ${
                isExpanded ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-2'
              }`}
            >
              {getLabel(id)}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
