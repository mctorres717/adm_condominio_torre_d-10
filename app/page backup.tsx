"use client";

import React, { useState } from 'react';
import { createClient } from '@supabase/supabase-js';

// --- CONEXIÓN A SUPABASE ---
const supabase = createClient(
  'https://spdhfslvbslsuuzckmqr.supabase.co',
  'sb_publishable_DH68PA1DWbc66PALwVDyXA_dHLQPrL1'
);

type TabType = 'RESUMEN' | 'BUSQUEDA' | 'BASE_DATOS' | 'GASTOS_GRAL' | 'GASTOS_MENSUAL';

export default function FinanzasTorreD10() {
  const [isAuth, setIsAuth] = useState(false);
  const [pin, setPin] = useState('');
  const [activeTab, setActiveTab] = useState<TabType>('RESUMEN');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin === 'admin') setIsAuth(true); // Cambia tu clave aquí
    else alert('Acceso denegado.');
  };

  if (!isAuth) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4 font-sans">
        <form onSubmit={handleLogin} className="bg-white border border-slate-200 p-8 rounded-2xl shadow-2xl w-full max-w-sm">
          <div className="flex justify-center mb-6">
            <div className="bg-emerald-900 p-4 rounded-full shadow-lg">
              <span className="text-3xl text-white">🏛️</span>
            </div>
          </div>
          <h1 className="text-xl font-bold text-center text-emerald-950 uppercase tracking-widest mb-2">Finanzas D-10</h1>
          <p className="text-center text-xs text-slate-500 mb-6 uppercase tracking-wider">Portal Tesorería</p>
          <input type="password" placeholder="Clave de Tesorería" className="w-full bg-slate-50 border border-slate-300 rounded-lg p-3 text-center text-emerald-950 font-bold tracking-widest outline-none focus:border-emerald-600 mb-6 transition-colors shadow-inner" value={pin} onChange={e => setPin(e.target.value)} />
          <button type="submit" className="w-full bg-emerald-800 hover:bg-emerald-700 text-white font-bold py-3 rounded-lg uppercase tracking-wider transition-colors shadow-lg text-sm">Desbloquear Bóveda</button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans antialiased pb-12">
      
      {/* HEADER BANCARIO / EJECUTIVO */}
      <header className="bg-emerald-950 border-b-4 border-emerald-700 py-4 px-6 shadow-xl sticky top-0 z-40">
        <div className="max-w-7xl mx-auto flex flex-col gap-5">
          <div className="flex items-center justify-between w-full">
            <div className="w-1/3 flex justify-start items-center gap-3">
              <span className="text-2xl">🏛️</span>
              <div>
                <h1 className="text-lg font-bold text-white uppercase tracking-widest leading-tight">Torre D-10</h1>
                <h2 className="text-[10px] text-emerald-400 uppercase tracking-widest"> DESARROLLO HABITACIONAL CIUDAD TIUNA "SECTOR SIMÓN BOLÍVAR" DISTRITO CAPITAL SECTOR D TORRE D-10</h2>
              </div>
            </div>

            <div className="w-1/3 text-center">
              <span className="bg-emerald-900 text-emerald-100 text-xs px-4 py-1.5 rounded-full border border-emerald-800 font-mono tracking-widest shadow-inner">
                ESTADO: EN LÍNEA
              </span>
            </div>

            <div className="w-1/3 flex justify-end">
              <button onClick={() => { setIsAuth(false); setPin(''); }} className="text-[10px] bg-white text-emerald-950 px-4 py-2 rounded-md hover:bg-slate-200 transition-colors uppercase font-bold tracking-widest shadow-md">
                Cerrar Sesión
              </button>
            </div>
          </div>

          {/* MENÚ DE PESTAÑAS EJECUTIVO */}
          <div className="flex justify-between bg-emerald-900/50 p-1 rounded-lg border border-emerald-800/50 w-full overflow-x-auto shadow-inner">
            {[
              { id: 'RESUMEN', label: '1. Resumen Finanzas' },
              { id: 'BUSQUEDA', label: '2. Búsqueda por Nombre' },
              { id: 'BASE_DATOS', label: '3. Base de Datos Principal' },
              { id: 'GASTOS_GRAL', label: '4. Relación de Gastos' },
              { id: 'GASTOS_MENSUAL', label: '5. Relación Mensual' }
            ].map(tab => (
              <button 
                key={tab.id} 
                onClick={() => setActiveTab(tab.id as TabType)} 
                className={`flex-1 py-2.5 px-4 text-[11px] font-bold uppercase tracking-wider rounded-md transition-all whitespace-nowrap ${activeTab === tab.id ? 'bg-white text-emerald-950 shadow-md' : 'text-emerald-100 hover:bg-emerald-800 hover:text-white'}`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* ÁREA DE CONTENIDO DINÁMICO */}
      <main className="max-w-7xl mx-auto px-6 pt-8 animate-fadeIn">
        
        {/* PESTAÑA 1: RESUMEN FINANZAS */}
        {activeTab === 'RESUMEN' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-emerald-950 border-b border-slate-300 pb-2">Resumen Financiero Consolidado</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {/* Tarjetas de Muestra (Mockup) */}
              <div className="bg-white p-6 rounded-xl shadow-lg border-t-4 border-emerald-600">
                <p className="text-xs text-slate-500 uppercase tracking-widest font-bold mb-1">Total Ingresos USD</p>
                <p className="text-3xl font-mono font-bold text-emerald-900">0.00</p>
              </div>
              <div className="bg-white p-6 rounded-xl shadow-lg border-t-4 border-red-600">
                <p className="text-xs text-slate-500 uppercase tracking-widest font-bold mb-1">Total Gastos USD</p>
                <p className="text-3xl font-mono font-bold text-red-900">0.00</p>
              </div>
              <div className="bg-white p-6 rounded-xl shadow-lg border-t-4 border-emerald-400">
                <p className="text-xs text-slate-500 uppercase tracking-widest font-bold mb-1">Total Ingresos Bs</p>
                <p className="text-3xl font-mono font-bold text-emerald-700">0.00</p>
              </div>
              <div className="bg-white p-6 rounded-xl shadow-lg border-t-4 border-amber-500">
                <p className="text-xs text-slate-500 uppercase tracking-widest font-bold mb-1">Saldo Actual Bs</p>
                <p className="text-3xl font-mono font-bold text-amber-600">0.00</p>
              </div>
            </div>
            <div className="bg-white h-96 rounded-xl shadow-lg border border-slate-200 flex items-center justify-center">
              <p className="text-slate-400 font-bold uppercase tracking-widest">Espacio Reservado para Gráficos Dinámicos (Recharts)</p>
            </div>
          </div>
        )}

        {/* PESTAÑA 2: BÚSQUEDA POR NOMBRE */}
        {activeTab === 'BUSQUEDA' && (
          <div>
            <h2 className="text-2xl font-bold text-emerald-950 border-b border-slate-300 pb-2 mb-6">Estado de Cuenta por Apartamento</h2>
            <div className="bg-white p-6 rounded-xl shadow-lg border border-slate-200">
               <p className="text-slate-500">Aquí integraremos el buscador híbrido para ver deudas históricas y pagos realizados.</p>
            </div>
          </div>
        )}

        {/* PESTAÑA 3: BASE DE DATOS PRINCIPAL */}
        {activeTab === 'BASE_DATOS' && (
          <div>
            <h2 className="text-2xl font-bold text-emerald-950 border-b border-slate-300 pb-2 mb-6">Master Ledger (Libro Mayor de Residentes)</h2>
            <div className="bg-white p-6 rounded-xl shadow-lg border border-slate-200">
               <p className="text-slate-500">Aquí colocaremos los 4 filtros (Fecha, Mes, Piso, Apto) conectados a Supabase.</p>
            </div>
          </div>
        )}

{/* PESTAÑA 4: RELACIÓN DE GASTOS */}
        {activeTab === 'GASTOS_GRAL' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-emerald-950 border-b border-slate-300 pb-2">Registro de Transacciones</h2>
            
            {/* FORMULARIO DE ENTRADA */}
            <div className="bg-white p-6 rounded-xl shadow-lg border border-emerald-100 grid grid-cols-1 md:grid-cols-3 gap-4">
              <input type="text" placeholder="Año" className="p-2 border rounded" id="new_anio" />
              <input type="text" placeholder="Mes" className="p-2 border rounded" id="new_mes" />
              <input type="number" placeholder="Ingreso USD" className="p-2 border rounded" id="new_ing_usd" />
              <input type="number" placeholder="Gasto USD" className="p-2 border rounded" id="new_gas_usd" />
              <input type="number" placeholder="Ingreso Bs" className="p-2 border rounded" id="new_ing_bs" />
              <input type="number" placeholder="Gasto Bs" className="p-2 border rounded" id="new_gas_bs" />
              <button 
                onClick={async () => {
                  const data = {
                    anio: (document.getElementById('new_anio') as HTMLInputElement).value,
                    mes: (document.getElementById('new_mes') as HTMLInputElement).value,
                    ingreso_usd: parseFloat((document.getElementById('new_ing_usd') as HTMLInputElement).value),
                    gasto_usd: parseFloat((document.getElementById('new_gas_usd') as HTMLInputElement).value),
                    ingreso_bs: parseFloat((document.getElementById('new_ing_bs') as HTMLInputElement).value),
                    gasto_bs: parseFloat((document.getElementById('new_gas_bs') as HTMLInputElement).value),
                    fecha: new Date().toISOString()
                  };
                  const { error } = await supabase.from('finanzas_d10').insert(data);
                  if (!error) alert("Transacción registrada con éxito");
                  else alert("Error: " + error.message);
                }}
                className="bg-emerald-700 text-white font-bold py-2 rounded shadow-md hover:bg-emerald-800"
              >
                Registrar Movimiento
              </button>
            </div>

            {/* TABLA DE VISUALIZACIÓN */}
            <div className="bg-white p-6 rounded-xl shadow-lg border border-slate-200 overflow-x-auto">
               <table className="w-full text-left text-xs">
                 <thead className="bg-emerald-900 text-white uppercase tracking-wider">
                   <tr>
                     <th className="p-3">Año</th><th className="p-3">Mes</th>
                     <th className="p-3">Ingresos USD</th><th className="p-3">Gastos USD</th>
                     <th className="p-3">Saldo USD</th><th className="p-3">Ingresos Bs</th>
                     <th className="p-3">Gastos Bs</th><th className="p-3">Saldo Bs</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-100">
                    {/* Aquí mapearíamos los datos con: propietarios.map(...) */}
                    <tr className="hover:bg-slate-50">
                        <td className="p-3">2026</td>
                        <td className="p-3">Junio</td>
                        <td className="p-3 text-emerald-600 font-bold">1200.00</td>
                        <td className="p-3 text-red-600 font-bold">450.00</td>
                        <td className="p-3 font-mono font-bold">750.00</td>
                        <td className="p-3 text-emerald-600 font-bold">5000.00</td>
                        <td className="p-3 text-red-600 font-bold">2000.00</td>
                        <td className="p-3 font-mono font-bold">3000.00</td>
                    </tr>
                 </tbody>
               </table>
            </div>
          </div>
        )}

        {/* PESTAÑA 5: RELACIÓN MENSUAL */}
        {activeTab === 'GASTOS_MENSUAL' && (
          <div>
            <h2 className="text-2xl font-bold text-emerald-950 border-b border-slate-300 pb-2 mb-6">Cierre Contable Mensual (8 Columnas)</h2>
            <div className="bg-white p-6 rounded-xl shadow-lg border border-slate-200">
               <p className="text-slate-500">Aquí irá el filtro por mes para agrupar los gastos de la Pestaña 4.</p>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}