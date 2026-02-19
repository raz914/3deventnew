import logo from '../assets/logo.png';

export default function LoadingScreen({ progress }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white px-4 transition-all duration-500">
      <div className="relative mb-12 flex flex-col items-center">
        <img src={logo} alt="Logo" className="h-24 md:h-32 w-auto object-contain" />
      </div>

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
