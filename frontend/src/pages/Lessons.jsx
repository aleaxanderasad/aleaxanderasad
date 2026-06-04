import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "@/lib/api";
import { Lock, ChevronRight } from "lucide-react";

const TIER_META = {
  beginner: { label: "Beginner", color: "text-neon-green", border: "border-neon-green/40" },
  intermediate: { label: "Intermediate", color: "text-neon-cyan", border: "border-neon-cyan/40" },
  advanced: { label: "Advanced", color: "text-neon-magenta", border: "border-neon-magenta/40" },
};

export default function Lessons() {
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await api.get("/lessons");
      setLessons(data);
      setLoading(false);
    })();
  }, []);

  const grouped = ["beginner", "intermediate", "advanced"].map((tier) => ({
    tier,
    items: lessons.filter((l) => l.level === tier),
  }));

  return (
    <div data-testid="lessons-page" className="max-w-6xl mx-auto px-6 py-10 scanlines">
      <div className="mb-10">
        <div className="label-xs mb-2">// TRAINING.HALL</div>
        <h1 className="font-display text-5xl sm:text-7xl tracking-tighter uppercase">Lessons</h1>
        <p className="text-zinc-400 mt-3 max-w-2xl font-body">
          12 trials forged across three tiers. Begin with the home row. End as a master.
        </p>
      </div>

      {loading ? <div className="text-zinc-500 font-mono">Loading trials...</div> :
        grouped.map(({ tier, items }) => (
          <section key={tier} className="mb-12" data-testid={`tier-${tier}`}>
            <div className="flex items-baseline gap-4 mb-5">
              <h2 className={`font-display text-3xl uppercase tracking-wide ${TIER_META[tier].color}`}>{TIER_META[tier].label}</h2>
              <div className={`flex-1 h-px ${TIER_META[tier].border} border-t`} />
              <span className="label-xs">{items.length} trials</span>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
              {items.map((lesson, idx) => (
                <Link
                  key={lesson.id}
                  to={`/practice/lesson/${lesson.id}`}
                  data-testid={`lesson-card-${lesson.id}`}
                  className="dojo-card group block"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className={`font-mono text-xs ${TIER_META[tier].color}`}>TRIAL {String(idx + 1).padStart(2, "0")}</span>
                    <ChevronRight size={16} className="text-zinc-500 group-hover:text-neon-cyan transition" />
                  </div>
                  <div className="font-display text-xl tracking-wide uppercase mb-2">{lesson.title}</div>
                  <div className="text-xs text-zinc-400 font-body line-clamp-2">{lesson.description}</div>
                </Link>
              ))}
            </div>
          </section>
        ))
      }
    </div>
  );
}
