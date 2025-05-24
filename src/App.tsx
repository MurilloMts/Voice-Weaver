import React, { useState, useEffect } from 'react';
    import * as Lucide from 'lucide-react';
    import jsPDF from 'jspdf';
    import 'jspdf-autotable';

    function App() {
      const [text, setText] = useState('');
      const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
      const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null);
      const [rate, setRate] = useState(1);
      const [isPlaying, setIsPlaying] = useState(false);
      const [utterance, setUtterance] = useState<SpeechSynthesisUtterance | null>(null);

      useEffect(() => {
        const populateVoices = () => {
          const availableVoices = window.speechSynthesis.getVoices();
          setVoices(availableVoices);
        };

        populateVoices();

        window.speechSynthesis.onvoiceschanged = () => {
          populateVoices();
        };

        return () => {
          window.speechSynthesis.onvoiceschanged = null;
        };
      }, []);

      useEffect(() => {
        if (voices.length > 0) {
          const portugueseVoice = voices.find((voice) => voice.name.includes('Google português do Brasil'));
          if (portugueseVoice) {
            setSelectedVoice(portugueseVoice);
          } else {
            setSelectedVoice(voices[0]);
          }
        }
      }, [voices]);

      const handleTextChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
        setText(event.target.value);
      };

      const handleVoiceChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
        const voice = voices.find((v) => v.name === event.target.value);
        setSelectedVoice(voice || null);
      };

      const handleRateChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setRate(parseFloat(event.target.value));
      };

      const speak = () => {
        if (!text || !selectedVoice) return;

        const synth = window.speechSynthesis;
        const newUtterance = new SpeechSynthesisUtterance(text);
        newUtterance.voice = selectedVoice;
        newUtterance.rate = rate;

        newUtterance.onstart = () => {
          setIsPlaying(true);
        };

        newUtterance.onend = () => {
          setIsPlaying(false);
        };

        newUtterance.onerror = () => {
          setIsPlaying(false);
        };

        synth.speak(newUtterance);
        setUtterance(newUtterance);
      };

      const pause = () => {
        window.speechSynthesis.pause();
        setIsPlaying(false);
      };

      const resume = () => {
        window.speechSynthesis.resume();
        setIsPlaying(true);
      };

      const stop = () => {
        window.speechSynthesis.cancel();
        setIsPlaying(false);
      };

      const saveAsPDF = () => {
        const doc = new jsPDF();
        doc.text(text, 10, 10);
        doc.save('text-to-speech.pdf');
      };

      return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-700 py-6 flex flex-col justify-center sm:py-12">
          <div className="relative py-3 sm:max-w-xl sm:mx-auto">
            <div className="absolute inset-0 bg-gradient-to-r from-yellow-500 via-yellow-400 to-yellow-700 shadow-lg transform -skew-y-6 sm:skew-y-0 sm:-rotate-6 sm:rounded-3xl"></div>
            <div className="relative px-4 py-10 bg-gray-800 shadow-lg sm:rounded-3xl sm:p-20">
              <div className="max-w-md mx-auto">
                <div>
                  <h1 className="text-2xl font-semibold text-white">Text to Speech Converter</h1>
                </div>
                <div className="divide-y divide-gray-600">
                  <div className="py-8 text-base leading-6 space-y-4 text-gray-300 sm:text-lg sm:leading-7">
                    <div className="space-y-4">
                      <label className="text-white">
                        Text:
                        <textarea
                          className="mt-1 block w-full rounded-md border-gray-700 bg-gray-700 text-white shadow-sm focus:border-yellow-500 focus:ring-yellow-500"
                          rows={4}
                          value={text}
                          onChange={handleTextChange}
                        />
                      </label>
                      <label className="text-white">
                        Voice:
                        <select
                          className="mt-1 block w-full rounded-md border-gray-700 bg-gray-700 text-white shadow-sm focus:border-yellow-500 focus:ring-yellow-500"
                          value={selectedVoice ? selectedVoice.name : ''}
                          onChange={handleVoiceChange}
                        >
                          {voices.map((voice) => (
                            <option key={voice.name} value={voice.name}>
                              {voice.name} ({voice.lang})
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="text-white">
                        Rate:
                        <input
                          type="range"
                          min="0.5"
                          max="2"
                          step="0.1"
                          value={rate}
                          onChange={handleRateChange}
                          className="mt-1 block w-full"
                        />
                        <span className="text-sm text-gray-500">Current Rate: {rate.toFixed(1)}</span>
                      </label>
                    </div>
                    <div className="flex justify-around mt-4">
                      {!isPlaying ? (
                        <button
                          onClick={speak}
                          className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
                        >
                          <Lucide.Play size={20} className="inline-block mr-2" />
                          Play
                        </button>
                      ) : (
                        <>
                          <button
                            onClick={pause}
                            className="bg-yellow-500 hover:bg-yellow-700 text-white font-bold py-2 px-4 rounded"
                          >
                            Pause
                          </button>
                          <button
                            onClick={resume}
                            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                          >
                            Resume
                          </button>
                          <button
                            onClick={stop}
                            className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
                          >
                            <Lucide.Stop size={20} className="inline-block mr-2" />
                            Stop
                          </button>
                        </>
                      )}
                      <button
                        onClick={saveAsPDF}
                        className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                      >
                        Save as PDF
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    export default App;
