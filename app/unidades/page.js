'use client';
import { useState, useEffect } from 'react';
import { Truck, Plus, X, RefreshCw } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient'; 
import Sidebar from '@/components/sidebar';

export default function UnidadesPage() {
  const [unidades, setUnidades] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sesion, setSesion] = useState(null); // Estado para blindaje
  const [formData, setFormData] = useState({
    nombre: '',
    placas: '',
    kilometraje_a: ''
  });

  // 1. VERIFICACIÓN DE SOBERANÍA (Seguridad)
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        window.location.href = "/"; // Redirigir a la Bóveda si no hay sesión
      } else {
        setSesion(session);
        fetchUnidades();
      }
    });
  }, []);

  const fetchUnidades = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('unidades')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error) setUnidades(data);
    setLoading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { error } = await supabase
      .from('unidades')
      .insert([{ 
        nombre: formData.nombre,
        placas: formData.placas,
        kilometraje_a: parseInt(formData.kilometraje_a) || 0,
        estado: 'Activo'
      }]);

    if (!error) {
      setShowModal(false);
      setFormData({ nombre: '', placas: '', kilometraje_a: '' });
      fetchUnidades();
    }
  };

  // Si no hay sesión, no renderizamos nada (mientras redirige)
  if (!sesion) return <div className="min-h-screen bg-slate-950"></div>;

  return (
    <div className="flex bg-slate-950 min-h-screen text-slate-200">
      {/* INTEGRACIÓN DEL SIDEBAR */}
      <Sidebar />

      {/* CONTENIDO PRINCIPAL A LA DERECHA */}
      <main className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-1400px mx-auto">
          <header className="flex justify-between items-center mb-10">
            <div>
              <h1 className="text-3xl font-bold text-white tracking-tight uppercase italic">
                Gestión de <span className="text-blue-600">Unidades</span>
              </h1>
              <p className="text-slate-400 mt-2 font-medium text-[10px] tracking-widest uppercase">
                Fase: <span className="text-blue-400">Consolidación 2026</span>
              </p>
            </div>
            <div className="flex gap-4">
              <button onClick={fetchUnidades} className="p-2.5 text-slate-400 hover:text-white transition-colors">
                <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
              </button>
              <button onClick={() => setShowModal(true)} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all">
                <Plus size={20} /> Nueva Unidad
              </button>
            </div>
          </header>

          {/* TABLA DINÁMICA */}
          <div className="bg-slate-900/40 border border-slate-800/60 backdrop-blur-sm rounded-3xl overflow-hidden shadow-2xl">
            <table className="w-full text-left">
              <thead className="bg-slate-800/40 text-slate-500 text-[10px] uppercase tracking-[0.2em] border-b border-slate-800/50">
                <tr>
                  <th className="px-6 py-5 font-bold">Unidad / Placas</th>
                  <th className="px-6 py-5 font-bold text-center">Estatus</th>
                  <th className="px-6 py-5 font-bold text-right">Kilometraje</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {unidades.map((unidad) => (
                  <tr key={unidad.id} className="hover:bg-blue-600/5 transition-colors group">
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-4">
                        <div className="p-2.5 bg-blue-500/10 rounded-xl text-blue-400">
                          <Truck size={20} />
                        </div>
                        <div>
                          <p className="font-bold text-slate-100 uppercase text-sm italic">{unidad.nombre}</p>
                          <p className="text-[10px] text-slate-500 font-mono tracking-tighter uppercase">{unidad.placas || 'SIN PLACAS'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-center">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-[9px] font-black bg-green-500/10 text-green-400 border border-green-500/20 uppercase tracking-widest">
                        ● {unidad.estado || 'Activo'}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-right font-mono text-sm text-slate-300">
                      {unidad.kilometraje_a?.toLocaleString() || 0} <span className="text-[10px] text-slate-600">KM</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {unidades.length === 0 && !loading && (
              <div className="p-20 text-center text-slate-600 italic text-xs uppercase tracking-widest">No hay unidades registradas en la Institución.</div>
            )}
          </div>
        </div>
      </main>

      {/* MODAL SIMPLIFICADO */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 p-8 rounded-[2.5rem] w-full max-w-md shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-black uppercase italic text-white">Alta de Unidad</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-500 hover:text-white"><X size={24} /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <input 
                type="text" placeholder="Nombre (Ej: Tracto #204)" required
                className="w-full bg-slate-950 border border-slate-800 p-4 rounded-2xl outline-none focus:border-blue-500 text-sm"
                value={formData.nombre} onChange={(e) => setFormData({...formData, nombre: e.target.value})}
              />
              <input 
                type="text" placeholder="Placas"
                className="w-full bg-slate-950 border border-slate-800 p-4 rounded-2xl outline-none focus:border-blue-500 text-sm"
                value={formData.placas} onChange={(e) => setFormData({...formData, placas: e.target.value})}
              />
              <input 
                type="number" placeholder="Kilometraje Inicial"
                className="w-full bg-slate-950 border border-slate-800 p-4 rounded-2xl outline-none focus:border-blue-500 text-sm"
                value={formData.kilometraje_a} onChange={(e) => setFormData({...formData, kilometraje_a: e.target.value})}
              />
              <button className="w-full bg-blue-600 hover:bg-blue-500 py-4 rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg shadow-blue-900/20 transition-all">
                Registrar en Flotilla
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}