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

interface CancionSugerida {
  id?: string;
  titulo: string;
  artista: string;
}

// Diccionario de Traducciones (i18n)
const i18n = {
  es: {
    loading: "Cargando...",
    notFound: "No se encontró la invitación.",
    navHint: "Toca para abrir",
    intro1: "Estás cordialmente invitado a celebrar nuestra boda",
    intro2: "\"It's dangerous to go alone! Will you join us?\"",
    timeRem: "Solo faltan:",
    days: "Días", hrs: "Hrs", min: "Min", sec: "Seg",
    us: "Nosotros",
    dateLoc: "Lugar y Fecha",
    eventDay: "Día del Evento",
    date: "Viernes, 18 de Diciembre de 2026",
    reception: "Recepción",
    endTime: "(El evento concluye a las 22:30 hrs)",
    location: "Lugar",
    hall: "Salon de eventos \"Gran Jardin\"",
    address: "Adolfo López Mateos 203, Trojes de San Cristóbal",
    mapBtn: "Ver en el Mapa",
    addCalBtn: "Añadir a Calendario",
    gifts: "Mesa de Regalos",
    giftsText: "El regalo más grande es que nos acompañes en este día, pero si deseas tener un detalle con nosotros, te compartimos nuestras mesas de regalos oficiales. ¡Gracias por tu cariño y apoyo!:",
    dress: "Código de Vestimenta",
    formal: "Formal",
    whiteRes: "El blanco se reserva para la novia.",
    rsvpTitle: "Confirmación de Asistencia",
    rsvpExcited: "Estamos emocionados de verte en nuestra boda.",
    rsvpUnderstand: "Entendemos si por algún motivo no pudieras acompañarnos. Te pedimos por favor que nos confirmes tu asistencia lo antes posible.",
    adultsOnly: "Evento solo para adultos",
    relax: "Queremos que se relajen y disfruten de la fiesta al máximo.",
    reserved1: "Hemos reservado",
    reserved2: "para ti",
    pass: "pase",
    passes: "pases",
    howMany: "¿Cuántos pases confirmas?",
    maxOf: "de un máximo de",
    questAccepted: "✨ ¡Misión Aceptada! Confirmaste",
    missYou: "Lamentamos que no puedas asistir. ¡Te extrañaremos!",
    confirmBtn: "Confirmar",
    confirmingBtn: "Confirmando...",
    declineBtn: "No podré asistir",
    melodiesTitle: "Melodías para la fiesta",
    melodiesDesc: "¿Qué canciones no pueden faltar en la pista? (Máximo 3 canciones por invitación)",
    suggestions: "Tus sugerencias enviadas:",
    of: "de",
    completedSongs: "✨ ¡Has completado tus 3 sugerencias musicales! Gracias por ayudarnos a armar la playlist.",
    searchPlaceholder: "Busca una canción o escribe su nombre...",
    searching: "Buscando...",
    addMelody: "Agregar Melodía",
    saving: "Guardando...",
    remove: "Eliminar",
    alerts: {
      confirmSuccess: "¡Gracias por confirmar tu asistencia con",
      confirmError: "Hubo un error al confirmar. Inténtalo de nuevo.",
      declineSure: "¿Estás seguro de que no podrás acompañarnos?",
      declineSuccess: "Lamentamos que no puedas acompañarnos. ¡Gracias por avisarnos!",
      limitReached: "Has alcanzado el límite máximo de 3 melodías sugeridas.",
      searchFirst: "Busca o escribe una canción primero.",
      songError: "Error al enviar la sugerencia. Verifica tu conexión.",
      songDelConfirm: "¿Estás seguro de que quieres eliminar esta canción de tus sugerencias?",
      songDelError: "Error al eliminar la canción. Inténtalo de nuevo."
    }
  },
  en: {
    loading: "Loading...",
    notFound: "Invitation not found.",
    navHint: "Tap to open",
    intro1: "You are cordially invited to celebrate our wedding",
    intro2: "\"It's dangerous to go alone! Will you join us?\"",
    timeRem: "Time remaining:",
    days: "Days", hrs: "Hrs", min: "Min", sec: "Sec",
    us: "Our Story",
    dateLoc: "Time & Location",
    eventDay: "Event Day",
    date: "Friday, December 18, 2026",
    reception: "Reception",
    endTime: "(The event concludes at 10:30 PM)",
    location: "Location",
    hall: "Event Hall \"Gran Jardin\"",
    address: "Adolfo López Mateos 203, Trojes de San Cristóbal",
    mapBtn: "View on Map",
    addCalBtn: "Add to Google Calendar",
    gifts: "Gift Registry",
    giftsText: "Your presence is our biggest gift, but if you wish to give us something, here are our official gift registries. Thank you for your love and support!:",
    dress: "Dress Code",
    formal: "Formal",
    whiteRes: "White is reserved for the bride.",
    rsvpTitle: "RSVP",
    rsvpExcited: "We are so excited to see you at our wedding.",
    rsvpUnderstand: "We understand if you cannot make it. Please let us know as soon as possible.",
    adultsOnly: "Adults Only",
    relax: "We want everyone to relax and enjoy the party to the fullest.",
    reserved1: "We have reserved",
    reserved2: "for you",
    pass: "pass",
    passes: "passes",
    howMany: "How many passes are you confirming?",
    maxOf: "out of a maximum of",
    questAccepted: "✨ Quest Accepted! You confirmed",
    missYou: "We are sorry you can't attend. We will miss you!",
    confirmBtn: "Confirm",
    confirmingBtn: "Confirming...",
    declineBtn: "I won't be able to attend",
    melodiesTitle: "Party Playlist",
    melodiesDesc: "What songs are a must on the dance floor? (Max 3 songs per invitation)",
    suggestions: "Your submitted suggestions:",
    of: "of",
    completedSongs: "✨ You've completed your 3 song suggestions! Thank you for helping us build the playlist.",
    searchPlaceholder: "Search for a song or type its name...",
    searching: "Searching...",
    addMelody: "Add Melody",
    saving: "Saving...",
    remove: "Remove",
    alerts: {
      confirmSuccess: "Thank you for confirming your attendance with",
      confirmError: "There was an error confirming. Please try again.",
      declineSure: "Are you sure you won't be able to join us?",
      declineSuccess: "We are sorry you can't join us. Thanks for letting us know!",
      limitReached: "You have reached the maximum limit of 3 suggested melodies.",
      searchFirst: "Search or type a song first.",
      songError: "Error sending the suggestion. Check your connection.",
      songDelConfirm: "Are you sure you want to remove this song from your suggestions?",
      songDelError: "Error removing the song. Please try again."
    }
  }
};

