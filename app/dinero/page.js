'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Calendar, TrendingUp, ArrowUpRight, ArrowDownRight, Target, Clock } from 'lucide-react';
import Sidebar from '@/components/sidebar';
import TarjetaDato from '@/components/tarjetaDato';
import { useRouter } from 'next/navigation';


export default function InteligenciaFinancieraPage() {
  const [sesion, setSesion] = useState(null);
  const [periodo, setPeriodo] = useState('mensual'); 
  const [metricas, setMetricas] = useState({ ingresos: 0, egresos: 0, balance: 0, progresoMeta: 0 });
  const [loading, setLoading] = useState(true);
  const router = useRouter();


  const META_MENSUAL = 60000;

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) window.location.href = "/";
      else {
        setSesion(session);
        calcularFinanzas(session.user.id, periodo);
      }
    });
  }, [periodo]);

  const calcularFinanzas = async (userId, rango) => {
    setLoading(true);
    let fechaInicio = new Date();
    
    if (rango === 'semanal') fechaInicio.setDate(fechaInicio.getDate() - 7);
    else if (rango === 'mensual') fechaInicio.setMonth(fechaInicio.getMonth() - 1);
    else if (rango === 'trimestral') fechaInicio.setMonth(fechaInicio.getMonth() - 3);
    else if (rango === 'anual') fechaInicio.setFullYear(fechaInicio.getFullYear() - 1);

    const isoFecha = fechaInicio.toISOString();

    const { data: facturas } = await supabase
      .from('facturas')
      .select('monto_total')
      .eq('usuario_id', userId)
      .eq('estatus_pago', 'Pagado')
      .gte('created_at', isoFecha);

    const { data: gastos } = await supabase
      .from('gastos')
      .select('monto')
      .eq('usuario_id', userId)
      .gte('created_at', isoFecha);

    const totalIngresos = facturas?.reduce((acc, curr) => acc + (Number(curr.monto_total) || 0), 0) || 0;
    const totalEgresos = gastos?.reduce((acc, curr) => acc + (Number(curr.monto) || 0), 0) || 0;
    const balance = totalIngresos - totalEgresos;
    
    const metaAjustada = rango === 'semanal' ? META_MENSUAL / 4 : rango === 'anual' ? META_MENSUAL * 12 : META_MENSUAL;
    const progreso = (balance / metaAjustada) * 100;

    setMetricas({ ingresos: totalIngresos, egresos: totalEgresos, balance, progresoMeta: progreso });
    setLoading(false);
  };

  if (!sesion) return <div className="min-h-screen bg-slate-950"></div>;

  return (
    <div className="flex bg-slate-950 min-h-screen text-slate-200">
      <Sidebar />
      <main className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-350 mx-auto">
          
          <header className="flex justify-between items-center mb-10">
            <div>
              <h1 className="text-3xl font-black text-white italic uppercase tracking-tighter leading-none">
                Detalle <span className="text-green-600">Financiero</span>
              </h1>
              <p className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.3em] mt-2">Análisis de Rentabilidad</p>
            </div>

            <div className="flex bg-slate-900 p-1.5 rounded-2xl border border-slate-800 shadow-xl">
              {['semanal', 'mensual', 'trimestral', 'anual'].map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriodo(p)}
                  className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${periodo === p ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40' : 'text-slate-500 hover:text-white'}`}
                >
                  {p}
                </button>
              ))}
            </div>
          </header>

          {/* GRID DE TARJETAS ESTANDARIZADAS */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            <div onClick={() => router.push('facturas')} className="cursor-pointer active:scale-95 transition-transform">
            <TarjetaDato 
              titulo={`Ingresos (${periodo})`} 
              valor={`$${metricas.ingresos.toLocaleString()}`} 
              color="blue" 
            /></div>
            <div onClick={() => router.push('mantenimiento')} className="cursor-pointer active:scale-95 transition-transform">
            <TarjetaDato 
              titulo="Egresos Operativos" 
              valor={`$${metricas.egresos.toLocaleString()}`} 
              color="blue" 
            /></div>
            
            {/* Tarjeta de Utilidad con el mismo estilo que Ganancia Neta del Panel Principal */}
            <div className="bg-green-600/10 border border-green-500/20 p-6 rounded-4xl shadow-xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                <TrendingUp size={40} className="text-green-500" />
              </div>
              <p className="text-[9px] font-black text-green-500 uppercase tracking-widest mb-1">Utilidad Periodo</p>
              <h3 className="text-3xl font-black text-white italic tracking-tighter">${metricas.balance.toLocaleString()}</h3>
              <div className="mt-4 h-1 w-full bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]" style={{ width: '100%' }}></div>
              </div>
            </div>
          </div>

          {/* MONITOR DE META CON DISEÑO INSTITUCIONAL */}
          <div className="bg-slate-900 border border-slate-800 p-10 rounded-[2.5rem] relative shadow-2xl overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-linear-to-r from-transparent via-blue-600 to-transparent opacity-50"></div>
            
            <div className="flex justify-between items-end mb-10">
              <div>
                <h2 className="text-2xl font-black text-white uppercase italic tracking-tighter flex items-center gap-3 leading-none">
                  <Target className="text-blue-600" size={28} /> Consolidación 2026
                </h2>
                <p className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.3em] mt-3">Progreso hacia los $60,000 MXN mensuales</p>
              </div>
              <div className="text-right">
                <span className="text-4xl font-black text-blue-500 italic leading-none">{Math.max(0, Math.round(metricas.progresoMeta))}%</span>
                <p className="text-[9px] text-slate-600 font-black uppercase tracking-widest mt-1">Eficiencia</p>
              </div>
            </div>

            <div className="h-6 w-full bg-slate-950 rounded-2xl border border-slate-800 p-1.5 shadow-inner">
              <div 
                className="h-full bg-blue-600 rounded-xl transition-all duration-1000 shadow-[0_0_15px_rgba(37,99,235,0.3)]"
                style={{ width: `${Math.min(100, Math.max(0, metricas.progresoMeta))}%` }}
              ></div>
            </div>
            
            <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-4">
               <div className="p-6 bg-slate-950/50 rounded-2xl border border-slate-800/50">
                  <p className="text-[9px] text-slate-600 font-black uppercase tracking-widest mb-2">Diagnóstico de Flujo</p>
                  <p className="text-sm font-bold text-white uppercase italic">
                    {metricas.balance >= 0 ? "Institución en Superávit Operativo" : "Revisión de costos necesaria"}
                  </p>
               </div>
               <div className="p-6 bg-slate-950/50 rounded-2xl border border-slate-800/50 flex justify-between items-center">
                  <div>
                    <p className="text-[9px] text-slate-600 font-black uppercase tracking-widest mb-2">Meta Ajustada ({periodo})</p>
                    <p className="text-sm font-bold text-white uppercase italic">
                      ${(periodo === 'semanal' ? META_MENSUAL / 4 : periodo === 'anual' ? META_MENSUAL * 12 : META_MENSUAL).toLocaleString()}
                    </p>
                  </div>
                  <Clock size={20} className="text-slate-700" />
               </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}