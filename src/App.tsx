import React, { useState, useEffect, useRef } from 'react';
import * as Lucide from 'lucide-react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

// Declaração global para a API SpeechRecognition para TypeScript
declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition;
    webkitSpeechRecognition: typeof SpeechRecognition;
  }
}

function App() {
  const [text, setText] = useState('');
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null);
  const [rate, setRate] = useState(1);
  const [isPlaying, setIsPlaying] = useState(false);

  // Estados e refs para reconhecimento de fala
  const [isListening, setIsListening] = useState(false); // True if recognition is actively running
  const [isRecognitionPaused, setIsRecognitionPaused] = useState(false); // True if recognition was paused by user
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const finalTranscriptRef = useRef(''); // Para acumular o texto final reconhecido
  const manualStopRecognitionRef = useRef(false); // Para diferenciar entre parada manual e parada automática

  // Refs para garantir que os handlers de reconhecimento de fala acessem os estados mais recentes
  const isListeningRef = useRef(isListening);
  const isRecognitionPausedRef = useRef(isRecognitionPaused);

  // Estados e refs para o cronômetro de gravação
  const [recordingTime, setRecordingTime] = useState(0); // Tempo em segundos
  const timerIntervalRef = useRef<number | null>(null);
  const lastTickTimeRef = useRef<number>(0); // Para armazenar o timestamp do último tick do intervalo

  // Atualiza os refs sempre que os estados correspondentes mudam
  useEffect(() => {
    isListeningRef.current = isListening;
  }, [isListening]);

  useEffect(() => {
    isRecognitionPausedRef.current = isRecognitionPaused;
  }, [isRecognitionPaused]);

  // Função auxiliar para formatar o texto com nova linha após cada ponto final
  const formatTextWithNewlines = (rawText: string): string => {
    // Substitui um ponto final que NÃO é seguido por uma nova linha, por um ponto final e uma nova linha.
    // Isso garante que não adicionamos novas linhas extras se já houver uma.
    return rawText.replace(/(\.)(?!\n)/g, '$1\n');
  };

  // Funções do Cronômetro
  const startTimer = () => {
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current); // Limpa qualquer timer existente

    lastTickTimeRef.current = Date.now(); // Define o tempo de início para este segmento
    timerIntervalRef.current = window.setInterval(() => {
      const now = Date.now();
      const delta = now - lastTickTimeRef.current; // Tempo decorrido desde o último tick
      setRecordingTime(prevTime => prevTime + delta / 1000); // Adiciona o delta em segundos
      lastTickTimeRef.current = now; // Atualiza o tempo do último tick
    }, 1000); // Atualiza a cada segundo
  };

  const pauseTimer = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
      // Captura o tempo atual para garantir precisão ao pausar
      const now = Date.now();
      const delta = now - lastTickTimeRef.current;
      setRecordingTime(prevTime => prevTime + delta / 1000);
    }
  };

  const stopTimer = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    setRecordingTime(0);
    lastTickTimeRef.current = 0;
  };

  // Função auxiliar para formatar o tempo (MM:SS)
  const formatTime = (totalSeconds: number) => {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = Math.floor(totalSeconds % 60);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    const populateVoices = () => {
      const availableVoices = window.speechSynthesis.getVoices();
      // Filtrar apenas vozes em Português do Brasil
      const portugueseBrazilVoices = availableVoices.filter(voice => voice.lang === 'pt-BR');
      setVoices(portugueseBrazilVoices);
    };

    populateVoices();
    window.speechSynthesis.onvoiceschanged = populateVoices;

    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, []);

  useEffect(() => {
    if (voices.length > 0) {
      // Tenta selecionar uma voz do Google português do Brasil, caso contrário, a primeira disponível
      const googlePortugueseVoice = voices.find((voice) => voice.name.includes('Google português do Brasil'));
      if (googlePortugueseVoice) {
        setSelectedVoice(googlePortugueseVoice);
      } else {
        setSelectedVoice(voices[0]); // Seleciona a primeira voz pt-BR disponível
      }
    }
  }, [voices]);

  // Lógica de Reconhecimento de Fala (inicializada apenas uma vez)
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      console.warn('A API de Reconhecimento de Fala não é suportada neste navegador.');
      alert('Seu navegador não suporta a API de Reconhecimento de Fala.');
      return;
    }

    // Inicializa o reconhecimento apenas uma vez
    if (!recognitionRef.current) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true; // Continua escutando
      recognition.interimResults = true; // Fornece resultados provisórios em tempo real
      recognition.lang = 'pt-BR'; // Define o idioma para Português do Brasil
      recognitionRef.current = recognition;

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let interimTranscript = '';
        let currentFinalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            currentFinalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }

        // Acumula o texto final reconhecido, aplicando a formatação
        finalTranscriptRef.current += formatTextWithNewlines(currentFinalTranscript);

        // Atualiza o estado do texto com o texto final acumulado + o texto provisório atual
        // Aplica a formatação ao texto completo para exibição
        setText(formatTextWithNewlines(finalTranscriptRef.current + interimTranscript));
      };

      recognition.onend = () => {
        // Se o reconhecimento parou, mas não foi uma parada manual, reinicie-o
        // Isso lida com a parada automática do navegador após o silêncio
        if (isListeningRef.current && !manualStopRecognitionRef.current) {
          console.log('Reconhecimento de fala encerrado automaticamente. Reiniciando...');
          // Adiciona um pequeno atraso antes de reiniciar para evitar loops rápidos
          setTimeout(() => {
            if (recognitionRef.current) { // Garante que o objeto recognition ainda existe
              recognitionRef.current.start();
              setIsListening(true); // Re-define o estado de escuta
              setIsRecognitionPaused(false);
            }
          }, 500); // 500ms de atraso
        } else {
          setIsListening(false);
          setIsRecognitionPaused(false); // Garante que o estado de pausa seja redefinido na parada total
          manualStopRecognitionRef.current = false; // Redefine para a próxima inicialização
          stopTimer(); // Para o cronômetro quando a escuta é encerrada
          console.log('Reconhecimento de fala encerrado.');
        }
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.error('Erro no reconhecimento de fala:', event.error);
        // Se o erro for 'aborted' e a escuta estava ativa e não foi uma parada manual, tente reiniciar.
        // Isso geralmente acontece quando o navegador para de escutar por silêncio ou perda de foco.
        if (event.error === 'aborted' && isListeningRef.current && !manualStopRecognitionRef.current) {
          console.log('Reconhecimento de fala abortado. Tentando reiniciar...');
          // Adiciona um pequeno atraso antes de reiniciar para evitar loops rápidos
          setTimeout(() => {
            if (recognitionRef.current) {
              recognitionRef.current.start();
              setIsListening(true);
              setIsRecognitionPaused(false);
            }
          }, 500);
        } else {
          // Para outros erros ou se foi uma parada manual, apenas pare de escutar
          setIsListening(false);
          setIsRecognitionPaused(false);
          manualStopRecognitionRef.current = false;
          alert(`Erro no reconhecimento de fala: ${event.error}`);
          stopTimer(); // Para o cronômetro em caso de erro
        }
      };
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        recognitionRef.current = null;
      }
      stopTimer(); // Garante que o timer seja parado ao desmontar o componente
    };
  }, []); // Array de dependências vazio para rodar apenas uma vez na montagem

  const handleTextChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    const rawText = event.target.value;
    setText(formatTextWithNewlines(rawText)); // Aplica a formatação ao digitar
    // Se o usuário começar a digitar enquanto a escuta está ativa, pare a escuta
    if (isListening) {
      stopListening(); // Isso irá parar o reconhecimento e o cronômetro
    }
  };

  const handleVoiceChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const voice = voices.find((v) => v.name === event.target.value);
    setSelectedVoice(voice || null);
  };

  const handleRateChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRate(parseFloat(event.target.value));
  };

  const speak = () => {
    if (!text.trim() || !selectedVoice) {
      console.log('Reprodução abortada: Sem texto ou voz selecionada.');
      return;
    }

    // Interrompe qualquer fala em andamento antes de iniciar uma nova
    window.speechSynthesis.cancel();
    setIsPlaying(false); // Garante que o estado de reprodução seja redefinido

    // Pare a escuta se estiver ativa antes de reproduzir
    if (isListening) {
      stopListening(); // Isso irá parar o reconhecimento e o cronômetro
    }

    const synth = window.speechSynthesis;
    const newUtterance = new SpeechSynthesisUtterance(text);
    newUtterance.voice = selectedVoice;
    newUtterance.rate = rate;

    newUtterance.onstart = () => {
      setIsPlaying(true);
      console.log('Reprodução iniciada.');
    };

    newUtterance.onend = () => {
      setIsPlaying(false);
      console.log('Reprodução encerrada.');
    };

    newUtterance.onerror = (event) => {
      setIsPlaying(false);
      console.error('Erro na reprodução de fala:', event);
      // Não exibe alerta para erros de 'interrupted', pois são esperados em certas operações (ex: cancelamento)
      if (event.error !== 'interrupted') {
        alert(`Erro na reprodução de fala: ${event.error}`);
      } else {
        console.warn('Reprodução de fala interrompida (ação esperada).');
      }
    };

    synth.speak(newUtterance);
  };

  const pauseSpeech = () => {
    window.speechSynthesis.pause();
    setIsPlaying(false);
    console.log('Fala pausada.');
  };

  const resumeSpeech = () => {
    window.speechSynthesis.resume();
    setIsPlaying(true);
    console.log('Fala retomada.');
  };

  const stopSpeech = () => {
    window.speechSynthesis.cancel();
    setIsPlaying(false);
    console.log('Fala parada.');
  };

  const saveAsPDF = () => {
    console.log('Tentando salvar como PDF...');
    if (!text.trim()) {
      alert('Não há texto para salvar no PDF.');
      console.log('Texto vazio, PDF não gerado.');
      return;
    }
    try {
      const doc = new jsPDF();
      // Dividir o texto em linhas para melhor formatação no PDF
      const lines = text.split('\n');
      let y = 10; // Posição Y inicial
      const lineHeight = 7; // Altura da linha
      const pageHeight = doc.internal.pageSize.height;

      lines.forEach(line => {
        if (y + lineHeight > pageHeight - 10) { // Se a linha exceder a página, adicione uma nova página
          doc.addPage();
          y = 10; // Reinicia Y para a nova página
        }
        doc.text(line, 10, y);
        y += lineHeight;
      });

      doc.save('texto-para-fala.pdf');
      console.log('PDF gerado e download iniciado.');
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      alert('Ocorreu um erro ao tentar salvar o PDF. Verifique o console do navegador para mais detalhes.');
    }
  };

  const startListening = () => {
    if (!recognitionRef.current) {
      alert('Reconhecimento de fala não disponível neste navegador.');
      return;
    }
    manualStopRecognitionRef.current = false; // Redefine a flag de parada manual
    recognitionRef.current.start();
    setIsListening(true);
    setIsRecognitionPaused(false);
    startTimer(); // Inicia o cronômetro
    console.log('Começou a escutar...');
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      manualStopRecognitionRef.current = true; // Define a flag de parada manual
      recognitionRef.current.stop();
      setIsListening(false);
      setIsRecognitionPaused(false); // Garante que o estado de pausa seja redefinido na parada total
      stopTimer(); // Para o cronômetro
      console.log('Parou de escutar.');
    }
  };

  const pauseListening = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop(); // Parar o reconhecimento efetivamente o pausa
      setIsListening(false); // Define listening como false, mas mantém isRecognitionPaused como true
      setIsRecognitionPaused(true);
      pauseTimer(); // Pausa o cronômetro
      console.log('Escuta pausada.');
    }
  };

  const resumeListening = () => {
    if (recognitionRef.current && isRecognitionPaused) {
      manualStopRecognitionRef.current = false; // Redefine a flag de parada manual
      recognitionRef.current.start();
      setIsListening(true);
      setIsRecognitionPaused(false);
      startTimer(); // Retoma o cronômetro
      console.log('Escuta retomada.');
    }
  };

  const handleClearText = () => {
    setText('');
    finalTranscriptRef.current = '';
    stopTimer(); // Zera e para o cronômetro
    console.log('Texto limpo.');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 to-zinc-800 text-gray-100 flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-3xl mx-auto bg-zinc-900 rounded-2xl shadow-2xl overflow-hidden border border-black-gold-700/30">
        <div className="relative p-6 sm:p-8 lg:p-10">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center mb-4">
              <Lucide.Megaphone size={48} className="text-black-gold-500 mr-4 animate-pulse" />
              <h1 className="text-4xl sm:text-5xl font-extrabold bg-gradient-to-r from-black-gold-400 to-black-gold-600 text-transparent bg-clip-text tracking-tight leading-tight">
                Voice Weaver
              </h1>
            </div>
            <p className="text-black-gold-200 mt-2 text-lg sm:text-xl">
              Transforme seu texto em áudio e sua voz em texto com vozes naturais.
            </p>
          </div>

          {/* Mensagem de recomendação do navegador */}
          <div className="text-center mb-4 p-3 bg-blue-900/30 border border-blue-700/50 rounded-lg">
            <p className="text-blue-300 text-base font-medium">
              <Lucide.Info size={18} className="inline-block mr-2 align-middle" />
              Use o navegador <b className="text-blue-200">Edge</b> para vozes mais naturais!
            </p>
          </div>

          <div className="space-y-6">
            <div>
              <label htmlFor="text-input" className="block text-black-gold-200 text-base font-semibold mb-2">
                Seu Texto:
              </label>
              <textarea
                id="text-input"
                className="w-full rounded-xl border border-zinc-700 bg-zinc-800 text-gray-100 shadow-inner focus:border-black-gold-500 focus:ring-2 focus:ring-black-gold-500 p-4 transition duration-300 ease-in-out text-base resize-y min-h-[120px]"
                rows={6}
                value={text}
                onChange={handleTextChange}
                placeholder="Digite ou cole seu texto aqui, ou clique em 'Iniciar Escuta' para falar..."
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="voice-select" className="block text-black-gold-200 text-base font-semibold mb-2">
                  Voz:
                </label>
                <select
                  id="voice-select"
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-800 text-gray-100 shadow-inner focus:border-black-gold-500 focus:ring-2 focus:ring-black-gold-500 p-4 transition duration-300 ease-in-out text-base appearance-none pr-10"
                  value={selectedVoice ? selectedVoice.name : ''}
                  onChange={handleVoiceChange}
                >
                  {voices.length === 0 && <option>Carregando vozes...</option>}
                  {voices.map((voice) => (
                    <option key={voice.name} value={voice.name}>
                      {voice.name} ({voice.lang})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="rate-slider" className="block text-black-gold-200 text-base font-semibold mb-2">
                  Velocidade:
                </label>
                <input
                  id="rate-slider"
                  type="range"
                  min="0.5"
                  max="2"
                  step="0.1"
                  value={rate}
                  onChange={handleRateChange}
                  className="w-full h-2 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-black-gold-500"
                />
                <span className="text-sm text-gray-400 mt-2 block text-right">
                  Velocidade atual: <b className="text-black-gold-300">{rate.toFixed(1)}x</b>
                </span>
              </div>
            </div>

            {/* Cronômetro de Gravação */}
            {(isListening || isRecognitionPaused) && (
              <div className="text-center text-black-gold-300 text-2xl font-bold mb-4">
                Tempo de Gravação: {formatTime(recordingTime)}
              </div>
            )}

            <div className="flex flex-wrap justify-center gap-4 mt-8">
              {/* Botões de Reconhecimento de Fala */}
              {!isListening && !isRecognitionPaused ? (
                <button
                  onClick={startListening}
                  className="flex items-center px-6 py-3 bg-black-gold-700 text-white rounded-xl shadow-lg hover:bg-black-gold-800 focus:outline-none focus:ring-2 focus:ring-black-gold-500 focus:ring-offset-2 focus:ring-offset-zinc-900 transition duration-300 ease-in-out text-lg font-medium transform hover:scale-105"
                >
                  <Lucide.Mic size={20} className="mr-3" />
                  Iniciar Escuta
                </button>
              ) : isListening && !isRecognitionPaused ? (
                <>
                  <button
                    onClick={pauseListening}
                    className="flex items-center px-6 py-3 bg-black-gold-700 text-white rounded-xl shadow-lg hover:bg-black-gold-800 focus:outline-none focus:ring-2 focus:ring-black-gold-500 focus:ring-offset-2 focus:ring-offset-zinc-900 transition duration-300 ease-in-out text-lg font-medium transform hover:scale-105"
                  >
                    <Lucide.Pause size={20} className="mr-3" />
                    Pausar Escuta
                  </button>
                  <button
                    onClick={stopListening}
                    className="flex items-center px-6 py-3 bg-red-700 text-white rounded-xl shadow-lg hover:bg-red-800 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-zinc-900 transition duration-300 ease-in-out text-lg font-medium transform hover:scale-105"
                  >
                    <Lucide.MicOff size={20} className="mr-3" />
                    Parar Escuta
                  </button>
                </>
              ) : ( // isRecognitionPaused is true
                <>
                  <button
                    onClick={resumeListening}
                    className="flex items-center px-6 py-3 bg-black-gold-700 text-white rounded-xl shadow-lg hover:bg-black-gold-800 focus:outline-none focus:ring-2 focus:ring-black-gold-500 focus:ring-offset-2 focus:ring-offset-zinc-900 transition duration-300 ease-in-out text-lg font-medium transform hover:scale-105"
                  >
                    <Lucide.Play size={20} className="mr-3" />
                    Continuar Escuta
                  </button>
                  <button
                    onClick={stopListening}
                    className="flex items-center px-6 py-3 bg-red-700 text-white rounded-xl shadow-lg hover:bg-red-800 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-zinc-900 transition duration-300 ease-in-out text-lg font-medium transform hover:scale-105"
                  >
                    <Lucide.MicOff size={20} className="mr-3" />
                    Parar Escuta
                  </button>
                </>
              )}

              {/* Botões de Reprodução de Fala */}
              {!isPlaying ? (
                <button
                  onClick={speak}
                  className="flex items-center px-6 py-3 bg-black-gold-700 text-white rounded-xl shadow-lg hover:bg-black-gold-800 focus:outline-none focus:ring-2 focus:ring-black-gold-500 focus:ring-offset-2 focus:ring-offset-zinc-900 transition duration-300 ease-in-out text-lg font-medium transform hover:scale-105"
                >
                  <Lucide.Play size={20} className="mr-3" />
                  Reproduzir
                </button>
              ) : (
                <>
                  <button
                    onClick={pauseSpeech}
                    className="flex items-center px-6 py-3 bg-black-gold-700 text-white rounded-xl shadow-lg hover:bg-black-gold-800 focus:outline-none focus:ring-2 focus:ring-black-gold-500 focus:ring-offset-2 focus:ring-offset-zinc-900 transition duration-300 ease-in-out text-lg font-medium transform hover:scale-105"
                  >
                    <Lucide.Pause size={20} className="mr-3" />
                    Pausar
                  </button>
                  <button
                    onClick={resumeSpeech}
                    className="flex items-center px-6 py-3 bg-black-gold-700 text-white rounded-xl shadow-lg hover:bg-black-gold-800 focus:outline-none focus:ring-2 focus:ring-black-gold-500 focus:ring-offset-2 focus:ring-offset-zinc-900 transition duration-300 ease-in-out text-lg font-medium transform hover:scale-105"
                  >
                    <Lucide.Play size={20} className="mr-3" />
                    Continuar
                  </button>
                  <button
                    onClick={stopSpeech}
                    className="flex items-center px-6 py-3 bg-black-gold-700 text-white rounded-xl shadow-lg hover:bg-black-gold-800 focus:outline-none focus:ring-2 focus:ring-black-gold-500 focus:ring-offset-2 focus:ring-offset-zinc-900 transition duration-300 ease-in-out text-lg font-medium transform hover:scale-105"
                  >
                    <Lucide.StopCircle size={20} className="mr-3" />
                    Parar
                  </button>
                </>
              )}
              <button
                onClick={handleClearText}
                className="flex items-center px-6 py-3 bg-zinc-700 text-gray-200 rounded-xl shadow-lg hover:bg-zinc-600 focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2 focus:ring-offset-zinc-900 transition duration-300 ease-in-out text-lg font-medium transform hover:scale-105"
              >
                <Lucide.Eraser size={20} className="mr-3" />
                Limpar Texto
              </button>
              <button
                onClick={saveAsPDF}
                className="flex items-center px-6 py-3 bg-zinc-700 text-gray-200 rounded-xl shadow-lg hover:bg-zinc-600 focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2 focus:ring-offset-zinc-900 transition duration-300 ease-in-out text-lg font-medium transform hover:scale-105"
              >
                <Lucide.FileText size={20} className="mr-3" />
                Salvar como PDF
              </button>
            </div>
          </div>
        </div>
      </div>
      <footer className="text-center text-gray-500 text-sm mt-10">
        Desenvolvido por: J&M Corporation - Tecnologia para a Humanidade | v1.0.0
      </footer>
    </div>
  );
}

export default App;
