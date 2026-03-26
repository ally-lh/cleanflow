import { notFound } from "next/navigation";
import ProductClient from "./ProductClient";

interface ProductItem {
  id: number;
  image_path: string;
  category_name: string;
  brand: string;
  price: number;
  subscription_price: number;
  sizes: string[];
  description: string;
}

async function getProduct(id: number): Promise<ProductItem | null> {
  try {
    const res = await fetch(`${process.env.PYTHON_API_URL || "http://127.0.0.1:8000"}/catalog`, {
      cache: "no-store",
    });
    const data = await res.json();
    const items = data.items || [];
    return items.find((i: ProductItem) => i.id === id) || null;
  } catch {
    return null;
  }
}

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ProductPage({ params }: Props) {
  const { id } = await params;
  const itemId = parseInt(id);
  const item = await getProduct(itemId);

  if (!item) {
    notFound();
  }

  return <ProductClient item={item} />;
}
