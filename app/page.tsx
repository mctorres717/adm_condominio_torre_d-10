"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://spdhfslvbslsuuzckmqr.supabase.co',
  'sb_publishable_DH68PA1DWbc66PALwVDyXA_dHLQPrL1'
);

type TabType = 'RESUMEN' | 'BUSQUEDA' | 'BASE_DATOS' | 'GASTOS_GRAL' | 'GASTOS_MENSUAL' | 'EMISION_OFICIAL' | 'GESTION_DATOS';

const numeroALetras = (num: number): string => {
  const u = ['cero', 'un', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve', 'diez', 'once', 'doce', 'trece', 'catorce', 'quince', 'dieciséis', 'diecisiete', 'dieciocho', 'diecinueve', 'veinte', 'veintiuno', 'veintidós', 'veintitrés', 'veinticuatro', 'veinticinco', 'veintiséis', 'veintisiete', 'veintiocho', 'veintinueve', 'treinta', 'treinta y un'];
  return u[num] || num.toString();
};

const mesesLetras = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const mesesDelAno = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

// --- CONSTANTES DEL NEGOCIO RESTAURADAS ---
const CUOTA_MENSUAL_USD = 10.00;
const ANO_INICIO_OPERACIONES = 2025;
const MES_INICIO_OPERACIONES = 0; // 0 = Enero en JavaScript

export default function ERPTorreD10() {
  const [isAuth, setIsAuth] = useState(false);
  const [pin, setPin] = useState('');
  const [activeTab, setActiveTab] = useState<TabType>('RESUMEN');

  // --- DATOS GLOBALES ---
  const [transacciones, setTransacciones] = useState<any[]>([]);
  const [pagosResidentes, setPagosResidentes] = useState<any[]>([]);
  const [propietarios, setPropietarios] = useState<any[]>([]);

  // --- FORMULARIOS ---
  const [formGasto, setFormGasto] = useState({ anio: new Date().getFullYear().toString(), mes: '', referencia: '', descripcion: '', gasto_usd: '', gasto_bs: '' });
  const [formPagoResidente, setFormPagoResidente] = useState({ apartamento: '', meses_seleccionados: [] as string[], anio_correspondiente: new Date().getFullYear().toString(), monto_pagado_usd: '', monto_pagado_bs: '', descripcion: '' });

  // --- FILTROS CONTABLES ---
  const [filtroAnio, setFiltroAnio] = useState('');
  const [filtroMes, setFiltroMes] = useState('');
  const [filtroPiso, setFiltroPiso] = useState('');
  const [filtroApto, setFiltroApto] = useState('');
  const [filtroAptoTab2, setFiltroAptoTab2] = useState('');
  const [filtroMesTab5, setFiltroMesTab5] = useState('');
  const [filtroAnioTab5, setFiltroAnioTab5] = useState(new Date().getFullYear().toString());

  // --- VARIABLES CARTA RESIDENCIA (TAB 6 Y 7) ---
  const [buscarTab6, setBuscarTab6] = useState('');
  const [isOpenTab6, setIsOpenTab6] = useState(false);
  const [propietarioSeleccionado, setPropietarioSeleccionado] = useState<any>(null);
  const [fechaManual, setFechaManual] = useState('');
  const [fechaActual, setFechaActual] = useState({ diaLetras: '', diaNumero: 0, mesLetters: '', anoNumero: 2026 });
  const [editingProp, setEditingProp] = useState<any>(null);
  const [pisoActivoTab7, setPisoActivoTab7] = useState('TODOS');

  const listaApartamentos = Array.from({ length: 14 }, (_, p) => ['A', 'B', 'C', 'D'].map(letra => `${p + 1}-${letra}`)).flat();
  const anioActualSistema = new Date().getFullYear();
  const listaAniosCarta = Array.from({ length: anioActualSistema - 2010 + 1 }, (_, i) => anioActualSistema - i);

  useEffect(() => {
    const hoy = new Date();
    setFechaManual(hoy.toISOString().split('T')[0]);
    setFechaActual({ diaLetras: numeroALetras(hoy.getDate()), diaNumero: hoy.getDate(), mesLetters: mesesDelAno[hoy.getMonth()], anoNumero: hoy.getFullYear() });
    if (typeof window !== 'undefined' && localStorage.getItem('finanzasAuth') === 'true') setIsAuth(true);
  }, []);

  useEffect(() => {
    if (!isAuth) return;
    let timeout: NodeJS.Timeout;
    const resetTimer = () => { clearTimeout(timeout); timeout = setTimeout(() => { alert('Sesión expirada.'); handleLogout(); }, 5 * 60 * 1000); };
    const ev = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    ev.forEach(e => window.addEventListener(e, resetTimer)); resetTimer();
    return () => { clearTimeout(timeout); ev.forEach(e => window.removeEventListener(e, resetTimer)); };
  }, [isAuth]);

  useEffect(() => {
    if (isAuth) { fetchTransacciones(); fetchPagosResidentes(); fetchPropietarios(); }
  }, [isAuth]);

  const fetchTransacciones = async () => {
    const { data } = await supabase.from('finanzas_d10').select('*').order('fecha', { ascending: true }).order('id', { ascending: true });
    if (data) {
      let sUSD = 0, sBS = 0;
      setTransacciones(data.map(t => { sUSD += (Number(t.ingreso_usd) - Number(t.gasto_usd)); sBS += (Number(t.ingreso_bs) - Number(t.gasto_bs)); return { ...t, saldo_usd: sUSD, saldo_bs: sBS }; }));
    }
  };

  const fetchPagosResidentes = async () => {
    const { data } = await supabase.from('pagos_residentes').select('*').order('created_at', { ascending: true });
    if (data) setPagosResidentes(data);
  };

  const fetchPropietarios = async () => {
    const { data } = await supabase.from('propietarios_d10').select('*');
    if (data) setPropietarios(data.sort((a, b) => a.apartamento.localeCompare(b.apartamento, undefined, { numeric: true, sensitivity: 'base' })));
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin === 'admin') { setIsAuth(true); if (typeof window !== 'undefined') localStorage.setItem('finanzasAuth', 'true'); }
    else alert('Clave de acceso denegada.');
  };

  const handleLogout = () => { setIsAuth(false); setPin(''); if (typeof window !== 'undefined') localStorage.removeItem('finanzasAuth'); };

  // --- ACCIONES DE ELIMINACIÓN ---
  const handleEliminarTransaccion = async (id: number) => {
    if (!window.confirm("⚠️ ¿Eliminar movimiento manual? Se recalculará la caja general.")) return;
    const { error } = await supabase.from('finanzas_d10').delete().eq('id', id);
    if (error) alert(error.message); else { alert("✅ Eliminado."); fetchTransacciones(); }
  };

  const handleEliminarPagoResidente = async (id: number) => {
    if (!window.confirm("⚠️ ¿Eliminar este recibo? Se recalculará el estado de cuenta del propietario.")) return;
    const { error } = await supabase.from('pagos_residentes').delete().eq('id', id);
    if (error) alert(error.message); else { alert("✅ Recibo eliminado."); fetchPagosResidentes(); }
  };

  const handleRegistrarMovimiento = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { fecha: new Date().toISOString(), anio: formGasto.anio, mes: formGasto.mes, referencia: formGasto.referencia || 'N/A', descripcion: formGasto.descripcion, ingreso_usd: 0, gasto_usd: Number(formGasto.gasto_usd)||0, ingreso_bs: 0, gasto_bs: Number(formGasto.gasto_bs)||0 };
    const { error } = await supabase.from('finanzas_d10').insert([payload]);
    if (error) alert(error.message); else { alert("✅ Gasto guardado."); setFormGasto({ anio: new Date().getFullYear().toString(), mes: '', referencia: '', descripcion: '', gasto_usd: '', gasto_bs: '' }); fetchTransacciones(); }
  };

  const handleRegistrarPagoResidente = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formPagoResidente.apartamento || formPagoResidente.meses_seleccionados.length === 0) return alert("Completa los campos obligatorios.");
    const piso = formPagoResidente.apartamento.split('-')[0];
    const mUSD = Number(formPagoResidente.monto_pagado_usd)||0, mBS = Number(formPagoResidente.monto_pagado_bs)||0;
    const mesesUnidos = formPagoResidente.meses_seleccionados.join(', ');

    const { error } = await supabase.from('pagos_residentes').insert([{ apartamento: formPagoResidente.apartamento, piso, mes_correspondiente: mesesUnidos, anio_correspondiente: formPagoResidente.anio_correspondiente, monto_pagado_usd: mUSD, monto_pagado_bs: mBS, estatus_solvencia: 'PAGADO', descripcion: formPagoResidente.descripcion || 'Abono de condominio' }]);
    if (error) return alert(error.message);

    if (mUSD > 0 || mBS > 0) {
      await supabase.from('finanzas_d10').insert([{ fecha: new Date().toISOString(), anio: formPagoResidente.anio_correspondiente, mes: formPagoResidente.meses_seleccionados[formPagoResidente.meses_seleccionados.length - 1], referencia: `Apto ${formPagoResidente.apartamento}`, descripcion: `Ingreso Condominio: ${formPagoResidente.descripcion || mesesUnidos}`, ingreso_usd: mUSD, gasto_usd: 0, ingreso_bs: mBS, gasto_bs: 0 }]);
    }
    alert("✅ Recaudación exitosa."); setFormPagoResidente({ apartamento: '', meses_seleccionados: [], anio_correspondiente: new Date().getFullYear().toString(), monto_pagado_usd: '', monto_pagado_bs: '', descripcion: '' });
    fetchPagosResidentes(); fetchTransacciones();
  };

  const handleSavePropietario = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from('propietarios_d10').update({ propietario: editingProp.propietario, cedula: editingProp.cedula, piso: editingProp.piso, inicio_mes: editingProp.inicio_mes, inicio_ano: editingProp.inicio_ano }).eq('id', editingProp.id);
    if (error) alert(error.message); else { alert("✅ Censo actualizado."); setEditingProp(null); fetchPropietarios(); }
  };

  const toggleMes = (mes: string) => {
    setFormPagoResidente(prev => {
      const s = prev.meses_seleccionados.includes(mes) ? prev.meses_seleccionados.filter(m => m !== mes) : [...prev.meses_seleccionados, mes];
      s.sort((a, b) => mesesDelAno.indexOf(a) - mesesDelAno.indexOf(b)); return { ...prev, meses_seleccionados: s };
    });
  };

  const handleCambioFechaManual = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFechaManual(e.target.value); const d = new Date(e.target.value + 'T12:00:00');
    setFechaActual({ diaLetras: numeroALetras(d.getDate()), diaNumero: d.getDate(), mesLetters: mesesDelAno[d.getMonth()], anoNumero: d.getFullYear() });
  };

  const handlePrint = (t: string) => { const o = document.title; document.title = t; window.print(); setTimeout(() => { document.title = o; }, 1000); };
  const formatMoney = (amount: number) => new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);

  // --- MOTOR CONTABLE CRONOLÓGICO CONCILIADO CON LA FECHA DE INGRESO REAL (TAB 2) ---
  const estadoDeCuentaGenerado = useMemo(() => {
    if (!filtroAptoTab2) return { lineas: [], deudaTotalUSD: 0, totalAbonadoUSD: 0, totalAbonadoBs: 0 };
    const resInfo = propietarios.find(p => p.apartamento === filtroAptoTab2);
    const pagosDelApto = pagosResidentes.filter(p => p.apartamento === filtroAptoTab2);
    const mapaPagos = new Map();
    let tUSD = 0, tBS = 0;

    pagosDelApto.forEach(p => {
      tUSD += Number(p.monto_pagado_usd); tBS += Number(p.monto_pagado_bs);
      p.mes_correspondiente.split(',').map((m: string) => m.trim()).forEach((m: string) => mapaPagos.set(`${m.toLowerCase()}-${p.anio_correspondiente}`, p));
    });

    // Fecha de inicio dinámica desde Pestaña 7 (Censo)
    let anioIterador = resInfo?.inicio_ano ? Number(resInfo.inicio_ano) : ANO_INICIO_OPERACIONES;
    let mesIterador = resInfo?.inicio_mes ? mesesDelAno.map(m => m.toLowerCase()).indexOf(resInfo.inicio_mes.toLowerCase()) : MES_INICIO_OPERACIONES;
    if (mesIterador === -1) mesIterador = 0;

    const lineas = []; let deudaAcumulada = 0;
    const hoy = new Date(); const aAct = hoy.getFullYear(), mAct = hoy.getMonth();

    while (anioIterador < aAct || (anioIterador === aAct && mesIterador <= mAct)) {
      const nomMes = mesesDelAno[mesIterador];
      const clave = `${nomMes.toLowerCase()}-${anioIterador}`;
      const pago = mapaPagos.get(clave);

      if (pago) {
        lineas.push({ periodo: `${nomMes} ${anioIterador}`, estatus: 'PAGADO', cargos: 0, desc: pago.descripcion, fecha: new Date(pago.created_at).toLocaleDateString() });
      } else {
        lineas.push({ periodo: `${nomMes} ${anioIterador}`, estatus: 'PENDIENTE', cargos: CUOTA_MENSUAL_USD, desc: 'Cuota de Condominio', fecha: '-' });
        deudaAcumulada += CUOTA_MENSUAL_USD;
      }
      mesIterador++; if (mesIterador > 11) { mesIterador = 0; anioIterador++; }
    }
    return { lineas, deudaTotalUSD: deudaAcumulada, totalAbonadoUSD: tUSD, totalAbonadoBs: tBS };
  }, [filtroAptoTab2, pagosResidentes, propietarios]);

  // --- REDUCERS FINANCIEROS GENERALES ---
  const totalIngresoUSD = transacciones.reduce((acc, t) => acc + Number(t.ingreso_usd), 0);
  const totalGastoUSD = transacciones.reduce((acc, t) => acc + Number(t.gasto_usd), 0);
  const saldoActualUSD = transacciones.length > 0 ? transacciones[transacciones.length - 1].saldo_usd : 0;
  const totalIngresoBs = transacciones.reduce((acc, t) => acc + Number(t.ingreso_bs), 0);
  const totalGastoBs = transacciones.reduce((acc, t) => acc + Number(t.gasto_bs), 0);
  const saldoActualBs = transacciones.length > 0 ? transacciones[transacciones.length - 1].saldo_bs : 0;

  const dataResidentesFiltrada = pagosResidentes.filter(p => (filtroAnio === '' || p.anio_correspondiente.includes(filtroAnio)) && (filtroMes === '' || p.mes_correspondiente.includes(filtroMes)) && (filtroPiso === '' || p.piso.includes(filtroPiso)) && (filtroApto === '' || p.apartamento.toLowerCase().includes(filtroApto.toLowerCase())));
  const transaccionesMesTab5 = transacciones.filter(t => t.mes === filtroMesTab5 && t.anio === filtroAnioTab5);
  const mIngUSD = transaccionesMesTab5.reduce((acc, t) => acc + Number(t.ingreso_usd), 0), mGstUSD = transaccionesMesTab5.reduce((acc, t) => acc + Number(t.gasto_usd), 0);
  const mIngBS = transaccionesMesTab5.reduce((acc, t) => acc + Number(t.ingreso_bs), 0), mGstBS = transaccionesMesTab5.reduce((acc, t) => acc + Number(t.gasto_bs), 0);

  const listaFiltradaCarta = propietarios.filter(p => p.apartamento?.toLowerCase().includes(buscarTab6.toLowerCase()) || p.propietario?.toLowerCase().includes(buscarTab6.toLowerCase()));
  const pisosUnicosTab7 = Array.from(new Set(propietarios.map(p => p.piso).filter(Boolean))).sort((a, b) => Number(a) - Number(b));
  const propietariosFiltradosTab7 = pisoActivoTab7 === 'TODOS' ? propietarios : propietarios.filter(p => p.piso === pisoActivoTab7);

  if (!isAuth) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <form onSubmit={handleLogin} className="bg-slate-800 border border-slate-700 p-8 rounded-2xl shadow-2xl w-full max-w-sm">
          <h1 className="text-xl font-bold text-center text-white uppercase tracking-widest mb-6">Torre D-10 ERP</h1>
          <input type="password" placeholder="Clave Tesorería" className="w-full bg-slate-950 border border-slate-800 text-center rounded-lg p-3 text-white font-mono font-bold tracking-widest mb-6 outline-none focus:border-emerald-600" value={pin} onChange={e => setPin(e.target.value)} />
          <button type="submit" className="w-full bg-emerald-800 hover:bg-emerald-700 text-white font-bold py-3 rounded-lg uppercase text-xs tracking-wider">Desbloquear Sistema</button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans antialiased pb-12 print:bg-white print:text-black print:p-0">
      
      {/* HEADER PRINCIPAL DEL ERP */}
      <header className="no-print bg-slate-900 border-b border-slate-800 py-4 px-6 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto flex flex-col gap-4">
          <div className="flex items-center justify-between w-full">
            <div className="w-1/3 flex items-center gap-3">
              <span className="text-2xl">🏛️</span>
              <div><h1 className="text-sm font-bold text-white uppercase tracking-widest">Torre D-10</h1><h2 className="text-[10px] text-slate-400 uppercase tracking-widest">Enterprise Resource Planning</h2></div>
            </div>
            <div className="w-1/3 text-center"><span className="bg-emerald-950 text-emerald-400 text-[10px] px-3 py-1 rounded-full border border-emerald-900 font-mono tracking-widest">CONTABILIDAD INTEGRADA</span></div>
            <div className="w-1/3 flex justify-end"><button onClick={handleLogout} className="text-[9px] bg-slate-800 hover:bg-slate-700 text-white px-3 py-1.5 rounded font-bold uppercase tracking-widest border border-slate-700">Cerrar Sesión</button></div>
          </div>
          
          <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800 overflow-x-auto gap-1">
            {[
              { id: 'RESUMEN', label: '1. Resumen' }, { id: 'BUSQUEDA', label: '2. Búsqueda' }, { id: 'BASE_DATOS', label: '3. Recaudación' }, 
              { id: 'GASTOS_GRAL', label: '4. Gastos' }, { id: 'GASTOS_MENSUAL', label: '5. Cierre Mensual' },
              { id: 'EMISION_OFICIAL', label: '6. Emisión Oficial' }, { id: 'GESTION_DATOS', label: '7. Gestión de Datos' }
            ].map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id as TabType)} className={`flex-none py-2 px-3 text-[10px] font-bold uppercase tracking-wider rounded transition-all ${activeTab === tab.id ? 'bg-slate-800 text-white border border-slate-700' : 'text-slate-400 hover:text-white'}`}>{tab.label}</button>
            ))}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 md:px-6 pt-8">
        
        {/* PESTAÑA 1: RESUMEN */}
        {activeTab === 'RESUMEN' && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold border-b border-slate-800 pb-2 text-slate-300">Resumen Financiero Consolidado</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-slate-900 p-6 rounded-xl border border-slate-800"><p className="text-[10px] text-slate-400 uppercase font-bold mb-1">Total Ingresos USD</p><p className="text-2xl font-mono font-bold text-emerald-500">${formatMoney(totalIngresoUSD)}</p></div>
              <div className="bg-slate-900 p-6 rounded-xl border border-slate-800"><p className="text-[10px] text-slate-400 uppercase font-bold mb-1">Total Gastos USD</p><p className="text-2xl font-mono font-bold text-red-500">${formatMoney(totalGastoUSD)}</p></div>
              <div className="bg-slate-900 p-6 rounded-xl border border-emerald-900 bg-emerald-950/10"><p className="text-[10px] text-emerald-400 uppercase font-bold mb-1">Saldo Actual USD</p><p className="text-3xl font-mono font-bold text-white">${formatMoney(saldoActualUSD)}</p></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-slate-900 p-6 rounded-xl border border-slate-800"><p className="text-[10px] text-slate-400 uppercase font-bold mb-1">Total Ingresos Bs</p><p className="text-2xl font-mono font-bold text-emerald-500">Bs {formatMoney(totalIngresoBs)}</p></div>
              <div className="bg-slate-900 p-6 rounded-xl border border-slate-800"><p className="text-[10px] text-slate-400 uppercase font-bold mb-1">Total Gastos Bs</p><p className="text-2xl font-mono font-bold text-red-500">Bs {formatMoney(totalGastoBs)}</p></div>
              <div className="bg-slate-900 p-6 rounded-xl border border-slate-800"><p className="text-[10px] text-slate-400 uppercase font-bold mb-1">Saldo Actual Bs</p><p className="text-3xl font-mono font-bold text-amber-500">Bs {formatMoney(saldoActualBs)}</p></div>
            </div>
          </div>
        )}

        {/* PESTAÑA 2: ESTADO DE CUENTA INTELIGENTE */}
        {activeTab === 'BUSQUEDA' && (
          <div className="space-y-6">
            <div className="no-print flex justify-between items-center border-b border-slate-800 pb-2">
              <h2 className="text-xl font-bold text-slate-300">Auditoría Colectiva por Apartamento</h2>
              {filtroAptoTab2 && <button onClick={() => handlePrint(`Estado Cuenta Apto ${filtroAptoTab2}`)} className="bg-slate-800 hover:bg-slate-700 text-white font-bold py-2 px-4 rounded text-xs uppercase tracking-widest border border-slate-700">🖨️ Imprimir Estado</button>}
            </div>
            <div className="no-print bg-slate-900 p-6 rounded-xl border border-slate-800"><label className="block text-[10px] font-bold text-slate-400 uppercase mb-2">Seleccione Apartamento</label><select value={filtroAptoTab2} onChange={e => setFiltroAptoTab2(e.target.value)} className="p-3 bg-slate-950 border border-slate-800 rounded-lg text-sm font-bold text-emerald-400 focus:outline-none w-64">{<option value="">-- Buscar --</option>}{listaApartamentos.map(a => <option key={a} value={a}>{a}</option>)}</select></div>
            
            {filtroAptoTab2 && (
              <div className="print-area bg-slate-900 p-8 rounded-xl border border-slate-800 text-slate-100">
                <div className="border-b border-slate-800 pb-4 mb-6 flex justify-between items-start">
                  <div><h1 className="text-2xl font-bold tracking-widest">TORRE D-10</h1><p className="text-xs text-slate-400 uppercase tracking-widest mt-1">Estado de Cuenta Sincronizado</p></div>
                  <div className="text-right"><p className="text-xl font-bold text-emerald-400">APTO {filtroAptoTab2}</p><p className="text-[10px] text-slate-400 font-mono">Generado: {new Date().toLocaleDateString()}</p></div>
                </div>
                <div className="grid grid-cols-3 gap-6 mb-6">
                  <div className="bg-red-950/20 p-4 rounded-lg border border-red-900/40 text-center"><p className="text-[9px] text-red-400 uppercase tracking-widest font-bold">Deuda Acumulada</p><p className="text-2xl font-mono font-bold text-red-400">${formatMoney(estadoDeCuentaGenerado.deudaTotalUSD)}</p></div>
                  <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 text-center"><p className="text-[9px] text-slate-400 uppercase tracking-widest font-bold">Abonado USD</p><p className="text-2xl font-mono font-bold text-emerald-400">${formatMoney(estadoDeCuentaGenerado.totalAbonadoUSD)}</p></div>
                  <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 text-center"><p className="text-[9px] text-slate-400 uppercase tracking-widest font-bold">Abonado Bs</p><p className="text-2xl font-mono font-bold text-emerald-400">Bs {formatMoney(estadoDeCuentaGenerado.totalAbonadoBs)}</p></div>
                </div>
                <table className="w-full text-left text-xs whitespace-nowrap">
                  <thead className="bg-slate-950 text-slate-400 font-mono uppercase text-[9px]"><tr><th className="p-3">Periodo</th><th className="p-3">Estatus</th><th className="p-3">Fecha de Operación</th><th className="p-3 text-right">Cargo Deuda</th><th className="p-3 text-right">Descripción Referencial</th></tr></thead>
                  <tbody className="divide-y divide-slate-800">
                    {estadoDeCuentaGenerado.lineas.map((l, i) => (
                      <tr key={i} className={l.estatus === 'PENDIENTE' ? 'bg-red-950/5' : ''}>
                        <td className="p-3 font-semibold">{l.periodo}</td>
                        <td className="p-3"><span className={`px-2 py-0.5 rounded text-[9px] font-bold tracking-wider ${l.estatus === 'PAGADO' ? 'bg-emerald-950 text-emerald-400 border border-emerald-900' : 'bg-red-950 text-red-400 border border-red-900'}`}>{l.estatus}</span></td>
                        <td className="p-3 font-mono text-slate-400">{l.fecha}</td>
                        <td className="p-3 text-right font-mono text-slate-300">{l.cargos > 0 ? `$${formatMoney(l.cargos)}` : '-'}</td>
                        <td className="p-3 text-right text-slate-400 font-mono text-[10px]">{l.desc}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* PESTAÑA 3: RECAUDACIÓN (CON BOTÓN ELIMINAR) */}
        {activeTab === 'BASE_DATOS' && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold border-b border-slate-800 pb-2 text-slate-300">Libro Mayor de Cobros Manuales</h2>
            <form onSubmit={handleRegistrarPagoResidente} className="bg-slate-900 p-6 rounded-xl border border-slate-800">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mb-4">
                <div className="md:col-span-3"><label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Apartamento</label><select value={formPagoResidente.apartamento} onChange={e => setFormPagoResidente({...formPagoResidente, apartamento: e.target.value})} className="w-full p-3 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white" required><option value="">-- Elegir --</option>{listaApartamentos.map(a => <option key={a} value={a}>{a}</option>)}</select></div>
                <div className="md:col-span-2"><label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Año</label><input type="text" value={formPagoResidente.anio_correspondiente} onChange={e => setFormPagoResidente({...formPagoResidente, anio_correspondiente: e.target.value})} className="w-full p-3 bg-slate-950 border border-slate-800 rounded-lg text-sm font-mono text-white" required /></div>
                <div className="md:col-span-7"><label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Meses Cubiertos</label><div className="grid grid-cols-3 lg:grid-cols-4 gap-2 bg-slate-950 p-2 rounded-lg border border-slate-800">{mesesDelAno.map(m => (<label key={m} className="flex items-center space-x-2 text-xs font-mono text-slate-300 cursor-pointer"><input type="checkbox" checked={formPagoResidente.meses_seleccionados.includes(m)} onChange={() => toggleMes(m)} className="accent-emerald-600" /><span>{m}</span></label>))}</div></div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mb-4">
                <div className="md:col-span-3"><label className="block text-[10px] font-bold text-emerald-400 uppercase mb-1">Monto USD</label><input type="number" step="0.01" placeholder="0.00" value={formPagoResidente.monto_pagado_usd} onChange={e => setFormPagoResidente({...formPagoResidente, monto_pagado_usd: e.target.value})} className="w-full p-3 bg-slate-950 border border-slate-800 rounded-lg text-sm font-mono text-white" /></div>
                <div className="md:col-span-3"><label className="block text-[10px] font-bold text-emerald-400 uppercase mb-1">Monto Bs</label><input type="number" step="0.01" placeholder="0.00" value={formPagoResidente.monto_pagado_bs} onChange={e => setFormPagoResidente({...formPagoResidente, monto_pagado_bs: e.target.value})} className="w-full p-3 bg-slate-950 border border-slate-800 rounded-lg text-sm font-mono text-white" /></div>
                <div className="md:col-span-6"><label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Descripción referencial del abono</label><input type="text" placeholder="Ej. Pago móvil BCV..." value={formPagoResidente.descripcion} onChange={e => setFormPagoResidente({...formPagoResidente, descripcion: e.target.value})} className="w-full p-3 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white" /></div>
              </div>
              <div className="flex justify-end"><button type="submit" className="bg-emerald-800 hover:bg-emerald-700 text-white font-bold py-3 px-6 rounded-lg text-xs uppercase tracking-widest">💾 Registrar Abono</button></div>
            </form>
            <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-x-auto">
              <table className="w-full text-left text-xs whitespace-nowrap">
                <thead className="bg-slate-950 text-slate-400 font-mono uppercase text-[9px]"><tr><th className="p-4">Nivel</th><th className="p-4">Apartamento</th><th className="p-4">Periodo Cancelado</th><th className="p-4">Descripción</th><th className="p-4 text-right">Recibo USD</th><th className="p-4 text-right">Recibo Bs</th><th className="p-4 text-center">Acciones</th></tr></thead>
                <tbody className="divide-y divide-slate-800">
                  {dataResidentesFiltrada.map(item => (
                    <tr key={item.id} className="hover:bg-slate-800/40">
                      <td className="p-4 font-mono text-slate-400">Piso {item.piso}</td><td className="p-4 font-bold text-emerald-400">{item.apartamento}</td><td className="p-4 font-medium">{item.mes_correspondiente} {item.anio_correspondiente}</td><td className="p-4 text-slate-400 text-[11px] font-mono">{item.descripcion}</td><td className="p-4 text-right font-mono font-bold text-emerald-500">${formatMoney(item.monto_pagado_usd)}</td><td className="p-4 text-right font-mono font-bold text-emerald-500">Bs {formatMoney(item.monto_pagado_bs)}</td>
                      <td className="p-4 text-center"><button onClick={() => handleEliminarPagoResidente(item.id)} className="bg-red-950 text-red-400 hover:bg-red-500 hover:text-white px-2 py-1 rounded text-xs border border-red-900 transition-colors">🗑️</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* PESTAÑA 4: GASTOS (CON BOTÓN ELIMINAR) */}
        {activeTab === 'GASTOS_GRAL' && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold border-b border-slate-800 pb-2 text-slate-300">Libro Diario de Egresos Operativos</h2>
            <form onSubmit={handleRegistrarMovimiento} className="bg-slate-900 p-6 rounded-xl border border-slate-800">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                <input type="text" placeholder="Año" value={formGasto.anio} onChange={e => setFormGasto({...formGasto, anio: e.target.value})} className="p-3 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white" required />
                <select value={formGasto.mes} onChange={e => setFormGasto({...formGasto, mes: e.target.value})} className="p-3 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white bg-white" required><option value="">-- Mes --</option>{mesesDelAno.map(m => <option key={m} value={m}>{m}</option>)}</select>
                <input type="text" placeholder="Factura Ref" value={formGasto.referencia} onChange={e => setFormGasto({...formGasto, referencia: e.target.value})} className="p-3 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white" />
                <input type="text" placeholder="Descripción del Egreso" value={formGasto.descripcion} onChange={e => setFormGasto({...formGasto, descripcion: e.target.value})} className="p-3 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white" required />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 bg-red-950/10 p-4 rounded-lg border border-red-900/20">
                <div><label className="block text-[10px] font-bold text-red-400 mb-1">Salida USD (-)</label><input type="number" step="0.01" value={formGasto.gasto_usd} onChange={e => setFormGasto({...formGasto, gasto_usd: e.target.value})} className="w-full p-3 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white font-mono" /></div>
                <div><label className="block text-[10px] font-bold text-red-400 mb-1">Salida Bs (-)</label><input type="number" step="0.01" value={formGasto.gasto_bs} onChange={e => setFormGasto({...formGasto, gasto_bs: e.target.value})} className="w-full p-3 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white font-mono" /></div>
              </div>
              <div className="flex justify-end"><button type="submit" className="bg-red-900 hover:bg-red-800 text-white font-bold py-3 px-6 rounded-lg text-xs uppercase tracking-widest">💾 Cargar Egreso</button></div>
            </form>
            <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-x-auto">
               <table className="w-full text-left text-xs whitespace-nowrap">
                 <thead className="bg-slate-950 text-slate-400 font-mono uppercase text-[9px]"><tr><th className="p-4">Periodo</th><th className="p-4">Descripción / Ref</th><th className="p-4 text-right text-emerald-400">Ingreso $</th><th className="p-4 text-right text-red-400">Gasto $</th><th className="p-4 text-right">Saldo $</th><th className="p-4 text-right text-emerald-400">Ingreso Bs</th><th className="p-4 text-right text-red-400">Gasto Bs</th><th className="p-4 text-right">Saldo Bs</th><th className="p-4 text-center">Acciones</th></tr></thead>
                 <tbody className="divide-y divide-slate-800">
                    {transacciones.map(t => (
                      <tr key={t.id} className="hover:bg-slate-800/40">
                        <td className="p-4 font-mono"><span className="font-bold">{t.anio}</span> <span className="text-slate-400 text-[10px]">{t.mes}</span></td>
                        <td className="p-4"><div className="font-medium text-slate-200">{t.descripcion}</div><div className="text-[10px] text-slate-500 font-mono">Ref: {t.referencia}</div></td>
                        <td className="p-4 text-right font-mono text-emerald-500">{Number(t.ingreso_usd) > 0 ? `+${formatMoney(t.ingreso_usd)}` : '-'}</td>
                        <td className="p-4 text-right font-mono text-red-500">{Number(t.gasto_usd) > 0 ? `-${formatMoney(t.gasto_usd)}` : '-'}</td>
                        <td className="p-4 text-right font-mono font-bold bg-slate-950/40">{formatMoney(t.saldo_usd)}</td>
                        <td className="p-4 text-right font-mono text-emerald-500">{Number(t.ingreso_bs) > 0 ? `+${formatMoney(t.ingreso_bs)}` : '-'}</td>
                        <td className="p-4 text-right font-mono text-red-500">{Number(t.gasto_bs) > 0 ? `-${formatMoney(t.gasto_bs)}` : '-'}</td>
                        <td className="p-4 text-right font-mono font-bold bg-slate-950/40">{formatMoney(t.saldo_bs)}</td>
                        <td className="p-4 text-center"><button onClick={() => handleEliminarTransaccion(t.id)} className="bg-red-950 text-red-400 hover:bg-red-500 hover:text-white px-2 py-1 rounded text-xs border border-red-900 transition-colors">🗑️</button></td>
                      </tr>
                    ))}
                 </tbody>
               </table>
            </div>
          </div>
        )}

        {/* PESTAÑA 5: CIERRE MENSUAL */}
        {activeTab === 'GASTOS_MENSUAL' && (
          <div className="space-y-6">
            <div className="no-print flex justify-between items-center border-b border-slate-800 pb-2"><h2 className="text-xl font-bold text-slate-300">Cierre Contable Mensual</h2>{filtroMesTab5 && <button onClick={() => handlePrint(`Cierre Mensual - ${filtroMesTab5} ${filtroAnioTab5}`)} className="bg-slate-800 hover:bg-slate-700 text-white font-bold py-2 px-4 rounded text-xs border border-slate-700">🖨️ Imprimir Cierre</button>}</div>
            <div className="no-print bg-slate-900 p-6 rounded-xl border border-slate-800 flex gap-4"><div className="w-1/4"><label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Año</label><input type="text" value={filtroAnioTab5} onChange={e => setFiltroAnioTab5(e.target.value)} className="w-full p-3 bg-slate-950 border border-slate-800 rounded-lg text-sm font-mono text-white" /></div><div className="w-1/3"><label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Seleccione Mes</label><select value={filtroMesTab5} onChange={e => setFiltroMesTab5(e.target.value)} className="w-full p-3 bg-slate-950 border border-slate-800 rounded-lg text-sm font-bold text-white"><option value="">-- Mes --</option>{mesesDelAno.map(m => <option key={m} value={m}>{m}</option>)}</select></div></div>
            {filtroMesTab5 && (
              <div className="print-area bg-slate-900 p-8 rounded-xl border border-slate-800">
                <div className="grid grid-cols-2 gap-6 mb-6">
                  <div className="bg-slate-950 p-4 rounded-lg border border-slate-800"><p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Neto USD</p><div className="flex justify-between text-xs mb-1"><span>Ingresos:</span><span className="text-emerald-400">+${formatMoney(mIngUSD)}</span></div><div className="flex justify-between text-xs mb-1"><span>Egresos:</span><span className="text-red-400">-${formatMoney(mGstUSD)}</span></div><div className="flex justify-between text-sm border-t border-slate-800 pt-1 font-bold"><span>Total:</span><span className={mIngUSD - mGstUSD >= 0 ? 'text-emerald-400' : 'text-red-400'}>${formatMoney(mIngUSD - mGstUSD)}</span></div></div>
                  <div className="bg-slate-950 p-4 rounded-lg border border-slate-800"><p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Neto Bolívares</p><div className="flex justify-between text-xs mb-1"><span>Ingresos:</span><span className="text-emerald-400">+Bs {formatMoney(mIngBS)}</span></div><div className="flex justify-between text-xs mb-1"><span>Egresos:</span><span className="text-red-400">-Bs {formatMoney(mGstBS)}</span></div><div className="flex justify-between text-sm border-t border-slate-800 pt-1 font-bold"><span>Total:</span><span className={mIngBS - mGstBS >= 0 ? 'text-emerald-400' : 'text-red-400'}>Bs {formatMoney(mIngBS - mGstBS)}</span></div></div>
                </div>
                <table className="w-full text-left text-[11px] whitespace-nowrap"><thead className="bg-slate-950 text-slate-400 uppercase text-[9px]"><tr><th className="p-2">ID</th><th className="p-2">Descripción</th><th className="p-2 text-right">Ingreso $</th><th className="p-2 text-right">Egreso $</th><th className="p-2 text-right">Saldo $</th><th className="p-2 text-right">Ingreso Bs</th><th className="p-2 text-right">Egreso Bs</th><th className="p-2 text-right">Saldo Bs</th></tr></thead><tbody className="divide-y divide-slate-800">{transaccionesMesTab5.map(t => (<tr key={t.id}><td className="p-2 text-slate-500 font-mono">#{t.id}</td><td className="p-2 text-slate-200 font-medium truncate max-w-[180px]">{t.descripcion}</td><td className="p-2 text-right font-mono text-emerald-400">{Number(t.ingreso_usd) > 0 ? `+${formatMoney(t.ingreso_usd)}` : '-'}</td><td className="p-2 text-right font-mono text-red-400">{Number(t.gasto_usd) > 0 ? `-${formatMoney(t.gasto_usd)}` : '-'}</td><td className="p-2 text-right font-mono font-bold bg-slate-950/20">{formatMoney(t.saldo_usd)}</td><td className="p-2 text-right font-mono text-emerald-400">{Number(t.ingreso_bs) > 0 ? `+${formatMoney(t.ingreso_bs)}` : '-'}</td><td className="p-2 text-right font-mono text-red-400">{Number(t.gasto_bs) > 0 ? `-${formatMoney(t.gasto_bs)}` : '-'}</td><td className="p-2 text-right font-mono font-bold bg-slate-950/20">{formatMoney(t.saldo_bs)}</td></tr>))}</tbody></table>
              </div>
            )}
          </div>
        )}

        {/* PESTAÑA 6: EMISIÓN OFICIAL DE CARTA (INTEGRADA AL 100%) */}
        {activeTab === 'EMISION_OFICIAL' && (
          <div className="no-print max-w-3xl mx-auto space-y-6">
            <h2 className="text-xl font-bold border-b border-slate-800 pb-2 text-slate-300">Emisión de Constancia de Residencia</h2>
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl flex gap-4 items-end relative z-30">
              <div className="w-2/3 relative">
                <label className="block text-xs font-bold uppercase text-slate-400 mb-2">Seleccionar Vecino Censado</label>
                <div className="flex">
                  <input type="text" className="w-full bg-slate-950 border border-slate-800 rounded-l-xl p-3 text-sm text-white focus:outline-none" placeholder="Buscar por apto o nombre..." value={buscarTab6} onChange={(e) => { setBuscarTab6(e.target.value); setIsOpenTab6(true); }} onFocus={() => setIsOpenTab6(true)} />
                  <button onClick={() => setIsOpenTab6(!isOpenTab6)} className="bg-slate-800 border border-slate-700 rounded-r-xl px-3 text-slate-400">▼</button>
                </div>
                {isOpenTab6 && (
                  <ul className="absolute left-0 right-0 mt-1 max-h-48 bg-slate-900 border border-slate-800 rounded-xl overflow-y-auto shadow-2xl z-50 divide-y divide-slate-800 custom-scrollbar">
                    {listaFiltradaCarta.map((item, idx) => (
                      <li key={idx} onClick={() => { setPropietarioSeleccionado(item); setBuscarTab6(item.apartamento); setIsOpenTab6(false); }} className="p-3 text-sm text-slate-300 hover:bg-slate-800 cursor-pointer flex justify-between items-center">
                        <span className="font-bold bg-slate-950 px-2 py-0.5 rounded text-white border border-slate-800">{item.apartamento}</span>
                        <span className="text-xs uppercase font-mono">{item.propietario || 'Disponible'}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="w-1/3">
                <label className="block text-xs font-bold uppercase text-slate-400 mb-2">Fecha Emisión</label>
                <input type="date" value={fechaManual} onChange={handleCambioFechaManual} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-white" />
              </div>
            </div>
            <button onClick={() => handlePrint(`Carta Residencia Apto ${propietarioSeleccionado?.apartamento}`)} disabled={!propietarioSeleccionado} className={`w-full py-4 rounded-xl font-bold uppercase tracking-widest text-xs transition-all shadow-xl ${propietarioSeleccionado ? 'bg-blue-600 hover:bg-blue-500 text-white' : 'bg-slate-900 text-slate-600 cursor-not-allowed border border-slate-800'}`}>🖨️ Generar Constancia de Residencia Oficial</button>
          </div>
        )}

        {/* PESTAÑA 7: GESTIÓN DE DATOS (INTEGRADA AL 100%) */}
        {activeTab === 'GESTION_DATOS' && (
          <div className="no-print flex gap-6 animate-fadeIn">
            <div className="w-48 flex flex-col gap-2">
              <button onClick={() => setPisoActivoTab7('TODOS')} className={`px-4 py-3 rounded-xl text-left text-xs font-bold uppercase transition-colors ${pisoActivoTab7 === 'TODOS' ? 'bg-blue-600 text-white' : 'bg-slate-900 text-slate-400 border border-slate-800 hover:bg-slate-800'}`}>🏢 Todos los Pisos</button>
              {pisosUnicosTab7.map(p => (<button key={p} onClick={() => setPisoActivoTab7(p as string)} className={`px-4 py-2.5 rounded-xl text-left text-xs font-bold uppercase transition-colors ${pisoActivoTab7 === p ? 'bg-slate-800 text-white border border-slate-700' : 'bg-slate-900 text-slate-400 border border-slate-800 hover:bg-slate-800'}`}>Nivel {p}</button>))}
            </div>
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-4 h-fit">
              {propietariosFiltradosTab7.map(item => {
                const nombre = item.propietario?.trim().toLowerCase() || '';
                const vacio = (nombre === '' || nombre === 'vacío' || nombre === 'vacio');
                return (
                  <div key={item.id} className="p-4 rounded-xl border border-slate-800 bg-slate-900 flex flex-col justify-between hover:border-slate-700">
                    <div className="flex justify-between items-start mb-3">
                      <div><span className="text-lg font-bold text-white">Apto {item.apartamento}</span><span className="text-xs font-medium text-blue-400 block uppercase mt-0.5">{item.propietario || 'Sin Registro'}</span></div>
                      <span className={`text-[9px] font-mono uppercase tracking-widest px-2 py-0.5 rounded border ${vacio ? 'bg-red-950/40 text-red-400 border-red-900/40' : 'bg-emerald-950/40 text-emerald-400 border-emerald-900/40'}`}>{vacio ? 'Disponible' : 'Censado'}</span>
                    </div>
                    <div className="text-[11px] font-mono text-slate-400 space-y-1 border-t border-slate-800 pt-2 mb-3">
                      <div className="flex justify-between"><span>CÉDULA:</span><span className="text-slate-200 font-sans">{item.cedula || 'Pendiente'}</span></div>
                      <div className="flex justify-between"><span>FECHA DE INGRESO:</span><span className="text-slate-200 font-sans uppercase">{item.inicio_mes ? `${item.inicio_mes} ${item.inicio_ano}` : 'Pendiente'}</span></div>
                    </div>
                    <button onClick={() => setEditingProp(item)} className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-2 rounded text-xs uppercase border border-slate-700">Modificar Registro</button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* MODAL EJECUTIVO EDICIÓN CENSO */}
        {editingProp && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 no-print">
            <form onSubmit={handleSavePropietario} className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-md space-y-4">
              <h3 className="text-base font-bold uppercase text-white border-b border-slate-800 pb-2">Editar Apartamento {editingProp.apartamento}</h3>
              <div><label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Propietario</label><input type="text" value={editingProp.propietario || ''} onChange={e => setEditingProp({...editingProp, propietario: e.target.value})} className="w-full bg-slate-950 border border-slate-800 p-2.5 rounded text-sm text-white" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Cédula</label><input type="text" value={editingProp.cedula || ''} onChange={e => setEditingProp({...editingProp, cedula: e.target.value})} className="w-full bg-slate-950 border border-slate-800 p-2.5 rounded text-sm text-white" /></div>
                <div><label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Piso</label><input type="text" value={editingProp.piso || ''} onChange={e => setEditingProp({...editingProp, piso: e.target.value})} className="w-full bg-slate-950 border border-slate-800 p-2.5 rounded text-sm text-white" /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Mes Ingreso</label><select value={editingProp.inicio_mes || ''} onChange={e => setEditingProp({...editingProp, inicio_mes: e.target.value})} className="w-full bg-slate-950 border border-slate-800 p-2.5 rounded text-sm text-white capitalize">{<option value="">-- Mes --</option>}{mesesLetras.map(m => <option key={m} value={m}>{m}</option>)}</select></div>
                <div><label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Año Ingreso</label><select value={editingProp.inicio_ano || ''} onChange={e => setEditingProp({...editingProp, inicio_ano: e.target.value})} className="w-full bg-slate-950 border border-slate-800 p-2.5 rounded text-sm text-white">{<option value="">-- Año --</option>}{listaAniosCarta.map(a => <option key={a} value={a}>{a}</option>)}</select></div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setEditingProp(null)} className="flex-1 bg-slate-800 text-slate-300 font-bold py-2.5 rounded text-xs uppercase border border-slate-700">Cerrar</button>
                <button type="submit" className="flex-1 bg-blue-600 text-white font-bold py-2.5 rounded text-xs uppercase shadow-lg">Guardar Cambios</button>
              </div>
            </form>
          </div>
        )}

      </main>

      {/* ÁREA DE RENDER IMPRESIÓN OFICIAL CARTA DE RESIDENCIA */}
      {activeTab === 'EMISION_OFICIAL' && propietarioSeleccionado && (
        <div className="print-area max-w-[800px] mx-auto bg-white text-black mt-8 p-[2cm] text-justify flex flex-col justify-between" style={{ fontFamily: 'Times New Roman, serif', fontSize: '12pt', minHeight: '10.5in' }}>
          <div>
            <div className="flex justify-between items-center border-b-2 border-black pb-2 mb-6">
              <span className="text-xl font-serif font-bold">REPÚBLICA BOLIVARIANA DE VENEZUELA</span>
              <span className="text-sm font-bold font-serif">TORRE D-10</span>
            </div>
            <h2 className="text-center font-bold underline uppercase mb-8" style={{ fontSize: '16pt' }}>Constancia de Residencia</h2>
            <p className="mb-4 font-normal" style={{ lineHeight: '1.6', textIndent: '1cm' }}>
              Quienes suscriben, en representación del <strong>COMITÉ MULTIFAMILIAR DE GESTIÓN (C.M.G.) DE LA TORRE D-10</strong>, en el ejercicio de nuestras facultades como Voceros Principales del referido Comité en el Urbanismo "Simón Bolívar", Sector D, Ciudad Tiuna, por medio de la presente, hacemos constar que el (la) ciudadano (a) <strong className="uppercase">{propietarioSeleccionado.propietario}</strong>, titular de la cédula de identidad N° <strong>V-{propietarioSeleccionado.cedula}</strong>, habita en la: <strong>Torre D-10, Piso {propietarioSeleccionado.piso}, Apartamento {propietarioSeleccionado.apartamento}</strong>, desde el mes de {propietarioSeleccionado.inicio_mes} del año {propietarioSeleccionado.inicio_ano}.
            </p>
            <p className="mb-4" style={{ lineHeight: '1.6', textIndent: '1cm' }}>Tiempo durante el cual, el ciudadano ha mantenido una conducta ejemplar, observando los principios de convivencia ciudadana y respeto a las normas comunitarias establecidas en la edificación.</p>
            <p className="mb-4" style={{ lineHeight: '1.6', textIndent: '1cm' }}>Constancia que se expide a petición de la parte interesada en la ciudad de Caracas, a los {fechaActual.diaLetras} ({fechaActual.diaNumero}) días del mes de {fechaActual.mesLetters.toLowerCase()} del año {fechaActual.anoNumero}.</p>
          </div>
          <div>
            <div className="text-center mb-12"><p className="m-0">Atentamente,</p><strong>Comité Multifamiliar de Gestión de la TORRE D-10</strong></div>
            <div className="grid grid-cols-2 gap-12 text-center text-[11px]">
              <div><p className="border-t border-black pt-1"><b>Vocera Principal</b></p><p><b>Sindy Chacón</b></p><p>C.I V- 17.693.292</p></div>
              <div><p className="border-t border-black pt-1"><b>Vocero Principal</b></p><p><b>Marcos Díaz</b></p><p>C.I V- 16.662.440</p></div>
            </div>
            <p className="italic mt-6" style={{ fontSize: '7.5pt' }}><b>Nota: Se deja constancia que a la presente fecha el CMG de la torre D10, se encuentra en proceso de regularización ante la Inmobiliaria Nacional.</b></p>
          </div>
        </div>
      )}

    </div>
  );
}