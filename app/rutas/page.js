'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Navigation, Truck, MapPin, Clock, Plus, CheckCircle2 } from 'lucide-react';

export default function RutasPage() {
  const [rutas, setRutas] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchRutas = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('rutas')
      .select('*, unidades(nombre)')
      .order('fecha_salida', { ascending: false });
    if (!error) setRutas(data);
    setLoading(false);
  };

  useEffect(() => { fetchRutas(); }, []);

  return (
    <div className="min-h-screen bg-slate-950 p-8 text-slate-200">
      <header className="flex justify-between items-center mb-10">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight italic">Logística de Rutas</h1>
          <p className="text-slate-400 mt-2 font-medium uppercase text-xs tracking-[0.2em]">Movimiento de Activos</p>
        </div>
        <button className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 transition-all">
          <Plus size={20} /> Nueva Ruta
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {rutas.map((ruta) => (
          <div key={ruta.id} className="bg-slate-900/40 border border-slate-800/60 rounded-3xl p-6 hover:border-blue-600/30 transition-all">
            <div className="flex justify-between items-start mb-6">
              <div className="bg-blue-600/10 p-3 rounded-xl text-blue-500">
                <Truck size={24} />
              </div>
              <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${ruta.estatus === 'Finalizado' ? 'bg-green-500/10 border-green-500/20 text-green-500' : 'bg-blue-500/10 border-blue-500/20 text-blue-400'}`}>
                {ruta.estatus}
              </span>
            </div>
            
            <div className="space-y-4">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2 text-white font-bold tracking-tight">
                  <MapPin size={14} className="text-slate-500" /> {ruta.origen}
                </div>
                <div className="ml-[6px] border-l-2 border-slate-800 h-4 my-1"></div>
                <div className="flex items-center gap-2 text-blue-400 font-bold tracking-tight">
                  <MapPin size={14} /> {ruta.destino}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800/50 flex justify-between items-center text-[11px] font-mono">
                <span className="text-slate-500 uppercase tracking-tighter">Unidad: {ruta.unidades?.nombre}</span>
                <span className="text-slate-300 flex items-center gap-1"><Clock size={12}/> {ruta.fecha_salida}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}