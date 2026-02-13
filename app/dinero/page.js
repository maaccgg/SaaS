'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { DollarSign, ArrowDownCircle, ArrowUpCircle, TrendingUp } from 'lucide-react';
import Sidebar from '@/components/sidebar';

export default function DineroPage() {
  const [sesion, setSesion] = useState(null);
  const [loading, setLoading] = useState(false);

  // 1. Blindaje de Seguridad
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        window.location.href = "/";
      } else {
        setSesion(session);
      }
    });
  }, []);

  if (!sesion) return <div className="min-h-screen bg-slate-950"></div>;

  return (
    <div className="flex bg-slate-950 min-h-screen text-slate-200">
      <Sidebar />

      <main className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-[1400px] mx-auto">
          <header className="mb-10">
            <h1 className="text-3xl font-black text-white italic uppercase tracking-tighter">
              Gestión de <span className="text-green-500">Capital</span>
            </h1>
            <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.3em] mt-1">
              Institución - Flujo de Efectivo
            </p>
          </header>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Formulario de Gastos/Ingresos */}
            <div className="bg-slate-900 border border-slate-800 p-10 rounded-[2.5rem] shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-green-500/50 to-transparent"></div>
              
              <h2 className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mb-8">Registrar Movimiento</h2>
              
              <div className="space-y-6">
                <div>
                  <label className="text-[10px] font-black text-slate-600 uppercase ml-1 mb-2 block">Concepto de Operación</label>
                  <input 
                    placeholder="Ej. Diésel, Casetas, Pago Cliente" 
                    className="w-full bg-slate-950 border border-slate-800 p-4 rounded-2xl text-white outline-none focus:border-green-500 transition-all shadow-inner" 
                  />
                </div>
                
                <div>
                  <label className="text-[10px] font-black text-slate-600 uppercase ml-1 mb-2 block">Monto Total ($MXN)</label>
                  <input 
                    type="number" 
                    placeholder="0.00" 
                    className="w-full bg-slate-950 border border-slate-800 p-4 rounded-2xl text-white outline-none focus:border-green-500 font-mono text-xl transition-all shadow-inner" 
                  />
                </div>

                <div className="grid grid-cols-2 gap-6 pt-4">
                  <button className="flex items-center justify-center gap-2 bg-green-600/10 border border-green-600/20 text-green-500 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-green-600 hover:text-white transition-all shadow-lg shadow-green-900/10 group">
                    <ArrowUpCircle size={18} className="group-hover:-translate-y-1 transition-transform" />
                    Ingreso
                  </button>
                  <button className="flex items-center justify-center gap-2 bg-red-600/10 border border-red-600/20 text-red-500 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-red-600 hover:text-white transition-all shadow-lg shadow-red-900/10 group">
                    <ArrowDownCircle size={18} className="group-hover:translate-y-1 transition-transform" />
                    Gasto
                  </button>
                </div>
              </div>
            </div>

            {/* Resumen de Utilidad */}
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-green-600 rounded-[2.6rem] blur opacity-10 group-hover:opacity-20 transition duration-1000"></div>
              <div className="relative bg-slate-900 border border-slate-800 p-12 rounded-[2.5rem] h-full flex flex-col justify-center items-center text-center">
                <div className="p-6 bg-blue-500/10 rounded-full mb-6">
                  <TrendingUp size={48} className="text-blue-500" />
                </div>
                <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.4em]">Utilidad Neta Proyectada</p>
                <h2 className="text-6xl font-black text-white mt-4 italic tracking-tighter">$0.00</h2>
                <div className="mt-8 pt-8 border-t border-slate-800 w-full">
                  <p className="text-[11px] text-slate-500 italic font-medium leading-relaxed">
                    "My authority generates wealth; <br/>my Institution knows no scarcity."
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}