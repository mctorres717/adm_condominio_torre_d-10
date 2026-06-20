"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://spdhfslvbslsuuzckmqr.supabase.co',
  'sb_publishable_DH68PA1DWbc66PALwVDyXA_dHLQPrL1'
);

type TabType = 'RESUMEN' | 'BUSQUEDA' | 'BASE_DATOS' | 'GASTOS_GRAL' | 'GASTOS_MENSUAL' | 'GESTION_DATOS';

const mesesDelAno = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const listaAniosFiltro = ['2023', '2024', '2025', '2026', '2027'];

const CUOTA_MENSUAL_USD = 10.00;

export default function ERPTorreD10() {
  const [isAuth, setIsAuth] = useState(false);
  const [pin, setPin] = useState('');
  const [activeTab, setActiveTab] = useState<TabType>('RESUMEN');

  // --- DATOS GLOBALES ---
  const [transacciones, setTransacciones] = useState<any[]>([]);
  const [pagosResidentes, setPagosResidentes] = useState<any[]>([]);
  const [propietarios, setPropietarios] = useState<any[]>([]);

  // --- FILTRO POR AÑO PESTAÑA 1 ---
  const [filtroAnioTab1, setFiltroAnioTab1] = useState<string>('TODOS');

  // --- FORMULARIOS ---
  const [formGasto, setFormGasto] = useState({ anio: new Date().getFullYear().toString(), mes: '', referencia: '', descripcion: '', gasto_usd: '', gasto_bs: '' });
  
  const [autoMesPendiente, setAutoMesPendiente] = useState(true);
  const [formPagoResidente, setFormPagoResidente] = useState({ apartamento: '', mes_seleccionado: '', anio_correspondiente: new Date().getFullYear().toString(), monto_pagado_usd: '', monto_pagado_bs: '', fecha_pago_real: new Date().toISOString().split('T')[0], descripcion: '' });

  // --- FILTROS SOBRE CABECERAS (TAB 3) ---
  const [filtroAnio, setFiltroAnio] = useState('');
  const [filtroMes, setFiltroMes] = useState('');
  const [filtroPiso, setFiltroPiso] = useState('');
  const [filtroApto, setFiltroApto] = useState('');
  const [filtroFechaPagoReal, setFiltroFechaPagoReal] = useState('');

  // --- FILTROS TAB 2 Y 5 ---
  const [filtroAptoTab2, setFiltroAptoTab2] = useState('');
  const [filtroMesTab5, setFiltroMesTab5] = useState('');
  const [filtroAnioTab5, setFiltroAnioTab5] = useState(new Date().getFullYear().toString());

  // --- FILTROS TAB 6 (GESTIÓN) ---
  const [pisoActivoTab6, setPisoActivoTab6] = useState<string>('');
  const [editingProp, setEditingProp] = useState<any>(null);

  // Listas dinámicas basadas en el censo
  const listaApartamentos = useMemo(() => {
    return [...new Set(propietarios.map(p => p.apartamento))].sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
  }, [propietarios]);

  const listaPisos = useMemo(() => {
    return [...new Set(propietarios.map(p => p.piso?.toString()).filter(Boolean))].sort((a, b) => Number(a) - Number(b));
  }, [propietarios]);

  const handleLogout = () => { 
    setIsAuth(false); 
    setPin(''); 
    if (typeof window !== 'undefined') localStorage.removeItem('finanzasAuth'); 
  };

  useEffect(() => {
    if (typeof window !== 'undefined' && localStorage.getItem('finanzasAuth') === 'true') setIsAuth(true);
  }, []);

  useEffect(() => {
    if (!isAuth) return;
    let timeout: NodeJS.Timeout;
    const resetTimer = () => { clearTimeout(timeout); timeout = setTimeout(() => { alert('Sesión expirada por inactividad.'); handleLogout(); }, 5 * 60 * 1000); };
    const ev = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    ev.forEach(e => window.addEventListener(e, resetTimer)); resetTimer();
    return () => { clearTimeout(timeout); ev.forEach(e => window.removeEventListener(e, resetTimer)); };
  }, [isAuth]);

  useEffect(() => {
    if (isAuth) { fetchAllData(); }
  }, [isAuth]);

  const fetchAllData = async () => {
    await fetchPropietarios();
    await fetchPagosResidentes();
    await fetchTransacciones();
  };

  useEffect(() => {
    if (listaPisos.length > 0 && !pisoActivoTab6) {
      setPisoActivoTab6(listaPisos[0]);
    }
  }, [listaPisos, pisoActivoTab6]);

  // --- DETECTAR Y CALCULAR AUTOMÁTICAMENTE EL SIGUIENTE MES PENDIENTE ---
  const siguienteMesPendienteCalculado = useMemo(() => {
    if (!formPagoResidente.apartamento || !autoMesPendiente) return null;
    
    const resInfo = propietarios.find(p => p.apartamento === formPagoResidente.apartamento);
    const pagosDelApto = pagosResidentes.filter(p => p.apartamento === formPagoResidente.apartamento);
    
    // Solo consideramos pagados los meses que tengan un abono real
    const mapaPagos = new Set(
      pagosDelApto
        .filter(p => Number(p.monto_pagado_usd) > 0 || Number(p.monto_pagado_bs) > 0)
        .map(p => `${p.mes_correspondiente?.toString().toLowerCase().trim()}-${p.anio_correspondiente?.toString().trim()}`)
    );

    let anioIterador = 2025;
    let mesIterador = 0; 

    if (resInfo && resInfo.inicio_ano && resInfo.inicio_mes) {
      anioIterador = Number(resInfo.inicio_ano);
      const idxMes = mesesDelAno.findIndex(m => m.toLowerCase() === resInfo.inicio_mes.toLowerCase().trim());
      if (idxMes !== -1) mesIterador = idxMes;
    }

    const hoy = new Date();
    const aAct = hoy.getFullYear();
    const mAct = hoy.getMonth();

    while (anioIterador < aAct || (anioIterador === aAct && mesIterador <= mAct)) {
      const nomMes = mesesDelAno[mesIterador];
      const claveBusqueda = `${nomMes.toLowerCase()}-${anioIterador}`;
      
      if (!mapaPagos.has(claveBusqueda)) {
        return { mes: nomMes, anio: anioIterador.toString() };
      }
      
      mesIterador++;
      if (mesIterador > 11) {
        mesIterador = 0;
        anioIterador++;
      }
    }
    return { mes: mesesDelAno[mAct], anio: aAct.toString() };
  }, [formPagoResidente.apartamento, autoMesPendiente, pagosResidentes, propietarios]);

  useEffect(() => {
    if (siguienteMesPendienteCalculado && autoMesPendiente) {
      setFormPagoResidente(prev => ({
        ...prev,
        mes_seleccionado: siguienteMesPendienteCalculado.mes,
        anio_correspondiente: siguienteMesPendienteCalculado.anio
      }));
    }
  }, [siguienteMesPendienteCalculado, autoMesPendiente]);

  const fetchTransacciones = async () => {
    const { data } = await supabase.from('finanzas_d10').select('*').order('fecha', { ascending: true }).order('id', { ascending: true });
    if (data) setTransacciones(data);
  };

  const fetchPagosResidentes = async () => {
    const { data } = await supabase.from('pagos_residentes').select('*').order('id', { ascending: true });
    if (data) setPagosResidentes(data);
  };

  const fetchPropietarios = async () => {
    const { data } = await supabase.from('propietarios_d10').select('*');
    if (data) setPropietarios(data.sort((a, b) => a.apartamento.localeCompare(b.apartamento, undefined, { numeric: true, sensitivity: 'base' })));
  };

  // --- LIBRO DIARIO CONSOLIDADO CON PARSER DE FECHAS ROBUSTO ---
  const libroDiarioConsolidado = useMemo(() => {
    const ingresosAgrupados = new Map<string, { usd: number, bs: number }>();
    
    pagosResidentes.forEach(p => {
      // Filtrar filas de Excel sin abonos
      const mUSD = Number(p.monto_pagado_usd || 0);
      const mBS = Number(p.monto_pagado_bs || 0);
      if (mUSD === 0 && mBS === 0) return; 

      let anioPagoReal = p.anio_correspondiente?.toString() || '2025';
      let mesPagoReal = p.mes_correspondiente || 'Enero';
      
      // Parser robusto para fechas físicas (YYYY-MM-DD, DD/MM/YYYY, etc.)
      const fechaStr = p.fecha_pago_real ? p.fecha_pago_real.toString().trim() : '';
      let mesIndice = -1;

      if (fechaStr) {
        if (fechaStr.includes('-')) {
          const pt = fechaStr.split('-');
          if (pt[0].length === 4) { anioPagoReal = pt[0]; mesIndice = parseInt(pt[1], 10) - 1; } 
          else if (pt[2].length === 4) { anioPagoReal = pt[2]; mesIndice = parseInt(pt[1], 10) - 1; }
        } else if (fechaStr.includes('/')) {
          const pt = fechaStr.split('/');
          if (pt[2].length === 4) { anioPagoReal = pt[2]; mesIndice = parseInt(pt[1], 10) - 1; }
          else if (pt[0].length === 4) { anioPagoReal = pt[0]; mesIndice = parseInt(pt[1], 10) - 1; }
        } else {
          const d = new Date(fechaStr);
          if (!isNaN(d.getTime())) { anioPagoReal = d.getFullYear().toString(); mesIndice = d.getMonth(); }
        }
      }

      if (mesIndice >= 0 && mesIndice <= 11) {
         mesPagoReal = mesesDelAno[mesIndice];
      }

      const clave = `${mesPagoReal.toLowerCase().trim()}-${anioPagoReal.trim()}`;
      
      if (!ingresosAgrupados.has(clave)) {
        ingresosAgrupados.set(clave, { usd: 0, bs: 0 });
      }
      const item = ingresosAgrupados.get(clave)!;
      item.usd += mUSD;
      item.bs += mBS;
    });

    let saldoUSD = 0;
    let saldoBS = 0;
    const lineasFinales: any[] = [];
    
    transacciones.forEach(t => {
      if (Number(t.gasto_usd) > 0 || Number(t.gasto_bs) > 0) {
        lineasFinales.push({
          id: t.id, anio: t.anio, mes: t.mes, descripcion: t.descripcion, referencia: t.referencia,
          ingreso_usd: 0, gasto_usd: Number(t.gasto_usd || 0), ingreso_bs: 0, gasto_bs: Number(t.gasto_bs || 0),
          tipo: 'GASTO', fecha_sort: t.fecha || new Date().toISOString()
        });
      }
    });

    ingresosAgrupados.forEach((valores, clave) => {
      const [mes, anio] = clave.split('-');
      const mesNombreOriginal = mesesDelAno.find(m => m.toLowerCase() === mes) || 'Enero';
      const mesIdxStr = (mesesDelAno.findIndex(m => m.toLowerCase() === mes) + 1).toString().padStart(2, '0');
      
      lineasFinales.push({
        id: `REC-${clave}`, anio: anio, mes: mesNombreOriginal,
        descripcion: `Recaudación Total Percibida en Caja (Flujo Real)`, referencia: `Pestaña 3`,
        ingreso_usd: valores.usd, gasto_usd: 0, ingreso_bs: valores.bs, gasto_bs: 0,
        tipo: 'INGRESO', fecha_sort: `${anio}-${mesIdxStr}-01T00:00:00.000Z`
      });
    });

    lineasFinales.sort((a, b) => a.fecha_sort.localeCompare(b.fecha_sort));

    return lineasFinales.map(l => {
      saldoUSD += (l.ingreso_usd - l.gasto_usd);
      saldoBS += (l.ingreso_bs - l.gasto_bs);
      return { ...l, saldo_usd: saldoUSD, saldo_bs: saldoBS };
    });
  }, [transacciones, pagosResidentes]);

  const handleEliminarTransaccion = async (id: any) => {
    if (id.toString().includes('REC-')) return alert("ℹ️ Los flujos de ingreso se eliminan borrando el recibo origen desde la Pestaña 3.");
    if (!window.confirm("⚠️ ¿Desea eliminar este egreso?")) return;
    const { error } = await supabase.from('finanzas_d10').delete().eq('id', id);
    if (error) alert(error.message); else { alert("✅ Registro eliminado."); fetchTransacciones(); }
  };

  const handleEliminarPagoResidente = async (id: number) => {
    if (!window.confirm("⚠️ ¿Desea eliminar este registro de pago de la base de datos?")) return;
    const { error } = await supabase.from('pagos_residentes').delete().eq('id', id);
    if (error) alert(error.message); else { alert("✅ Pago eliminado."); fetchPagosResidentes(); }
  };

  const handleRegistrarMovimiento = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { fecha: new Date().toISOString(), anio: formGasto.anio, mes: formGasto.mes, referencia: formGasto.referencia || 'N/A', descripcion: formGasto.descripcion, ingreso_usd: 0, gasto_usd: Number(formGasto.gasto_usd)||0, ingreso_bs: 0, gasto_bs: Number(formGasto.gasto_bs)||0 };
    const { error } = await supabase.from('finanzas_d10').insert([payload]);
    if (error) alert(error.message); else { alert("✅ Gasto registrado."); setFormGasto({ anio: new Date().getFullYear().toString(), mes: '', referencia: '', descripcion: '', gasto_usd: '', gasto_bs: '' }); fetchTransacciones(); }
  };

  const handleRegistrarPagoResidente = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formPagoResidente.apartamento || !formPagoResidente.mes_seleccionado) return alert("Por favor complete los campos obligatorios.");
    const piso = formPagoResidente.apartamento.split('-')[0];
    const mUSD = Number(formPagoResidente.monto_pagado_usd)||0, mBS = Number(formPagoResidente.monto_pagado_bs)||0;

    const { error } = await supabase.from('pagos_residentes').insert([{ 
      apartamento: formPagoResidente.apartamento, piso, 
      mes_correspondiente: formPagoResidente.mes_seleccionado, 
      anio_correspondiente: formPagoResidente.anio_correspondiente, 
      monto_pagado_usd: mUSD, monto_pagado_bs: mBS, 
      fecha_pago_real: formPagoResidente.fecha_pago_real,
      descripcion: formPagoResidente.descripcion || 'Abono de condominio'
    }]);
    if (error) return alert(error.message);
    
    alert("✅ Recaudación guardada."); 
    setFormPagoResidente({ apartamento: '', mes_seleccionado: '', anio_correspondiente: new Date().getFullYear().toString(), monto_pagado_usd: '', monto_pagado_bs: '', fecha_pago_real: new Date().toISOString().split('T')[0], descripcion: '' });
    fetchPagosResidentes();
  };

  const handleSavePropietario = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from('propietarios_d10').update({ propietario: editingProp.propietario, cedula: editingProp.cedula, piso: editingProp.piso, inicio_mes: editingProp.inicio_mes, inicio_ano: editingProp.inicio_ano }).eq('id', editingProp.id);
    if (error) alert(error.message); else { alert("✅ Censo actualizado."); setEditingProp(null); fetchPropietarios(); }
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin === 'admin') { setIsAuth(true); if (typeof window !== 'undefined') localStorage.setItem('finanzasAuth', 'true'); }
    else alert('Clave de acceso denegada.');
  };

  const handlePrint = (t: string) => { const o = document.title; document.title = t; window.print(); setTimeout(() => { document.title = o; }, 1000); };
  const formatMoney = (amount: number) => new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);

  const finanzasTab1Calculadas = useMemo(() => {
    const tFiltradas = libroDiarioConsolidado.filter(t => filtroAnioTab1 === 'TODOS' || t.anio?.toString() === filtroAnioTab1);
    const iUSD = tFiltradas.reduce((acc, t) => acc + Number(t.ingreso_usd || 0), 0);
    const gUSD = tFiltradas.reduce((acc, t) => acc + Number(t.gasto_usd || 0), 0);
    const iBS = tFiltradas.reduce((acc, t) => acc + Number(t.ingreso_bs || 0), 0);
    const gBS = tFiltradas.reduce((acc, t) => acc + Number(t.gasto_bs || 0), 0);
    return { ingresoUSD: iUSD, gastoUSD: gUSD, saldoUSD: iUSD - gUSD, ingresoBs: iBS, gastoBs: gBS, saldoBs: iBS - gBS };
  }, [libroDiarioConsolidado, filtroAnioTab1]);

  // --- MOTOR CONTABLE PESTAÑA 2: IGNORAR FILAS VACÍAS IMPORTADAS ---
  const estadoDeCuentaGenerado = useMemo(() => {
    if (!filtroAptoTab2) return { lineas: [], deudaTotalUSD: 0, totalAbonadoUSD: 0, totalAbonadoBs: 0, propietario: null };
    
    const resInfo = propietarios.find((p: any) => p.apartamento === filtroAptoTab2);
    const pagosDelApto = pagosResidentes.filter(p => p.apartamento === filtroAptoTab2);
    
    const mapaPagos = new Map();
    let tUSD = 0, tBS = 0;

    pagosDelApto.forEach(p => {
      const mUSD = Number(p.monto_pagado_usd || 0);
      const mBS = Number(p.monto_pagado_bs || 0);
      tUSD += mUSD; tBS += mBS;
      
      // Solo consideramos pago si hay un monto real
      if (mUSD > 0 || mBS > 0) {
        const clave = `${p.mes_correspondiente?.toString().toLowerCase().trim()}-${p.anio_correspondiente?.toString().trim()}`;
        mapaPagos.set(clave, p);
      }
    });

    let anioIterador = 2025;
    let mesIterador = 0; 

    if (resInfo && resInfo.inicio_ano && resInfo.inicio_mes) {
      anioIterador = Number(resInfo.inicio_ano);
      const idxMes = mesesDelAno.findIndex(m => m.toLowerCase() === resInfo.inicio_mes.toLowerCase().trim());
      if (idxMes !== -1) mesIterador = idxMes;
    }

    const lineas = []; let deudaAcumulada = 0;
    const hoy = new Date(); const aAct = hoy.getFullYear(), mAct = hoy.getMonth();

    while (anioIterador < aAct || (anioIterador === aAct && mesIterador <= mAct)) {
      const nomMes = mesesDelAno[mesIterador];
      const claveBusqueda = `${nomMes.toLowerCase()}-${anioIterador}`;
      const pagoReal = mapaPagos.get(claveBusqueda);

      if (pagoReal) {
        let fPago = pagoReal.fecha_pago_real || '';
        if (fPago.includes('-') && fPago.split('-').length === 3) { 
          const pt = fPago.split('-'); 
          if(pt[0].length === 4) fPago = `${pt[2]}/${pt[1]}/${pt[0]}`; 
        }
        
        lineas.push({
          periodo: `${nomMes} ${anioIterador}`,
          estatus: 'PAGADO',
          cargos: 0,
          desc_ref: pagoReal.descripcion || `Pago cuota realizado el ${fPago}`,
          fecha_ejecucion: fPago || 'Fecha no registrada'
        });
      } else {
        lineas.push({
          periodo: `${nomMes} ${anioIterador}`,
          estatus: 'PENDIENTE',
          cargos: CUOTA_MENSUAL_USD,
          desc_ref: 'Cuota Condominio Pendiente de Pago',
          fecha_ejecucion: 'Pendiente por pagar'
        });
        deudaAcumulada += CUOTA_MENSUAL_USD;
      }
      mesIterador++; if (mesIterador > 11) { mesIterador = 0; anioIterador++; }
    }

    return { lineas, deudaTotalUSD: deudaAcumulada, totalAbonadoUSD: tUSD, totalAbonadoBs: tBS, propietario: resInfo };
  }, [filtroAptoTab2, pagosResidentes, propietarios]);

  // --- FILTRADO AVANZADO (PESTAÑA 3) ---
  const dataResidentesFiltrada = useMemo(() => {
    return pagosResidentes.filter(p => {
      let fPagoFormateada = p.fecha_pago_real || '';
      if(fPagoFormateada.includes('-')) {
        const pt = fPagoFormateada.split('-');
        if(pt[0].length === 4) fPagoFormateada = `${pt[2]}/${pt[1]}/${pt[0]}`;
      }

      return (
        (filtroAnio === '' || p.anio_correspondiente?.toString().trim() === filtroAnio.trim()) && 
        (filtroMes === '' || p.mes_correspondiente?.toString().toLowerCase().trim() === filtroMes.toLowerCase().trim()) && 
        (filtroPiso === '' || p.piso?.toString().trim() === filtroPiso.trim()) && 
        (filtroApto === '' || p.apartamento?.toString().toLowerCase().trim() === filtroApto.toLowerCase().trim()) &&
        (filtroFechaPagoReal === '' || fPagoFormateada.includes(filtroFechaPagoReal) || (p.fecha_pago_real && p.fecha_pago_real.includes(filtroFechaPagoReal)))
      );
    });
  }, [pagosResidentes, filtroAnio, filtroMes, filtroPiso, filtroApto, filtroFechaPagoReal]);

  const transaccionesMesTab5 = libroDiarioConsolidado.filter(t => t.mes === filtroMesTab5 && t.anio?.toString() === filtroAnioTab5);
  const mIngUSD = transaccionesMesTab5.reduce((acc, t) => acc + Number(t.ingreso_usd), 0), mGstUSD = transaccionesMesTab5.reduce((acc, t) => acc + Number(t.gasto_usd), 0);
  const mIngBS = transaccionesMesTab5.reduce((acc, t) => acc + Number(t.ingreso_bs), 0), mGstBS = transaccionesMesTab5.reduce((acc, t) => acc + Number(t.gasto_bs), 0);

  const propietariosFiltradosTab6 = propietarios.filter(p => p.piso?.toString() === pisoActivoTab6);

  if (!isAuth) {
    return (
      <div className="min-h-screen bg-emerald-950 flex items-center justify-center p-4">
        <form onSubmit={handleLoginSubmit} className="bg-emerald-900 border border-emerald-800 p-8 rounded-2xl shadow-2xl w-full max-w-sm">
          <h1 className="text-xl font-bold text-center text-white uppercase tracking-widest mb-6">Torre D-10 ERP</h1>
          <input type="password" placeholder="Clave Tesorería" className="w-full bg-slate-950 border border-emerald-700 text-center rounded-lg p-3 text-white font-mono font-bold tracking-widest mb-6 outline-none focus:border-emerald-400" value={pin} onChange={e => setPin(e.target.value)} />
          <button type="submit" className="w-full bg-emerald-700 hover:bg-emerald-600 text-white font-bold py-3 rounded-lg uppercase text-xs tracking-wider transition-all">Ingresar al Sistema</button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans antialiased pb-12">
      
      <style>{`
        @media print {
          @page { size: letter portrait; margin: 1.2cm; }
          body { background-color: white !important; color: black !important; }
          .no-print { display: none !important; }
          .print-area { display: block !important; width: 100% !important; background: white !important; color: black !important; }
          .page-header-print { display: flex !important; flex-direction: column !important; margin-bottom: 15px; border-b: 2px solid black; padding-bottom: 8px; }
          .print-table th { background-color: #f3f4f6 !important; color: black !important; border: 1px solid #d1d5db !important; }
          .print-table td { border: 1px solid #e5e7eb !important; color: black !important; }
        }
        .page-header-print { display: none; }
      `}</style>
      
      <header className="no-print bg-emerald-900 border-b border-emerald-800 py-4 px-6 sticky top-0 z-40 shadow-xl bg-opacity-95 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto flex flex-col gap-4">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🏛️</span>
              <div><h1 className="text-sm font-bold text-white uppercase tracking-widest">Torre D-10</h1><h2 className="text-[10px] text-emerald-300 uppercase tracking-widest">Enterprise Resource Planning</h2></div>
            </div>
            <div className="text-center"><span className="bg-emerald-950 text-emerald-400 text-[10px] px-3 py-1 rounded-full border border-emerald-800 font-mono tracking-widest">CONTABILIDAD SINCRONIZADA</span></div>
            <div><button onClick={handleLogout} className="text-[9px] bg-emerald-950 text-emerald-300 hover:bg-emerald-800 hover:text-white px-3 py-1.5 rounded font-bold uppercase tracking-widest border border-emerald-800 transition-all">Cerrar Sesión</button></div>
          </div>
          
          <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800 overflow-x-auto gap-1 custom-scrollbar">
            {[
              { id: 'RESUMEN', label: '1. Resumen' }, { id: 'BUSQUEDA', label: '2. Estado de Cuenta' }, { id: 'BASE_DATOS', label: '3. Recaudación' }, 
              { id: 'GASTOS_GRAL', label: '4. Libro Diario' }, { id: 'GASTOS_MENSUAL', label: '5. Cierre Mensual' }, { id: 'GESTION_DATOS', label: '6. Gestión de Datos' }
            ].map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id as TabType)} className={`flex-none py-2 px-4 text-[10px] font-bold uppercase tracking-wider rounded transition-all ${activeTab === tab.id ? 'bg-emerald-800 text-white' : 'text-slate-500 hover:text-slate-300'}`}>{tab.label}</button>
            ))}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 md:px-6 pt-8">
        
        {/* PESTAÑA 1 */}
        {activeTab === 'RESUMEN' && (
          <div className="space-y-6 no-print">
            <div className="flex justify-between items-center border-b border-slate-800 pb-2">
              <h2 className="text-xl font-bold text-slate-300">Resumen Financiero Operativo</h2>
              <div className="flex items-center gap-2">
                <label className="text-xs text-slate-400 uppercase font-bold">Filtro de Ejercicio:</label>
                <select value={filtroAnioTab1} onChange={e => setFiltroAnioTab1(e.target.value)} className="p-2 bg-slate-900 border border-slate-800 rounded text-xs font-mono text-emerald-400 focus:outline-none">
                  <option value="TODOS">Ver Todo el Histórico</option>
                  {listaAniosFiltro.map(a => <option key={a} value={a}>Año {a}</option>)}
                </select>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-slate-900 p-6 rounded-xl border border-slate-800"><p className="text-[10px] text-slate-400 uppercase font-bold mb-1">Ingresos de Caja USD</p><p className="text-2xl font-mono font-bold text-emerald-400">${formatMoney(finanzasTab1Calculadas.ingresoUSD)}</p></div>
              <div className="bg-slate-900 p-6 rounded-xl border border-slate-800"><p className="text-[10px] text-slate-400 uppercase font-bold mb-1">Egresos de Caja USD</p><p className="text-2xl font-mono font-bold text-red-400">${formatMoney(finanzasTab1Calculadas.gastoUSD)}</p></div>
              <div className="bg-emerald-950 p-6 rounded-xl border border-emerald-800 bg-opacity-30"><p className="text-[10px] text-emerald-400 uppercase font-bold mb-1">Balance Neto USD</p><p className="text-3xl font-mono font-bold text-white">${formatMoney(finanzasTab1Calculadas.saldoUSD)}</p></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-slate-900 p-6 rounded-xl border border-slate-800"><p className="text-[10px] text-slate-400 uppercase font-bold mb-1">Ingresos de Caja Bs</p><p className="text-2xl font-mono font-bold text-emerald-400">Bs {formatMoney(finanzasTab1Calculadas.ingresoBs)}</p></div>
              <div className="bg-slate-900 p-6 rounded-xl border border-slate-800"><p className="text-[10px] text-slate-400 uppercase font-bold mb-1">Egresos de Caja Bs</p><p className="text-2xl font-mono font-bold text-red-400">Bs {formatMoney(finanzasTab1Calculadas.gastoBs)}</p></div>
              <div className="bg-slate-900 p-6 rounded-xl border border-slate-800"><p className="text-[10px] text-slate-400 uppercase font-bold mb-1">Balance Neto Bs</p><p className="text-3xl font-mono font-bold text-amber-500">Bs {formatMoney(finanzasTab1Calculadas.saldoBs)}</p></div>
            </div>
          </div>
        )}

        {/* PESTAÑA 2 */}
        {activeTab === 'BUSQUEDA' && (
          <div className="space-y-6">
            <div className="no-print flex justify-between items-center border-b border-slate-800 pb-2">
              <h2 className="text-xl font-bold text-slate-300">Estado de Cuenta Propietarios Torre D - 10</h2>
              {filtroAptoTab2 && <button onClick={() => handlePrint(`Estado Cuenta Apto ${filtroAptoTab2}`)} className="bg-emerald-800 hover:bg-emerald-700 text-white font-bold py-2 px-5 rounded text-xs uppercase tracking-widest transition-all shadow-md">🖨️ Imprimir Estado</button>}
            </div>
            
            <div className="no-print bg-slate-900 p-6 rounded-xl border border-slate-800">
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2">Seleccione Apartamento</label>
              <select value={filtroAptoTab2} onChange={e => setFiltroAptoTab2(e.target.value)} className="p-3 bg-slate-950 border border-slate-800 rounded-lg text-sm font-bold text-emerald-400 focus:outline-none focus:border-emerald-500 w-64 transition-all">
                <option value="">-- Buscar Apto --</option>
                {listaApartamentos.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
            
            {filtroAptoTab2 && (
              <div className="print-area bg-white text-black p-6 rounded-xl border border-gray-200 shadow-sm">
                
                <div className="page-header-print flex justify-between items-center border-b-2 border-black pb-2 mb-4">
                  <div>
                    <h1 className="text-xl font-bold tracking-wider">TORRE D-10</h1>
                    <p className="text-[10px] text-gray-600 font-bold uppercase tracking-widest">Estado de Cuenta Oficial de Procondominio</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold">APARTAMENTO {filtroAptoTab2}</p>
                    <p className="text-[9px] text-gray-500 font-mono">Emisión: {new Date().toLocaleDateString()}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 bg-gray-50 border border-gray-300 p-3 rounded mb-4 text-xs text-gray-900">
                  <div>
                    <p className="mb-0.5"><strong className="font-bold">Propietario:</strong> {estadoDeCuentaGenerado.propietario?.propietario || 'No registrado en el censo'}</p>
                    <p><strong className="font-bold">Cédula de Identidad:</strong> {estadoDeCuentaGenerado.propietario?.cedula ? `V-${estadoDeCuentaGenerado.propietario.cedula}` : 'Pendiente'}</p>
                  </div>
                  <div className="text-right">
                    <p><strong className="font-bold">Fecha de Ingreso a la Torre:</strong> <span className="uppercase">{estadoDeCuentaGenerado.propietario?.inicio_mes || 'N/A'} {estadoDeCuentaGenerado.propietario?.inicio_ano || ''}</span></p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 mb-4 text-center">
                  <div className="border border-red-300 bg-red-50 p-3 rounded">
                    <p className="text-[9px] text-red-800 uppercase tracking-widest font-bold">Deuda Pendiente</p>
                    <p className="text-xl font-mono font-bold text-red-700">${formatMoney(estadoDeCuentaGenerado.deudaTotalUSD)}</p>
                  </div>
                  <div className="border border-emerald-300 bg-emerald-50 p-3 rounded">
                    <p className="text-[9px] text-emerald-800 uppercase tracking-widest font-bold">Abonado Total USD</p>
                    <p className="text-xl font-mono font-bold text-emerald-700">${formatMoney(estadoDeCuentaGenerado.totalAbonadoUSD)}</p>
                  </div>
                  <div className="border border-gray-300 bg-gray-100 p-3 rounded">
                    <p className="text-[9px] text-gray-700 uppercase tracking-widest font-bold">Abonado Total Bs</p>
                    <p className="text-xl font-mono font-bold text-gray-800">Bs {formatMoney(estadoDeCuentaGenerado.totalAbonadoBs)}</p>
                  </div>
                </div>
                
                <table className="w-full text-left text-xs whitespace-nowrap print-table">
                  <thead className="bg-gray-800 text-white font-mono uppercase text-[9px]">
                    <tr>
                      <th className="p-2.5">Mes Condominio</th>
                      <th className="p-2.5">Estatus</th>
                      <th className="p-2.5">Fecha Pago Real</th>
                      <th className="p-2.5 text-right">Monto Cuota</th>
                      <th className="p-2.5 text-right">Descripción / Historial Transacción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {estadoDeCuentaGenerado.lineas.map((l, i) => (
                      <tr key={i} className={l.estatus === 'PENDIENTE' ? 'bg-red-50/50' : ''}>
                        <td className="p-2.5 font-semibold text-gray-800">{l.periodo}</td>
                        <td className="p-2.5"><span className={`px-2 py-0.5 rounded text-[9px] font-bold tracking-wider ${l.estatus === 'PAGADO' ? 'text-emerald-800 bg-emerald-100 border border-emerald-200' : 'text-red-800 bg-red-100 border border-red-200'}`}>{l.estatus}</span></td>
                        <td className="p-2.5 font-mono text-gray-600">{l.fecha_ejecucion}</td>
                        <td className="p-2.5 text-right font-mono text-gray-700">{l.cargos > 0 ? `$${formatMoney(l.cargos)}` : '-'}</td>
                        <td className="p-2.5 text-right text-gray-600 font-mono text-[10px] max-w-[320px] whitespace-normal break-words">{l.desc_ref}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* PESTAÑA 3 */}
        {activeTab === 'BASE_DATOS' && (
          <div className="space-y-6 no-print">
            <h2 className="text-xl font-bold border-b border-slate-800 pb-2 text-slate-300">Libro Mayor de Cobros Manuales</h2>
            <form onSubmit={handleRegistrarPagoResidente} className="bg-slate-900 p-6 rounded-xl border border-slate-800">
              
              <div className="mb-4 bg-slate-950 p-3 rounded-lg border border-slate-800 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <input type="checkbox" id="autoCheck" checked={autoMesPendiente} onChange={e => setAutoMesPendiente(e.target.checked)} className="h-4 w-4 accent-emerald-500 cursor-pointer" />
                  <label htmlFor="autoCheck" className="text-xs font-bold text-slate-300 uppercase cursor-pointer">
                    Asignar automáticamente al mes cronológico pendiente más antiguo
                  </label>
                </div>
                {autoMesPendiente && formPagoResidente.apartamento && (
                  <span className="text-[10px] font-mono bg-emerald-950 text-emerald-400 px-3 py-1 rounded border border-emerald-800 uppercase tracking-wider">
                    Siguiente Periodo Detectado: {formPagoResidente.mes_seleccionado} - {formPagoResidente.anio_correspondiente}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Apartamento</label>
                  <select value={formPagoResidente.apartamento} onChange={e => setFormPagoResidente({...formPagoResidente, apartamento: e.target.value})} className="w-full p-3 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:border-emerald-500 focus:outline-none" required>
                    <option value="">-- Elegir Apto --</option>
                    {listaApartamentos.map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Año de la Cuota</label>
                  <select value={formPagoResidente.anio_correspondiente} onChange={e => setFormPagoResidente({...formPagoResidente, anio_correspondiente: e.target.value})} disabled={autoMesPendiente} className="w-full p-3 bg-slate-950 border border-slate-800 rounded-lg text-sm font-mono text-white focus:border-emerald-500 focus:outline-none disabled:opacity-50">
                    {listaAniosFiltro.map(ano => <option key={ano} value={ano}>{ano}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Mes de la Cuota</label>
                  <select value={formPagoResidente.mes_seleccionado} onChange={e => setFormPagoResidente({...formPagoResidente, mes_seleccionado: e.target.value})} disabled={autoMesPendiente} className="w-full p-3 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:border-emerald-500 focus:outline-none disabled:opacity-50">
                    <option value="">-- Asignar Mes --</option>
                    {mesesDelAno.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Fecha de Pago</label>
                  <input type="date" value={formPagoResidente.fecha_pago_real} onChange={e => setFormPagoResidente({...formPagoResidente, fecha_pago_real: e.target.value})} className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:border-emerald-500 focus:outline-none cursor-pointer" required />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div><label className="block text-[10px] font-bold text-emerald-400 uppercase mb-1">Monto Abonado USD</label><input type="number" step="0.01" placeholder="0.00" value={formPagoResidente.monto_pagado_usd} onChange={e => setFormPagoResidente({...formPagoResidente, monto_pagado_usd: e.target.value})} className="w-full p-3 bg-slate-950 border border-slate-800 rounded-lg text-sm font-mono text-white focus:border-emerald-500 focus:outline-none" /></div>
                <div><label className="block text-[10px] font-bold text-emerald-400 uppercase mb-1">Monto Abonado BS</label><input type="number" step="0.01" placeholder="0.00" value={formPagoResidente.monto_pagado_bs} onChange={e => setFormPagoResidente({...formPagoResidente, monto_pagado_bs: e.target.value})} className="w-full p-3 bg-slate-950 border border-slate-800 rounded-lg text-sm font-mono text-white focus:border-emerald-500 focus:outline-none" /></div>
                <div><label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Descripción / Nomenclatura Manual del Pago</label><input type="text" placeholder="Ej: PAGO MESES DE ENERO HASTA MARZO - REF 1234 - TASA BCV 36.5" value={formPagoResidente.descripcion} onChange={e => setFormPagoResidente({...formPagoResidente, descripcion: e.target.value})} className="w-full p-3 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:border-emerald-500 focus:outline-none" /></div>
              </div>
              <div className="flex justify-end"><button type="submit" className="bg-emerald-800 hover:bg-emerald-700 text-white font-bold py-3 px-6 rounded-lg text-xs uppercase tracking-widest shadow-md transition-all">💾 Registrar Cobro</button></div>
            </form>

            <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-x-auto">
              <table className="w-full text-left text-xs table-fixed">
                <thead className="bg-slate-950 text-slate-400 font-mono uppercase text-[9px] border-b border-slate-800">
                  <tr>
                    <th className="p-3 w-20">
                      <div className="space-y-1">
                        <span>Piso</span>
                        <select value={filtroPiso} onChange={e => setFiltroPiso(e.target.value)} className="w-full p-1 bg-slate-900 border border-slate-700 rounded text-[9px] text-slate-300 font-sans normal-case outline-none">
                          <option value="">Todos</option>
                          {listaPisos.map(p => <option key={p} value={p}>Piso {p}</option>)}
                        </select>
                      </div>
                    </th>
                    <th className="p-3 w-32">
                      <div className="space-y-1">
                        <span>Apartamento</span>
                        <select value={filtroApto} onChange={e => setFiltroApto(e.target.value)} className="w-full p-1 bg-slate-900 border border-slate-700 rounded text-[9px] text-emerald-400 font-sans normal-case outline-none font-bold">
                          <option value="">Todos</option>
                          {listaApartamentos.map(a => <option key={a} value={a}>{a}</option>)}
                        </select>
                      </div>
                    </th>
                    <th className="p-3 w-40">
                      <div className="space-y-1">
                        <span>Mes Condominio</span>
                        <select value={filtroMes} onChange={e => setFiltroMes(e.target.value)} className="w-full p-1 bg-slate-900 border border-slate-700 rounded text-[9px] text-slate-300 font-sans normal-case outline-none">
                          <option value="">Todos los Meses</option>
                          {mesesDelAno.map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                      </div>
                    </th>
                    <th className="p-3 w-20">
                      <div className="space-y-1">
                        <span>Año</span>
                        <select value={filtroAnio} onChange={e => setFiltroAnio(e.target.value)} className="w-full p-1 bg-slate-900 border border-slate-700 rounded text-[9px] text-slate-300 font-sans normal-case outline-none">
                          <option value="">Todos</option>
                          {listaAniosFiltro.map(ano => <option key={ano} value={ano}>{ano}</option>)}
                        </select>
                      </div>
                    </th>
                    <th className="p-3 w-36">
                      <div className="space-y-1">
                        <span>Fecha de Pago</span>
                        <input type="text" placeholder="Buscar..." value={filtroFechaPagoReal} onChange={e => setFiltroFechaPagoReal(e.target.value)} className="w-full p-1 bg-slate-900 border border-slate-700 rounded text-[9px] text-slate-300 font-sans outline-none font-normal" />
                      </div>
                    </th>
                    <th className="p-3 w-64">Descripción / Nomenclatura Completa</th>
                    <th className="p-3 text-right w-24">Abono USD</th>
                    <th className="p-3 text-right w-28">Abono Bs</th>
                    <th className="p-3 text-center w-24">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {dataResidentesFiltrada.length === 0 ? (
                    <tr><td colSpan={9} className="p-6 text-center text-slate-500 font-mono">No existen abonos registrados que coincidan con la búsqueda.</td></tr>
                  ) : (
                    dataResidentesFiltrada.map(item => (
                      <tr key={item.id} className="hover:bg-slate-800/40 align-top">
                        <td className="p-4 font-mono text-slate-400">Piso {item.piso}</td>
                        <td className="p-4 font-bold text-emerald-400">{item.apartamento}</td>
                        <td className="p-4 font-medium text-slate-200">{item.mes_correspondiente}</td>
                        <td className="p-4 font-mono text-slate-400">{item.anio_correspondiente}</td>
                        <td className="p-4 font-mono text-slate-300">{item.fecha_pago_real}</td>
                        <td className="p-4 text-slate-300 text-[11px] font-mono whitespace-normal break-words leading-relaxed">
                          {item.descripcion}
                        </td>
                        <td className="p-4 text-right font-mono font-bold text-emerald-400">${formatMoney(item.monto_pagado_usd)}</td>
                        <td className="p-4 text-right font-mono font-bold text-emerald-400">Bs {formatMoney(item.monto_pagado_bs)}</td>
                        <td className="p-4 text-center">
                          <button onClick={() => handleEliminarPagoResidente(item.id)} className="bg-slate-800 text-red-400 hover:bg-red-600 hover:text-white px-2 py-1 rounded text-xs border border-slate-700 transition-all">🗑️</button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* PESTAÑA 4 */}
        {activeTab === 'GASTOS_GRAL' && (
          <div className="space-y-6 no-print">
            <h2 className="text-xl font-bold border-b border-slate-800 pb-2 text-slate-300">Libro Diario de Caja Operativo</h2>
            <form onSubmit={handleRegistrarMovimiento} className="bg-slate-900 p-6 rounded-xl border border-slate-800">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                <input type="text" placeholder="Año" value={formGasto.anio} onChange={e => setFormGasto({...formGasto, anio: e.target.value})} className="p-3 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:border-emerald-500 outline-none" required />
                <select value={formGasto.mes} onChange={e => setFormGasto({...formGasto, mes: e.target.value})} className="p-3 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:border-emerald-500 outline-none" required><option value="">-- Mes Contable --</option>{mesesDelAno.map(m => <option key={m} value={m}>{m}</option>)}</select>
                <input type="text" placeholder="Factura Ref" value={formGasto.referencia} onChange={e => setFormGasto({...formGasto, referencia: e.target.value})} className="p-3 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:border-emerald-500 outline-none" />
                <input type="text" placeholder="Descripción del Egreso" value={formGasto.descripcion} onChange={e => setFormGasto({...formGasto, descripcion: e.target.value})} className="p-3 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:border-emerald-500 outline-none" required />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 bg-red-950/10 p-4 rounded-lg border border-red-900/20">
                <div><label className="block text-[10px] font-bold text-red-400 mb-1">Salida USD (-)</label><input type="number" step="0.01" value={formGasto.gasto_usd} onChange={e => setFormGasto({...formGasto, gasto_usd: e.target.value})} className="w-full p-3 bg-slate-950 border border-red-900/50 rounded-lg text-sm text-white font-mono focus:border-red-500 outline-none" /></div>
                <div><label className="block text-[10px] font-bold text-red-400 mb-1">Salida Bs (-)</label><input type="number" step="0.01" value={formGasto.gasto_bs} onChange={e => setFormGasto({...formGasto, gasto_bs: e.target.value})} className="w-full p-3 bg-slate-950 border border-red-900/50 rounded-lg text-sm text-white font-mono focus:border-red-500 outline-none" /></div>
              </div>
              <div className="flex justify-end"><button type="submit" className="bg-red-800 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-lg text-xs uppercase tracking-widest shadow-md transition-all">💾 Cargar Egreso</button></div>
            </form>

            <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-x-auto">
               <table className="w-full text-left text-xs whitespace-nowrap">
                 <thead className="bg-slate-950 text-slate-400 font-mono uppercase text-[9px]"><tr><th className="p-4">Periodo Contable</th><th className="p-4">Descripción / Unidad Ref</th><th className="p-4 text-right text-emerald-400">Ingreso $</th><th className="p-4 text-right text-red-400">Gasto $</th><th className="p-4 text-right">Saldo Caja $</th><th className="p-4 text-right text-emerald-400">Ingreso Bs</th><th className="p-4 text-right text-red-400">Gasto Bs</th><th className="p-4 text-right">Saldo Caja Bs</th><th className="p-4 text-center">Acciones</th></tr></thead>
                 <tbody className="divide-y divide-slate-800">
                    {libroDiarioConsolidado.map((t, index) => (
                      <tr key={index} className="hover:bg-slate-800/40">
                        <td className="p-4 font-mono"><span className="font-bold">{t.anio}</span> <span className="text-slate-400 text-[10px]">{t.mes}</span></td>
                        <td className="p-4"><div className="font-medium text-slate-200">{t.descripcion}</div><div className="text-[10px] text-slate-500 font-mono">Ref: {t.referencia}</div></td>
                        <td className="p-4 text-right font-mono text-emerald-500">{Number(t.ingreso_usd) > 0 ? `+${formatMoney(t.ingreso_usd)}` : '-'}</td>
                        <td className="p-4 text-right font-mono text-red-500">{Number(t.gasto_usd) > 0 ? `-${formatMoney(t.gasto_usd)}` : '-'}</td>
                        <td className="p-4 text-right font-mono font-bold bg-slate-950/40">{formatMoney(t.saldo_usd)}</td>
                        <td className="p-4 text-right font-mono text-emerald-500">{Number(t.ingreso_bs) > 0 ? `+${formatMoney(t.ingreso_bs)}` : '-'}</td>
                        <td className="p-4 text-right font-mono text-red-500">{Number(t.gasto_bs) > 0 ? `-${formatMoney(t.gasto_bs)}` : '-'}</td>
                        <td className="p-4 text-right font-mono font-bold bg-slate-950/40">{formatMoney(t.saldo_bs)}</td>
                        <td className="p-4 text-center">
                          <button onClick={() => handleEliminarTransaccion(t.id)} className="bg-slate-800 text-red-400 hover:bg-red-600 hover:text-white px-2 py-1 rounded text-xs border border-slate-700 transition-all">🗑️</button>
                        </td>
                      </tr>
                    ))}
                 </tbody>
               </table>
            </div>
          </div>
        )}

        {/* PESTAÑA 5 */}
        {activeTab === 'GASTOS_MENSUAL' && (
          <div className="space-y-6 no-print">
            <div className="flex justify-between items-center border-b border-slate-800 pb-2"><h2 className="text-xl font-bold text-slate-300">Cierre Contable Mensual</h2>{filtroMesTab5 && <button onClick={() => handlePrint(`Cierre Mensual - ${filtroMesTab5} ${filtroAnioTab5}`)} className="bg-emerald-800 hover:bg-emerald-700 text-white font-bold py-2 px-4 rounded text-xs uppercase tracking-widest shadow-md transition-all">🖨️ Imprimir Cierre</button>}</div>
            <div className="bg-slate-900 p-6 rounded-xl border border-slate-800 flex gap-4"><div className="w-1/4"><label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Año</label><input type="text" value={filtroAnioTab5} onChange={e => setFiltroAnioTab5(e.target.value)} className="w-full p-3 bg-slate-950 border border-slate-800 rounded-lg text-sm font-mono text-white focus:border-emerald-500 outline-none" /></div><div className="w-1/3"><label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Seleccione Mes</label><select value={filtroMesTab5} onChange={e => setFiltroMesTab5(e.target.value)} className="w-full p-3 bg-slate-950 border border-slate-800 rounded-lg text-sm font-bold text-white focus:border-emerald-500 outline-none"><option value="">-- Mes --</option>{mesesDelAno.map(m => <option key={m} value={m}>{m}</option>)}</select></div></div>
            {filtroMesTab5 && (
              <div className="print-area bg-white text-black p-8 rounded-xl border border-gray-200">
                <div className="border-b-2 border-black pb-4 mb-6 flex justify-between items-start">
                  <div><h1 className="text-xl font-bold uppercase tracking-wider">TORRE D-10</h1><p className="text-xs text-gray-600 font-bold uppercase mt-1">Cierre de Flujo de Caja</p></div>
                  <div className="text-right"><p className="text-lg font-bold uppercase">{filtroMesTab5} {filtroAnioTab5}</p><p className="text-[10px] text-gray-500 font-mono">Generado: {new Date().toLocaleDateString()}</p></div>
                </div>
                <div className="grid grid-cols-2 gap-6 mb-6">
                  <div className="bg-gray-50 p-4 rounded border border-gray-300"><p className="text-[10px] font-bold text-gray-600 uppercase mb-2">Neto USD</p><div className="flex justify-between text-xs mb-1"><span>Ingresos:</span><span className="text-emerald-700 font-bold">+${formatMoney(mIngUSD)}</span></div><div className="flex justify-between text-xs mb-1"><span>Egresos:</span><span className="text-red-700 font-bold">-${formatMoney(mGstUSD)}</span></div><div className="flex justify-between text-sm border-t border-gray-300 pt-1 font-bold"><span>Total:</span><span className={mIngUSD - mGstUSD >= 0 ? 'text-emerald-700' : 'text-red-700'}>${formatMoney(mIngUSD - mGstUSD)}</span></div></div>
                  <div className="bg-gray-50 p-4 rounded border border-gray-300"><p className="text-[10px] font-bold text-gray-600 uppercase mb-2">Neto Bolívares</p><div className="flex justify-between text-xs mb-1"><span>Ingresos:</span><span className="text-emerald-700 font-bold">+Bs {formatMoney(mIngBS)}</span></div><div className="flex justify-between text-xs mb-1"><span>Egresos:</span><span className="text-red-700 font-bold">-Bs {formatMoney(mGstBS)}</span></div><div className="flex justify-between text-sm border-t border-gray-300 pt-1 font-bold"><span>Total:</span><span className={mIngBS - mGstBS >= 0 ? 'text-emerald-700' : 'text-red-700'}>Bs {formatMoney(mIngBS - mGstBS)}</span></div></div>
                </div>
                <table className="w-full text-left text-[11px] whitespace-nowrap"><thead className="bg-gray-800 text-white uppercase text-[9px]"><tr><th className="p-2">ID</th><th className="p-2">Descripción</th><th className="p-2 text-right">Ingreso $</th><th className="p-2 text-right">Egreso $</th><th className="p-2 text-right">Saldo $</th><th className="p-2 text-right">Ingreso Bs</th><th className="p-2 text-right">Egreso Bs</th><th className="p-2 text-right">Saldo Bs</th></tr></thead><tbody className="divide-y divide-gray-200">{transaccionesMesTab5.map((t, idx) => (<tr key={idx}><td className="p-2 text-gray-500 font-mono">#{t.id}</td><td className="p-2 text-gray-800 font-medium truncate max-w-[180px]">{t.descripcion}</td><td className="p-2 text-right font-mono text-emerald-700">+${formatMoney(t.ingreso_usd)}</td><td className="p-2 text-right font-mono text-red-700">-${formatMoney(t.gasto_usd)}</td><td className="p-2 text-right font-mono font-bold bg-gray-100">{formatMoney(t.saldo_usd)}</td><td className="p-2 text-right font-mono text-emerald-700">+Bs {formatMoney(t.ingreso_bs)}</td><td className="p-2 text-right font-mono text-red-700">-Bs {formatMoney(t.gasto_bs)}</td><td className="p-2 text-right font-mono font-bold bg-gray-100">{formatMoney(t.saldo_bs)}</td></tr>))}</tbody></table>
              </div>
            )}
          </div>
        )}

        {/* PESTAÑA 6 */}
        {activeTab === 'GESTION_DATOS' && (
          <div className="no-print flex flex-col gap-6 animate-fadeIn">
            <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
              {listaPisos.map(p => (
                <button key={p} onClick={() => setPisoActivoTab6(p)} className={`px-5 py-2.5 flex-none rounded-xl text-xs font-bold tracking-wider uppercase transition-all shadow-sm ${pisoActivoTab6 === p ? 'bg-emerald-800 text-white shadow-md' : 'bg-slate-900 text-slate-400 border border-slate-800 hover:bg-slate-800'}`}>
                  Piso {p}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-fit">
              {propietariosFiltradosTab6.map(item => {
                const nombre = item.propietario?.trim().toLowerCase() || '';
                const vacio = (nombre === '' || nombre === 'vacío' || nombre === 'vacio');
                return (
                  <div key={item.id} className="p-5 rounded-xl border border-slate-800 bg-slate-900 flex flex-col justify-between hover:border-slate-700 transition-colors">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <span className="text-xl font-bold text-white">Apto {item.apartamento} <span className="text-xs text-slate-500 font-mono ml-2">(Piso {item.piso})</span></span>
                        <span className="text-xs font-medium text-emerald-400 block uppercase mt-0.5">{item.propietario || 'Sin registro en censo'}</span>
                      </div>
                      <span className={`text-[9px] font-mono uppercase tracking-widest px-2.5 py-1 rounded border ${vacio ? 'bg-red-950/40 text-red-400 border-red-900/40' : 'bg-emerald-950/40 text-emerald-400 border-emerald-900/40'}`}>{vacio ? 'Disponible' : 'Censado'}</span>
                    </div>
                    <div className="text-[11px] font-mono text-slate-400 space-y-1.5 border-t border-slate-800 pt-3 mb-4">
                      <div className="flex justify-between"><span>CÉDULA DE IDENTIDAD:</span><span className="text-slate-200 font-sans font-medium">{item.cedula ? `V-${item.cedula}` : 'Pendiente'}</span></div>
                      <div className="flex justify-between"><span>FECHA DE INGRESO A LA TORRE:</span><span className="text-slate-200 font-sans font-medium uppercase">{item.inicio_mes ? `${item.inicio_mes} ${item.inicio_ano}` : 'Pendiente'}</span></div>
                    </div>
                    <button onClick={() => setEditingProp(item)} className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-2.5 rounded-lg text-xs uppercase border border-slate-700 transition-colors">Modificar Registro</button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* MODAL EDICIÓN CENSO */}
        {editingProp && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 no-print">
            <form onSubmit={handleSavePropietario} className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-md space-y-4">
              <h3 className="text-base font-bold uppercase text-white border-b border-slate-800 pb-2">Editar Apartamento {editingProp.apartamento}</h3>
              <div><label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Nombre Completo del Propietario</label><input type="text" value={editingProp.propietario || ''} onChange={e => setEditingProp({...editingProp, propietario: e.target.value})} className="w-full bg-slate-950 border border-slate-800 p-3 rounded-lg text-sm text-white" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Cédula (Sólo Números)</label><input type="text" value={editingProp.cedula || ''} onChange={e => setEditingProp({...editingProp, cedula: e.target.value})} className="w-full bg-slate-950 border border-slate-800 p-3 rounded-lg text-sm text-white" /></div>
                <div><label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Piso</label><input type="text" value={editingProp.piso || ''} onChange={e => setEditingProp({...editingProp, piso: e.target.value})} className="w-full bg-slate-950 border border-slate-800 p-3 rounded-lg text-sm text-white" /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Mes de Ingreso</label><select value={editingProp.inicio_mes || ''} onChange={e => setEditingProp({...editingProp, inicio_mes: e.target.value})} className="w-full bg-slate-950 border border-slate-800 p-3 rounded-lg text-sm text-white capitalize">{<option value="">-- Mes --</option>}{mesesDelAno.map(m => <option key={m} value={m.toLowerCase()}>{m}</option>)}</select></div>
                <div><label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Año de Ingreso</label><select value={editingProp.inicio_ano || ''} onChange={e => setEditingProp({...editingProp, inicio_ano: e.target.value})} className="w-full bg-slate-950 border border-slate-800 p-3 rounded-lg text-sm text-white">{<option value="">-- Año --</option>}{listaAniosFiltro.map(a => <option key={a} value={a}>{a}</option>)}</select></div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setEditingProp(null)} className="flex-1 bg-slate-800 text-slate-300 font-bold py-3 rounded-lg text-xs uppercase border border-slate-700">Cerrar</button>
                <button type="submit" className="flex-1 bg-emerald-800 hover:bg-emerald-700 text-white font-bold py-3 rounded-lg text-xs uppercase shadow-lg">Guardar Cambios</button>
              </div>
            </form>
          </div>
        )}

      </main>
    </div>
  );
}