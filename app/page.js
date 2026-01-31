
//return - en el backend (supabase) se regresan datos. En React, se regresan interfases vizuales

//EN Next.js, no van <a>, van Links. El Link siempre lleva un href="/(Nombre de la carpeta con el archivo que quieres ligar"
//**OJO** el Link aplica dentro de mi "app", cuando es algo fuera de mi "app" si lleva <a>/

"use client";
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import TarjetaDato from '../components/tarjetaDato';
import Sidebar from '../components/sidebar'

//funcion principal
export default function Page() {
  

  //unidades
  const [conteoUnidades, setConteoUnidades] = useState(0); 
  const [nuevoCamion, setNuevoCamion] = useState(""); 

  //dinero
  const [totalIngresos, setTotalIngresos] = useState(0); 
  const [montoIngreso, setMontoIngreso] = useState(""); 
  
  // CAJA PARA LA LISTA: Aquí guardamos los datos para que el .map() no marque error
  const [listaIngresos, setListaIngresos] = useState([]); 

  //credenciales
  const [sesion, setSesion] = useState(null);
  const [email, setEmail] = useState(""); 
  const [password, setPassword] = useState(""); 

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSesion(session);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSesion(session);
    });
    return () => subscription.unsubscribe();
  }, []);

  async function iniciarSesion(e) {
    e.preventDefault();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) alert("Acceso denegado: " + error.message);
  }

  async function obtenerDatos() {
    const { count, error } = await supabase
      .from('unidades')
      .select('*', { count: 'exact', head: true });
    if (!error) setConteoUnidades(count || 0);
  }

  async function obtenerIngresos() {
    const { data, error } = await supabase
      .from('ingresos')
      .select('*') 
      .order('created_at', { ascending: false });

    if (!error && data) {
      const suma = data.reduce((acc, curr) => acc + (Number(curr.monto) || 0), 0);
      setTotalIngresos(suma);
      setListaIngresos(data); // Llenamos la lista con los datos reales
    }
  }

  useEffect(() => {
    if (!sesion) return; 
    obtenerDatos();
    obtenerIngresos();

    const canalUnidades = supabase.channel('cambios-unidades')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'unidades' }, () => obtenerDatos())
      .subscribe();

    const canalIngresos = supabase.channel('cambios-ingresos')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ingresos' }, () => obtenerIngresos())
      .subscribe();

    return () => {
      supabase.removeChannel(canalUnidades);
      supabase.removeChannel(canalIngresos);
    };
  }, [sesion]);

  async function agregarUnidad() {
    if (!nuevoCamion) return;
    const { error } = await supabase.from('unidades').insert([{ nombre: nuevoCamion, estado: 'Activo' }]);
    if (!error) setNuevoCamion(""); 
  }

  async function agregarIngreso() {
    if (!montoIngreso) return;
    const { error } = await supabase.from('ingresos').insert([{ monto: Number(montoIngreso), concepto: 'Servicio Plomería' }]);
    if (!error) setMontoIngreso("");
  }

  async function eliminarIngreso(id) {
    const confirmacion = confirm("¿Deseas eliminar este registro?");
    if (!confirmacion) return;
    const { error } = await supabase.from('ingresos').delete().eq('id', id);
    if (error) console.error(error.message);
    // El Realtime se encarga de refrescar la lista solo
  }

  if (!sesion) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-950 text-white p-6">
        <form onSubmit={iniciarSesion} className="bg-slate-900 p-8 rounded-2xl border border-slate-800 w-full max-w-md shadow-2xl">
          <h2 className="text-2xl font-bold mb-6 text-blue-500 italic uppercase tracking-tighter text-center">Ingresa tu usuario</h2>
          <input 
            type="email" placeholder="Correo Maestro" 
            className="w-full bg-slate-950 border border-slate-800 p-3 rounded-lg mb-4 outline-none focus:border-blue-500"
            value={email} onChange={(e) => setEmail(e.target.value)}
          />
          <input 
            type="password" placeholder="Contraseña" 
            className="w-full bg-slate-950 border border-slate-800 p-3 rounded-lg mb-6 outline-none focus:border-blue-500"
            value={password} onChange={(e) => setPassword(e.target.value)}
          />
          <button className="w-full bg-blue-600 hover:bg-blue-500 py-3 rounded-lg font-bold transition-all uppercase tracking-widest">
            Entrar a la Bóveda
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="flex bg-slate-950 text-slate-50 min-h-screen">
      <Sidebar />
      <main className="flex-1 p-8">
        <div className="max-w-5xl mx-auto">
          <header className="mb-10 flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-extrabold tracking-tighter uppercase italic text-blue-500">
                Panel de Control <span className="text-slate-100">Institución</span>
              </h1>
              <p className="text-slate-500 mt-2 font-medium">Consolidación 2026 - Gestión Táctica</p>
            </div>
            <button onClick={() => supabase.auth.signOut()} className="text-xs bg-slate-800 hover:bg-red-900 px-3 py-1 rounded border border-slate-700 transition-colors">
              Cerrar Bóveda
            </button>
          </header>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {/* Unidades */}
            <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-xl">
              <p className="text-xs font-bold text-slate-400 uppercase mb-4 tracking-widest">Nueva Unidad</p>
              <div className="flex gap-4">
                <input type="text" placeholder="ID Camión..." className="flex-1 bg-slate-950 border border-slate-800 rounded-lg p-3 text-white outline-none focus:border-blue-500" value={nuevoCamion} onChange={(e) => setNuevoCamion(e.target.value)} />
                <button onClick={agregarUnidad} className="bg-blue-600 hover:bg-blue-500 px-6 py-3 rounded-lg font-bold">+</button>
              </div>
            </div>

            {/* Ingresos + Historial */}
            <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-xl">
              <p className="text-xs font-bold text-slate-400 uppercase mb-4 tracking-widest">Registrar Cobro ($)</p>
              <div className="flex gap-4 mb-6">
                <input type="number" placeholder="Monto..." className="flex-1 bg-slate-950 border border-slate-800 rounded-lg p-3 text-white outline-none focus:border-green-500" value={montoIngreso} onChange={(e) => setMontoIngreso(e.target.value)} />
                <button onClick={agregarIngreso} className="bg-green-600 hover:bg-green-500 px-6 py-3 rounded-lg font-bold">$</button>
              </div>

              {/* LISTA DE REGISTROS CON BOTÓN DE ELIMINAR */}
              <div className="space-y-2 border-t border-slate-800 pt-4">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Historial</p>
                <div className="max-h-48 overflow-y-auto pr-2">
                  {listaIngresos.map((item) => (
                    <div key={item.id} className="flex justify-between items-center bg-slate-950 p-2 rounded border border-slate-800 text-sm mb-2 group">
                      <span className="font-mono text-green-500">${Number(item.monto).toLocaleString()}</span>
                      <button 
                        onClick={() => eliminarIngreso(item.id)} 
                        className="text-[10px] text-red-500 opacity-0 group-hover:opacity-100 transition-opacity font-bold"
                      >
                        ELIMINAR
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <TarjetaDato titulo="Unidades Activas" valor={conteoUnidades.toString()} color="blue" />
            <TarjetaDato titulo="Ingresos Totales" valor={`$${totalIngresos.toLocaleString()}`} color="green" />
            <TarjetaDato titulo="Meta Mensual" valor="$60,000" color="slate" />
          </div>
        </div>
      </main>
    </div>
  );
}