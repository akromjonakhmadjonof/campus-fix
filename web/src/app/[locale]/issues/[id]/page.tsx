import { ReportDetail } from "@/components/campus/detail";
export default async function Detail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ReportDetail id={id} />;
}
