import logo from '../assets/logo.png';

export default function AppHeader() {
  return (
    <div className="absolute top-10 left-10 z-50">
      <img src={logo} alt="Logo" className="h-12 w-auto object-contain" />
    </div>
  );
}
