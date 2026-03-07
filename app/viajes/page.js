'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation'; // <-- Importamos el router para navegar
import { supabase } from '@/lib/supabaseClient';
import { 
  Truck, User, MapPin, Package, PlusCircle, 
  Trash2, FileText, X, Navigation, Calendar, 
  Download, DollarSign, Receipt 
} from 'lucide-react';
import Sidebar from '@/components/sidebar';

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function ViajesPage() {
  const router = useRouter(); // <-- Inicializamos el router
  const [sesion, setSesion] = useState(null);
  const [loading, setLoading] = useState(false);
  const [viajes, setViajes] = useState([]);
  const [mostrarModal, setMostrarModal] = useState(false);
  
  const [catalogos, setCatalogos] = useState({ 
    unidades: [], operadores: [], ubicaciones: [], mercancias: [], remolques: [] 
  });
  const [clientes, setClientes] = useState([]);
  const [perfilEmisor, setPerfilEmisor] = useState(null);

  const [formData, setFormData] = useState({
    unidad_id: '', operador_id: '', origen_id: '', destino_id: '', 
    mercancia_id: '', remolque_id: '', cantidad_mercancia: 1, 
    fecha_salida: new Date().toISOString().split('T')[0],
    cliente_id: '', monto_flete: ''
  });

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setSesion(session);
        cargarCatalogos(session.user.id);
        obtenerViajes(session.user.id);
        obtenerPerfilFiscal(session.user.id);
      }
    });
  }, []);

  async function obtenerPerfilFiscal(userId) {
    const { data } = await supabase.from('perfil_emisor').select('*').eq('usuario_id', userId).single();
    if (data) setPerfilEmisor(data);
  }

  async function cargarCatalogos(userId) {
    const [u, o, ub, m, cl, r] = await Promise.all([
      supabase.from('unidades').select('*').eq('usuario_id', userId),
      supabase.from('operadores').select('*').eq('usuario_id', userId),
      supabase.from('ubicaciones').select('*').eq('usuario_id', userId),
      supabase.from('mercancias').select('*').eq('usuario_id', userId),
      supabase.from('clientes').select('*').eq('usuario_id', userId),
      supabase.from('remolques').select('*').eq('usuario_id', userId)
    ]);
    
    setCatalogos({ 
      unidades: u.data || [], operadores: o.data || [], 
      ubicaciones: ub.data || [], mercancias: m.data || [],
      remolques: r.data || []
    });
    setClientes(cl.data || []);
  }

  async function obtenerViajes(userId) {
    const { data } = await supabase.from('viajes').select(`
        *,
        unidades(*),
        operadores(*),
        remolques(*),
        clientes(*),
        origen:ubicaciones!viajes_origen_id_fkey(*),
        destino:ubicaciones!viajes_destino_id_fkey(*),
        mercancias(*)
      `).eq('usuario_id', userId).order('created_at', { ascending: false });
    setViajes(data || []);
  }

  // --- GENERADOR DE PDF ---
  const generarPDF = (viaje) => {
    const doc = new jsPDF('p', 'mm', 'a4');
    
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("CARTA PORTE NACIONAL DE INGRESO 3.1", 105, 15, { align: 'center' });
    
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text(`Fecha de elaboración: ${new Date().toISOString().split('T')[0]}`, 14, 22);

    doc.setDrawColor(200);
    doc.rect(14, 25, 182, 30);
    doc.line(105, 25, 105, 55);
    
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.text("EMISOR:", 16, 30);
    doc.text("RECEPTOR:", 107, 30);
    
    doc.setFont("helvetica", "normal");
    doc.text(`${perfilEmisor?.razon_social || 'EMPRESA DE LOGÍSTICA SA DE CV'}`, 16, 35);
    doc.text(`RFC: ${perfilEmisor?.rfc || 'XAXX010101000'} | Régimen: ${perfilEmisor?.regimen_fiscal || '601'}`, 16, 40);
    doc.text(`CP: ${perfilEmisor?.codigo_postal || '00000'}`, 16, 45);

    // RECEPTOR DINÁMICO
    doc.text(`${viaje.clientes?.nombre || 'PÚBLICO EN GENERAL'}`, 107, 35);
    doc.text(`RFC: ${viaje.clientes?.rfc || 'XAXX010101000'}`, 107, 40);
    doc.text(`CP: ${viaje.clientes?.codigo_postal || '00000'} | Régimen: ${viaje.clientes?.regimen_fiscal || '601'}`, 107, 45);
    doc.text(`Folio Interno: #${String(viaje.folio_interno).padStart(4, '0')}`, 107, 50);

    doc.setFont("helvetica", "bold");
    doc.text("ORIGEN", 14, 62);
    doc.text("DESTINO", 105, 62);
    
    doc.setFont("helvetica", "normal");
    doc.text(`${viaje.origen?.nombre_lugar}`, 14, 67);
    doc.text(`C.P.: ${viaje.origen?.codigo_postal}`, 14, 71);
    
    doc.text(`${viaje.destino?.nombre_lugar}`, 105, 67);
    doc.text(`C.P.: ${viaje.destino?.codigo_postal}`, 105, 71);

    autoTable(doc, {
      startY: 78,
      head: [['SCT', 'CONFIG/PLACAS', 'AÑO', 'ASEGURADORA', 'NUM. POLIZA']],
      body: [[
        viaje.unidades?.permiso_sict || 'TPAF01', 
        `${viaje.unidades?.configuracion_vehicular || 'T3S1'} / ${viaje.unidades?.placas || '---'}`, 
        viaje.unidades?.anio_modelo || '---', 
        viaje.unidades?.aseguradora_rc || 'SIN REGISTRO', 
        viaje.unidades?.poliza_rc || 'PENDIENTE'
      ]],
      theme: 'grid',
      styles: { fontSize: 7, cellPadding: 2 },
      headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0] }
    });

    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 2,
      head: [['TIPO FIGURA', 'DETALLE']],
      body: [
        ['REMOLQUE', `Placas: ${viaje.remolques?.placas || 'N/A'} | Económico: ${viaje.remolques?.numero_economico || 'N/A'} | Tipo: ${viaje.remolques?.subtipo_remolque || 'N/A'}`],
        ['OPERADOR', `Nombre: ${viaje.operadores?.nombre_completo} | Licencia: ${viaje.operadores?.numero_licencia} | RFC: ${viaje.operadores?.rfc}`]
      ],
      theme: 'grid',
      styles: { fontSize: 7, cellPadding: 2 },
      headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0] }
    });

    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 8,
      head: [['CANTIDAD', 'DESCRIPCION / CLAVE SAT', 'PESO EN KGS', 'MATERIAL PELIG.']],
      body: [[
        viaje.cantidad_mercancia,
        `${viaje.mercancias?.descripcion}\nSAT: ${viaje.mercancias?.clave_sat}`,
        `${viaje.peso_total_kg} KGM`,
        'NO'
      ]],
      theme: 'grid',
      styles: { fontSize: 7, cellPadding: 3 },
      headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255] }
    });

    const finalY = doc.lastAutoTable.finalY + 10;
    doc.setDrawColor(150);
    doc.rect(14, finalY, 30, 30);
    doc.rect(14, finalY + 35, 30, 30);
    doc.setFontSize(6);
    doc.setTextColor(150);
    doc.text("QR SAT", 23, finalY + 15);
    doc.text("QR VIAJE", 22, finalY + 50);

    doc.setTextColor(0);
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.text("SELLO CFDI:", 50, finalY + 5);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(5);
    doc.text("(Se generará automáticamente al integrar con el PAC)", 50, finalY + 8);
    
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.text("SELLO SAT:", 50, finalY + 15);
    
    doc.text("CADENA ORIGINAL DEL COMPLEMENTO DE CERTIFICACION DIGITAL DEL SAT:", 50, finalY + 25);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6);
    doc.text("||1.1|PENDIENTE-DE-TIMBRADO|2026-02-27T17:20:56|PAC_ID|SELLO_AQUI||", 50, finalY + 28);

    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.text("ESTE DOCUMENTO ES UNA REPRESENTACIÓN IMPRESA DE UN CFDI", 105, 285, { align: 'center' });

    doc.save(`CartaPorte_Folio_${viaje.folio_interno}.pdf`);
  };

  const registrarViaje = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const m = catalogos.mercancias.find(x => x.id === formData.mercancia_id);
      const clienteObj = clientes.find(c => c.id === formData.cliente_id);
      const pesoCalc = m ? m.peso_unitario_kg * formData.cantidad_mercancia : 0;

      // 1. LÓGICA DE FOLIO DINÁMICO: Buscamos el folio actual más alto en la BD
      const { data: maxFolioData } = await supabase
        .from('viajes')
        .select('folio_interno')
        .eq('usuario_id', sesion.user.id)
        .order('folio_interno', { ascending: false })
        .limit(1);
      
      let nuevoFolio = 1;
      if (maxFolioData && maxFolioData.length > 0 && maxFolioData[0].folio_interno) {
        nuevoFolio = maxFolioData[0].folio_interno + 1;
      }

      // 2. Insertamos el viaje forzando el nuevo folio consecutivo
      const { data: nuevoViaje, error: errViaje } = await supabase.from('viajes').insert([{
        folio_interno: nuevoFolio,
        unidad_id: formData.unidad_id,
        operador_id: formData.operador_id,
        remolque_id: formData.remolque_id || null,
        origen_id: formData.origen_id,
        destino_id: formData.destino_id,
        mercancia_id: formData.mercancia_id,
        cliente_id: formData.cliente_id || null, // Guardar el cliente en el viaje
        cantidad_mercancia: parseFloat(formData.cantidad_mercancia),
        peso_total_kg: pesoCalc,
        fecha_salida: formData.fecha_salida,
        usuario_id: sesion.user.id,
        estatus: 'Borrador'
      }]).select().single();

      if (errViaje) throw errViaje;

      // 3. Creación de factura automática
      if (formData.monto_flete > 0 && formData.cliente_id) {
        const fechaVenc = new Date(formData.fecha_salida);
        fechaVenc.setDate(fechaVenc.getDate() + (clienteObj?.dias_credito || 0));

        await supabase.from('facturas').insert([{
          usuario_id: sesion.user.id,
          viaje_id: nuevoViaje.id,
          cliente: clienteObj.nombre,
          monto_total: parseFloat(formData.monto_flete),
          fecha_viaje: formData.fecha_salida,
          fecha_vencimiento: fechaVenc.toISOString().split('T')[0],
          estatus_pago: 'Pendiente',
          ruta: `Folio Viaje #${nuevoFolio}` 
        }]);
      }

      setMostrarModal(false);
      setFormData({ unidad_id: '', operador_id: '', origen_id: '', destino_id: '', mercancia_id: '', remolque_id: '', cantidad_mercancia: 1, fecha_salida: new Date().toISOString().split('T')[0], cliente_id: '', monto_flete: '' });
      await obtenerViajes(sesion.user.id);
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const eliminarViaje = async (id) => {
    if (!confirm("¿Deseas eliminar este viaje? También se eliminará su factura asociada si existe.")) return;
    
    // Primero intentamos borrar la factura asociada para evitar errores de llave foránea
    await supabase.from('facturas').delete().eq('viaje_id', id);
    // Luego borramos el viaje
    await supabase.from('viajes').delete().eq('id', id);
    
    obtenerViajes(sesion.user.id);
  };

  if (!sesion) return null;

  return (
    <div className="flex bg-slate-950 min-h-screen text-slate-200">
      <Sidebar />
      <main className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-6xl mx-auto">
          
          <header className="mb-10 flex justify-between items-end">
            <div>
              <h1 className="text-3xl font-black tracking-tighter uppercase italic text-white leading-none">
                Logística <span className="text-blue-500">Operativa</span>
              </h1>
              <p className="text-slate-500 text-[9px] font-black uppercase tracking-[0.3em] mt-2">Bitácora de Carta Porte Nacional</p>
            </div>
            <button onClick={() => setMostrarModal(true)} className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all shadow-lg flex items-center gap-2">
              <PlusCircle size={16} /> Programar Viaje
            </button>
          </header>

          <div className="grid grid-cols-1 gap-4">
            {viajes.map((v) => (
                <div key={v.id} className="bg-slate-900/40 border border-slate-800 p-6 rounded-[2rem] hover:border-blue-500/30 transition-all group backdrop-blur-sm">
                  <div className="flex items-center gap-8">
                    <div className="min-w-[100px]">
                      <p className="text-[8px] font-black text-slate-600 uppercase mb-1">Folio</p>
                      <h4 className="text-xl font-black text-white font-mono leading-none">#{String(v.folio_interno).padStart(4, '0')}</h4>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <span className="text-[11px] font-black text-white uppercase italic">{v.origen?.nombre_lugar}</span>
                        <Navigation size={12} className="text-blue-500 rotate-90" />
                        <span className="text-[11px] font-black text-white uppercase italic">{v.destino?.nombre_lugar}</span>
                      </div>
                      <p className="text-[9px] text-slate-500 font-bold uppercase">{v.unidades?.numero_economico} | {v.operadores?.nombre_completo} {v.remolques ? `| Remolque: ${v.remolques.numero_economico}` : ''}</p>
                      {/* Mostrar el cliente asociado si existe */}
                      {v.clientes && <p className="text-[9px] text-blue-400 font-bold uppercase mt-1">Cliente: {v.clientes.nombre}</p>}
                    </div>
                    
                    {/* BOTONES DE ACCIÓN RÁPIDA */}
                    <div className="flex gap-2 ml-auto opacity-0 group-hover:opacity-100 transition-all">
                      {/* NUEVO BOTÓN: Ir a Factura */}
                      <button 
                        onClick={() => router.push(`/facturas?viaje_id=${v.id}`)} 
                        title="Ver Factura de este Viaje"
                        className="p-3 bg-green-600/10 text-green-500 hover:bg-green-600 hover:text-white rounded-xl transition-colors">
                        <Receipt size={18}/>
                      </button>
                      
                      <button 
                        onClick={() => generarPDF(v)} 
                        title="Descargar Carta Porte PDF"
                        className="p-3 bg-blue-600/10 text-blue-500 hover:bg-blue-600 hover:text-white rounded-xl transition-colors">
                        <FileText size={18}/>
                      </button>
                      
                      <button 
                        onClick={() => eliminarViaje(v.id)} 
                        title="Eliminar Viaje"
                        className="p-3 bg-slate-950 text-slate-600 hover:text-red-500 rounded-xl transition-colors">
                        <Trash2 size={18}/>
                      </button>
                    </div>

                  </div>
                </div>
              ))}
          </div>

          {mostrarModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md" onClick={() => setMostrarModal(false)} />
              <div className="relative bg-slate-900 border border-slate-800 w-full max-w-3xl rounded-[2.5rem] p-10 shadow-2xl animate-in zoom-in-95 overflow-y-auto max-h-[90vh]">
                <button onClick={() => setMostrarModal(false)} className="absolute top-8 right-8 text-slate-500 hover:text-white transition-colors"><X size={24} /></button>
                <h2 className="text-2xl font-black text-white italic uppercase mb-8 text-center lg:text-left tracking-tighter">Programar <span className="text-blue-500">Operación</span></h2>
                
                <form onSubmit={registrarViaje} className="space-y-6">
                  {/* Autotransporte y Figura */}
                  <div className="grid grid-cols-3 gap-4">
                    <select required className="bg-slate-950 border border-slate-800 p-4 rounded-xl text-sm text-white"
                      value={formData.unidad_id} onChange={e => setFormData({...formData, unidad_id: e.target.value})}>
                      <option value="">Tractocamión...</option>
                      {catalogos.unidades.map(u => <option key={u.id} value={u.id}>{u.numero_economico}</option>)}
                    </select>
                    <select className="bg-slate-950 border border-slate-800 p-4 rounded-xl text-sm text-white"
                      value={formData.remolque_id} onChange={e => setFormData({...formData, remolque_id: e.target.value})}>
                      <option value="">Remolque (Opcional)...</option>
                      {catalogos.remolques.map(r => <option key={r.id} value={r.id}>{r.numero_economico} - {r.placas}</option>)}
                    </select>
                    <select required className="bg-slate-950 border border-slate-800 p-4 rounded-xl text-sm text-white"
                      value={formData.operador_id} onChange={e => setFormData({...formData, operador_id: e.target.value})}>
                      <option value="">Operador...</option>
                      {catalogos.operadores.map(o => <option key={o.id} value={o.id}>{o.nombre_completo}</option>)}
                    </select>
                  </div>

                  {/* Origen Destino */}
                  <div className="grid grid-cols-2 gap-4">
                    <select required className="bg-slate-950 border border-slate-800 p-4 rounded-xl text-sm text-white"
                      value={formData.origen_id} onChange={e => setFormData({...formData, origen_id: e.target.value})}>
                      <option value="">Punto A (Origen)...</option>
                      {catalogos.ubicaciones.map(ub => <option key={ub.id} value={ub.id}>{ub.nombre_lugar}</option>)}
                    </select>
                    <select required className="bg-slate-950 border border-slate-800 p-4 rounded-xl text-sm text-white"
                      value={formData.destino_id} onChange={e => setFormData({...formData, destino_id: e.target.value})}>
                      <option value="">Punto B (Destino)...</option>
                      {catalogos.ubicaciones.map(ub => <option key={ub.id} value={ub.id}>{ub.nombre_lugar}</option>)}
                    </select>
                  </div>

                  {/* Carga */}
                  <div className="grid grid-cols-3 gap-4">
                    <select required className="col-span-2 bg-slate-950 border border-slate-800 p-4 rounded-xl text-sm text-white"
                      value={formData.mercancia_id} onChange={e => setFormData({...formData, mercancia_id: e.target.value})}>
                      <option value="">Bienes / Mercancía...</option>
                      {catalogos.mercancias.map(m => <option key={m.id} value={m.id}>{m.descripcion}</option>)}
                    </select>
                    <input required type="number" placeholder="Cant." className="bg-slate-950 border border-slate-800 p-4 rounded-xl text-sm text-white"
                      value={formData.cantidad_mercancia} onChange={e => setFormData({...formData, cantidad_mercancia: e.target.value})} />
                  </div>

                  {/* Facturación Automática */}
                  <div className="p-6 bg-blue-600/5 border border-blue-500/10 rounded-2xl space-y-4">
                    <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest flex items-center gap-2">
                      <DollarSign size={12} /> Cliente y Facturación (Receptor)
                    </p>
                    <div className="grid grid-cols-2 gap-4">
                      <select required className="bg-slate-950 border border-slate-800 p-4 rounded-xl text-sm text-white font-bold"
                        value={formData.cliente_id} onChange={e => setFormData({...formData, cliente_id: e.target.value})}>
                        <option value="">Seleccionar Cliente...</option>
                        {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                      </select>
                      <input type="number" placeholder="Monto flete $" className="bg-slate-950 border border-slate-800 p-4 rounded-xl text-sm text-white font-mono"
                        value={formData.monto_flete} onChange={e => setFormData({...formData, monto_flete: e.target.value})} />
                    </div>
                  </div>

                  <input type="date" className="w-full bg-slate-950 border border-slate-800 p-4 rounded-xl text-sm text-white"
                    value={formData.fecha_salida} onChange={e => setFormData({...formData, fecha_salida: e.target.value})} />

                  <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white py-5 rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] shadow-xl hover:bg-blue-500 transition-all">
                    {loading ? "Sincronizando..." : "Consolidar Viaje Nacional"}
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