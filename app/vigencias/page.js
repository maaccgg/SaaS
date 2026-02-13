"use client";
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { ShieldAlert, FileText, Clock, AlertCircle } from 'lucide-react';
import Sidebar from '@/components/sidebar';

export default function VigenciasPage() {
  const [sesion, setSesion] = useState(null);

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

  // DATOS SIMULADOS PARA EL IMPACTO DE LA DEMO
  const unidadesDemo = [
    { 
      id: 1, 
      nombre: "TRACTO #204 - KENWORTH", 
      seguro: "2026-02-15", // Próximo a vencer
      verificacion: "2026-08-20",
    },
    { 
      id: 2, 
      nombre: "TRACTO #102 - FREIGHTLINER", 
      seguro: "2025-12-01", // YA VENCIDO
      verificacion: "2026-03-10",
    },
    { 
      id: 3, 
      nombre: "TRACTO #305 - INTERNATIONAL", 
      seguro: "2026-11-15", 
      verificacion: "2026-12-01",
    }
  ];

  if (!sesion) return <div className="min-h-screen bg-slate-950"></div>;

  return (
    <div className="flex bg-slate-950 min-h-screen text-slate-100">
      <Sidebar />

      <main className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-[1400px] mx-auto">
          <header className="mb-12">
            <h1 className="text-4xl font-black tracking-tighter uppercase italic leading-none">
              CONTROL DE <span className="text-blue-600">VIGENCIAS</span>
            </h1>
            <p className="text-slate-500 mt-2 font-bold uppercase text-[10px] tracking-[0.3em]">
              Módulo de Prevención Legal - Fase Consolidación
            </p>
          </header>

          <div className="grid grid-cols-1 gap-6">
            {unidadesDemo.map((u) => {
              const fechaSeguro = new Date(u.seguro);
              const hoy = new Date();
              const esVencido = fechaSeguro < hoy;
              const esUrgente = !esVencido && fechaSeguro < new Date(hoy.getTime() + 7 * 24 * 60 * 60 * 1000);

              return (
                <div key={u.id} className="bg-slate-900 border border-slate-800 p-8 rounded-[2.5rem] flex flex-col lg:flex-row items-center justify-between shadow-2xl hover:border-slate-700 transition-all group">
                  <div className="flex items-center gap-6">
                    <div className={`p-4 rounded-2xl transition-transform group-hover:scale-110 ${
                      esVencido ? 'bg-red-500/10 text-red-500' : 
                      esUrgente ? 'bg-orange-500/10 text-orange-500' : 
                      'bg-blue-500/10 text-blue-500'
                    }`}>
                      <ShieldAlert size={32} />
                    </div>
                    <div>
                      <h3 className="text-xl font-black uppercase italic tracking-tighter">{u.nombre}</h3>
                      <div className="flex gap-2 mt-2">
                        <span className={`text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-[0.15em] ${
                          esVencido ? 'bg-red-600 text-white' : 
                          esUrgente ? 'bg-orange-600 text-white' : 
                          'bg-slate-800 text-slate-400'
                        }`}>
                          {esVencido ? 'Riesgo Crítico' : esUrgente ? 'Atención Inmediata' : 'Estatus: Operativo'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-12 mt-8 lg:mt-0">
                    <div className="text-center">
                      <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">Póliza de Seguro</p>
                      <div className={`font-mono font-bold text-base ${
                        esVencido ? 'text-red-500' : 
                        esUrgente ? 'text-orange-500' : 
                        'text-green-500'
                      }`}>
                        {u.seguro}
                      </div>
                    </div>
                    <div className="text-center">
                      <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">Verificación FM</p>
                      <div className="font-mono font-bold text-base text-slate-300">
                        {u.verificacion}
                      </div>
                    </div>
                  </div>

                  <button className="mt-8 lg:mt-0 bg-slate-800 hover:bg-blue-600 px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg hover:shadow-blue-900/20">
                    Actualizar
                  </button>
                </div>
              );
            })}
          </div>

          {/* NOTA PARA EL DEMO / INSIGHT */}
          <div className="mt-12 p-8 bg-blue-600/5 border border-blue-500/10 rounded-[2rem] flex items-center gap-6">
            <div className="bg-blue-600/20 p-3 rounded-xl">
              <AlertCircle className="text-blue-500" size={24} />
            </div>
            <p className="text-sm text-slate-400 italic leading-relaxed">
              "Este sistema monitorea automáticamente los vencimientos para asegurar que la autoridad nunca se vea comprometida por negligencia administrativa."
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}