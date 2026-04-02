// Home page — redirect logged-in users; show landing for guests

import { auth } from "@/lib/auth/config";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { APP_NAME } from "@/types/constants";
import { Camera, Car, MapPin, WashingMachine } from "lucide-react";

export default async function HomePage() {
  const session = await auth();

  if (session?.user) {
    const isAdmin =
      session.user.role === "ADMIN" || session.user.role === "SUPER_ADMIN";
    redirect(isAdmin ? "/admin/dashboard" : "/dashboard");
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-8">
      <div className="max-w-2xl mx-auto text-center space-y-8 pt-16">
        <div className="space-y-3">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl mb-4">
            <WashingMachine className="text-white w-8 h-8" />
          </div>
          <h1 className="text-5xl font-bold text-gray-900">{APP_NAME}</h1>
          <p className="text-xl text-gray-600">
            Smart laundry & dry cleaning — pickup, tracking, and delivery all in
            one place.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/register">
            <Button size="lg" className="text-base px-8">
              Get Started
            </Button>
          </Link>
          <Link href="/login">
            <Button variant="outline" size="lg" className="text-base px-8">
              Sign In
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-8">
          {[
            {
              icon: <Camera className="w-6 h-6 text-blue-600" />,
              title: "AI Photo Intake",
              desc: "Upload a photo — our AI counts and categorises your laundry instantly.",
            },
            {
              icon: <Car className="w-6 h-6 text-blue-600" />,
              title: "Pickup & Delivery",
              desc: "Schedule a pickup or drop off. We deliver back when it is ready.",
            },
            {
              icon: <MapPin className="w-6 h-6 text-blue-600" />,
              title: "Live Tracking",
              desc: "Follow your order from pickup to pressing to your door.",
            },
          ].map((feature) => (
            <div
              key={feature.title}
              className="bg-white rounded-xl p-5 shadow-sm text-left"
            >
              <div className="mb-3">{feature.icon}</div>
              <h3 className="font-semibold text-gray-900 mb-1">
                {feature.title}
              </h3>
              <p className="text-sm text-gray-500">{feature.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
