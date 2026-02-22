"use client";
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import TarjetaDato from '@/components/tarjetaDato';
import Sidebar from '@/components/sidebar';
import { Bell, Calendar, DollarSign, TrendingUp, AlertTriangle } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function Page() {
  const [metricas, setMetricas] = useState({ ingresos: 0, gastos: 0, ganancia: 0 });
  const [sesion, setSesion] = useState(null);
  const [email, setEmail] = useState(""); 
  const [password, setPassword] = useState(""); 
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Sincronización de autoridad y sesión
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSesion(session);
      setLoading(false);
    });
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSesion(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function obtenerFinanzas() {
    if (!sesion) return;

    // 1. Obtener Ingresos (Facturas Pagadas)
    const { data: facturas } = await supabase
      .from('facturas')
      .select('monto_total')
      .eq('estatus_pago', 'Pagado');
      
    const totalIngresos = facturas?.reduce((acc, curr) => acc + (Number(curr.monto_total) || 0), 0) || 0;

    // 2. Obtener Gastos (Tabla de gastos operativos)
    const { data: gastosBD } = await supabase
      .from('gastos')
      .select('monto');
      
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

  if (loading) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-blue-500 font-black italic uppercase tracking-widest">Iniciando Sistemas...</div>;

  if (!sesion) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-950 text-white p-6">
        <form onSubmit={iniciarSesion} className="bg-slate-900 p-10 rounded-[2.5rem] border border-slate-800 w-full max-w-md shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-linear-to-r from-transparent via-blue-600 to-transparent"></div>
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
              Entrar
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
        <div className="max-w-350 mx-auto">
          <header className="mb-10">
            <h1 className="text-3xl font-black tracking-tighter uppercase italic leading-none">
            Panel <span className="text-green-700">Principal </span>
            </h1>
            <p className="text-slate-500 mt-2 font-bold uppercase text-[10px] tracking-[0.3em]">Resumen relevantes</p>
          </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* SECCIÓN FINANZAS (COMPACTA) */}
<section className="space-y-6">
  <div className="flex items-center gap-3 mb-2">
            <TrendingUp className="text-green-500" size={30} />
              <h2 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Balance Financiero</h2>
  </div>
  
        <div className="grid grid-cols-1 gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div onClick={() => router.push('/facturas')} className="cursor-pointer active:scale-95 transition-transform">
              <TarjetaDato titulo="Ingresos" valor={`$${metricas.ingresos.toLocaleString()}`} color="blue" />
            </div>
            <div onClick={() => router.push('/mantenimiento')} className="cursor-pointer active:scale-95 transition-transform">
              <TarjetaDato titulo="Gasto operativo" valor={`$${metricas.gastos.toLocaleString()}`} color="blue" />
            </div>
          </div>

          {/* GANANCIA NETA - UN SOLO CONTENEDOR */}
        <div onClick={() => router.push('/dinero')} className="bg-green-600/10 border border-green-500/20 p-6 rounded-4xl shadow-xl relative overflow-hidden group cursor-pointer active:scale-[0.98] transition-all">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
             <TrendingUp size={60} className="text-green-500" />
            </div>
              <p className="text-xs font-black text-green-500 uppercase tracking-widest mb-1 text-[9px]">Ganancia Neta</p>
              <h3 className="text-4xl font-black text-white italic tracking-tighter">${metricas.ganancia.toLocaleString()}</h3>
        <div className="mt-4 h-1 w-full bg-slate-800 rounded-full overflow-hidden">
        <div className="h-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]" style={{ width: '100%' }}></div>
        </div>
        </div>
      </div>
</section>
            {/* SECCIÓN AVISOS */}
            <section className="space-y-6">
              <div className="flex items-center gap-3 mb-2">
                <Bell className="text-blue-500" size={18} />
                <h2 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Avisos de Ocasión</h2>
              </div>
              <div className="space-y-3">
                <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex items-center gap-5 hover:border-orange-500/50 transition-all cursor-pointer group">
                  <div className="bg-orange-500/10 p-3 rounded-xl text-orange-500 group-hover:scale-110 transition-transform"><DollarSign size={22} /></div>
                  <div>
                    <h4 className="text-white font-black uppercase text-xs italic">Cobranza Pendiente</h4>
                    <p className="text-slate-500 text-[10px] mt-0.5 font-medium tracking-tight">3 facturas superan el plazo de crédito.</p>
                  </div>
                </div>
                
                <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex items-center gap-5 hover:border-blue-500/50 transition-all cursor-pointer group">
                  <div className="bg-blue-500/10 p-3 rounded-xl text-blue-500 group-hover:scale-110 transition-transform"><Calendar size={22} /></div>
                  <div>
                    <h4 className="text-white font-black uppercase text-xs italic">Próximo Mantenimiento</h4>
                    <p className="text-slate-500 text-[10px] mt-0.5 font-medium tracking-tight">Unidad #204 requiere servicio preventivo.</p>
                  </div>
                </div>

                <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex items-center gap-5 hover:border-red-500/50 transition-all cursor-pointer group">
                  <div className="bg-red-500/10 p-3 rounded-xl text-red-500 group-hover:scale-110 transition-transform"><AlertTriangle size={22} /></div>
                  <div>
                    <h4 className="text-white font-black uppercase text-xs italic">Documentación Crítica</h4>
                    <p className="text-slate-500 text-[10px] mt-0.5 font-medium tracking-tight">Póliza de seguro #102 vence en 72 horas.</p>
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