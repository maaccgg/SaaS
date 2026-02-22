'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Navigation, Truck, MapPin, Clock, Plus, CheckCircle2 } from 'lucide-react';
import Sidebar from '@/components/sidebar';

export default function RutasPage() {
  const [rutas, setRutas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sesion, setSesion] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        window.location.href = "/";
      } else {
        setSesion(session);
        fetchRutas();
      }
    });
  }, []);

  const fetchRutas = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('rutas')
      .select('*, unidades(nombre)')
      .order('fecha_salida', { ascending: false });
    if (!error) setRutas(data);
    setLoading(false);
  };

  if (!sesion) return <div className="min-h-screen bg-slate-950"></div>;

  return (
    <div className="flex bg-slate-950 min-h-screen text-slate-200">
      <Sidebar />

      <main className="flex-1 p-8 overflow-y-auto">
        {/* CORRECCIÓN 1: max-w-[1400px] con corchetes */}
        <div className="max-w-350 mx-auto">
          <header className="flex justify-between items-center mb-10">
            <div>
              <h1 className="text-3xl font-black text-white tracking-tighter italic uppercase leading-none">
                Logística de <span className="text-blue-600">Rutas</span>
              </h1>
              <p className="text-slate-500 mt-2 font-bold uppercase text-[10px] tracking-[0.3em]">
                Movimiento de Activos de la Institución
              </p>
            </div>
            <button className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-blue-900/20 flex items-center gap-2">
              <Plus size={18} /> Nueva Ruta
            </button>
          </header>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {rutas.map((ruta) => (
              <div key={ruta.id} className="bg-slate-900/40 border border-slate-800/60 rounded-[2.5rem] p-8 hover:border-blue-600/30 transition-all group relative overflow-hidden">
                <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${ruta.estatus === 'Finalizado' ? 'bg-green-500' : 'bg-blue-600'}`}></div>

                <div className="flex justify-between items-start mb-6">
                  <div className="bg-blue-600/10 p-3 rounded-2xl text-blue-500 group-hover:scale-110 transition-transform">
                    <Truck size={24} />
                  </div>
                  <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                    ruta.estatus === 'Finalizado' 
                    ? 'bg-green-500/10 border-green-500/20 text-green-500' 
                    : 'bg-blue-500/10 border-blue-500/20 text-blue-400'
                  }`}>
                    {ruta.estatus}
                  </span>
                </div>
                
                <div className="space-y-4">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-3 text-white font-black tracking-tight uppercase italic text-sm">
                      <MapPin size={16} className="text-slate-600" /> {ruta.origen}
                    </div>
                    {/* CORRECCIÓN 2: ml-[7px] con corchetes */}
                    <div className="ml-1.75 border-l-2 border-slate-800 h-6 my-1"></div>
                    <div className="flex items-center gap-3 text-blue-400 font-black tracking-tight uppercase italic text-sm">
                      <MapPin size={16} /> {ruta.destino}
                    </div>
                  </div>

                  <div className="pt-6 border-t border-slate-800/50 flex justify-between items-center text-[10px] font-mono">
                    <div className="flex flex-col">
                      <span className="text-slate-600 uppercase font-bold tracking-tighter">Unidad</span>
                      <span className="text-slate-200 font-bold">{ruta.unidades?.nombre || 'S/N'}</span>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="text-slate-600 uppercase font-bold tracking-tighter">Salida</span>
                      <span className="text-slate-300 flex items-center gap-1 font-bold">
                        <Clock size={12}/> {new Date(ruta.fecha_salida).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {rutas.length === 0 && !loading && (
              <div className="col-span-full p-20 text-center border-2 border-dashed border-slate-800 rounded-[3rem]">
                <p className="text-slate-600 font-black uppercase tracking-[0.3em] italic text-xs">No hay operaciones registradas en el radar.</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}