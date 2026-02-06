'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Wrench, Gauge, AlertCircle, CheckCircle2, RefreshCw, Plus, X } from 'lucide-react';

export default function MantenimientoPage() {
  // 1. Estados
  const [datos, setDatos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    unidad_id: '',
    tipo_servicio: '',
    km_servicio: '',
    prox_servicio: '',
    costo: ''
  });

  // 2. Carga de Datos
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

  useEffect(() => {
    fetchMantenimientos();
  }, []);

  // 3. Manejador del Formulario
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

    if (mtoError) {
      alert("Error en bitácora: " + mtoError.message);
    } else {
      const { error: unitError } = await supabase
        .from('unidades')
        .update({ kilometraje_actual: parseInt(formData.km_servicio) })
        .eq('id', formData.unidad_id);

      if (unitError) alert("Error actualizando unidad: " + unitError.message);
      
      setShowModal(false);
      setFormData({ unidad_id: '', tipo_servicio: '', km_servicio: '', prox_servicio: '', costo: '' });
      fetchMantenimientos(); 
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-950 p-8 text-slate-200">
      <header className="flex justify-between items-center mb-10">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Estatus Mecánico</h1>
          <p className="text-slate-400 mt-2 font-medium italic">Fase: Consolidación 2026</p>
        </div>
        <div className="flex gap-4">
          <button onClick={() => setShowModal(true)} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-xl transition-all font-bold text-sm shadow-lg shadow-blue-900/20">
            <Plus size={18} /> Registrar Servicio
          </button>
          <button onClick={fetchMantenimientos} className="p-2.5 bg-slate-900 border border-slate-800 rounded-xl text-slate-400 hover:text-white transition-colors">
            <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </header>

      {/* Grid de Tarjetas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {datos.map((u) => {
          const mto = u.mantenimientos?.[0] || { prox_servicio: u.kilometraje_actual + 5000, tipo_servicio: 'Pendiente' };
          const km_restantes = mto.prox_servicio - u.kilometraje_actual;
          const esAlerta = km_restantes < 2000;

          return (
            <div key={u.id} className="bg-slate-900/40 border border-slate-800/60 p-6 rounded-2xl backdrop-blur-sm border-l-4 border-l-blue-600">
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-3">
                  <div className={`p-3 rounded-xl ${esAlerta ? 'bg-orange-500/10 text-orange-400' : 'bg-blue-500/10 text-blue-400'}`}>
                    <Wrench size={22} />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-lg">{u.nombre}</h3>
                    <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest">{mto.tipo_servicio}</p>
                  </div>
                </div>
                {esAlerta ? <AlertCircle className="text-orange-500 animate-pulse" size={20} /> : <CheckCircle2 className="text-green-500" size={20} />}
              </div>

              <div className="space-y-4">
                <div className="flex justify-between text-[10px] font-mono text-slate-500 uppercase font-bold">
                  <span>Actual: {u.kilometraje_actual?.toLocaleString()} KM</span>
                  <span>Próximo: {mto.prox_servicio?.toLocaleString()} KM</span>
                </div>
                <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                  <div className={`h-full ${esAlerta ? 'bg-orange-500' : 'bg-blue-600'}`} style={{ width: `${Math.min(100, (u.kilometraje_actual / mto.prox_servicio) * 100)}%` }}></div>
                </div>
                <p className={`text-center font-black text-sm ${esAlerta ? 'text-orange-400' : 'text-blue-400'}`}>
                   {km_restantes > 0 ? `Faltan ${km_restantes.toLocaleString()} km` : 'SERVICIO VENCIDO'}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* MODAL DE REGISTRO */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-3xl p-8 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-white">Nuevo Registro</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-500 hover:text-white"><X size={24} /></button>
            </div>
            <form onSubmit={handleRegistrar} className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Unidad</label>
                <select 
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 mt-1 text-white focus:border-blue-500 outline-none"
                  value={formData.unidad_id}
                  onChange={(e) => setFormData({...formData, unidad_id: e.target.value})}
                  required
                >
                  <option value="">Seleccionar...</option>
                  {datos.map(u => <option key={u.id} value={u.id}>{u.nombre}</option>)}
                </select>
              </div>
              <input 
                placeholder="Tipo de Servicio (ej. Cambio de Aceite)"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white focus:border-blue-500 outline-none"
                onChange={(e) => setFormData({...formData, tipo_servicio: e.target.value})}
                required
              />
              <div className="grid grid-cols-2 gap-4">
                <input 
                  type="number" placeholder="KM Actual"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white focus:border-blue-500 outline-none"
                  onChange={(e) => setFormData({...formData, km_servicio: e.target.value})}
                  required
                />
                <input 
                  type="number" placeholder="KM Prox"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white focus:border-blue-500 outline-none"
                  onChange={(e) => setFormData({...formData, prox_servicio: e.target.value})}
                  required
                />
              </div>
              <input 
                type="number" step="0.01" placeholder="Costo Total ($MXN)"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white focus:border-blue-500 outline-none"
                onChange={(e) => setFormData({...formData, costo: e.target.value})}
                required
              />
              <button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-2xl transition-all mt-4">
                {loading ? 'Procesando...' : 'Guardar en Bitácora'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}