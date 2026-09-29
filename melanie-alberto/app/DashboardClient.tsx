'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase'; // Asegúrate de que apunte a tu cliente de Supabase

interface Invitado {
  id: string;
  nombre: string;
  boletos: number;
  asistencia: boolean | null;
  mensaje?: string;
  pases_confirmados?: number;
}

export default function DashboardClient() {
  const [invitados, setInvitados] = useState<Invitado[]>([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<'todos' | 'confirmados' | 'pendientes' | 'declinados'>('todos');
  const [copiadoId, setCopiadoId] = useState<string | null>(null);

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

  // Métricas
  const totalInvitados = invitados.length;
  const totalBoletos = invitados.reduce((acc, curr) => acc + (curr.boletos || 0), 0);
  
  const confirmados = invitados.filter(i => i.asistencia === true);
  const declinados = invitados.filter(i => i.asistencia === false);
  const pendientes = invitados.filter(i => i.asistencia === null);

  const boletosConfirmados = confirmados.reduce(
    (acc, curr) => acc + (curr.pases_confirmados ?? curr.boletos ?? 0), 
    0
  );

  // Filtrado
  const invitadosFiltrados = invitados.filter((inv) => {
    const coincideNombre = inv.nombre.toLowerCase().includes(busqueda.toLowerCase());
    
    if (!coincideNombre) return false;

    if (filtroEstado === 'confirmados') return inv.asistencia === true;
    if (filtroEstado === 'declinados') return inv.asistencia === false;
    if (filtroEstado === 'pendientes') return inv.asistencia === null;

    return true;
  });

  const copiarEnlace = (id: string) => {
    const url = `${window.location.origin}/invitacion/${id}`;
    navigator.clipboard.writeText(url);
    setCopiadoId(id);
    setTimeout(() => setCopiadoId(null), 2000);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#1f4027]">
            Control de Invitados • Melanie & Alberto
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Gestión y monitoreo de confirmaciones en tiempo real
          </p>
        </div>
        <button
          onClick={cargarInvitados}
          className="inline-flex items-center px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 shadow-sm transition"
        >
          🔄 Actualizar lista
        </button>
      </div>

      {/* Tarjetas Métricas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Boletos</p>
          <p className="text-2xl sm:text-3xl font-bold text-slate-800 mt-1">{totalBoletos}</p>
          <p className="text-xs text-slate-500 mt-1">{totalInvitados} invitaciones emitidas</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-emerald-100 bg-emerald-50/20 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600">Boletos Confirmados</p>
          <p className="text-2xl sm:text-3xl font-bold text-emerald-700 mt-1">{boletosConfirmados}</p>
          <p className="text-xs text-emerald-600 mt-1">{confirmados.length} familias/parejas</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-amber-100 bg-amber-50/20 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-amber-600">Pendientes</p>
          <p className="text-2xl sm:text-3xl font-bold text-amber-700 mt-1">{pendientes.length}</p>
          <p className="text-xs text-amber-600 mt-1">Por confirmar asistencia</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-rose-100 bg-rose-50/20 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-rose-600">Declinaron</p>
          <p className="text-2xl sm:text-3xl font-bold text-rose-700 mt-1">{declinados.length}</p>
          <p className="text-xs text-rose-600 mt-1">No podrán asistir</p>
        </div>
      </div>

      {/* Controles de Búsqueda y Filtros */}
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
                <th className="py-3.5 px-4">Mensaje</th>
                <th className="py-3.5 px-4 text-right">Enlace</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    Cargando información...
                  </td>
                </tr>
              ) : invitadosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    No se encontraron invitados con esos filtros.
                  </td>
                </tr>
              ) : (
                invitadosFiltrados.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/60 transition">
                    <td className="py-3.5 px-4 font-medium text-slate-800">
                      {inv.nombre}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">
                      {inv.boletos} {inv.boletos === 1 ? 'boleto' : 'boletos'}
                    </td>
                    <td className="py-3.5 px-4">
                      {inv.asistencia === true && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                          Confirmado
                        </span>
                      )}
                      {inv.asistencia === false && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-100 text-rose-800">
                          Declinado
                        </span>
                      )}
                      {inv.asistencia === null && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                          Pendiente
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 font-semibold">
                      {inv.asistencia === true ? (inv.pases_confirmados ?? inv.boletos) : '-'}
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 max-w-xs truncate" title={inv.mensaje}>
                      {inv.mensaje || '—'}
                    </td>
                    <td className="py-3.5 px-4 text-right">
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
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}