'use client';

import React, { useState } from "react";
import Sidebar from '../../components/sidebar'; 
import { Plus, Wallet, FileText, Truck } from 'lucide-react';

const UNITS = ['Unidad 1', 'Unidad 2', 'Unidad 3', 'Unidad 4', 'Unidad 5'];
const CATEGORIES = ['Combustible', 'Mantenimiento', 'Casetas', 'Gestión Especial'];

export default function FinancePage() {
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    description: '',
    unit: UNITS[0],
    category: CATEGORIES[0],
    amount: '',
  });

  // Limpiamos el tipado de TypeScript para que funcione en .js
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.description.trim() || !formData.amount) {
      alert('Por favor completa todos los campos');
      return;
    }
    console.log("Datos para Supabase:", formData);
    alert("Gasto registrado en interfaz. ¡Listo para conexión final!");
  };

  return (
    <div className="flex bg-slate-950 text-slate-50 min-h-screen font-sans">
      <Sidebar />

      <main className="flex-1 p-4 md:p-8">
        <header className="mb-8 mt-4">
          <div className="flex items-center gap-3 mb-2">
            <span className="px-3 py-1 bg-blue-600/20 text-blue-400 border border-blue-500/30 rounded-full text-[10px] font-bold uppercase tracking-widest">
              Fase: Estructuración
            </span>
          </div>
          <h1 className="text-4xl font-bold text-white">Gestión Monetaria</h1>
          <p className="text-slate-400">Control de flujo de caja y egresos operativos.</p>
        </header>

        <div className="max-w-5xl">
          <section className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 mb-8 backdrop-blur-sm shadow-2xl">
            <div className="flex items-center gap-2 mb-6">
              <Wallet className="text-blue-500" size={20} />
              <h3 className="text-lg font-semibold">Registrar Nuevo Gasto</h3>
            </div>

            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">Monto ($)</label>
                <input
                  name="amount"
                  type="number"
                  placeholder="0.00"
                  value={formData.amount}
                  onChange={handleChange}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-500 transition-all text-white"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">Fecha</label>
                <input
                  name="date"
                  type="date"
                  value={formData.date}
                  onChange={handleChange}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-500 transition-all text-white"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">Unidad</label>
                <div className="relative">
                  <select
                    name="unit"
                    value={formData.unit}
                    onChange={handleChange}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-500 appearance-none text-white"
                  >
                    {UNITS.map((u) => <option key={u} value={u} className="bg-slate-900">{u}</option>)}
                  </select>
                  <Truck className="absolute right-3 top-3.5 text-slate-500" size={16} />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">Categoría</label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-500 text-white"
                >
                  {CATEGORIES.map((c) => <option key={c} value={c} className="bg-slate-900">{c}</option>)}
                </select>
              </div>

              <div className="md:col-span-2 space-y-2">
                <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">Descripción</label>
                <div className="relative">
                  <input
                    name="description"
                    placeholder="Ej: Diésel carga Monterrey-Laredo"
                    value={formData.description}
                    onChange={handleChange}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 pl-10 outline-none focus:ring-2 focus:ring-blue-500 text-white"
                  />
                  <FileText className="absolute left-3 top-3.5 text-slate-500" size={16} />
                </div>
              </div>

              <button
                type="submit"
                className="md:col-span-3 bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-blue-900/20 flex items-center justify-center gap-2 text-lg active:scale-[0.98]"
              >
                <Plus size={22} />
                Registrar Movimiento
              </button>
            </form>
          </section>
        </div>
      </main>
    </div>
  );
}