"use client";
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import TarjetaDato from '@/components/tarjetaDato';
import Sidebar from '@/components/sidebar';
import { Bell, Calendar, DollarSign, TrendingUp, AlertTriangle } from 'lucide-react';

export default function Page() {
  const [metricas, setMetricas] = useState({ ingresos: 0, gastos: 0, ganancia: 0 });
  const [sesion, setSesion] = useState(null);
  const [email, setEmail] = useState(""); 
  const [password, setPassword] = useState(""); 

  useEffect(() => {
    // Sincronización de autoridad
    supabase.auth.getSession().then(({ data: { session } }) => setSesion(session));
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSesion(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function obtenerFinanzas() {
    const { data: facturas } = await supabase.from('facturas').select('monto_total');
    const totalIngresos = facturas?.reduce((acc, curr) => acc + (Number(curr.monto_total) || 0), 0) || 0;

    const { data: gastosBD } = await supabase.from('gastos').select('monto');
    const totalGastos = gastosBD?.reduce((acc, curr) => acc + (Number(curr.monto) || 0), 0) || 0;

    setMetricas({
      ingresos: totalIngresos,
      gastos: totalGastos,
      ganancia: totalIngresos - totalGastos
    });
  }

  useEffect(() => {
    if (sesion) obtenerFinanzas();
  }, [sesion]);

  async function iniciarSesion(e) {
    e.preventDefault();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) alert("Acceso denegado: Credenciales no válidas.");
  }

  if (!sesion) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-950 text-white p-6">
        <form onSubmit={iniciarSesion} className="bg-slate-900 p-10 rounded-[2.5rem] border border-slate-800 w-full max-w-md shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-blue-600 to-transparent"></div>
          <h2 className="text-3xl font-black mb-8 text-blue-500 italic uppercase tracking-tighter text-center">
            Inicia <span className="text-white">Sesión</span>
          </h2>
          <div className="space-y-4">
            <input 
              type="email" placeholder="Usuario" 
              className="w-full bg-slate-950 border border-slate-800 p-4 rounded-2xl outline-none focus:border-blue-500 transition-all text-white" 
              value={email} onChange={(e) => setEmail(e.target.value)} 
            />
            <input 
              type="password" placeholder="Contraseña" 
              className="w-full bg-slate-950 border border-slate-800 p-4 rounded-2xl outline-none focus:border-blue-500 transition-all text-white" 
              value={password} onChange={(e) => setPassword(e.target.value)} 
            />
            <button className="w-full bg-blue-600 hover:bg-blue-500 py-4 rounded-2xl font-black uppercase tracking-widest transition-all shadow-lg shadow-blue-900/20">
              Desbloquear
            </button>
          </div>
          <p className="text-center text-slate-600 text-[9px] mt-6 font-bold uppercase tracking-[0.4em]">Copyright 2026</p>
        </form>
      </div>
    );
  }

  return (
    <div className="flex bg-slate-950 min-h-screen text-white">
    <Sidebar/>
      <main className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-[1400px] mx-auto">
          <header className="mb-12">
            <h1 className="text-4xl font-black tracking-tighter uppercase italic leading-none">
              CENTRO DE <span className="text-blue-600">OPERACIONES</span>
            </h1>
            <p className="text-slate-500 mt-2 font-bold uppercase text-[10px] tracking-[0.3em]">Información General - Institución Cantu</p>
          </header>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* IZQUIERDA: FINANZAS */}
            <section className="space-y-8">
              <div className="flex items-center gap-3 mb-2">
                <TrendingUp className="text-green-500" size={20} />
                <h2 className="text-sm font-black text-slate-400 uppercase tracking-[0.2em]">Balance Financiero</h2>
              </div>
              <div className="grid grid-cols-1 gap-6">
                <TarjetaDato titulo="Ingresos Mensuales" valor={`$${metricas.ingresos.toLocaleString()}`} color="blue" />
                <TarjetaDato titulo="Gastos Totales" valor={`$${metricas.gastos.toLocaleString()}`} color="slate" />
                <div className="bg-green-600/10 border border-green-500/20 p-8 rounded-[2.5rem] shadow-xl">
                   <p className="text-xs font-black text-green-500 uppercase tracking-widest mb-1 text-[10px]">Ganancia Neta</p>
                   <h3 className="text-5xl font-black text-white italic tracking-tighter">${metricas.ganancia.toLocaleString()}</h3>
                </div>
              </div>
            </section>

            {/* DERECHA: AVISOS */}
            <section className="space-y-8">
              <div className="flex items-center gap-3 mb-2">
                <Bell className="text-blue-500" size={20} />
                <h2 className="text-sm font-black text-slate-400 uppercase tracking-[0.2em]">Avisos de Ocasión</h2>
              </div>
              <div className="space-y-4">
                {/* Alertas con hover effects para la demo */}
                <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl flex items-center gap-6 hover:border-orange-500/50 transition-all cursor-pointer group">
                  <div className="bg-orange-500/10 p-4 rounded-2xl text-orange-500 group-hover:scale-110 transition-transform"><DollarSign size={28} /></div>
                  <div>
                    <h4 className="text-white font-black uppercase text-sm italic">Cobranza Pendiente</h4>
                    <p className="text-slate-500 text-xs mt-1">3 facturas superan los 15 días de crédito.</p>
                  </div>
                </div>
                <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl flex items-center gap-6 hover:border-blue-500/50 transition-all cursor-pointer group">
                  <div className="bg-blue-500/10 p-4 rounded-2xl text-blue-500 group-hover:scale-110 transition-transform"><Calendar size={28} /></div>
                  <div>
                    <h4 className="text-white font-black uppercase text-sm italic">Próximo Mantenimiento</h4>
                    <p className="text-slate-500 text-xs mt-1">Unidad #204: Cambio de aceite preventivo.</p>
                  </div>
                </div>
                <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl flex items-center gap-6 hover:border-red-500/50 transition-all cursor-pointer group">
                  <div className="bg-red-500/10 p-4 rounded-2xl text-red-500 group-hover:scale-110 transition-transform"><AlertTriangle size={28} /></div>
                  <div>
                    <h4 className="text-white font-black uppercase text-sm italic">Documentación Vencida</h4>
                    <p className="text-slate-500 text-xs mt-1">Póliza de seguro del tracto #102 vence en 3 días.</p>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}