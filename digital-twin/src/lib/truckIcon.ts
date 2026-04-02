import L from "leaflet";

export function createTruckIcon(
  status: "active" | "idle" | "offline",
  heading: number = 0,
): L.DivIcon {
  const color =
    status === "active" ? "#22c55e" :
    status === "idle"   ? "#3b82f6" :
                          "#6b7280";

  const opacity = status === "offline" ? 0.5 : 1;

  const svg = `
    <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"
         style="transform: rotate(${heading}deg); opacity: ${opacity}; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5));">
      <circle cx="16" cy="16" r="14" fill="${color}" fill-opacity="0.2" stroke="${color}" stroke-width="2"/>
      <path d="M16 6 L22 22 L16 18 L10 22 Z" fill="${color}" stroke="none"/>
    </svg>
  `;

  return L.divIcon({
    html: svg,
    className: "truck-marker",
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
}
