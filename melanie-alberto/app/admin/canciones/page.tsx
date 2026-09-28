'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

export default function AdminCanciones() {
  const [canciones, setCanciones] = useState<any[]>([]);
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    obtenerCanciones();
  }, []);

  const obtenerCanciones = async () => {
    // Obtenemos las canciones y hacemos un 'join' para traer el nombre del invitado
    const { data, error } = await supabase
      .from('canciones')
      .select(`
        id,
        titulo,
        artista,
        creado_en,
        invitados (nombre)
      `)
      .order('creado_en', { ascending: false });
      
    if (!error && data) {
      setCanciones(data);
    } else if (error) {
      console.error("Error al obtener canciones:", error);
    }
  };

  const eliminarCancion = async (id: string) => {
    const confirmar = window.confirm("¿Seguro que quieres borrar esta canción?");
    if (!confirmar) return;

    const { error } = await supabase.from('canciones').delete().eq('id', id);
    
    if (error) {
      alert('Error al borrar: ' + error.message);
    } else {
      obtenerCanciones(); // Recargar la lista
    }
  };

  const limpiarDuplicados = async () => {
    setCargando(true);
    const titulosVistos = new Set();
    const idsDuplicados: string[] = [];

    // 1. Identificar cuáles están repetidas (ignorando mayúsculas y espacios)
    canciones.forEach((cancion) => {
      const tituloNormalizado = cancion.titulo.toLowerCase().trim();
      
      if (titulosVistos.has(tituloNormalizado)) {
        idsDuplicados.push(cancion.id);
      } else {
        titulosVistos.add(tituloNormalizado);
      }
    });

    // 2. Avisar si no hay duplicados
    if (idsDuplicados.length === 0) {
      alert("¡Tu lista está limpia! No se encontraron canciones repetidas.");
      setCargando(false);
      return;
    }

    // 3. Confirmar y borrar
    const confirmar = window.confirm(`Se encontraron ${idsDuplicados.length} canciones repetidas. ¿Deseas eliminarlas?`);
    if (!confirmar) {
      setCargando(false);
      return;
    }

    const { error } = await supabase
      .from('canciones')
      .delete()
      .in('id', idsDuplicados);

    if (error) {
      alert("Error al borrar duplicados: " + error.message);
    } else {
      alert("¡Duplicados eliminados con éxito!");
      obtenerCanciones();
    }
    setCargando(false);
  };

  return (
    <div className="p-8 max-w-4xl mx-auto text-black">
      {/* Navegación */}
      <div className="mb-6 flex justify-between items-center">
        <h1 className="text-3xl font-bold text-white">Panel de Canciones</h1>
        <Link href="/admin" className="text-blue-400 hover:text-blue-300 font-semibold underline">
          &larr; Volver a Invitados
        </Link>
      </div>
      
      {/* Panel principal */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold">Lista de Sugerencias ({canciones.length})</h2>
          
          <button 
            onClick={limpiarDuplicados}
            disabled={cargando || canciones.length === 0}
            className="bg-purple-600 text-white px-4 py-2 rounded font-semibold hover:bg-purple-700 disabled:opacity-50"
          >
            {cargando ? 'Limpiando...' : '✨ Borrar Duplicados'}
          </button>
        </div>

        {canciones.length === 0 ? (
          <p className="text-gray-500">Aún no hay canciones sugeridas por los invitados.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b-2 bg-gray-50">
                  <th className="py-3 px-2">Canción</th>
                  <th className="py-3 px-2">Artista</th>
                  <th className="py-3 px-2">Sugerida por</th>
                  <th className="py-3 px-2 text-right">Acción</th>
                </tr>
              </thead>
              <tbody>
                {canciones.map((cancion) => (
                  <tr key={cancion.id} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-2 font-medium capitalize">{cancion.titulo}</td>
                    <td className="py-3 px-2 text-gray-700 capitalize">{cancion.artista || 'No especificado'}</td>
                    <td className="py-3 px-2 text-gray-600">
                      {/* Aquí mostramos el nombre del invitado usando el 'join' de Supabase */}
                      {cancion.invitados ? cancion.invitados.nombre : 'Anónimo'}
                    </td>
                    <td className="py-3 px-2 text-right">
                      <button 
                        onClick={() => eliminarCancion(cancion.id)}
                        className="text-red-500 hover:text-red-700 hover:underline text-sm font-semibold"
                      >
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}