export default function InvitacionZelda() {
  const params = useParams();
  const id = params.id as string;

  // Estado del Idioma
  const [lang, setLang] = useState<'es' | 'en'>('es');
  const t = i18n[lang];

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

  const [boletosSeleccionados, setBoletosSeleccionados] = useState<number>(1);
  const [guardandoConfirmacion, setGuardandoConfirmacion] = useState(false);

  const [queryMusica, setQueryMusica] = useState('');
  const [resultadosiTunes, setResultadosiTunes] = useState<iTunesTrack[]>([]);
  const [buscandoiTunes, setBuscandoiTunes] = useState(false);
  const [cancionSeleccionada, setCancionSeleccionada] = useState<iTunesTrack | null>(null);
  const [previewSonando, setPreviewSonando] = useState(false);
  const [enviandoCancion, setEnviandoCancion] = useState(false);
  const [cancionesSugeridas, setCancionesSugeridas] = useState<CancionSugerida[]>([]);

  const [fotoIndex, setFotoIndex] = useState(0);
  const fotos = ['/foto1.jpeg', '/foto2.jpeg', '/foto3.jpeg', '/foto4.jpeg', '/foto5.jpeg'];

  const [faltan, setFaltan] = useState({ dias: 0, horas: 0, minutos: 0, segundos: 0 });

  useEffect(() => {
    if (id) {
      obtenerInvitado();
      cargarCancionesPrevias();
    }
  }, [id]);

  useEffect(() => {
    const fechaBoda = new Date(2026, 11, 18, 18, 0, 0).getTime();

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
          minutos: Math.floor((distancia % (1000 * 60 * 60)) / (1000 * 60)),
          segundos: Math.floor((distancia % (1000 * 60)) / 1000),
        });
      }
    }, 1000);

    return () => clearInterval(intervalo);
  }, []);

  // Búsqueda en iTunes
  useEffect(() => {
    if (queryMusica.trim().length < 2) {
      setResultadosiTunes([]);
      setBuscandoiTunes(false);
      return;
    }

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
      setErrorInfo('error');
    } else {
      setInvitado(data);
      const asignados = Number(data.boletos_asignados) || 1;
      const aceptados = Number(data.boletos_aceptados) || asignados;
      setBoletosSeleccionados(aceptados > 0 ? aceptados : 1);
    }
    setCargando(false);
  };

  const cargarCancionesPrevias = async () => {
    const { data } = await supabase
      .from('canciones')
      .select('id, titulo, artista')
      .eq('invitado_id', id)
      .order('id', { ascending: true });

    if (data) {
      setCancionesSugeridas(data);
    }
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
      alert(`${t.alerts.confirmSuccess} ${boletosSeleccionados} ${boletosSeleccionados === 1 ? t.pass : t.passes}!`);
      obtenerInvitado();
    } else {
      alert(t.alerts.confirmError);
    }
    setGuardandoConfirmacion(false);
  };

  const rechazarAsistencia = async () => {
    const seguro = window.confirm(t.alerts.declineSure);
    if (seguro) {
      const { error } = await supabase
        .from('invitados')
        .update({
          estado: 'rechazado',
          boletos_aceptados: 0
        })
        .eq('id', id);

      if (!error) {
        alert(t.alerts.declineSuccess);
        obtenerInvitado();
      }
    }
  };

  const irAGoogleCalendar = () => {
    const link = typeof window !== 'undefined' ? window.location.href : '';
    const googleUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent("Boda de Melanie & Alberto 🤵👰 Boda")}&dates=20261218T180000/20261218T223000&details=${encodeURIComponent("Estás cordialmente invitado a celebrar nuestra boda.\n\nPor favor, no olvides confirmar o declinar tu asistencia en la invitación digital:\n" + link)}&location=${encodeURIComponent('Salon de eventos "Gran Jardin", Adolfo López Mateos 203, Trojes de San Cristóbal')}`;
    window.open(googleUrl, '_blank');
  };

  const togglePreview = (url?: string) => {
    if (!url || !previewAudioRef.current) return;

    if (previewSonando && previewAudioRef.current.src === url) {
      previewAudioRef.current.pause();
      setPreviewSonando(false);
    } else {
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
    if (cancionesSugeridas.length >= 3) {
      return alert(t.alerts.limitReached);
    }
    if (!queryMusica.trim()) return alert(t.alerts.searchFirst);
    setEnviandoCancion(true);

    const tituloAEnviar = cancionSeleccionada ? cancionSeleccionada.trackName : queryMusica;
    const artistaAEnviar = cancionSeleccionada ? cancionSeleccionada.artistName : 'Varios / No especificado';

    const { error } = await supabase.from('canciones').insert([
      {
        titulo: tituloAEnviar,
        artista: artistaAEnviar,
        invitado_id: id
      }
    ]);

    if (!error) {
      await cargarCancionesPrevias();
      setCancionSeleccionada(null);
      setQueryMusica('');
      if (previewAudioRef.current) {
        previewAudioRef.current.pause();
        setPreviewSonando(false);
      }
      if (audioRef.current) audioRef.current.volume = 0.5;
    } else {
      alert(t.alerts.songError);
    }
    setEnviandoCancion(false);
  };

  const eliminarCancion = async (cancionId?: string) => {
    if (!cancionId) return;
    const seguro = window.confirm(t.alerts.songDelConfirm);
    if (!seguro) return;

    const { error } = await supabase
      .from('canciones')
      .delete()
      .eq('id', cancionId);

    if (!error) {
      setCancionesSugeridas(prev => prev.filter(c => c.id !== cancionId));
    } else {
      alert(t.alerts.songDelError);
    }
  };

  const siguienteFoto = () => setFotoIndex((prev) => (prev === fotos.length - 1 ? 0 : prev + 1));
  const fotoAnterior = () => setFotoIndex((prev) => (prev === 0 ? fotos.length - 1 : prev - 1));

  if (cargando) return <div className="min-h-screen flex items-center justify-center text-white bg-black">{t.loading}</div>;
  if (errorInfo) return <div className="min-h-screen flex items-center justify-center text-white bg-black">{t.notFound}</div>;

  const totalAsignados = Number(invitado?.boletos_asignados) || 1;

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center overflow-hidden relative">
      
      {/* Botón Flotante para cambiar idioma */}
      <div className="fixed top-4 right-4 z-50 flex gap-1 bg-[#1f4027]/90 p-1 rounded-full backdrop-blur-md border border-[#c5a059] shadow-[0_0_15px_rgba(197,160,89,0.4)]">
        <button 
          onClick={() => setLang('es')}
          className={`w-9 h-9 rounded-full text-xs font-bold transition-all duration-300 ${lang === 'es' ? 'bg-[#c5a059] text-[#1f4027] shadow-inner scale-105' : 'text-[#c5a059] hover:bg-[#c5a059]/20'}`}
        >
          ES
        </button>
        <button 
          onClick={() => setLang('en')}
          className={`w-9 h-9 rounded-full text-xs font-bold transition-all duration-300 ${lang === 'en' ? 'bg-[#c5a059] text-[#1f4027] shadow-inner scale-105' : 'text-[#c5a059] hover:bg-[#c5a059]/20'}`}
        >
          EN
        </button>
      </div>

      <style>{`
        *:focus, *:focus-visible, *:active {
          outline: none !important;
          -webkit-tap-highlight-color: transparent !important;
          box-shadow: none !important;
        }
      `}</style>

      <audio ref={audioRef} src="/musica.mp3" loop />
      <audio ref={naviAudioRef} src="/navi.mp3" preload="auto" />
      <audio
        ref={previewAudioRef}
        onEnded={() => {
          setPreviewSonando(false);
          if (audioRef.current) audioRef.current.volume = 0.5;
        }}
      />

      {/* VISTA 1: SOBRE CERRADO */}
      {!sobreAbierto && (
        <div
          onClick={tocarNavi}
          className={`cursor-pointer transition-all duration-700 transform flex flex-col items-center justify-center relative w-full h-full min-h-screen
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

            <div className="absolute top-[100px] sm:top-[120px] left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 flex flex-col items-center pointer-events-none">
              <div
                className={`transition-all duration-700 ease-in-out flex flex-col items-center
                  ${naviVolando ? '-translate-y-[60vh] translate-x-[20vw] scale-50 opacity-0' : 'animate-bounce hover:scale-110'}
                `}
              >
                <div className="relative">
                  <div className="absolute inset-0 bg-blue-400 rounded-full blur-xl opacity-60 animate-pulse"></div>
                  <img src="/navi.png" alt={t.navHint} className="w-16 h-16 sm:w-20 sm:h-20 relative z-10 drop-shadow-[0_0_15px_rgba(255,255,255,0.8)]" />
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
              <p className="text-base sm:text-lg mb-1 font-semibold">{t.intro1}</p>
              <p className="text-base sm:text-lg font-bold text-[#8C6D46]">{t.intro2}</p>
            </div>

            <hr className="border-[#8C6D46] border-t-2 w-1/2 opacity-50 my-1" />

            {/* 2. CONTADOR */}
            <div className="flex flex-col items-center justify-center w-full -mt-1">
              <h2 className="text-3xl sm:text-4xl text-[#1f4027] mb-3 drop-shadow-sm text-center" style={{ fontFamily: "'Zelda', sans-serif" }}>{t.timeRem}</h2>
              
              <div className="flex justify-center gap-4 sm:gap-6 text-center w-full">
                <div className="flex flex-col items-center">
                  <span className="text-4xl sm:text-5xl text-[#1f4027] drop-shadow-sm" style={{ fontFamily: "'Zelda', sans-serif" }}>{faltan.dias}</span>
                  <span className="text-xs uppercase tracking-widest text-[#8C6D46] font-bold mt-1">{t.days}</span>
                </div>
                <span className="text-3xl text-[#8C6D46] mt-2">:</span>
                <div className="flex flex-col items-center">
                  <span className="text-4xl sm:text-5xl text-[#1f4027] drop-shadow-sm" style={{ fontFamily: "'Zelda', sans-serif" }}>{faltan.horas}</span>
                  <span className="text-xs uppercase tracking-widest text-[#8C6D46] font-bold mt-1">{t.hrs}</span>
                </div>
                <span className="text-3xl text-[#8C6D46] mt-2">:</span>
                <div className="flex flex-col items-center">
                  <span className="text-4xl sm:text-5xl text-[#1f4027] drop-shadow-sm" style={{ fontFamily: "'Zelda', sans-serif" }}>{faltan.minutos}</span>
                  <span className="text-xs uppercase tracking-widest text-[#8C6D46] font-bold mt-1">{t.min}</span>
                </div>
                <span className="text-3xl text-[#8C6D46] mt-2">:</span>
                <div className="flex flex-col items-center">
                  <span className="text-4xl sm:text-5xl text-[#1f4027] drop-shadow-sm" style={{ fontFamily: "'Zelda', sans-serif" }}>{faltan.segundos}</span>
                  <span className="text-xs uppercase tracking-widest text-[#8C6D46] font-bold mt-1">{t.sec}</span>
                </div>
              </div>
            </div>

            {/* 3. CARRUSEL (AHORA ABAJO DEL CONTADOR) */}
            <div className="w-full flex flex-col items-center pt-2">
              <h2 className="text-4xl sm:text-5xl text-[#1f4027] mb-6 drop-shadow-sm" style={{ fontFamily: "'Zelda', sans-serif" }}>{t.us}</h2>
              
              <div className="relative w-64 h-80 sm:w-72 sm:h-96 group">
                <div className="absolute inset-0 bg-[#f8f5eb] p-3 sm:p-4 shadow-[0_15px_35px_rgba(0,0,0,0.4)] border border-[#d2bfa1] transform -rotate-2 transition-transform duration-500 hover:rotate-0">
                  <div className="w-full h-full border-2 border-[#8C6D46] relative overflow-hidden bg-gray-200">
                    <img src={fotos[fotoIndex]} alt={`Momento ${fotoIndex + 1}`} className="w-full h-full object-cover transition-opacity duration-500" />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={fotoAnterior}
                  aria-label="Anterior"
                  style={{ outline: 'none', WebkitTapHighlightColor: 'transparent' }}
                  className="absolute -left-7 sm:-left-9 top-1/2 -translate-y-1/2 text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.85)] hover:scale-125 transition-transform z-20 text-3xl sm:text-4xl font-bold bg-transparent border-none outline-none focus:outline-none focus:ring-0 p-1"
                >
                  &#10094;
                </button>
                <button
                  type="button"
                  onClick={siguienteFoto}
                  aria-label="Siguiente"
                  style={{ outline: 'none', WebkitTapHighlightColor: 'transparent' }}
                  className="absolute -right-7 sm:-right-9 top-1/2 -translate-y-1/2 text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.85)] hover:scale-125 transition-transform z-20 text-3xl sm:text-4xl font-bold bg-transparent border-none outline-none focus:outline-none focus:ring-0 p-1"
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

            {/* 4. FECHA Y LUGAR + MAPA Y CALENDARIO */}
            <div className="w-full bg-[#f4e8c1]/90 p-6 sm:p-8 border-2 border-[#8C6D46] shadow-[0_0_15px_rgba(0,0,0,0.1)] text-center relative z-10 backdrop-blur-sm">
              <h2 className="text-4xl sm:text-5xl text-[#1f4027] mb-8 drop-shadow-sm" style={{ fontFamily: "'Zelda', sans-serif" }}>{t.dateLoc}</h2>
              
              <div className="flex flex-col gap-5 text-lg text-[#4A3B2C] mb-6">
                <div className="flex flex-col items-center justify-center">
                  <span className="text-sm uppercase tracking-widest text-[#8C6D46] font-bold mb-1">{t.eventDay}</span>
                  <p className="font-semibold text-xl">{t.date}</p>
                </div>
                <div className="flex flex-col items-center justify-center">
                  <span className="text-sm uppercase tracking-widest text-[#8C6D46] font-bold mb-1">{t.reception}</span>
                  <p className="font-semibold text-xl">18:00 hrs</p>
                  <p className="text-sm text-[#8C6D46] italic font-medium mt-0.5">{t.endTime}</p>
                </div>
                <div className="flex flex-col items-center justify-center mt-1">
                  <span className="text-sm uppercase tracking-widest text-[#8C6D46] font-bold mb-1">{t.location}</span>
                  <p className="font-bold text-2xl text-[#1f4027]">{t.hall}</p>
                  <p className="text-base mt-1">{t.address}</p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                <a
                  href="https://maps.app.goo.gl/DpDwAydRXVEvvoUw5"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block bg-[#1f4027] text-[#f4e8c1] px-6 py-3 font-bold text-lg uppercase tracking-wider hover:bg-[#2d5c38] transition shadow-[4px_4px_0px_0px_rgba(140,109,70,1)] border border-[#8C6D46] w-full sm:w-auto text-center"
                >
                  {t.mapBtn}
                </a>

                {/* Botón único de Google Calendar */}
                <button
                  onClick={irAGoogleCalendar}
                  className="bg-[#8C6D46] text-[#f4e8c1] px-6 py-3 font-bold text-lg uppercase tracking-wider hover:bg-[#6b5233] transition shadow-[4px_4px_0px_0px_rgba(31,64,39,1)] border border-[#1f4027] w-full sm:w-auto flex items-center justify-center gap-2"
                >
                   {t.addCalBtn}
                </button>
              </div>
            </div>

            {/* 5. CONFIRMACIÓN DE ASISTENCIA */}
            <div className="w-full bg-[#f4e8c1]/90 p-6 sm:p-8 border-2 border-[#8C6D46] shadow-[0_0_15px_rgba(0,0,0,0.1)] text-center relative z-10 backdrop-blur-sm">
              <h2 className="text-4xl sm:text-5xl text-[#1f4027] mb-4 drop-shadow-sm leading-tight" style={{ fontFamily: "'Zelda', sans-serif" }}>
                {t.rsvpTitle}
              </h2>
              
              <p className="text-lg text-[#4A3B2C] font-semibold mb-1">{t.rsvpExcited}</p>
              <p className="text-base text-[#4A3B2C] mb-4">{t.rsvpUnderstand}</p>

              <div className="my-4 py-3 border-y-2 border-[#8C6D46]/40 bg-[#e8dcc4]/50">
                <p className="text-3xl sm:text-4xl text-[#1f4027] drop-shadow-sm" style={{ fontFamily: "'Zelda', sans-serif" }}>
                  {t.adultsOnly}
                </p>
                <p className="text-sm text-[#4A3B2C] mt-1 font-semibold">{t.relax}</p>
              </div>
              
              <p className="text-lg font-semibold mb-3">
                {t.reserved1} <strong className="text-2xl text-[#8C6D46]">{totalAsignados}</strong> {totalAsignados === 1 ? t.pass : t.passes} {t.reserved2}, {invitado?.nombre}.
              </p>

              {invitado?.estado !== 'confirmado' && invitado?.estado !== 'rechazado' && totalAsignados > 1 && (
                <div className="mb-5 flex flex-col items-center">
                  <label className="text-sm font-bold text-[#8C6D46] uppercase tracking-wider mb-2">
                    {t.howMany}
                  </label>
                  <div className="flex items-center gap-4 bg-white/70 px-4 py-2 rounded-xl border border-[#8C6D46]/40 shadow-sm">
                    <button
                      type="button"
                      onClick={() => setBoletosSeleccionados(prev => Math.max(1, prev - 1))}
                      style={{ outline: 'none', WebkitTapHighlightColor: 'transparent' }}
                      className="w-8 h-8 rounded-full bg-[#1f4027] text-white font-bold flex items-center justify-center hover:bg-[#2d5c38] transition active:scale-95 border-none outline-none focus:outline-none focus:ring-0"
                    >
                      -
                    </button>
                    <span className="text-2xl font-bold text-[#1f4027] min-w-[2rem] text-center" style={{ fontFamily: "'Zelda', sans-serif" }}>
                      {boletosSeleccionados}
                    </span>
                    <button
                      type="button"
                      onClick={() => setBoletosSeleccionados(prev => Math.min(totalAsignados, prev + 1))}
                      style={{ outline: 'none', WebkitTapHighlightColor: 'transparent' }}
                      className="w-8 h-8 rounded-full bg-[#1f4027] text-white font-bold flex items-center justify-center hover:bg-[#2d5c38] transition active:scale-95 border-none outline-none focus:outline-none focus:ring-0"
                    >
                      +
                    </button>
                  </div>
                  <span className="text-xs text-[#8C6D46] mt-1.5 italic">
                    {t.maxOf} {totalAsignados} {totalAsignados === 1 ? t.pass : t.passes}
                  </span>
                </div>
              )}
              
              <div className="mt-4 flex flex-col sm:flex-row gap-4 justify-center items-center">
                {invitado?.estado === 'confirmado' ? (
                  <div className="bg-[#2d5c38] text-[#f4e8c1] p-4 border border-[#c5a059] w-full">
                    <p className="font-bold italic text-xl drop-shadow-sm text-center">
                      {t.questAccepted} {invitado.boletos_aceptados || totalAsignados} { (invitado.boletos_aceptados || totalAsignados) === 1 ? t.pass : t.passes}.
                    </p>
                  </div>
                ) : invitado?.estado === 'rechazado' ? (
                  <div className="bg-[#4A3B2C] text-[#f4e8c1] p-4 border border-[#c5a059] w-full">
                    <p className="font-bold italic text-xl drop-shadow-sm text-center">{t.missYou}</p>
                  </div>
                ) : (
                  <>
                    <button
                      onClick={confirmarAsistencia}
                      disabled={guardandoConfirmacion}
                      style={{ outline: 'none', WebkitTapHighlightColor: 'transparent' }}
                      className="bg-[#2d5c38] text-[#f4e8c1] px-6 py-4 font-bold text-lg uppercase tracking-widest hover:bg-[#1f4027] transition shadow-[4px_4px_0px_0px_rgba(74,59,44,0.8)] border border-[#c5a059] w-full sm:w-auto disabled:opacity-50"
                    >
                      {guardandoConfirmacion ? t.confirmingBtn : `${t.confirmBtn} (${boletosSeleccionados} ${boletosSeleccionados === 1 ? t.pass : t.passes})`}
                    </button>
                    <button
                      onClick={rechazarAsistencia}
                      style={{ outline: 'none', WebkitTapHighlightColor: 'transparent' }}
                      className="bg-[#8C6D46] text-[#f4e8c1] px-6 py-4 font-bold text-lg uppercase tracking-widest hover:bg-[#6b5233] transition shadow-[4px_4px_0px_0px_rgba(74,59,44,0.8)] border border-[#4A3B2C] w-full sm:w-auto"
                    >
                      {t.declineBtn}
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* 6. MELODÍAS (MÁXIMO 3) */}
            <div className="w-full bg-[#e8dcc4]/80 p-6 border border-[#c5a059] shadow-[0_0_15px_rgba(197,160,89,0.2)] mb-8 backdrop-blur-sm text-center">
              <h3 className="text-3xl sm:text-4xl mb-2 text-[#8C6D46] drop-shadow-sm" style={{ fontFamily: "'Zelda', sans-serif" }}>
                {t.melodiesTitle}
              </h3>
              <p className="text-sm text-[#4A3B2C] mb-4 font-semibold">
                {t.melodiesDesc}
              </p>

              {/* Lista de canciones ya sugeridas con opción de borrar */}
              {cancionesSugeridas.length > 0 && (
                <div className="max-w-sm mx-auto mb-4 text-left">
                  <p className="text-xs font-bold uppercase tracking-wider text-[#1f4027] mb-2 flex items-center justify-between">
                    <span>{t.suggestions}</span>
                    <span className="text-[#8C6D46]">{cancionesSugeridas.length} {t.of} 3</span>
                  </p>
                  <div className="flex flex-col gap-1.5 max-h-36 overflow-y-auto pr-1">
                    {cancionesSugeridas.map((item, idx) => (
                      <div
                        key={item.id || idx}
                        className="bg-[#f8f5eb]/90 pl-3 pr-2 py-1.5 rounded-lg border border-[#c5a059]/60 flex items-center justify-between text-xs group"
                      >
                        <div className="flex items-center gap-2 mr-2 overflow-hidden">
                          <span className="font-semibold text-[#1f4027] truncate">
                            🎵 {item.titulo}
                          </span>
                          <span className="text-[#8C6D46] text-[11px] truncate flex-shrink-0">
                            {item.artista}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => eliminarCancion(item.id)}
                          className="text-[#8C6D46] hover:text-red-700 transition-colors p-1 flex-shrink-0 border-none outline-none focus:outline-none"
                          title={t.remove}
                        >
                          <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                             <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Formulario de búsqueda */}
              {cancionesSugeridas.length >= 3 ? (
                <div className="bg-[#2d5c38]/10 border border-[#2d5c38]/30 rounded-xl p-3 max-w-sm mx-auto">
                  <p className="text-xs font-bold text-[#1f4027]">
                    {t.completedSongs}
                  </p>
                </div>
              ) : (
                <div className="relative max-w-sm mx-auto flex flex-col gap-3">
                  <div className="relative w-full">
                    <input
                      type="text"
                      placeholder={t.searchPlaceholder}
                      value={queryMusica}
                      onChange={(e) => {
                        setQueryMusica(e.target.value);
                        if (cancionSeleccionada) setCancionSeleccionada(null);
                      }}
                      className="w-full bg-[#f4e8c1]/90 border-2 border-[#8C6D46] rounded-xl px-4 py-2.5 text-sm font-semibold text-[#4A3B2C] placeholder-[#8C6D46]/70 focus:outline-none focus:ring-0 focus:border-[#1f4027]"
                    />
                    {buscandoiTunes && (
                      <span className="absolute right-3 top-3 text-xs text-[#8C6D46] animate-pulse">
                        {t.searching}
                      </span>
                    )}
                  </div>

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
                              className="w-8 h-8 rounded-full bg-[#1f4027] text-white flex items-center justify-center hover:bg-[#2d5c38] transition flex-shrink-0 border-none outline-none focus:outline-none focus:ring-0 active:scale-95"
                              title="Play"
                            >
                              {previewSonando && previewAudioRef.current?.src === track.previewUrl ? (
                                <svg className="w-3.5 h-3.5 fill-white" viewBox="0 0 24 24">
                                  <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                                </svg>
                              ) : (
                                <svg className="w-3.5 h-3.5 fill-white ml-0.5" viewBox="0 0 24 24">
                                  <path d="M8 5v14l11-7z" />
                                </svg>
                              )}
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {cancionSeleccionada && (
                    <div className="flex items-center gap-3 bg-[#f8f5eb] p-2.5 rounded-xl border border-[#c5a059] shadow-sm text-left">
                      <img
                        src={cancionSeleccionada.artworkUrl100}
                        alt={cancionSeleccionada.trackName}
                        className="w-12 h-12 rounded-lg object-cover shadow flex-shrink-0"
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
                          className="w-8 h-8 rounded-full bg-[#8C6D46] text-white flex items-center justify-center hover:bg-[#1f4027] transition flex-shrink-0 border-none outline-none focus:outline-none focus:ring-0 active:scale-95"
                          title="Play/Pause"
                        >
                          {previewSonando ? (
                            <svg className="w-3.5 h-3.5 fill-white" viewBox="0 0 24 24">
                              <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                            </svg>
                          ) : (
                            <svg className="w-3.5 h-3.5 fill-white ml-0.5" viewBox="0 0 24 24">
                              <path d="M8 5v14l11-7z" />
                            </svg>
                          )}
                        </button>
                      )}
                    </div>
                  )}

                  <button
                    onClick={enviarCancion}
                    disabled={enviandoCancion || !queryMusica.trim() || cancionesSugeridas.length >= 3}
                    className="flex items-center justify-center gap-2 bg-[#2d5c38] text-[#f4e8c1] px-6 py-3 font-bold text-sm uppercase tracking-widest hover:bg-[#1f4027] transition shadow-[3px_3px_0px_0px_rgba(74,59,44,0.8)] border border-[#c5a059] rounded-xl mt-1 w-full disabled:opacity-50 border-none outline-none focus:outline-none focus:ring-0"
                  >
                    {enviandoCancion ? t.saving : (
                      <>
                        {t.addMelody} ({cancionesSugeridas.length}/3) <span className="text-base leading-none">♫</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>

            <hr className="border-[#8C6D46] border-t-2 w-1/2 opacity-50 my-1" />

            {/* 7. MESA DE REGALOS */}
            <div className="w-full text-center my-2">
              <h2 className="text-4xl sm:text-5xl text-[#1f4027] mb-4 drop-shadow-sm" style={{ fontFamily: "'Zelda', sans-serif" }}>{t.gifts}</h2>
              
              <p className="text-base text-[#4A3B2C] mb-4 px-4">
                {t.giftsText}
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

            {/* 8. CÓDIGO DE VESTIMENTA */}
            <div className="w-full text-center my-2">
              <h2 className="text-4xl sm:text-5xl mb-4 text-[#1f4027] drop-shadow-sm" style={{ fontFamily: "'Zelda', sans-serif" }}>{t.dress}</h2>
              <p className="text-2xl font-bold text-[#8C6D46] uppercase tracking-widest mb-1">{t.formal}</p>
              <p className="text-[#4A3B2C] text-lg font-semibold">{t.whiteRes}</p>
              
              <img src="/vestimenta.png" alt="Código de Vestimenta" className="w-24 sm:w-32 h-auto mx-auto mt-4 drop-shadow-md" />
            </div>

          </div>
        </div>
      )}
    </div>
  );
}