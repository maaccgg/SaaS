'use client';
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { 
  PlusCircle, Trash2, CheckCircle, Clock, X, 
  Save, Calendar, ChevronDown, DollarSign, Truck, FileText, Download, ShieldCheck
} from 'lucide-react';
import Sidebar from '@/components/sidebar';
import TarjetaDato from '@/components/tarjetaDato';

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

function FacturasContenido() {
  const searchParams = useSearchParams();
  const viajeIdHighlight = searchParams.get('viaje_id');

  const [sesion, setSesion] = useState(null);
  const [loading, setLoading] = useState(false);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [mostrarFiltro, setMostrarFiltro] = useState(false);
  
  const [metricas, setMetricas] = useState({ cobrado: 0, pendiente: 0 });
  const [historial, setHistorial] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [perfilEmisor, setPerfilEmisor] = useState(null);

  const hoy = new Date();
  const primerDiaMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1).toISOString().split('T')[0];
  const ultimoDiaMes = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0).toISOString().split('T')[0];
  
  const [fechaInicio, setFechaInicio] = useState(primerDiaMes);
  const [fechaFin, setFechaFin] = useState(ultimoDiaMes);

  const [formData, setFormData] = useState({ 
    cliente_id: '', monto_total: '', folio_fiscal: '', 
    ruta: 'Flete / Servicio de Transporte', fecha_viaje: new Date().toISOString().split('T')[0],
    fecha_vencimiento: '' 
  });

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) window.location.href = "/";
      else {
        setSesion(session);
        obtenerDatos(session.user.id);
        obtenerClientes(session.user.id);
        obtenerPerfilEmisor(session.user.id);
      }
    });
  }, [fechaInicio, fechaFin, viajeIdHighlight]);

  useEffect(() => {
    if (formData.cliente_id && formData.fecha_viaje) {
      const cliente = clientes.find(c => c.id === formData.cliente_id);
      if (cliente) {
        const fechaBase = new Date(formData.fecha_viaje + 'T00:00:00');
        fechaBase.setDate(fechaBase.getDate() + (cliente.dias_credito || 0));
        setFormData(prev => ({ ...prev, fecha_vencimiento: fechaBase.toISOString().split('T')[0] }));
      }
    }
  }, [formData.cliente_id, formData.fecha_viaje, clientes]);

  async function obtenerPerfilEmisor(userId) {
    const { data } = await supabase.from('perfil_emisor').select('*').eq('usuario_id', userId).single();
    if (data) setPerfilEmisor(data);
  }

  async function obtenerClientes(userId) {
    const { data } = await supabase.from('clientes').select('*').eq('usuario_id', userId).order('nombre');
    setClientes(data || []);
  }

  async function obtenerDatos(userId) {
    setLoading(true);
    let query = supabase
      .from('facturas')
      .select('*') 
      .eq('usuario_id', userId)
      .order('created_at', { ascending: false });

    if (viajeIdHighlight) {
       query = query.eq('viaje_id', viajeIdHighlight);
    } else {
       query = query.gte('fecha_viaje', fechaInicio).lte('fecha_viaje', fechaFin);
    }

    const { data: facturasBD, error } = await query;

    if (error) console.error("Error cargando facturas:", error.message);

    const cobrado = facturasBD?.filter(f => f.estatus_pago === 'Pagado')
      .reduce((acc, curr) => acc + (Number(curr.monto_total) || 0), 0) || 0;
    const pendiente = facturasBD?.filter(f => f.estatus_pago === 'Pendiente')
      .reduce((acc, curr) => acc + (Number(curr.monto_total) || 0), 0) || 0;

    setMetricas({ cobrado, pendiente });
    setHistorial(facturasBD || []);
    setLoading(false);
  }

  // =====================================================================
  // SECCIÓN NUEVA: LÓGICA DE TIMBRADO SAT (PAC)
  // =====================================================================

  const prepararJsonParaPAC = (factura) => {
    const total = Number(factura.monto_total);
    const subtotal = Number((total / 1.16).toFixed(2));
    const iva = Number((subtotal * 0.16).toFixed(2));
    const retencionIva = Number((subtotal * 0.04).toFixed(2)); 

    const clienteData = clientes.find(c => c.nombre === factura.cliente) || {};

    const jsonFactura = {
      "Version": "4.0",
      "Serie": "F",
      "Folio": factura.id.toString().slice(0,5),
      "Fecha": new Date().toISOString(),
      "FormaPago": "03", 
      "MetodoPago": "PPD", 
      "TipoDeComprobante": "I",
      "Exportacion": "01",
      "Moneda": "MXN",
      "SubTotal": subtotal,
      "Total": (subtotal + iva - retencionIva).toFixed(2),
      "Emisor": {
        "Rfc": perfilEmisor?.rfc || "XEXX010101000",
        "Nombre": perfilEmisor?.razon_social || "EMISOR GENERICO",
        "RegimenFiscal": perfilEmisor?.regimen_fiscal || "601"
      },
      "Receptor": {
        "Rfc": clienteData.rfc || "XAXX010101000",
        "Nombre": clienteData.nombre || "PUBLICO EN GENERAL",
        "UsoCFDI": "G03",
        "RegimenFiscalReceptor": clienteData.regimen_fiscal || "616",
        "DomicilioFiscalReceptor": clienteData.codigo_postal || "00000"
      },
      "Conceptos": [{
        "ClaveProdServ": "78101802", 
        "Cantidad": 1,
        "ClaveUnidad": "E48",
        "Unidad": "Servicio",
        "Descripcion": factura.ruta || "Servicio de flete nacional",
        "ValorUnitario": subtotal,
        "Importe": subtotal,
        "ObjetoImp": "02",
        "Impuestos": {
          "Traslados": [{
            "Base": subtotal,
            "Impuesto": "002",
            "TipoFactor": "Tasa",
            "TasaOCuota": 0.160000,
            "Importe": iva
          }],
          "Retenciones": [{
            "Base": subtotal,
            "Impuesto": "002",
            "TipoFactor": "Tasa",
            "TasaOCuota": 0.040000,
            "Importe": retencionIva
          }]
        }
      }]
    };

    return jsonFactura;
  };

  const timbrarFactura = async (factura) => {
    // 1. Preparamos los datos
    const datosJSON = prepararJsonParaPAC(factura);
    
    // Mostramos en consola para que veas la estructura que el SAT exige
    console.log("📦 PAQUETE JSON LISTO PARA ENVIAR AL PAC:");
    console.log(JSON.stringify(datosJSON, null, 2));

    if (!confirm("Se simulará el envío de esta factura al PAC. Revisa la consola para ver el JSON estructurado. ¿Deseas continuar?")) return;

    setLoading(true);
    try {
      // AQUÍ IRÁ EL FETCH REAL A SW SAPIEN EN EL FUTURO.
      // Por ahora, simulamos un tiempo de espera y un éxito.
      await new Promise(resolve => setTimeout(resolve, 1500)); 

      // Simulamos la respuesta del PAC (Un UUID falso)
      const simulatedUUID = `SIM-${Math.random().toString(36).substring(2, 10).toUpperCase()}-XXXX-YYYY`;

      // Actualizamos la base de datos con el nuevo UUID
      const { error } = await supabase.from('facturas').update({ 
        folio_fiscal: simulatedUUID 
      }).eq('id', factura.id);

      if (error) throw error;

      alert(`✅ ¡Timbrado Simulado con Éxito!\n\nFolio Fiscal (UUID): ${simulatedUUID}`);
      obtenerDatos(sesion.user.id);

    } catch (err) {
      console.error(err);
      alert("Error en el timbrado: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // =====================================================================

  const generarFacturaPDF = (factura) => {
    const doc = new jsPDF('p', 'mm', 'a4');
    const clienteData = clientes.find(c => c.nombre === factura.cliente) || {};

    const total = Number(factura.monto_total);
    const subtotal = total / 1.16;
    const iva = total - subtotal;
    
    const esVencida = new Date(factura.fecha_vencimiento + 'T23:59:59') < new Date() && factura.estatus_pago !== 'Pagado';
    let etiquetaEstatus = factura.estatus_pago === 'Pagado' ? 'PAGADO' : (esVencida ? 'ATRASADO' : 'PENDIENTE');
    let colorEstatus = factura.estatus_pago === 'Pagado' ? [34, 197, 94] : (esVencida ? [239, 68, 68] : [249, 115, 22]);

    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.text("Factura", 14, 25);

    doc.setFillColor(colorEstatus[0], colorEstatus[1], colorEstatus[2]);
    doc.rect(160, 15, 35, 10, 'F');
    doc.setFontSize(10);
    doc.setTextColor(255, 255, 255);
    doc.text(etiquetaEstatus, 177.5, 21.5, { align: 'center' });

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text(`${perfilEmisor?.razon_social || 'EMPRESA DE TRANSPORTE SA DE CV'}`, 14, 35);
    
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(`RFC: ${perfilEmisor?.rfc || 'XAXX010101000'}`, 14, 40);
    doc.text(`Régimen Fiscal: ${perfilEmisor?.regimen_fiscal || '601'}`, 14, 45);
    doc.text(`C.P. de Expedición: ${perfilEmisor?.codigo_postal || '00000'}`, 14, 50);

    autoTable(doc, {
      startY: 32,
      margin: { left: 120 },
      body: [
        ['Fecha:', factura.fecha_viaje || new Date().toLocaleDateString()],
        ['Nº de Factura:', factura.folio_fiscal || `INT-${factura.id.toString().slice(0,6).toUpperCase()}`],
        ['Vencimiento:', factura.fecha_vencimiento || '---'],
      ],
      theme: 'plain',
      styles: { fontSize: 9, cellPadding: 1 },
      columnStyles: { 0: { fontStyle: 'bold', halign: 'right' }, 1: { halign: 'right' } }
    });

    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("Facturar a:", 14, 65);
    
    doc.setFontSize(11);
    doc.text(factura.cliente, 14, 72);
    
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(`RFC: ${clienteData.rfc || '---'}`, 14, 77);
    doc.text(`Régimen: ${clienteData.regimen_fiscal || '---'}`, 14, 82);
    doc.text(`C.P.: ${clienteData.codigo_postal || '---'}`, 14, 87);

    autoTable(doc, {
      startY: 100,
      head: [['Cant.', 'Descripción / Concepto', 'Precio unitario', 'Importe']],
      body: [
        ['1', factura.ruta || 'Servicio de Autotransporte', `$${subtotal.toFixed(2)}`, `$${subtotal.toFixed(2)}`]
      ],
      theme: 'grid',
      headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold' },
      styles: { fontSize: 9, cellPadding: 4 },
      columnStyles: { 
        0: { halign: 'center', cellWidth: 20 },
        2: { halign: 'right', cellWidth: 40 },
        3: { halign: 'right', cellWidth: 40 }
      }
    });

    const finalY = doc.lastAutoTable.finalY + 10;
    
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text("Observaciones:", 14, finalY);
    doc.setFont("helvetica", "normal");
    doc.text(factura.viaje_id ? `Folio Interno de Viaje: #${factura.viaje_id.toString().slice(0,8)}` : "Servicio Extraordinario", 14, finalY + 5);
    doc.text("Gracias por su preferencia.", 14, finalY + 12);

    autoTable(doc, {
      startY: finalY,
      margin: { left: 120 },
      body: [
        ['Subtotal', `$${subtotal.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`],
        ['IVA (16%)', `$${iva.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`],
        ['Total', `$${total.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`],
        ['Saldo Pendiente', factura.estatus_pago === 'Pagado' ? '$0.00' : `$${total.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`]
      ],
      theme: 'plain',
      styles: { fontSize: 10, cellPadding: 2 },
      columnStyles: { 0: { fontStyle: 'bold', halign: 'right' }, 1: { halign: 'right' } },
      didParseCell: function(data) {
        if (data.row.index === 2) { 
          data.cell.styles.fontStyle = 'bold';
        }
      }
    });

    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text("Este documento es una representación comercial impresa de un Comprobante Fiscal.", 105, 280, { align: 'center' });

    doc.save(`Factura_${factura.cliente}_${factura.fecha_viaje}.pdf`);
  };

  const registrarFactura = async (e) => {
    e.preventDefault();
    if (!formData.cliente_id || !formData.monto_total) return;
    setLoading(true);

    const clienteSeleccionado = clientes.find(c => c.id === formData.cliente_id);

    const { error } = await supabase.from('facturas').insert([
      { 
        cliente: clienteSeleccionado.nombre,
        monto_total: parseFloat(formData.monto_total), 
        folio_fiscal: formData.folio_fiscal,
        ruta: formData.ruta,
        fecha_viaje: formData.fecha_viaje,
        fecha_vencimiento: formData.fecha_vencimiento,
        estatus_pago: 'Pendiente',
        usuario_id: sesion.user.id 
      }
    ]);

    if (error) {
      alert("Fallo al guardar: " + error.message);
    } else {
      setFormData({ cliente_id: '', monto_total: '', folio_fiscal: '', ruta: 'Flete / Servicio de Transporte', fecha_viaje: new Date().toISOString().split('T')[0], fecha_vencimiento: '' });
      setMostrarFormulario(false);
      obtenerDatos(sesion.user.id);
    }
    setLoading(false);
  };

  const alternarEstatus = async (id, estatusActual) => {
    const nuevoEstatus = estatusActual === 'Pendiente' ? 'Pagado' : 'Pendiente';
    await supabase.from('facturas').update({ estatus_pago: nuevoEstatus }).eq('id', id);
    obtenerDatos(sesion.user.id);
  };

  const eliminarFactura = async (id, tieneViajeAsociado) => {
    if (tieneViajeAsociado) {
       alert("No puedes borrar esta factura desde aquí porque está asociada a un Viaje. Debes borrar el Viaje desde la Bitácora de Operaciones.");
       return;
    }
    if (!confirm("¿Eliminar registro manual?")) return;
    await supabase.from('facturas').delete().eq('id', id);
    obtenerDatos(sesion.user.id);
  };

  if (!sesion) return <div className="min-h-screen bg-slate-950"></div>;

  return (
    <div className="flex bg-slate-950 min-h-screen text-slate-200 w-full">
      <Sidebar />
      <main className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-7xl mx-auto">
          
          <header className="flex justify-between items-center mb-10">
            <div>
              <h1 className="text-3xl font-black text-white italic uppercase tracking-tighter">
                Control de <span className="text-green-600">Ingresos</span>
              </h1>
              {viajeIdHighlight ? (
                 <p className="text-blue-500 text-[10px] font-black uppercase mt-1 tracking-widest flex items-center gap-1">
                   <Truck size={12}/> Mostrando factura del viaje seleccionado
                 </p>
              ) : (
                 <p className="text-slate-500 text-[10px] font-black uppercase mt-1 tracking-widest">Facturación y Cobranza</p>
              )}
            </div>

            <div className="flex items-center gap-3">
              <div className="relative">
                <button 
                  onClick={() => setMostrarFiltro(!mostrarFiltro)}
                  className={`flex items-center gap-3 bg-slate-900 border ${viajeIdHighlight ? 'border-orange-500/50 text-orange-400' : 'border-slate-800 text-slate-400'} px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest hover:text-white transition-all`}
                >
                  <Calendar size={14} className={viajeIdHighlight ? 'text-orange-500' : 'text-blue-400'} />
                  {viajeIdHighlight ? 'Limpiar Filtro URL' : 'Periodo'}
                  <ChevronDown size={14} />
                </button>

                {mostrarFiltro && (
                  <div className="absolute right-0 mt-3 w-72 bg-slate-900 border border-slate-800 p-6 rounded-3xl shadow-2xl z-50 animate-in fade-in zoom-in-95">
                    <div className="space-y-4">
                      {viajeIdHighlight && (
                        <div className="p-3 bg-orange-500/10 border border-orange-500/20 rounded-xl mb-4">
                           <p className="text-[9px] text-orange-400 font-bold uppercase text-center">Estás viendo una factura específica. Aplica el filtro para ver todo el mes.</p>
                        </div>
                      )}
                      <div>
                        <label className="text-[9px] font-black text-slate-500 uppercase block mb-2">Desde (Fecha Viaje)</label>
                        <input type="date" className="w-full bg-slate-950 border border-slate-800 p-3 rounded-xl text-xs text-white" 
                          value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} />
                      </div>
                      <div>
                        <label className="text-[9px] font-black text-slate-500 uppercase block mb-2">Hasta (Fecha Viaje)</label>
                        <input type="date" className="w-full bg-slate-950 border border-slate-800 p-3 rounded-xl text-xs text-white" 
                          value={fechaFin} onChange={(e) => setFechaFin(e.target.value)} />
                      </div>
                      <button onClick={() => {
                        setMostrarFiltro(false);
                        if(viajeIdHighlight) window.location.href = '/facturas'; 
                      }} className="w-full bg-blue-600 text-white py-2 rounded-xl text-[9px] font-black uppercase">
                        Aplicar Filtro Mensual
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <button onClick={() => setMostrarFormulario(true)} className="bg-green-600 hover:bg-green-500 text-white px-6 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all shadow-lg flex items-center gap-2">
                <PlusCircle size={14} /> Ingreso Manual
              </button>
            </div>
          </header>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
            <TarjetaDato titulo="Cobrado en Vista" valor={`$${metricas.cobrado.toLocaleString('es-MX', {minimumFractionDigits: 2})}`} color="green" />
            <TarjetaDato titulo="Por Cobrar en Vista" valor={`$${metricas.pendiente.toLocaleString('es-MX', {minimumFractionDigits: 2})}`} color="blue" />
          </div>

          {mostrarFormulario && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md" onClick={() => setMostrarFormulario(false)} />
              <div className="relative bg-slate-900 border border-slate-800 w-full max-w-2xl rounded-[3rem] p-10 shadow-2xl animate-in zoom-in-95 duration-200">
                <button onClick={() => setMostrarFormulario(false)} className="absolute top-8 right-8 text-slate-500 hover:text-white"><X size={24} /></button>
                <h2 className="text-2xl font-black text-white italic uppercase mb-8">Registrar <span className="text-green-500">Ingreso Manual</span></h2>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-6 -mt-6">Usa esto para fletes extra o servicios sin Carta Porte.</p>
                
                <form onSubmit={registrarFactura} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="md:col-span-2">
                      <div className="flex justify-between items-center mb-2">
                        <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Cliente Receptor</label>
                      </div>
                      <select required className="w-full bg-slate-950 border border-slate-800 p-4 rounded-2xl text-sm text-white outline-none focus:border-green-500"
                        value={formData.cliente_id} onChange={(e) => setFormData({...formData, cliente_id: e.target.value})}>
                        <option value="">-- Seleccionar de Catálogo SAT --</option>
                        {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre} ({c.dias_credito} días crédito)</option>)}
                      </select>
                      {clientes.length === 0 && <p className="text-[9px] text-red-500 font-bold mt-2 ml-2">⚠️ No tienes clientes registrados. Ve a "Config SAT" para darlos de alta.</p>}
                    </div>
                    <div>
                      <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2 block ml-1">Monto Total con IVA ($)</label>
                      <input required type="number" step="0.01" className="w-full bg-slate-950 border border-slate-800 p-4 rounded-2xl text-sm text-white font-mono" 
                        value={formData.monto_total} onChange={e => setFormData({...formData, monto_total: e.target.value})} placeholder="0.00" />
                    </div>
                    <div>
                      <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2 block ml-1">Folio Fiscal / Concepto</label>
                      <input className="w-full bg-slate-950 border border-slate-800 p-4 rounded-2xl text-sm text-white outline-none font-mono uppercase" 
                        value={formData.folio_fiscal} onChange={e => setFormData({...formData, folio_fiscal: e.target.value})} placeholder="Ej. Flete MTY" />
                    </div>
                    <div>
                      <label className="text-[9px] font-black text-blue-500 uppercase tracking-widest mb-2 block ml-1">Fecha de Servicio</label>
                      <input type="date" required className="w-full bg-slate-950 border border-slate-800 p-4 rounded-2xl text-sm text-white" 
                        value={formData.fecha_viaje} onChange={e => setFormData({...formData, fecha_viaje: e.target.value})} />
                    </div>
                    <div>
                      <label className="text-[9px] font-black text-orange-500 uppercase tracking-widest mb-2 block ml-1">Vencimiento Cobro</label>
                      <input type="date" readOnly className="w-full bg-slate-900 border border-slate-800 p-4 rounded-2xl text-sm text-slate-400 outline-none" 
                        value={formData.fecha_vencimiento} />
                    </div>
                  </div>
                  <button type="submit" disabled={loading || clientes.length === 0} className="w-full bg-green-600 hover:bg-green-500 disabled:bg-slate-800 disabled:text-slate-600 text-white p-5 rounded-2xl font-black uppercase text-[11px] tracking-widest shadow-xl transition-all">
                    {loading ? "Sincronizando..." : "Confirmar Factura Libre"}
                  </button>
                </form>
              </div>
            </div>
          )}

          <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] shadow-2xl overflow-hidden p-8">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-separate border-spacing-y-3">
                <thead>
                  <tr className="text-[9px] font-black text-slate-600 uppercase tracking-widest px-4">
                    <th className="pl-4">Cobro</th>
                    <th>Receptor</th>
                    <th>Concepto / Ruta</th>
                    <th>Vencimiento</th>
                    <th>Monto Total</th>
                    <th className="text-right pr-4">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {historial.map((item) => {
                    const esVencida = new Date(item.fecha_vencimiento + 'T23:59:59') < new Date() && item.estatus_pago !== 'Pagado';
                    const vieneDeViaje = item.viaje_id !== null;
                    const sinTimbrar = !item.folio_fiscal || item.folio_fiscal === '';

                    return (
                      <tr key={item.id} className="bg-slate-950 border border-slate-800 group hover:border-blue-500/30 transition-all">
                        <td className="py-4 pl-4 rounded-l-2xl border-y border-l border-slate-800">
                          <button onClick={() => alternarEstatus(item.id, item.estatus_pago)}
                            title="Marcar como Pagado/Pendiente"
                            className={`p-2 rounded-lg transition-all ${item.estatus_pago === 'Pagado' ? 'bg-green-600 text-white shadow-lg shadow-green-900/40' : 'bg-slate-800 text-slate-500 hover:bg-slate-700'}`}>
                            {item.estatus_pago === 'Pagado' ? <CheckCircle size={16} /> : <Clock size={16} />}
                          </button>
                        </td>
                        <td className="py-4 border-y border-slate-800">
                          <h4 className="text-[11px] font-bold text-white uppercase leading-none">{item.cliente}</h4>
                          <p className="text-[9px] text-slate-500 mt-1 uppercase font-mono flex items-center gap-1">
                            <FileText size={10} className={sinTimbrar ? "text-orange-500" : "text-blue-500"}/>
                            {sinTimbrar ? 'BORRADOR' : item.folio_fiscal}
                          </p>
                        </td>
                        <td className="py-4 border-y border-slate-800">
                          <p className={`text-[10px] font-bold uppercase flex items-center gap-2 ${vieneDeViaje ? 'text-blue-400' : 'text-slate-400'}`}>
                            {vieneDeViaje ? <Truck size={12}/> : <DollarSign size={12}/>}
                            {item.ruta || '---'}
                          </p>
                        </td>
                        <td className="py-4 border-y border-slate-800">
                          {item.estatus_pago === 'Pagado' ? <span className="text-[9px] font-black text-green-500 uppercase tracking-widest bg-green-500/10 px-2 py-1 rounded-md">Liquidada</span> :
                          <span className={`text-[10px] font-black bg-slate-900 px-2 py-1 rounded-md ${esVencida ? 'text-red-500 border border-red-500/30' : 'text-orange-500 border border-orange-500/30'}`}>
                            {item.fecha_vencimiento ? new Date(item.fecha_vencimiento).toLocaleDateString() : 'S/V'} {esVencida ? '(VENCIDA)' : ''}
                          </span>}
                        </td>
                        <td className="py-4 border-y border-slate-800">
                          <span className={`text-[11px] font-mono font-black ${item.estatus_pago === 'Pagado' ? 'text-green-400' : 'text-white'}`}>
                            ${Number(item.monto_total).toLocaleString('es-MX', {minimumFractionDigits: 2})}
                          </span>
                        </td>
                        <td className="py-4 pr-4 rounded-r-2xl border-y border-r border-slate-800 text-right flex justify-end gap-2">
                          
                          {/* NUEVO BOTÓN: EMITIR SAT (Solo si no está timbrado) */}
                          {sinTimbrar && (
                            <button onClick={() => timbrarFactura(item)} 
                              title="Timbrar Factura ante el SAT"
                              className="p-2 bg-blue-600/10 text-blue-500 hover:bg-blue-600 hover:text-white rounded-lg transition-colors border border-blue-500/20 shadow-[0_0_10px_rgba(59,130,246,0.2)]">
                              <ShieldCheck size={14}/>
                            </button>
                          )}

                          <button onClick={() => generarFacturaPDF(item)} 
                            title="Descargar Factura Comercial en PDF"
                            className="p-2 bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white rounded-lg transition-colors">
                            <Download size={14}/>
                          </button>

                          <button onClick={() => eliminarFactura(item.id, vieneDeViaje)} 
                            title={vieneDeViaje ? "Las facturas de viaje se borran desde la Bitácora" : "Eliminar ingreso manual"}
                            className={`p-2 transition-colors rounded-lg ${vieneDeViaje ? 'text-slate-700 cursor-not-allowed' : 'text-slate-600 hover:text-red-500 hover:bg-red-500/10'}`}>
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {historial.length === 0 && (
                <div className="text-center py-20 bg-slate-950/50 rounded-2xl border border-slate-800 mt-4">
                   <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">No hay facturas o ingresos en esta vista.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function FacturasPageWrapper() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950 flex items-center justify-center"><p className="text-blue-500">Cargando Módulo Financiero...</p></div>}>
      <FacturasContenido />
    </Suspense>
  );
}