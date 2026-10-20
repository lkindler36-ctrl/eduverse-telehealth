"use client";

import { useEffect, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

function VerifyInner() {
  const params = useSearchParams();
  const router = useRouter();
  const [message, setMessage] = useState("Signing you in…");

  useEffect(() => {
    const token = params.get("token");
    if (!token) {
      setMessage("Missing sign-in token.");
      return;
    }
    void signIn("magic-link", { token, redirect: false }).then((result) => {
      if (result?.error) {
        setMessage("This link is invalid or expired.");
        return;
      }
      router.replace("/dashboard");
    });
  }, [params, router]);

  return (
    <main className="mx-auto max-w-lg px-4 py-16">
      <h1 className="font-display text-3xl">Magic link</h1>
      <p className="mt-3 text-muted">{message}</p>
    </main>
  );
}

export default function VerifyPage() {
  return (
    <Suspense>
      <VerifyInner />
    </Suspense>
  );
}
