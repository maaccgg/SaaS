'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { FileText, DollarSign, User, Calendar, Plus, AlertCircle } from 'lucide-react';

export default function FacturasPage() {
  const [facturas, setFacturas] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchFacturas = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('facturas').select('*').order('created_at', { ascending: false });
    if (!error) setFacturas(data);
    setLoading(false);
  };

  useEffect(() => { fetchFacturas(); }, []);

  return (
    <div className="min-h-screen bg-slate-950 p-8 text-slate-200">
      <header className="flex justify-between items-center mb-10">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight italic">Control de Facturación</h1>
          <p className="text-slate-400 mt-2 font-medium uppercase text-xs tracking-[0.2em]">Flujo de Capital</p>
        </div>
        <button className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 transition-all">
          <Plus size={20} /> Nueva Factura
        </button>
      </header>

      <div className="overflow-hidden bg-slate-900/40 border border-slate-800/60 rounded-3xl shadow-2xl">
        <table className="w-full text-left">
          <thead className="bg-slate-950/50 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
            <tr>
              <th className="p-5">Folio / Cliente</th>
              <th className="p-5">Fecha</th>
              <th className="p-5">Monto Total</th>
              <th className="p-5 text-center">Estatus</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50">
            {facturas.map((f) => (
              <tr key={f.id} className="hover:bg-blue-600/5 transition-colors group">
                <td className="p-5">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-slate-800 rounded-lg text-slate-400 group-hover:text-blue-400 transition-colors">
                      <FileText size={18} />
                    </div>
                    <div>
                      <p className="font-bold text-white tracking-tight">{f.folio_fiscal || 'Sin Folio'}</p>
                      <p className="text-xs text-slate-500">{f.cliente}</p>
                    </div>
                  </div>
                </td>
                <td className="p-5 text-sm font-mono text-slate-400">{f.fecha_emision}</td>
                <td className="p-5 font-black text-white text-lg">${f.monto_total?.toLocaleString()}</td>
                <td className="p-5">
                  <div className={`mx-auto w-fit px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${f.estatus_pago === 'Pagado' ? 'bg-green-500/10 border-green-500/20 text-green-500' : 'bg-orange-500/10 border-orange-500/20 text-orange-400'}`}>
                    {f.estatus_pago}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}