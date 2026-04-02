export type PostalSector = `${number}${number}`;

// Source: URA "List of Postal Districts" (SingPost)
// https://www.ura.gov.sg/Corporate/-/media/Corporate/Property/PMI-Online/List_Of_Postal_Districts.pdf
const SECTOR_TO_GENERAL_LOCATION: Record<string, string> = {
  "01": "Raffles Place, Cecil, Marina, People's Park",
  "02": "Raffles Place, Cecil, Marina, People's Park",
  "03": "Raffles Place, Cecil, Marina, People's Park",
  "04": "Raffles Place, Cecil, Marina, People's Park",
  "05": "Raffles Place, Cecil, Marina, People's Park",
  "06": "Raffles Place, Cecil, Marina, People's Park",
  "07": "Anson, Tanjong Pagar",
  "08": "Anson, Tanjong Pagar",
  "09": "Telok Blangah, Harbourfront",
  "10": "Telok Blangah, Harbourfront",
  "11": "Pasir Panjang, Hong Leong Garden, Clementi New Town",
  "12": "Pasir Panjang, Hong Leong Garden, Clementi New Town",
  "13": "Pasir Panjang, Hong Leong Garden, Clementi New Town",
  "14": "Queenstown, Tiong Bahru",
  "15": "Queenstown, Tiong Bahru",
  "16": "Queenstown, Tiong Bahru",
  "17": "High Street, Beach Road (part)",
  "18": "Middle Road, Golden Mile",
  "19": "Middle Road, Golden Mile",
  "20": "Little India",
  "21": "Little India",
  "22": "Orchard, Cairnhill, River Valley",
  "23": "Orchard, Cairnhill, River Valley",
  "24": "Ardmore, Bukit Timah, Holland Road, Tanglin",
  "25": "Ardmore, Bukit Timah, Holland Road, Tanglin",
  "26": "Ardmore, Bukit Timah, Holland Road, Tanglin",
  "27": "Ardmore, Bukit Timah, Holland Road, Tanglin",
  "28": "Watten Estate, Novena, Thomson",
  "29": "Watten Estate, Novena, Thomson",
  "30": "Watten Estate, Novena, Thomson",
  "31": "Balestier, Toa Payoh, Serangoon",
  "32": "Balestier, Toa Payoh, Serangoon",
  "33": "Balestier, Toa Payoh, Serangoon",
  "34": "Macpherson, Braddell",
  "35": "Macpherson, Braddell",
  "36": "Macpherson, Braddell",
  "37": "Macpherson, Braddell",
  "38": "Geylang, Eunos",
  "39": "Geylang, Eunos",
  "40": "Geylang, Eunos",
  "41": "Geylang, Eunos",
  "42": "Katong, Joo Chiat, Amber Road",
  "43": "Katong, Joo Chiat, Amber Road",
  "44": "Katong, Joo Chiat, Amber Road",
  "45": "Katong, Joo Chiat, Amber Road",
  "46": "Bedok, Upper East Coast, Eastwood, Kew Drive",
  "47": "Bedok, Upper East Coast, Eastwood, Kew Drive",
  "48": "Bedok, Upper East Coast, Eastwood, Kew Drive",
  "49": "Loyang, Changi",
  "50": "Loyang, Changi",
  "51": "Tampines, Pasir Ris",
  "52": "Tampines, Pasir Ris",
  "53": "Serangoon Garden, Hougang, Punggol",
  "54": "Serangoon Garden, Hougang, Punggol",
  "55": "Serangoon Garden, Hougang, Punggol",
  "56": "Bishan, Ang Mo Kio",
  "57": "Bishan, Ang Mo Kio",
  "58": "Upper Bukit Timah, Clementi Park, Ulu Pandan",
  "59": "Upper Bukit Timah, Clementi Park, Ulu Pandan",
  "60": "Jurong",
  "61": "Jurong",
  "62": "Jurong",
  "63": "Jurong",
  "64": "Jurong",
  "65": "Hillview, Dairy Farm, Bukit Panjang, Choa Chu Kang",
  "66": "Hillview, Dairy Farm, Bukit Panjang, Choa Chu Kang",
  "67": "Hillview, Dairy Farm, Bukit Panjang, Choa Chu Kang",
  "68": "Hillview, Dairy Farm, Bukit Panjang, Choa Chu Kang",
  "69": "Lim Chu Kang, Tengah",
  "70": "Lim Chu Kang, Tengah",
  "71": "Lim Chu Kang, Tengah",
  "72": "Kranji, Woodgrove",
  "73": "Kranji, Woodgrove",
  "75": "Yishun, Sembawang",
  "76": "Yishun, Sembawang",
  "77": "Upper Thomson, Springleaf",
  "78": "Upper Thomson, Springleaf",
  "79": "Seletar",
  "80": "Seletar",
  "81": "Loyang, Changi",
  "82": "Serangoon Garden, Hougang, Punggol",
};

export function formatPostalSectorLabel(sector: string | undefined | null): string {
  const raw = String(sector ?? "").trim();
  if (!raw) return "—";
  const normalized = raw.padStart(2, "0").slice(0, 2);
  const loc = SECTOR_TO_GENERAL_LOCATION[normalized];
  return loc ? `${loc} (${normalized})` : normalized;
}

export function formatPostalSectorName(sector: string | undefined | null): string {
  const raw = String(sector ?? "").trim();
  if (!raw) return "—";
  const normalized = raw.padStart(2, "0").slice(0, 2);
  const loc = SECTOR_TO_GENERAL_LOCATION[normalized];
  if (!loc) return normalized;
  // Prefer the first location label to keep charts readable.
  return loc.split(",")[0]?.trim() || loc;
}

export function formatPostalSectorShort(sector: string | undefined | null): string {
  const raw = String(sector ?? "").trim();
  if (!raw) return "—";
  return raw.padStart(2, "0").slice(0, 2);
}

