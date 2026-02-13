'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Wrench, AlertCircle, CheckCircle2, RefreshCw, Plus, X } from 'lucide-react';
import Sidebar from '@/components/sidebar';

export default function MantenimientoPage() {
  const [datos, setDatos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sesion, setSesion] = useState(null); // Blindaje de seguridad
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    unidad_id: '',
    tipo_servicio: '',
    km_servicio: '',
    prox_servicio: '',
    costo: ''
  });

  // 1. Verificación de Soberanía y Carga Inicial
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        window.location.href = "/";
      } else {
        setSesion(session);
        fetchMantenimientos();
      }
    });
  }, []);

  const fetchMantenimientos = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('unidades')
      .select(`
        id,
        nombre,
        kilometraje_actual,
        mantenimientos (
          tipo_servicio,
          prox_servicio
        )
      `)
      .order('nombre');

    if (error) console.error("Error:", error.message);
    else setDatos(data);
    setLoading(false);
  };

  const handleRegistrar = async (e) => {
    e.preventDefault();
    setLoading(true);

    const { error: mtoError } = await supabase
      .from('mantenimientos')
      .insert([{
        unidad_id: formData.unidad_id,
        tipo_servicio: formData.tipo_servicio,
        km_servicio: parseInt(formData.km_servicio),
        prox_servicio: parseInt(formData.prox_servicio),
        costo: parseFloat(formData.costo)
      }]);

    if (!mtoError) {
      // Sincronizar kilometraje en la tabla unidades
      await supabase
        .from('unidades')
        .update({ kilometraje_actual: parseInt(formData.km_servicio) })
        .eq('id', formData.unidad_id);
      
      setShowModal(false);
      setFormData({ unidad_id: '', tipo_servicio: '', km_servicio: '', prox_servicio: '', costo: '' });
      fetchMantenimientos(); 
    }
    setLoading(false);
  };

  if (!sesion) return <div className="min-h-screen bg-slate-950"></div>;

  return (
    <div className="flex bg-slate-950 min-h-screen text-slate-200">
      <Sidebar />

      <main className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-[1400px] mx-auto">
          <header className="flex justify-between items-center mb-10">
            <div>
              <h1 className="text-3xl font-black text-white tracking-tighter uppercase italic leading-none">
                ESTATUS <span className="text-blue-600">MECÁNICO</span>
              </h1>
              <p className="text-slate-500 mt-2 font-bold uppercase text-[10px] tracking-[0.3em]">Gestión de Mantenimiento Preventivo</p>
            </div>
            <div className="flex gap-4">
              <button onClick={() => setShowModal(true)} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-xl transition-all font-black text-xs uppercase tracking-widest shadow-lg shadow-blue-900/20">
                <Plus size={18} /> Registrar Servicio
              </button>
              <button onClick={fetchMantenimientos} className="p-2.5 bg-slate-900 border border-slate-800 rounded-xl text-slate-400 hover:text-white transition-colors">
                <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
              </button>
            </div>
          </header>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {datos.map((u) => {
              const mto = u.mantenimientos?.[0] || { prox_servicio: (u.kilometraje_actual || 0) + 5000, tipo_servicio: 'Pendiente' };
              const km_restantes = mto.prox_servicio - (u.kilometraje_actual || 0);
              const esAlerta = km_restantes < 2000;

              return (
                <div key={u.id} className="bg-slate-900/40 border border-slate-800/60 p-6 rounded-3xl backdrop-blur-sm border-l-4 border-l-blue-600 hover:border-l-blue-400 transition-all">
                  <div className="flex justify-between items-start mb-6">
                    <div className="flex items-center gap-3">
                      <div className={`p-3 rounded-2xl ${esAlerta ? 'bg-orange-500/10 text-orange-400' : 'bg-blue-500/10 text-blue-400'}`}>
                        <Wrench size={22} />
                      </div>
                      <div>
                        <h3 className="font-black text-white text-lg uppercase italic tracking-tighter">{u.nombre}</h3>
                        <p className="text-[9px] text-slate-500 uppercase font-black tracking-[0.2em]">{mto.tipo_servicio}</p>
                      </div>
                    </div>
                    {esAlerta ? <AlertCircle className="text-orange-500 animate-pulse" size={20} /> : <CheckCircle2 className="text-green-500" size={20} />}
                  </div>

                  <div className="space-y-4">
                    <div className="flex justify-between text-[10px] font-mono text-slate-500 uppercase font-bold">
                      <span>Actual: {u.kilometraje_actual?.toLocaleString()} KM</span>
                      <span>Próximo: {mto.prox_servicio?.toLocaleString()} KM</span>
                    </div>
                    <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-1000 ${esAlerta ? 'bg-orange-500' : 'bg-blue-600'}`} 
                        style={{ width: `${Math.min(100, ((u.kilometraje_actual || 0) / mto.prox_servicio) * 100)}%` }}
                      ></div>
                    </div>
                    <p className={`text-center font-black text-xs uppercase tracking-[0.2em] ${esAlerta ? 'text-orange-400' : 'text-blue-400'}`}>
                       {km_restantes > 0 ? `Restan ${km_restantes.toLocaleString()} km` : 'SERVICIO REQUERIDO'}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>

      {/* MODAL DE REGISTRO */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-black text-white uppercase italic">Bitácora Técnica</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-500 hover:text-white"><X size={24} /></button>
            </div>
            <form onSubmit={handleRegistrar} className="space-y-4">
              <select 
                className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-white focus:border-blue-500 outline-none text-sm font-bold"
                value={formData.unidad_id}
                onChange={(e) => setFormData({...formData, unidad_id: e.target.value})}
                required
              >
                <option value="">Seleccionar Unidad...</option>
                {datos.map(u => <option key={u.id} value={u.id}>{u.nombre}</option>)}
              </select>
              <input 
                placeholder="Concepto (ej. Afinación Mayor)"
                className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-white focus:border-blue-500 outline-none text-sm"
                onChange={(e) => setFormData({...formData, tipo_servicio: e.target.value})}
                required
              />
              <div className="grid grid-cols-2 gap-4">
                <input 
                  type="number" placeholder="KM de Servicio"
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-white focus:border-blue-500 outline-none text-sm"
                  onChange={(e) => setFormData({...formData, km_servicio: e.target.value})}
                  required
                />
                <input 
                  type="number" placeholder="Próximo Servicio"
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-white focus:border-blue-500 outline-none text-sm"
                  onChange={(e) => setFormData({...formData, prox_servicio: e.target.value})}
                  required
                />
              </div>
              <input 
                type="number" step="0.01" placeholder="Costo Total ($MXN)"
                className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-white focus:border-blue-500 outline-none text-sm font-mono"
                onChange={(e) => setFormData({...formData, costo: e.target.value})}
                required
              />
              <button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-4 rounded-2xl transition-all mt-4 uppercase tracking-[0.2em] text-xs">
                {loading ? 'Sincronizando...' : 'Actualizar Bitácora'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}