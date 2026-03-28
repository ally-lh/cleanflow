import { notFound } from "next/navigation";
import RentProductClient from "./RentProductClient";
import { rentalCatalog } from "@/data/rentalCatalog";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function RentProductPage({ params }: Props) {
  const { id } = await params;
  const item = rentalCatalog.find((i) => i.id === id);

  if (!item) {
    notFound();
  }

  return <RentProductClient item={item} />;
}

export async function generateStaticParams() {
  return rentalCatalog.map((item) => ({
    id: item.id,
  }));
}
