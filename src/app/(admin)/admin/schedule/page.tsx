import {
  getPendingPickupsAction,
  getActiveDriversAction,
} from "@/actions/admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import PickupApprovalCard from "@/components/admin/PickupApprovalCard";

export default async function AdminSchedulePage() {
  const [pendingPickups, drivers] = await Promise.all([
    getPendingPickupsAction(),
    getActiveDriversAction(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Pickup Schedule</h1>
        <p className="text-gray-500 mt-1">
          Review and approve customer pickup requests. Assign drivers to confirmed pickups.
        </p>
      </div>

      {/* Pending requests */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <h2 className="text-lg font-semibold text-gray-800">
            Pending Approvals
          </h2>
          {pendingPickups.length > 0 && (
            <Badge variant="destructive">{pendingPickups.length}</Badge>
          )}
        </div>

        {pendingPickups.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex items-center justify-center py-12 text-gray-400 text-sm">
              No pending pickup requests.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {pendingPickups.map((pickup) => (
              <PickupApprovalCard
                key={pickup.id}
                pickup={pickup}
                drivers={drivers}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
