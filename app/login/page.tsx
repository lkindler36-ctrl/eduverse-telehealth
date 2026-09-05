import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { LoginForm } from "@/components/login-form";
import { PhiBanner } from "@/components/phi-banner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function LoginPage() {
  const user = await getSessionUser();
  if (user) redirect("/dashboard");

  return (
    <div className="min-h-dvh bg-background">
      <PhiBanner />
      <main className="mx-auto grid max-w-5xl gap-8 px-4 py-12 lg:grid-cols-[1.1fr_20rem]">
        <div>
          <p className="font-mono text-xs uppercase tracking-widest text-care">Staff access</p>
          <h1 className="mt-2 font-display text-4xl">Sign in to the chart</h1>
          <p className="mt-3 max-w-xl text-muted">
            Use your EduVerse staff account. Seed passwords are in the README and must be
            rotated before any production PHI is stored.
          </p>
          <Card className="mt-8 max-w-md">
            <CardHeader>
              <CardTitle>Credentials</CardTitle>
              <CardDescription>Email/password or a 20-minute magic link.</CardDescription>
            </CardHeader>
            <CardContent>
              <Suspense>
                <LoginForm />
              </Suspense>
            </CardContent>
          </Card>
        </div>
        <aside className="space-y-4 text-sm text-muted">
          <p>
            <Link href="/" className="text-care underline-offset-4 hover:underline">
              Back to practice home
            </Link>
          </p>
          <p>info.officeadmin@vbhealthcare.org · 470-256-3897</p>
        </aside>
      </main>
    </div>
  );
}
