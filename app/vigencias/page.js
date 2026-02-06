'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Shield, FileText, Calendar, Plus, X, RefreshCw, AlertTriangle, Clock } from 'lucide-react';

export default function VigenciasPage() {
  const [datos, setDatos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [unidades, setUnidades] = useState([]);
  const [formData, setFormData] = useState({ unidad_id: '', tipo: '', fecha: '' });

  const fetchVigencias = async () => {
    setLoading(true);
    // Traemos unidades con sus vigencias
    const { data, error } = await supabase
      .from('unidades')
      .select(`id, nombre, vigencias(*)`)
      .order('nombre');
    
    if (!error) setDatos(data);
    setLoading(false);
  };

  const fetchUnidades = async () => {
    const { data } = await supabase.from('unidades').select('id, nombre');
    if (data) setUnidades(data);
  };

  useEffect(() => {
    fetchVigencias();
    fetchUnidades();
  }, []);

  const calcularDias = (fecha) => {
    const hoy = new Date();
    const venc = new Date(fecha);
    const diff = venc - hoy;
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  const handleGuardar = async (e) => {
    e.preventDefault();
    const { error } = await supabase
      .from('vigencias')
      .insert([{
        unidad_id: formData.unidad_id,
        tipo_documento: formData.tipo,
        fecha_vencimiento: formData.fecha
      }]);

    if (!error) {
      setShowModal(false);
      fetchVigencias();
    } else {
      alert("Error: " + error.message);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 p-8 text-slate-200">
      <header className="flex justify-between items-center mb-10">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Vigencias Legales</h1>
          <p className="text-slate-400 mt-2 font-medium">Blindaje jurídico de la Institución</p>
        </div>
        <button onClick={() => setShowModal(true)} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-xl transition-all font-bold shadow-lg shadow-blue-900/20">
          <Plus size={18} /> Registrar Documento
        </button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {datos.map((u) => (
          <div key={u.id} className="bg-slate-900/40 border border-slate-800/60 rounded-3xl p-6 backdrop-blur-sm shadow-xl">
            <h2 className="text-xl font-black text-white mb-6 flex items-center gap-2 uppercase tracking-tighter italic">
               <div className="w-2 h-6 bg-blue-600 rounded-full"></div> {u.nombre}
            </h2>
            
            <div className="space-y-3">
              {u.vigencias?.length > 0 ? u.vigencias.map((v) => {
                const dias = calcularDias(v.fecha_vencimiento);
                const esCritico = dias <= 15;
                const esPreventivo = dias > 15 && dias <= 45;

                return (
                  <div key={v.id} className="flex items-center justify-between bg-slate-950/60 border border-slate-800/50 p-4 rounded-2xl">
                    <div className="flex items-center gap-4">
                      <div className={`p-2 rounded-lg ${esCritico ? 'text-red-400' : esPreventivo ? 'text-orange-400' : 'text-blue-500'}`}>
                        {v.tipo_documento.toLowerCase().includes('seguro') ? <Shield size={20}/> : <FileText size={20}/>}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-200">{v.tipo_documento}</p>
                        <p className="text-[11px] text-slate-500 font-mono italic">{v.fecha_vencimiento}</p>
                      </div>
                    </div>
                    <div className={`text-xs font-black px-3 py-1 rounded-full border ${esCritico ? 'bg-red-500/10 border-red-500/20 text-red-400' : esPreventivo ? 'bg-orange-500/10 border-orange-500/20 text-orange-400' : 'bg-blue-500/10 border-blue-500/20 text-blue-500'}`}>
                      {dias <= 0 ? 'VENCIDO' : `${dias} DÍAS`}
                    </div>
                  </div>
                );
              }) : (
                <p className="text-center text-slate-600 text-xs py-4 italic uppercase tracking-widest font-bold">Sin documentos registrados</p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-3xl p-8 shadow-2xl">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-xl font-bold text-white tracking-tight italic">NUEVO DOCUMENTO</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-500 hover:text-white"><X size={24} /></button>
            </div>
            <form onSubmit={handleGuardar} className="space-y-5">
              <select className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-white outline-none focus:border-blue-500"
                onChange={(e) => setFormData({...formData, unidad_id: e.target.value})} required>
                <option value="">Seleccionar Unidad...</option>
                {unidades.map(u => <option key={u.id} value={u.id}>{u.nombre}</option>)}
              </select>
              <input placeholder="Tipo (ej. Seguro, SCT, Placas)" className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-white outline-none focus:border-blue-500"
                onChange={(e) => setFormData({...formData, tipo: e.target.value})} required />
              <input type="date" className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-white outline-none focus:border-blue-500"
                onChange={(e) => setFormData({...formData, fecha: e.target.value})} required />
              <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-4 rounded-2xl transition-all shadow-lg shadow-blue-900/20 uppercase tracking-widest">
                Guardar Blindaje
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}