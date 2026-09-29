'use client';

import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';

interface Invitado {
  id: string;
  nombre: string;
  boletos?: number;
  pases?: number;
  telefono?: string;
  estado?: string;
  pases_confirmados?: number;
  created_at?: string;
}

export default function DashboardClient() {
  const [invitados, setInvitados] = useState<Invitado[]>([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<'todos' | 'confirmados' | 'pendientes' | 'declinados'>('todos');
  const [copiadoId, setCopiadoId] = useState<string | null>(null);
  const [cargandoCSV, setCargandoCSV] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    cargarInvitados();
  }, []);

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

  // Normalizadores para coincidir con la base de datos
  const getBoletos = (inv: Invitado) => Number(inv.boletos ?? inv.pases ?? 0);
  const getEstado = (inv: Invitado) => (inv.estado || 'pendiente').toLowerCase().trim();

  // Métricas
  const totalInvitaciones = invitados.length;
  const totalBoletos = invitados.reduce((acc, curr) => acc + getBoletos(curr), 0);

  const confirmados = invitados.filter((i) => getEstado(i) === 'confirmado');
  const declinados = invitados.filter(
    (i) => getEstado(i) === 'declinado' || getEstado(i) === 'cancelado' || getEstado(i) === 'no'
  );
  const pendientes = invitados.filter((i) => getEstado(i) === 'pendiente');

  const boletosConfirmados = confirmados.reduce(
    (acc, curr) => acc + (Number(curr.pases_confirmados ?? getBoletos(curr)) || 0),
    0
  );

  // Filtros y búsqueda
  const invitadosFiltrados = invitados.filter((inv) => {
    const coincideNombre = inv.nombre?.toLowerCase().includes(busqueda.toLowerCase());
    if (!coincideNombre) return false;

    const est = getEstado(inv);
    if (filtroEstado === 'confirmados') return est === 'confirmado';
    if (filtroEstado === 'declinados') return est === 'declinado' || est === 'cancelado' || est === 'no';
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
          (h) => h.includes('boleto') || h.includes('pase')
        );
        const indexTelefono = cabeceras.findIndex(
          (h) => h.includes('tel') || h.includes('cel') || h.includes('whats')
        );

        const nuevosInvitados = [];

        for (let i = 1; i < lineas.length; i++) {
          const valores = lineas[i].split(',').map((v) => v.trim().replace(/^"|"$/g, ''));
          if (valores.length === 0 || !valores[0]) continue;

          const nombre = indexNombre !== -1 ? valores[indexNombre] : valores[0];
          const boletos = indexBoletos !== -1 ? parseInt(valores[indexBoletos]) || 1 : parseInt(valores[1]) || 1;
          const telefono = indexTelefono !== -1 ? valores[indexTelefono] : valores[2] || null;

          if (nombre) {
            nuevosInvitados.push({
              nombre,
              boletos,
              telefono,
              estado: 'pendiente',
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

  return (
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

        <div className="flex items-center gap-3 w-full sm:w-auto">
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
            className="inline-flex items-center px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 shadow-sm transition disabled:opacity-50"
          >
            {cargandoCSV ? 'Subiendo...' : '📂 Subir CSV'}
          </button>

          <button
            onClick={cargarInvitados}
            className="inline-flex items-center px-4 py-2 bg-[#1f4027] rounded-lg text-sm font-medium text-white hover:bg-[#16301d] shadow-sm transition"
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
                  const cantBoletos = getBoletos(inv);

                  return (
                    <tr key={inv.id} className="hover:bg-slate-50/60 transition">
                      <td className="py-3.5 px-4 font-medium text-slate-800">
                        {inv.nombre}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">
                        {cantBoletos > 0 ? `${cantBoletos} ${cantBoletos === 1 ? 'boleto' : 'boletos'}` : '—'}
                      </td>
                      <td className="py-3.5 px-4">
                        {est === 'confirmado' && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                            Confirmado
                          </span>
                        )}
                        {(est === 'declinado' || est === 'cancelado' || est === 'no') && (
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
                        {est === 'confirmado' ? (inv.pases_confirmados ?? (cantBoletos > 0 ? cantBoletos : '-')) : '-'}
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
  );
}