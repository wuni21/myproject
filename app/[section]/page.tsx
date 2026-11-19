import { notFound } from "next/navigation";
import { Dashboard, type Section } from "@/components/dashboard/dashboard";

const sections = ["schedule", "car", "family", "resources", "share"] as const;

export default async function SectionPage({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  if (!sections.includes(section as (typeof sections)[number])) notFound();
  return <Dashboard section={(section === "share" ? "resources" : section) as Section} />;
}