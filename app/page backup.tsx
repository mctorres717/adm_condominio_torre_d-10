"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';

// --- CONEXIÓN A SUPABASE ---
const supabase = createClient(
  'https://spdhfslvbslsuuzckmqr.supabase.co',
  'sb_publishable_DH68PA1DWbc66PALwVDyXA_dHLQPrL1'
);

// --- TIPOS ACTUALIZADOS CON LAS NUEVAS PESTAÑAS ---
type TabType = 'RESUMEN' | 'BUSQUEDA' | 'BASE_DATOS' | 'GASTOS_GRAL' | 'GASTOS_MENSUAL' | 'EMISION_OFICIAL' | 'GESTION_DATOS';

// --- CONSTANTES DEL NEGOCIO ---
const CUOTA_MENSUAL_USD = 10.00;
const ANO_INICIO_OPERACIONES = 2025;
const MES_INICIO_OPERACIONES = 0; // 0 = Enero en JavaScript

export default function FinanzasTorreD10() {
  const [isAuth, setIsAuth] = useState(false);
  const [pin, setPin] = useState('');
  const [activeTab, setActiveTab] = useState<TabType>('RESUMEN');

  const [transacciones, setTransacciones] = useState<any[]>([]);
  const [pagosResidentes, setPagosResidentes] = useState<any[]>([]);

  const [formGasto, setFormGasto] = useState({ anio: new Date().getFullYear().toString(), mes: '', referencia: '', descripcion: '', gasto_usd: '', gasto_bs: '' });
  const [formPagoResidente, setFormPagoResidente] = useState({ apartamento: '', meses_seleccionados: [] as string[], anio_correspondiente: new Date().getFullYear().toString(), monto_pagado_usd: '', monto_pagado_bs: '', descripcion: '' });

  const [filtroAnio, setFiltroAnio] = useState('');
  const [filtroMes, setFiltroMes] = useState('');
  const [filtroPiso, setFiltroPiso] = useState('');
  const [filtroApto, setFiltroApto] = useState('');

  const [filtroAptoTab2, setFiltroAptoTab2] = useState('');
  const [filtroMesTab5, setFiltroMesTab5] = useState('');
  const [filtroAnioTab5, setFiltroAnioTab5] = useState(new Date().getFullYear().toString());

  const listaApartamentos = Array.from({ length: 14 }, (_, p) => ['A', 'B', 'C', 'D'].map(letra => `${p + 1}-${letra}`)).flat();
  const mesesDelAno = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

  useEffect(() => {
    if (typeof window !== 'undefined' && localStorage.getItem('finanzasAuth') === 'true') setIsAuth(true);
  }, []);

  useEffect(() => {
    if (!isAuth) return;
    let inactivityTimeout: NodeJS.Timeout;
    const resetInactivityTimer = () => {
      clearTimeout(inactivityTimeout);
      inactivityTimeout = setTimeout(() => { alert('Tu sesión ha expirado por inactividad.'); handleLogout(); }, 5 * 60 * 1000);
    };
    const userEvents = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    userEvents.forEach(event => window.addEventListener(event, resetInactivityTimer));
    resetInactivityTimer();
    return () => { clearTimeout(inactivityTimeout); userEvents.forEach(event => window.removeEventListener(event, resetInactivityTimer)); };
  }, [isAuth]);

  useEffect(() => {
    if (isAuth) { fetchTransacciones(); fetchPagosResidentes(); }
  }, [isAuth]);

  const fetchTransacciones = async () => {
    const { data } = await supabase.from('finanzas_d10').select('*').order('fecha', { ascending: true }).order('id', { ascending: true });
    if (data) {
      let saldoAcumuladoUSD = 0; let saldoAcumuladoBs = 0;
      setTransacciones(data.map(t => {
        saldoAcumuladoUSD += (Number(t.ingreso_usd) - Number(t.gasto_usd));
        saldoAcumuladoBs += (Number(t.ingreso_bs) - Number(t.gasto_bs));
        return { ...t, saldo_usd: saldoAcumuladoUSD, saldo_bs: saldoAcumuladoBs };
      }));
    }
  };

  const fetchPagosResidentes = async () => {
    const { data } = await supabase.from('pagos_residentes').select('*').order('created_at', { ascending: true });
    if (data) setPagosResidentes(data);
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin === 'admin') { setIsAuth(true); if (typeof window !== 'undefined') localStorage.setItem('finanzasAuth', 'true'); }
    else alert('Clave de acceso denegada.');
  };

  const handleLogout = () => { setIsAuth(false); setPin(''); if (typeof window !== 'undefined') localStorage.removeItem('finanzasAuth'); };

  // --- BOTONES DE ELIMINAR (DELETE) ---
  const handleEliminarTransaccion = async (id: number) => {
    if (!window.confirm("⚠️ ¿Estás seguro de eliminar este movimiento? Esta acción recalculará los saldos y es irreversible.")) return;
    const { error } = await supabase.from('finanzas_d10').delete().eq('id', id);
    if (error) alert("Error al eliminar: " + error.message);
    else { alert("✅ Registro eliminado exitosamente."); fetchTransacciones(); }
  };

  const handleEliminarPagoResidente = async (id: number) => {
    if (!window.confirm("⚠️ ¿Estás seguro de eliminar este recibo de pago? Esto afectará el estado de cuenta del propietario.")) return;
    const { error } = await supabase.from('pagos_residentes').delete().eq('id', id);
    if (error) alert("Error al eliminar: " + error.message);
    else { alert("✅ Recibo eliminado exitosamente."); fetchPagosResidentes(); }
  };

  const handleRegistrarMovimiento = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formGasto.anio || !formGasto.mes || !formGasto.descripcion) return alert("Año, Mes y Descripción son obligatorios.");
    const payload = { fecha: new Date().toISOString(), anio: formGasto.anio, mes: formGasto.mes, referencia: formGasto.referencia || 'N/A', descripcion: formGasto.descripcion, ingreso_usd: 0, gasto_usd: Number(formGasto.gasto_usd)||0, ingreso_bs: 0, gasto_bs: Number(formGasto.gasto_bs)||0 };
    const { error } = await supabase.from('finanzas_d10').insert([payload]);
    if (error) alert(`Error: ${error.message}`);
    else { alert("✅ Gasto registrado en el Libro Diario."); setFormGasto({ anio: new Date().getFullYear().toString(), mes: '', referencia: '', descripcion: '', gasto_usd: '', gasto_bs: '' }); fetchTransacciones(); }
  };

  const handleRegistrarPagoResidente = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formPagoResidente.apartamento || formPagoResidente.meses_seleccionados.length === 0) return alert("Selecciona el Apartamento y al menos un Mes.");

    const pisoCalculado = formPagoResidente.apartamento.split('-')[0];
    const mUSD = Number(formPagoResidente.monto_pagado_usd) || 0;
    const mBS = Number(formPagoResidente.monto_pagado_bs) || 0;
    const estatusCalculado = (mUSD > 0 || mBS > 0) ? 'PAGADO' : 'PENDIENTE';
    const mesesUnidos = formPagoResidente.meses_seleccionados.join(', ');

    const payloadResidente = {
      apartamento: formPagoResidente.apartamento, piso: pisoCalculado, mes_correspondiente: mesesUnidos, anio_correspondiente: formPagoResidente.anio_correspondiente,
      monto_pagado_usd: mUSD, monto_pagado_bs: mBS, estatus_solvencia: estatusCalculado, descripcion: formPagoResidente.descripcion || `Abono de condominio`
    };

    const { error: errorResidente } = await supabase.from('pagos_residentes').insert([payloadResidente]);
    if (errorResidente) return alert(`Error en Residentes: ${errorResidente.message}`);

    if (mUSD > 0 || mBS > 0) {
      const payloadLibroDiario = {
        fecha: new Date().toISOString(), anio: formPagoResidente.anio_correspondiente, mes: formPagoResidente.meses_seleccionados[formPagoResidente.meses_seleccionados.length - 1],
        referencia: `Apto ${formPagoResidente.apartamento}`, descripcion: `Ingreso Condominio: ${formPagoResidente.descripcion || mesesUnidos}`,
        ingreso_usd: mUSD, gasto_usd: 0, ingreso_bs: mBS, gasto_bs: 0
      };
      await supabase.from('finanzas_d10').insert([payloadLibroDiario]);
    }

    alert(`✅ Abono registrado. Libro Mayor actualizado.`);
    setFormPagoResidente({ apartamento: '', meses_seleccionados: [], anio_correspondiente: new Date().getFullYear().toString(), monto_pagado_usd: '', monto_pagado_bs: '', descripcion: '' });
    fetchPagosResidentes(); fetchTransacciones();
  };

  const toggleMes = (mes: string) => {
    setFormPagoResidente(prev => {
      const seleccionados = prev.meses_seleccionados.includes(mes) ? prev.meses_seleccionados.filter(m => m !== mes) : [...prev.meses_seleccionados, mes];
      seleccionados.sort((a, b) => mesesDelAno.indexOf(a) - mesesDelAno.indexOf(b));
      return { ...prev, meses_seleccionados: seleccionados };
    });
  };

  const handlePrint = (titulo: string) => { const original = document.title; document.title = titulo; window.print(); setTimeout(() => { document.title = original; }, 1000); };
  const formatMoney = (amount: number) => new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);

  const totalIngresoUSD = transacciones.reduce((acc, t) => acc + Number(t.ingreso_usd), 0);
  const totalGastoUSD = transacciones.reduce((acc, t) => acc + Number(t.gasto_usd), 0);
  const saldoActualUSD = transacciones.length > 0 ? transacciones[transacciones.length - 1].saldo_usd : 0;
  const totalIngresoBs = transacciones.reduce((acc, t) => acc + Number(t.ingreso_bs), 0);
  const totalGastoBs = transacciones.reduce((acc, t) => acc + Number(t.gasto_bs), 0);
  const saldoActualBs = transacciones.length > 0 ? transacciones[transacciones.length - 1].saldo_bs : 0;

  // --- MOTOR DE CONCILIACIÓN CRONOLÓGICA (PESTAÑA 2) ---
  const estadoDeCuentaGenerado = useMemo(() => {
    if (!filtroAptoTab2) return { lineas: [], deudaTotalUSD: 0, totalAbonadoUSD: 0, totalAbonadoBs: 0 };
    
    const pagosDelApto = pagosResidentes.filter(p => p.apartamento === filtroAptoTab2);
    const mapaPagos = new Map();
    let totalPagadoU = 0;
    let totalPagadoB = 0;

    pagosDelApto.forEach(p => {
      totalPagadoU += Number(p.monto_pagado_usd);
      totalPagadoB += Number(p.monto_pagado_bs);
      const mesesAb = p.mes_correspondiente.split(',').map((m: string) => m.trim());
      mesesAb.forEach((m: string) => {
        mapaPagos.set(`${m}-${p.anio_correspondiente}`, p);
      });
    });

    const lineas = [];
    let deudaTotalAcumulada = 0;
    const fechaActual = new Date();
    const anoActual = fechaActual.getFullYear();
    const mesActual = fechaActual.getMonth();

    let anioIterador = ANO_INICIO_OPERACIONES;
    let mesIterador = MES_INICIO_OPERACIONES;

    // Bucle cronológico (De más viejo a más nuevo)
    while (anioIterador < anoActual || (anioIterador === anoActual && mesIterador <= mesActual)) {
      const nombreMes = mesesDelAno[mesIterador];
      const claveBusqueda = `${nombreMes}-${anioIterador}`;
      const pagoRealizado = mapaPagos.get(claveBusqueda);

      if (pagoRealizado) {
        lineas.push({
          periodo: claveBusqueda, estatus: 'PAGADO', cargos_usd: 0, abonos_usd: pagoRealizado.monto_pagado_usd, abonos_bs: pagoRealizado.monto_pagado_bs,
          descripcion: pagoRealizado.descripcion, fecha: new Date(pagoRealizado.created_at).toLocaleDateString()
        });
      } else {
        lineas.push({
          periodo: claveBusqueda, estatus: 'PENDIENTE', cargos_usd: CUOTA_MENSUAL_USD, abonos_usd: 0, abonos_bs: 0,
          descripcion: 'Cuota Mensual de Condominio', fecha: '-'
        });
        deudaTotalAcumulada += CUOTA_MENSUAL_USD;
      }

      mesIterador++;
      if (mesIterador > 11) { mesIterador = 0; anioIterador++; }
    }

    // Ya NO hacemos lineas.reverse() para mantener el orden de más viejo a más nuevo.
    return { lineas: lineas, deudaTotalUSD: deudaTotalAcumulada, totalAbonadoUSD: totalPagadoU, totalAbonadoBs: totalPagadoB };
  }, [filtroAptoTab2, pagosResidentes]);

  const dataResidentesFiltrada = pagosResidentes.filter(p => {
    return (filtroAnio === '' || p.anio_correspondiente.toLowerCase().includes(filtroAnio.toLowerCase())) &&
           (filtroMes === '' || p.mes_correspondiente.includes(filtroMes)) &&
           (filtroPiso === '' || p.piso.toString().toLowerCase().includes(filtroPiso.toLowerCase())) &&
           (filtroApto === '' || p.apartamento.toLowerCase().includes(filtroApto.toLowerCase()));
  });

  const transaccionesMesTab5 = transacciones.filter(t => t.mes === filtroMesTab5 && t.anio === filtroAnioTab5);
  const mesIngresoUSD = transaccionesMesTab5.reduce((acc, t) => acc + Number(t.ingreso_usd), 0);
  const mesGastoUSD = transaccionesMesTab5.reduce((acc, t) => acc + Number(t.gasto_usd), 0);
  const mesIngresoBs = transaccionesMesTab5.reduce((acc, t) => acc + Number(t.ingreso_bs), 0);
  const mesGastoBs = transaccionesMesTab5.reduce((acc, t) => acc + Number(t.gasto_bs), 0);

  if (!isAuth) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4 font-sans">
        <form onSubmit={handleLogin} className="bg-white border border-slate-200 p-8 rounded-2xl shadow-2xl w-full max-w-sm">
          <div className="flex justify-center mb-6"><div className="bg-emerald-900 p-4 rounded-full shadow-lg"><span className="text-3xl text-white">🏛️</span></div></div>
          <h1 className="text-xl font-bold text-center text-emerald-950 uppercase tracking-widest mb-2">Finanzas D-10</h1>
          <p className="text-center text-xs text-slate-500 mb-6 uppercase tracking-wider">Portal Tesorería</p>
          <input type="password" placeholder="Clave de Tesorería" className="w-full bg-slate-50 border border-slate-300 rounded-lg p-3 text-center text-emerald-950 font-bold tracking-widest outline-none focus:border-emerald-600 mb-6 shadow-inner" value={pin} onChange={e => setPin(e.target.value)} />
          <button type="submit" className="w-full bg-emerald-800 hover:bg-emerald-700 text-white font-bold py-3 rounded-lg uppercase tracking-wider shadow-lg text-sm">Desbloquear Bóveda</button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans antialiased pb-12 print:bg-white print:text-black print:p-0">
      <style>{`@media print { @page { size: letter portrait; margin: 1cm; } .no-print { display: none !important; } body { background-color: white !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; } .print-area { box-shadow: none !important; margin: 0 !important; padding: 0 !important; width: 100% !important; border: none !important; } }`}</style>
      
      {/* HEADER Y MENÚ DE PESTAÑAS AMPLIADO */}
      <header className="no-print bg-emerald-950 border-b-4 border-emerald-700 py-4 px-6 shadow-xl sticky top-0 z-40">
        <div className="max-w-7xl mx-auto flex flex-col gap-5">
          <div className="flex items-center justify-between w-full">
            <div className="w-1/3 flex justify-start items-center gap-3"><span className="text-2xl">🏛️</span><div><h1 className="text-lg font-bold text-white uppercase tracking-widest leading-tight">Torre D-10</h1><h2 className="text-[10px] text-emerald-400 uppercase tracking-widest">Enterprise Resource Planning (ERP)</h2></div></div>
            <div className="w-1/3 text-center"><span className="bg-emerald-900 text-emerald-100 text-xs px-4 py-1.5 rounded-full border border-emerald-800 font-mono tracking-widest shadow-inner">ESTADO: EN LÍNEA</span></div>
            <div className="w-1/3 flex justify-end"><button onClick={handleLogout} className="text-[10px] bg-white text-emerald-950 px-4 py-2 rounded-md hover:bg-slate-200 uppercase font-bold tracking-widest shadow-md">Cerrar Sesión</button></div>
          </div>
          
          {/* NUEVO MENÚ DE 7 PESTAÑAS */}
          <div className="flex justify-start gap-1 bg-emerald-900/50 p-1 rounded-lg border border-emerald-800/50 w-full overflow-x-auto shadow-inner custom-scrollbar">
            {[
              { id: 'RESUMEN', label: '1. Resumen' }, 
              { id: 'BUSQUEDA', label: '2. Búsqueda' }, 
              { id: 'BASE_DATOS', label: '3. Recaudación' }, 
              { id: 'GASTOS_GRAL', label: '4. Gastos' }, 
              { id: 'GASTOS_MENSUAL', label: '5. Cierre Mensual' },
              { id: 'EMISION_OFICIAL', label: '6. Emisión Oficial' },
              { id: 'GESTION_DATOS', label: '7. Gestión de Datos' }
            ].map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id as TabType)} className={`flex-none py-2 px-3 text-[10px] md:text-[11px] font-bold uppercase tracking-wider rounded-md transition-all whitespace-nowrap ${activeTab === tab.id ? 'bg-white text-emerald-950 shadow-md' : 'text-emerald-100 hover:bg-emerald-800 hover:text-white'}`}>{tab.label}</button>
            ))}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 md:px-6 pt-8 animate-fadeIn">
        
        {/* PESTAÑA 1: RESUMEN */}
        {activeTab === 'RESUMEN' && (
          <div className="no-print space-y-6">
            <h2 className="text-2xl font-bold text-emerald-950 border-b border-slate-300 pb-2">Resumen Financiero Consolidado</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div className="bg-white p-6 rounded-xl shadow-md border-t-4 border-emerald-600"><p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-1">Total Ingresos USD</p><p className="text-3xl font-mono font-bold text-emerald-900">${formatMoney(totalIngresoUSD)}</p></div>
              <div className="bg-white p-6 rounded-xl shadow-md border-t-4 border-red-600"><p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-1">Total Gastos USD</p><p className="text-3xl font-mono font-bold text-red-900">${formatMoney(totalGastoUSD)}</p></div>
              <div className="bg-emerald-950 p-6 rounded-xl shadow-xl border-t-4 border-emerald-400"><p className="text-[10px] text-emerald-400 uppercase tracking-widest font-bold mb-1">Saldo Actual USD</p><p className="text-4xl font-mono font-bold text-white">${formatMoney(saldoActualUSD)}</p></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-xl shadow-md border-t-4 border-emerald-500"><p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-1">Total Ingresos Bs</p><p className="text-3xl font-mono font-bold text-emerald-700">Bs {formatMoney(totalIngresoBs)}</p></div>
              <div className="bg-white p-6 rounded-xl shadow-md border-t-4 border-red-500"><p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-1">Total Gastos Bs</p><p className="text-3xl font-mono font-bold text-red-700">Bs {formatMoney(totalGastoBs)}</p></div>
              <div className="bg-white p-6 rounded-xl shadow-md border-t-4 border-amber-500"><p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-1">Saldo Actual Bs</p><p className="text-4xl font-mono font-bold text-amber-600">Bs {formatMoney(saldoActualBs)}</p></div>
            </div>
          </div>
        )}

        {/* PESTAÑA 2: ESTADO DE CUENTA CRONOLÓGICO */}
        {activeTab === 'BUSQUEDA' && (
          <div className="space-y-6">
            <div className="no-print flex justify-between items-center border-b border-slate-300 pb-2">
              <h2 className="text-2xl font-bold text-emerald-950">Estado de Cuenta Histórico</h2>
              {filtroAptoTab2 && (
                <button onClick={() => handlePrint(`Estado de Cuenta - Apto ${filtroAptoTab2}`)} className="bg-slate-800 hover:bg-slate-700 text-white font-bold py-2 px-4 rounded shadow-md text-xs uppercase tracking-widest transition-colors flex items-center gap-2">🖨️ Imprimir Estado</button>
              )}
            </div>
            
            <div className="no-print bg-white p-6 rounded-xl shadow-lg border border-slate-200 flex gap-4 items-end">
               <div className="w-1/3">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Seleccione Apartamento</label>
                  <select value={filtroAptoTab2} onChange={e => setFiltroAptoTab2(e.target.value)} className="w-full p-3 border border-slate-300 rounded-lg text-sm bg-white font-bold text-emerald-900 focus:outline-none focus:border-emerald-500">
                    <option value="">-- Buscar Apto --</option>
                    {listaApartamentos.map(apto => <option key={apto} value={apto}>{apto}</option>)}
                  </select>
               </div>
               <div className="w-2/3 flex justify-end items-center text-xs text-slate-400">
                  <span className="bg-slate-100 px-3 py-1 rounded-full border border-slate-200">ℹ️ Cálculo desde Enero 2025. Próximamente se calculará desde la fecha de ingreso.</span>
               </div>
            </div>

            {filtroAptoTab2 && (
              <div className="print-area bg-white p-8 rounded-xl shadow-lg border border-slate-200">
                <div className="border-b-2 border-emerald-900 pb-6 mb-6 flex justify-between items-start">
                  <div>
                    <h1 className="text-3xl font-bold text-emerald-950 tracking-widest">TORRE D-10</h1>
                    <p className="text-xs text-slate-500 uppercase tracking-widest mt-1">Estado de Cuenta General</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-emerald-900">APTO {filtroAptoTab2}</p>
                    <p className="text-xs text-slate-500 font-mono mt-1">Corte a: {new Date().toLocaleDateString()}</p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-6 mb-8">
                  <div className="bg-red-50 p-4 rounded-lg border border-red-200 text-center shadow-sm">
                     <p className="text-[10px] text-red-700 uppercase tracking-widest font-bold">Deuda Pendiente Total</p>
                     <p className="text-3xl font-mono font-bold text-red-900">${formatMoney(estadoDeCuentaGenerado.deudaTotalUSD)}</p>
                  </div>
                  <div className="bg-emerald-50 p-4 rounded-lg border border-emerald-200 text-center shadow-sm">
                     <p className="text-[10px] text-emerald-700 uppercase tracking-widest font-bold">Total Abonado Histórico USD</p>
                     <p className="text-3xl font-mono font-bold text-emerald-900">${formatMoney(estadoDeCuentaGenerado.totalAbonadoUSD)}</p>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 text-center shadow-sm">
                     <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Total Abonado Histórico Bs</p>
                     <p className="text-3xl font-mono font-bold text-emerald-900">Bs {formatMoney(estadoDeCuentaGenerado.totalAbonadoBs)}</p>
                  </div>
                </div>

                <h3 className="text-sm font-bold text-emerald-900 uppercase tracking-widest mb-3 border-b border-slate-200 pb-2">Detalle Mes a Mes (Orden Cronológico)</h3>
                <table className="w-full text-left text-xs whitespace-nowrap mb-8">
                  <thead className="bg-emerald-950 text-emerald-50 font-bold uppercase text-[10px] tracking-wider">
                    <tr><th className="p-3">Periodo (Mes/Año)</th><th className="p-3">Estatus</th><th className="p-3">Fecha de Pago</th><th className="p-3 text-right">Cargos (Deuda)</th><th className="p-3 text-right">Descripción Referencial</th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {estadoDeCuentaGenerado.lineas.map((linea, idx) => (
                      <tr key={idx} className={linea.estatus === 'PENDIENTE' ? 'bg-red-50/30' : ''}>
                        <td className="p-3 font-semibold text-slate-800">{linea.periodo}</td>
                        <td className="p-3">
                          <span className={`px-2 py-1 rounded text-[9px] font-bold tracking-widest ${linea.estatus === 'PAGADO' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                            {linea.estatus}
                          </span>
                        </td>
                        <td className="p-3 text-slate-500 font-mono">{linea.fecha}</td>
                        <td className="p-3 text-right font-mono font-bold text-slate-700">
                          {linea.estatus === 'PENDIENTE' ? `$${formatMoney(linea.cargos_usd)}` : '-'}
                        </td>
                        <td className="p-3 text-right text-slate-500 text-[10px] truncate max-w-[200px]">{linea.descripcion}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* PESTAÑA 3: RECAUDACIÓN (CON BOTÓN DE ELIMINAR) */}
        {activeTab === 'BASE_DATOS' && (
          <div className="no-print space-y-6 animate-fadeIn">
            <h2 className="text-2xl font-bold text-emerald-950 border-b border-slate-300 pb-2">Master Ledger de Residentes</h2>
            <form onSubmit={handleRegistrarPagoResidente} className="bg-white p-6 rounded-xl shadow-lg border border-slate-200">
              <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">Cargar Pago de Condominio</h3>
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mb-4 items-start">
                <div className="md:col-span-3"><label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Apartamento</label><select value={formPagoResidente.apartamento} onChange={e => setFormPagoResidente({...formPagoResidente, apartamento: e.target.value})} className="w-full p-3 border border-slate-300 rounded-lg text-sm bg-white font-semibold focus:outline-none focus:border-emerald-500" required><option value="">-- Seleccionar --</option>{listaApartamentos.map(apto => <option key={apto} value={apto}>{apto}</option>)}</select></div>
                <div className="md:col-span-2"><label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Año</label><input type="text" value={formPagoResidente.anio_correspondiente} onChange={e => setFormPagoResidente({...formPagoResidente, anio_correspondiente: e.target.value})} className="w-full p-3 border border-slate-300 rounded-lg text-sm font-mono focus:outline-none focus:border-emerald-500" required /></div>
                <div className="md:col-span-7"><label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Meses a Cancelar (Selección Múltiple)</label><div className="grid grid-cols-3 lg:grid-cols-4 gap-2 bg-slate-50 p-2 rounded-lg border border-slate-200">{mesesDelAno.map(mes => (<label key={mes} className="flex items-center space-x-2 text-xs font-medium cursor-pointer text-slate-700 hover:text-emerald-700"><input type="checkbox" checked={formPagoResidente.meses_seleccionados.includes(mes)} onChange={() => toggleMes(mes)} className="accent-emerald-600 w-3 h-3" /><span>{mes}</span></label>))}</div></div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mb-6">
                <div className="md:col-span-3"><label className="block text-[10px] font-bold text-emerald-700 uppercase mb-1">Monto de Recibo USD</label><input type="number" step="0.01" placeholder="0.00" value={formPagoResidente.monto_pagado_usd} onChange={e => setFormPagoResidente({...formPagoResidente, monto_pagado_usd: e.target.value})} className="w-full p-3 border border-emerald-200 rounded-lg text-sm font-mono focus:outline-none focus:border-emerald-500" /></div>
                <div className="md:col-span-3"><label className="block text-[10px] font-bold text-emerald-700 uppercase mb-1">Monto de Recibo Bs.</label><input type="number" step="0.01" placeholder="0.00" value={formPagoResidente.monto_pagado_bs} onChange={e => setFormPagoResidente({...formPagoResidente, monto_pagado_bs: e.target.value})} className="w-full p-3 border border-emerald-200 rounded-lg text-sm font-mono focus:outline-none focus:border-emerald-500" /></div>
                <div className="md:col-span-6"><label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Descripción del Pago</label><input type="text" placeholder="Ej. Pago por Zelle #1234..." value={formPagoResidente.descripcion} onChange={e => setFormPagoResidente({...formPagoResidente, descripcion: e.target.value})} className="w-full p-3 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-emerald-500" /></div>
              </div>
              <div className="flex justify-end"><button type="submit" className="bg-emerald-800 hover:bg-emerald-700 text-white font-bold py-3 px-8 rounded-lg shadow-md uppercase tracking-widest text-xs transition-transform active:scale-95">💾 Registrar Recaudación</button></div>
            </form>
            
            <div className="bg-white p-4 rounded-xl shadow-md border border-slate-200">
              <p className="text-[10px] uppercase tracking-widest font-bold text-slate-400 mb-3">Filtros de Auditoría Avanzada</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <input type="text" placeholder="🔍 Filtrar por Año" value={filtroAnio} onChange={e => setFiltroAnio(e.target.value)} className="p-2.5 border border-slate-200 rounded-lg text-xs bg-slate-50 font-mono" />
                <select value={filtroMes} onChange={e => setFiltroMes(e.target.value)} className="p-2.5 border border-slate-200 rounded-lg text-xs bg-slate-50 cursor-pointer"><option value="">🔍 Todos los Meses</option>{mesesDelAno.map(m => <option key={m} value={m}>{m}</option>)}</select>
                <input type="text" placeholder="🔍 Filtrar por Piso" value={filtroPiso} onChange={e => setFiltroPiso(e.target.value)} className="p-2.5 border border-slate-200 rounded-lg text-xs bg-slate-50" />
                <input type="text" placeholder="🔍 Filtrar por Apartamento" value={filtroApto} onChange={e => setFiltroApto(e.target.value)} className="p-2.5 border border-slate-200 rounded-lg text-xs bg-slate-50 uppercase font-bold text-emerald-800" />
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-x-auto">
              <table className="w-full text-left text-xs whitespace-nowrap">
                <thead className="bg-slate-900 text-white font-mono uppercase text-[10px] tracking-wider">
                  <tr><th className="p-4 text-center">Nivel</th><th className="p-4">Apartamento</th><th className="p-4">Meses Abonados</th><th className="p-4">Descripción</th><th className="p-4 text-right bg-emerald-950/20">Recibo USD</th><th className="p-4 text-right bg-emerald-950/20">Recibo Bs.</th><th className="p-4 text-center">Acciones</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {dataResidentesFiltrada.length === 0 ? (<tr><td colSpan={7} className="p-8 text-center text-slate-400 font-medium">Ningún registro coincide.</td></tr>) : (
                    dataResidentesFiltrada.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50">
                        <td className="p-4 text-center font-mono font-bold text-slate-500">Piso {item.piso}</td>
                        <td className="p-4 font-bold text-emerald-900">{item.apartamento}</td>
                        <td className="p-4"><span className="font-semibold text-slate-700 truncate block max-w-[150px]">{item.mes_correspondiente}</span> <span className="font-mono text-slate-400">{item.anio_correspondiente}</span></td>
                        <td className="p-4 text-slate-500 truncate max-w-[150px]">{item.descripcion}</td>
                        <td className="p-4 text-right font-mono font-bold text-emerald-600">${formatMoney(item.monto_pagado_usd)}</td>
                        <td className="p-4 text-right font-mono font-bold text-emerald-600">Bs {formatMoney(item.monto_pagado_bs)}</td>
                        <td className="p-4 text-center">
                          <button onClick={() => handleEliminarPagoResidente(item.id)} className="bg-red-100 text-red-600 hover:bg-red-600 hover:text-white p-2 rounded transition-colors" title="Eliminar Registro">🗑️</button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* PESTAÑA 4: GASTOS (CON BOTÓN DE ELIMINAR) */}
        {activeTab === 'GASTOS_GRAL' && (
          <div className="no-print space-y-6 animate-fadeIn">
            <h2 className="text-2xl font-bold text-emerald-950 border-b border-slate-300 pb-2">Libro Diario de Egresos Operativos</h2>
            <form onSubmit={handleRegistrarMovimiento} className="bg-white p-6 rounded-xl shadow-lg border border-slate-200">
              <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">Registrar Nuevo Gasto Operativo</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                <input type="text" placeholder="Año (Ej. 2026)" value={formGasto.anio} onChange={e => setFormGasto({...formGasto, anio: e.target.value})} className="p-3 border border-slate-300 rounded-lg text-sm" required />
                <select value={formGasto.mes} onChange={e => setFormGasto({...formGasto, mes: e.target.value})} className="p-3 border border-slate-300 rounded-lg text-sm bg-white" required><option value="">-- Mes --</option>{mesesDelAno.map(m => <option key={m} value={m}>{m}</option>)}</select>
                <input type="text" placeholder="Referencia de Factura" value={formGasto.referencia} onChange={e => setFormGasto({...formGasto, referencia: e.target.value})} className="p-3 border border-slate-300 rounded-lg text-sm" />
                <input type="text" placeholder="Descripción del Gasto" value={formGasto.descripcion} onChange={e => setFormGasto({...formGasto, descripcion: e.target.value})} className="p-3 border border-slate-300 rounded-lg text-sm" required />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 bg-red-50 p-4 rounded-lg border border-red-100">
                <div><label className="block text-[10px] font-bold text-red-700 uppercase mb-1">Gasto Realizado USD (-)</label><input type="number" step="0.01" value={formGasto.gasto_usd} onChange={e => setFormGasto({...formGasto, gasto_usd: e.target.value})} className="w-full p-3 border border-red-200 rounded-lg text-sm font-mono" /></div>
                <div><label className="block text-[10px] font-bold text-red-700 uppercase mb-1">Gasto Realizado Bs (-)</label><input type="number" step="0.01" value={formGasto.gasto_bs} onChange={e => setFormGasto({...formGasto, gasto_bs: e.target.value})} className="w-full p-3 border border-red-200 rounded-lg text-sm font-mono" /></div>
              </div>
              <div className="flex justify-end"><button type="submit" className="bg-red-700 hover:bg-red-600 text-white font-bold py-3 px-8 rounded-lg shadow-md uppercase tracking-widest text-xs">💾 Registrar Gasto en Libro</button></div>
            </form>

            <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-x-auto">
               <table className="w-full text-left text-xs whitespace-nowrap">
                 <thead className="bg-emerald-950 text-white font-mono uppercase text-[10px] tracking-wider">
                   <tr><th className="p-4">Periodo</th><th className="p-4">Descripción / Ref</th><th className="p-4 text-right bg-emerald-900">Ingreso $</th><th className="p-4 text-right bg-red-950">Gasto $</th><th className="p-4 text-right border-r border-slate-700">Saldo $</th><th className="p-4 text-right bg-emerald-900">Ingreso Bs</th><th className="p-4 text-right bg-red-950">Gasto Bs</th><th className="p-4 text-right border-r border-slate-700">Saldo Bs</th><th className="p-4 text-center">Acciones</th></tr>
                 </thead>
                 <tbody className="divide-y divide-slate-100">
                    {transacciones.length === 0 ? (<tr><td colSpan={9} className="p-8 text-center text-slate-400 font-medium">No hay transacciones registradas.</td></tr>) : (
                      transacciones.map((t) => (
                        <tr key={t.id} className="hover:bg-slate-50">
                          <td className="p-4"><span className="font-bold">{t.anio}</span> <span className="text-slate-500 uppercase text-[10px]">{t.mes}</span></td>
                          <td className="p-4"><div className="font-medium text-slate-800">{t.descripcion}</div><div className="text-[10px] text-slate-400 font-mono">Ref: {t.referencia}</div></td>
                          <td className="p-4 text-right font-mono text-emerald-600">{Number(t.ingreso_usd) > 0 ? `+${formatMoney(t.ingreso_usd)}` : '-'}</td>
                          <td className="p-4 text-right font-mono text-red-600">{Number(t.gasto_usd) > 0 ? `-${formatMoney(t.gasto_usd)}` : '-'}</td>
                          <td className="p-4 text-right font-mono font-bold border-r border-slate-100 bg-slate-50">{formatMoney(t.saldo_usd)}</td>
                          <td className="p-4 text-right font-mono text-emerald-600">{Number(t.ingreso_bs) > 0 ? `+${formatMoney(t.ingreso_bs)}` : '-'}</td>
                          <td className="p-4 text-right font-mono text-red-600">{Number(t.gasto_bs) > 0 ? `-${formatMoney(t.gasto_bs)}` : '-'}</td>
                          <td className="p-4 text-right font-mono font-bold border-r border-slate-100 bg-slate-50">{formatMoney(t.saldo_bs)}</td>
                          <td className="p-4 text-center">
                            <button onClick={() => handleEliminarTransaccion(t.id)} className="bg-red-100 text-red-600 hover:bg-red-600 hover:text-white p-2 rounded transition-colors" title="Eliminar Registro">🗑️</button>
                          </td>
                        </tr>
                      ))
                    )}
                 </tbody>
               </table>
            </div>
          </div>
        )}

        {/* PESTAÑA 5: CIERRE MENSUAL */}
        {activeTab === 'GASTOS_MENSUAL' && (
          <div className="space-y-6">
            <div className="no-print flex justify-between items-center border-b border-slate-300 pb-2">
              <h2 className="text-2xl font-bold text-emerald-950">Cierre Contable Mensual</h2>
              {filtroMesTab5 && (
                <button onClick={() => handlePrint(`Cierre Mensual - ${filtroMesTab5} ${filtroAnioTab5}`)} className="bg-slate-800 hover:bg-slate-700 text-white font-bold py-2 px-4 rounded shadow-md text-xs uppercase tracking-widest transition-colors flex items-center gap-2">🖨️ Imprimir Cierre</button>
              )}
            </div>
            <div className="no-print bg-white p-6 rounded-xl shadow-lg border border-slate-200 flex gap-4 items-end">
               <div className="w-1/4">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Filtrar por Año</label>
                  <input type="text" value={filtroAnioTab5} onChange={e => setFiltroAnioTab5(e.target.value)} className="w-full p-3 border border-slate-300 rounded-lg text-sm bg-white font-mono focus:outline-none focus:border-emerald-500" />
               </div>
               <div className="w-1/3">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Filtrar por Mes</label>
                  <select value={filtroMesTab5} onChange={e => setFiltroMesTab5(e.target.value)} className="w-full p-3 border border-slate-300 rounded-lg text-sm bg-white font-bold text-emerald-900 focus:outline-none focus:border-emerald-500">
                    <option value="">-- Seleccione Mes --</option>
                    {mesesDelAno.map(mes => <option key={mes} value={mes}>{mes}</option>)}
                  </select>
               </div>
            </div>
            {filtroMesTab5 && (
              <div className="print-area bg-white p-8 rounded-xl shadow-lg border border-slate-200">
                <div className="border-b-2 border-emerald-900 pb-6 mb-6 flex justify-between items-center">
                  <div>
                    <h1 className="text-3xl font-bold text-emerald-950 tracking-widest">TORRE D-10</h1>
                    <p className="text-xs text-slate-500 uppercase tracking-widest mt-1">Cierre de Flujo de Caja</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-emerald-900 uppercase">{filtroMesTab5} {filtroAnioTab5}</p>
                    <p className="text-xs text-slate-500 font-mono mt-1">Generado: {new Date().toLocaleDateString()}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-6 mb-8">
                  <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 border-b border-slate-200 pb-1">Balance Operativo USD</p>
                    <div className="flex justify-between text-sm mb-1"><span className="text-slate-600">Total Ingresos:</span><span className="font-mono text-emerald-600 font-bold">+${formatMoney(mesIngresoUSD)}</span></div>
                    <div className="flex justify-between text-sm mb-2"><span className="text-slate-600">Total Egresos:</span><span className="font-mono text-red-600 font-bold">-${formatMoney(mesGastoUSD)}</span></div>
                    <div className="flex justify-between text-base border-t border-slate-200 pt-2"><span className="font-bold text-slate-800">Neto Mensual:</span><span className={`font-mono font-bold ${mesIngresoUSD - mesGastoUSD >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>${formatMoney(mesIngresoUSD - mesGastoUSD)}</span></div>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 border-b border-slate-200 pb-1">Balance Operativo Bs.</p>
                    <div className="flex justify-between text-sm mb-1"><span className="text-slate-600">Total Ingresos:</span><span className="font-mono text-emerald-600 font-bold">+Bs {formatMoney(mesIngresoBs)}</span></div>
                    <div className="flex justify-between text-sm mb-2"><span className="text-slate-600">Total Egresos:</span><span className="font-mono text-red-600 font-bold">-Bs {formatMoney(mesGastoBs)}</span></div>
                    <div className="flex justify-between text-base border-t border-slate-200 pt-2"><span className="font-bold text-slate-800">Neto Mensual:</span><span className={`font-mono font-bold ${mesIngresoBs - mesGastoBs >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>Bs {formatMoney(mesIngresoBs - mesGastoBs)}</span></div>
                  </div>
                </div>
                <table className="w-full text-left text-[11px] whitespace-nowrap">
                  <thead className="bg-emerald-50 text-emerald-900 font-bold uppercase tracking-wider border-y border-emerald-900">
                    <tr><th className="p-2">Fecha/ID</th><th className="p-2">Descripción</th><th className="p-2 text-right">Ingreso $</th><th className="p-2 text-right">Egreso $</th><th className="p-2 text-right border-r border-emerald-200">Saldo $</th><th className="p-2 text-right">Ingreso Bs</th><th className="p-2 text-right">Egreso Bs</th><th className="p-2 text-right">Saldo Bs</th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {transaccionesMesTab5.length === 0 ? (<tr><td colSpan={8} className="p-8 text-center text-slate-400">Sin movimientos registrados.</td></tr>) : (
                      transaccionesMesTab5.map((t) => (
                        <tr key={t.id}>
                          <td className="p-2 text-slate-500 font-mono">#{t.id}</td><td className="p-2 text-slate-800 font-medium truncate max-w-[200px]">{t.descripcion}</td><td className="p-2 text-right font-mono text-emerald-600">{Number(t.ingreso_usd) > 0 ? `+${formatMoney(t.ingreso_usd)}` : '-'}</td><td className="p-2 text-right font-mono text-red-600">{Number(t.gasto_usd) > 0 ? `-${formatMoney(t.gasto_usd)}` : '-'}</td><td className="p-2 text-right font-mono font-bold border-r border-emerald-50">{formatMoney(t.saldo_usd)}</td><td className="p-2 text-right font-mono text-emerald-600">{Number(t.ingreso_bs) > 0 ? `+${formatMoney(t.ingreso_bs)}` : '-'}</td><td className="p-2 text-right font-mono text-red-600">{Number(t.gasto_bs) > 0 ? `-${formatMoney(t.gasto_bs)}` : '-'}</td><td className="p-2 text-right font-mono font-bold">{formatMoney(t.saldo_bs)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* PESTAÑA 6: EMISIÓN OFICIAL (SKELETON PARA FUSIÓN) */}
        {activeTab === 'EMISION_OFICIAL' && (
          <div className="space-y-6 animate-fadeIn">
            <h2 className="text-2xl font-bold text-emerald-950 border-b border-slate-300 pb-2">Módulo de Emisión Oficial</h2>
            <div className="bg-white p-12 rounded-xl shadow-lg border border-slate-200 text-center">
              <span className="text-5xl mb-4 block">🏗️</span>
              <h3 className="text-xl font-bold text-emerald-900 mb-2">Espacio reservado para Constancias de Residencia</h3>
              <p className="text-slate-500 max-w-lg mx-auto">En el siguiente paso, inyectaremos aquí el código de tu proyecto <b>carta_residencia</b> para unificar todo el sistema administrativo de la Torre D-10.</p>
            </div>
          </div>
        )}

        {/* PESTAÑA 7: GESTIÓN DE DATOS (SKELETON PARA FUSIÓN) */}
        {activeTab === 'GESTION_DATOS' && (
          <div className="space-y-6 animate-fadeIn">
            <h2 className="text-2xl font-bold text-emerald-950 border-b border-slate-300 pb-2">Gestión de Datos (Base Maestra)</h2>
            <div className="bg-white p-12 rounded-xl shadow-lg border border-slate-200 text-center">
              <span className="text-5xl mb-4 block">🗄️</span>
              <h3 className="text-xl font-bold text-emerald-900 mb-2">Censo de Propietarios y Fechas de Ingreso</h3>
              <p className="text-slate-500 max-w-lg mx-auto">Esta pestaña controlará la base de datos de los residentes. Sus "Fechas de Ingreso" serán utilizadas por la Pestaña 2 para calcular el Estado de Cuenta exacto de cada apartamento.</p>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}