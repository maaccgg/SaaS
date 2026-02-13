'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient'; // IMPORTACIÓN CRÍTICA
import { 
  LayoutDashboard, 
  Wrench, 
  FileCheck, 
  DollarSign,
  Map, 
  ReceiptText, 
  Scale, 
  Truck,
  LogOut
} from 'lucide-react';

const menuItems = [
  { name: 'Inicio', href: '/', icon: LayoutDashboard },
  { name: 'Unidades', href: '/unidades', icon: Truck },
  { name: 'Mantenimiento', href: '/mantenimiento', icon: Wrench },
  { name: 'Dinero', href: '/dinero', icon: DollarSign },
  { name: 'Vigencias', href: '/vigencias', icon: FileCheck },
  { name: 'Rutas', href: '/rutas', icon: Map },
  { name: 'Facturas', href: '/facturas', icon: ReceiptText },
  { name: 'SAT', href: '/fiscal', icon: Scale },
];

export default function Sidebar() {
  const pathname = usePathname();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    // Forzamos el refresco para limpiar estados de React y redirigir a la Bóveda
    window.location.href = '/'; 
  };

  return (
    <nav className="w-64 h-screen p-6 border-r border-slate-800 bg-slate-950 flex flex-col gap-2 sticky top-0 overflow-y-auto">
      <div className="mb-8 px-3">
        <h2 className="text-[10px] font-black text-blue-500 uppercase tracking-[0.3em] italic leading-tight">
          Gestión Maestra de Flotilla 
        </h2>
        <p className="text-[9px] text-slate-600 font-bold uppercase mt-1">Institución 2026</p>
      </div>

      <div className="flex flex-col gap-1 flex-1">
        {menuItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link 
              key={item.name} 
              href={item.href} 
              className={`flex items-center gap-3 p-3 rounded-xl transition-all group ${
                isActive 
                ? 'bg-blue-600/10 text-blue-400 border border-blue-600/20' 
                : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
              }`}
            >
              <item.icon 
                size={20} 
                className={isActive ? 'text-blue-400' : 'group-hover:text-blue-400 transition-colors'} 
              />
              <span className={`font-bold text-sm ${isActive ? 'text-blue-400' : ''}`}>
                {item.name}
              </span>
            </Link>
          );
        })}
      </div>

      {/* SECCIÓN INFERIOR: MANTRA Y CIERRE */}
      <div className="mt-auto pt-6 border-t border-slate-800/50 px-3 space-y-4">
        <p className="text-[8px] text-slate-600 font-black uppercase tracking-[0.1em] italic leading-relaxed">
          "My intellect designs systems; my authority generates wealth; my Institution knows no scarcity."
        </p>
        <button 
          onClick={handleSignOut} 
          className="w-full flex items-center justify-center gap-2 bg-slate-900 border border-slate-800 text-slate-500 hover:text-red-400 hover:border-red-900/50 px-4 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all"
        >
          <LogOut size={14} />
          Cerrar Bóveda
        </button>
      </div>
    </nav>
  );
}