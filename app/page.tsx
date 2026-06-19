"use client";

import React, { useState, useEffect } from 'react';
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

  // --- ESTADOS DE LA BASE DE DATOS ---
  const [transacciones, setTransacciones] = useState<any[]>([]);

  // --- ESTADOS DEL FORMULARIO DE GASTOS ---
  const [formGasto, setFormGasto] = useState({
    anio: new Date().getFullYear().toString(),
    mes: '',
    referencia: '',
    descripcion: '',
    ingreso_usd: '',
    gasto_usd: '',
    ingreso_bs: '',
    gasto_bs: ''
  });

  // --- EFECTOS (CARGA INICIAL) ---
  useEffect(() => {
    if (isAuth) {
      fetchTransacciones();
    }
  }, [isAuth]);

  // --- LÓGICA DE NEGOCIO (CONTROLADOR FINANCIERO) ---
  const fetchTransacciones = async () => {
    const { data, error } = await supabase
      .from('finanzas_d10')
      .select('*')
      .order('fecha', { ascending: true }) // Orden cronológico obligatorio para contabilidad
      .order('id', { ascending: true });

    if (error) {
      console.error("Error cargando transacciones:", error);
      return;
    }

    if (data) {
      // Algoritmo de Saldo Acumulado (Running Balance)
      let saldoAcumuladoUSD = 0;
      let saldoAcumuladoBs = 0;

      const contabilidadProcesada = data.map(t => {
        saldoAcumuladoUSD += (Number(t.ingreso_usd) - Number(t.gasto_usd));
        saldoAcumuladoBs += (Number(t.ingreso_bs) - Number(t.gasto_bs));
        
        return { 
          ...t, 
          saldo_usd: saldoAcumuladoUSD, 
          saldo_bs: saldoAcumuladoBs 
        };
      });

      setTransacciones(contabilidadProcesada);
    }
  };

  const handleRegistrarMovimiento = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validación básica
    if (!formGasto.anio || !formGasto.mes || !formGasto.descripcion) {
      return alert("El Año, Mes y Descripción son obligatorios.");
    }

    const payload = {
      fecha: new Date().toISOString(), // Timestamp exacto
      anio: formGasto.anio,
      mes: formGasto.mes,
      referencia: formGasto.referencia || 'N/A',
      descripcion: formGasto.descripcion,
      ingreso_usd: Number(formGasto.ingreso_usd) || 0,
      gasto_usd: Number(formGasto.gasto_usd) || 0,
      ingreso_bs: Number(formGasto.ingreso_bs) || 0,
      gasto_bs: Number(formGasto.gasto_bs) || 0,
    };

    const { error } = await supabase.from('finanzas_d10').insert([payload]);

    if (error) {
      alert(`Error al registrar: ${error.message}`);
    } else {
      alert("✅ Transacción registrada en el Libro Mayor.");
      // Limpiar formulario y recargar tabla
      setFormGasto({ ...formGasto, referencia: '', descripcion: '', ingreso_usd: '', gasto_usd: '', ingreso_bs: '', gasto_bs: '' });
      fetchTransacciones();
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin === 'adminfinanzas') setIsAuth(true); 
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
                <h2 className="text-[10px] text-emerald-400 uppercase tracking-widest">Wealth Management System</h2>
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
          <div className="flex justify-between bg-emerald-900/50 p-1 rounded-lg border border-emerald-800/50 w-full overflow-x-auto shadow-inner custom-scrollbar">
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
          </div>
        )}

        {/* PESTAÑA 4: RELACIÓN DE GASTOS */}
        {activeTab === 'GASTOS_GRAL' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-emerald-950 border-b border-slate-300 pb-2">Libro Diario de Transacciones</h2>
            
            {/* PANEL DE INGRESO DE DATOS */}
            <form onSubmit={handleRegistrarMovimiento} className="bg-white p-6 rounded-xl shadow-lg border border-slate-200">
              <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">Registrar Nuevo Movimiento</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                <input type="text" placeholder="Año (Ej. 2026)" value={formGasto.anio} onChange={e => setFormGasto({...formGasto, anio: e.target.value})} className="p-3 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-emerald-500" required />
                <select value={formGasto.mes} onChange={e => setFormGasto({...formGasto, mes: e.target.value})} className="p-3 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-emerald-500 bg-white" required>
                  <option value="">-- Mes --</option>
                  {['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'].map(m => <option key={m} value={m}>{m}</option>)}
                </select>
                <input type="text" placeholder="Referencia (Ej. Zelle 1234)" value={formGasto.referencia} onChange={e => setFormGasto({...formGasto, referencia: e.target.value})} className="p-3 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-emerald-500" />
                <input type="text" placeholder="Descripción del Gasto/Ingreso" value={formGasto.descripcion} onChange={e => setFormGasto({...formGasto, descripcion: e.target.value})} className="p-3 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-emerald-500" required />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 bg-slate-50 p-4 rounded-lg border border-slate-100">
                <div>
                  <label className="block text-[10px] font-bold text-emerald-700 uppercase mb-1">Ingreso USD (+)</label>
                  <input type="number" step="0.01" placeholder="0.00" value={formGasto.ingreso_usd} onChange={e => setFormGasto({...formGasto, ingreso_usd: e.target.value})} className="w-full p-3 border border-emerald-200 rounded-lg text-sm font-mono focus:outline-none focus:border-emerald-500" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-red-700 uppercase mb-1">Gasto USD (-)</label>
                  <input type="number" step="0.01" placeholder="0.00" value={formGasto.gasto_usd} onChange={e => setFormGasto({...formGasto, gasto_usd: e.target.value})} className="w-full p-3 border border-red-200 rounded-lg text-sm font-mono focus:outline-none focus:border-red-500" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-emerald-700 uppercase mb-1">Ingreso Bs (+)</label>
                  <input type="number" step="0.01" placeholder="0.00" value={formGasto.ingreso_bs} onChange={e => setFormGasto({...formGasto, ingreso_bs: e.target.value})} className="w-full p-3 border border-emerald-200 rounded-lg text-sm font-mono focus:outline-none focus:border-emerald-500" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-red-700 uppercase mb-1">Gasto Bs (-)</label>
                  <input type="number" step="0.01" placeholder="0.00" value={formGasto.gasto_bs} onChange={e => setFormGasto({...formGasto, gasto_bs: e.target.value})} className="w-full p-3 border border-red-200 rounded-lg text-sm font-mono focus:outline-none focus:border-red-500" />
                </div>
              </div>

              <div className="flex justify-end">
                <button type="submit" className="bg-emerald-700 hover:bg-emerald-600 text-white font-bold py-3 px-8 rounded-lg shadow-md uppercase tracking-widest text-xs transition-colors">
                  💾 Guardar Transacción
                </button>
              </div>
            </form>

            {/* TABLA DEL LIBRO MAYOR */}
            <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-x-auto">
               <table className="w-full text-left text-xs whitespace-nowrap">
                 <thead className="bg-emerald-950 text-white font-mono uppercase text-[10px] tracking-wider">
                   <tr>
                     <th className="p-4">Periodo</th>
                     <th className="p-4">Descripción / Ref</th>
                     <th className="p-4 text-right bg-emerald-900">Ingreso $</th>
                     <th className="p-4 text-right bg-red-950">Gasto $</th>
                     <th className="p-4 text-right border-r border-slate-700">Saldo $</th>
                     <th className="p-4 text-right bg-emerald-900">Ingreso Bs</th>
                     <th className="p-4 text-right bg-red-950">Gasto Bs</th>
                     <th className="p-4 text-right">Saldo Bs</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-100">
                    {transacciones.length === 0 ? (
                      <tr><td colSpan={8} className="p-8 text-center text-slate-400 font-medium">No hay transacciones registradas.</td></tr>
                    ) : (
                      transacciones.map((t, idx) => (
                        <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                          <td className="p-4">
                            <span className="font-bold">{t.anio}</span> <span className="text-slate-500 uppercase text-[10px]">{t.mes}</span>
                          </td>
                          <td className="p-4">
                            <div className="font-medium text-slate-800">{t.descripcion}</div>
                            <div className="text-[10px] text-slate-400 font-mono">Ref: {t.referencia}</div>
                          </td>
                          <td className="p-4 text-right font-mono text-emerald-600">{Number(t.ingreso_usd) > 0 ? `+${t.ingreso_usd}` : '-'}</td>
                          <td className="p-4 text-right font-mono text-red-600">{Number(t.gasto_usd) > 0 ? `-${t.gasto_usd}` : '-'}</td>
                          <td className="p-4 text-right font-mono font-bold border-r border-slate-100 bg-slate-50">{t.saldo_usd.toFixed(2)}</td>
                          <td className="p-4 text-right font-mono text-emerald-600">{Number(t.ingreso_bs) > 0 ? `+${t.ingreso_bs}` : '-'}</td>
                          <td className="p-4 text-right font-mono text-red-600">{Number(t.gasto_bs) > 0 ? `-${t.gasto_bs}` : '-'}</td>
                          <td className="p-4 text-right font-mono font-bold bg-slate-50">{t.saldo_bs.toFixed(2)}</td>
                        </tr>
                      ))
                    )}
                 </tbody>
               </table>
            </div>
          </div>
        )}

        {/* PESTAÑAS RESTANTES (MOCKUPS POR AHORA) */}
        {activeTab === 'BUSQUEDA' && (<div><h2 className="text-2xl font-bold text-emerald-950 border-b border-slate-300 pb-2 mb-6">Estado de Cuenta por Apartamento</h2><div className="bg-white p-6 rounded-xl shadow-lg border border-slate-200"><p className="text-slate-500">En desarrollo...</p></div></div>)}
        {activeTab === 'BASE_DATOS' && (<div><h2 className="text-2xl font-bold text-emerald-950 border-b border-slate-300 pb-2 mb-6">Master Ledger (Libro Mayor de Residentes)</h2><div className="bg-white p-6 rounded-xl shadow-lg border border-slate-200"><p className="text-slate-500">En desarrollo...</p></div></div>)}
        {activeTab === 'GASTOS_MENSUAL' && (<div><h2 className="text-2xl font-bold text-emerald-950 border-b border-slate-300 pb-2 mb-6">Cierre Contable Mensual</h2><div className="bg-white p-6 rounded-xl shadow-lg border border-slate-200"><p className="text-slate-500">En desarrollo...</p></div></div>)}

      </main>
    </div>
  );
}