/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { GoogleGenAI, Type } from "@google/genai";
import { motion, AnimatePresence } from "motion/react";
import { 
  Cpu, 
  Search, 
  Gamepad2, 
  Briefcase, 
  Video, 
  Zap, 
  PiggyBank, 
  ExternalLink,
  Loader2,
  ChevronRight,
  Monitor
} from "lucide-react";

// Initialize Gemini API
const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

interface PCRecommendation {
  name: string;
  price: number;
  specs: string;
  description: string;
  pros: string[];
  cons: string[];
  link: string;
  store: string;
}

export default function App() {
  const [budget, setBudget] = useState<number>(800);
  const [purpose, setPurpose] = useState<'gaming' | 'work' | 'editing'>('gaming');
  const [mode, setMode] = useState<'performance' | 'budget'>('performance');
  const [ram, setRam] = useState<string>('any');
  const [storage, setStorage] = useState<string>('any');
  const [loading, setLoading] = useState(false);
  const [recommendations, setRecommendations] = useState<PCRecommendation[]>([]);
  const [error, setError] = useState<string | null>(null);

  const findPC = async () => {
    setLoading(true);
    setError(null);
    try {
      const prompt = `You are a Dutch PC hardware expert. Your task is to find 3 REAL PC recommendations for a user.
      
      USER CRITERIA:
      - Budget: €${budget}
      - Purpose: ${purpose}
      - Focus: ${mode === 'performance' ? 'Performance' : 'Value'}
      - RAM: ${ram === 'any' ? 'Any' : ram}
      - Storage: ${storage === 'any' ? 'Any' : storage}
      
      INSTRUCTIONS:
      1. Use the Google Search tool to find actual current listings.
      2. SEARCH ON TWEAKERS.NET FIRST. Tweakers.net is the most reliable source for prices and product links in the Netherlands.
      3. For each recommendation, you MUST provide a REAL, WORKING URL. 
      4. PREFERRED LINKS: Direct links to Megekko.nl, Alternate.nl, Azerty.nl, Amazon.nl, or Bol.com.
      5. FALLBACK LINK: If you cannot find a direct shop link that you are 100% sure works, use the product's "Pricewatch" link on Tweakers.net.
      6. CRITICAL: NEVER construct a URL yourself. Only use URLs that appear in your search results. If a link looks like "megekko.nl/product/12345", use it. If you have to guess, DON'T.
      
      Return the results as a JSON array matching the schema.`;

      const response = await genAI.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }],
          responseMimeType: "application/json",
          thinkingConfig: { thinkingLevel: "LOW" as any },
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING, description: "Full product name" },
                price: { type: Type.NUMBER, description: "Current price in Euros" },
                specs: { type: Type.STRING, description: "Key technical specifications" },
                description: { type: Type.STRING, description: "Brief explanation of why this is a good choice" },
                pros: { type: Type.ARRAY, items: { type: Type.STRING } },
                cons: { type: Type.ARRAY, items: { type: Type.STRING } },
                link: { type: Type.STRING, description: "A VERIFIED URL from search results (Shop or Tweakers)" },
                store: { type: Type.STRING, description: "Shop name or 'Tweakers Pricewatch'" },
              },
              required: ["name", "price", "specs", "description", "pros", "cons", "link", "store"],
            },
          },
        },
      });

      const text = response.text;
      if (text) {
        const data = JSON.parse(text);
        setRecommendations(data);
      }
    } catch (err) {
      console.error(err);
      setError("Er is iets misgegaan bij het zoeken. Probeer het later opnieuw.");
    } finally {
      setLoading(false);
    }
  };

  const searchOnGoogle = (query: string) => {
    window.open(`https://www.google.com/search?q=${encodeURIComponent(query)}`, '_blank');
  };

  const searchOnTweakers = (query: string) => {
    window.open(`https://tweakers.net/zoeken/?keyword=${encodeURIComponent(query)}`, '_blank');
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <header className="text-center mb-12">
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center justify-center p-3 bg-blue-600/10 rounded-2xl mb-4 border border-blue-500/20"
          >
            <Monitor className="w-8 h-8 text-blue-500" />
          </motion.div>
          <motion.h1 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-4xl md:text-5xl font-bold tracking-tight mb-4 bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent"
          >
            PC Finder Pro
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="text-zinc-400 text-lg"
          >
            Vind de perfecte PC voor jouw budget met behulp van AI.
          </motion.p>
        </header>

        {/* Form Card */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-zinc-900/50 border border-zinc-800 p-6 md:p-8 rounded-3xl shadow-2xl backdrop-blur-sm mb-12"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
            {/* Budget Input */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-zinc-400 flex items-center gap-2">
                <PiggyBank className="w-4 h-4" /> Jouw Budget (€)
              </label>
              <input 
                type="number" 
                value={budget}
                onChange={(e) => setBudget(Number(e.target.value))}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-xl font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                placeholder="Bijv. 1000"
              />
              <div className="flex justify-between text-xs text-zinc-500 px-1">
                <span>Min: €300</span>
                <span>Max: €5000+</span>
              </div>
            </div>

            {/* Purpose Select */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-zinc-400 flex items-center gap-2">
                <Cpu className="w-4 h-4" /> Gebruiksdoel
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'work', icon: Briefcase, label: 'Werk' },
                  { id: 'gaming', icon: Gamepad2, label: 'Gaming' },
                  { id: 'editing', icon: Video, label: 'Edit' },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setPurpose(item.id as any)}
                    className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all ${
                      purpose === item.id 
                        ? 'bg-blue-600/20 border-blue-500 text-blue-400' 
                        : 'bg-zinc-950 border-zinc-800 text-zinc-500 hover:border-zinc-700'
                    }`}
                  >
                    <item.icon className="w-5 h-5 mb-1" />
                    <span className="text-xs font-medium">{item.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* RAM Filter */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-zinc-400 flex items-center gap-2">
                <Zap className="w-4 h-4" /> Minimaal RAM
              </label>
              <select 
                value={ram}
                onChange={(e) => setRam(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all appearance-none"
              >
                <option value="any">Geen voorkeur</option>
                <option value="8GB">8GB</option>
                <option value="16GB">16GB</option>
                <option value="32GB">32GB</option>
                <option value="64GB">64GB</option>
              </select>
            </div>

            {/* Storage Filter */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-zinc-400 flex items-center gap-2">
                <Monitor className="w-4 h-4" /> Opslag (SSD)
              </label>
              <select 
                value={storage}
                onChange={(e) => setStorage(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all appearance-none"
              >
                <option value="any">Geen voorkeur</option>
                <option value="256GB">256GB+</option>
                <option value="512GB">512GB+</option>
                <option value="1TB">1TB+</option>
                <option value="2TB">2TB+</option>
              </select>
            </div>

            {/* Mode Select */}
            <div className="space-y-3 md:col-span-2">
              <label className="text-sm font-medium text-zinc-400 flex items-center gap-2">
                <Zap className="w-4 h-4" /> Focus Modus
              </label>
              <div className="flex p-1 bg-zinc-950 border border-zinc-800 rounded-xl">
                <button
                  onClick={() => setMode('performance')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all ${
                    mode === 'performance' 
                      ? 'bg-zinc-800 text-white shadow-lg' 
                      : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  <Zap className="w-4 h-4" /> Maximale Snelheid
                </button>
                <button
                  onClick={() => setMode('budget')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all ${
                    mode === 'budget' 
                      ? 'bg-zinc-800 text-white shadow-lg' 
                      : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  <PiggyBank className="w-4 h-4" /> Budget Mode (Beste Deal)
                </button>
              </div>
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-3 mt-8">
            <button 
              onClick={findPC}
              disabled={loading}
              className="flex-[2] bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-800 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-600/20"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  AI is aan het zoeken...
                </>
              ) : (
                <>
                  <Search className="w-5 h-5" />
                  Zoek Beste PC Uit
                </>
              )}
            </button>
            <button 
              onClick={() => {
                setBudget(800);
                setPurpose('gaming');
                setMode('performance');
                setRam('any');
                setStorage('any');
                setRecommendations([]);
                setError(null);
              }}
              disabled={loading}
              className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold py-4 rounded-xl transition-all"
            >
              Reset Filters
            </button>
          </div>
          <p className="text-[10px] text-zinc-600 mt-4 text-center flex items-center justify-center gap-1">
            <Zap className="w-3 h-3" /> AI zoekt live op Tweakers.net en andere shops voor de beste deals.
          </p>
        </motion.div>

        {/* Error Message */}
        <AnimatePresence>
          {error && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl mb-8 text-center"
            >
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Results Section */}
        <div className="space-y-6">
          <AnimatePresence mode="popLayout">
            {recommendations.map((pc, index) => (
              <motion.div
                key={pc.name + index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-zinc-900/40 border border-zinc-800 rounded-3xl overflow-hidden hover:border-blue-500/30 transition-all group"
              >
                <div className="p-6 md:p-8">
                  <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-6">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="px-2 py-0.5 bg-blue-600/20 text-blue-400 text-[10px] font-bold uppercase tracking-wider rounded-full border border-blue-500/20">
                          {pc.store}
                        </span>
                        <span className="text-zinc-500 text-xs font-medium">Geverifieerd</span>
                      </div>
                      <h3 className="text-2xl font-bold text-white group-hover:text-blue-400 transition-colors">{pc.name}</h3>
                    </div>
                    <div className="text-right">
                      <div className="text-3xl font-bold text-green-400">€{pc.price}</div>
                      <div className="text-xs text-zinc-500">Inclusief BTW</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div>
                      <h4 className="text-sm font-semibold text-zinc-300 mb-3 flex items-center gap-2">
                        <Cpu className="w-4 h-4 text-blue-500" /> Specificaties
                      </h4>
                      <p className="text-zinc-400 text-sm leading-relaxed bg-zinc-950/50 p-4 rounded-xl border border-zinc-800">
                        {pc.specs}
                      </p>
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-zinc-300 mb-3">Waarom deze PC?</h4>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          {pc.pros.map((pro, i) => (
                            <div key={i} className="flex items-start gap-2 text-sm text-zinc-400">
                              <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" />
                              <span>{pro}</span>
                            </div>
                          ))}
                        </div>
                        <div className="space-y-2">
                          {pc.cons.map((con, i) => (
                            <div key={i} className="flex items-start gap-2 text-sm text-zinc-500">
                              <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-zinc-700 shrink-0" />
                              <span>{con}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-8 pt-6 border-t border-zinc-800 flex flex-col md:flex-row items-center justify-between gap-4">
                    <p className="text-zinc-500 text-xs italic max-w-md">
                      {pc.description}
                    </p>
                    <div className="flex flex-wrap gap-3 w-full md:w-auto justify-end">
                      <button 
                        onClick={() => searchOnTweakers(pc.name)}
                        className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold px-4 py-3 rounded-xl flex items-center justify-center gap-2 transition-all text-sm"
                      >
                        Tweakers <Search className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => searchOnGoogle(`${pc.name} prijs`)}
                        className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold px-4 py-3 rounded-xl flex items-center justify-center gap-2 transition-all text-sm"
                      >
                        Google <Search className="w-4 h-4" />
                      </button>
                      <a 
                        href={pc.link} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-6 py-3 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-600/20"
                      >
                        Bekijk Online <ExternalLink className="w-4 h-4" />
                      </a>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {recommendations.length === 0 && !loading && !error && (
            <div className="text-center py-20 border-2 border-dashed border-zinc-800 rounded-3xl">
              <Search className="w-12 h-12 text-zinc-800 mx-auto mb-4" />
              <p className="text-zinc-500 font-medium">Vul je budget in en klik op de knop om te beginnen.</p>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <footer className="mt-20 text-center text-zinc-600 text-sm pb-8">
        <p>© 2026 PC Finder Pro • Powered by Gemini AI</p>
        <p className="mt-1">Prijzen en beschikbaarheid kunnen variëren.</p>
      </footer>
    </div>
  );
}
