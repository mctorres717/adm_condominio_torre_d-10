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

  // --- FILTROS PESTAÑA 1 ---
  const [filtroAnioTab1, setFiltroAnioTab1] = useState<string>('TODOS');
  const [filtroMesTab1, setFiltroMesTab1] = useState<string>('TODOS');

  // --- FORMULARIOS ---
  const [formGasto, setFormGasto] = useState({ anio: new Date().getFullYear().toString(), mes: '', referencia: 'N/A', descripcion: '', gasto_usd: '', gasto_bs: '' });
  
  const [autoMesPendiente, setAutoMesPendiente] = useState(true);
  const [formPagoResidente, setFormPagoResidente] = useState({ apartamento: '', mes_seleccionado: '', anio_corresponding: new Date().getFullYear().toString(), monto_pagado_usd: '', monto_pagado_bs: '', fecha_pago_real: new Date().toISOString().split('T')[0], descripcion: '' });

  // --- FILTROS PESTAÑA 3 ---
  const [filtroPiso, setFiltroPiso] = useState('');
  const [filtroApto, setFiltroApto] = useState('');
  const [filtroFechaPagoReal, setFiltroFechaPagoReal] = useState('');

  // --- FILTROS TAB 4 (RELACION DE GASTOS) ---
  const [filtroAnioTab4, setFiltroAnioTab4] = useState('');
  const [filtroMesTab4, setFiltroMesTab4] = useState('');

  // --- FILTROS TAB 2 Y 5 ---
  const [filtroAptoTab2, setFiltroAptoTab2] = useState('');
  const [filtroMesTab5, setFiltroMesTab5] = useState('TODOS');
  const [filtroAnioTab5, setFiltroAnioTab5] = useState('TODOS'); // Corregido por defecto a "Todos los Años"

  // --- FILTROS TAB 6 (GESTIÓN) ---
  const [pisoActivoTab6, setPisoActivoTab6] = useState<string>('');
  const [editingProp, setEditingProp] = useState<any>(null);

  // Listas dinámicas
  const listaApartamentos = useMemo(() => {
    return [...new Set(propietarios.map(p => p.apartamento))].sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
  }, [propietarios]);

  const listaPisos = useMemo(() => {
    return [...new Set(propietarios.map(p => p.piso?.toString()).filter(Boolean))].sort((a, b) => Number(a) - Number(b));
  }, [propietarios]);

  // FILTRO ORDENADO CRONOLÓGICAMENTE (De más antiguo a más reciente)
  const listaFechasPagoPestaña3 = useMemo(() => {
    const fechas = pagosResidentes.map(p => p.fecha_pago_real).filter(Boolean);
    return [...new Set(fechas)].sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
  }, [pagosResidentes]);

  const handleLogout = () => { 
    setIsAuth(false); setPin(''); 
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
    if (listaPisos.length > 0 && !pisoActivoTab6) setPisoActivoTab6(listaPisos[0]);
  }, [listaPisos, pisoActivoTab6]);

  // --- AUTOMATIZADOR DE MES PENDIENTE ---
  const siguienteMesPendienteCalculado = useMemo(() => {
    if (!formPagoResidente.apartamento || !autoMesPendiente) return null;
    
    const resInfo = propietarios.find(p => p.apartamento === formPagoResidente.apartamento);
    const pagosDelApto = pagosResidentes.filter(p => p.apartamento === formPagoResidente.apartamento);
    
    const mapaPagos = new Set(
      pagosDelApto
        .filter(p => Number(p.monto_pagado_usd) > 0 || Number(p.monto_pagado_bs) > 0)
        .map(p => `${p.mes_correspondiente?.toString().toLowerCase().trim()}-${p.anio_correspondiente?.toString().trim()}`)
    );

    let anioIterador = 2025, mesIterador = 0; 
    if (resInfo && resInfo.inicio_ano && resInfo.inicio_mes) {
      anioIterador = Number(resInfo.inicio_ano);
      const idxMes = mesesDelAno.findIndex(m => m.toLowerCase() === resInfo.inicio_mes.toLowerCase().trim());
      if (idxMes !== -1) mesIterador = idxMes;
    }

    const hoy = new Date(); const aAct = hoy.getFullYear(), mAct = hoy.getMonth();

    while (anioIterador < aAct || (anioIterador === aAct && mesIterador <= mAct)) {
      const nomMes = mesesDelAno[mesIterador];
      const claveBusqueda = `${nomMes.toLowerCase()}-${anioIterador}`;
      if (!mapaPagos.has(claveBusqueda)) return { mes: nomMes, anio: anioIterador.toString() };
      
      mesIterador++;
      if (mesIterador > 11) { mesIterador = 0; anioIterador++; }
    }
    return { mes: mesesDelAno[mAct], anio: aAct.toString() };
  }, [formPagoResidente.apartamento, autoMesPendiente, pagosResidentes, propietarios]);

  useEffect(() => {
    if (siguienteMesPendienteCalculado && autoMesPendiente) {
      setFormPagoResidente(prev => ({
        ...prev, mes_seleccionado: siguienteMesPendienteCalculado.mes, anio_corresponding: siguienteMesPendienteCalculado.anio
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

  // --- MOTOR DE EXTRACCIÓN CRONOLÓGICO SEGURO (Buster antibugs de Enero) ---
  const parseFechaPago = (fechaStr: string) => {
    if (!fechaStr) return { mesNombre: 'Enero', anioStr: '2025', mesIdx: 1 };
    
    const cleanStr = fechaStr.split('T')[0].trim();
    const parts = cleanStr.split(/[-/]/);
    
    if (parts.length === 3) {
      if (parts[0].length === 4) {
        // Formato ISO estándar: YYYY-MM-DD
        const y = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10);
        if (!isNaN(y) && !isNaN(m) && m >= 1 && m <= 12) {
          return { mesNombre: mesesDelAno[m - 1], anioStr: y.toString(), mesIdx: m };
        }
      } else if (parts[2].length === 4) {
        // Formato Latino/Americano: DD/MM/YYYY o MM/DD/YYYY
        const y = parseInt(parts[2], 10);
        const p0 = parseInt(parts[0], 10);
        const p1 = parseInt(parts[1], 10);
        
        // Detección inteligente del patrón de inversión de meses (4, 8, 12 frente a día 1)
        if (p0 <= 12 && p1 === 1 && (p0 === 4 || p0 === 8 || p0 === 12)) {
          return { mesNombre: mesesDelAno[p0 - 1], anioStr: y.toString(), mesIdx: p0 };
        }
        if (!isNaN(p1) && p1 >= 1 && p1 <= 12) {
          return { mesNombre: mesesDelAno[p1 - 1], anioStr: y.toString(), mesIdx: p1 };
        }
        if (!isNaN(p0) && p0 >= 1 && p0 <= 12) {
          return { mesNombre: mesesDelAno[p0 - 1], anioStr: y.toString(), mesIdx: p0 };
        }
      }
    }
    
    const dObj = new Date(fechaStr);
    if (!isNaN(dObj.getTime())) {
      const y = dObj.getUTCFullYear();
      const m = dObj.getUTCMonth() + 1;
      return { mesNombre: mesesDelAno[m - 1] || 'Enero', anioStr: y.toString(), mesIdx: m };
    }
    
    return { mesNombre: 'Enero', anioStr: '2025', mesIdx: 1 };
  };

  // --- CORE DE CAJA CONSOLIDADO OPERATIVO ---
  const libroDiarioConsolidado = useMemo(() => {
    const ingresosAgrupados = new Map<string, { usd: number, bs: number, mesNombre: string, anioStr: string, mesIdx: number }>();
    
    pagosResidentes.forEach(p => {
      const mUSD = Number(p.monto_pagado_usd || 0);
      const mBS = Number(p.monto_pagado_bs || 0);
      if (mUSD === 0 && mBS === 0) return; 

      const fechaStr = p.fecha_pago_real ? p.fecha_pago_real.toString().trim() : '';
      const infoFecha = parseFechaPago(fechaStr);
      const clave = `${infoFecha.anioStr}-${infoFecha.mesIdx.toString().padStart(2, '0')}`;

      if (!ingresosAgrupados.has(clave)) {
        ingresosAgrupados.set(clave, {
          usd: 0, bs: 0, mesNombre: infoFecha.mesNombre, anioStr: infoFecha.anioStr, mesIdx: infoFecha.mesIdx
        });
      }
      const item = ingresosAgrupados.get(clave)!;
      item.usd += mUSD; item.bs += mBS;
    });

    let saldoUSD = 0, saldoBS = 0;
    const lineasFinales: any[] = [];
    
    transacciones.forEach(t => {
      if (Number(t.gasto_usd) > 0 || Number(t.gasto_bs) > 0) {
        const mIdx = mesesDelAno.indexOf(t.mes) !== -1 ? mesesDelAno.indexOf(t.mes) + 1 : 1;
        lineasFinales.push({
          id: t.id, anio: t.anio, mes: t.mes, descripcion: t.descripcion, referencia: t.referencia || 'N/A',
          ingreso_usd: 0, gasto_usd: Number(t.gasto_usd || 0), ingreso_bs: 0, gasto_bs: Number(t.gasto_bs || 0),
          tipo: 'GASTO', fecha_sort: `${t.anio}-${mIdx.toString().padStart(2, '0')}-02T00:00:00.000Z`
        });
      }
    });

    ingresosAgrupados.forEach((valores, clave) => {
      lineasFinales.push({
        id: `REC-${clave}`, anio: valores.anioStr, mes: valores.mesNombre,
        descripcion: `Recaudación Total Percibida en Caja (Flujo Real)`, referencia: `Pestaña 3`,
        ingreso_usd: valores.usd, gasto_usd: 0, ingreso_bs: valores.bs, gasto_bs: 0,
        tipo: 'INGRESO', fecha_sort: `${valores.anioStr}-${valores.mesIdx.toString().padStart(2, '0')}-01T00:00:00.000Z`
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
    if (!window.confirm("⚠️ ¿Desea eliminar este egreso de la relación operativa?")) return;
    const { error } = await supabase.from('finanzas_d10').delete().eq('id', id);
    if (!error) { alert("✅ Registro eliminado."); fetchTransacciones(); }
  };

  const handleEliminarPagoResidente = async (id: number) => {
    if (!window.confirm("⚠️ ¿Desea eliminar este registro de pago de la base de datos?")) return;
    const { error } = await supabase.from('pagos_residentes').delete().eq('id', id);
    if (!error) { alert("✅ Pago eliminado."); fetchPagosResidentes(); }
  };

  const handleRegistrarMovimiento = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { fecha: new Date().toISOString(), anio: formGasto.anio, mes: formGasto.mes, referencia: formGasto.referencia || 'N/A', descripcion: formGasto.descripcion, ingreso_usd: 0, gasto_usd: Number(formGasto.gasto_usd)||0, ingreso_bs: 0, gasto_bs: Number(formGasto.gasto_bs)||0 };
    const { error } = await supabase.from('finanzas_d10').insert([payload]);
    if (!error) { alert("✅ Gasto registrado."); setFormGasto({ anio: new Date().getFullYear().toString(), mes: '', referencia: 'N/A', descripcion: '', gasto_usd: '', gasto_bs: '' }); fetchTransacciones(); }
  };

  const handleRegistrarPagoResidente = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formPagoResidente.apartamento || !formPagoResidente.mes_seleccionado) return alert("Complete los campos obligatorios.");
    const piso = formPagoResidente.apartamento.split('-')[0];
    const mUSD = Number(formPagoResidente.monto_pagado_usd)||0, mBS = Number(formPagoResidente.monto_pagado_bs)||0;

    const { error } = await supabase.from('pagos_residentes').insert([{ 
      apartamento: formPagoResidente.apartamento, piso, mes_correspondiente: formPagoResidente.mes_seleccionado, 
      anio_correspondiente: formPagoResidente.anio_corresponding, monto_pagado_usd: mUSD, monto_pagado_bs: mBS, 
      fecha_pago_real: formPagoResidente.fecha_pago_real, descripcion: formPagoResidente.descripcion || 'Abono de condominio'
    }]);
    if (!error) {
      alert("✅ Recaudación guardada."); 
      setFormPagoResidente({ apartamento: '', mes_seleccionado: '', anio_corresponding: new Date().getFullYear().toString(), monto_pagado_usd: '', monto_pagado_bs: '', fecha_pago_real: new Date().toISOString().split('T')[0], descripcion: '' });
      fetchPagosResidentes();
    }
  };

  const handleSavePropietario = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from('propietarios_d10').update({ propietario: editingProp.propietario, cedula: editingProp.cedula, piso: editingProp.piso, inicio_mes: editingProp.inicio_mes, inicio_ano: editingProp.inicio_ano }).eq('id', editingProp.id);
    if (!error) { alert("✅ Censo actualizado."); setEditingProp(null); fetchPropietarios(); }
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin === 'admin') { setIsAuth(true); if (typeof window !== 'undefined') localStorage.setItem('finanzasAuth', 'true'); } else alert('Acceso denegado.');
  };

  const formatMoney = (amount: number) => new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);

  // --- FUNCCIÓN GLOBAL DE IMPRESIÓN ---
  const handlePrint = (titulo: string) => { window.print(); };

  // --- REDUCER PESTAÑA 1 ---
  const finanzasTab1Calculadas = useMemo(() => {
    const tFiltradas = libroDiarioConsolidado.filter(t => 
      (filtroAnioTab1 === 'TODOS' || t.anio?.toString().trim() === filtroAnioTab1.trim()) &&
      (filtroMesTab1 === 'TODOS' || t.mes?.toString().toLowerCase().trim() === filtroMesTab1.toLowerCase().trim())
    );
    const iUSD = tFiltradas.reduce((acc, t) => acc + Number(t.ingreso_usd || 0), 0);
    const gUSD = tFiltradas.reduce((acc, t) => acc + Number(t.gasto_usd || 0), 0);
    const iBS = tFiltradas.reduce((acc, t) => acc + Number(t.ingreso_bs || 0), 0);
    const gBS = tFiltradas.reduce((acc, t) => acc + Number(t.gasto_bs || 0), 0);
    return { ingresoUSD: iUSD, gastoUSD: gUSD, saldoUSD: iUSD - gUSD, ingresoBs: iBS, gastoBs: gBS, saldoBs: iBS - gBS };
  }, [libroDiarioConsolidado, filtroAnioTab1, filtroMesTab1]);

  // --- MOTOR ESTADO DE CUENTA PESTAÑA 2 ---
  const estadoDeCuentaGenerado = useMemo(() => {
    if (!filtroAptoTab2) return { lineas: [], deudaTotalUSD: 0, totalAbonadoUSD: 0, totalAbonadoBs: 0, propietario: null };
    const resInfo = propietarios.find((p: any) => p.apartamento === filtroAptoTab2);
    const pagosDelApto = pagosResidentes.filter(p => p.apartamento === filtroAptoTab2);
    
    const mapaPagos = new Map();
    let tUSD = 0, tBS = 0;

    pagosDelApto.forEach(p => {
      const mUSD = Number(p.monto_pagado_usd || 0), mBS = Number(p.monto_pagado_bs || 0);
      tUSD += mUSD; tBS += mBS;
      if (mUSD > 0 || mBS > 0) mapaPagos.set(`${p.mes_correspondiente?.toString().toLowerCase().trim()}-${p.anio_correspondiente?.toString().trim()}`, p);
    });

    let anioIterador = 2025, mesIterador = 0; 
    if (resInfo && resInfo.inicio_ano && resInfo.inicio_mes) {
      anioIterador = Number(resInfo.inicio_ano);
      const idxMes = mesesDelAno.findIndex(m => m.toLowerCase() === resInfo.inicio_mes.toLowerCase().trim());
      if (idxMes !== -1) mesIterador = idxMes;
    }

    const lineas = []; let deudaAcumulada = 0;
    const hoy = new Date(); const aAct = hoy.getFullYear(), mAct = hoy.getMonth();

    while (anioIterador < aAct || (anioIterador === aAct && mesIterador <= mAct)) {
      const nomMes = mesesDelAno[mesIterador], claveBusqueda = `${nomMes.toLowerCase()}-${anioIterador}`;
      const pagoReal = mapaPagos.get(claveBusqueda);

      if (pagoReal) {
        let fPago = pagoReal.fecha_pago_real || '';
        if (fPago.includes('-') && fPago.split('-')[0].length === 4) { const pt = fPago.split('-'); fPago = `${pt[2]}/${pt[1]}/${pt[0]}`; }
        lineas.push({ periodo: `${nomMes} ${anioIterador}`, estatus: 'PAGADO', cargos: 0, desc_ref: pagoReal.descripcion || `Pago cuota realizado el ${fPago}`, fecha_ejecucion: fPago || 'No registrada' });
      } else {
        lineas.push({ periodo: `${nomMes} ${anioIterador}`, estatus: 'PENDIENTE', cargos: CUOTA_MENSUAL_USD, desc_ref: 'Cuota Pendiente', fecha_ejecucion: 'Pendiente por pagar' });
        deudaAcumulada += CUOTA_MENSUAL_USD;
      }
      mesIterador++; if (mesIterador > 11) { mesIterador = 0; anioIterador++; }
    }
    return { lineas, deudaTotalUSD: deudaAcumulada, totalAbonadoUSD: tUSD, totalAbonadoBs: tBS, propietario: resInfo };
  }, [filtroAptoTab2, pagosResidentes, propietarios]);

  // --- FILTRADO PESTAÑA 3 ---
  const dataResidentesFiltrada = useMemo(() => {
    return pagosResidentes.filter(p => {
      return (
        (filtroPiso === '' || p.piso?.toString().trim() === filtroPiso.trim()) && 
        (filtroApto === '' || p.apartamento?.toString().toLowerCase().trim() === filtroApto.toLowerCase().trim()) &&
        (filtroFechaPagoReal === '' || p.fecha_pago_real === filtroFechaPagoReal)
      );
    });
  }, [pagosResidentes, filtroPiso, filtroApto, filtroFechaPagoReal]);

  const sumasTablaRecaudacion = useMemo(() => {
    return {
      usd: dataResidentesFiltrada.reduce((acc, item) => acc + Number(item.monto_pagado_usd || 0), 0),
      bs: dataResidentesFiltrada.reduce((acc, item) => acc + Number(item.monto_pagado_bs || 0), 0)
    };
  }, [dataResidentesFiltrada]);

  // --- FILTRADO PESTAÑA 4 ---
  const libroDiarioFiltrado = useMemo(() => {
    return libroDiarioConsolidado.filter(t => 
      (filtroAnioTab4 === '' || t.anio?.toString().trim() === filtroAnioTab4.trim()) &&
      (filtroMesTab4 === '' || t.mes?.toString().toLowerCase().trim() === filtroMesTab4.toLowerCase().trim())
    );
  }, [libroDiarioConsolidado, filtroAnioTab4, filtroMesTab4]);

  const sumasLibroDiario = useMemo(() => {
    return {
      ingresoUSD: libroDiarioFiltrado.reduce((acc, t) => acc + Number(t.ingreso_usd || 0), 0),
      gastoUSD: libroDiarioFiltrado.reduce((acc, t) => acc + Number(t.gasto_usd || 0), 0),
      ingresoBs: libroDiarioFiltrado.reduce((acc, t) => acc + Number(t.ingreso_bs || 0), 0),
      gastoBs: libroDiarioFiltrado.reduce((acc, t) => acc + Number(t.gasto_bs || 0), 0)
    };
  }, [libroDiarioFiltrado]);

  // --- FILTRADO PESTAÑA 5 ---
  const transaccionesMesTab5 = libroDiarioConsolidado.filter(t => 
    (filtroMesTab5 === 'TODOS' || t.mes === filtroMesTab5) && 
    (filtroAnioTab5 === 'TODOS' || t.anio?.toString() === filtroAnioTab5)
  );
  const mIngUSD = transaccionesMesTab5.reduce((acc, t) => acc + Number(t.ingreso_usd), 0), mGstUSD = transaccionesMesTab5.reduce((acc, t) => acc + Number(t.gasto_usd), 0);
  const mIngBS = transaccionesMesTab5.reduce((acc, t) => acc + Number(t.ingreso_bs), 0), mGstBS = transaccionesMesTab5.reduce((acc, t) => acc + Number(t.gasto_bs), 0);

  const propietariosFiltradosTab6 = propietarios.filter(p => p.piso?.toString() === pisoActivoTab6);

  if (!isAuth) {
    return (
      <div 
        className="min-h-screen flex items-center justify-center p-4 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "linear-gradient(rgba(2, 6, 23, 0.88), rgba(2, 6, 23, 0.95)), url('https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?q=80&w=1920')" }}
      >
        <form onSubmit={handleLoginSubmit} className="bg-slate-900 border border-slate-700 p-8 rounded-2xl shadow-2xl w-full max-w-sm relative z-10">
          <h1 className="text-xl font-bold text-center text-white uppercase tracking-widest mb-6">Torre D-10 ERP</h1>
          <input type="password" placeholder="Clave Tesorería" className="w-full bg-slate-950 border border-emerald-700 text-center rounded-lg p-3 text-white font-mono font-bold tracking-widest mb-6 outline-none focus:border-emerald-400" value={pin} onChange={e => setPin(e.target.value)} />
          <button type="submit" className="w-full bg-emerald-700 hover:bg-emerald-600 text-white font-bold py-3 rounded-lg uppercase text-xs tracking-wider transition-all">Ingresar al Sistema</button>
        </form>
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen text-slate-100 font-sans antialiased pb-12 bg-cover bg-center bg-no-repeat bg-fixed"
      style={{ backgroundImage: "linear-gradient(rgba(2, 6, 23, 0.88), rgba(2, 6, 23, 0.95)), url('https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?q=80&w=1920')" }}
    >
      <style>{`
        @media print {
          @page { size: letter portrait; margin: 1.2cm; }
          body { background-color: white !important; color: black !important; background-image: none !important; }
          .no-print { display: none !important; }
          .print-area { display: block !important; width: 100% !important; background: white !important; color: black !important; }
          .page-header-print { display: flex !important; flex-direction: column !important; margin-bottom: 15px; border-b: 2px solid black; padding-bottom: 8px; }
          .print-table th { background-color: #f3f4f6 !important; color: black !important; border: 1px solid #d1d5db !important; }
          .print-table td { border: 1px solid #e5e7eb !important; color: black !important; }
        }
        .page-header-print { display: none; }
      `}</style>
      
      <header className="no-print border-b border-slate-800/60 py-4 px-6 sticky top-0 z-40 shadow-xl bg-slate-950/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto flex flex-col gap-4">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🏛️</span>
              <div>
                <h1 className="text-sm font-bold text-white uppercase tracking-widest">Torre D-10</h1>
                <h2 className="text-[10px] text-emerald-400 uppercase tracking-widest leading-tight mt-0.5">
                  DESARROLLO HABITACIONAL CIUDAD TIUNA "SECTOR SIMÓN BOLÍVAR" DISTRITO CAPITAL SECTOR D TORRE D-10
                </h2>
              </div>
            </div>
            <div>
              <button onClick={handleLogout} className="text-[9px] bg-slate-900 text-emerald-400 hover:bg-emerald-800 hover:text-white px-3 py-1.5 rounded font-bold uppercase tracking-widest border border-slate-700 hover:border-emerald-700 transition-all">
                Cerrar Sesión
              </button>
            </div>
          </div>
          <div className="flex bg-slate-900/50 p-1 rounded-lg border border-slate-800 overflow-x-auto gap-1 custom-scrollbar">
            {[
              { id: 'RESUMEN', label: '1. Resumen' }, 
              { id: 'BUSQUEDA', label: '2. Estado de Cuenta' }, 
              { id: 'BASE_DATOS', label: '3. Recaudación' }, 
              { id: 'GASTOS_GRAL', label: '4. Relacion de Gastos' }, 
              { id: 'GASTOS_MENSUAL', label: '5. Cierre Mensual' }, 
              { id: 'GESTION_DATOS', label: '6. Gestión de Datos' }
            ].map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id as TabType)} className={`flex-none py-2 px-4 text-[10px] font-bold uppercase tracking-wider rounded transition-all ${activeTab === tab.id ? 'bg-emerald-800 text-white' : 'text-slate-400 hover:text-slate-200'}`}>{tab.label}</button>
            ))}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 md:px-6 pt-8">
        
        {/* PESTAÑA 1 */}
        {activeTab === 'RESUMEN' && (
          <div className="space-y-6 no-print">
            <div className="flex justify-between items-center border-b border-slate-800 pb-2">
              <h2 className="text-xl font-bold text-slate-200">Resumen Financiero Operativo</h2>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2"><label className="text-[10px] text-slate-400 uppercase font-bold">Año Ejercicio:</label><select value={filtroAnioTab1} onChange={e => setFiltroAnioTab1(e.target.value)} className="p-2 bg-slate-900/80 border border-slate-800 rounded text-xs font-mono text-emerald-400 focus:outline-none"><option value="TODOS">Todos los Años</option>{listaAniosFiltro.map(a => <option key={a} value={a}>Año {a}</option>)}</select></div>
                <div className="flex items-center gap-2"><label className="text-[10px] text-slate-400 uppercase font-bold">Mes:</label><select value={filtroMesTab1} onChange={e => setFiltroMesTab1(e.target.value)} className="p-2 bg-slate-900/80 border border-slate-800 rounded text-xs text-emerald-400 font-bold focus:outline-none"><option value="TODOS">Todos los Meses</option>{mesesDelAno.map(m => <option key={m} value={m}>{m}</option>)}</select></div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-slate-900/80 p-6 rounded-xl border border-slate-800 backdrop-blur-sm"><p className="text-[10px] text-slate-400 uppercase font-bold mb-1">Ingresos de Caja USD</p><p className="text-2xl font-mono font-bold text-emerald-400">${formatMoney(finanzasTab1Calculadas.ingresoUSD)}</p></div>
              <div className="bg-slate-900/80 p-6 rounded-xl border border-slate-800 backdrop-blur-sm"><p className="text-[10px] text-slate-400 uppercase font-bold mb-1">Egresos de Caja USD</p><p className="text-2xl font-mono font-bold text-red-400">${formatMoney(finanzasTab1Calculadas.gastoUSD)}</p></div>
              <div className="bg-emerald-950/60 p-6 rounded-xl border border-emerald-800/50 backdrop-blur-sm"><p className="text-[10px] text-emerald-400 uppercase font-bold mb-1">Balance Neto USD</p><p className="text-3xl font-mono font-bold text-white">${formatMoney(finanzasTab1Calculadas.saldoUSD)}</p></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-slate-900/80 p-6 rounded-xl border border-slate-800 backdrop-blur-sm"><p className="text-[10px] text-slate-400 uppercase font-bold mb-1">Ingresos de Caja Bs</p><p className="text-2xl font-mono font-bold text-emerald-400">Bs {formatMoney(finanzasTab1Calculadas.ingresoBs)}</p></div>
              <div className="bg-slate-900/80 p-6 rounded-xl border border-slate-800 backdrop-blur-sm"><p className="text-[10px] text-slate-400 uppercase font-bold mb-1">Egresos de Caja Bs</p><p className="text-2xl font-mono font-bold text-red-400">Bs {formatMoney(finanzasTab1Calculadas.gastoBs)}</p></div>
              <div className="bg-slate-900/80 p-6 rounded-xl border border-slate-800 backdrop-blur-sm"><p className="text-[10px] text-slate-400 uppercase font-bold mb-1">Balance Neto Bs</p><p className="text-3xl font-mono font-bold text-amber-500">Bs {formatMoney(finanzasTab1Calculadas.saldoBs)}</p></div>
            </div>
          </div>
        )}

        {/* PESTAÑA 2 */}
        {activeTab === 'BUSQUEDA' && (
          <div className="space-y-6">
            <div className="no-print flex justify-between items-center border-b border-slate-800 pb-2">
              <h2 className="text-xl font-bold text-slate-200">Estado de Cuenta Propietarios</h2>
              {filtroAptoTab2 && (
                <button onClick={() => handlePrint(`Estado Cuenta Apto ${filtroAptoTab2}`)} className="bg-emerald-800 hover:bg-emerald-700 text-white font-bold py-2 px-5 rounded text-xs uppercase tracking-widest transition-all shadow-md">
                  🖨️ Imprimir Estado
                </button>
              )}
            </div>
            
            <div className="no-print bg-slate-900/80 p-6 rounded-xl border border-slate-800 backdrop-blur-sm">
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2">Seleccione Apartamento</label>
              <select value={filtroAptoTab2} onChange={e => setFiltroAptoTab2(e.target.value)} className="p-3 bg-slate-950 border border-slate-800 rounded-lg text-sm font-bold text-emerald-400 focus:outline-none focus:border-emerald-500 w-64 transition-all"><option value="">-- Buscar Apto --</option>{listaApartamentos.map(a => <option key={a} value={a}>{a}</option>)}</select>
            </div>
            
            {filtroAptoTab2 && (
              <div className="print-area bg-white text-black p-6 rounded-xl border border-gray-200 shadow-sm">
                <div className="flex justify-between items-center border-b-2 border-black pb-2 mb-4">
                  <div><h1 className="text-xl font-bold tracking-wider">TORRE D-10</h1><p className="text-[10px] text-gray-600 font-bold uppercase tracking-widest">Estado de Cuenta Oficial</p></div>
                  <div className="text-right"><p className="text-lg font-bold">APARTAMENTO {filtroAptoTab2}</p><p className="text-[9px] text-gray-500 font-mono">Emisión: {new Date().toLocaleDateString()}</p></div>
                </div>
                <div className="grid grid-cols-2 gap-4 bg-gray-50 border border-gray-300 p-3 rounded mb-4 text-xs text-gray-900">
                  <div><p className="mb-0.5"><strong className="font-bold">Propietario:</strong> {estadoDeCuentaGenerado.propietario?.propietario || 'No registrado en el censo'}</p><p><strong className="font-bold">Cédula de Identidad:</strong> {estadoDeCuentaGenerado.propietario?.cedula ? `V-${estadoDeCuentaGenerado.propietario.cedula}` : 'Pendiente'}</p></div>
                  <div className="text-right"><p><strong className="font-bold">Fecha de Ingreso:</strong> <span className="uppercase">{estadoDeCuentaGenerado.propietario?.inicio_mes || 'N/A'} {estadoDeCuentaGenerado.propietario?.inicio_ano || ''}</span></p></div>
                </div>
                <div className="grid grid-cols-3 gap-4 mb-4 text-center">
                  <div className="border border-red-300 bg-red-50 p-3 rounded"><p className="text-[9px] text-red-800 uppercase tracking-widest font-bold">Deuda Pendiente</p><p className="text-xl font-mono font-bold text-red-700">${formatMoney(estadoDeCuentaGenerado.deudaTotalUSD)}</p></div>
                  <div className="border border-emerald-300 bg-emerald-50 p-3 rounded"><p className="text-[9px] text-emerald-800 uppercase tracking-widest font-bold">Abonado Total USD</p><p className="text-xl font-mono font-bold text-emerald-700">${formatMoney(estadoDeCuentaGenerado.totalAbonadoUSD)}</p></div>
                  <div className="border border-gray-300 bg-gray-100 p-3 rounded"><p className="text-[9px] text-gray-700 uppercase tracking-widest font-bold">Abonado Total Bs</p><p className="text-xl font-mono font-bold text-gray-800">Bs {formatMoney(estadoDeCuentaGenerado.totalAbonadoBs)}</p></div>
                </div>
                <table className="w-full text-left text-xs whitespace-nowrap print-table">
                  <thead className="bg-gray-800 text-white font-mono uppercase text-[9px]"><tr><th className="p-2.5">Mes Condominio</th><th className="p-2.5">Estatus</th><th className="p-2.5">Fecha Pago Real</th><th className="p-2.5 text-right">Monto Cuota</th><th className="p-2.5 text-right">Descripción / Transacción</th></tr></thead>
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
            <h2 className="text-xl font-bold border-b border-slate-800 pb-2 text-slate-200">Libro Mayor de Cobros Manuales</h2>
            <form onSubmit={handleRegistrarPagoResidente} className="bg-slate-900/80 backdrop-blur-sm p-6 rounded-xl border border-slate-800">
              <div className="mb-4 bg-slate-950/80 p-3 rounded-lg border border-slate-800 flex items-center justify-between">
                <div className="flex items-center space-x-3"><input type="checkbox" id="autoCheck" checked={autoMesPendiente} onChange={e => setAutoMesPendiente(e.target.checked)} className="h-4 w-4 accent-emerald-500 cursor-pointer" /><label htmlFor="autoCheck" className="text-xs font-bold text-slate-300 uppercase cursor-pointer">Asignar automáticamente al mes pendiente más antiguo</label></div>
                {autoMesPendiente && formPagoResidente.apartamento && <span className="text-[10px] font-mono bg-emerald-950 text-emerald-400 px-3 py-1 rounded border border-emerald-800 uppercase tracking-wider">Siguiente: {formPagoResidente.mes_seleccionado} - {formPagoResidente.anio_corresponding}</span>}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                <div><label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Apartamento</label><select value={formPagoResidente.apartamento} onChange={e => setFormPagoResidente({...formPagoResidente, apartamento: e.target.value})} className="w-full p-3 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:border-emerald-500 focus:outline-none" required><option value="">-- Elegir Apto --</option>{listaApartamentos.map(a => <option key={a} value={a}>{a}</option>)}</select></div>
                <div><label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Año de la Cuota</label><select value={formPagoResidente.anio_corresponding} onChange={e => setFormPagoResidente({...formPagoResidente, anio_corresponding: e.target.value})} disabled={autoMesPendiente} className="w-full p-3 bg-slate-950 border border-slate-800 rounded-lg text-sm font-mono text-white focus:border-emerald-500 focus:outline-none disabled:opacity-50">{listaAniosFiltro.map(ano => <option key={ano} value={ano}>{ano}</option>)}</select></div>
                <div><label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Mes de la Cuota</label><select value={formPagoResidente.mes_seleccionado} onChange={e => setFormPagoResidente({...formPagoResidente, mes_seleccionado: e.target.value})} disabled={autoMesPendiente} className="w-full p-3 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:border-emerald-500 focus:outline-none disabled:opacity-50"><option value="">-- Asignar Mes --</option>{mesesDelAno.map(m => <option key={m} value={m}>{m}</option>)}</select></div>
                <div><label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Fecha de Pago</label><input type="date" value={formPagoResidente.fecha_pago_real} onChange={e => setFormPagoResidente({...formPagoResidente, fecha_pago_real: e.target.value})} className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:border-emerald-500 focus:outline-none cursor-pointer" required /></div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div><label className="block text-[10px] font-bold text-emerald-400 uppercase mb-1">Monto Abonado USD</label><input type="number" step="0.01" placeholder="0.00" value={formPagoResidente.monto_pagado_usd} onChange={e => setFormPagoResidente({...formPagoResidente, monto_pagado_usd: e.target.value})} className="w-full p-3 bg-slate-950 border border-slate-800 rounded-lg text-sm font-mono text-white focus:border-emerald-500 focus:outline-none" /></div>
                <div><label className="block text-[10px] font-bold text-emerald-400 uppercase mb-1">Monto Abonado BS</label><input type="number" step="0.01" placeholder="0.00" value={formPagoResidente.monto_pagado_bs} onChange={e => setFormPagoResidente({...formPagoResidente, monto_pagado_bs: e.target.value})} className="w-full p-3 bg-slate-950 border border-slate-800 rounded-lg text-sm font-mono text-white focus:border-emerald-500 focus:outline-none" /></div>
                <div><label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Descripción / Nomenclatura Manual</label><input type="text" placeholder="Ej: PAGO OCTUBRE 2023 - REF 1234" value={formPagoResidente.descripcion} onChange={e => setFormPagoResidente({...formPagoResidente, descripcion: e.target.value})} className="w-full p-3 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:border-emerald-500 focus:outline-none" /></div>
              </div>
              <div className="flex justify-end"><button type="submit" className="bg-emerald-800 hover:bg-emerald-700 text-white font-bold py-3 px-6 rounded-lg text-xs uppercase tracking-widest shadow-md transition-all">💾 Registrar Cobro</button></div>
            </form>

            <div className="bg-slate-900/90 backdrop-blur-md p-4 rounded-xl border border-slate-800 flex flex-wrap gap-4 items-center justify-between shadow-lg">
              <div className="flex flex-wrap gap-2.5 items-center">
                <span className="text-[10px] font-mono font-bold text-slate-400 uppercase bg-slate-950 px-2.5 py-1.5 rounded border border-slate-800">Filtros Activos</span>
                <select value={filtroPiso} onChange={e => setFiltroPiso(e.target.value)} className="p-2 bg-slate-950 border border-slate-800 rounded text-xs text-slate-300 font-sans outline-none"><option value="">Piso (Todos)</option>{listaPisos.map(p => <option key={p} value={p}>Piso {p}</option>)}</select>
                <select value={filtroApto} onChange={e => setFiltroApto(e.target.value)} className="p-2 bg-slate-950 border border-slate-800 rounded text-xs text-emerald-400 font-bold outline-none"><option value="">Apto (Todos)</option>{listaApartamentos.map(a => <option key={a} value={a}>{a}</option>)}</select>
                {/* SELECT DE FECHAS DE PAGO CORREGIDO POR ORDEN CRONOLÓGICO */}
                <select value={filtroFechaPagoReal} onChange={e => setFiltroFechaPagoReal(e.target.value)} className="p-2 bg-slate-950 border border-slate-800 rounded text-xs text-amber-400 font-bold outline-none font-mono">
                  <option value="">Fecha de Pago (Todas)</option>
                  {listaFechasPagoPestaña3.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>
              <div className="bg-slate-950 px-4 py-2 rounded-lg border border-emerald-900/50 flex gap-4 text-xs font-mono shadow-inner">
                <div><span className="text-slate-500 uppercase text-[9px] font-bold block tracking-wider">Total Filtro USD</span><span className="text-emerald-400 font-bold text-sm">${formatMoney(sumasTablaRecaudacion.usd)}</span></div>
                <div className="border-l border-slate-800 pl-4"><span className="text-slate-500 uppercase text-[9px] font-bold block tracking-wider">Total Filtro Bs</span><span className="text-emerald-400 font-bold text-sm">Bs {formatMoney(sumasTablaRecaudacion.bs)}</span></div>
              </div>
            </div>

            <div className="bg-slate-900/90 backdrop-blur-md rounded-xl border border-slate-800 overflow-x-auto shadow-2xl">
              <table className="w-full text-left text-xs table-fixed">
                <thead className="bg-slate-950/80 text-slate-400 font-mono uppercase text-[9px] border-b border-slate-800">
                  <tr><th className="p-4 w-16">Piso</th><th className="p-4 w-24">Apto</th><th className="p-4 w-32">Fecha Pago</th><th className="p-4 w-auto">Descripción / Nomenclatura Completa</th><th className="p-4 text-right w-24">Abono USD</th><th className="p-4 text-right w-28">Abono Bs</th><th className="p-4 text-center w-20">Acción</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {dataResidentesFiltrada.length === 0 ? (<tr><td colSpan={7} className="p-6 text-center text-slate-500 font-mono">No existen abonos que coincidan.</td></tr>) : (
                    dataResidentesFiltrada.map(item => (
                      <tr key={item.id} className="hover:bg-slate-800/40 align-top">
                        <td className="p-4 font-mono text-slate-400">{item.piso}</td>
                        <td className="p-4 font-bold text-emerald-400">{item.apartamento}</td>
                        <td className="p-4 font-mono text-slate-300">{item.fecha_pago_real}</td>
                        <td className="p-4 text-slate-300 text-[11px] font-mono whitespace-normal break-words leading-relaxed">{item.descripcion}</td>
                        <td className="p-4 text-right font-mono font-bold text-emerald-400">${formatMoney(item.monto_pagado_usd)}</td>
                        <td className="p-4 text-right font-mono font-bold text-emerald-400">Bs {formatMoney(item.monto_pagado_bs)}</td>
                        <td className="p-4 text-center"><button onClick={() => handleEliminarPagoResidente(item.id)} className="bg-slate-800 text-red-400 hover:bg-red-600 hover:text-white px-2 py-1 rounded text-xs border border-slate-700 transition-all">🗑️</button></td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* PESTAÑA 4 - RELACION DE GASTOS */}
        {activeTab === 'GASTOS_GRAL' && (
          <div className="space-y-6 no-print">
            <h2 className="text-xl font-bold border-b border-slate-800 pb-2 text-slate-200">Relacion de Gastos Mensual</h2>
            <form onSubmit={handleRegistrarMovimiento} className="bg-slate-900/80 backdrop-blur-sm p-6 rounded-xl border border-slate-800">
              {/* FORMULARIO CORREGIDO CON CASILLA EXPANDIDA Y SIN FACTURA REF */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                <input type="text" placeholder="Año" value={formGasto.anio} onChange={e => setFormGasto({...formGasto, anio: e.target.value})} className="p-3 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:border-emerald-500 outline-none" required />
                <select value={formGasto.mes} onChange={e => setFormGasto({...formGasto, mes: e.target.value})} className="p-3 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:border-emerald-500 outline-none" required><option value="">-- Mes Contable --</option>{mesesDelAno.map(m => <option key={m} value={m}>{m}</option>)}</select>
                <input type="text" placeholder="Descripción del Egreso" value={formGasto.descripcion} onChange={e => setFormGasto({...formGasto, descripcion: e.target.value})} className="p-3 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:border-emerald-500 outline-none md:col-span-2" required />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 bg-red-950/20 p-4 rounded-lg border border-red-900/30">
                <div><label className="block text-[10px] font-bold text-red-400 mb-1">Salida USD (-)</label><input type="number" step="0.01" value={formGasto.gasto_usd} onChange={e => setFormGasto({...formGasto, gasto_usd: e.target.value})} className="w-full p-3 bg-slate-950 border border-red-900/50 rounded-lg text-sm text-white font-mono focus:border-red-500 outline-none" /></div>
                <div><label className="block text-[10px] font-bold text-red-400 mb-1">Salida Bs (-)</label><input type="number" step="0.01" value={formGasto.gasto_bs} onChange={e => setFormGasto({...formGasto, gasto_bs: e.target.value})} className="w-full p-3 bg-slate-950 border border-red-900/50 rounded-lg text-sm text-white font-mono focus:border-red-500 outline-none" /></div>
              </div>
              <div className="flex justify-end"><button type="submit" className="bg-red-800 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-lg text-xs uppercase tracking-widest shadow-md transition-all">💾 Cargar Egreso</button></div>
            </form>

            <div className="bg-slate-950/80 backdrop-blur-md p-4 rounded-xl border border-emerald-900/40 flex flex-wrap gap-6 items-center justify-start shadow-inner">
               <span className="text-[10px] font-mono font-bold text-slate-500 uppercase">Totales de Búsqueda:</span>
               <div className="flex gap-4 text-xs font-mono">
                 <div><span className="text-slate-500 uppercase text-[9px] font-bold block">Ingreso USD</span><span className="text-emerald-400 font-bold">${formatMoney(sumasLibroDiario.ingresoUSD)}</span></div>
                 <div><span className="text-slate-500 uppercase text-[9px] font-bold block">Gasto USD</span><span className="text-red-400 font-bold">${formatMoney(sumasLibroDiario.gastoUSD)}</span></div>
                 <div className="border-l border-slate-800 pl-4"><span className="text-slate-500 uppercase text-[9px] font-bold block">Ingreso Bs</span><span className="text-emerald-400 font-bold">Bs {formatMoney(sumasLibroDiario.ingresoBs)}</span></div>
                 <div><span className="text-slate-500 uppercase text-[9px] font-bold block">Gasto Bs</span><span className="text-red-400 font-bold">Bs {formatMoney(sumasLibroDiario.gastoBs)}</span></div>
               </div>
            </div>

            <div className="bg-slate-900/90 backdrop-blur-md rounded-xl border border-slate-800 overflow-x-auto shadow-2xl">
               <table className="w-full text-left text-xs whitespace-nowrap">
                 <thead className="bg-slate-950/80 text-slate-400 font-mono uppercase text-[9px]">
                   <tr>
                     <th className="p-4 w-48 bg-slate-900/60 border-r border-slate-800">
                       <div className="space-y-1"><span className="block text-slate-400">Periodo Contable</span>
                         <div className="flex gap-1">
                           <select value={filtroAnioTab4} onChange={e => setFiltroAnioTab4(e.target.value)} className="p-1 bg-slate-950 border border-slate-700 rounded text-[9px] text-white outline-none font-sans normal-case"><option value="">Año (Todos)</option>{listaAniosFiltro.map(a => <option key={a} value={a}>{a}</option>)}</select>
                           <select value={filtroMesTab4} onChange={e => setFiltroMesTab4(e.target.value)} className="p-1 bg-slate-950 border border-slate-700 rounded text-[9px] text-white outline-none font-sans normal-case"><option value="">Mes (Todos)</option>{mesesDelAno.map(m => <option key={m} value={m}>{m}</option>)}</select>
                         </div>
                       </div>
                     </th>
                     <th className="p-4">Descripción</th><th className="p-4 text-right text-emerald-400">Ingreso $</th><th className="p-4 text-right text-red-400">Gasto $</th><th className="p-4 text-right font-bold">Saldo Caja $</th><th className="p-4 text-right text-emerald-400">Ingreso Bs</th><th className="p-4 text-right text-red-400">Gasto Bs</th><th className="p-4 text-right font-bold">Saldo Caja Bs</th><th className="p-4 text-center">Acciones</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-800/60">
                    {libroDiarioFiltrado.length === 0 ? (<tr><td colSpan={9} className="p-6 text-center text-slate-500 font-mono">No existen movimientos que coincidan con el periodo filtrado.</td></tr>) : (
                      libroDiarioFiltrado.map((t, index) => (
                        <tr key={index} className="hover:bg-slate-800/40">
                          <td className="p-4 font-mono border-r border-slate-800/60"><span className="font-bold text-white">{t.anio}</span> <span className="text-slate-400 text-[10px]">{t.mes}</span></td>
                          {/* COLUMNA DESCRIPCIÓN CON AUTOAJUSTE DE LÍNEAS MULTIPLES COMPLETO */}
                          <td className="p-4 whitespace-normal break-words max-w-[340px] leading-relaxed">
                            <div className="font-medium text-slate-200">{t.descripcion}</div>
                          </td>
                          <td className="p-4 text-right font-mono text-emerald-500">{Number(t.ingreso_usd) > 0 ? `+${formatMoney(t.ingreso_usd)}` : '-'}</td>
                          <td className="p-4 text-right font-mono text-red-500">{Number(t.gasto_usd) > 0 ? `-${formatMoney(t.gasto_usd)}` : '-'}</td>
                          <td className="p-4 text-right font-mono font-bold bg-slate-950/40 text-slate-100">{formatMoney(t.saldo_usd)}</td>
                          <td className="p-4 text-right font-mono text-emerald-500">{Number(t.ingreso_bs) > 0 ? `+${formatMoney(t.ingreso_bs)}` : '-'}</td>
                          <td className="p-4 text-right font-mono text-red-500">{Number(t.gasto_bs) > 0 ? `-${formatMoney(t.gasto_bs)}` : '-'}</td>
                          <td className="p-4 text-right font-mono font-bold bg-slate-950/40 text-slate-100">{formatMoney(t.saldo_bs)}</td>
                          <td className="p-4 text-center"><button onClick={() => handleEliminarTransaccion(t.id)} className="bg-slate-800 text-red-400 hover:bg-red-600 hover:text-white px-2 py-1 rounded text-xs border border-slate-700 transition-all">🗑️</button></td>
                        </tr>
                      ))
                    )}
                 </tbody>
               </table>
            </div>
          </div>
        )}

        {/* PESTAÑA 5 - CIERRE MENSUAL CORREGIDO PARA IMPRESIÓN Y FILTRO */}
        {activeTab === 'GASTOS_MENSUAL' && (
          <div className="space-y-6"> {/* REMOVIDO NO-PRINT DE AQUÍ PARA QUE HAGA LA VISTA PREVIA CORRECTAMENTE */}
            <div className="no-print flex justify-between items-center border-b border-slate-800 pb-2">
              <h2 className="text-xl font-bold text-slate-200">Cierre Contable Mensual</h2>
              {filtroMesTab5 && filtroAnioTab5 && (
                <button onClick={() => handlePrint(`Cierre Mensual - ${filtroMesTab5} ${filtroAnioTab5}`)} className="bg-emerald-800 hover:bg-emerald-700 text-white font-bold py-2 px-4 rounded text-xs uppercase tracking-widest shadow-md transition-all">
                  🖨️ Imprimir Cierre
                </button>
              )}
            </div>
            <div className="no-print bg-slate-900/80 backdrop-blur-sm p-6 rounded-xl border border-slate-800 flex gap-4">
              <div className="w-1/4">
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Año</label>
                <select value={filtroAnioTab5} onChange={e => setFiltroAnioTab5(e.target.value)} className="w-full p-3 bg-slate-950 border border-slate-800 rounded-lg text-sm font-mono text-white focus:border-emerald-500 outline-none">
                  <option value="TODOS">Todos los Años</option>
                  {listaAniosFiltro.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
              <div className="w-1/3">
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Seleccione Mes</label>
                <select value={filtroMesTab5} onChange={e => setFiltroMesTab5(e.target.value)} className="w-full p-3 bg-slate-950 border border-slate-800 rounded-lg text-sm font-bold text-white focus:border-emerald-500 outline-none">
                  <option value="TODOS">Todos los Meses</option>
                  {mesesDelAno.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
            </div>
            
            {(filtroMesTab5 || filtroAnioTab5) && (
              <div className="print-area bg-white text-black p-8 rounded-xl border border-gray-200 shadow-sm">
                <div className="border-b-2 border-black pb-4 mb-6 flex justify-between items-start">
                  <div><h1 className="text-xl font-bold uppercase tracking-wider">TORRE D-10</h1><p className="text-xs text-gray-600 font-bold uppercase mt-1">Cierre de Flujo de Caja</p></div>
                  <div className="text-right"><p className="text-lg font-bold uppercase">{filtroMesTab5} {filtroAnioTab5}</p><p className="text-[10px] text-gray-500 font-mono">Generado: {new Date().toLocaleDateString()}</p></div>
                </div>
                <div className="grid grid-cols-2 gap-6 mb-6">
                  <div className="bg-gray-50 p-4 rounded border border-gray-300"><p className="text-[10px] font-bold text-gray-600 uppercase mb-2">Neto USD</p><div className="flex justify-between text-xs mb-1"><span>Ingresos:</span><span className="text-emerald-700 font-bold">+${formatMoney(mIngUSD)}</span></div><div className="flex justify-between text-xs mb-1"><span>Egresos:</span><span className="text-red-700 font-bold">-${formatMoney(mGstUSD)}</span></div><div className="flex justify-between text-sm border-t border-gray-300 pt-1 font-bold"><span>Total:</span><span className={mIngUSD - mGstUSD >= 0 ? 'text-emerald-700' : 'text-red-700'}>${formatMoney(mIngUSD - mGstUSD)}</span></div></div>
                  <div className="bg-gray-50 p-4 rounded border border-gray-300"><p className="text-[10px] font-bold text-gray-600 uppercase mb-2">Neto Bolívares</p><div className="flex justify-between text-xs mb-1"><span>Ingresos:</span><span className="text-emerald-700 font-bold">+Bs {formatMoney(mIngBS)}</span></div><div className="flex justify-between text-xs mb-1"><span>Egresos:</span><span className="text-red-700 font-bold">-Bs {formatMoney(mGstBS)}</span></div><div className="flex justify-between text-sm border-t border-gray-300 pt-1 font-bold"><span>Total:</span><span className={mIngBS - mGstBS >= 0 ? 'text-emerald-700' : 'text-red-700'}>Bs {formatMoney(mIngBS - mGstBS)}</span></div></div>
                </div>
                <table className="w-full text-left text-[11px] whitespace-nowrap print-table">
                  <thead className="bg-gray-800 text-white uppercase text-[9px]">
                    <tr><th className="p-2">ID</th><th className="p-2">Descripción</th><th className="p-2 text-right">Ingreso $</th><th className="p-2 text-right">Egreso $</th><th className="p-2 text-right">Saldo $</th><th className="p-2 text-right">Ingreso Bs</th><th className="p-2 text-right">Egreso Bs</th><th className="p-2 text-right">Saldo Bs</th></tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {transaccionesMesTab5.map((t, idx) => (
                      <tr key={idx}>
                        <td className="p-2 text-gray-500 font-mono">#{t.id}</td>
                        {/* PESTAÑA 5: DESCRIPCIÓN CON AUTOAJUSTE ADAPTATIVO A DOS O MÁS LÍNEAS */}
                        <td className="p-2 text-gray-800 font-medium whitespace-normal break-words max-w-[280px] leading-relaxed">{t.descripcion}</td>
                        <td className="p-2 text-right font-mono text-emerald-700">+${formatMoney(t.ingreso_usd)}</td>
                        <td className="p-2 text-right font-mono text-red-700">-${formatMoney(t.gasto_usd)}</td>
                        <td className="p-2 text-right font-mono font-bold bg-gray-100">{formatMoney(t.saldo_usd)}</td>
                        <td className="p-2 text-right font-mono text-emerald-700">+Bs {formatMoney(t.ingreso_bs)}</td>
                        <td className="p-2 text-right font-mono text-red-700">-Bs {formatMoney(t.gasto_bs)}</td>
                        <td className="p-2 text-right font-mono font-bold bg-gray-100">{formatMoney(t.saldo_bs)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* PESTAÑA 6 */}
        {activeTab === 'GESTION_DATOS' && (
          <div className="no-print flex flex-col gap-6 animate-fadeIn">
            <div className="flex flex-wrap gap-1.5 pb-2">
              {listaPisos.map(p => (
                <button key={p} onClick={() => setPisoActivoTab6(p)} className={`px-3 py-1.5 flex-none rounded-lg text-[10px] font-bold tracking-wider uppercase transition-all shadow-sm ${pisoActivoTab6 === p ? 'bg-emerald-800 text-white shadow-md' : 'bg-slate-900/80 backdrop-blur-sm text-slate-400 border border-slate-800 hover:bg-slate-800'}`}>
                  Piso {p}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-fit">
              {propietariosFiltradosTab6.map(item => {
                const nombre = item.propietario?.trim().toLowerCase() || '';
                const vacio = (nombre === '' || nombre === 'vacío' || nombre === 'vacio');
                return (
                  <div key={item.id} className="p-5 rounded-xl border border-slate-800 bg-slate-900/80 backdrop-blur-sm flex flex-col justify-between hover:border-slate-700 transition-colors">
                    <div className="flex justify-between items-start mb-4">
                      <div><span className="text-xl font-bold text-white">Apto {item.apartamento} <span className="text-xs text-slate-500 font-mono ml-2">(Piso {item.piso})</span></span><span className="text-xs font-medium text-emerald-400 block uppercase mt-0.5">{item.propietario || 'Sin registro en censo'}</span></div>
                      <span className={`text-[9px] font-mono uppercase tracking-widest px-2.5 py-1 rounded border ${vacio ? 'bg-red-950/40 text-red-400 border-red-900/40' : 'bg-emerald-950/40 text-emerald-400 border-emerald-900/40'}`}>{vacio ? 'Disponible' : 'Censado'}</span>
                    </div>
                    <div className="text-[11px] font-mono text-slate-400 space-y-1.5 border-t border-slate-800 pt-3 mb-4">
                      <div className="flex justify-between"><span>CÉDULA DE IDENTIDAD:</span><span className="text-slate-200 font-sans font-medium">{item.cedula ? `V-${item.cedula}` : 'Pendiente'}</span></div>
                      <div className="flex justify-between"><span>FECHA DE INGRESO A LA TORRE:</span><span className="text-slate-200 font-sans font-medium uppercase">{item.inicio_mes ? `${item.inicio_mes} ${item.inicio_ano}` : 'Pendiente'}</span></div>
                    </div>
                    <button onClick={() => setEditingProp(item)} className="w-full bg-slate-800/80 hover:bg-slate-700 text-slate-300 font-bold py-2.5 rounded-lg text-xs uppercase border border-slate-700 transition-colors">Modificar Registro</button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* MODAL EDICIÓN CENSO */}
        {editingProp && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50 no-print">
            <form onSubmit={handleSavePropietario} className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-md space-y-4 shadow-2xl">
              <h3 className="text-base font-bold uppercase text-white border-b border-slate-800 pb-2">Editar Apartamento {editingProp.apartamento}</h3>
              <div><label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Nombre Completo del Propietario</label><input type="text" value={editingProp.propietario || ''} onChange={e => setEditingProp({...editingProp, propietario: e.target.value})} className="w-full bg-slate-950 border border-slate-800 p-3 rounded-lg text-sm text-white" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Cédula (Sólo Números)</label><input type="text" value={editingProp.cedula || ''} onChange={e => setEditingProp({...editingProp, cedula: e.target.value})} className="w-full bg-slate-950 border border-slate-800 p-3 rounded-lg text-sm text-white" /></div>
                <div><label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Piso</label><input type="text" value={editingProp.piso || ''} onChange={e => setEditingProp({...editingProp, piso: e.target.value})} className="w-full bg-slate-950 border border-slate-800 p-3 rounded-lg text-sm text-white" /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Mes de Ingreso</label><select value={editingProp.inicio_mes || ''} onChange={e => setEditingProp({...editingProp, inicio_mes: e.target.value})} className="w-full bg-slate-950 border border-slate-800 p-3 rounded-lg text-sm text-white capitalize"><option value="">-- Mes --</option>{mesesDelAno.map(m => <option key={m} value={m.toLowerCase()}>{m}</option>)}</select></div>
                <div><label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Año de Ingreso</label><select value={editingProp.inicio_ano || ''} onChange={e => setEditingProp({...editingProp, inicio_ano: e.target.value})} className="w-full bg-slate-950 border border-slate-800 p-3 rounded-lg text-sm text-white"><option value="">-- Año --</option>{listaAniosFiltro.map(a => <option key={a} value={a}>{a}</option>)}</select></div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setEditingProp(null)} className="flex-1 bg-slate-800 text-slate-300 font-bold py-3 rounded-lg text-xs uppercase border border-slate-700 hover:bg-slate-700 transition-all">Cerrar</button>
                <button type="submit" className="flex-1 bg-emerald-800 hover:bg-emerald-700 text-white font-bold py-3 rounded-lg text-xs uppercase shadow-lg transition-all">Guardar Cambios</button>
              </div>
            </form>
          </div>
        )}

      </main>
    </div>
  );
}