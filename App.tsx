import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, BadgeCheck, CalendarDays, CircleDollarSign, Download, Eye, FileSpreadsheet, GraduationCap, Home, MapPin, Plus, Search, Shield, Trophy, Users, Wallet, X } from 'lucide-react';

type PagoRecord = { id: string; value: { alumno: string; mes: string; monto: number; estado: string } };
type AlumnoRecord = { id: string; value: { nombre: string; categoria: string; tutor: string; estado: string } };

type Cuota = { id: string; alumno: string; categoria: string; mes: string; monto: number; estado: 'Pagado' | 'Deuda' | 'Becado' | 'Media Beca' };

const cuotasBase: Cuota[] = [
  { id: 'c1', alumno: 'Thiago Benítez', categoria: 'Sub-9', mes: 'Noviembre', monto: 120000, estado: 'Pagado' },
  { id: 'c2', alumno: 'Sofía Fleitas', categoria: 'Sub-11', mes: 'Noviembre', monto: 120000, estado: 'Deuda' },
  { id: 'c3', alumno: 'Bruno Duarte', categoria: 'Sub-7', mes: 'Noviembre', monto: 120000, estado: 'Pagado' },
  { id: 'c4', alumno: 'Valentina Romero', categoria: 'Sub-13', mes: 'Noviembre', monto: 120000, estado: 'Becado' },
  { id: 'c5', alumno: 'Mateo González', categoria: 'Sub-9', mes: 'Noviembre', monto: 120000, estado: 'Media Beca' },
  { id: 'c6', alumno: 'Lucía Acosta', categoria: 'Sub-11', mes: 'Noviembre', monto: 60000, estado: 'Deuda' },
  { id: 'c7', alumno: 'Diego Martínez', categoria: 'Sub-13', mes: 'Noviembre', monto: 120000, estado: 'Pagado' },
  { id: 'c8', alumno: 'Camila Ortiz', categoria: 'Sub-7', mes: 'Noviembre', monto: 120000, estado: 'Pagado' },
];

const alumnosBase = [
  { nombre: 'Thiago Benítez', categoria: 'Sub-9', estado: 'Activo' },
  { nombre: 'Sofía Fleitas', categoria: 'Sub-11', estado: 'Activo' },
  { nombre: 'Bruno Duarte', categoria: 'Sub-7', estado: 'Activo' },
  { nombre: 'Valentina Romero', categoria: 'Sub-13', estado: 'Becada' },
  { nombre: 'Mateo González', categoria: 'Sub-9', estado: 'Media Beca' },
  { nombre: 'Lucía Acosta', categoria: 'Sub-11', estado: 'Activo' },
  { nombre: 'Diego Martínez', categoria: 'Sub-13', estado: 'Activo' },
  { nombre: 'Camila Ortiz', categoria: 'Sub-7', estado: 'Activo' },
];

async function api(action: string, args: Record<string, unknown>) {
  const res = await fetch('actions', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action, args }) });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json?.error) throw new Error(json?.error || `No se pudo completar la operación (${res.status})`);
  return json.data;
}

function formatGs(n: number) { return `Gs ${n.toLocaleString('es-PY')}`; }
function initial(name: string) { return name.trim().charAt(0).toUpperCase(); }

