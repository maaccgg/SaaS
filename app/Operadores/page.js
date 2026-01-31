import Sidebar from '../../components/sidebar'; 

export default function PersonalPage() {
  return (
    <div className="flex bg-slate-950 text-slate-50 min-h-screen">
      
      <Sidebar />

      <main className="flex-1 p-8 text-center flex flex-col justify-center">
        <h1 className="text-4xl font-bold mb-4">Gestión de Personal</h1>
        <p className="text-slate-400 max-w-md mx-auto">
          Módulo de control de flota en desarrollo. Aquí visualizaremos el estatus de cada camión en tiempo real.
        </p>
        
        <div className="mt-8">
           <span className="px-4 py-2 bg-blue-600/20 text-blue-400 border border-blue-500/30 rounded-full text-xs font-bold uppercase tracking-widest">
             Fase: Estructuración
           </span>
        </div>
      </main>
    </div>
  );
}