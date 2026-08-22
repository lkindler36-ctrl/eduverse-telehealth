import { useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { providerById, useCareStore } from "@/lib/eduverse/store";
import { formatTime } from "@/lib/utils";

export const Route = createFileRoute("/_clinic/visit")({ component: VisitRoom });

function VisitRoom() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [on, setOn] = useState(false);
  const [note, setNote] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const [camError, setCamError] = useState("");
  const latest = useCareStore((s) => s.appointments[0]);
  const provider = latest ? providerById(latest.providerId) : null;

  useEffect(() => {
    if (!on) return;
    const t = window.setInterval(() => setElapsed((n) => n + 1), 1000);
    return () => window.clearInterval(t);
  }, [on]);

  const start = async () => {
    setCamError("");
    setOn(true);
    setElapsed(0);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch {
      setCamError("Camera is blocked in this preview. The visit still runs as a notes room.");
    }
  };

  const end = () => {
    const media = videoRef.current?.srcObject as MediaStream | null;
    media?.getTracks().forEach((t) => t.stop());
    if (videoRef.current) videoRef.current.srcObject = null;
    setOn(false);
  };

  return (
    <main className="mx-auto grid max-w-6xl gap-6 px-4 py-10 lg:grid-cols-[1.4fr_1fr]">
      <section className="overflow-hidden rounded-xl bg-ink text-paper shadow-[var(--shadow-border)]">
        <div className="relative aspect-video bg-care">
          <video ref={videoRef} muted playsInline className="h-full w-full object-cover" />
          {!on && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center">
              <p className="font-mono text-xs uppercase tracking-widest text-care-foreground/70">
                Consult room
              </p>
              <h1 className="font-display text-4xl text-paper">Join your visit</h1>
              <p className="max-w-sm text-sm text-paper/80">
                {provider
                  ? `${provider.name} is holding the ${latest?.when} slot.`
                  : "Book a clinician first, or join as a walk-in notes session."}
              </p>
              <Button onClick={() => void start()}>Start camera</Button>
            </div>
          )}
          {on && (
            <div className="absolute left-4 top-4 rounded-md bg-background/80 px-2 py-1 font-mono text-xs tabular-nums text-foreground">
              {formatTime(elapsed)}
            </div>
          )}
        </div>
        <div className="flex items-center justify-between gap-3 px-4 py-3">
          <p className="text-sm text-paper/80">
            {camError || "Local preview only — this is not a live clinician feed."}
          </p>
          {on && (
            <Button variant="outline" onClick={end}>
              End visit
            </Button>
          )}
        </div>
      </section>

      <section className="rounded-xl bg-card p-5 shadow-[var(--shadow-border)]">
        <h2 className="font-display text-2xl">Visit notes</h2>
        <p className="mt-1 text-sm text-muted">
          Stay on this device. Share with your clinician at the next in-person or licensed visit.
        </p>
        <Textarea
          className="mt-4 min-h-56"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Symptoms, questions, medications to mention…"
        />
        <p className="mt-4 text-xs text-subtle">
          Call 911 for emergencies. This room does not transmit protected health information to a server.
        </p>
      </section>
    </main>
  );
}
