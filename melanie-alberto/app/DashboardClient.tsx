'use client';

import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';

interface Invitado {
  id: string;
  nombre: string;
  telefono?: string;
  estado?: string;
  boletos_asignados: number;
  boletos_aceptados?: number | null;
  creado_en?: string;
}

export default function DashboardClient() {
  // Estado de Autenticación con Supabase
  const [session, setSession] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [iniciandoSesion, setIniciandoSesion] = useState(false);

  // Estados del Dashboard
  const [invitados, setInvitados] = useState<Invitado[]>([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<'todos' | 'confirmados' | 'pendientes' | 'declinados'>('todos');
  const [copiadoId, setCopiadoId] = useState<string | null>(null);
  const [cargandoCSV, setCargandoCSV] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Modal para agregar invitado manual
  const [modalAbierto, setModalAbierto] = useState(false);
  const [nuevoNombre, setNuevoNombre] = useState('');
  const [nuevoTelefono, setNuevoTelefono] = useState('');
  const [nuevosBoletos, setNuevosBoletos] = useState(2);
  const [guardandoManual, setGuardandoManual] = useState(false);

  // 1. Escuchar estado de sesión de Supabase
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setAuthLoading(false);
      if (session) cargarInvitados();
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) cargarInvitados();
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIniciandoSesion(true);
    setLoginError('');

    const { error } = await supabase.auth.signInWithPassword({
      email: loginEmail,
      password: loginPassword,
    });

    if (error) {
      setLoginError('Credenciales incorrectas o usuario no encontrado.');
    }
    setIniciandoSesion(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setSession(null);
  };

  // 2. Cargar invitados
  const cargarInvitados = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('invitados')
        .select('*')
        .order('nombre', { ascending: true });

      if (error) throw error;
      setInvitados(data || []);
    } catch (err) {
      console.error('Error al cargar invitados:', err);
    } finally {
      setLoading(false);
    }
  };

  // 3. Crear invitado manualmente
  const handleGuardarManual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevoNombre.trim()) {
      alert('Ingresa el nombre del invitado.');
      return;
    }

    setGuardandoManual(true);
    try {
      const { error } = await supabase.from('invitados').insert([
        {
          nombre: nuevoNombre.trim(),
          telefono: nuevoTelefono.trim() || null,
          boletos_asignados: Number(nuevosBoletos) || 1,
          estado: 'pendiente',
          boletos_aceptados: null,
        },
      ]);

      if (error) throw error;

      // Limpiar formulario y recargar
      setNuevoNombre('');
      setNuevoTelefono('');
      setNuevosBoletos(2);
      setModalAbierto(false);
      cargarInvitados();
    } catch (err: any) {
      alert('Error al agregar el invitado: ' + err.message);
    } finally {
      setGuardandoManual(false);
    }
  };

  const getEstado = (inv: Invitado) => (inv.estado || 'pendiente').toLowerCase().trim();

  // Métricas
  const totalInvitaciones = invitados.length;
  const totalBoletos = invitados.reduce((acc, curr) => acc + (Number(curr.boletos_asignados) || 0), 0);

  const confirmados = invitados.filter((i) => getEstado(i) === 'confirmado');
  const declinados = invitados.filter(
    (i) => getEstado(i) === 'declinado' || getEstado(i) === 'cancelado' || getEstado(i) === 'rechazado' || getEstado(i) === 'no'
  );
  const pendientes = invitados.filter((i) => getEstado(i) === 'pendiente');

  const boletosConfirmados = confirmados.reduce((acc, curr) => {
    const aceptados = curr.boletos_aceptados !== null && curr.boletos_aceptados !== undefined
      ? Number(curr.boletos_aceptados)
      : Number(curr.boletos_asignados || 0);
    return acc + aceptados;
  }, 0);

  // Filtros y búsqueda
  const invitadosFiltrados = invitados.filter((inv) => {
    const coincideNombre = inv.nombre?.toLowerCase().includes(busqueda.toLowerCase());
    if (!coincideNombre) return false;

    const est = getEstado(inv);
    if (filtroEstado === 'confirmados') return est === 'confirmado';
    if (filtroEstado === 'declinados') return est === 'declinado' || est === 'cancelado' || est === 'rechazado' || est === 'no';
    if (filtroEstado === 'pendientes') return est === 'pendiente';

    return true;
  });

  const copiarEnlace = (id: string) => {
    const url = `${window.location.origin}/invitacion/${id}`;
    navigator.clipboard.writeText(url);
    setCopiadoId(id);
    setTimeout(() => setCopiadoId(null), 2000);
  };

  const enviarWhatsApp = (inv: Invitado) => {
    const urlInvitacion = `${window.location.origin}/invitacion/${inv.id}`;
    const texto = `¡Hola ${inv.nombre}! Nos encantaría que nos acompañes en este día tan especial. Te compartimos tu invitación formal con todos los detalles y el pase digital para ti y tu familia: ${urlInvitacion}`;

    const telLimpio = inv.telefono ? inv.telefono.replace(/\D/g, '') : '';
    const enlaceWA = telLimpio
      ? `https://wa.me/${telLimpio}?text=${encodeURIComponent(texto)}`
      : `https://wa.me/?text=${encodeURIComponent(texto)}`;

    window.open(enlaceWA, '_blank');
  };

  // Cargar archivo CSV
  const procesarCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCargandoCSV(true);
    const reader = new FileReader();

    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const lineas = text.split(/\r?\n/).filter((line) => line.trim() !== '');

        if (lineas.length <= 1) {
          alert('El archivo CSV está vacío o solo contiene encabezados.');
          return;
        }

        const cabeceras = lineas[0].toLowerCase().split(',').map((h) => h.trim());
        const indexNombre = cabeceras.findIndex((h) => h.includes('nombre'));
        const indexBoletos = cabeceras.findIndex(
          (h) => h.includes('boleto') || h.includes('pase') || h.includes('asignado')
        );
        const indexTelefono = cabeceras.findIndex(
          (h) => h.includes('tel') || h.includes('cel') || h.includes('whats')
        );

        const nuevosInvitados = [];

        for (let i = 1; i < lineas.length; i++) {
          const valores = lineas[i].split(',').map((v) => v.trim().replace(/^"|"$/g, ''));
          if (valores.length === 0 || !valores[0]) continue;

          const nombre = indexNombre !== -1 ? valores[indexNombre] : valores[0];
          const boletos_asignados = indexBoletos !== -1 ? parseInt(valores[indexBoletos]) || 1 : parseInt(valores[1]) || 1;
          const telefono = indexTelefono !== -1 ? valores[indexTelefono] : valores[2] || null;

          if (nombre) {
            nuevosInvitados.push({
              nombre,
              boletos_asignados,
              telefono,
              estado: 'pendiente',
              boletos_aceptados: null,
            });
          }
        }

        if (nuevosInvitados.length > 0) {
          const { error } = await supabase.from('invitados').insert(nuevosInvitados);
          if (error) throw error;
          alert(`¡Se agregaron ${nuevosInvitados.length} invitados correctamente!`);
          cargarInvitados();
        }
      } catch (err: any) {
        console.error('Error al procesar el CSV:', err);
        alert('Hubo un error al procesar el CSV: ' + err.message);
      } finally {
        setCargandoCSV(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };

    reader.readAsText(file);
  };

  // Pantalla de carga inicial mientras verifica sesión
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-500 font-medium">
        Verificando sesión...
      </div>
    );
  }

  // Si no está logueado, mostrar formulario de acceso
  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl border border-slate-200 w-full max-w-md">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold font-serif text-[#1f4027]">
              Panel de Administración
            </h1>
            <p className="text-sm text-slate-500 mt-1">Melanie & Alberto</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            {loginError && (
              <div className="bg-rose-50 border border-rose-200 text-rose-700 px-3 py-2 rounded-lg text-sm text-center">
                {loginError}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                Correo Electrónico
              </label>
              <input
                type="email"
                required
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                placeholder="admin@ejemplo.com"
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1f4027]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                Contraseña
              </label>
              <input
                type="password"
                required
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1f4027]"
              />
            </div>

            <button
              type="submit"
              disabled={iniciandoSesion}
              className="w-full py-2.5 bg-[#1f4027] hover:bg-[#16301d] text-white rounded-lg font-medium text-sm transition shadow-sm disabled:opacity-50"
            >
              {iniciandoSesion ? 'Ingresando...' : 'Iniciar Sesión'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Dashboard con sesión activa
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Barra Superior de Sesión */}
      <header className="bg-[#1f4027] text-white px-6 py-2.5 flex justify-between items-center text-xs sm:text-sm shadow-md">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
          <span className="opacity-80">Sesión iniciada:</span>
          <span className="font-semibold">{session.user.email}</span>
        </div>
        <button
          onClick={handleLogout}
          className="bg-white/10 hover:bg-white/20 text-white px-3 py-1 rounded transition text-xs font-medium"
        >
          Cerrar Sesión
        </button>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Encabezado y Acciones */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4 border-b border-slate-200 pb-5">
          <div>
            <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#1f4027]">
              Control de Invitados • Melanie & Alberto
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Gestión y monitoreo de confirmaciones en tiempo real
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full sm:w-auto">
            {/* Botón Agregar Manual */}
            <button
              onClick={() => setModalAbierto(true)}
              className="inline-flex items-center px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-sm font-medium shadow-sm transition"
            >
              + Agregar Invitado
            </button>

            {/* Input y Botón CSV */}
            <input
              type="file"
              ref={fileInputRef}
              accept=".csv"
              onChange={procesarCSV}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={cargandoCSV}
              className="inline-flex items-center px-3.5 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 shadow-sm transition disabled:opacity-50"
            >
              {cargandoCSV ? 'Subiendo...' : '📂 Subir CSV'}
            </button>

            <button
              onClick={cargarInvitados}
              className="inline-flex items-center px-3.5 py-2 bg-[#1f4027] rounded-lg text-sm font-medium text-white hover:bg-[#16301d] shadow-sm transition"
            >
              🔄 Actualizar
            </button>
          </div>
        </div>

        {/* Tarjetas Métricas */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Boletos</p>
            <p className="text-2xl sm:text-3xl font-bold text-slate-800 mt-1">{totalBoletos}</p>
            <p className="text-xs text-slate-500 mt-1">{totalInvitaciones} familias / grupos</p>
          </div>

          <div className="bg-white p-5 rounded-xl border border-emerald-100 bg-emerald-50/20 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600">Boletos Confirmados</p>
            <p className="text-2xl sm:text-3xl font-bold text-emerald-700 mt-1">{boletosConfirmados}</p>
            <p className="text-xs text-emerald-600 mt-1">{confirmados.length} invitaciones confirmadas</p>
          </div>

          <div className="bg-white p-5 rounded-xl border border-amber-100 bg-amber-50/20 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-amber-600">Pendientes</p>
            <p className="text-2xl sm:text-3xl font-bold text-amber-700 mt-1">{pendientes.length}</p>
            <p className="text-xs text-amber-600 mt-1">Sin respuesta aún</p>
          </div>

          <div className="bg-white p-5 rounded-xl border border-rose-100 bg-rose-50/20 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-rose-600">Declinaron</p>
            <p className="text-2xl sm:text-3xl font-bold text-rose-700 mt-1">{declinados.length}</p>
            <p className="text-xs text-rose-600 mt-1">No asistirán</p>
          </div>
        </div>

        {/* Barra de Búsqueda y Filtros */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-6 flex flex-col md:flex-row gap-4 justify-between items-center">
          <div className="w-full md:w-80">
            <input
              type="text"
              placeholder="🔍 Buscar por nombre..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1f4027]"
            />
          </div>

          <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
            {(['todos', 'confirmados', 'pendientes', 'declinados'] as const).map((filtro) => (
              <button
                key={filtro}
                onClick={() => setFiltroEstado(filtro)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition ${
                  filtroEstado === filtro
                    ? 'bg-[#1f4027] text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {filtro}
              </button>
            ))}
          </div>
        </div>

        {/* Tabla de Invitados */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold text-xs uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">Invitado / Familia</th>
                  <th className="py-3.5 px-4">Boletos Asignados</th>
                  <th className="py-3.5 px-4">Estado</th>
                  <th className="py-3.5 px-4">Pases Aceptados</th>
                  <th className="py-3.5 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400">
                      Cargando información...
                    </td>
                  </tr>
                ) : invitadosFiltrados.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400">
                      No se encontraron invitados con los criterios actuales.
                    </td>
                  </tr>
                ) : (
                  invitadosFiltrados.map((inv) => {
                    const est = getEstado(inv);
                    const boletosAsignados = Number(inv.boletos_asignados || 0);
                    const boletosAceptados = inv.boletos_aceptados;

                    return (
                      <tr key={inv.id} className="hover:bg-slate-50/60 transition">
                        <td className="py-3.5 px-4 font-medium text-slate-800">
                          {inv.nombre}
                          {inv.telefono && (
                            <span className="block text-xs text-slate-400 font-normal">
                              Tel: {inv.telefono}
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-slate-600">
                          {boletosAsignados} {boletosAsignados === 1 ? 'boleto' : 'boletos'}
                        </td>
                        <td className="py-3.5 px-4">
                          {est === 'confirmado' && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                              Confirmado
                            </span>
                          )}
                          {(est === 'declinado' || est === 'cancelado' || est === 'rechazado' || est === 'no') && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-100 text-rose-800">
                              Declinado
                            </span>
                          )}
                          {est === 'pendiente' && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                              Pendiente
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-slate-600 font-semibold">
                          {est === 'confirmado'
                            ? (boletosAceptados !== null && boletosAceptados !== undefined
                                ? `${boletosAceptados} ${boletosAceptados === 1 ? 'pase' : 'pases'}`
                                : `${boletosAsignados} ${boletosAsignados === 1 ? 'pase' : 'pases'}`)
                            : '-'}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => enviarWhatsApp(inv)}
                              className="inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded border border-emerald-500 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition"
                              title="Enviar invitación por WhatsApp"
                            >
                              💬 WhatsApp
                            </button>
                            <button
                              onClick={() => copiarEnlace(inv.id)}
                              className={`text-xs px-2.5 py-1.5 rounded border transition ${
                                copiadoId === inv.id
                                  ? 'bg-emerald-600 border-emerald-600 text-white'
                                  : 'border-slate-300 text-slate-600 hover:bg-slate-100'
                              }`}
                            >
                              {copiadoId === inv.id ? '¡Copiado!' : 'Copiar link'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal para Agregar Invitado Manual */}
      {modalAbierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl border border-slate-200">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-slate-800">Agregar Nuevo Invitado</h3>
              <button
                onClick={() => setModalAbierto(false)}
                className="text-slate-400 hover:text-slate-600 text-xl font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleGuardarManual} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                  Nombre Completo / Familia *
                </label>
                <input
                  type="text"
                  required
                  value={nuevoNombre}
                  onChange={(e) => setNuevoNombre(e.target.value)}
                  placeholder="Ej. Familia Rodríguez o Juan Pérez"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1f4027]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                  Teléfono (WhatsApp)
                </label>
                <input
                  type="tel"
                  value={nuevoTelefono}
                  onChange={(e) => setNuevoTelefono(e.target.value)}
                  placeholder="Ej. 524491234567"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1f4027]"
                />
                <span className="text-xs text-slate-400">Opcional. Incluye código de país si es posible.</span>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                  Boletos Asignados *
                </label>
                <input
                  type="number"
                  required
                  min={1}
                  max={20}
                  value={nuevosBoletos}
                  onChange={(e) => setNuevosBoletos(parseInt(e.target.value) || 1)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1f4027]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalAbierto(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardandoManual}
                  className="px-4 py-2 bg-[#1f4027] hover:bg-[#16301d] text-white rounded-lg text-sm font-medium transition shadow-sm disabled:opacity-50"
                >
                  {guardandoManual ? 'Guardando...' : 'Guardar Invitado'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}