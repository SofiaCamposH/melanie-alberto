'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function AdminInvitados() {
  const [invitados, setInvitados] = useState<any[]>([]);
  
  // Estados para los campos
  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [boletos, setBoletos] = useState(1);
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    obtenerInvitados();
  }, []);

  const obtenerInvitados = async () => {
    const { data, error } = await supabase
      .from('invitados')
      .select('*')
      .order('creado_en', { ascending: false });
      
    if (!error && data) setInvitados(data);
  };

  const agregarInvitado = async () => {
    // Validación manual para evitar enviar campos vacíos
    if (!nombre.trim() || !telefono.trim()) {
      alert("Por favor completa el nombre y el teléfono del invitado.");
      return;
    }

    // Rastreadores para la consola
    console.log("1. Intentando guardar:", { nombre, telefono, boletos });
    console.log("2. URL conectada:", process.env.NEXT_PUBLIC_SUPABASE_URL);

    setCargando(true);

    const { data, error } = await supabase
      .from('invitados')
      .insert([{ nombre, telefono, boletos_asignados: boletos }])
      .select();

    console.log("3. Resultado Supabase:", { data, error });

    if (error) {
      alert('Error al guardar: ' + error.message);
    } else {
      alert('¡Invitado guardado con éxito!');
      setNombre('');
      setTelefono('');
      setBoletos(1);
      obtenerInvitados();
    }
    setCargando(false);
  };

  const enviarWhatsApp = (invitado: any) => {
    const urlInvitacion = `http://localhost:3000/invitacion/${invitado.id}`;
    const mensaje = `¡Hola ${invitado.nombre}! Me encantaría que me acompañaras. Abre tu invitación y confirma tu asistencia aquí: ${urlInvitacion}`;
    const link = `https://wa.me/${invitado.telefono}?text=${encodeURIComponent(mensaje)}`;
    window.open(link, '_blank');
  };

  return (
    <div className="p-8 max-w-4xl mx-auto text-black">
      <h1 className="text-3xl font-bold mb-6 text-white">Panel de Control de Invitados</h1>
      
      {/* Contenedor de registro convertido a DIV */}
      <div className="bg-white shadow rounded-lg p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">Agregar Nuevo Invitado</h2>
        <div className="flex gap-4 items-end flex-wrap">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium mb-1">Nombre Completo</label>
            <input 
              type="text" 
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="w-full border border-gray-300 rounded p-2" 
              placeholder="Ej. Familia López"
            />
          </div>
          <div className="flex-1 min-w-[150px]">
            <label className="block text-sm font-medium mb-1">WhatsApp (con código de país)</label>
            <input 
              type="text" 
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              className="w-full border border-gray-300 rounded p-2" 
              placeholder="524491234567" 
            />
          </div>
          <div className="w-24">
            <label className="block text-sm font-medium mb-1">Boletos</label>
            <input 
              type="number" 
              min="1"
              value={boletos}
              onChange={(e) => setBoletos(Number(e.target.value))}
              className="w-full border border-gray-300 rounded p-2" 
            />
          </div>
          <button 
            type="button" 
            onClick={agregarInvitado}
            disabled={cargando}
            className="bg-blue-600 text-white px-6 py-2 rounded font-semibold hover:bg-blue-700 disabled:opacity-50"
          >
            {cargando ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>

      {/* Lista de invitados */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Lista de Invitados ({invitados.length})</h2>
        {invitados.length === 0 ? (
          <p className="text-gray-500">Aún no hay invitados registrados.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b-2">
                  <th className="py-2">Nombre</th>
                  <th className="py-2">Boletos</th>
                  <th className="py-2">Estado</th>
                  <th className="py-2">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {invitados.map((invitado) => (
                  <tr key={invitado.id} className="border-b hover:bg-gray-50">
                    <td className="py-3 font-medium">{invitado.nombre}</td>
                    <td className="py-3">{invitado.boletos_asignados}</td>
                    <td className="py-3">
                      <span className={`px-2 py-1 rounded text-xs font-semibold uppercase 
                        ${invitado.estado === 'confirmado' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                        {invitado.estado}
                      </span>
                    </td>
                    <td className="py-3">
                      <button 
                        onClick={() => enviarWhatsApp(invitado)}
                        className="bg-green-500 text-white px-3 py-1 rounded text-sm hover:bg-green-600 transition"
                      >
                        Enviar WA
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