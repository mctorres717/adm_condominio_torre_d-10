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

const CUOTA_MENSUAL_USD = 10.00;

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
  const [formPagoResidente, setFormPagoResidente] = useState({ apartamento: '', mes_seleccionado: '', anio_correspondiente: new Date().getFullYear().toString(), monto_pagado_usd: '', monto_pagado_bs: '', descripcion: '' });

  // --- FILTROS TAB 3 ---
  const [filtroAnio, setFiltroAnio] = useState('');
  const [filtroMes, setFiltroMes] = useState('');
  const [filtroPiso, setFiltroPiso] = useState('');
  const [filtroApto, setFiltroApto] = useState('');

  // --- FILTROS TAB 2 y 5 ---
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
  const [pisoActivoTab7, setPisoActivoTab7] = useState<string>('');

  const anioActualSistema = new Date().getFullYear();
  const listaAniosCarta = Array.from({ length: anioActualSistema - 2010 + 1 }, (_, i) => anioActualSistema - i);

  // Generar lista de apartamentos basándose en el censo (Garantiza los 120 reales)
  const listaApartamentos = [...new Set(propietarios.map(p => p.apartamento))].sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));

  useEffect(() => {
    const hoy = new Date();
    setFechaManual(hoy.toISOString().split('T')[0]);
    setFechaActual({ diaLetras: numeroALetras(hoy.getDate()), diaNumero: hoy.getDate(), mesLetters: mesesLetras[hoy.getMonth()], anoNumero: hoy.getFullYear() });
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

  // Al cargar propietarios, establecer el primer piso por defecto en Tab 7
  useEffect(() => {
    if (propietarios.length > 0 && !pisoActivoTab7) {
      const pisos = Array.from(new Set(propietarios.map(p => p.piso).filter(Boolean))).sort((a: any, b: any) => Number(a) - Number(b));
      if (pisos.length > 0) setPisoActivoTab7(pisos[0] as string);
    }
  }, [propietarios]);

  const fetchTransacciones = async () => {
    const { data } = await supabase.from('finanzas_d10').select('*').order('fecha', { ascending: true }).order('id', { ascending: true });
    if (data) {
      let sUSD = 0, sBS = 0;
      setTransacciones(data.map(t => { sUSD += (Number(t.ingreso_usd) - Number(t.gasto_usd)); sBS += (Number(t.ingreso_bs) - Number(t.gasto_bs)); return { ...t, saldo_usd: sUSD, saldo_bs: sBS }; }));
    }
  };

  const fetchPagosResidentes = async () => {
    // Se ordena por id ascendente para preservar el orden exacto del CSV importado.
    const { data } = await supabase.from('pagos_residentes').select('*').order('id', { ascending: true });
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
    if (!formPagoResidente.apartamento || !formPagoResidente.mes_seleccionado) return alert("Completa los campos obligatorios.");
    const piso = formPagoResidente.apartamento.split('-')[0];
    const mUSD = Number(formPagoResidente.monto_pagado_usd)||0, mBS = Number(formPagoResidente.monto_pagado_bs)||0;

    const { error } = await supabase.from('pagos_residentes').insert([{ apartamento: formPagoResidente.apartamento, piso, mes_correspondiente: formPagoResidente.mes_seleccionado, anio_correspondiente: formPagoResidente.anio_correspondiente, monto_pagado_usd: mUSD, monto_pagado_bs: mBS, estatus_solvencia: 'PAGADO', descripcion: formPagoResidente.descripcion || 'Abono de condominio' }]);
    if (error) return alert(error.message);

    if (mUSD > 0 || mBS > 0) {
      await supabase.from('finanzas_d10').insert([{ fecha: new Date().toISOString(), anio: formPagoResidente.anio_correspondiente, mes: formPagoResidente.mes_seleccionado, referencia: `Apto ${formPagoResidente.apartamento}`, descripcion: `Ingreso Condominio: ${formPagoResidente.descripcion || formPagoResidente.mes_seleccionado}`, ingreso_usd: mUSD, gasto_usd: 0, ingreso_bs: mBS, gasto_bs: 0 }]);
    }
    alert("✅ Recaudación exitosa."); setFormPagoResidente({ apartamento: '', mes_seleccionado: '', anio_correspondiente: new Date().getFullYear().toString(), monto_pagado_usd: '', monto_pagado_bs: '', descripcion: '' });
    fetchPagosResidentes(); fetchTransacciones();
  };

  const handleSavePropietario = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from('propietarios_d10').update({ propietario: editingProp.propietario, cedula: editingProp.cedula, piso: editingProp.piso, inicio_mes: editingProp.inicio_mes, inicio_ano: editingProp.inicio_ano }).eq('id', editingProp.id);
    if (error) alert(error.message); else { alert("✅ Censo actualizado."); setEditingProp(null); fetchPropietarios(); }
  };

  const handleCambioFechaManual = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFechaManual(e.target.value); const d = new Date(e.target.value + 'T12:00:00');
    setFechaActual({ diaLetras: numeroALetras(d.getDate()), diaNumero: d.getDate(), mesLetters: mesesLetras[d.getMonth()], anoNumero: d.getFullYear() });
  };

  const handlePrint = (t: string) => { 
    const o = document.title; document.title = t; 
    window.print(); 
    setTimeout(() => { document.title = o; }, 1000); 
  };
  
  const formatMoney = (amount: number) => new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);

  // --- ESTADO DE CUENTA (CÁLCULO EXACTO DESDE FECHA DE INGRESO REAL) ---
  const estadoDeCuentaGenerado = useMemo(() => {
    if (!filtroAptoTab2) return { lineas: [], deudaTotalUSD: 0, totalAbonadoUSD: 0, totalAbonadoBs: 0, propietario: null };
    
    const resInfo = propietarios.find(p => p.apartamento === filtroAptoTab2);
    const pagosDelApto = pagosResidentes.filter(p => p.apartamento === filtroAptoTab2);
    const mapaPagos = new Map();
    let tUSD = 0, tBS = 0;

    pagosDelApto.forEach(p => {
      tUSD += Number(p.monto_pagado_usd); tBS += Number(p.monto_pagado_bs);
      p.mes_correspondiente.split(',').map((m: string) => m.trim()).forEach((m: string) => mapaPagos.set(`${m.toLowerCase()}-${p.anio_correspondiente}`, p));
    });

    // Validar año y mes de ingreso
    let anioIterador = new Date().getFullYear(); // Fallback
    let mesIterador = 0; // Fallback Enero

    if (resInfo && resInfo.inicio_ano && resInfo.inicio_mes) {
      anioIterador = Number(resInfo.inicio_ano);
      mesIterador = mesesLetras.findIndex(m => m.toLowerCase() === resInfo.inicio_mes.toLowerCase());
      if (mesIterador === -1) mesIterador = 0; // Si hay error tipográfico en la DB, asume Enero
    }

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
    return { lineas, deudaTotalUSD: deudaAcumulada, totalAbonadoUSD: tUSD, totalAbonadoBs: tBS, propietario: resInfo };
  }, [filtroAptoTab2, pagosResidentes, propietarios]);

  // --- REDUCERS Y FILTROS ---
  const totalIngresoUSD = transacciones.reduce((acc, t) => acc + Number(t.ingreso_usd), 0);
  const totalGastoUSD = transacciones.reduce((acc, t) => acc + Number(t.gasto_usd), 0);
  const saldoActualUSD = transacciones.length > 0 ? transacciones[transacciones.length - 1].saldo_usd : 0;
  const totalIngresoBs = transacciones.reduce((acc, t) => acc + Number(t.ingreso_bs), 0);
  const totalGastoBs = transacciones.reduce((acc, t) => acc + Number(t.gasto_bs), 0);
  const saldoActualBs = transacciones.length > 0 ? transacciones[transacciones.length - 1].saldo_bs : 0;

  const dataResidentesFiltrada = pagosResidentes.filter(p => (filtroAnio === '' || p.anio_correspondiente.includes(filtroAnio)) && (filtroMes === '' || p.mes_correspondiente.includes(filtroMes)) && (filtroPiso === '' || p.piso.toString().includes(filtroPiso)) && (filtroApto === '' || p.apartamento.toLowerCase().includes(filtroApto.toLowerCase())));
  const transaccionesMesTab5 = transacciones.filter(t => t.mes === filtroMesTab5 && t.anio === filtroAnioTab5);
  const mIngUSD = transaccionesMesTab5.reduce((acc, t) => acc + Number(t.ingreso_usd), 0), mGstUSD = transaccionesMesTab5.reduce((acc, t) => acc + Number(t.gasto_usd), 0);
  const mIngBS = transaccionesMesTab5.reduce((acc, t) => acc + Number(t.ingreso_bs), 0), mGstBS = transaccionesMesTab5.reduce((acc, t) => acc + Number(t.gasto_bs), 0);

  const listaFiltradaCarta = propietarios.filter(p => p.apartamento?.toLowerCase().includes(buscarTab6.toLowerCase()) || p.propietario?.toLowerCase().includes(buscarTab6.toLowerCase()));
  const pisosUnicosTab7 = Array.from(new Set(propietarios.map(p => p.piso).filter(Boolean))).sort((a: any, b: any) => Number(a) - Number(b));
  const propietariosFiltradosTab7 = propietarios.filter(p => p.piso === pisoActivoTab7);

  const getSemaforoEstilo = (item: any) => {
    const nombre = item.propietario?.trim().toLowerCase() || '';
    if (nombre === '' || nombre === 'vacío' || nombre === 'vacio') return { tarjeta: 'border-red-900/40 bg-red-950/30 text-red-400', badge: 'bg-red-500/20 text-red-400 border-red-500/30', texto: 'Disponible' };
    if (item.propietario && item.cedula && item.piso && item.inicio_mes && item.inicio_ano) return { tarjeta: 'border-blue-900/40 bg-blue-950/30 text-blue-400', badge: 'bg-blue-500/20 text-blue-400 border-blue-500/30', texto: 'Completo' };
    return { tarjeta: 'border-amber-900/40 bg-amber-950/30 text-amber-400', badge: 'bg-amber-500/20 text-amber-400 border-amber-500/30', texto: 'Incompleto' };
  };

  if (!isAuth) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <form onSubmit={handleLogin} className="bg-slate-900 border border-slate-800 p-8 rounded-2xl shadow-2xl w-full max-w-sm">
          <h1 className="text-xl font-bold text-center text-white uppercase tracking-widest mb-6">Torre D-10 ERP</h1>
          <input type="password" placeholder="Clave Tesorería" className="w-full bg-slate-950 border border-slate-800 text-center rounded-lg p-3 text-white font-mono font-bold tracking-widest mb-6 outline-none focus:border-blue-600" value={pin} onChange={e => setPin(e.target.value)} />
          <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-lg uppercase text-xs tracking-wider transition-colors">Ingresar al Sistema</button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans antialiased pb-12">
      
      {/* ⚠️ CORRECCIÓN CLAVE PARA IMPRESIÓN (AÍSLA SOLO EL ÁREA DESEADA) ⚠️ */}
      <style>{`
        @media print {
          @page { size: letter portrait; margin: 1.5cm; }
          body * { visibility: hidden; }
          .print-area, .print-area * { visibility: visible; }
          .print-area { position: absolute; left: 0; top: 0; width: 100%; margin: 0; padding: 0; box-shadow: none !important; border: none !important; }
          .no-print { display: none !important; }
        }
      `}</style>
      
      {/* HEADER PRINCIPAL DEL ERP */}
      <header className="no-print bg-slate-900 border-b border-slate-800 py-4 px-6 sticky top-0 z-40 backdrop-blur-md bg-opacity-95 shadow-lg">
        <div className="max-w-7xl mx-auto flex flex-col gap-4">
          <div className="flex items-center justify-between w-full">
            <div className="w-1/3 flex items-center gap-3">
              <span className="text-2xl drop-shadow-sm">🏛️</span>
              <div><h1 className="text-sm font-bold text-white uppercase tracking-widest">Torre D-10</h1><h2 className="text-[10px] text-slate-400 uppercase tracking-widest">Enterprise Resource Planning</h2></div>
            </div>
            <div className="w-1/3 text-center"><span className="bg-blue-900/30 text-blue-400 text-[10px] px-3 py-1 rounded-full border border-blue-800 font-mono tracking-widest">ADMINISTRACIÓN CENTRAL</span></div>
            <div className="w-1/3 flex justify-end"><button onClick={handleLogout} className="text-[9px] bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded font-bold uppercase tracking-widest border border-slate-700 transition-colors">Cerrar Sesión</button></div>
          </div>
          
          <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800 overflow-x-auto gap-1 custom-scrollbar">
            {[
              { id: 'RESUMEN', label: '1. Resumen' }, { id: 'BUSQUEDA', label: '2. Búsqueda' }, { id: 'BASE_DATOS', label: '3. Recaudación' }, 
              { id: 'GASTOS_GRAL', label: '4. Gastos' }, { id: 'GASTOS_MENSUAL', label: '5. Cierre Mensual' },
              { id: 'EMISION_OFICIAL', label: '6. Emisión Oficial' }, { id: 'GESTION_DATOS', label: '7. Gestión de Datos' }
            ].map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id as TabType)} className={`flex-none py-2 px-4 text-[10px] font-bold uppercase tracking-wider rounded transition-all ${activeTab === tab.id ? 'bg-slate-800 text-white border border-slate-700 shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}>{tab.label}</button>
            ))}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 md:px-6 pt-8">
        
        {/* PESTAÑA 1: RESUMEN */}
        {activeTab === 'RESUMEN' && (
          <div className="space-y-6 no-print">
            <h2 className="text-xl font-bold border-b border-slate-800 pb-2 text-slate-300">Resumen Financiero Consolidado</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-slate-900 p-6 rounded-xl border border-slate-800"><p className="text-[10px] text-slate-400 uppercase font-bold mb-1">Total Ingresos USD</p><p className="text-2xl font-mono font-bold text-blue-400">${formatMoney(totalIngresoUSD)}</p></div>
              <div className="bg-slate-900 p-6 rounded-xl border border-slate-800"><p className="text-[10px] text-slate-400 uppercase font-bold mb-1">Total Gastos USD</p><p className="text-2xl font-mono font-bold text-red-400">${formatMoney(totalGastoUSD)}</p></div>
              <div className="bg-slate-900 p-6 rounded-xl border border-blue-900/50 bg-blue-950/20"><p className="text-[10px] text-blue-400 uppercase font-bold mb-1">Saldo Actual USD</p><p className="text-3xl font-mono font-bold text-white">${formatMoney(saldoActualUSD)}</p></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-slate-900 p-6 rounded-xl border border-slate-800"><p className="text-[10px] text-slate-400 uppercase font-bold mb-1">Total Ingresos Bs</p><p className="text-2xl font-mono font-bold text-blue-400">Bs {formatMoney(totalIngresoBs)}</p></div>
              <div className="bg-slate-900 p-6 rounded-xl border border-slate-800"><p className="text-[10px] text-slate-400 uppercase font-bold mb-1">Total Gastos Bs</p><p className="text-2xl font-mono font-bold text-red-400">Bs {formatMoney(totalGastoBs)}</p></div>
              <div className="bg-slate-900 p-6 rounded-xl border border-slate-800"><p className="text-[10px] text-slate-400 uppercase font-bold mb-1">Saldo Actual Bs</p><p className="text-3xl font-mono font-bold text-amber-500">Bs {formatMoney(saldoActualBs)}</p></div>
            </div>
          </div>
        )}

        {/* PESTAÑA 2: ESTADO DE CUENTA INTELIGENTE */}
        {activeTab === 'BUSQUEDA' && (
          <div className="space-y-6">
            <div className="no-print flex justify-between items-center border-b border-slate-800 pb-2">
              <h2 className="text-xl font-bold text-slate-300">Auditoría Colectiva por Apartamento</h2>
              {filtroAptoTab2 && <button onClick={() => handlePrint(`Estado Cuenta Apto ${filtroAptoTab2}`)} className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-4 rounded text-xs uppercase tracking-widest transition-colors shadow-md">🖨️ Imprimir Estado</button>}
            </div>
            
            <div className="no-print bg-slate-900 p-6 rounded-xl border border-slate-800">
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2">Seleccione Apartamento de la Base de Datos</label>
              <select value={filtroAptoTab2} onChange={e => setFiltroAptoTab2(e.target.value)} className="p-3 bg-slate-950 border border-slate-800 rounded-lg text-sm font-bold text-blue-400 focus:outline-none focus:border-blue-500 w-64 transition-colors">
                <option value="">-- Buscar Apto --</option>
                {listaApartamentos.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
            
            {filtroAptoTab2 && (
              <div className="print-area bg-white text-black p-8 rounded-xl border border-slate-200">
                <div className="border-b-2 border-black pb-4 mb-6 flex justify-between items-start">
                  <div>
                    <h1 className="text-2xl font-bold tracking-widest uppercase">TORRE D-10</h1>
                    <p className="text-xs text-gray-600 uppercase tracking-widest mt-1 font-bold">Estado de Cuenta Oficial</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold">APTO {filtroAptoTab2}</p>
                    <p className="text-[10px] text-gray-500 font-mono uppercase">Corte a: {new Date().toLocaleDateString()}</p>
                  </div>
                </div>

                {/* INFO DEL PROPIETARIO PARA PANTALLA E IMPRESIÓN */}
                <div className="bg-gray-100 p-4 rounded mb-6 border border-gray-300 text-sm">
                  <p className="mb-1"><strong className="font-bold">Propietario:</strong> {estadoDeCuentaGenerado.propietario?.propietario || 'No registrado en censo'}</p>
                  <p><strong className="font-bold">Fecha de Ingreso al Sistema:</strong> {estadoDeCuentaGenerado.propietario?.inicio_mes && estadoDeCuentaGenerado.propietario?.inicio_ano ? `${estadoDeCuentaGenerado.propietario.inicio_mes.toUpperCase()} ${estadoDeCuentaGenerado.propietario.inicio_ano}` : 'No definida (Inicia cálculo base)'}</p>
                </div>

                <div className="grid grid-cols-3 gap-6 mb-6">
                  <div className="border border-red-300 bg-red-50 p-4 rounded text-center">
                    <p className="text-[9px] text-red-700 uppercase tracking-widest font-bold">Deuda Acumulada</p>
                    <p className="text-2xl font-mono font-bold text-red-700">${formatMoney(estadoDeCuentaGenerado.deudaTotalUSD)}</p>
                  </div>
                  <div className="border border-blue-300 bg-blue-50 p-4 rounded text-center">
                    <p className="text-[9px] text-blue-700 uppercase tracking-widest font-bold">Abonado USD</p>
                    <p className="text-2xl font-mono font-bold text-blue-700">${formatMoney(estadoDeCuentaGenerado.totalAbonadoUSD)}</p>
                  </div>
                  <div className="border border-gray-300 bg-gray-50 p-4 rounded text-center">
                    <p className="text-[9px] text-gray-700 uppercase tracking-widest font-bold">Abonado Bs</p>
                    <p className="text-2xl font-mono font-bold text-gray-800">Bs {formatMoney(estadoDeCuentaGenerado.totalAbonadoBs)}</p>
                  </div>
                </div>
                
                <table className="w-full text-left text-xs whitespace-nowrap">
                  <thead className="bg-gray-800 text-white font-mono uppercase text-[9px]">
                    <tr><th className="p-3">Periodo</th><th className="p-3">Estatus</th><th className="p-3">Fecha Pago</th><th className="p-3 text-right">Cargo (Deuda)</th><th className="p-3 text-right">Descripción Referencial</th></tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {estadoDeCuentaGenerado.lineas.map((l, i) => (
                      <tr key={i} className={l.estatus === 'PENDIENTE' ? 'bg-red-50' : ''}>
                        <td className="p-3 font-semibold text-gray-800">{l.periodo}</td>
                        <td className="p-3"><span className={`px-2 py-0.5 rounded text-[9px] font-bold tracking-wider ${l.estatus === 'PAGADO' ? 'text-blue-700 bg-blue-100' : 'text-red-700 bg-red-100'}`}>{l.estatus}</span></td>
                        <td className="p-3 font-mono text-gray-500">{l.fecha}</td>
                        <td className="p-3 text-right font-mono font-bold text-gray-700">{l.cargos > 0 ? `$${formatMoney(l.cargos)}` : '-'}</td>
                        <td className="p-3 text-right text-gray-500 font-mono text-[10px]">{l.desc}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* PESTAÑA 3: RECAUDACIÓN (CON FILTROS RESTAURADOS) */}
        {activeTab === 'BASE_DATOS' && (
          <div className="space-y-6 no-print">
            <h2 className="text-xl font-bold border-b border-slate-800 pb-2 text-slate-300">Libro Mayor de Cobros Manuales</h2>
            <form onSubmit={handleRegistrarPagoResidente} className="bg-slate-900 p-6 rounded-xl border border-slate-800">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                <div><label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Apartamento</label><select value={formPagoResidente.apartamento} onChange={e => setFormPagoResidente({...formPagoResidente, apartamento: e.target.value})} className="w-full p-3 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:border-blue-500 focus:outline-none" required><option value="">-- Elegir --</option>{listaApartamentos.map(a => <option key={a} value={a}>{a}</option>)}</select></div>
                <div><label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Año</label><input type="text" value={formPagoResidente.anio_correspondiente} onChange={e => setFormPagoResidente({...formPagoResidente, anio_correspondiente: e.target.value})} className="w-full p-3 bg-slate-950 border border-slate-800 rounded-lg text-sm font-mono text-white focus:border-blue-500 focus:outline-none" required /></div>
                <div><label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Mes a Cancelar</label><select value={formPagoResidente.mes_seleccionado} onChange={e => setFormPagoResidente({...formPagoResidente, mes_seleccionado: e.target.value})} className="w-full p-3 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:border-blue-500 focus:outline-none" required><option value="">-- Mes --</option>{mesesDelAno.map(m => <option key={m} value={m}>{m}</option>)}</select></div>
                <div><label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Descripción</label><input type="text" placeholder="Referencia..." value={formPagoResidente.descripcion} onChange={e => setFormPagoResidente({...formPagoResidente, descripcion: e.target.value})} className="w-full p-3 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:border-blue-500 focus:outline-none" /></div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div><label className="block text-[10px] font-bold text-blue-400 uppercase mb-1">Monto USD</label><input type="number" step="0.01" placeholder="0.00" value={formPagoResidente.monto_pagado_usd} onChange={e => setFormPagoResidente({...formPagoResidente, monto_pagado_usd: e.target.value})} className="w-full p-3 bg-slate-950 border border-slate-800 rounded-lg text-sm font-mono text-white focus:border-blue-500 focus:outline-none" /></div>
                <div><label className="block text-[10px] font-bold text-blue-400 uppercase mb-1">Monto Bs</label><input type="number" step="0.01" placeholder="0.00" value={formPagoResidente.monto_pagado_bs} onChange={e => setFormPagoResidente({...formPagoResidente, monto_pagado_bs: e.target.value})} className="w-full p-3 bg-slate-950 border border-slate-800 rounded-lg text-sm font-mono text-white focus:border-blue-500 focus:outline-none" /></div>
              </div>
              <div className="flex justify-end"><button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-6 rounded-lg text-xs uppercase tracking-widest shadow-md transition-colors">💾 Registrar Abono</button></div>
            </form>

            {/* FILTROS RESTAURADOS */}
            <div className="bg-slate-900 p-4 rounded-xl border border-slate-800">
              <p className="text-[10px] uppercase tracking-widest font-bold text-slate-400 mb-3">Filtros de Auditoría Avanzada</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <input type="text" placeholder="🔍 Filtrar por Año" value={filtroAnio} onChange={e => setFiltroAnio(e.target.value)} className="p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-white focus:border-blue-500 outline-none" />
                <select value={filtroMes} onChange={e => setFiltroMes(e.target.value)} className="p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:border-blue-500 outline-none"><option value="">🔍 Todos los Meses</option>{mesesDelAno.map(m => <option key={m} value={m}>{m}</option>)}</select>
                <input type="text" placeholder="🔍 Filtrar por Piso" value={filtroPiso} onChange={e => setFiltroPiso(e.target.value)} className="p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:border-blue-500 outline-none" />
                <input type="text" placeholder="🔍 Filtrar por Apto" value={filtroApto} onChange={e => setFiltroApto(e.target.value)} className="p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-xs uppercase font-bold text-blue-400 focus:border-blue-500 outline-none" />
              </div>
            </div>

            <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-x-auto">
              <table className="w-full text-left text-xs whitespace-nowrap">
                <thead className="bg-slate-950 text-slate-400 font-mono uppercase text-[9px]"><tr><th className="p-4">Nivel</th><th className="p-4">Apartamento</th><th className="p-4">Periodo Cancelado</th><th className="p-4">Descripción</th><th className="p-4 text-right">Recibo USD</th><th className="p-4 text-right">Recibo Bs</th><th className="p-4 text-center">Acciones</th></tr></thead>
                <tbody className="divide-y divide-slate-800">
                  {dataResidentesFiltrada.map(item => (
                    <tr key={item.id} className="hover:bg-slate-800/40">
                      <td className="p-4 font-mono text-slate-400">Piso {item.piso}</td><td className="p-4 font-bold text-blue-400">{item.apartamento}</td><td className="p-4 font-medium">{item.mes_correspondiente} {item.anio_correspondiente}</td><td className="p-4 text-slate-400 text-[11px] font-mono truncate max-w-[150px]">{item.descripcion}</td><td className="p-4 text-right font-mono font-bold text-emerald-400">${formatMoney(item.monto_pagado_usd)}</td><td className="p-4 text-right font-mono font-bold text-emerald-400">Bs {formatMoney(item.monto_pagado_bs)}</td>
                      <td className="p-4 text-center"><button onClick={() => handleEliminarPagoResidente(item.id)} className="bg-slate-800 text-red-400 hover:bg-red-500 hover:text-white px-2 py-1 rounded text-xs border border-slate-700 transition-colors">🗑️</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* PESTAÑA 4: GASTOS */}
        {activeTab === 'GASTOS_GRAL' && (
          <div className="space-y-6 no-print">
            <h2 className="text-xl font-bold border-b border-slate-800 pb-2 text-slate-300">Libro Diario de Egresos Operativos</h2>
            <form onSubmit={handleRegistrarMovimiento} className="bg-slate-900 p-6 rounded-xl border border-slate-800">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                <input type="text" placeholder="Año" value={formGasto.anio} onChange={e => setFormGasto({...formGasto, anio: e.target.value})} className="p-3 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:border-blue-500 outline-none" required />
                <select value={formGasto.mes} onChange={e => setFormGasto({...formGasto, mes: e.target.value})} className="p-3 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:border-blue-500 outline-none" required><option value="">-- Mes --</option>{mesesDelAno.map(m => <option key={m} value={m}>{m}</option>)}</select>
                <input type="text" placeholder="Factura Ref" value={formGasto.referencia} onChange={e => setFormGasto({...formGasto, referencia: e.target.value})} className="p-3 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:border-blue-500 outline-none" />
                <input type="text" placeholder="Descripción del Egreso" value={formGasto.descripcion} onChange={e => setFormGasto({...formGasto, descripcion: e.target.value})} className="p-3 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:border-blue-500 outline-none" required />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 bg-red-950/10 p-4 rounded-lg border border-red-900/20">
                <div><label className="block text-[10px] font-bold text-red-400 mb-1">Salida USD (-)</label><input type="number" step="0.01" value={formGasto.gasto_usd} onChange={e => setFormGasto({...formGasto, gasto_usd: e.target.value})} className="w-full p-3 bg-slate-950 border border-red-900/50 rounded-lg text-sm text-white font-mono focus:border-red-500 outline-none" /></div>
                <div><label className="block text-[10px] font-bold text-red-400 mb-1">Salida Bs (-)</label><input type="number" step="0.01" value={formGasto.gasto_bs} onChange={e => setFormGasto({...formGasto, gasto_bs: e.target.value})} className="w-full p-3 bg-slate-950 border border-red-900/50 rounded-lg text-sm text-white font-mono focus:border-red-500 outline-none" /></div>
              </div>
              <div className="flex justify-end"><button type="submit" className="bg-red-800 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-lg text-xs uppercase tracking-widest shadow-md transition-colors">💾 Cargar Egreso</button></div>
            </form>
            <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-x-auto">
               <table className="w-full text-left text-xs whitespace-nowrap">
                 <thead className="bg-slate-950 text-slate-400 font-mono uppercase text-[9px]"><tr><th className="p-4">Periodo</th><th className="p-4">Descripción / Ref</th><th className="p-4 text-right text-blue-400">Ingreso $</th><th className="p-4 text-right text-red-400">Gasto $</th><th className="p-4 text-right">Saldo $</th><th className="p-4 text-right text-blue-400">Ingreso Bs</th><th className="p-4 text-right text-red-400">Gasto Bs</th><th className="p-4 text-right">Saldo Bs</th><th className="p-4 text-center">Acciones</th></tr></thead>
                 <tbody className="divide-y divide-slate-800">
                    {transacciones.map(t => (
                      <tr key={t.id} className="hover:bg-slate-800/40">
                        <td className="p-4 font-mono"><span className="font-bold">{t.anio}</span> <span className="text-slate-400 text-[10px]">{t.mes}</span></td>
                        <td className="p-4"><div className="font-medium text-slate-200">{t.descripcion}</div><div className="text-[10px] text-slate-500 font-mono">Ref: {t.referencia}</div></td>
                        <td className="p-4 text-right font-mono text-blue-400">{Number(t.ingreso_usd) > 0 ? `+${formatMoney(t.ingreso_usd)}` : '-'}</td>
                        <td className="p-4 text-right font-mono text-red-400">{Number(t.gasto_usd) > 0 ? `-${formatMoney(t.gasto_usd)}` : '-'}</td>
                        <td className="p-4 text-right font-mono font-bold bg-slate-950/40">{formatMoney(t.saldo_usd)}</td>
                        <td className="p-4 text-right font-mono text-blue-400">{Number(t.ingreso_bs) > 0 ? `+${formatMoney(t.ingreso_bs)}` : '-'}</td>
                        <td className="p-4 text-right font-mono text-red-400">{Number(t.gasto_bs) > 0 ? `-${formatMoney(t.gasto_bs)}` : '-'}</td>
                        <td className="p-4 text-right font-mono font-bold bg-slate-950/40">{formatMoney(t.saldo_bs)}</td>
                        <td className="p-4 text-center"><button onClick={() => handleEliminarTransaccion(t.id)} className="bg-slate-800 text-red-400 hover:bg-red-500 hover:text-white px-2 py-1 rounded text-xs border border-slate-700 transition-colors">🗑️</button></td>
                      </tr>
                    ))}
                 </tbody>
               </table>
            </div>
          </div>
        )}

        {/* PESTAÑA 5: CIERRE MENSUAL */}
        {activeTab === 'GASTOS_MENSUAL' && (
          <div className="space-y-6 no-print">
            <div className="flex justify-between items-center border-b border-slate-800 pb-2"><h2 className="text-xl font-bold text-slate-300">Cierre Contable Mensual</h2>{filtroMesTab5 && <button onClick={() => handlePrint(`Cierre Mensual - ${filtroMesTab5} ${filtroAnioTab5}`)} className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-4 rounded text-xs uppercase tracking-widest shadow-md transition-colors">🖨️ Imprimir Cierre</button>}</div>
            <div className="bg-slate-900 p-6 rounded-xl border border-slate-800 flex gap-4"><div className="w-1/4"><label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Año</label><input type="text" value={filtroAnioTab5} onChange={e => setFiltroAnioTab5(e.target.value)} className="w-full p-3 bg-slate-950 border border-slate-800 rounded-lg text-sm font-mono text-white focus:border-blue-500 outline-none" /></div><div className="w-1/3"><label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Seleccione Mes</label><select value={filtroMesTab5} onChange={e => setFiltroMesTab5(e.target.value)} className="w-full p-3 bg-slate-950 border border-slate-800 rounded-lg text-sm font-bold text-white focus:border-blue-500 outline-none"><option value="">-- Mes --</option>{mesesDelAno.map(m => <option key={m} value={m}>{m}</option>)}</select></div></div>
            {filtroMesTab5 && (
              <div className="print-area bg-white text-black p-8 rounded-xl border border-slate-200">
                <div className="border-b-2 border-black pb-4 mb-6 flex justify-between items-start">
                  <div>
                    <h1 className="text-2xl font-bold tracking-widest uppercase">TORRE D-10</h1>
                    <p className="text-xs text-gray-600 uppercase tracking-widest mt-1 font-bold">Cierre de Flujo de Caja</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold uppercase">{filtroMesTab5} {filtroAnioTab5}</p>
                    <p className="text-[10px] text-gray-500 font-mono uppercase">Generado: {new Date().toLocaleDateString()}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-6 mb-8">
                  <div className="bg-gray-50 p-4 rounded border border-gray-300"><p className="text-[10px] font-bold text-gray-600 uppercase mb-2">Neto USD</p><div className="flex justify-between text-xs mb-1"><span>Ingresos:</span><span className="text-blue-700 font-bold">+${formatMoney(mIngUSD)}</span></div><div className="flex justify-between text-xs mb-1"><span>Egresos:</span><span className="text-red-700 font-bold">-${formatMoney(mGstUSD)}</span></div><div className="flex justify-between text-sm border-t border-gray-300 pt-1 font-bold"><span>Total:</span><span className={mIngUSD - mGstUSD >= 0 ? 'text-blue-700' : 'text-red-700'}>${formatMoney(mIngUSD - mGstUSD)}</span></div></div>
                  <div className="bg-gray-50 p-4 rounded border border-gray-300"><p className="text-[10px] font-bold text-gray-600 uppercase mb-2">Neto Bolívares</p><div className="flex justify-between text-xs mb-1"><span>Ingresos:</span><span className="text-blue-700 font-bold">+Bs {formatMoney(mIngBS)}</span></div><div className="flex justify-between text-xs mb-1"><span>Egresos:</span><span className="text-red-700 font-bold">-Bs {formatMoney(mGstBS)}</span></div><div className="flex justify-between text-sm border-t border-gray-300 pt-1 font-bold"><span>Total:</span><span className={mIngBS - mGstBS >= 0 ? 'text-blue-700' : 'text-red-700'}>Bs {formatMoney(mIngBS - mGstBS)}</span></div></div>
                </div>
                <table className="w-full text-left text-[11px] whitespace-nowrap"><thead className="bg-gray-800 text-white uppercase text-[9px]"><tr><th className="p-2">ID</th><th className="p-2">Descripción</th><th className="p-2 text-right">Ingreso $</th><th className="p-2 text-right">Egreso $</th><th className="p-2 text-right">Saldo $</th><th className="p-2 text-right">Ingreso Bs</th><th className="p-2 text-right">Egreso Bs</th><th className="p-2 text-right">Saldo Bs</th></tr></thead><tbody className="divide-y divide-gray-200">{transaccionesMesTab5.map(t => (<tr key={t.id}><td className="p-2 text-gray-500 font-mono">#{t.id}</td><td className="p-2 text-gray-800 font-medium truncate max-w-[180px]">{t.descripcion}</td><td className="p-2 text-right font-mono text-blue-700">{Number(t.ingreso_usd) > 0 ? `+${formatMoney(t.ingreso_usd)}` : '-'}</td><td className="p-2 text-right font-mono text-red-700">{Number(t.gasto_usd) > 0 ? `-${formatMoney(t.gasto_usd)}` : '-'}</td><td className="p-2 text-right font-mono font-bold bg-gray-100">{formatMoney(t.saldo_usd)}</td><td className="p-2 text-right font-mono text-blue-700">{Number(t.ingreso_bs) > 0 ? `+${formatMoney(t.ingreso_bs)}` : '-'}</td><td className="p-2 text-right font-mono text-red-700">{Number(t.gasto_bs) > 0 ? `-${formatMoney(t.gasto_bs)}` : '-'}</td><td className="p-2 text-right font-mono font-bold bg-gray-100">{formatMoney(t.saldo_bs)}</td></tr>))}</tbody></table>
              </div>
            )}
          </div>
        )}

        {/* PESTAÑA 6: EMISIÓN OFICIAL CARTA DE RESIDENCIA (STRUCT HTML INTACTO) */}
        {activeTab === 'EMISION_OFICIAL' && (
          <div className="no-print max-w-3xl mx-auto space-y-6">
            <h2 className="text-xl font-bold border-b border-slate-800 pb-2 text-slate-300">Emisión de Constancia Oficial</h2>
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl flex flex-col md:flex-row gap-6 items-end relative z-30">
              <div className="w-full md:w-2/3 relative">
                <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Seleccionar Propietario</label>
                <div className="flex">
                  <input type="text" className="w-full bg-slate-950 border border-slate-800 rounded-l-xl p-3.5 text-sm font-semibold text-white focus:outline-none focus:border-blue-500 transition-colors" placeholder="Buscar apto o nombre..." value={buscarTab6} onChange={(e) => { setBuscarTab6(e.target.value); setIsOpenTab6(true); }} onFocus={() => setIsOpenTab6(true)} />
                  <button onClick={() => setIsOpenTab6(!isOpenTab6)} className="bg-slate-800 border-y border-r border-slate-700 rounded-r-xl px-4 text-slate-400 hover:text-white">▼</button>
                </div>
                {isOpenTab6 && (
                  <ul className="absolute left-0 right-0 mt-2 max-h-60 bg-slate-900 border border-slate-800 rounded-xl overflow-y-auto shadow-2xl z-50 divide-y divide-slate-800 custom-scrollbar">
                    {listaFiltradaCarta.map((item: any, idx: number) => (
                      <li key={idx} onClick={() => { setPropietarioSeleccionado(item); setBuscarTab6(item.apartamento); setIsOpenTab6(false); }} className="p-4 text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-white cursor-pointer flex justify-between items-center transition-colors">
                        <span className="font-bold bg-slate-950 px-3 py-1 rounded text-white border border-slate-800">{item.apartamento}</span>
                        <span className="text-xs truncate max-w-[200px] uppercase font-mono">{item.propietario || 'Disponible'}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="w-full md:w-1/3">
                <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Fecha del Documento</label>
                <input type="date" value={fechaManual} onChange={handleCambioFechaManual} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-sm font-semibold text-white cursor-pointer focus:outline-none focus:border-blue-500 transition-colors" />
              </div>
            </div>
            <button onClick={() => handlePrint(`Carta de Residencia - Apto ${propietarioSeleccionado?.apartamento}`)} disabled={!propietarioSeleccionado} className={`w-full mt-6 py-4 rounded-xl font-bold uppercase tracking-widest text-sm transition-all shadow-xl flex items-center justify-center gap-2 ${propietarioSeleccionado ? 'bg-blue-600 text-white hover:bg-blue-500' : 'bg-slate-900 text-slate-600 cursor-not-allowed border border-slate-800'}`}>🖨️ Generar Constancia Oficial</button>
          </div>
        )}

        {/* PESTAÑA 7: GESTIÓN DE DATOS (HORIZONTAL SIN "TODOS LOS PISOS") */}
        {activeTab === 'GESTION_DATOS' && (
          <div className="no-print flex flex-col gap-6 animate-fadeIn">
            <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
              {pisosUnicosTab7.map(p => (
                <button key={p} onClick={() => setPisoActivoTab7(p as string)} className={`px-5 py-2.5 flex-none rounded-xl text-xs font-bold tracking-wider uppercase transition-colors shadow-sm ${pisoActivoTab7 === p ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-900 text-slate-400 border border-slate-800 hover:bg-slate-800 hover:text-white'}`}>
                  Piso {p}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-fit">
              {propietariosFiltradosTab7.map(item => {
                const estilo = getSemaforoEstilo(item);
                return (
                  <div key={item.id} className={`p-5 rounded-xl border transition-all flex flex-col justify-between shadow-md bg-slate-900 hover:border-slate-600`}>
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <span className="text-xl font-bold tracking-tight block text-white">Apto {item.apartamento} <span className="text-xs text-slate-500 font-mono ml-2">(Piso {item.piso})</span></span>
                        <span className={`text-xs font-bold uppercase block mt-1 tracking-wider ${item.propietario ? 'text-blue-400' : 'text-slate-500'}`}>{item.propietario || 'Sin Propietario Registrado'}</span>
                      </div>
                      <span className={`text-[9px] font-bold uppercase tracking-widest px-2.5 py-1 rounded border ${estilo.badge}`}>{estilo.texto}</span>
                    </div>
                    <div className="text-[11px] font-mono text-slate-400 space-y-1.5 mb-5 border-t border-slate-800 pt-3">
                      <div className="flex justify-between"><span className="uppercase text-[9px] tracking-widest">Cédula:</span> <span className="text-slate-200 font-sans font-medium">{item.cedula || 'Pendiente'}</span></div>
                      <div className="flex justify-between"><span className="uppercase text-[9px] tracking-widest">Piso:</span> <span className="text-slate-200 font-sans font-medium">{item.piso || 'Pendiente'}</span></div>
                      <div className="flex justify-between"><span className="uppercase text-[9px] tracking-widest">Ingreso:</span> <span className="text-slate-200 font-sans font-medium">{item.inicio_mes ? `${item.inicio_mes} ${item.inicio_ano}` : 'Pendiente'}</span></div>
                    </div>
                    <button onClick={() => setEditingProp(item)} className="w-full bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-bold py-2.5 rounded-lg text-xs uppercase tracking-wider transition-colors">Modificar Registro</button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* MODAL EJECUTIVO EDICIÓN CENSO */}
        {editingProp && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 no-print animate-fadeIn">
            <form onSubmit={handleSavePropietario} className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-5">
              <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                <h3 className="text-lg font-bold uppercase tracking-wider text-white">Apto {editingProp.apartamento}</h3>
                <span className="text-xs bg-slate-800 text-slate-400 px-2 py-1 rounded border border-slate-700 font-mono">Edición</span>
              </div>
              <div><label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">Nombre Completo del Propietario</label><input type="text" value={editingProp.propietario || ''} onChange={e => setEditingProp({...editingProp, propietario: e.target.value})} className="w-full bg-slate-950 border border-slate-800 p-3 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500 transition-colors" placeholder="Ej: SINDY CHACÓN" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">Cédula</label><input type="text" value={editingProp.cedula || ''} onChange={e => setEditingProp({...editingProp, cedula: e.target.value})} className="w-full bg-slate-950 border border-slate-800 p-3 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500 transition-colors" placeholder="Ej: 17693292" /></div>
                <div><label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">Piso</label><input type="text" value={editingProp.piso || ''} onChange={e => setEditingProp({...editingProp, piso: e.target.value})} className="w-full bg-slate-950 border border-slate-800 p-3 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500 transition-colors" placeholder="Ej: 1" /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">Mes de Ingreso</label><select value={editingProp.inicio_mes || ''} onChange={e => setEditingProp({...editingProp, inicio_mes: e.target.value})} className="w-full bg-slate-950 border border-slate-800 p-3 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500 transition-colors cursor-pointer"><option value="">-- Seleccionar --</option>{mesesLetras.map(mes => <option key={mes} value={mes} className="capitalize">{mes}</option>)}</select></div>
                <div><label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">Año de Ingreso</label><select value={editingProp.inicio_ano || ''} onChange={e => setEditingProp({...editingProp, inicio_ano: e.target.value})} className="w-full bg-slate-950 border border-slate-800 p-3 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500 transition-colors cursor-pointer"><option value="">-- Seleccionar --</option>{listaAniosCarta.map(anio => <option key={anio} value={anio}>{anio}</option>)}</select></div>
              </div>
              <div className="flex gap-3 pt-3">
                <button type="button" onClick={() => setEditingProp(null)} className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-3 rounded-lg text-xs uppercase tracking-wider transition-colors border border-slate-700">Cancelar</button>
                <button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-lg text-xs uppercase tracking-wider transition-colors shadow-lg shadow-blue-900/20">Guardar Datos</button>
              </div>
            </form>
          </div>
        )}

      </main>

      {/* ÁREA DE IMPRESIÓN DE CARTA DE RESIDENCIA (EXACTAMENTE COMO LA PEDISTE) */}
      {activeTab === 'EMISION_OFICIAL' && (
        <div className="print-area max-w-[800px] mx-auto bg-white text-black mt-8 p-[2.5cm_3cm] shadow-2xl min-h-[11in] text-justify flex flex-col justify-between" style={{ fontFamily: 'Times New Roman, serif', fontSize: '12pt' }}>
          {propietarioSeleccionado ? (
            <>
              <div>
                <div className="flex justify-between items-center border-b-2 border-black pb-4 mb-8">
                  <img src="/ministerio.png" alt="Ministerio" className="h-16 w-auto object-contain" onError={(e) => e.currentTarget.style.display='none'} />
                  <img src="/logo_edificio.png" alt="Logo Edificio" className="h-16 w-auto object-contain" onError={(e) => e.currentTarget.style.display='none'} />
                </div>
                <h2 className="text-center font-bold underline uppercase tracking-wide mb-8" style={{ fontSize: '18pt' }}>Constancia de Residencia</h2>
                <p className="mb-5 font-normal" style={{ lineHeight: '1.7' }}>
                  Quienes suscriben, en representación del <strong className="font-bold">COMITÉ MULTIFAMILIAR DE GESTIÓN (C.M.G.) DE LA TORRE D-10</strong>, 
                  en el ejercicio de nuestras facultades como Voceros Principales del referido Comité en el Urbanismo "Simón Bolívar", 
                  Sector D, Ciudad Tiuna, por medio de la presente, hacemos constar que el (la) ciudadano (a) <strong className="font-bold uppercase">{propietarioSeleccionado.propietario}</strong>, 
                  titular de la cédula de identidad N° <strong className="font-bold">V-{propietarioSeleccionado.cedula}</strong>, de nacionalidad venezolano (a), 
                  habita en la: <strong className="font-bold">Torre D-10, Piso {propietarioSeleccionado.piso}, Apartamento {propietarioSeleccionado.apartamento}</strong>, 
                  desde el mes de {propietarioSeleccionado.inicio_mes} del año {propietarioSeleccionado.inicio_ano}.
                </p>
                <p className="mb-5" style={{ lineHeight: '1.7' }}>Tiempo durante el cual, el ciudadano ha mantenido una conducta ejemplar, observando los principios de convivencia ciudadana y respeto a las normas comunitarias establecidas en la edificación.</p>
                <p className="mb-5" style={{ lineHeight: '1.7' }}>Constancia que se expide a petición de la parte interesada en la ciudad de Caracas, a los {fechaActual.diaLetras} ({fechaActual.diaNumero}) días del mes de {fechaActual.mesLetters} del año {fechaActual.anoNumero}.</p>
              </div>
              <div>
                <div className="text-center" style={{ lineHeight: '1.7' }}>
                  <p className="font-normal m-0 p-0">Atentamente,</p>
                  <p className="m-0 p-0"><strong className="font-bold">Comité Multifamiliar de Gestión de la TORRE D-10</strong></p>
                </div>
                <div className="h-14"></div>
                <div className="mb-5 font-normal grid grid-cols-2 gap-x-12 text-center" style={{ fontSize: '11pt' }}>
                  <div>
                    <p className="border-t border-black pt-2"><strong className="font-bold">Vocera Principal</strong></p>
                    <p><strong className="font-bold">Sindy Chacón</strong></p>
                    <p>C.I V- 17.693.292</p>
                    <p>Telf. (0424) 560-15-62</p>
                  </div>
                  <div>
                    <p className="border-t border-black pt-2"><strong className="font-bold">Vocero Principal</strong></p>
                    <p><strong className="font-bold">Marcos Díaz</strong></p>
                    <p>C.I V- 16.662.440</p>
                    <p>Telf. (0414) 017-40-62</p>
                  </div>
                </div>
                <p className="italic mb-4" style={{ fontSize: '8pt', lineHeight: '1.6' }}><strong className="font-bold">Nota: Se deja constancia que a la presente fecha el CMG de la torre D10, se encuentra en proceso de regularización ante la Inmobiliaria Nacional.</strong></p>
                <footer className="text-center pt-3 border-t border-gray-200" style={{ fontSize: '10pt' }}><strong className="font-bold">Urbanismo Simón Bolívar, Sector D, Torre D-10, Ciudad Tiuna, Coche – Caracas</strong></footer>
              </div>
            </>
          ) : (
            <div className="h-[70vh] flex flex-col items-center justify-center text-slate-800 border-4 border-dashed border-slate-200 rounded-2xl no-print font-sans">
              <span className="text-5xl mb-4 text-slate-300">🏢</span>
              <p className="text-sm font-semibold tracking-wide text-slate-400">Busca un vecino en el panel web para previsualizar el PDF oficial.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}