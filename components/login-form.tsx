"use client";

import { useState, type FormEvent } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("rn.demo@vbhealthcare.local");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState(params.get("error") ? "Sign-in failed. Try again." : "");
  const [busy, setBusy] = useState(false);

  async function onPassword(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage("");
    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });
    setBusy(false);
    if (result?.error) {
      setMessage("Email or password is incorrect.");
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  async function onMagic() {
    setBusy(true);
    setMessage("");
    const res = await fetch("/api/auth/magic-link", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = (await res.json()) as { ok?: boolean; error?: string };
    setBusy(false);
    if (!res.ok) {
      setMessage(data.error ?? "Unable to start magic link.");
      return;
    }
    setMessage("If that account exists, a sign-in link is on its way. It expires in 20 minutes.");
  }

  return (
    <div className="space-y-6">
      <form className="space-y-3" onSubmit={(e) => void onPassword(e)}>
        <div className="space-y-1.5">
          <Label htmlFor="email">Work email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <Button type="submit" className="w-full" disabled={busy}>
          Sign in
        </Button>
      </form>
      <Button type="button" variant="outline" className="w-full" disabled={busy} onClick={() => void onMagic()}>
        Email me a sign-in link
      </Button>
      {message && <p className="text-sm text-muted">{message}</p>}
    </div>
  );
}
