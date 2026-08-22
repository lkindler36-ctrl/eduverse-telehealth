import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowUpRight, Stethoscope, House, Globe2, Bot } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useCareStore } from "@/lib/eduverse/store";

export const Route = createFileRoute("/_clinic/")({ component: ClinicHome });

function ClinicHome() {
  const appointments = useCareStore((s) => s.appointments);
  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <p className="font-mono text-xs uppercase tracking-widest text-care">
        Von & Bick Healthcare Associates
      </p>
      <h1 className="mt-3 max-w-3xl font-display text-5xl leading-[0.95] sm:text-6xl">
        Care for Georgia, from anywhere in the state.
      </h1>
      <p className="mt-5 max-w-2xl text-base leading-relaxed text-muted">
        EduVerse TeleHealth is a virtual clinic, immigration desk, and housing
        coordination desk in one. Licensed professionals, AI assistants for education,
        and recruiting for Georgia licenses.
      </p>

      <div className="mt-8 flex flex-wrap gap-3">
        <Button asChild>
          <Link to="/care">
            Book a visit <ArrowUpRight className="size-4" />
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/assistants">Talk to an assistant</Link>
        </Button>
      </div>

      <dl className="mt-12 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          ["2,840", "Patients served"],
          ["186", "Clinicians"],
          ["24/7", "Virtual coverage"],
          ["98%", "Visit completion"],
        ].map(([n, l]) => (
          <div key={l} className="rounded-xl bg-card px-4 py-5 shadow-[var(--shadow-border)]">
            <dt className="text-xs text-muted">{l}</dt>
            <dd className="mt-1 font-display text-3xl tabular-nums">{n}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-10 grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <Stethoscope className="size-5 text-care" />
            <CardTitle>Telehealth</CardTitle>
            <CardDescription>
              Virtual consults, prescription coordination, and AI-assisted intake with
              licensed follow-through.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" size="sm">
              <Link to="/care">Open care board</Link>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Bot className="size-5 text-care" />
            <CardTitle>AI medical assistants</CardTitle>
            <CardDescription>
              Sarah (LPN), Jennifer (RN), Michael (MA), and Dr. Williams for education —
              never a substitute for emergency care.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" size="sm">
              <Link to="/assistants">Meet the team</Link>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Globe2 className="size-5 text-care" />
            <CardTitle>Immigration assistance</CardTitle>
            <CardDescription>
              Documentation, legal routing, and community integration for people relocating
              to Georgia.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" size="sm">
              <Link to="/support">Start intake</Link>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <House className="size-5 text-care" />
            <CardTitle>Housing support</CardTitle>
            <CardDescription>
              Applications, case management, and support coordination through Georgia DBHDD
              partnerships.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" size="sm">
              <Link to="/support">File a case</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {appointments.length > 0 && (
        <p className="mt-8 text-sm text-muted">
          You have {appointments.length} upcoming visit{appointments.length === 1 ? "" : "s"} on
          this device.
        </p>
      )}

      <blockquote className="mt-12 max-w-2xl border-l-2 border-care pl-5">
        <p className="font-display text-2xl leading-snug">
          EduVerse has improved access in our community. The professional standard and AI
          education layer are genuine.
        </p>
        <footer className="mt-3 text-sm text-muted">
          Dr. Rachel Martinez, MD · Community Health Director
        </footer>
      </blockquote>

      <p className="mt-16 text-xs text-subtle">
        Demo clinic. Not for emergencies. Call 911. AI assistants provide education only and
        do not create a clinician–patient relationship. No protected health information is
        stored on a server in this preview.
      </p>
    </main>
  );
}
