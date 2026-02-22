'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { FileText, PlusCircle, History, Trash2, CheckCircle, Clock, X } from 'lucide-react';
import Sidebar from '@/components/sidebar';
import TarjetaDato from '@/components/tarjetaDato';

export default function FacturasPage() {
  const [sesion, setSesion] = useState(null);
  const [loading, setLoading] = useState(false);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [metricas, setMetricas] = useState({ cobrado: 0, pendiente: 0 });
  const [historial, setHistorial] = useState([]);
  const [formData, setFormData] = useState({ 
    cliente: '', 
    monto_total: '', 
    folio_fiscal: '',
    ruta: '',
    fecha_viaje: ''
  });

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) window.location.href = "/";
      else {
        setSesion(session);
        obtenerDatos(session.user.id);
      }
    });
  }, []);

  async function obtenerDatos(userId) {
    const { data: facturasBD } = await supabase
      .from('facturas')
      .select('*')
      .eq('usuario_id', userId)
      .order('created_at', { ascending: false });

    const cobrado = facturasBD?.filter(f => f.estatus_pago === 'Pagado')
      .reduce((acc, curr) => acc + (Number(curr.monto_total) || 0), 0) || 0;
    
    const pendiente = facturasBD?.filter(f => f.estatus_pago === 'Pendiente')
      .reduce((acc, curr) => acc + (Number(curr.monto_total) || 0), 0) || 0;

    setMetricas({ cobrado, pendiente });
    setHistorial(facturasBD || []);
  }

  const registrarFactura = async (e) => {
    e.preventDefault();
    if (!formData.cliente || !formData.monto_total) return;
    setLoading(true);

    const { error } = await supabase.from('facturas').insert([
      { 
        cliente: formData.cliente, 
        monto_total: parseFloat(formData.monto_total), 
        folio_fiscal: formData.folio_fiscal,
        ruta: formData.ruta,
        fecha_viaje: formData.fecha_viaje || null,
        estatus_pago: 'Pendiente',
        usuario_id: sesion.user.id 
      }
    ]);

    if (!error) {
      setFormData({ cliente: '', monto_total: '', folio_fiscal: '', ruta: '', fecha_viaje: '' });
      setMostrarFormulario(false);
      obtenerDatos(sesion.user.id);
    }
    setLoading(false);
  };

  const alternarEstatus = async (id, estatusActual) => {
    const nuevoEstatus = estatusActual === 'Pendiente' ? 'Pagado' : 'Pendiente';
    const { error } = await supabase.from('facturas').update({ estatus_pago: nuevoEstatus }).eq('id', id);
    if (!error) obtenerDatos(sesion.user.id);
  };

  const eliminarFactura = async (id) => {
    if (!confirm("¿Deseas eliminar este registro de la Institución?")) return;
    await supabase.from('facturas').delete().eq('id', id);
    obtenerDatos(sesion.user.id);
  };

  if (!sesion) return <div className="min-h-screen bg-slate-950"></div>;

  return (
    <div className="flex bg-slate-950 min-h-screen text-slate-200">
      <Sidebar />
      <main className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-350 mx-auto">
          
          <header className="flex justify-between items-start mb-10">
            <div>
              <h1 className="text-3xl font-black text-white italic uppercase tracking-tighter">
                Control de <span className="text-green-600">Ingresos</span>
              </h1>
              <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.3em] mt-1">
                Institución - Facturación y Cobranza
              </p>
            </div>
            
            <button 
              onClick={() => setMostrarFormulario(!mostrarFormulario)}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl font-black uppercase text-[9px] tracking-wider transition-all shadow-md ${
                mostrarFormulario ? 'bg-slate-800 text-white' : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-900/20'
              }`}
            >
              {mostrarFormulario ? <><X size={12} /> Cancelar</> : <><PlusCircle size={12} /> Registrar Factura</>}
            </button>
          </header>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
            <TarjetaDato titulo="Total Cobrado" valor={`$${metricas.cobrado.toLocaleString()}`} color="green" />
            <TarjetaDato titulo="Por Cobrar" valor={`$${metricas.pendiente.toLocaleString()}`} color="blue" />
          </div>

          {/* FORMULARIO DESPLEGABLE TÉCNICO */}
          {mostrarFormulario && (
            <div className="mb-12 bg-slate-900 border border-slate-800 p-8 rounded-[2.5rem] shadow-2xl relative animate-in fade-in slide-in-from-top-4 duration-300">
              <div className="absolute top-0 left-0 w-full h-1 bg-linear-to-r from-transparent via-blue-500/50 to-transparent"></div>
              <form onSubmit={registrarFactura} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="md:col-span-2">
                    <label className="text-[9px] font-black text-slate-600 uppercase ml-1 mb-2 block tracking-widest">Cliente</label>
                    <input 
                      value={formData.cliente}
                      onChange={(e) => setFormData({...formData, cliente: e.target.value})}
                      className="w-full bg-slate-950 border border-slate-800 p-3.5 rounded-xl text-white outline-none focus:border-blue-500 transition-all text-xs" 
                      placeholder="Nombre del cliente"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-black text-slate-600 uppercase ml-1 mb-2 block tracking-widest">ID / Folio</label>
                    <input 
                      value={formData.folio_fiscal}
                      onChange={(e) => setFormData({...formData, folio_fiscal: e.target.value})}
                      className="w-full bg-slate-950 border border-slate-800 p-3.5 rounded-xl text-white outline-none focus:border-blue-500 transition-all text-xs uppercase" 
                      placeholder="Folio"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-black text-slate-600 uppercase ml-1 mb-2 block tracking-widest">Monto ($)</label>
                    <input 
                      type="number"
                      value={formData.monto_total}
                      onChange={(e) => setFormData({...formData, monto_total: e.target.value})}
                      className="w-full bg-slate-950 border border-slate-800 p-3.5 rounded-xl text-white outline-none focus:border-blue-500 font-mono text-xs" 
                      placeholder="0.00"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-[9px] font-black text-slate-600 uppercase ml-1 mb-2 block tracking-widest">Ruta de Servicio</label>
                    <input 
                      value={formData.ruta}
                      onChange={(e) => setFormData({...formData, ruta: e.target.value})}
                      className="w-full bg-slate-950 border border-slate-800 p-3.5 rounded-xl text-white outline-none focus:border-blue-500 transition-all text-xs" 
                      placeholder="Ej. Origen - Destino"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-black text-slate-600 uppercase ml-1 mb-2 block tracking-widest">Fecha Viaje</label>
                    <input 
                      type="date"
                      value={formData.fecha_viaje}
                      onChange={(e) => setFormData({...formData, fecha_viaje: e.target.value})}
                      className="w-full bg-slate-950 border border-slate-800 p-3.5 rounded-xl text-white outline-none focus:border-blue-500 transition-all text-[11px] uppercase" 
                    />
                  </div>
                  <div className="flex items-end">
                    <button 
                      disabled={loading}
                      className="w-full bg-blue-600 hover:bg-blue-500 text-white p-3.5 rounded-xl font-black uppercase text-[10px] tracking-[0.2em] transition-all shadow-lg flex items-center justify-center gap-2"
                    >
                      {loading ? "..." : <><PlusCircle size={14} /> Guardar</>}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          )}

          {/* TABLA DE COBRANZA TÉCNICA */}
          <div className="bg-slate-900 border border-slate-800 p-8 rounded-[2.5rem] shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em]">Registro de Cobranza</h2>
                <p className="text-[9px] text-slate-600 uppercase font-bold mt-1">Monitoreo de vencimientos y flujos</p>
              </div>
              <History size={16} className="text-slate-600" />
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-separate border-spacing-y-3">
                <thead>
                  <tr className="text-[9px] font-black text-slate-600 uppercase tracking-widest px-4">
                    <th className="pb-2 pl-4">Status</th>
                    <th className="pb-2">Cliente / ID</th>
                    <th className="pb-2">Ruta</th>
                    <th className="pb-2">Viaje / Registro</th>
                    <th className="pb-2">Vencimiento</th>
                    <th className="pb-2">Monto</th>
                    <th className="pb-2 text-right pr-4">Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {historial.map((item) => {
                    const fechaIngreso = new Date(item.created_at);
                    const diasParaVencimiento = 30 - Math.floor((new Date() - fechaIngreso) / (1000 * 60 * 60 * 24));
                    const esVencida = diasParaVencimiento <= 0 && item.estatus_pago !== 'Pagado';

                    return (
                      <tr key={item.id} className="bg-slate-950 border border-slate-800 group hover:border-blue-500/30 transition-all">
                        <td className="py-4 pl-4 rounded-l-2xl border-y border-l border-slate-800">
                          <button 
                            onClick={() => alternarEstatus(item.id, item.estatus_pago)}
                            className={`p-2 rounded-lg transition-all ${item.estatus_pago === 'Pagado' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-500 hover:text-white'}`}
                          >
                            {item.estatus_pago === 'Pagado' ? <CheckCircle size={16} /> : <Clock size={16} />}
                          </button>
                        </td>
                        <td className="py-4 border-y border-slate-800">
                          <h4 className="text-[11px] font-bold text-white uppercase leading-none">{item.cliente}</h4>
                          <p className="text-[9px] text-slate-500 mt-1 uppercase">{item.folio_fiscal || 'S/F'}</p>
                        </td>
                        <td className="py-4 border-y border-slate-800 text-[10px] font-medium text-slate-400 uppercase">
                          {item.ruta || '---'}
                        </td>
                        <td className="py-4 border-y border-slate-800">
                          <p className="text-[10px] text-slate-300 font-bold">{item.fecha_viaje ? new Date(item.fecha_viaje).toLocaleDateString() : '---'}</p>
                          <p className="text-[8px] text-slate-600 uppercase">{new Date(item.created_at).toLocaleDateString()}</p>
                        </td>
                        <td className="py-4 border-y border-slate-800">
                          {item.estatus_pago === 'Pagado' ? (
                            <span className="text-[9px] font-black text-green-500 uppercase">Liquidada</span>
                          ) : (
                            <div className="flex flex-col">
                              <span className={`text-[10px] font-black ${esVencida ? 'text-red-500' : 'text-blue-500'}`}>
                                {esVencida ? 'VENCIDA' : `${diasParaVencimiento} Días`}
                              </span>
                              {esVencida && <span className="text-[8px] text-red-700 font-bold uppercase">Urgente</span>}
                            </div>
                          )}
                        </td>
                        <td className="py-4 border-y border-slate-800">
                          <span className="text-[11px] font-mono font-black text-white">
                            ${Number(item.monto_total).toLocaleString()}
                          </span>
                        </td>
                        <td className="py-4 pr-4 rounded-r-2xl border-y border-r border-slate-800 text-right">
                          <button onClick={() => eliminarFactura(item.id)} className="text-slate-800 hover:text-red-500 transition-colors p-2">
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {historial.length === 0 && (
                <p className="text-slate-600 text-[10px] italic text-center py-10 uppercase tracking-widest">No hay registros en la base de datos.</p>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}