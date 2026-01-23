import PrintWorkPlansByDateClient from "./PrintWorkPlansByDateClient";

type PrintWorkPlansByDatePageProps = {
  params: Promise<{ date: string }>;
};

export default async function PrintWorkPlansByDatePage({ params }: PrintWorkPlansByDatePageProps) {
  const resolvedParams = await params;
  return <PrintWorkPlansByDateClient date={resolvedParams.date} />;
}


