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
  creado_por?: string | null; // Columna para el creador de la invitación
}

interface Cancion {
  id: string | number;
  titulo: string;
  artista: string;
  invitado_id?: string;
  nombre_invitado?: string;
  creado_en?: string;
}

export default function DashboardClient() {
  // Autenticación con Supabase
  const [session, setSession] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [iniciandoSesion, setIniciandoSesion] = useState(false);

  // Control de Pestañas
  const [pestanaActiva, setPestanaActiva] = useState<'invitados' | 'canciones'>('invitados');

  // Estados de Invitados
  const [invitados, setInvitados] = useState<Invitado[]>([]);
  const [loadingInvitados, setLoadingInvitados] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<'todos' | 'confirmados' | 'pendientes' | 'declinados'>('todos');
  const [copiadoId, setCopiadoId] = useState<string | null>(null);
  const [cargandoCSV, setCargandoCSV] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Estados de Canciones
  const [canciones, setCanciones] = useState<Cancion[]>([]);
  const [loadingCanciones, setLoadingCanciones] = useState(false);
  const [busquedaCancion, setBusquedaCancion] = useState('');

  // Modal para agregar/editar invitado manual
  const [modalAbierto, setModalAbierto] = useState(false);
  const [invitadoEditando, setInvitadoEditando] = useState<Invitado | null>(null);
  const [nuevoNombre, setNuevoNombre] = useState('');
  const [nuevoTelefono, setNuevoTelefono] = useState('');
  const [codigoPais, setCodigoPais] = useState('+52'); // +52 Predeterminado
  const [nuevosBoletos, setNuevosBoletos] = useState(2);
  const [guardandoManual, setGuardandoManual] = useState(false);

  // Modal para agregar canciones desde el Panel (Sin límites)
  const [modalCancionAbierto, setModalCancionAbierto] = useState(false);
  const [nuevaCancionTitulo, setNuevaCancionTitulo] = useState('');
  const [nuevaCancionArtista, setNuevaCancionArtista] = useState('');
  const [cancionInvitadoId, setCancionInvitadoId] = useState<string>(''); // Vacio = Administrador
  const [guardandoCancion, setGuardandoCancion] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setAuthLoading(false);
      if (session) {
        cargarInvitados();
        cargarCanciones();
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        cargarInvitados();
        cargarCanciones();
      }
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

  const cargarInvitados = async () => {
    setLoadingInvitados(true);
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
      setLoadingInvitados(false);
    }
  };

  const cargarCanciones = async () => {
    setLoadingCanciones(true);
    try {
      const { data: cancionesData, error: cancionesError } = await supabase
        .from('canciones')
        .select('*')
        .order('id', { ascending: false });

      if (cancionesError) throw cancionesError;

      const { data: invitadosData } = await supabase
        .from('invitados')
        .select('id, nombre');

      const mapaInvitados = new Map((invitadosData || []).map((i) => [i.id, i.nombre]));

      const cancionesConNombre = (cancionesData || []).map((c: Cancion) => ({
        ...c,
        nombre_invitado: c.invitado_id ? mapaInvitados.get(c.invitado_id) || 'Invitado anónimo' : 'Administrador',
      }));

      setCanciones(cancionesConNombre);
    } catch (err) {
      console.error('Error al cargar canciones:', err);
    } finally {
      setLoadingCanciones(false);
    }
  };

  const eliminarCancion = async (cancionId: string | number) => {
    if (!window.confirm('¿Seguro que deseas eliminar esta canción de la lista?')) return;
    try {
      const { error } = await supabase.from('canciones').delete().eq('id', cancionId);
      if (error) throw error;
      setCanciones((prev) => prev.filter((c) => c.id !== cancionId));
    } catch (err: any) {
      alert('Error al eliminar la canción: ' + err.message);
    }
  };

  const eliminarInvitado = async (id: string) => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar este invitado? Esta acción no se puede deshacer y eliminará sus canciones sugeridas.')) return;
    try {
      const { error } = await supabase.from('invitados').delete().eq('id', id);
      if (error) throw error;
      cargarInvitados();
      cargarCanciones();
    } catch (err: any) {
      alert('Error al eliminar el invitado: ' + err.message);
    }
  };

  const abrirModalAgregar = () => {
    setInvitadoEditando(null);
    setNuevoNombre('');
    setNuevoTelefono('');
    setCodigoPais('+52');
    setNuevosBoletos(2);
    setModalAbierto(true);
  };

  const abrirModalEditar = (inv: Invitado) => {
    setInvitadoEditando(inv);
    setNuevoNombre(inv.nombre);
    setNuevosBoletos(inv.boletos_asignados);
    
    let phone = inv.telefono || '';
    let code = '+52';
    
    if (phone.startsWith('+52')) {
      code = '+52';
      phone = phone.substring(3);
    } else if (phone.startsWith('52') && phone.length >= 12) {
      code = '+52';
      phone = phone.substring(2);
    } else if (phone.startsWith('+1')) {
      code = '+1';
      phone = phone.substring(2);
    } else if (phone.startsWith('1') && phone.length === 11) {
      code = '+1';
      phone = phone.substring(1);
    }

    setCodigoPais(code);
    setNuevoTelefono(phone);
    setModalAbierto(true);
  };

  const handleGuardarManual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevoNombre.trim()) {
      alert('Ingresa el nombre del invitado.');
      return;
    }

    setGuardandoManual(true);
    try {
      let telefonoAGuardar = null;
      if (nuevoTelefono.trim()) {
        const cleanPhone = nuevoTelefono.trim().replace(/\D/g, '');
        const cleanCode = codigoPais.replace(/\D/g, '');
        telefonoAGuardar = `+${cleanCode}${cleanPhone}`;
      }

      if (invitadoEditando) {
        // ACTUALIZAR (Al editar, si no tiene creador histórico, se actualiza al correo actual)
        const creadorActual = invitadoEditando.creado_por && invitadoEditando.creado_por !== 'Sistema / Inicial'
          ? invitadoEditando.creado_por 
          : (session?.user?.email || 'Sistema / Inicial');

        const { error } = await supabase
          .from('invitados')
          .update({
            nombre: nuevoNombre.trim(),
            telefono: telefonoAGuardar,
            boletos_asignados: Number(nuevosBoletos) || 1,
            creado_por: creadorActual,
          })
          .eq('id', invitadoEditando.id);
        if (error) throw error;
      } else {
        // CREAR (Se asigna la sesión de quien está guardando)
        const { error } = await supabase.from('invitados').insert([
          {
            nombre: nuevoNombre.trim(),
            telefono: telefonoAGuardar,
            boletos_asignados: Number(nuevosBoletos) || 1,
            estado: 'pendiente',
            boletos_aceptados: null,
            creado_por: session?.user?.email || 'Sistema / Inicial',
          },
        ]);
        if (error) throw error;
      }

      setModalAbierto(false);
      cargarInvitados();
    } catch (err: any) {
      alert(`Error al ${invitadoEditando ? 'actualizar' : 'agregar'} el invitado: ` + err.message);
    } finally {
      setGuardandoManual(false);
    }
  };

  // Abrir Modal de nueva canción
  const abrirModalNuevaCancion = () => {
    setNuevaCancionTitulo('');
    setNuevaCancionArtista('');
    setCancionInvitadoId('');
    setModalCancionAbierto(true);
  };

  // Acción para guardar la canción (ILIMITADA)
  const handleGuardarCancion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevaCancionTitulo.trim()) {
      alert('Por favor ingresa el título de la canción.');
      return;
    }

    setGuardandoCancion(true);
    try {
      const { error } = await supabase.from('canciones').insert([
        {
          titulo: nuevaCancionTitulo.trim(),
          artista: nuevaCancionArtista.trim() || 'Desconocido',
          invitado_id: cancionInvitadoId || null, // Nulo = Añadida por Admin
        }
      ]);

      if (error) throw error;

      setModalCancionAbierto(false);
      cargarCanciones();
    } catch (err: any) {
      alert('Error al agregar la canción: ' + err.message);
    } finally {
      setGuardandoCancion(false);
    }
  };

  const getEstado = (inv: Invitado) => (inv.estado || 'pendiente').toLowerCase().trim();

  // Métricas Invitados
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

  // Filtros Invitados
  const invitadosFiltrados = invitados.filter((inv) => {
    const coincideNombre = inv.nombre?.toLowerCase().includes(busqueda.toLowerCase());
    if (!coincideNombre) return false;

    const est = getEstado(inv);
    if (filtroEstado === 'confirmados') return est === 'confirmado';
    if (filtroEstado === 'declinados') return est === 'declinado' || est === 'cancelado' || est === 'rechazado' || est === 'no';
    if (filtroEstado === 'pendientes') return est === 'pendiente';

    return true;
  });

  // Filtros Canciones
  const cancionesFiltradas = canciones.filter((c) => {
    const term = busquedaCancion.toLowerCase();
    return (
      c.titulo?.toLowerCase().includes(term) ||
      c.artista?.toLowerCase().includes(term) ||
      c.nombre_invitado?.toLowerCase().includes(term)
    );
  });

  const copiarEnlace = (id: string) => {
    const url = `${window.location.origin}/invitacion/${id}`;
    navigator.clipboard.writeText(url);
    setCopiadoId(id);
    setTimeout(() => setCopiadoId(null), 2000);
  };

  // ================= MENSAJE DE WHATSAPP =================
  const enviarWhatsApp = (inv: Invitado) => {
    const urlInvitacion = `${window.location.origin}/invitacion/${inv.id}`;
    
    // Mensaje estético, natural y directo
    const texto = `¡Hola ${inv.nombre}!\n\nNos encantaría que nos acompañes en este día tan especial. Con muchísima ilusión, te compartimos nuestra invitación digital con todos los detalles de nuestra boda, junto con el pase para ti y tu familia:\n\n👉 ${urlInvitacion}\n\nPor favor, ingresa al enlace para ver toda la información y confirmar o declinar tu asistencia en la sección de confirmación dentro de la misma página.\n\n¡Esperamos de corazón contar con ustedes para celebrar juntos este momento tan importante! 💍`;

    const telLimpio = inv.telefono ? inv.telefono.replace(/\D/g, '') : '';
    const enlaceWA = telLimpio
      ? `https://wa.me/${telLimpio}?text=${encodeURIComponent(texto)}`
      : `https://wa.me/?text=${encodeURIComponent(texto)}`;

    window.open(enlaceWA, '_blank');
  };

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
              creado_por: session?.user?.email || 'Sistema / Inicial', // Asigna sesión de CSV
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

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-500 font-medium">
        Verificando sesión...
      </div>
    );
  }

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

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Barra Superior */}
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
        {/* Encabezado y Selector de Pestañas */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4 border-b border-slate-200 pb-5">
          <div>
            <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#1f4027]">
              Control de Boda • Melanie & Alberto
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Gestión de confirmaciones y música en tiempo real
            </p>
          </div>

          {/* Selector de Pestañas */}
          <div className="flex bg-slate-200/70 p-1 rounded-xl">
            <button
              onClick={() => setPestanaActiva('invitados')}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
                pestanaActiva === 'invitados'
                  ? 'bg-white text-[#1f4027] shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
               Invitados ({totalInvitaciones})
            </button>
            <button
              onClick={() => setPestanaActiva('canciones')}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
                pestanaActiva === 'canciones'
                  ? 'bg-white text-[#1f4027] shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
               Canciones ({canciones.length})
            </button>
          </div>
        </div>

        {/* ================= VISTA 1: INVITADOS ================= */}
        {pestanaActiva === 'invitados' && (
          <div>
            {/* Acciones de Invitados */}
            <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                <button
                  onClick={abrirModalAgregar}
                  className="inline-flex items-center px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-sm font-medium shadow-sm transition"
                >
                  + Agregar Invitado
                </button>
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
              </div>

              <button
                onClick={cargarInvitados}
                className="inline-flex items-center px-3.5 py-2 bg-[#1f4027] rounded-lg text-sm font-medium text-white hover:bg-[#16301d] shadow-sm transition"
              >
                🔄 Actualizar
              </button>
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
                <p className="text-xs text-emerald-600 mt-1">{confirmados.length} familias confirmadas</p>
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
                <table className="w-full text-left text-sm animate-fade-in">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold text-xs uppercase tracking-wider">
                    <tr>
                      <th className="py-3.5 px-4">Invitado / Familia</th>
                      <th className="py-3.5 px-4">Boletos Asignados</th>
                      <th className="py-3.5 px-4">Creado Por</th>
                      <th className="py-3.5 px-4">Estado</th>
                      <th className="py-3.5 px-4">Pases Aceptados</th>
                      <th className="py-3.5 px-4 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {loadingInvitados ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-400">
                          Cargando invitados...
                        </td>
                      </tr>
                    ) : invitadosFiltrados.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-400">
                          No se encontraron invitados con los criterios actuales.
                        </td>
                      </tr>
                    ) : (
                      invitadosFiltrados.map((inv) => {
                        const est = getEstado(inv);
                        const boletosAsignados = Number(inv.boletos_asignados || 0);
                        const boletosAceptados = inv.boletos_aceptados;

                        return (
                          <tr key={inv.id} className="hover:bg-slate-50/60 transition duration-150">
                            <td className="py-3.5 px-4 font-medium text-slate-800">
                              {inv.nombre}
                              {inv.telefono && (
                                <span className="block text-xs text-slate-400 font-normal mt-0.5">
                                  Tel: {inv.telefono}
                                </span>
                              )}
                            </td>
                            <td className="py-3.5 px-4 text-slate-600">
                              {boletosAsignados} {boletosAsignados === 1 ? 'boleto' : 'boletos'}
                            </td>
                            <td className="py-3.5 px-4 text-slate-500 font-medium text-xs max-w-[150px] truncate" title={inv.creado_por || 'Sistema / Inicial'}>
                              {inv.creado_por || 'Sistema / Inicial'}
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
                              <div className="flex items-center justify-end gap-1.5 flex-wrap">
                                <button
                                  onClick={() => enviarWhatsApp(inv)}
                                  className="inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded border border-emerald-500 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition duration-150 font-medium"
                                  title="Enviar invitación por WhatsApp"
                                >
                                  WhatsApp
                                </button>
                                <button
                                  onClick={() => copiarEnlace(inv.id)}
                                  className={`text-xs px-2.5 py-1.5 rounded border transition duration-150 font-medium ${
                                    copiadoId === inv.id
                                      ? 'bg-emerald-600 border-emerald-600 text-white'
                                      : 'border-slate-300 text-slate-600 hover:bg-slate-100'
                                  }`}
                                  title="Copiar link"
                                >
                                  {copiadoId === inv.id ? '¡Copiado!' : 'Copiar'}
                                </button>
                                <button
                                  onClick={() => abrirModalEditar(inv)}
                                  className="text-xs p-1.5 rounded border border-slate-300 text-slate-600 hover:bg-slate-100 transition duration-150 flex items-center justify-center"
                                  title="Editar Invitado"
                                >
                                  <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                                    <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                                  </svg>
                                </button>
                                <button
                                  onClick={() => eliminarInvitado(inv.id)}
                                  className="text-xs p-1.5 rounded border border-rose-200 text-rose-600 hover:bg-rose-50 transition duration-150 flex items-center justify-center"
                                  title="Eliminar Invitado"
                                >
                                  <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                                    <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                                  </svg>
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
        )}

        {/* ================= VISTA 2: CANCIONES ================= */}
        {pestanaActiva === 'canciones' && (
          <div>
            <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
              <div className="w-full sm:w-80">
                <input
                  type="text"
                  placeholder="🔍 Buscar por canción, artista o invitado..."
                  value={busquedaCancion}
                  onChange={(e) => setBusquedaCancion(e.target.value)}
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1f4027]"
                />
              </div>

              {/* Botón para Administradores de añadir canción ilimitada */}
              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                <button
                  onClick={abrirModalNuevaCancion}
                  className="inline-flex items-center px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-sm font-medium shadow-sm transition"
                >
                  🎵 + Agregar Canción
                </button>
                <button
                  onClick={cargarCanciones}
                  className="inline-flex items-center px-3.5 py-2 bg-[#1f4027] rounded-lg text-sm font-medium text-white hover:bg-[#16301d] shadow-sm transition"
                >
                  🔄 Actualizar
                </button>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm animate-fade-in">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold text-xs uppercase tracking-wider">
                    <tr>
                      <th className="py-3.5 px-4">Canción</th>
                      <th className="py-3.5 px-4">Artista</th>
                      <th className="py-3.5 px-4">Sugerida por</th>
                      <th className="py-3.5 px-4 text-right">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {loadingCanciones ? (
                      <tr>
                        <td colSpan={4} className="py-8 text-center text-slate-400">
                          Cargando lista de canciones...
                        </td>
                      </tr>
                    ) : cancionesFiltradas.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-8 text-center text-slate-400">
                          No se encontraron sugerencias musicales.
                        </td>
                      </tr>
                    ) : (
                      cancionesFiltradas.map((cancion) => (
                        <tr key={cancion.id} className="hover:bg-slate-50/60 transition duration-150">
                          <td className="py-3.5 px-4 font-semibold text-slate-800">
                            🎵 {cancion.titulo}
                          </td>
                          <td className="py-3.5 px-4 text-slate-600">
                            {cancion.artista || '—'}
                          </td>
                          <td className="py-3.5 px-4 text-slate-700">
                            {cancion.nombre_invitado === 'Administrador' ? (
                              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200">
                                👑 {cancion.nombre_invitado}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
                                👤 {cancion.nombre_invitado}
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <button
                              onClick={() => eliminarCancion(cancion.id)}
                              className="text-xs px-2.5 py-1.5 rounded border border-rose-200 text-rose-600 hover:bg-rose-50 transition font-medium inline-flex items-center gap-1"
                              title="Eliminar canción"
                            >
                              🗑️ Eliminar
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal para Agregar/Editar Invitado Manual */}
      {modalAbierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl border border-slate-200 transform scale-95 transition-all">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-slate-800">
                {invitadoEditando ? 'Editar Invitado' : 'Agregar Nuevo Invitado'}
              </h3>
              <button
                onClick={() => setModalAbierto(false)}
                className="text-slate-400 hover:text-slate-600 text-xl font-bold border-none bg-transparent"
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
                <div className="flex gap-2">
                  <select
                    value={codigoPais}
                    onChange={(e) => setCodigoPais(e.target.value)}
                    className="w-28 px-2 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1f4027] bg-white cursor-pointer"
                  >
                    <option value="+52">🇲🇽 +52</option>
                    <option value="+1">🇺🇸 / 🇨🇦 +1</option>
                  </select>
                  <input
                    type="tel"
                    value={nuevoTelefono}
                    onChange={(e) => setNuevoTelefono(e.target.value)}
                    placeholder="Ej. 4491234567"
                    className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1f4027]"
                  />
                </div>
                <span className="text-xs text-slate-400 mt-1 block">Opcional. Se usará para enviar el enlace por WhatsApp.</span>
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
                  className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 transition border-none bg-transparent"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardandoManual}
                  className="px-4 py-2 bg-[#1f4027] hover:bg-[#16301d] text-white rounded-lg text-sm font-medium transition shadow-sm disabled:opacity-50"
                >
                  {guardandoManual ? 'Guardando...' : invitadoEditando ? 'Actualizar' : 'Guardar Invitado'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal para Agregar Canción Manual por el Administrador (ILIMITADA) */}
      {modalCancionAbierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl border border-slate-200 transform scale-95 transition-all">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-slate-800">
                Agregar Nueva Canción
              </h3>
              <button
                onClick={() => setModalCancionAbierto(false)}
                className="text-slate-400 hover:text-slate-600 text-xl font-bold border-none bg-transparent"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleGuardarCancion} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                  Título de la Canción *
                </label>
                <input
                  type="text"
                  required
                  value={nuevaCancionTitulo}
                  onChange={(e) => setNuevaCancionTitulo(e.target.value)}
                  placeholder="Ej. La Chona"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1f4027]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                  Artista / Banda
                </label>
                <input
                  type="text"
                  value={nuevaCancionArtista}
                  onChange={(e) => setNuevaCancionArtista(e.target.value)}
                  placeholder="Ej. Los Tucanes de Tijuana"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1f4027]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                  Asignar a Invitado (Opcional)
                </label>
                <select
                  value={cancionInvitadoId}
                  onChange={(e) => setCancionInvitadoId(e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1f4027] bg-white cursor-pointer"
                >
                  <option value="">Administrador (Sin invitado)</option>
                  {invitados.map((inv) => (
                    <option key={inv.id} value={inv.id}>
                      👤 {inv.nombre}
                    </option>
                  ))}
                </select>
                <span className="text-xs text-slate-400 mt-1 block">
                  Si no seleccionas un invitado, se registrará que la sugerencia vino por parte del administrador.
                </span>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalCancionAbierto(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 transition border-none bg-transparent cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardandoCancion}
                  className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-sm font-medium transition shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  {guardandoCancion ? 'Guardando...' : 'Guardar Canción'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}