function Badge({ estado }: { estado: string }) {
  const styles: Record<string, string> = {
    Pagado: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    Deuda: 'bg-red-50 text-red-700 border-red-200',
    Becado: 'bg-blue-50 text-[#002A7A] border-blue-200',
    'Media Beca': 'bg-amber-50 text-amber-800 border-amber-200',
    Becada: 'bg-blue-50 text-[#002A7A] border-blue-200',
    Activo: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  };
  return <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-bold ${styles[estado] || 'bg-slate-50 text-slate-700 border-slate-200'}`}>{estado === 'Pagado' && <BadgeCheck size={13} />} {estado}</span>;
}

function Crest({ size = 58 }: { size?: number }) {
  return <div className="grid shrink-0 place-items-center rounded-full border-[3px] border-[#E30613] bg-[#0A1E46] text-white shadow-lg" style={{ width: size, height: size }} aria-label="Escudo inspirado en Cerro Porteño con las letras CCP"><span className="font-display font-extrabold tracking-tight" style={{ fontSize: size * 0.30 }}>CCP</span></div>;
}

export default function App() {
  const [view, setView] = useState<'inicio' | 'alumnos' | 'cuotas' | 'actividad'>('inicio');
  const [search, setSearch] = useState('');
  const [filtro, setFiltro] = useState('Todos');
  const [showImport, setShowImport] = useState(false);
  const [showConciliacion, setShowConciliacion] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [nombre, setNombre] = useState('');
  const [categoria, setCategoria] = useState('Sub-7');
  const [tutor, setTutor] = useState('');
  const [pagos, setPagos] = useState<PagoRecord[]>([]);
  const [alumnosGuardados, setAlumnosGuardados] = useState<AlumnoRecord[]>([]);
  const [busy, setBusy] = useState(false);
  const [busyPago, setBusyPago] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const reloadRecords = async () => {
    const [p, a] = await Promise.all([
      api('records.list', { collection: 'golcontrol_pagos' }),
      api('records.list', { collection: 'golcontrol_alumnos' }),
    ]);
    setPagos(p?.records || []);
    setAlumnosGuardados(a?.records || []);
  };

  useEffect(() => {
    reloadRecords().catch(() => setError('La conexión con el registro no está disponible en esta vista previa. Los datos de ejemplo se muestran solo para consulta.'));
  }, []);

  const pagosKey = useMemo(() => new Set(pagos.map((p) => `${p.value.alumno}|${p.value.mes}`)), [pagos]);

  const cuotas = useMemo(() => cuotasBase.map((c) => pagosKey.has(`${c.alumno}|${c.mes}`) ? { ...c, estado: 'Pagado' as const } : c), [pagosKey]);
  const filtradas = cuotas.filter((c) => (filtro === 'Todos' || c.estado === filtro) && c.alumno.toLowerCase().includes(search.toLowerCase()));
  const alumnosVisibles = [...alumnosGuardados.map((a) => ({ nombre: a.value.nombre, categoria: a.value.categoria, estado: a.value.estado })), ...alumnosBase].filter((a) => a.nombre.toLowerCase().includes(search.toLowerCase()));

  const registrarPago = async (cuota: Cuota) => {
    setBusyPago(cuota.id); setError(''); setMessage('');
    try {
      await api('records.create', { collection: 'golcontrol_pagos', value: { alumno: cuota.alumno, mes: cuota.mes, monto: cuota.monto, estado: 'Pagado' }, idempotency_key: `pago-${cuota.id}-${cuota.mes}` });
      await reloadRecords();
      setMessage(`Pago de ${cuota.alumno} guardado como Pagado.`);
    } catch (e) { setError(e instanceof Error ? e.message : 'No se pudo guardar el pago.'); }
    setBusyPago(null);
  };

  const guardarAlumno = async () => {
    if (!nombre.trim() || !tutor.trim()) { setError('Completá el nombre del alumno y el contacto del tutor.'); return; }
    setBusy(true); setError(''); setMessage('');
    const value = { nombre: nombre.trim(), categoria, tutor: tutor.trim(), estado: 'Activo' };
    try {
      await api('records.create', { collection: 'golcontrol_alumnos', value, idempotency_key: `alumno-${nombre.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${categoria}` });
      await reloadRecords();
      setMessage(`${value.nombre} quedó registrado en ${categoria}.`);
      setNombre(''); setTutor(''); setShowForm(false);
    } catch (e) { setError(e instanceof Error ? e.message : 'No se pudo guardar el alumno.'); }
    setBusy(false);
  };

  const nav = [
    { id: 'inicio' as const, label: 'Inicio', icon: Home },
    { id: 'alumnos' as const, label: 'Alumnos', icon: Users },
    { id: 'cuotas' as const, label: 'Cuotas', icon: Wallet },
    { id: 'actividad' as const, label: 'Actividad', icon: CalendarDays },
  ];

  const golControlShellStyle = { boxSizing: 'border-box', paddingTop: 'var(--safe-area-inset-top)' } as const;
  return (
    <div data-safe-area-inset-root="true" style={golControlShellStyle} className="min-h-screen bg-[var(--bg)] text-[var(--ink)] overflow-x-clip">
      <header className="bg-[#0A1E46] text-white">
        <div className="stripes h-2" />
        <div className="mx-auto flex max-w-[1280px] flex-wrap items-center gap-3 px-4 py-4 sm:px-6">
          <Crest />
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-red-300">GolControl · Franquicia Oficial</p>
            <h1 className="font-display text-[clamp(1.55rem,4vw,2.5rem)] font-extrabold leading-[0.95] [overflow-wrap:anywhere]">Escuela de Fútbol Cerro Porteño — Encarnación</h1>
            <p className="mt-1 text-sm text-blue-100">Categorías Formativas · Gestión de alumnos, cuotas y actividades</p>
          </div>
          <div className="hidden items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-2 text-xs font-bold lg:flex"><Shield size={16} className="text-red-400" /> Encarnación, Paraguay</div>
        </div>
        <div className="stripes-soft h-1.5" />
      </header>

      <div className="mx-auto flex max-w-[1280px] items-start gap-5 px-3 pb-24 sm:px-5 md:pb-8">
        <aside className="sticky top-4 mt-5 hidden w-60 shrink-0 overflow-hidden rounded-2xl bg-[#0A1E46] text-white shadow-xl md:block">
          <div className="p-4">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-200">Panel del club</p>
            <p className="mt-1 font-display text-xl font-bold leading-tight">Gestión formativa</p>
          </div>
          <nav className="space-y-1 px-3 pb-4">
            {nav.map((item) => <button key={item.id} onClick={() => setView(item.id)} className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold ${view === item.id ? 'bg-[#E30613] text-white' : 'text-blue-100 hover:bg-white/10'}`}><item.icon size={18} />{item.label}</button>)}
          </nav>
          <div className="m-3 rounded-xl bg-white/10 p-4">
            <Trophy className="text-amber-300" size={22} />
            <p className="mt-2 text-sm font-bold leading-snug">“El Ciclón de Barrio Obrero forma campeones.”</p>
            <p className="mt-1 text-xs text-blue-100">Disciplina, respeto y juego en equipo.</p>
          </div>
        </aside>

        <main className="min-w-0 flex-1 pt-5">
          {(message || error) && <div className="mb-4 space-y-2">{message && <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">{message}</div>}{error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">{error}</div>}</div>}

          {view === 'inicio' && <>
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div><p className="text-xs font-bold uppercase tracking-[0.2em] text-[#E30613]">Noviembre · Temporada formativa</p><h2 className="font-display text-[clamp(2rem,5vw,3.2rem)] font-extrabold leading-none">Resumen del mes</h2></div>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => setShowImport(true)} className="flex items-center gap-2 rounded-xl bg-[#E30613] px-4 py-3 text-sm font-bold text-white shadow-md hover:bg-[#C10510]"><FileSpreadsheet size={18} /> Importar Excel</button>
                <button onClick={() => setShowConciliacion(true)} className="flex items-center gap-2 rounded-xl bg-[#002A7A] px-4 py-3 text-sm font-bold text-white shadow-md hover:bg-[#0A1E46]"><Eye size={18} /> Ver Conciliación</button>
              </div>
            </div>

            <section className="mt-5 grid grid-cols-2 gap-3 xl:grid-cols-4">
              {[
                { label: 'Recaudado Noviembre', value: 'Gs 4.850.000', icon: CircleDollarSign, note: 'Cuotas y actividades', accent: 'border-t-[#E30613]' },
                { label: 'Morosos', value: '12', icon: AlertTriangle, note: 'Seguimiento pendiente', accent: 'border-t-[#E30613]' },
                { label: 'Becados', value: '8', icon: GraduationCap, note: 'Apoyo formativo', accent: 'border-t-[#002A7A]' },
                { label: 'Alumnos Activos', value: '64', icon: Users, note: 'Todas las categorías', accent: 'border-t-[#002A7A]' },
              ].map((k) => <article key={k.label} className={`rounded-2xl border border-[var(--line)] border-t-4 bg-[var(--surface)] p-4 shadow-sm ${k.accent}`}><div className="flex items-start justify-between"><p className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">{k.label}</p><k.icon className="text-[#E30613]" size={20} /></div><p className="mt-3 font-display text-[clamp(1.7rem,4vw,2.5rem)] font-extrabold leading-none">{k.value}</p><p className="mt-2 text-xs font-medium text-[var(--muted)]">{k.note}</p></article>)}
            </section>

            <section className="mt-5 grid gap-4 lg:grid-cols-[1.6fr_1fr]">
              <article className="overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--surface)] shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3 bg-[#0A1E46] px-5 py-4 text-white"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-red-300">Próximo partido / Actividad</p><h3 className="font-display text-2xl font-extrabold">Encuentro Formativo · Sub-11 y Sub-13</h3></div><span className="rounded-full bg-[#E30613] px-3 py-1 text-xs font-bold">Sábado · 09:00</span></div>
                <div className="grid gap-4 p-5 sm:grid-cols-2"><div><p className="text-sm text-[var(--muted)]">Rival / actividad</p><p className="mt-1 font-display text-2xl font-bold">Cerro Porteño Encarnación vs. Escuela Amiga</p><p className="mt-3 flex items-center gap-2 text-sm"><MapPin size={16} className="text-[#E30613]" /> Cancha principal · Encarnación</p></div><div className="rounded-xl bg-[var(--surface-2)] p-4"><p className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">Antes del partido</p><ul className="mt-2 space-y-2 text-sm font-medium"><li>✓ Llegada 30 minutos antes</li><li>✓ Indumentaria azulgrana completa</li><li>✓ Hidratación y documento de identidad</li></ul></div></div>
              </article>
              <article className="relative overflow-hidden rounded-2xl bg-[#0A1E46] p-5 text-white shadow-sm"><div className="stripes absolute inset-x-0 top-0 h-2" /><Trophy className="text-red-400" size={30} /><p className="mt-4 font-display text-[clamp(1.8rem,4vw,2.5rem)] font-extrabold leading-[0.95]">El Ciclón de Barrio Obrero forma campeones.</p><p className="mt-3 text-sm text-blue-100">Cada entrenamiento es una oportunidad para crecer dentro y fuera de la cancha.</p><button onClick={() => setView('actividad')} className="mt-5 rounded-lg bg-white px-4 py-2.5 text-sm font-bold text-[#0A1E46]">Ver calendario</button></article>
            </section>

            <section className="mt-5 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4 shadow-sm sm:p-5">
              <div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-display text-2xl font-extrabold">Cuotas · Noviembre</h3><p className="text-sm text-[var(--muted)]">Control de pagos por alumno. El registro de un pago queda guardado.</p></div><button onClick={() => setView('cuotas')} className="text-sm font-bold text-[#002A7A] underline underline-offset-4">Ver todas →</button></div>
              <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[620px] border-collapse text-left text-sm"><thead><tr className="bg-[#0A1E46] text-white"><th className="px-3 py-3 font-semibold">Alumno</th><th className="px-3 py-3 font-semibold">Categoría</th><th className="px-3 py-3 font-semibold">Monto</th><th className="px-3 py-3 font-semibold">Estado</th><th className="px-3 py-3 font-semibold">Acción</th></tr></thead><tbody>{cuotas.slice(0, 5).map((c) => <tr key={c.id} className="border-b border-[var(--line)]"><td className="px-3 py-3 font-semibold">{c.alumno}</td><td className="px-3 py-3">{c.categoria}</td><td className="px-3 py-3">{formatGs(c.monto)}</td><td className="px-3 py-3"><Badge estado={c.estado} /></td><td className="px-3 py-3">{c.estado !== 'Pagado' && c.estado !== 'Becado' ? <button disabled={busyPago === c.id} onClick={() => registrarPago(c)} className="rounded-lg bg-[#E30613] px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50">{busyPago === c.id ? 'Guardando…' : 'Registrar pago'}</button> : <span className="text-xs text-[var(--muted)]">Sin acción</span>}</td></tr>)}</tbody></table></div>
            </section>
          </>}

          {view === 'alumnos' && <section>
            <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[0.2em] text-[#E30613]">Plantel formativo</p><h2 className="font-display text-[clamp(2rem,5vw,3rem)] font-extrabold">Alumnos</h2></div><button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 rounded-xl bg-[#E30613] px-4 py-3 text-sm font-bold text-white"><Plus size={18} /> {showForm ? 'Cerrar formulario' : 'Nuevo alumno'}</button></div>
            {showForm && <div className="mt-4 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5"><h3 className="font-display text-xl font-extrabold">Registrar alumno</h3><div className="mt-4 grid gap-3 md:grid-cols-3"><label className="text-sm font-semibold">Nombre y apellido<input value={nombre} onChange={(e) => setNombre(e.target.value)} className="mt-1 w-full rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 py-2.5" placeholder="Ej.: Alex López" /></label><label className="text-sm font-semibold">Categoría<select value={categoria} onChange={(e) => setCategoria(e.target.value)} className="mt-1 w-full rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 py-2.5"><option>Sub-7</option><option>Sub-9</option><option>Sub-11</option><option>Sub-13</option></select></label><label className="text-sm font-semibold">Tutor / contacto<input value={tutor} onChange={(e) => setTutor(e.target.value)} className="mt-1 w-full rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 py-2.5" placeholder="Nombre o teléfono" /></label></div><button disabled={busy} onClick={guardarAlumno} className="mt-4 rounded-xl bg-[#002A7A] px-5 py-3 text-sm font-bold text-white disabled:opacity-50">{busy ? 'Guardando…' : 'Guardar alumno'}</button></div>}
            <div className="mt-4 flex items-center gap-2 rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2.5"><Search size={18} className="text-[var(--muted)]" /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar alumno…" className="w-full bg-transparent outline-none" /></div>
            <div className="mt-4 grid gap-3 md:grid-cols-2">{alumnosVisibles.map((a, i) => <article key={`${a.nombre}-${i}`} className="flex items-center gap-3 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4"><div className={`grid h-12 w-12 shrink-0 place-items-center rounded-full font-display text-xl font-extrabold text-white ${i % 2 === 0 ? 'bg-[#002A7A]' : 'bg-[#E30613]'}`}>{initial(a.nombre)}</div><div className="min-w-0 flex-1"><p className="font-bold [overflow-wrap:anywhere]">{a.nombre}</p><p className="text-sm text-[var(--muted)]">{a.categoria} · Encarnación</p></div><Badge estado={a.estado} /></article>)}</div>
          </section>}

          {view === 'cuotas' && <section>
            <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[0.2em] text-[#E30613]">Control financiero</p><h2 className="font-display text-[clamp(2rem,5vw,3rem)] font-extrabold">Cuotas</h2></div><button onClick={() => setShowConciliacion(true)} className="rounded-xl bg-[#002A7A] px-4 py-3 text-sm font-bold text-white">Ver Conciliación</button></div>
            <div className="mt-4 flex flex-wrap gap-2">{['Todos', 'Pagado', 'Deuda', 'Becado', 'Media Beca'].map((f) => <button key={f} onClick={() => setFiltro(f)} className={`rounded-full px-4 py-2 text-sm font-bold ${filtro === f ? 'bg-[#0A1E46] text-white' : 'border border-[var(--line)] bg-[var(--surface)]'}`}>{f}</button>)}</div>
            <div className="mt-4 overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--surface)] shadow-sm"><div className="overflow-x-auto"><table className="w-full min-w-[680px] border-collapse text-left text-sm"><thead><tr className="bg-[#0A1E46] text-white"><th className="px-4 py-3">Alumno</th><th className="px-4 py-3">Mes</th><th className="px-4 py-3">Monto</th><th className="px-4 py-3">Estado</th><th className="px-4 py-3">Acción</th></tr></thead><tbody>{filtradas.map((c) => <tr key={c.id} className="border-b border-[var(--line)]"><td className="px-4 py-3 font-semibold">{c.alumno}</td><td className="px-4 py-3">{c.mes}</td><td className="px-4 py-3">{formatGs(c.monto)}</td><td className="px-4 py-3"><Badge estado={c.estado} /></td><td className="px-4 py-3">{c.estado !== 'Pagado' && c.estado !== 'Becado' ? <button disabled={busyPago === c.id} onClick={() => registrarPago(c)} className="rounded-lg bg-[#E30613] px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50">{busyPago === c.id ? 'Guardando…' : 'Registrar pago'}</button> : <span className="text-xs text-[var(--muted)]">Sin acción</span>}</td></tr>)}</tbody></table></div></div>
          </section>}

          {view === 'actividad' && <section>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#E30613]">Calendario formativo</p><h2 className="font-display text-[clamp(2rem,5vw,3rem)] font-extrabold">Próximas actividades</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-3">
              <article className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5"><p className="text-xs font-bold text-[#E30613]">SÁBADO · 09:00</p><h3 className="mt-2 font-display text-2xl font-extrabold">Encuentro Formativo</h3><p className="mt-2 text-sm text-[var(--muted)]">Sub-11 y Sub-13 · Cancha principal</p></article>
              <article className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5"><p className="text-xs font-bold text-[#E30613]">MARTES · 17:30</p><h3 className="mt-2 font-display text-2xl font-extrabold">Entrenamiento técnico</h3><p className="mt-2 text-sm text-[var(--muted)]">Sub-7 y Sub-9 · Coordinación y control</p></article>
              <article className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5"><p className="text-xs font-bold text-[#E30613]">VIERNES · 18:00</p><h3 className="mt-2 font-display text-2xl font-extrabold">Charla para padres</h3><p className="mt-2 text-sm text-[var(--muted)]">Acompañamiento, valores y calendario</p></article>
            </div>
          </section>}

          <footer className="mt-8 border-t border-[var(--line)] pt-4 text-center text-xs font-medium text-[var(--muted)]">GolControl · Escuela de Fútbol Cerro Porteño — Encarnación · Franquicia Oficial · Categorías Formativas</footer>
        </main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t-4 border-[#E30613] bg-[#0A1E46] text-white md:hidden" aria-label="Navegación principal">
        <div className="grid grid-cols-4">{nav.map((item) => <button key={item.id} onClick={() => setView(item.id)} className={`flex flex-col items-center gap-1 py-3 text-[11px] font-bold ${view === item.id ? 'bg-white/15 text-white' : 'text-blue-200'}`}><item.icon size={21} />{item.label}</button>)}</div>
      </nav>

      {showImport && <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4" role="dialog" aria-modal="true"><div className="w-full max-w-lg rounded-2xl bg-[var(--surface)] p-5 shadow-2xl"><div className="flex items-start justify-between"><h3 className="font-display text-2xl font-extrabold">Importar Excel</h3><button onClick={() => setShowImport(false)} aria-label="Cerrar"><X /></button></div><p className="mt-2 text-sm text-[var(--muted)]">La carga de archivos todavía no está disponible en esta versión. Prepará tu planilla con estas columnas para importarla cuando se habilite:</p><ul className="mt-4 space-y-2 text-sm font-semibold"><li>• Alumno</li><li>• Categoría</li><li>• Mes</li><li>• Monto (Gs)</li><li>• Estado: Pagado / Deuda / Becado / Media Beca</li></ul><button onClick={() => setShowImport(false)} className="mt-5 w-full rounded-xl bg-[#E30613] py-3 text-sm font-bold text-white">Entendido</button></div></div>}
      {showConciliacion && <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4" role="dialog" aria-modal="true"><div className="w-full max-w-lg rounded-2xl bg-[var(--surface)] p-5 shadow-2xl"><div className="flex items-start justify-between"><h3 className="font-display text-2xl font-extrabold">Conciliación · Noviembre</h3><button onClick={() => setShowConciliacion(false)} aria-label="Cerrar"><X /></button></div><div className="mt-4 space-y-3 text-sm"><div className="flex justify-between border-b border-[var(--line)] pb-2"><span>Recaudado registrado</span><strong>Gs 4.850.000</strong></div><div className="flex justify-between border-b border-[var(--line)] pb-2"><span>Pagos confirmados en planilla</span><strong>Gs 4.850.000</strong></div><div className="flex justify-between"><span>Diferencia</span><strong className="text-emerald-700">Gs 0 · Conciliado</strong></div></div><button onClick={() => setShowConciliacion(false)} className="mt-5 w-full rounded-xl bg-[#002A7A] py-3 text-sm font-bold text-white">Cerrar conciliación</button></div></div>}
    </div>
  );
}
