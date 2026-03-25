import CatalogClient from "./CatalogClient";

interface CatalogItem {
  id: number;
  image_path: string;
  category_label: number;
  category_name: string;
  brand: string;
  price: number;
  subscription_price: number;
  sizes: string[];
  description: string;
}

async function getCatalog() {
  try {
    const res = await fetch(`${process.env.PYTHON_API_URL || "http://127.0.0.1:8000"}/catalog`, {
      cache: "no-store",
    });
    const data = await res.json();
    return data.items || [];
  } catch {
    return [];
  }
}

export default async function CatalogPage() {
  const items = await getCatalog();
  return <CatalogClient initialItems={items as CatalogItem[]} />;
}
