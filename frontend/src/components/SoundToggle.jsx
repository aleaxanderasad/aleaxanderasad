import React, { useEffect, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { isMuted, setMuted, subscribeMute } from "@/lib/sounds";

export default function SoundToggle() {
  const [muted, setLocal] = useState(isMuted());
  useEffect(() => subscribeMute(setLocal), []);
  return (
    <button
      data-testid="sound-toggle"
      onClick={() => setMuted(!muted)}
      title={muted ? "Unmute" : "Mute"}
      className="text-zinc-400 hover:text-neon-cyan transition p-2"
    >
      {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
    </button>
  );
}
