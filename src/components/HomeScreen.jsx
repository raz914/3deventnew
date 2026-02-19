import AppHeader from './AppHeader';
import Card from './Card';
import manieroBg from '../assets/maniero_background_1767972613370.png';
import virtualTourBg from '../assets/virtual_tour_background_1767972628743.png';

export default function HomeScreen({ onOpenSplatViewer }) {
  return (
    <div className="min-h-screen bg-black text-white p-8 relative overflow-hidden animate-slide-up">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,_rgba(30,58,138,0.1)_0%,_transparent_50%)]" />

      <AppHeader />

      <div className="max-w-7xl mx-auto h-[80vh] flex items-center justify-center">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full h-[60vh]">
          <Card
            title="NEW SCENE MANIERO MONTECASSIANO"
            image={manieroBg}
            delay="delay-0"
            hoverType="border"
            onClick={onOpenSplatViewer}
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
  );
}
