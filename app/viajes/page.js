'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { 
  Truck, User, MapPin, Package, PlusCircle, 
  Trash2, FileText, X, Navigation, Calendar, 
  ChevronRight, AlertCircle, CheckCircle2 
} from 'lucide-react';
import Sidebar from '@/components/sidebar';

export default function ViajesPage() {
  const [sesion, setSesion] = useState(null);
  const [loading, setLoading] = useState(false);
  const [mostrarModal, setMostrarModal] = useState(false);
  const [viajes, setViajes] = useState([]);

  // Catálogos para los selectores
  const [catalogos, setCatalogos] = useState({
    unidades: [], operadores: [], ubicaciones: [], mercancias: []
  });

  const [formData, setFormData] = useState({
    unidad_id: '', operador_id: '', origen_id: '', 
    destino_id: '', mercancia_id: '', cantidad: 1, 
    fecha_salida: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setSesion(session);
        cargarCatalogos(session.user.id);
        obtenerViajes(session.user.id);
      }
    });
  }, []);

  async function cargarCatalogos(userId) {
    const [u, o, ub, m] = await Promise.all([
      supabase.from('unidades').select('id, numero_economico').eq('usuario_id', userId),
      supabase.from('operadores').select('id, nombre_completo').eq('usuario_id', userId),
      supabase.from('ubicaciones').select('id, nombre_lugar, codigo_postal').eq('usuario_id', userId),
      supabase.from('mercancias').select('id, descripcion, peso_unitario_kg').eq('usuario_id', userId)
    ]);

    setCatalogos({
      unidades: u.data || [],
      operadores: o.data || [],
      ubicaciones: ub.data || [],
      mercancias: m.data || []
    });
  }

  async function obtenerViajes(userId) {
    const { data } = await supabase
      .from('viajes')
      .select(`
        *,
        unidades(numero_economico),
        operadores(nombre_completo),
        origen:ubicaciones!viajes_origen_id_fkey(nombre_lugar),
        destino:ubicaciones!viajes_destino_id_fkey(nombre_lugar),
        mercancias(descripcion)
      `)
      .eq('usuario_id', userId)
      .order('created_at', { ascending: false });
    setViajes(data || []);
  }

  const registrarViaje = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    // Calcular peso total aproximado
    const m = catalogos.mercancias.find(x => x.id === formData.mercancia_id);
    const pesoCalc = m ? m.peso_unitario_kg * formData.cantidad : 0;

    const { error } = await supabase.from('viajes').insert([{
      ...formData,
      usuario_id: sesion.user.id,
      peso_total_kg: pesoCalc
    }]);

    if (!error) {
      setMostrarModal(false);
      setFormData({ unidad_id: '', operador_id: '', origen_id: '', destino_id: '', mercancia_id: '', cantidad: 1, fecha_salida: new Date().toISOString().split('T')[0] });
      obtenerViajes(sesion.user.id);
    }
    setLoading(false);
  };

  if (!sesion) return <div className="min-h-screen bg-slate-950"></div>;

  return (
    <div className="flex bg-slate-950 min-h-screen text-slate-200">
      <Sidebar />
      <main className="flex-1 p-10 overflow-y-auto">
        <div className="max-w-6xl mx-auto">
          
          <header className="mb-12 flex justify-between items-end">
            <div>
              <h1 className="text-3xl font-black tracking-tighter uppercase italic text-white">Logística de <span className="text-blue-500">Viajes</span></h1>
              <p className="text-slate-500 text-[9px] font-black uppercase tracking-[0.3em] mt-2">Consolidación de Manifiestos y Carta Porte</p>
            </div>
            <button onClick={() => setMostrarModal(true)} className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all shadow-lg shadow-blue-900/20 flex items-center gap-2">
              <PlusCircle size={16} /> Programar Viaje
            </button>
          </header>

          {/* LISTADO DE VIAJES (DISEÑO BENTO) */}
          <div className="grid grid-cols-1 gap-4">
            {viajes.map((v) => (
              <div key={v.id} className="bg-slate-900/40 border border-slate-800 p-6 rounded-[2.5rem] hover:border-blue-500/30 transition-all group backdrop-blur-sm">
                <div className="flex flex-wrap lg:flex-nowrap items-center gap-8">
                  
                  {/* Status & Folio */}
                  <div className="min-w-[100px]">
                    <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Folio</p>
                    <h4 className="text-lg font-black text-white font-mono">#{String(v.folio_interno).padStart(4, '0')}</h4>
                    <span className="text-[8px] bg-blue-500/10 text-blue-400 px-2 py-1 rounded-full font-black uppercase mt-2 inline-block">
                      {v.estatus}
                    </span>
                  </div>

                  {/* Ruta Visual */}
                  <div className="flex-1 flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-[8px] text-slate-600 font-black uppercase">Origen</p>
                      <p className="text-xs font-bold text-white uppercase">{v.origen?.nombre_lugar}</p>
                    </div>
                    <div className="flex-1 flex items-center gap-2">
                      <div className="h-[2px] flex-1 bg-slate-800 relative">
                        <div className="absolute inset-0 bg-blue-500/30 w-1/2"></div>
                      </div>
                      <Navigation size={14} className="text-blue-500 rotate-90" />
                    </div>
                    <div>
                      <p className="text-[8px] text-slate-600 font-black uppercase">Destino</p>
                      <p className="text-xs font-bold text-white uppercase">{v.destino?.nombre_lugar}</p>
                    </div>
                  </div>

                  {/* Activos */}
                  <div className="flex items-center gap-6 border-l border-slate-800 pl-8">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2 text-slate-400">
                        <Truck size={14} /> <span className="text-[10px] font-black uppercase italic">{v.unidades?.numero_economico}</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-400">
                        <User size={14} /> <span className="text-[10px] font-black uppercase italic">{v.operadores?.nombre_completo}</span>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2 text-slate-400">
                        <Package size={14} /> <span className="text-[10px] font-black uppercase italic">{v.mercancias?.descripcion}</span>
                      </div>
                      <div className="flex items-center gap-2 text-blue-500">
                        <Calendar size={14} /> <span className="text-[10px] font-black uppercase italic">{new Date(v.fecha_salida).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>

                  {/* Acciones Rápidas */}
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all ml-auto">
                    <button className="p-3 bg-slate-950 text-slate-400 hover:text-white rounded-xl" title="Generar PDF Carta Porte"><FileText size={18}/></button>
                    <button className="p-3 bg-slate-950 text-slate-400 hover:text-red-500 rounded-xl"><Trash2 size={18}/></button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* MODAL REGISTRO DE VIAJE */}
          {mostrarModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md" onClick={() => setMostrarModal(false)} />
              <div className="relative bg-slate-900 border border-slate-800 w-full max-w-3xl rounded-[3rem] p-12 shadow-2xl animate-in zoom-in-95">
                <button onClick={() => setMostrarModal(false)} className="absolute top-10 right-10 text-slate-500 hover:text-white"><X size={24} /></button>
                <h2 className="text-2xl font-black text-white italic uppercase mb-10">Programar Nuevo <span className="text-blue-500">Viaje</span></h2>
                
                <form onSubmit={registrarViaje} className="space-y-8">
                  
                  {/* SECCIÓN 1: VEHÍCULO Y OPERADOR */}
                  <div className="grid grid-cols-2 gap-6 p-6 bg-slate-950/50 rounded-3xl border border-slate-800">
                    <div>
                      <label className="text-[9px] font-black text-slate-500 uppercase block mb-2 ml-1">Unidad Asignada</label>
                      <select required className="w-full bg-slate-900 border border-slate-800 p-4 rounded-2xl text-sm text-white outline-none focus:border-blue-500 transition-all"
                        value={formData.unidad_id} onChange={e => setFormData({...formData, unidad_id: e.target.value})}>
                        <option value="">Seleccionar Camión...</option>
                        {catalogos.unidades.map(u => <option key={u.id} value={u.id}>{u.numero_economico}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-[9px] font-black text-slate-500 uppercase block mb-2 ml-1">Operador Responsable</label>
                      <select required className="w-full bg-slate-900 border border-slate-800 p-4 rounded-2xl text-sm text-white outline-none focus:border-blue-500 transition-all"
                        value={formData.operador_id} onChange={e => setFormData({...formData, operador_id: e.target.value})}>
                        <option value="">Seleccionar Chofer...</option>
                        {catalogos.operadores.map(o => <option key={o.id} value={o.id}>{o.nombre_completo}</option>)}
                      </select>
                    </div>
                  </div>

                  {/* SECCIÓN 2: RUTA */}
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <label className="text-[9px] font-black text-slate-500 uppercase block mb-2 ml-1 text-blue-400">Origen de Carga</label>
                      <select required className="w-full bg-slate-950 border border-slate-800 p-4 rounded-2xl text-sm text-white outline-none focus:border-blue-500 transition-all"
                        value={formData.origen_id} onChange={e => setFormData({...formData, origen_id: e.target.value})}>
                        <option value="">Punto A...</option>
                        {catalogos.ubicaciones.map(ub => <option key={ub.id} value={ub.id}>{ub.nombre_lugar} (CP {ub.codigo_postal})</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-[9px] font-black text-slate-500 uppercase block mb-2 ml-1 text-orange-400">Destino Final</label>
                      <select required className="w-full bg-slate-950 border border-slate-800 p-4 rounded-2xl text-sm text-white outline-none focus:border-blue-500 transition-all"
                        value={formData.destino_id} onChange={e => setFormData({...formData, destino_id: e.target.value})}>
                        <option value="">Punto B...</option>
                        {catalogos.ubicaciones.map(ub => <option key={ub.id} value={ub.id}>{ub.nombre_lugar} (CP {ub.codigo_postal})</option>)}
                      </select>
                    </div>
                  </div>

                  {/* SECCIÓN 3: MERCANCÍA */}
                  <div className="grid grid-cols-3 gap-6">
                    <div className="col-span-2">
                      <label className="text-[9px] font-black text-slate-500 uppercase block mb-2 ml-1">Bien / Mercancía</label>
                      <select required className="w-full bg-slate-950 border border-slate-800 p-4 rounded-2xl text-sm text-white outline-none focus:border-blue-500 transition-all"
                        value={formData.mercancia_id} onChange={e => setFormData({...formData, mercancia_id: e.target.value})}>
                        <option value="">Tipo de Carga...</option>
                        {catalogos.mercancias.map(m => <option key={m.id} value={m.id}>{m.descripcion}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-[9px] font-black text-slate-500 uppercase block mb-2 ml-1">Cantidad</label>
                      <input required type="number" className="w-full bg-slate-950 border border-slate-800 p-4 rounded-2xl text-sm text-white" 
                        value={formData.cantidad} onChange={e => setFormData({...formData, cantidad: e.target.value})} />
                    </div>
                  </div>

                  <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white py-5 rounded-3xl font-black uppercase text-xs tracking-[0.3em] shadow-xl hover:bg-blue-500 transition-all">
                    {loading ? "Generando Manifiesto..." : "Consolidar Viaje Operativo"}
                  </button>
                </form>
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}