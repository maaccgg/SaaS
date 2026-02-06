'use client';
import { useState, useEffect } from 'react';
import { Truck, Plus, X, RefreshCw } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient'; 

export default function UnidadesPage() {
  const [unidades, setUnidades] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    nombre: '',
    placas: '',
    kilometraje_a: ''
  });

  // FUNCIÓN PARA TRAER LOS DATOS
  const fetchUnidades = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('unidades')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error("Error cargando unidades:", error.message);
    } else {
      setUnidades(data);
    }
    setLoading(false);
  };
 
  // EJECUTAR AL CARGAR LA PÁGINA
  useEffect(() => {
    fetchUnidades();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { error } = await supabase
      .from('unidades')
      .insert([{ 
        nombre: formData.nombre,
        placas: formData.placas,
        kilometraje_actual: parseInt(formData.kilometraje_actual) || 0,
        estado: 'Activo'
      }]);

    if (!error) {
      setShowModal(false);
      fetchUnidades(); // Recargar la lista automáticamente
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 p-8 text-slate-200">
      <header className="flex justify-between items-center mb-10">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Gestión de Unidades</h1>
          <p className="text-slate-400 mt-2 font-medium">Fase: <span className="text-blue-400">Consolidación 2026</span></p>
        </div>
        <div className="flex gap-4">
          <button onClick={fetchUnidades} className="p-2.5 text-slate-400 hover:text-white transition-colors">
            <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
          </button>
          <button onClick={() => setShowModal(true)} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-xl font-semibold shadow-lg shadow-blue-900/20">
            <Plus size={20} /> Nueva Unidad
          </button>
        </div>
      </header>

      {/* TABLA DINÁMICA */}
      <div className="bg-slate-900/40 border border-slate-800/60 backdrop-blur-sm rounded-2xl overflow-hidden shadow-2xl">
        <table className="w-full text-left">
          <thead className="bg-slate-800/40 text-slate-500 text-[10px] uppercase tracking-[0.15em] border-b border-slate-800/50">
            <tr>
              <th className="px-6 py-5 font-bold">Unidad / Placas</th>
              <th className="px-6 py-5 font-bold text-center">Estatus</th>
              <th className="px-6 py-5 font-bold text-right font-mono">Kilometraje</th>
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
                      <p className="font-semibold text-slate-100">{unidad.nombre}</p>
                      <p className="text-xs text-slate-500 font-mono italic">{unidad.placas || 'SIN PLACAS'}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-5 text-center">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-green-500/10 text-green-400 border border-green-500/20 uppercase">
                    ● {unidad.estado || 'Activo'}
                  </span>
                </td>
                <td className="px-6 py-5 text-right font-mono text-sm text-slate-300">
                  {unidad.kilometraje_a?.toLocaleString()} km
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {unidades.length === 0 && !loading && (
          <div className="p-20 text-center text-slate-500 italic">No hay unidades registradas.</div>
        )}
      </div>

      {/* AQUÍ IRÍA EL MODAL (el código del modal que ya tienes) */}
      {/* ... (asegúrate de que los inputs del modal usen onChange para actualizar el nuevo formData) */}
    </div>
  );
}