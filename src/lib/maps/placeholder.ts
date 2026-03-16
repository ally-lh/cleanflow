// CleanFlow — Maps / 3D Dashboard Placeholder
//
// This module is a stub for the Three.js operations map.
// When the team is ready to build the 3D logistics dashboard:
//
//   1. Install: npm install three @react-three/fiber @react-three/drei
//   2. Create: src/components/admin/DispatchMap.tsx
//   3. Use the LiveDriverLocation and ActiveDelivery types below
//   4. Fetch live data from /api/dispatch/live
//
// See: /src/app/api/dispatch/ for the API endpoints to build.

export interface LiveDriverLocation {
  driverId: string;
  driverName: string;
  lat: number;
  lng: number;
  heading?: number;
  lastUpdated: Date;
  activeOrderId?: string;
}

export interface ActiveDelivery {
  orderId: string;
  orderNumber: string;
  driverId?: string;
  pickupLat?: number;
  pickupLng?: number;
  dropoffLat?: number;
  dropoffLng?: number;
  status: string;
  estimatedArrival?: Date;
}

export interface DispatchBoardState {
  drivers: LiveDriverLocation[];
  activeDeliveries: ActiveDelivery[];
  pendingPickups: number;
  lastRefreshed: Date;
}

// This will be implemented by the Three.js / digital twin teammate
export function getDispatchBoardData(): Promise<DispatchBoardState> {
  return Promise.resolve({
    drivers: [],
    activeDeliveries: [],
    pendingPickups: 0,
    lastRefreshed: new Date(),
  });
}
