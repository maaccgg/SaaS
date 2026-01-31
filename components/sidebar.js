// components/Sidebar.js
import Link from 'next/link';

//Creamos una barra al lado, con la que podemos ir agregando o quitando secciones.

export default function Sidebar() {
  return (

    <nav className="w-64 min-h-screen p-6 border-r border-slate-800 bg-slate-900/30 flex flex-col gap-4">
      <div className="mb-8">
        <h2 className="text-xs font-bold text-slate-500 uppercase tracking-[0.2em]">Menú Principal</h2>
      </div>

      {/* Item de Navegación */}
      <Link href="/" className="flex items-center gap-3 p-3 rounded-xl hover:bg-blue-600/10 hover:text-blue-400 transition-all group">
        <img src="/icons/libreta.png" className="w-5 h-5 opacity-70 group-hover:opacity-100" alt="" />
        <span className="font-medium">Dashboard</span>
      </Link>

      <Link href="/unidades" className="flex items-center gap-3 p-3 rounded-xl hover:bg-blue-600/10 hover:text-blue-400 transition-all group">
        <img src="/fleet/Camion-azul.png" className="w-5 h-5 opacity-70 group-hover:opacity-100" alt="" />
        <span className="font-medium">Unidades</span>
      </Link>

      <Link href="/Finanzas" className="flex items-center gap-3 p-3 rounded-xl hover:bg-blue-600/10 hover:text-blue-400 transition-all group">
        <img src="/icons/Ingresos.png" className="w-5 h-5 opacity-70 group-hover:opacity-100" alt="" />
        <span className="font-medium">Ingresos</span>
      </Link>

      <Link href="/Operadores" className="flex items-center gap-3 p-3 rounded-xl hover:bg-blue-600/10 hover:text-blue-400 transition-all group">
        <img src="/icons/Operador.png" className="w-5 h-5 opacity-70 group-hover:opacity-100" alt="" />
        <span className="font-medium">Personal</span>
      </Link>

      {/* Espacio final para el Power Mantra */}
      <div className="mt-auto pt-10 border-t border-slate-800/50">
        <p className="text-[10px] text-slate-600 italic leading-relaxed">
          "My intellect designs systems; my authority generates wealth."
        </p>
      </div>
    </nav>
  );
}