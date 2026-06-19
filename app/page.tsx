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

  // --- ESTADOS DE LA BASE DE DATOS (PESTAÑA 4) ---
  const [transacciones, setTransacciones] = useState<any[]>([]);

  // --- ESTADOS DE LA BASE DE DATOS DE RESIDENTES (PESTAÑA 3) ---
  const [pagosResidentes, setPagosResidentes] = useState<any[]>([]);

  // --- ESTADOS DEL FORMULARIO DE GASTOS (PESTAÑA 4) ---
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

  // --- ESTADOS DEL FORMULARIO DE RECAUDACIÓN (PESTAÑA 3) ---
  const [formPagoResidente, setFormPagoResidente] = useState({
    apartamento: '',
    piso: '',
    mes_correspondiente: '',
    anio_correspondiente: new Date().getFullYear().toString(),
    monto_pagado_usd: '',
    deuda_acumulada_usd: '',
    estatus_solvencia: ''
  });

  // --- ESTADOS DE LOS 4 FILTROS DE LA BASE DE DATOS PRINCIPAL (PESTAÑA 3) ---
  const [filtroAnio, setFiltroAnio] = useState('');
  const [filtroMes, setFiltroMes] = useState('');
  const [filtroPiso, setFiltroPiso] = useState('');
  const [filtroApto, setFiltroApto] = useState('');

  // --- PERSISTENCIA DE SESIÓN Y AUTO-CIERRE ---
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedAuth = localStorage.getItem('finanzasAuth');
      if (savedAuth === 'true') {
        setIsAuth(true);
      }
    }
  }, []);

  useEffect(() => {
    if (!isAuth) return;

    // Reloj de inactividad de 5 minutos (300,000 ms)
    let inactivityTimeout: NodeJS.Timeout;

    const resetInactivityTimer = () => {
      clearTimeout(inactivityTimeout);
      inactivityTimeout = setTimeout(() => {
        alert('Tu sesión bancaria ha expirado por inactividad de 5 minutos.');
        handleLogout();
      }, 5 * 60 * 1000);
    };

    const userEvents = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    userEvents.forEach(event => window.addEventListener(event, resetInactivityTimer));

    resetInactivityTimer();

    return () => {
      clearTimeout(inactivityTimeout);
      userEvents.forEach(event => window.removeEventListener(event, resetInactivityTimer));
    };
  }, [isAuth]);

  // --- CARGA DE DATOS DE SUPABASE ---
  useEffect(() => {
    if (isAuth) {
      fetchTransacciones();
      fetchPagosResidentes();
    }
  }, [isAuth]);

  const fetchTransacciones = async () => {
    const { data } = await supabase
      .from('finanzas_d10')
      .select('*')
      .order('fecha', { ascending: true }) 
      .order('id', { ascending: true });

    if (data) {
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

  const fetchPagosResidentes = async () => {
    const { data, error } = await supabase
      .from('pagos_residentes')
      .select('*')
      .order('piso', { ascending: true })
      .order('apartamento', { ascending: true });

    if (error) {
      console.error("Error cargando base de datos principal:", error);
      return;
    }

    if (data) {
      setPagosResidentes(data);
    }
  };

  // --- FUNCIONES DE CONTROL ---
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin === 'admin') { 
      setIsAuth(true);
      if (typeof window !== 'undefined') {
        localStorage.setItem('finanzasAuth', 'true');
      }
    } else {
      alert('Clave de acceso denegada.');
    }
  };

  const handleLogout = () => {
    setIsAuth(false);
    setPin('');
    if (typeof window !== 'undefined') {
      localStorage.removeItem('finanzasAuth');
    }
  };

  const handleRegistrarMovimiento = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formGasto.anio || !formGasto.mes || !formGasto.descripcion) {
      return alert("El Año, Mes y Descripción son obligatorios.");
    }

    const payload = {
      fecha: new Date().toISOString(),
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

    if (error) alert(`Error al registrar: ${error.message}`);
    else {
      alert("✅ Transacción registrada en el Libro Mayor.");
      setFormGasto({ ...formGasto, referencia: '', descripcion: '', ingreso_usd: '', gasto_usd: '', ingreso_bs: '', gasto_bs: '' });
      fetchTransacciones();
    }
  };

  const handleRegistrarPagoResidente = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formPagoResidente.apartamento || !formPagoResidente.piso || !formPagoResidente.mes_correspondiente || !formPagoResidente.estatus_solvencia) {
      // Ajuste de validación dinámico interno para selectores
    }
    
    if (!formPagoResidente.apartamento || !formPagoResidente.piso || !formPagoResidente.mes_correspondiente || !formPagoResidente.estatus_solvencia) {
      return alert("Por favor rellena Apartamento, Piso, Mes y Estatus de Solvencia.");
    }

    const payload = {
      apartamento: formPagoResidente.apartamento.toUpperCase(),
      piso: formPagoResidente.piso,
      mes_correspondiente: formPagoResidente.mes_correspondiente,
      anio_correspondiente: formPagoResidente.anio_correspondiente,
      monto_pagado_usd: Number(formPagoResidente.monto_pagado_usd) || 0,
      deuda_acumulada_usd: Number(formPagoResidente.deuda_acumulada_usd) || 0,
      estatus_solvencia: formPagoResidente.estatus_solvencia
    };

    const { error } = await supabase.from('pagos_residentes').insert([payload]);

    if (error) {
      alert(`Error al guardar en Base de Datos Principal: ${error.message}`);
    } else {
      alert(`✅ Registro del Apto ${payload.apartamento} guardado con éxito.`);
      setFormPagoResidente({
        apartamento: '',
        piso: '',
        mes_correspondiente: '',
        anio_correspondiente: new Date().getFullYear().toString(),
        monto_pagado_usd: '',
        deuda_acumulada_usd: '',
        estatus_solvencia: ''
      });
      fetchPagosResidentes();
    }
  };

  const handlePrint = (tituloArchivo: string) => {
    const tituloOriginal = document.title;
    document.title = tituloArchivo;
    window.print();
    setTimeout(() => { document.title = tituloOriginal; }, 1000);
  };

  // --- HELPER: FORMATEO DE MONEDA (NOMENCLATURA INTERNACIONAL) ---
  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  // --- MOTOR MATEMÁTICO DEL DASHBOARD CONTABLE ---
  const totalIngresoUSD = transacciones.reduce((acc, t) => acc + Number(t.ingreso_usd), 0);
  const totalGastoUSD = transacciones.reduce((acc, t) => acc + Number(t.gasto_usd), 0);
  const saldoActualUSD = transacciones.length > 0 ? transacciones[transacciones.length - 1].saldo_usd : 0;
  
  const totalIngresoBs = transacciones.reduce((acc, t) => acc + Number(t.ingreso_bs), 0);
  const totalGastoBs = transacciones.reduce((acc, t) => acc + Number(t.gasto_bs), 0);
  const saldoActualBs = transacciones.length > 0 ? transacciones[transacciones.length - 1].saldo_bs : 0;

  // --- MOTOR DE FILTRADO EN TIEMPO REAL (4 FILTROS SIMULTÁNEOS - PESTAÑA 3) ---
  const dataResidentesFiltrada = pagosResidentes.filter(p => {
    const cumpleAnio = filtroAnio === '' || p.anio_correspondiente.toLowerCase().includes(filtroAnio.toLowerCase());
    const cumpleMes = filtroMes === '' || p.mes_correspondiente === filtroMes;
    const cumplePiso = filtroPiso === '' || p.piso.toString().toLowerCase().includes(filtroPiso.toLowerCase());
    const cumpleApto = filtroApto === '' || p.apartamento.toLowerCase().includes(filtroApto.toLowerCase());
    return cumpleAnio && cumpleMes && cumplePiso && cumpleApto;
  });

  // --- INTERFAZ DE LOGIN ---
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

  // --- INTERFAZ PRINCIPAL ---
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans antialiased pb-12 print:bg-white print:text-black print:p-0">
      
      <style>{`
        @media print {
          @page { size: letter portrait; margin: 2cm; }
          .no-print { display: none !important; }
          body { background-color: white !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .print-area { box-shadow: none !important; margin: 0 !important; padding: 0 !important; width: 100% !important; border: none !important; }
        }
      `}</style>

      {/* HEADER BANCARIO / EJECUTIVO */}
      <header className="no-print bg-emerald-950 border-b-4 border-emerald-700 py-4 px-6 shadow-xl sticky top-0 z-40">
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
              <button onClick={handleLogout} className="text-[10px] bg-white text-emerald-950 px-4 py-2 rounded-md hover:bg-slate-200 transition-colors uppercase font-bold tracking-widest shadow-md">
                Cerrar Sesión
              </button>
            </div>
          </div>

          {/* MENÚ DE PESTAÑAS */}
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
                className={`flex-none md:flex-1 py-2.5 px-4 text-[10px] md:text-[11px] font-bold uppercase tracking-wider rounded-md transition-all whitespace-nowrap ${activeTab === tab.id ? 'bg-white text-emerald-950 shadow-md' : 'text-emerald-100 hover:bg-emerald-800 hover:text-white'}`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* ÁREA DE CONTENIDO DINÁMICO */}
      <main className="max-w-7xl mx-auto px-4 md:px-6 pt-8 animate-fadeIn">
        
        {/* PESTAÑA 1: RESUMEN FINANZAS */}
        {activeTab === 'RESUMEN' && (
          <div className="no-print space-y-6">
            <h2 className="text-2xl font-bold text-emerald-950 border-b border-slate-300 pb-2">Resumen Financiero Consolidado</h2>
            
            {/* BLOQUE DIVISAS (USD) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div className="bg-white p-6 rounded-xl shadow-md border-t-4 border-emerald-600">
                <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-1">Total Ingresos USD</p>
                <p className="text-3xl font-mono font-bold text-emerald-900">${formatMoney(totalIngresoUSD)}</p>
              </div>
              <div className="bg-white p-6 rounded-xl shadow-md border-t-4 border-red-600">
                <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-1">Total Gastos USD</p>
                <p className="text-3xl font-mono font-bold text-red-900">${formatMoney(totalGastoUSD)}</p>
              </div>
              <div className="bg-emerald-950 p-6 rounded-xl shadow-xl border-t-4 border-emerald-400">
                <p className="text-[10px] text-emerald-400 uppercase tracking-widest font-bold mb-1">Saldo Actual USD</p>
                <p className="text-4xl font-mono font-bold text-white">${formatMoney(saldoActualUSD)}</p>
              </div>
            </div>

            {/* BLOQUE BOLÍVARES (BS) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-xl shadow-md border-t-4 border-emerald-500">
                <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-1">Total Ingresos Bs</p>
                <p className="text-3xl font-mono font-bold text-emerald-700">Bs {formatMoney(totalIngresoBs)}</p>
              </div>
              <div className="bg-white p-6 rounded-xl shadow-md border-t-4 border-red-500">
                <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-1">Total Gastos Bs</p>
                <p className="text-3xl font-mono font-bold text-red-700">Bs {formatMoney(totalGastoBs)}</p>
              </div>
              <div className="bg-white p-6 rounded-xl shadow-md border-t-4 border-amber-500">
                <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-1">Saldo Actual Bs</p>
                <p className="text-4xl font-mono font-bold text-amber-600">Bs {formatMoney(saldoActualBs)}</p>
              </div>
            </div>
          </div>
        )}

        {/* PESTAÑA 2: BÚSQUEDA POR NOMBRE */}
        {activeTab === 'BUSQUEDA' && (
          <div className="space-y-6">
            <div className="no-print flex justify-between items-center border-b border-slate-300 pb-2">
              <h2 className="text-2xl font-bold text-emerald-950">Estado de Cuenta por Apartamento</h2>
              <button 
                onClick={() => handlePrint("Estado de Cuenta - Apto")} 
                className="bg-slate-800 hover:bg-slate-700 text-white font-bold py-2 px-4 rounded shadow-md text-xs uppercase tracking-widest transition-colors flex items-center gap-2"
              >
                🖨️ Imprimir Estado
              </button>
            </div>
            
            <div className="no-print bg-white p-6 rounded-xl shadow-lg border border-slate-200">
               <p className="text-slate-500">Aquí se programará el buscador dinámico cruzado con la data de la pestaña 3.</p>
            </div>

            <div className="print-area hidden print:block bg-white text-black p-8 font-serif">
              <h1 className="text-center text-2xl font-bold mb-6 underline">ESTADO DE CUENTA - TORRE D-10</h1>
              <p>Aquí se renderizará el formato oficial de cobro/solvencia para entregar al propietario.</p>
            </div>
          </div>
        )}

        {/* PESTAÑA 3: BASE DE DATOS PRINCIPAL (DISEÑO FLANTE Y SISTEMA DE 4 FILTROS ACTIVADO) */}
        {activeTab === 'BASE_DATOS' && (
          <div className="no-print space-y-6 animate-fadeIn">
            <h2 className="text-2xl font-bold text-emerald-950 border-b border-slate-300 pb-2">Master Ledger de Residentes</h2>
            
            {/* FORMULARIO DE RECAUDACIÓN / INGRESO DE PAGOS */}
            <form onSubmit={handleRegistrarPagoResidente} className="bg-white p-6 rounded-xl shadow-lg border border-slate-200">
              <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">Cargar Pago de Condominio</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Apartamento</label>
                  <input type="text" placeholder="Ej. 1-A" value={formPagoResidente.apartamento} onChange={e => setFormPagoResidente({...formPagoResidente, apartamento: e.target.value})} className="w-full p-3 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-emerald-500 uppercase" required />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Piso</label>
                  <input type="text" placeholder="Ej. 1" value={formPagoResidente.piso} onChange={e => setFormPagoResidente({...formPagoResidente, piso: e.target.value})} className="w-full p-3 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-emerald-500" required />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Año</label>
                  <input type="text" placeholder="Ej. 2026" value={formPagoResidente.anio_correspondiente} onChange={e => setFormPagoResidente({...formPagoResidente, anio_correspondiente: e.target.value})} className="w-full p-3 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-emerald-500" required />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Mes a Cancelar</label>
                  <select value={formPagoResidente.mes_correspondiente} onChange={e => setFormPagoResidente({...formPagoResidente, mes_correspondiente: e.target.value})} className="w-full p-3 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-emerald-500 bg-white" required>
                    <option value="">-- Seleccionar --</option>
                    {['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'].map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div>
                  <label className="block text-[10px] font-bold text-emerald-700 uppercase mb-1">Monto Abonado USD</label>
                  <input type="number" step="0.01" placeholder="0.00" value={formPagoResidente.monto_pagado_usd} onChange={e => setFormPagoResidente({...formPagoResidente, monto_pagado_usd: e.target.value})} className="w-full p-3 border border-emerald-200 rounded-lg text-sm font-mono focus:outline-none focus:border-emerald-500" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-red-700 uppercase mb-1">Deuda Remanente USD</label>
                  <input type="number" step="0.01" placeholder="0.00" value={formPagoResidente.deuda_acumulada_usd} onChange={e => setFormPagoResidente({...formPagoResidente, deuda_acumulada_usd: e.target.value})} className="w-full p-3 border border-red-200 rounded-lg text-sm font-mono focus:outline-none focus:border-red-500" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Estatus Administrativo</label>
                  <select value={formPagoResidente.estatus_solvencia} onChange={e => setFormPagoResidente({...formPagoResidente, estatus_solvencia: e.target.value})} className="w-full p-3 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-emerald-500 bg-white" required>
                    <option value="">-- Seleccionar --</option>
                    <option value="SOLVENTE">🟢 SOLVENTE</option>
                    <option value="MOROSO">🔴 MOROSO</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end">
                <button type="submit" className="bg-emerald-800 hover:bg-emerald-700 text-white font-bold py-3 px-8 rounded-lg shadow-md uppercase tracking-widest text-xs transition-colors">
                  💾 Registrar Abono de Residente
                </button>
              </div>
            </form>

            {/* SECCIÓN DE LOS 4 FILTROS AVANZADOS EN PARALELO */}
            <div className="bg-white p-4 rounded-xl shadow-md border border-slate-200">
              <p className="text-[10px] uppercase tracking-widest font-bold text-slate-400 mb-3">Filtros de Auditoría Avanzada</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <input type="text" placeholder="🔍 Filtrar por Año" value={filtroAnio} onChange={e => setFiltroAnio(e.target.value)} className="p-2.5 border border-slate-200 rounded-lg text-xs bg-slate-50 focus:outline-none focus:border-emerald-500 font-mono" />
                <select value={filtroMes} onChange={e => setFiltroMes(e.target.value)} className="p-2.5 border border-slate-200 rounded-lg text-xs bg-slate-50 focus:outline-none focus:border-emerald-500 cursor-pointer">
                  <option value="">🔍 Todos los Meses</option>
                  {['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'].map(m => <option key={m} value={m}>{m}</option>)}
                </select>
                <input type="text" placeholder="🔍 Filtrar por Piso" value={filtroPiso} onChange={e => setFiltroPiso(e.target.value)} className="p-2.5 border border-slate-200 rounded-lg text-xs bg-slate-50 focus:outline-none focus:border-emerald-500" />
                <input type="text" placeholder="🔍 Filtrar por Apartamento" value={filtroApto} onChange={e => setFiltroApto(e.target.value)} className="p-2.5 border border-slate-200 rounded-lg text-xs bg-slate-50 focus:outline-none focus:border-emerald-500 uppercase font-bold text-emerald-800" />
              </div>
            </div>

            {/* VISUALIZACIÓN DE LA DATA FILTRADA */}
            <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-x-auto">
              <table className="w-full text-left text-xs whitespace-nowrap">
                <thead className="bg-slate-900 text-white font-mono uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="p-4 text-center">Nivel</th>
                    <th className="p-4">Apartamento</th>
                    <th className="p-4">Periodo Auditado</th>
                    <th className="p-4 text-right bg-emerald-950/20">Monto Abonado</th>
                    <th className="p-4 text-right bg-red-950/20">Deuda Restante</th>
                    <th className="p-4 text-center">Condición de Solvencia</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {dataResidentesFiltrada.length === 0 ? (
                    <tr><td colSpan={6} className="p-8 text-center text-slate-400 font-medium">Ningún registro coincide con los filtros aplicados.</td></tr>
                  ) : (
                    dataResidentesFiltrada.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-4 text-center font-mono font-bold text-slate-500">Piso {item.piso}</td>
                        <td className="p-4 font-bold text-emerald-900 tracking-wide">{item.apartamento}</td>
                        <td className="p-4">
                          <span className="font-semibold text-slate-700">{item.mes_correspondiente}</span> <span className="font-mono text-slate-400">{item.anio_correspondiente}</span>
                        </td>
                        <td className="p-4 text-right font-mono font-bold text-emerald-600">${formatMoney(item.monto_pagado_usd)}</td>
                        <td className="p-4 text-right font-mono font-bold text-red-600">${formatMoney(item.deuda_acumulada_usd)}</td>
                        <td className="p-4 text-center">
                          <span className={`px-3 py-1 rounded-full text-[9px] font-bold tracking-widest border ${item.estatus_solvencia === 'SOLVENTE' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-red-100 text-red-700 border-red-200'}`}>
                            {item.estatus_solvencia}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* PESTAÑA 4: RELACIÓN DE GASTOS */}
        {activeTab === 'GASTOS_GRAL' && (
          <div className="no-print space-y-6">
            <h2 className="text-2xl font-bold text-emerald-950 border-b border-slate-300 pb-2">Libro Diario de Transacciones</h2>
            
            <form onSubmit={handleRegistrarMovimiento} className="bg-white p-6 rounded-xl shadow-lg border border-slate-200">
              <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">Registrar Nuevo Movimiento Manual</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                <input type="text" placeholder="Año (Ej. 2026)" value={formGasto.anio} onChange={e => setFormGasto({...formGasto, anio: e.target.value})} className="p-3 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-emerald-500" required />
                <select value={formGasto.mes} onChange={e => setFormGasto({...formGasto, mes: e.target.value})} className="p-3 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-emerald-500 bg-white" required>
                  <option value="">-- Mes --</option>
                  {['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'].map(m => <option key={m} value={m}>{m}</option>)}
                </select>
                <input type="text" placeholder="Referencia (Ej. Factura 102)" value={formGasto.referencia} onChange={e => setFormGasto({...formGasto, referencia: e.target.value})} className="p-3 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-emerald-500" />
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
                      transacciones.map((t) => (
                        <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                          <td className="p-4">
                            <span className="font-bold">{t.anio}</span> <span className="text-slate-500 uppercase text-[10px]">{t.mes}</span>
                          </td>
                          <td className="p-4">
                            <div className="font-medium text-slate-800">{t.descripcion}</div>
                            <div className="text-[10px] text-slate-400 font-mono">Ref: {t.referencia}</div>
                          </td>
                          <td className="p-4 text-right font-mono text-emerald-600">{Number(t.ingreso_usd) > 0 ? `+${formatMoney(t.ingreso_usd)}` : '-'}</td>
                          <td className="p-4 text-right font-mono text-red-600">{Number(t.gasto_usd) > 0 ? `-${formatMoney(t.gasto_usd)}` : '-'}</td>
                          <td className="p-4 text-right font-mono font-bold border-r border-slate-100 bg-slate-50">{formatMoney(t.saldo_usd)}</td>
                          <td className="p-4 text-right font-mono text-emerald-600">{Number(t.ingreso_bs) > 0 ? `+${formatMoney(t.ingreso_bs)}` : '-'}</td>
                          <td className="p-4 text-right font-mono text-red-600">{Number(t.gasto_bs) > 0 ? `-${formatMoney(t.gasto_bs)}` : '-'}</td>
                          <td className="p-4 text-right font-mono font-bold bg-slate-50">{formatMoney(t.saldo_bs)}</td>
                        </tr>
                      ))
                    )}
                 </tbody>
               </table>
            </div>
          </div>
        )}

        {/* PESTAÑA 5: RELACIÓN MENSUAL */}
        {activeTab === 'GASTOS_MENSUAL' && (
          <div className="space-y-6">
            <div className="no-print flex justify-between items-center border-b border-slate-300 pb-2">
              <h2 className="text-2xl font-bold text-emerald-950">Cierre Contable Mensual</h2>
              <button 
                onClick={() => handlePrint("Relación de Gastos - Mensual")} 
                className="bg-slate-800 hover:bg-slate-700 text-white font-bold py-2 px-4 rounded shadow-md text-xs uppercase tracking-widest transition-colors flex items-center gap-2"
              >
                🖨️ Imprimir Cierre
              </button>
            </div>
            
            <div className="no-print bg-white p-6 rounded-xl shadow-lg border border-slate-200">
               <p className="text-slate-500">Aquí se reflejará el cierre mensual agrupado de los gastos operativos.</p>
            </div>

            <div className="print-area hidden print:block bg-white text-black p-8 font-serif">
              <h1 className="text-center text-2xl font-bold mb-6 underline">CIERRE CONTABLE - TORRE D-10</h1>
              <p>Aquí se renderizará la tabla filtrada por mes con las 8 columnas requeridas para imprimir.</p>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}