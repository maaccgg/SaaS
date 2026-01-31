import Sidebar from '../../components/sidebar'; 

export default function FinancePage() {
  return (
    <div className="flex bg-slate-950 text-slate-50 min-h-screen">
      
      <Sidebar />

      <main className="flex-1 p-8 text-center flex flex-col justify-center">
        <h1 className="text-4xl font-bold mb-4">Gestión Monetaria</h1>
        <p className="text-slate-400 max-w-md mx-auto">
          Módulo de control de finanzas. Aquí visualizaremos el comportamiento de las finanzas
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