import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle } from "lucide-react";
import Link from "next/link";

export default function CheckoutSuccessPage() {
  return (
    <div className="max-w-md mx-auto text-center py-12">
      <CheckCircle className="w-16 h-16 mx-auto text-green-500 mb-6" />
      <h1 className="text-2xl font-bold mb-4">Rental Confirmed!</h1>
      <p className="text-gray-600 mb-8">
        Thank you for your rental. You will receive a confirmation email shortly with your subscription details and delivery information.
      </p>
      
      <Card>
        <CardContent className="py-6">
          <p className="text-sm text-gray-500 mb-2">What's next?</p>
          <ul className="text-sm text-left space-y-2">
            <li>1. Check your email for confirmation</li>
            <li>2. We'll deliver your first set of clothes</li>
            <li>3. Enjoy your subscription!</li>
          </ul>
        </CardContent>
      </Card>

      <div className="mt-6 space-y-2">
        <Link href="/dashboard" className="block">
          <Button className="w-full">Go to Dashboard</Button>
        </Link>
        <Link href="/catalog" className="block">
          <Button variant="outline" className="w-full">Browse More</Button>
        </Link>
      </div>
    </div>
  );
}
