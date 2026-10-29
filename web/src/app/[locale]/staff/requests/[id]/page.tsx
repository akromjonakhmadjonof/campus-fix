import { ReportDetail } from "@/components/campus/detail";
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ReportDetail id={id} staffView />;
}
