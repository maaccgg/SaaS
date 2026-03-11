'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { 
  Truck, User, MapPin, Package, PlusCircle, Trash2, FileText, Navigation, Receipt, ShieldCheck, DollarSign, Loader2, Edit2, XCircle, X,
} from 'lucide-react';
import Sidebar from '@/components/sidebar';
import { generarPDFCartaPorte } from '@/utils/PdfCartaPorte'; 

export default function ViajesPage() {
  const router = useRouter();
  const [sesion, setSesion] = useState(null);
  const [loading, setLoading] = useState(false);
  const [viajes, setViajes] = useState([]);
  const [mostrarModal, setMostrarModal] = useState(false);
  const [editandoId, setEditandoId] = useState(null); 
  
  const [catalogos, setCatalogos] = useState({ unidades: [], operadores: [], ubicaciones: [], mercancias: [], remolques: [] });
  const [clientes, setClientes] = useState([]);
  const [perfilEmisor, setPerfilEmisor] = useState(null);

  const formInicial = {
    unidad_id: '', operador_id: '', origen_id: '', destino_id: '', 
    cliente_id: '', monto_flete: '', distancia_km: '', fecha_salida: new Date().toISOString().split('T')[0],
    mercancias_detalle: [{ mercancia_id: '', cantidad: 1, peso_kg: '' }] 
  };

  const [formData, setFormData] = useState(formInicial);

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
    setCatalogos({ unidades: u.data || [], operadores: o.data || [], ubicaciones: ub.data || [], mercancias: m.data || [], remolques: r.data || [] });
    setClientes(cl.data || []);
  }

  async function obtenerViajes(userId) {
    const { data } = await supabase.from('viajes').select(`
        *, unidades(*), operadores(*), remolques(*), clientes(*),
        origen:ubicaciones!viajes_origen_id_fkey(*), destino:ubicaciones!viajes_destino_id_fkey(*)
      `).eq('usuario_id', userId).order('created_at', { ascending: false });
    setViajes(data || []);
  }

  const generarIdCCP = () => crypto.randomUUID().toUpperCase();

  const agregarFilaMercancia = () => { setFormData({ ...formData, mercancias_detalle: [...formData.mercancias_detalle, { mercancia_id: '', cantidad: 1, peso_kg: '' }] }); };
  const actualizarFilaMercancia = (index, campo, valor) => { const nuevasMercancias = [...formData.mercancias_detalle]; nuevasMercancias[index][campo] = valor; setFormData({ ...formData, mercancias_detalle: nuevasMercancias }); };
  const eliminarFilaMercancia = (index) => { const nuevasMercancias = formData.mercancias_detalle.filter((_, i) => i !== index); setFormData({ ...formData, mercancias_detalle: nuevasMercancias }); };
  const calcularPesoTotal = () => { return formData.mercancias_detalle.reduce((acc, curr) => acc + (Number(curr.peso_kg) || 0), 0); };

  const cerrarModal = () => {
    setMostrarModal(false);
    setEditandoId(null);
    setFormData(formInicial);
  };

  const editarViaje = (viaje) => {
    setEditandoId(viaje.id);
    let detalle = viaje.mercancias_detalle || [];
    if (detalle.length === 0 && viaje.mercancia_id) detalle = [{ mercancia_id: viaje.mercancia_id, cantidad: viaje.cantidad_mercancia || 1, peso_kg: viaje.peso_total_kg || '' }];
    if (detalle.length === 0) detalle = [{ mercancia_id: '', cantidad: 1, peso_kg: '' }];

    setFormData({
      unidad_id: viaje.unidad_id || '', operador_id: viaje.operador_id || '', origen_id: viaje.origen_id || '', destino_id: viaje.destino_id || '',
      cliente_id: viaje.cliente_id || '', monto_flete: viaje.monto_flete || '', distancia_km: viaje.distancia_km || '',
      fecha_salida: viaje.fecha_salida || new Date().toISOString().split('T')[0], mercancias_detalle: detalle
    });
    setMostrarModal(true);
  };

  const eliminarViaje = async (id) => {
    if (!confirm("¿Deseas eliminar este viaje permanentemente?")) return;
    setLoading(true);
    try {
      await supabase.from('facturas').delete().eq('viaje_id', id);
      await supabase.from('viajes').delete().eq('id', id);
      obtenerViajes(sesion.user.id);
    } catch (error) { alert("Error al eliminar: " + error.message); } 
    finally { setLoading(false); }
  };

  // ==========================================
  // NUEVO: CANCELACIÓN OFICIAL DE CARTA PORTE
  // ==========================================
  const cancelarViaje = async (viaje) => {
    if (!confirm("¿Estás seguro de CANCELAR esta Carta Porte? Se enviará la petición al SAT y la factura quedará invalidada.")) return;
    
    setLoading(true);
    try {
      // 1. Buscamos la factura asociada para obtener su ID de Facturapi
      const { data: factura } = await supabase.from('facturas').select('facturapi_id').eq('viaje_id', viaje.id).single();

      // 2. Si existe en Facturapi, la cancelamos vía API (Motivo 02: Errores sin relación)
      if (factura && factura.facturapi_id) {
        const facturapiKey = "sk_test_sBNjdoZ5A1UcJVmQ2KUisCQBpiD8MPFecYABBhRYci";
        const response = await fetch(`https://www.facturapi.io/v2/invoices/${factura.facturapi_id}?motive=02`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${facturapiKey}` }
        });
        
        if (!response.ok) {
          const err = await response.json();
          console.error("Error API:", err);
          // Si el sandbox ya la borró antes, no detenemos el proceso local
        }
      }

      // 3. Actualizamos nuestra Base de Datos a estatus Cancelado
      await supabase.from('viajes').update({ estatus: 'Cancelado' }).eq('id', viaje.id);
      await supabase.from('facturas').update({ estatus_pago: 'Cancelada' }).eq('viaje_id', viaje.id);

      alert("✅ Carta Porte CANCELADA exitosamente.");
      obtenerViajes(sesion.user.id);

    } catch (error) {
      alert("Error al cancelar: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const traducirErrorFacturapi = (err) => { 
    if (String(err).includes("ConfigVehicular")) return "🚨 ERROR EN UNIDAD: Revisa que la Configuración Vehicular sea una clave válida del SAT (Ej: T3S2, C2, VL) y no un texto descriptivo.";
    return `❌ Error del SAT: ${err}`; 
  };

  const timbrarCartaPorte = async (viaje) => {
    const facturapiKey = "sk_test_sBNjdoZ5A1UcJVmQ2KUisCQBpiD8MPFecYABBhRYci"; 
    const subtotal = Number((Number(viaje.monto_flete || 0) / 1.16).toFixed(2));

    const arregloMercanciasFacturapi = (viaje.mercancias_detalle || []).map((item) => {
      return {
        BienesTransp: item.clave_sat || "31181701", Descripcion: item.descripcion || "Mercancia general",        
        Cantidad: parseFloat(item.cantidad) || 1, ClaveUnidad: item.embalaje || "4G",           
        PesoEnKg: parseFloat(item.peso_kg) || 1, MaterialPeligroso: item.material_peligroso ? "Sí" : "No"
      };
    });

    const invoiceData = {
      type: "I",
      customer: {
        legal_name: viaje.clientes?.nombre || "PÚBLICO EN GENERAL",
        tax_id: (viaje.clientes?.rfc && viaje.clientes.rfc.trim() !== '') ? viaje.clientes.rfc.trim() : "XAXX010101000",
        tax_system: "616", address: { zip: viaje.clientes?.codigo_postal || "65000" }
      },
      items: [{ quantity: 1, product: { description: "Flete", product_key: "78101802", price: subtotal, taxes: [{ type: "IVA", rate: 0.16 }, { type: "IVA", rate: 0.04, withholding: true }] } }],
      payment_form: "99", payment_method: "PPD", use: "G03",
      complements: [{
        type: "carta_porte",
        data: {
          IdCCP: viaje.id_ccp, TranspInternac: "No", TotalDistRec: parseFloat(viaje.distancia_km || 150),
          Ubicaciones: [
            { TipoUbicacion: "Origen", RFCRemitenteDestinatario: viaje.origen?.rfc_ubicacion || perfilEmisor?.rfc, FechaHoraSalidaLlegada: `${viaje.fecha_salida}T08:00:00`, Domicilio: { Calle: viaje.origen?.nombre_lugar, Estado: viaje.origen?.estado || "NLE", Pais: "MEX", CodigoPostal: viaje.origen?.codigo_postal } },
            { TipoUbicacion: "Destino", RFCRemitenteDestinatario: viaje.destino?.rfc_ubicacion || viaje.clientes?.rfc || "XAXX010101000", DistanciaRecorrida: parseFloat(viaje.distancia_km || 150), FechaHoraSalidaLlegada: `${viaje.fecha_salida}T20:00:00`, Domicilio: { Calle: viaje.destino?.nombre_lugar, Estado: viaje.destino?.estado || "TAM", Pais: "MEX", CodigoPostal: viaje.destino?.codigo_postal } }
          ],
          Mercancias: {
            PesoBrutoTotal: calcularPesoTotal() || parseFloat(viaje.peso_total_kg || 1000), 
            UnidadPeso: "KGM", NumTotalMercancias: arregloMercanciasFacturapi.length || 1, Mercancia: arregloMercanciasFacturapi, 
            Autotransporte: {
              PermSCT: viaje.unidades?.permiso_sict || "TPAF01", NumPermisoSCT: viaje.unidades?.num_permiso_sict || "S/N",
              IdentificacionVehicular: { 
                ConfigVehicular: viaje.unidades?.configuracion_vehicular?.trim().toUpperCase() || "T3S2", 
                PlacaVM: viaje.unidades?.placas?.replace(/[- ]/g, '') || "AAA000", AnioModeloVM: viaje.unidades?.anio_modelo || "2020", PesoBrutoVehicular: parseFloat(viaje.unidades?.peso_bruto_maximo || 30.00) 
              },
              Seguros: { AseguraRespCivil: viaje.unidades?.aseguradora_rc || "QUALITAS", PolizaRespCivil: viaje.unidades?.poliza_rc || "12345" }
            }
          },
          FiguraTransporte: [{ TipoFigura: "01", RFCFigura: viaje.operadores?.rfc || "XAXX010101000", NumLicencia: viaje.operadores?.numero_licencia, NombreFigura: viaje.operadores?.nombre_completo }]
        }
      }]
    };

    setLoading(true);
    try {
      const response = await fetch('https://www.facturapi.io/v2/invoices', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${facturapiKey}` }, body: JSON.stringify(invoiceData) });
      const res = await response.json();
      if (response.ok) {
        await supabase.from('viajes').update({ estatus: 'Emitido (Timbrado)', folio_fiscal: res.uuid, id_ccp: res.complements?.[0]?.data?.IdCCP || "Generado", sello_emisor: res.stamp?.signature, sello_sat: res.stamp?.sat_signature, cadena_original: res.stamp?.complement_string }).eq('id', viaje.id);
        await supabase.from('facturas').update({ estatus_pago: 'Pendiente', facturapi_id: res.id, folio_fiscal: res.uuid }).eq('viaje_id', viaje.id);
        alert(`🎉 ¡CARTA PORTE TIMBRADA!\nUUID: ${res.uuid}`);
        obtenerViajes(sesion.user.id);
      } else alert(traducirErrorFacturapi(res.message || JSON.stringify(res)));
    } catch (err) { alert("Error de red"); } finally { setLoading(false); }
  };

  const registrarViaje = async (e) => {
    e.preventDefault();
    if (formData.mercancias_detalle.length === 0) return alert("Debes agregar al menos una mercancía al viaje.");
    
    setLoading(true);
    try {
      const clienteObj = clientes.find(c => c.id === formData.cliente_id);
      const mercanciasEnriquecidas = formData.mercancias_detalle.map(item => {
        const cat = catalogos.mercancias.find(m => m.id === item.mercancia_id);
        return { ...item, clave_sat: cat?.clave_sat, descripcion: cat?.descripcion, embalaje: cat?.clave_embalaje || '4G', material_peligroso: cat?.material_peligroso || false };
      });

      const payloadComun = {
        distancia_km: parseFloat(formData.distancia_km || 0), unidad_id: formData.unidad_id, operador_id: formData.operador_id, origen_id: formData.origen_id, destino_id: formData.destino_id,
        mercancia_id: formData.mercancias_detalle[0].mercancia_id, mercancias_detalle: mercanciasEnriquecidas, peso_total_kg: calcularPesoTotal(), 
        cliente_id: formData.cliente_id || null, monto_flete: parseFloat(formData.monto_flete || 0), fecha_salida: formData.fecha_salida, usuario_id: sesion.user.id
      };

      if (editandoId) {
        await supabase.from('viajes').update(payloadComun).eq('id', editandoId);
        if (formData.monto_flete > 0 && formData.cliente_id) {
          const fechaVenc = new Date(formData.fecha_salida); fechaVenc.setDate(fechaVenc.getDate() + (clienteObj?.dias_credito || 0));
          const { data: facExistente } = await supabase.from('facturas').select('id').eq('viaje_id', editandoId).single();
          if (facExistente) {
            await supabase.from('facturas').update({ cliente: clienteObj.nombre, monto_total: parseFloat(formData.monto_flete), fecha_viaje: formData.fecha_salida, fecha_vencimiento: fechaVenc.toISOString().split('T')[0] }).eq('id', facExistente.id);
          } else {
            await supabase.from('facturas').insert([{ usuario_id: sesion.user.id, viaje_id: editandoId, cliente: clienteObj.nombre, monto_total: parseFloat(formData.monto_flete), fecha_viaje: formData.fecha_salida, fecha_vencimiento: fechaVenc.toISOString().split('T')[0], estatus_pago: 'Pendiente', ruta: `Flete CCP` }]);
          }
        }
      } else {
        const nuevoIdCCP = generarIdCCP();
        const { data: maxFolioData } = await supabase.from('viajes').select('folio_interno').eq('usuario_id', sesion.user.id).order('folio_interno', { ascending: false }).limit(1);
        let nuevoFolio = (maxFolioData?.[0]?.folio_interno || 0) + 1;
        const { data: nuevoViaje } = await supabase.from('viajes').insert([{ ...payloadComun, folio_interno: nuevoFolio, id_ccp: nuevoIdCCP, estatus: 'Borrador' }]).select().single();

        if (formData.monto_flete > 0 && formData.cliente_id) {
          const fechaVenc = new Date(formData.fecha_salida); fechaVenc.setDate(fechaVenc.getDate() + (clienteObj?.dias_credito || 0));
          await supabase.from('facturas').insert([{ usuario_id: sesion.user.id, viaje_id: nuevoViaje.id, cliente: clienteObj.nombre, monto_total: parseFloat(formData.monto_flete), fecha_viaje: formData.fecha_salida, fecha_vencimiento: fechaVenc.toISOString().split('T')[0], estatus_pago: 'Pendiente', ruta: `Flete CCP (Multi-Carga)` }]);
        }
      }

      cerrarModal(); obtenerViajes(sesion.user.id);
    } catch (err) { alert("Error: " + err.message); } finally { setLoading(false); }
  };

  if (!sesion) return null;

  return (
    <div className="flex bg-slate-950 min-h-screen text-slate-200">
      <Sidebar />
      <main className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-6xl mx-auto">
          <header className="mb-10 flex justify-between items-end">
            <div>
              <h1 className="text-3xl font-black tracking-tighter uppercase italic text-white leading-none">Logística <span className="text-blue-500">Operativa</span></h1>
            </div>
            <button onClick={() => setMostrarModal(true)} className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-xl font-black uppercase text-[10px] flex items-center gap-2 shadow-lg">
              <PlusCircle size={16} /> Programar Viaje
            </button>
          </header>

          <div className="grid grid-cols-1 gap-4">
            {viajes.map((v) => (
                <div key={v.id} className={`bg-slate-900/40 border border-slate-800 p-6 rounded-[2rem] hover:border-blue-500/30 transition-all group ${v.estatus === 'Cancelado' ? 'opacity-60 grayscale' : ''}`}>
                  <div className="flex items-center gap-8">
                    <div className="min-w-[100px]">
                      <p className="text-[8px] font-black text-slate-600 uppercase mb-1">Folio</p>
                      <h4 className={`text-xl font-black font-mono leading-none ${v.estatus === 'Cancelado' ? 'text-red-500 line-through' : 'text-white'}`}>#{String(v.folio_interno).padStart(4, '0')}</h4>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <span className="text-[11px] font-black text-white uppercase italic">{v.origen?.nombre_lugar}</span>
                        <Navigation size={12} className="text-blue-500 rotate-90" />
                        <span className="text-[11px] font-black text-white uppercase italic">{v.destino?.nombre_lugar}</span>
                      </div>
                      <p className="text-[9px] text-slate-500 font-bold uppercase mt-1">
                        {v.mercancias_detalle ? `${v.mercancias_detalle.length} Productos` : '1 Producto'} | {v.peso_total_kg} KG TOTAL
                        {v.estatus === 'Cancelado' && <span className="ml-3 text-red-500 font-black">❌ CANCELADO</span>}
                      </p>
                    </div>
                    
                    <div className="flex gap-2 ml-auto opacity-0 group-hover:opacity-100 transition-all">
                      
                      {/* BOTONES SI ESTÁ EN BORRADOR */}
                      {v.estatus === 'Borrador' && (
                        <>
                          <button onClick={() => timbrarCartaPorte(v)} disabled={loading} title="Timbrar Carta Porte" className="p-3 bg-blue-600/10 text-blue-500 hover:bg-blue-600 hover:text-white border border-blue-500/20 rounded-xl">
                            {loading ? <Loader2 size={18} className="animate-spin"/> : <ShieldCheck size={18}/>}
                          </button>
                          <button onClick={() => editarViaje(v)} title="Editar Viaje" className="p-3 bg-orange-500/10 text-orange-400 hover:bg-orange-500 hover:text-white rounded-xl transition-colors"><Edit2 size={18}/></button>
                        </>
                      )}

                      {/* BOTONES SI ESTÁ TIMBRADO */}
                      {v.estatus === 'Emitido (Timbrado)' && (
                        <button onClick={() => cancelarViaje(v)} disabled={loading} title="Cancelar Carta Porte en el SAT" className="p-3 bg-red-600/10 text-red-500 hover:bg-red-600 hover:text-white border border-red-500/20 rounded-xl">
                           <XCircle size={18}/>
                        </button>
                      )}

                      {/* BOTONES COMUNES */}
                      <button onClick={() => router.push(`/facturas?viaje_id=${v.id}`)} title="Ver Factura" className="p-3 bg-green-600/10 text-green-500 hover:bg-green-600 hover:text-white rounded-xl"><Receipt size={18}/></button>
                      <button onClick={() => generarPDFCartaPorte(v, perfilEmisor)} title="Descargar PDF" className="p-3 bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white rounded-xl"><FileText size={18}/></button>

                      {/* ELIMINAR SOLO DISPONIBLE PARA BORRADORES O CANCELADOS */}
                      {(v.estatus === 'Borrador' || v.estatus === 'Cancelado') && (
                        <button onClick={() => eliminarViaje(v.id)} title="Eliminar Viaje" className="p-3 bg-slate-800 text-slate-400 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-colors">
                          <Trash2 size={18}/>
                        </button>
                      )}
                      
                    </div>
                  </div>
                </div>
            ))}
          </div>

          {mostrarModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md" />
              <div className="relative bg-slate-900 border border-slate-800 w-full max-w-4xl rounded-[2.5rem] p-10 shadow-2xl overflow-y-auto max-h-[90vh]">
                <button onClick={cerrarModal} className="absolute top-8 right-8 text-slate-500 hover:text-white"><X size={24} /></button>
                <h2 className="text-2xl font-black text-white italic uppercase mb-8">{editandoId ? 'Editar' : 'Programar'} <span className="text-blue-500">Operación</span></h2>
                
                <form onSubmit={registrarViaje} className="space-y-6">
                  {/* SECCIÓN 1: TRACTOR Y OPERADOR */}
                  <div className="grid grid-cols-2 gap-4">
                    <select required className="bg-slate-950 border border-slate-800 p-4 rounded-xl text-sm text-white" value={formData.unidad_id} onChange={e => setFormData({...formData, unidad_id: e.target.value})}>
                      <option value="">Tractocamión...</option>
                      {catalogos.unidades.map(u => <option key={u.id} value={u.id}>{u.numero_economico}</option>)}
                    </select>
                    <select required className="bg-slate-950 border border-slate-800 p-4 rounded-xl text-sm text-white" value={formData.operador_id} onChange={e => setFormData({...formData, operador_id: e.target.value})}>
                      <option value="">Operador...</option>
                      {catalogos.operadores.map(o => <option key={o.id} value={o.id}>{o.nombre_completo}</option>)}
                    </select>
                  </div>

                  {/* SECCIÓN 2: ORIGEN Y DESTINO */}
                  <div className="grid grid-cols-5 gap-4">
                    <select required className="col-span-2 w-full bg-slate-950 border border-slate-800 p-4 rounded-xl text-sm text-white" value={formData.origen_id} onChange={e => setFormData({...formData, origen_id: e.target.value})}>
                      <option value="">Origen...</option>
                      {catalogos.ubicaciones.map(ub => <option key={ub.id} value={ub.id}>{ub.nombre_lugar}</option>)}
                    </select>
                    <select required className="col-span-2 w-full bg-slate-950 border border-slate-800 p-4 rounded-xl text-sm text-white" value={formData.destino_id} onChange={e => setFormData({...formData, destino_id: e.target.value})}>
                      <option value="">Destino...</option>
                      {catalogos.ubicaciones.map(ub => <option key={ub.id} value={ub.id}>{ub.nombre_lugar}</option>)}
                    </select>
                    <input required type="number" placeholder="KM Total" className="bg-slate-950 border border-slate-800 p-4 rounded-xl text-sm text-white font-bold text-center" value={formData.distancia_km} onChange={e => setFormData({...formData, distancia_km: e.target.value})} />
                  </div>

                  {/* SECCIÓN 3: LISTA DINÁMICA DE MERCANCÍAS */}
                  <div className="p-6 border border-blue-500/20 bg-blue-900/10 rounded-2xl space-y-4">
                    <div className="flex justify-between items-center mb-2">
                      <p className="text-[10px] font-black text-blue-400 uppercase flex items-center gap-2"><Package size={14}/> Detalle de Carga</p>
                      <button type="button" onClick={agregarFilaMercancia} className="text-[9px] bg-blue-600 text-white px-3 py-1.5 rounded-lg uppercase font-bold hover:bg-blue-500 transition-colors">+ Agregar Producto</button>
                    </div>

                    {formData.mercancias_detalle.map((item, index) => (
                      <div key={index} className="grid grid-cols-12 gap-3 items-center bg-slate-950 p-3 rounded-xl border border-slate-800">
                        <select required className="col-span-6 bg-transparent text-sm text-white outline-none" 
                          value={item.mercancia_id} onChange={e => actualizarFilaMercancia(index, 'mercancia_id', e.target.value)}>
                          <option value="">Seleccionar Producto...</option>
                          {catalogos.mercancias.map(m => <option key={m.id} value={m.id}>{m.descripcion}</option>)}
                        </select>
                        <input required type="number" placeholder="Cant." className="col-span-2 bg-slate-900 border border-slate-700 p-2 rounded-lg text-xs text-white text-center focus:border-blue-500" 
                          value={item.cantidad} onChange={e => actualizarFilaMercancia(index, 'cantidad', e.target.value)} />
                        <input required type="number" step="0.01" placeholder="Peso (KG)" className="col-span-3 bg-slate-900 border border-slate-700 p-2 rounded-lg text-xs text-white text-center focus:border-blue-500" 
                          value={item.peso_kg} onChange={e => actualizarFilaMercancia(index, 'peso_kg', e.target.value)} />
                        <button type="button" onClick={() => eliminarFilaMercancia(index)} disabled={formData.mercancias_detalle.length === 1} className="col-span-1 text-slate-500 hover:text-red-500 flex justify-center disabled:opacity-30 transition-colors"><Trash2 size={16}/></button>
                      </div>
                    ))}
                    <div className="text-right mt-2"><p className="text-[10px] text-slate-400 uppercase font-bold">Peso Total: <span className="text-white text-xs">{calcularPesoTotal().toLocaleString('es-MX', {minimumFractionDigits: 2})} KG</span></p></div>
                  </div>

                  {/* SECCIÓN 4: FACTURACIÓN */}
                  <div className="grid grid-cols-2 gap-4">
                    <select required className="bg-slate-950 border border-slate-800 p-4 rounded-xl text-sm text-white" value={formData.cliente_id} onChange={e => setFormData({...formData, cliente_id: e.target.value})}>
                      <option value="">Cliente Factura...</option>
                      {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                    </select>
                    <input type="number" placeholder="Monto Flete ($)" className="bg-slate-950 border border-slate-800 p-4 rounded-xl text-sm text-white" value={formData.monto_flete} onChange={e => setFormData({...formData, monto_flete: e.target.value})} />
                  </div>

                  <button type="submit" disabled={loading} className={`w-full py-5 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all ${editandoId ? 'bg-orange-500 hover:bg-orange-400' : 'bg-blue-600 hover:bg-blue-500'} text-white`}>
                    {loading ? "Procesando..." : (editandoId ? "Guardar Cambios" : "Confirmar Viaje")}
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