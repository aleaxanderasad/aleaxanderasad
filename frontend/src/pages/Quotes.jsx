import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "@/lib/api";
import { Quote as QuoteIcon, ChevronRight } from "lucide-react";

export default function Quotes() {
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await api.get("/quotes");
      setQuotes(data);
      setLoading(false);
    })();
  }, []);

  return (
    <div data-testid="quotes-page" className="max-w-6xl mx-auto px-6 py-10 scanlines">
      <div className="mb-10">
        <div className="label-xs mb-2 text-neon-magenta">// QUOTE.ARMORY</div>
        <h1 className="font-display text-5xl sm:text-7xl tracking-tighter uppercase">Anime <span className="text-neon-magenta">Quotes</span></h1>
        <p className="text-zinc-400 mt-3 max-w-2xl font-body">Type iconic words from legendary anime. Each quote is a soul fragment.</p>
      </div>

      {loading ? <div className="text-zinc-500 font-mono">Loading quotes...</div> : (
        <div className="grid md:grid-cols-2 gap-4">
          {quotes.map((q) => (
            <Link
              key={q.id}
              to={`/practice/quote/${q.id}`}
              data-testid={`quote-card-${q.id}`}
              className="dojo-card group block"
            >
              <QuoteIcon size={20} className="text-neon-magenta mb-3" />
              <p className="font-body text-lg leading-relaxed mb-4 italic">"{q.text}"</p>
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-display text-sm tracking-wider uppercase text-neon-cyan">{q.character}</div>
                  <div className="text-xs text-zinc-500 uppercase tracking-widest mt-0.5">{q.anime}</div>
                </div>
                <ChevronRight size={16} className="text-zinc-500 group-hover:text-neon-magenta transition" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
