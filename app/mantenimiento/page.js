'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Wrench, AlertCircle, CheckCircle2, RefreshCw, Plus, X, History, Trash2, Fuel, ArrowDownCircle } from 'lucide-react';
import Sidebar from '@/components/sidebar';
import TarjetaDato from '@/components/tarjetaDato';

export default function MantenimientoPage() {
  const [datos, setDatos] = useState([]); // Unidades
  const [historialGastos, setHistorialGastos] = useState([]); // Gastos operativos
  const [loading, setLoading] = useState(true);
  const [sesion, setSesion] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ unidad_id: '', tipo_servicio: '', km_servicio: '', prox_servicio: '', costo: '' });
  
  // Estado para el nuevo formulario de Gastos Generales (movido de Dinero)
  const [gastoForm, setGastoForm] = useState({ descripcion: '', monto: '', categoria: 'Mantenimiento' });

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        window.location.href = "/";
      } else {
        setSesion(session);
        fetchDatosIniciales(session.user.id);
      }
    });
  }, []);

  const fetchDatosIniciales = async (userId) => {
    setLoading(true);
    // 1. Fetch Unidades y sus mantenimientos
    const { data: unidades } = await supabase
      .from('unidades')
      .select(`id, nombre, kilometraje_actual, mantenimientos ( tipo_servicio, prox_servicio )`)
      .order('nombre');
    
    // 2. Fetch Historial de Gastos (Tabla gastos)
    const { data: gastos } = await supabase
      .from('gastos')
      .select('*')
      .eq('usuario_id', userId)
      .order('created_at', { ascending: false });

    setDatos(unidades || []);
    setHistorialGastos(gastos || []);
    setLoading(false);
  };

  const handleRegistrarMantenimiento = async (e) => {
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
      await supabase.from('unidades').update({ kilometraje_actual: parseInt(formData.km_servicio) }).eq('id', formData.unidad_id);
      setShowModal(false);
      setFormData({ unidad_id: '', tipo_servicio: '', km_servicio: '', prox_servicio: '', costo: '' });
      fetchDatosIniciales(sesion.user.id); 
    }
    setLoading(false);
  };

  const registrarGastoGeneral = async (e) => {
    e.preventDefault();
    if (!gastoForm.descripcion || !gastoForm.monto) return;
    setLoading(true);
    const { error } = await supabase.from('gastos').insert([{ 
      descripcion: gastoForm.descripcion, 
      monto: parseFloat(gastoForm.monto), 
      categoria: gastoForm.categoria,
      usuario_id: sesion.user.id 
    }]);
    if (!error) {
      setGastoForm({ descripcion: '', monto: '', categoria: 'Mantenimiento' });
      fetchDatosIniciales(sesion.user.id);
    }
    setLoading(false);
  };

  const eliminarGasto = async (id) => {
    if (!confirm("¿Eliminar registro operativo?")) return;
    await supabase.from('gastos').delete().eq('id', id);
    fetchDatosIniciales(sesion.user.id);
  };

  if (!sesion) return <div className="min-h-screen bg-slate-950"></div>;

  return (
    <div className="flex bg-slate-950 min-h-screen text-slate-200">
      <Sidebar />
      <main className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-350 mx-auto">
          
          <header className="flex justify-between items-center mb-10">
            <div>
              <h1 className="text-3xl font-black text-white tracking-tighter uppercase italic leading-none">
                GASTOS Y <span className="text-blue-600">MANTENIMIENTOS</span>
              </h1>
              <p className="text-slate-500 mt-2 font-bold uppercase text-[10px] tracking-[0.3em]">Gestión Operativa de la Institución</p>
            </div>
            <div className="flex gap-4">
              <button onClick={() => setShowModal(true)} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-xl transition-all font-black text-xs uppercase shadow-lg shadow-blue-900/20 tracking-widest">
                <Plus size={18} /> Registrar Servicio KM
              </button>
            </div>
          </header>

          {/* SECCIÓN 1: ESTATUS MECÁNICO (UNIDADES) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
            {datos.map((u) => {
              const mto = u.mantenimientos?.[0] || { prox_servicio: (u.kilometraje_actual || 0) + 5000, tipo_servicio: 'Pendiente' };
              const km_restantes = mto.prox_servicio - (u.kilometraje_actual || 0);
              const esAlerta = km_restantes < 2000;
              return (
                <div key={u.id} className="bg-slate-900/40 border border-slate-800/60 p-6 rounded-3xl border-l-4 border-l-blue-600">
                  <div className="flex justify-between mb-4">
                    <h3 className="font-black text-white text-lg uppercase italic">{u.nombre}</h3>
                    {esAlerta ? <AlertCircle className="text-orange-500 animate-pulse" /> : <CheckCircle2 className="text-green-500" />}
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-[10px] font-mono text-slate-500 uppercase">
                      <span>Actual: {u.kilometraje_actual?.toLocaleString()} KM</span>
                      <span>Próximo: {mto.prox_servicio?.toLocaleString()} KM</span>
                    </div>
                    <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                      <div className={`h-full ${esAlerta ? 'bg-orange-500' : 'bg-blue-600'}`} style={{ width: `${Math.min(100, ((u.kilometraje_actual || 0) / mto.prox_servicio) * 100)}%` }}></div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* SECCIÓN 2: REGISTRO DE GASTOS GENERALES Y BITÁCORA */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-5 bg-slate-900 border border-slate-800 p-8 rounded-[2.5rem] shadow-2xl relative h-fit">
              <h2 className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mb-8 text-center">Registrar Gasto Directo</h2>
              <form onSubmit={registrarGastoGeneral} className="space-y-6">
                <input 
                  value={gastoForm.descripcion}
                  onChange={(e) => setGastoForm({...gastoForm, descripcion: e.target.value})}
                  placeholder="Descripción (Diesel, Llantas, etc.)" 
                  className="w-full bg-slate-950 border border-slate-800 p-4 rounded-2xl text-white outline-none focus:border-blue-500" 
                />
                <div className="grid grid-cols-2 gap-4">
                  <input 
                    type="number"
                    value={gastoForm.monto}
                    onChange={(e) => setGastoForm({...gastoForm, monto: e.target.value})}
                    placeholder="Monto $" 
                    className="w-full bg-slate-950 border border-slate-800 p-4 rounded-2xl text-white outline-none font-mono" 
                  />
                  <select 
                    value={gastoForm.categoria}
                    onChange={(e) => setGastoForm({...gastoForm, categoria: e.target.value})}
                    className="w-full bg-slate-950 border border-slate-800 p-4 rounded-2xl text-white outline-none"
                  >
                    <option value="Mantenimiento">Mantenimiento</option>
                    <option value="Combustible">Combustible</option>
                    <option value="Operación">Operación</option>
                  </select>
                </div>
                <button disabled={loading} className="w-full bg-blue-600 hover:bg-blue-500 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest">
                  Confirmar Egreso
                </button>
              </form>
            </div>

            <div className="lg:col-span-7 bg-slate-900 border border-slate-800 p-8 rounded-[2.5rem] shadow-2xl">
                <h2 className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mb-8">Bitácora de Salidas Recientes</h2>
                <div className="space-y-3">
                    {historialGastos.map((item) => (
                        <div key={item.id} className="bg-slate-950 border border-slate-800 p-4 rounded-2xl flex items-center justify-between group hover:border-slate-700 transition-all">
                            <div className="flex items-center gap-4">
                                <div className="bg-slate-800 p-2 rounded-lg text-slate-400">
                                    {item.categoria === 'Combustible' ? <Fuel size={16} /> : <Wrench size={16} />}
                                </div>
                                <div>
                                    <h4 className="text-xs font-bold text-white uppercase">{item.descripcion}</h4>
                                    <p className="text-[9px] text-slate-500 uppercase">{item.categoria} • {new Date(item.created_at).toLocaleDateString()}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <span className="text-sm font-mono font-bold text-white">${Number(item.monto).toLocaleString()}</span>
                                <button onClick={() => eliminarGasto(item.id)} className="text-slate-700 hover:text-red-500 transition-colors p-2"><Trash2 size={16} /></button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
          </div>
        </div>
      </main>

      {/* MODAL DE REGISTRO TÉCNICO (TU MODAL ORIGINAL) */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-black text-white uppercase italic">Bitácora Técnica</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-500 hover:text-white"><X size={24} /></button>
            </div>
            <form onSubmit={handleRegistrarMantenimiento} className="space-y-4">
              <select className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-white outline-none text-sm font-bold" value={formData.unidad_id} onChange={(e) => setFormData({...formData, unidad_id: e.target.value})} required>
                <option value="">Seleccionar Unidad...</option>
                {datos.map(u => <option key={u.id} value={u.id}>{u.nombre}</option>)}
              </select>
              <input placeholder="Concepto (ej. Afinación Mayor)" className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-white outline-none text-sm" onChange={(e) => setFormData({...formData, tipo_servicio: e.target.value})} required />
              <div className="grid grid-cols-2 gap-4">
                <input type="number" placeholder="KM de Servicio" className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-white outline-none text-sm" onChange={(e) => setFormData({...formData, km_servicio: e.target.value})} required />
                <input type="number" placeholder="Próximo Servicio" className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-white outline-none text-sm" onChange={(e) => setFormData({...formData, prox_servicio: e.target.value})} required />
              </div>
              <input type="number" step="0.01" placeholder="Costo Total ($MXN)" className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-white outline-none text-sm font-mono" onChange={(e) => setFormData({...formData, costo: e.target.value})} required />
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