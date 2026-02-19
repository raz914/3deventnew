export default function Card({
  title,
  image,
  children,
  isDark,
  delay,
  hoverType,
  isLarge,
  onClick,
}) {
  const hoverOverlayClass =
    hoverType === 'gradient' ? 'card-hover-overlay-gradient' :
      hoverType === 'solid' ? 'card-hover-overlay-solid' : '';

  return (
    <div
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={onClick ? (e) => e.key === 'Enter' && onClick() : undefined}
      className={`group relative h-full overflow-hidden rounded-sm cursor-pointer border-[1px] border-white/20 transition-all duration-500 ease-out ${isLarge ? 'hover:scale-110' : 'hover:scale-105'} card-glow animate-fade-in ${delay}`}
    >
      {image ? (
        <div
          className="absolute inset-0 bg-cover bg-center transition-transform duration-1000 group-hover:scale-110"
          style={{ backgroundImage: `url(${image})` }}
        />
      ) : (
        <div className="absolute inset-0 bg-neutral-900" />
      )}

      <div className={`absolute inset-0 z-0 ${isDark ? 'bg-black/60' : 'bg-black/20'} transition-opacity duration-500 group-hover:opacity-0`} />

      {hoverOverlayClass && <div className={`absolute inset-0 z-10 ${hoverOverlayClass}`} />}

      <div className="absolute inset-0 z-5 card-gradient-overlay" />

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
  );
}
