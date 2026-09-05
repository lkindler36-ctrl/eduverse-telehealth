import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PhiBanner } from "@/components/phi-banner";

export default async function HomePage() {
  const user = await getSessionUser();
  if (user) redirect("/dashboard");

  return (
    <div className="min-h-dvh bg-background">
      <PhiBanner />
      <main className="mx-auto max-w-6xl px-4 py-12">
        <p className="font-mono text-xs uppercase tracking-widest text-care">
          Von & Bick Healthcare Associates
        </p>
        <h1 className="mt-3 max-w-3xl font-display text-5xl leading-[0.95] sm:text-6xl">
          Staff visit documentation for Georgia telehealth.
        </h1>
        <p className="mt-5 max-w-2xl text-base leading-relaxed text-muted">
          EduVerse TeleHealth is the chart — SOAP, behavioral-health progress, and DSP/CLS
          shift notes. Video stays on Zoom Healthcare under its BAA. This application is for
          remote clinical staff, not patient self-booking.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button asChild>
            <Link href="/login">Staff sign in</Link>
          </Button>
          <Button asChild variant="outline">
            <a href="mailto:info.officeadmin@vbhealthcare.org">Contact the practice</a>
          </Button>
        </div>

        <div className="mt-12 grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Medical notes</CardTitle>
              <CardDescription>SOAP documentation for RN, LPN, and MA telehealth visits.</CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Behavioral health</CardTitle>
              <CardDescription>Progress notes with presentation, interventions, response, and risk.</CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>DSP / CLS shifts</CardTitle>
              <CardDescription>Supports, ADLs, incidents, and end-of-shift lock for DD programs.</CardDescription>
            </CardHeader>
          </Card>
        </div>

        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Practice</CardTitle>
            <CardDescription>Von & Bick Healthcare Associates, LLC d/b/a EduVerse TeleHealth</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted">
            <p>2133 Lawrenceville-Suwanee Rd, Suwanee, GA 30024</p>
            <p>470-256-3897 · info.officeadmin@vbhealthcare.org</p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
