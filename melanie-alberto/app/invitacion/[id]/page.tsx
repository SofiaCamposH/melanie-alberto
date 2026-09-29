'use client';
import { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';

interface iTunesTrack {
  trackId: number;
  trackName: string;
  artistName: string;
  artworkUrl100: string;
  previewUrl?: string;
}

export default function InvitacionZelda() {
  const params = useParams();
  const id = params.id as string;

  const [invitado, setInvitado] = useState<any>(null);
  const [cargando, setCargando] = useState(true);
  const [errorInfo, setErrorInfo] = useState('');
  
  const [sobreAbierto, setSobreAbierto] = useState(false);
  const [animandoSobre, setAnimandoSobre] = useState(false);
  const [naviVolando, setNaviVolando] = useState(false);
  
  const audioRef = useRef<HTMLAudioElement>(null);
  const naviAudioRef = useRef<HTMLAudioElement>(null);
  const previewAudioRef = useRef<HTMLAudioElement>(null);
  const contenidoRef = useRef<HTMLDivElement>(null);

  // Manejo de boletos aceptados
  const [boletosSeleccionados, setBoletosSeleccionados] = useState<number>(1);
  const [guardandoConfirmacion, setGuardandoConfirmacion] = useState(false);

  // Estados del Buscador de iTunes
  const [queryMusica, setQueryMusica] = useState('');
  const [resultadosiTunes, setResultadosiTunes] = useState<iTunesTrack[]>([]);
  const [buscandoiTunes, setBuscandoiTunes] = useState(false);
  const [cancionSeleccionada, setCancionSeleccionada] = useState<iTunesTrack | null>(null);
  const [previewSonando, setPreviewSonando] = useState(false);
  const [enviandoCancion, setEnviandoCancion] = useState(false);
  const [cancionEnviada, setCancionEnviada] = useState(false);

  const [fotoIndex, setFotoIndex] = useState(0);
  const fotos = ['/foto1.jpeg', '/foto2.jpeg', '/foto3.jpeg', '/foto4.jpeg', '/foto5.jpeg'];

  const [faltan, setFaltan] = useState({ dias: 0, horas: 0, minutos: 0, segundos: 0 });

  useEffect(() => {
    if (id) obtenerInvitado();
  }, [id]);

  useEffect(() => {
    const fechaBoda = new Date('2026-12-18T18:00:00').getTime();

    const intervalo = setInterval(() => {
      const ahora = new Date().getTime();
      const distancia = fechaBoda - ahora;

      if (distancia < 0) {
        clearInterval(intervalo);
        setFaltan({ dias: 0, horas: 0, minutos: 0, segundos: 0 });
      } else {
        setFaltan({
          dias: Math.floor(distancia / (1000 * 60 * 60 * 24)),
          horas: Math.floor((distancia % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          minutos: Math.floor((distancia % (1000 * 60)) / (1000 * 60)),
          segundos: Math.floor((distancia % (1000 * 60)) / 1000),
        });
      }
    }, 1000);

    return () => clearInterval(intervalo);
  }, []);

  // Búsqueda en iTunes Search API con Debounce
  useEffect(() => {
    if (queryMusica.trim().length < 2) {
      setResultadosiTunes([]);
      setBuscandoiTunes(false);
      return;
    }

    // Si ya seleccionó una pista y el texto coincide, no volvemos a disparar la búsqueda
    if (cancionSeleccionada && `${cancionSeleccionada.trackName} - ${cancionSeleccionada.artistName}` === queryMusica) {
      return;
    }

    setBuscandoiTunes(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://itunes.apple.com/search?term=${encodeURIComponent(queryMusica)}&entity=song&limit=5`
        );
        const data = await res.json();
        setResultadosiTunes(data.results || []);
      } catch (err) {
        console.error("Error buscando en iTunes:", err);
      } finally {
        setBuscandoiTunes(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [queryMusica, cancionSeleccionada]);

  const obtenerInvitado = async () => {
    const { data, error } = await supabase.from('invitados').select('*').eq('id', id).single();
    if (error || !data) {
      setErrorInfo('No se encontró la invitación.');
    } else {
      setInvitado(data);
      const asignados = Number(data.boletos_asignados) || 1;
      const aceptados = Number(data.boletos_aceptados) || asignados;
      setBoletosSeleccionados(aceptados > 0 ? aceptados : 1);
    }
    setCargando(false);
  };

  const tocarNavi = () => {
    if (naviVolando) return;
    setNaviVolando(true);
    
    if (naviAudioRef.current) {
      naviAudioRef.current.play().catch(e => console.log("Error reproduciendo Navi:", e));
    }

    setTimeout(() => {
      setAnimandoSobre(true);
      setTimeout(() => {
        setSobreAbierto(true);
        if (audioRef.current) {
          audioRef.current.volume = 0.5;
          audioRef.current.play().catch(e => console.log("Error reproduciendo música:", e));
        }
      }, 800);
    }, 600);
  };

  const confirmarAsistencia = async () => {
    setGuardandoConfirmacion(true);
    const { error } = await supabase
      .from('invitados')
      .update({ 
        estado: 'confirmado',
        boletos_aceptados: boletosSeleccionados
      })
      .eq('id', id);

    if (!error) {
      alert(`¡Gracias por confirmar tu asistencia con ${boletosSeleccionados} ${boletosSeleccionados === 1 ? 'pase' : 'pases'}!`);
      obtenerInvitado();
    } else {
      alert("Hubo un error al confirmar. Inténtalo de nuevo.");
    }
    setGuardandoConfirmacion(false);
  };

  const rechazarAsistencia = async () => {
    const seguro = window.confirm("¿Estás seguro de que no podrás acompañarnos?");
    if (seguro) {
      const { error } = await supabase
        .from('invitados')
        .update({ 
          estado: 'rechazado',
          boletos_aceptados: 0
        })
        .eq('id', id);

      if (!error) {
        alert("Lamentamos que no puedas acompañarnos. ¡Gracias por avisarnos!");
        obtenerInvitado();
      }
    }
  };

  // Manejo de Preview de Audio de iTunes
  const togglePreview = (url?: string) => {
    if (!url || !previewAudioRef.current) return;

    if (previewSonando) {
      previewAudioRef.current.pause();
      setPreviewSonando(false);
    } else {
      // Bajamos el volumen de la música de fondo de Zelda
      if (audioRef.current) audioRef.current.volume = 0.15;
      
      previewAudioRef.current.src = url;
      previewAudioRef.current.play().then(() => {
        setPreviewSonando(true);
      }).catch(e => console.log("Error en preview:", e));
    }
  };

  const seleccionarPista = (track: iTunesTrack) => {
    setCancionSeleccionada(track);
    setQueryMusica(`${track.trackName} - ${track.artistName}`);
    setResultadosiTunes([]);
    if (track.previewUrl) {
      togglePreview(track.previewUrl);
    }
  };

  const enviarCancion = async () => {
    if (!queryMusica.trim()) return alert("Busca o escribe una canción primero.");
    setEnviandoCancion(true);

    const tituloAEnviar = cancionSeleccionada ? cancionSeleccionada.trackName : queryMusica;
    const artistaAEnviar = cancionSeleccionada ? cancionSeleccionada.artistName : 'No especificado';

    const { error } = await supabase.from('canciones').insert([
      { 
        titulo: tituloAEnviar, 
        artista: artistaAEnviar, 
        invitado_id: id 
      }
    ]);

    if (!error) {
      setCancionEnviada(true);
      setCancionSeleccionada(null);
      setQueryMusica('');
      if (previewAudioRef.current) {
        previewAudioRef.current.pause();
        setPreviewSonando(false);
      }
      if (audioRef.current) audioRef.current.volume = 0.5;
    } else {
      alert("Error al enviar la sugerencia. Verifica tu conexión.");
    }
    setEnviandoCancion(false);
  };

  const siguienteFoto = () => setFotoIndex((prev) => (prev === fotos.length - 1 ? 0 : prev + 1));
  const fotoAnterior = () => setFotoIndex((prev) => (prev === 0 ? fotos.length - 1 : prev - 1));

  if (cargando) return <div className="min-h-screen flex items-center justify-center text-white bg-black">Cargando...</div>;
  if (errorInfo) return <div className="min-h-screen flex items-center justify-center text-white bg-black">{errorInfo}</div>;

  const totalAsignados = Number(invitado?.boletos_asignados) || 1;

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center overflow-hidden">
      <audio ref={audioRef} src="/musica.mp3" loop />
      <audio ref={naviAudioRef} src="/navi.mp3" preload="auto" />
      <audio 
        ref={previewAudioRef} 
        onEnded={() => {
          setPreviewSonando(false);
          if (audioRef.current) audioRef.current.volume = 0.5;
        }} 
      />

      {/* VISTA 1: SOBRE CERRADO CON NAVI */}
      {!sobreAbierto && (
        <div 
          className={`transition-all duration-700 transform flex flex-col items-center justify-center relative
            ${animandoSobre ? '-translate-y-[100vh] opacity-0 scale-50' : 'translate-y-0 opacity-100 scale-100'}
          `}
          style={{ fontFamily: "'Textos', sans-serif" }}
        >
          <div className="bg-[#1f4027] w-80 h-48 sm:w-96 sm:h-64 relative border-4 border-[#c5a059] shadow-[0_0_30px_rgba(197,160,89,0.3)] text-[#c5a059]">
            <div className="absolute top-0 left-0 w-0 h-0 border-l-[156px] border-l-transparent border-r-[156px] border-r-transparent border-t-[100px] border-t-[#2d5c38] sm:border-l-[188px] sm:border-r-[188px] sm:border-t-[120px] opacity-90 z-10" />
            
            <div className="absolute bottom-6 sm:bottom-8 left-0 w-full z-20 text-center px-4">
              <h3 
                className="text-4xl sm:text-5xl truncate font-normal" 
                style={{ fontFamily: "'Zelda', sans-serif" }}
              >
                {invitado.nombre}
              </h3>
            </div>

            <div className="absolute top-[100px] sm:top-[120px] left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 flex flex-col items-center">
              <div 
                onClick={tocarNavi}
                className={`cursor-pointer transition-all duration-700 ease-in-out flex flex-col items-center
                  ${naviVolando ? '-translate-y-[60vh] translate-x-[20vw] scale-50 opacity-0' : 'animate-bounce hover:scale-110'}
                `}
              >
                <div className="relative">
                  <div className="absolute inset-0 bg-blue-400 rounded-full blur-xl opacity-60 animate-pulse"></div>
                  <img src="/navi.png" alt="Toca a Navi" className="w-16 h-16 sm:w-20 sm:h-20 relative z-10 drop-shadow-[0_0_15px_rgba(255,255,255,0.8)]" />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VISTA 2: INVITACIÓN ABIERTA CON PERGAMINO */}
      {sobreAbierto && (
        <div 
          className="animate-fade-in max-w-lg w-full min-h-screen shadow-[0_0_50px_rgba(0,0,0,0.8)] relative text-[#4A3B2C] flex flex-col items-center pb-24"
          style={{
            backgroundImage: "url('/pergamino.avif')",
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundAttachment: 'fixed',
            fontFamily: "'Textos', sans-serif" 
          }}
        >
          {/* MARCOS ESTILO FANTASÍA */}
          <div className="absolute inset-0 border-[12px] border-[#1f4027] pointer-events-none z-0"></div>
          <div className="absolute inset-[12px] border-[4px] border-[#c5a059] pointer-events-none z-0 shadow-[inset_0_0_30px_rgba(0,0,0,0.3)]"></div>
          <div className="absolute inset-[24px] border border-[#8C6D46]/40 pointer-events-none z-0"></div>
          
          <div className="absolute top-[16px] left-[16px] w-12 h-12 sm:w-16 sm:h-16 border-t-[6px] border-l-[6px] border-[#c5a059] pointer-events-none z-0"></div>
          <div className="absolute top-[16px] right-[16px] w-12 h-12 sm:w-16 sm:h-16 border-t-[6px] border-r-[6px] border-[#c5a059] pointer-events-none z-0"></div>
          <div className="absolute bottom-[16px] left-[16px] w-12 h-12 sm:w-16 sm:h-16 border-b-[6px] border-l-[6px] border-[#c5a059] pointer-events-none z-0"></div>
          <div className="absolute bottom-[16px] right-[16px] w-12 h-12 sm:w-16 sm:h-16 border-b-[6px] border-r-[6px] border-[#c5a059] pointer-events-none z-0"></div>

          {/* VITRAL INICIAL */}
          <div className="w-full flex flex-col items-center justify-center pt-8 pb-3 px-6 relative z-10">
            <img 
              src="/inicio.png" 
              alt="Vitral Zelda y Link" 
              className="w-[90%] sm:w-[80%] max-w-[380px] h-auto drop-shadow-2xl"
            />
          </div>

          {/* CONTENIDO PRINCIPAL */}
          <div ref={contenidoRef} className="relative z-10 w-full flex flex-col items-center space-y-7 px-6 pt-0">
            
            {/* 1. NOMBRES E INTRO */}
            <div className="flex flex-col items-center w-full text-center mt-1">
              <h1 
                className="text-6xl sm:text-7xl md:text-8xl font-normal tracking-wide leading-[0.9] text-[#4A3B2C] flex flex-col items-center" 
                style={{ fontFamily: "'Zelda', sans-serif" }}
              >
                <span>
                  Melanie <span className="text-[#8C6D46]">&</span>
                </span>
                <span className="mt-1">Alberto</span>
              </h1>
            </div>

            <div className="text-center bg-[#f4e8c1]/60 p-3.5 rounded-xl backdrop-blur-sm w-full max-w-sm">
              <p className="text-base sm:text-lg mb-1 font-semibold">Estás cordialmente invitado a celebrar nuestra boda</p>
              <p className="text-base sm:text-lg font-bold text-[#8C6D46]">"It's dangerous to go alone! Will you join us?"</p>
            </div>

            <hr className="border-[#8C6D46] border-t-2 w-1/2 opacity-50 my-1" />

            {/* 2. CONTADOR */}
            <div className="flex flex-col items-center justify-center w-full -mt-1">
              <h2 className="text-3xl sm:text-4xl text-[#1f4027] mb-3 drop-shadow-sm text-center" style={{ fontFamily: "'Zelda', sans-serif" }}>Solo faltan:</h2>
              
              <div className="flex justify-center gap-4 sm:gap-6 text-center w-full">
                <div className="flex flex-col items-center">
                  <span className="text-4xl sm:text-5xl text-[#1f4027] drop-shadow-sm" style={{ fontFamily: "'Zelda', sans-serif" }}>{faltan.dias}</span>
                  <span className="text-xs uppercase tracking-widest text-[#8C6D46] font-bold mt-1">Días</span>
                </div>
                <span className="text-3xl text-[#8C6D46] mt-2">:</span>
                <div className="flex flex-col items-center">
                  <span className="text-4xl sm:text-5xl text-[#1f4027] drop-shadow-sm" style={{ fontFamily: "'Zelda', sans-serif" }}>{faltan.horas}</span>
                  <span className="text-xs uppercase tracking-widest text-[#8C6D46] font-bold mt-1">Hrs</span>
                </div>
                <span className="text-3xl text-[#8C6D46] mt-2">:</span>
                <div className="flex flex-col items-center">
                  <span className="text-4xl sm:text-5xl text-[#1f4027] drop-shadow-sm" style={{ fontFamily: "'Zelda', sans-serif" }}>{faltan.minutos}</span>
                  <span className="text-xs uppercase tracking-widest text-[#8C6D46] font-bold mt-1">Min</span>
                </div>
                <span className="text-3xl text-[#8C6D46] mt-2">:</span>
                <div className="flex flex-col items-center">
                  <span className="text-4xl sm:text-5xl text-[#1f4027] drop-shadow-sm" style={{ fontFamily: "'Zelda', sans-serif" }}>{faltan.segundos}</span>
                  <span className="text-xs uppercase tracking-widest text-[#8C6D46] font-bold mt-1">Seg</span>
                </div>
              </div>
            </div>

            {/* 3. CARRUSEL */}
            <div className="w-full flex flex-col items-center pt-2">
              <h2 className="text-4xl sm:text-5xl text-[#1f4027] mb-6 drop-shadow-sm" style={{ fontFamily: "'Zelda', sans-serif" }}>Nosotros</h2>
              
              <div className="relative w-64 h-80 sm:w-72 sm:h-96 group">
                <div className="absolute inset-0 bg-[#f8f5eb] p-3 sm:p-4 shadow-[0_15px_35px_rgba(0,0,0,0.4)] border border-[#d2bfa1] transform -rotate-2 transition-transform duration-500 hover:rotate-0">
                  <div className="w-full h-full border-2 border-[#8C6D46] relative overflow-hidden bg-gray-200">
                    <img src={fotos[fotoIndex]} alt={`Momento ${fotoIndex + 1}`} className="w-full h-full object-cover transition-opacity duration-500" />
                  </div>
                </div>

                <button 
                  type="button"
                  onClick={fotoAnterior} 
                  aria-label="Foto anterior"
                  className="absolute -left-7 sm:-left-9 top-1/2 -translate-y-1/2 text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.85)] hover:scale-125 transition-transform z-20 text-3xl sm:text-4xl font-bold bg-transparent border-none outline-none focus:outline-none p-1"
                >
                  &#10094;
                </button>
                <button 
                  type="button"
                  onClick={siguienteFoto} 
                  aria-label="Siguiente foto"
                  className="absolute -right-7 sm:-right-9 top-1/2 -translate-y-1/2 text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.85)] hover:scale-125 transition-transform z-20 text-3xl sm:text-4xl font-bold bg-transparent border-none outline-none focus:outline-none p-1"
                >
                  &#10095;
                </button>
              </div>

              <div className="flex gap-2 mt-6">
                {fotos.map((_, i) => (
                  <div key={i} className={`w-3 h-3 rounded-full transition-colors ${i === fotoIndex ? 'bg-[#4A3B2C]' : 'bg-[#8C6D46]/40'}`} />
                ))}
              </div>
            </div>

            {/* 4. FECHA Y LUGAR */}
            <div className="w-full bg-[#f4e8c1]/90 p-6 sm:p-8 border-2 border-[#8C6D46] shadow-[0_0_15px_rgba(0,0,0,0.1)] text-center relative z-10 backdrop-blur-sm">
              <h2 className="text-4xl sm:text-5xl text-[#1f4027] mb-6 drop-shadow-sm" style={{ fontFamily: "'Zelda', sans-serif" }}>Lugar y Fecha</h2>
              
              <div className="flex flex-col gap-5 text-lg text-[#4A3B2C] mb-6">
                <div className="flex flex-col items-center justify-center">
                  <span className="text-sm uppercase tracking-widest text-[#8C6D46] font-bold mb-1">Día del Evento</span>
                  <p className="font-semibold text-xl">Viernes, 18 de Diciembre de 2026</p>
                </div>
                <div className="flex flex-col items-center justify-center">
                  <span className="text-sm uppercase tracking-widest text-[#8C6D46] font-bold mb-1">Recepción</span>
                  <p className="font-semibold text-xl">18:00 hrs</p>
                </div>
                <div className="flex flex-col items-center justify-center mt-1">
                  <span className="text-sm uppercase tracking-widest text-[#8C6D46] font-bold mb-1">Lugar</span>
                  <p className="font-bold text-2xl text-[#1f4027]">Salon de eventos "Gran Jardin"</p>
                  <p className="text-base mt-1">Adolfo López Mateos 203, Trojes de San Cristóbal</p>
                </div>
              </div>

              <a 
                href="https://maps.app.goo.gl/DpDwAydRXVEvvoUw5" 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-block bg-[#1f4027] text-[#f4e8c1] px-6 py-3 font-bold text-lg uppercase tracking-wider hover:bg-[#2d5c38] transition shadow-[4px_4px_0px_0px_rgba(140,109,70,1)] border border-[#8C6D46]"
              >
                Ver en el Mapa
              </a>
            </div>

            {/* 5. MESA DE REGALOS */}
            <div className="w-full text-center my-2">
              <h2 className="text-4xl sm:text-5xl text-[#1f4027] mb-4 drop-shadow-sm" style={{ fontFamily: "'Zelda', sans-serif" }}>Mesa de Regalos</h2>
              
              <p className="text-base text-[#4A3B2C] mb-4 px-4">
                El regalo más grande es que nos acompañes en este día, pero si deseas tener un detalle con nosotros, te compartimos nuestras mesas de regalos oficiales. ¡Gracias por tu cariño y apoyo!:
              </p>

              <div className="flex justify-center gap-6 my-6">
                <a href="https://mesaderegalos.liverpool.com.mx/milistaderegalos/60041692" target="_blank" rel="noopener noreferrer" className="hover:scale-110 transition bg-white p-2 rounded-lg shadow-md border border-[#c5a059]">
                  <img src="/liverpool.png" alt="Liverpool" className="h-10 sm:h-12 w-auto object-contain" />
                </a>
                <a href="https://www.amazon.com.mx/wedding/share/Monkeysbrides" target="_blank" rel="noopener noreferrer" className="hover:scale-110 transition bg-white p-2 rounded-lg shadow-md border border-[#c5a059]">
                  <img src="/amazon.png" alt="Amazon" className="h-10 sm:h-12 w-auto object-contain" />
                </a>
              </div>
            </div>

            <hr className="border-[#8C6D46] border-t-2 w-1/2 opacity-50 my-1" />

            {/* 6. CÓDIGO DE VESTIMENTA */}
            <div className="w-full text-center my-2">
              <h2 className="text-4xl sm:text-5xl mb-4 text-[#1f4027] drop-shadow-sm" style={{ fontFamily: "'Zelda', sans-serif" }}>Código de Vestimenta</h2>
              <p className="text-2xl font-bold text-[#8C6D46] uppercase tracking-widest mb-1">Formal</p>
              <p className="text-[#4A3B2C] text-lg font-semibold">El blanco se reserva para la novia.</p>
              
              <img src="/vestimenta.png" alt="Código de Vestimenta" className="w-24 sm:w-32 h-auto mx-auto mt-4 drop-shadow-md" />
            </div>

            {/* 7. CONFIRMACIÓN DE ASISTENCIA */}
            <div className="w-full bg-[#f4e8c1]/90 p-6 sm:p-8 border-2 border-[#8C6D46] shadow-[0_0_15px_rgba(0,0,0,0.1)] text-center relative z-10 backdrop-blur-sm">
              <h2 className="text-4xl sm:text-5xl text-[#1f4027] mb-4 drop-shadow-sm leading-tight" style={{ fontFamily: "'Zelda', sans-serif" }}>
                Confirmación de Asistencia
              </h2>
              
              <p className="text-lg text-[#4A3B2C] font-semibold mb-1">Estamos emocionados de verte en nuestra boda.</p>
              <p className="text-base text-[#4A3B2C] mb-4">Entendemos si por algún motivo no pudieras acompañarnos. Te pedimos por favor que nos confirmes tu asistencia lo antes posible.</p>

              <div className="my-4 py-3 border-y-2 border-[#8C6D46]/40 bg-[#e8dcc4]/50">
                <p className="text-3xl sm:text-4xl text-[#1f4027] drop-shadow-sm" style={{ fontFamily: "'Zelda', sans-serif" }}>
                  Evento solo para adultos
                </p>
                <p className="text-sm text-[#4A3B2C] mt-1 font-semibold">Queremos que se relajen y disfruten de la fiesta al máximo.</p>
              </div>
              
              <p className="text-lg font-semibold mb-3">
                Hemos reservado <strong className="text-2xl text-[#8C6D46]">{totalAsignados}</strong> {totalAsignados === 1 ? 'pase' : 'pases'} para ti, {invitado.nombre}.
              </p>

              {invitado.estado !== 'confirmado' && invitado.estado !== 'rechazado' && totalAsignados > 1 && (
                <div className="mb-5 flex flex-col items-center">
                  <label className="text-sm font-bold text-[#8C6D46] uppercase tracking-wider mb-2">
                    ¿Cuántos pases confirmas?
                  </label>
                  <div className="flex items-center gap-4 bg-white/70 px-4 py-2 rounded-xl border border-[#8C6D46]/40 shadow-sm">
                    <button
                      type="button"
                      onClick={() => setBoletosSeleccionados(prev => Math.max(1, prev - 1))}
                      className="w-8 h-8 rounded-full bg-[#1f4027] text-white font-bold flex items-center justify-center hover:bg-[#2d5c38] transition active:scale-95"
                    >
                      -
                    </button>
                    <span className="text-2xl font-bold text-[#1f4027] min-w-[2rem] text-center" style={{ fontFamily: "'Zelda', sans-serif" }}>
                      {boletosSeleccionados}
                    </span>
                    <button
                      type="button"
                      onClick={() => setBoletosSeleccionados(prev => Math.min(totalAsignados, prev + 1))}
                      className="w-8 h-8 rounded-full bg-[#1f4027] text-white font-bold flex items-center justify-center hover:bg-[#2d5c38] transition active:scale-95"
                    >
                      +
                    </button>
                  </div>
                  <span className="text-xs text-[#8C6D46] mt-1.5 italic">
                    de un máximo de {totalAsignados} {totalAsignados === 1 ? 'pase' : 'pases'}
                  </span>
                </div>
              )}
              
              <div className="mt-4 flex flex-col sm:flex-row gap-4 justify-center">
                {invitado.estado === 'confirmado' ? (
                  <div className="bg-[#2d5c38] text-[#f4e8c1] p-4 border border-[#c5a059] w-full">
                    <p className="font-bold italic text-xl drop-shadow-sm">
                      ✨ ¡Misión Aceptada! Confirmaste {invitado.boletos_aceptados || totalAsignados} { (invitado.boletos_aceptados || totalAsignados) === 1 ? 'pase' : 'pases'}.
                    </p>
                  </div>
                ) : invitado.estado === 'rechazado' ? (
                  <div className="bg-[#4A3B2C] text-[#f4e8c1] p-4 border border-[#c5a059] w-full">
                    <p className="font-bold italic text-xl drop-shadow-sm">Lamentamos que no puedas asistir. ¡Te extrañaremos!</p>
                  </div>
                ) : (
                  <>
                    <button 
                      onClick={confirmarAsistencia} 
                      disabled={guardandoConfirmacion}
                      className="bg-[#2d5c38] text-[#f4e8c1] px-6 py-4 font-bold text-lg uppercase tracking-widest hover:bg-[#1f4027] transition shadow-[4px_4px_0px_0px_rgba(74,59,44,0.8)] border border-[#c5a059] w-full sm:w-auto disabled:opacity-50"
                    >
                      {guardandoConfirmacion ? 'Confirmando...' : `Confirmar (${boletosSeleccionados} ${boletosSeleccionados === 1 ? 'pase' : 'pases'})`}
                    </button>
                    <button 
                      onClick={rechazarAsistencia} 
                      className="bg-[#8C6D46] text-[#f4e8c1] px-6 py-4 font-bold text-lg uppercase tracking-widest hover:bg-[#6b5233] transition shadow-[4px_4px_0px_0px_rgba(74,59,44,0.8)] border border-[#4A3B2C] w-full sm:w-auto"
                    >
                      No podré asistir
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* 8. MELODÍAS (INTEGRACIÓN ITUNES SEARCH API ADAPTADA) */}
            <div className="w-full bg-[#e8dcc4]/80 p-6 border border-[#c5a059] shadow-[0_0_15px_rgba(197,160,89,0.2)] mb-8 backdrop-blur-sm text-center">
              <h3 className="text-3xl sm:text-4xl mb-2 text-[#8C6D46] drop-shadow-sm" style={{ fontFamily: "'Zelda', sans-serif" }}>
                Melodías para la fiesta
              </h3>
              <p className="text-sm text-[#4A3B2C] mb-4 font-semibold">
                ¿Qué canción no puede faltar en la pista?
              </p>

              {cancionEnviada ? (
                <div className="bg-[#2d5c38] text-[#f4e8c1] p-4 rounded-xl border border-[#c5a059] max-w-sm mx-auto shadow-md">
                  <p className="font-bold text-base mb-1">🎵 ¡Melodía agregada a la lista!</p>
                  <p className="text-xs opacity-90 mb-3">Los novios revisarán tu recomendación.</p>
                  <button 
                    onClick={() => setCancionEnviada(false)} 
                    className="text-xs underline font-bold uppercase tracking-wider text-[#c5a059] hover:text-white"
                  >
                    Sugerir otra canción
                  </button>
                </div>
              ) : (
                <div className="relative max-w-sm mx-auto flex flex-col gap-3">
                  {/* Input de Búsqueda */}
                  <div className="relative w-full">
                    <input 
                      type="text" 
                      placeholder="Busca por canción o artista..." 
                      value={queryMusica} 
                      onChange={(e) => {
                        setQueryMusica(e.target.value);
                        if (cancionSeleccionada) setCancionSeleccionada(null);
                      }} 
                      className="w-full bg-[#f4e8c1]/90 border-2 border-[#8C6D46] rounded-xl px-4 py-2.5 text-sm font-semibold text-[#4A3B2C] placeholder-[#8C6D46]/70 focus:outline-none focus:ring-2 focus:ring-[#1f4027]" 
                    />
                    {buscandoiTunes && (
                      <span className="absolute right-3 top-3 text-xs text-[#8C6D46] animate-pulse">
                        Buscando...
                      </span>
                    )}
                  </div>

                  {/* Resultados Desplegables de iTunes */}
                  {resultadosiTunes.length > 0 && !cancionSeleccionada && (
                    <div className="absolute top-12 left-0 right-0 z-30 bg-[#f8f5eb] border-2 border-[#8C6D46] rounded-xl shadow-2xl max-h-60 overflow-y-auto divide-y divide-[#8C6D46]/20 text-left">
                      {resultadosiTunes.map((track) => (
                        <div 
                          key={track.trackId}
                          onClick={() => seleccionarPista(track)}
                          className="flex items-center gap-3 p-2.5 hover:bg-[#e8dcc4] cursor-pointer transition"
                        >
                          <img 
                            src={track.artworkUrl100} 
                            alt={track.trackName} 
                            className="w-10 h-10 rounded-md object-cover shadow-sm flex-shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-[#1f4027] truncate">
                              {track.trackName}
                            </p>
                            <p className="text-[11px] text-[#8C6D46] truncate">
                              {track.artistName}
                            </p>
                          </div>
                          {track.previewUrl && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                togglePreview(track.previewUrl);
                              }}
                              className="text-xs bg-[#1f4027] text-white px-2 py-1 rounded-full hover:bg-[#2d5c38] transition flex-shrink-0"
                              title="Escuchar 30s"
                            >
                              ▶ 30s
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Tarjeta de Canción Seleccionada */}
                  {cancionSeleccionada && (
                    <div className="flex items-center gap-3 bg-[#f8f5eb] p-2.5 rounded-xl border border-[#c5a059] shadow-sm text-left">
                      <img 
                        src={cancionSeleccionada.artworkUrl100} 
                        alt={cancionSeleccionada.trackName} 
                        className="w-12 h-12 rounded-lg object-cover shadow"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-[#1f4027] truncate">
                          {cancionSeleccionada.trackName}
                        </p>
                        <p className="text-[11px] text-[#8C6D46] truncate">
                          {cancionSeleccionada.artistName}
                        </p>
                      </div>
                      {cancionSeleccionada.previewUrl && (
                        <button
                          type="button"
                          onClick={() => togglePreview(cancionSeleccionada.previewUrl)}
                          className="w-8 h-8 rounded-full bg-[#8C6D46] text-white flex items-center justify-center hover:bg-[#1f4027] transition text-sm flex-shrink-0"
                          title={previewSonando ? "Pausar" : "Escuchar muestra"}
                        >
                          {previewSonando ? "❚❚" : "▶"}
                        </button>
                      )}
                    </div>
                  )}

                  {/* Botón Enviar Sugerencia */}
                  <button 
                    onClick={enviarCancion} 
                    disabled={enviandoCancion || !queryMusica.trim()} 
                    className="flex items-center justify-center gap-2 bg-[#2d5c38] text-[#f4e8c1] px-6 py-3 font-bold text-sm uppercase tracking-widest hover:bg-[#1f4027] transition shadow-[3px_3px_0px_0px_rgba(74,59,44,0.8)] border border-[#c5a059] rounded-xl mt-1 w-full disabled:opacity-50"
                  >
                    {enviandoCancion ? 'Enviando...' : (
                      <>
                        Sugerir Melodía <span className="text-base leading-none">♫</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>

          </div>
        </div>
      )}
    </div>
  );
}