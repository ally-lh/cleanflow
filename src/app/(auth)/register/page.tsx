"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowRight, ShieldCheck, Sparkles, Truck } from "lucide-react";
import { registerAction } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { APP_NAME } from "@/types/constants";

export default function RegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const result = await registerAction(formData);

    setLoading(false);

    if (!result.success) {
      toast.error(result.error);
      return;
    }

    toast.success("Account created! Please sign in.");
    router.push("/login");
  }

  return (
    <div className="relative min-h-screen overflow-hidden px-4 py-10 sm:px-6 sm:py-16">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-80"
        style={{
          background:
            "radial-gradient(36rem 24rem at 8% 12%, color-mix(in oklab, var(--primary) 14%, transparent), transparent), radial-gradient(30rem 20rem at 88% 82%, color-mix(in oklab, var(--chart-2) 12%, transparent), transparent)",
        }}
      />

      <div className="relative mx-auto grid w-full max-w-5xl gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <section className="hidden rounded-3xl border border-border/70 bg-card/75 p-8 shadow-lg backdrop-blur md:block lg:p-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5" />
            Laundry Flow, Refined
          </div>
          <h1 className="mt-5 text-4xl font-semibold leading-tight text-foreground lg:text-5xl">
            Start your account and streamline laundry operations from day one.
          </h1>
          <p className="mt-4 max-w-lg text-base leading-relaxed text-muted-foreground">
            Join {APP_NAME} to manage pickup requests, processing, and delivery updates with a cleaner workflow for both staff and customers.
          </p>

          <div className="mt-8 grid gap-3 text-sm">
            <div className="flex items-center gap-3 rounded-xl border border-border/70 bg-background/75 px-4 py-3">
              <ShieldCheck className="h-4 w-4 text-primary" />
              Reliable, secure access for your operations team
            </div>
            <div className="flex items-center gap-3 rounded-xl border border-border/70 bg-background/75 px-4 py-3">
              <Truck className="h-4 w-4 text-primary" />
              Track every order state from intake to delivery
            </div>
          </div>
        </section>

        <div className="w-full">
          <div className="mb-5 text-center lg:text-left">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-lg text-primary-foreground shadow-sm">
              🧺
            </div>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight text-foreground">{APP_NAME}</h2>
          </div>

          <Card className="rounded-3xl border-border/70 bg-card/90 py-0 shadow-xl backdrop-blur">
            <CardHeader className="px-6 py-6">
              <CardTitle className="text-xl font-semibold text-center">Create your account</CardTitle>
              <CardDescription className="text-center">
                Join {APP_NAME} for smarter laundry management.
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleSubmit}>
              <CardContent className="space-y-5 px-6 sm:px-7">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    name="name"
                    placeholder=""
                    required
                    minLength={2}
                    autoComplete="name"
                    className="h-11 rounded-xl bg-background/80"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder=""
                    required
                    autoComplete="email"
                    className="h-11 rounded-xl bg-background/80"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone (optional)</Label>
                  <Input
                    id="phone"
                    name="phone"
                    type="tel"
                    placeholder=""
                    autoComplete="tel"
                    className="h-11 rounded-xl bg-background/80"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    placeholder=""
                    required
                    minLength={8}
                    autoComplete="new-password"
                    className="h-11 rounded-xl bg-background/80"
                  />
                </div>
              </CardContent>
              <CardFooter className="flex flex-col gap-3 border-0 bg-muted/35 px-6 pb-6 pt-5 sm:px-7 sm:pb-7">
                <Button type="submit" className="h-11 w-full rounded-xl text-sm font-semibold" disabled={loading}>
                  {loading ? "Creating account..." : "Create account"}
                  {!loading && <ArrowRight className="ml-2 h-4 w-4" />}
                </Button>
                <p className="text-center text-sm text-muted-foreground">
                  Already have an account?{" "}
                  <Link href="/login" className="font-semibold text-primary hover:opacity-80">
                    Sign in
                  </Link>
                </p>
              </CardFooter>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
}
