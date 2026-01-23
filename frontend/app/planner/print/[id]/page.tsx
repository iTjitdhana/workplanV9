import PrintWorkPlanClient from "./PrintWorkPlanClient";

type PrintPageProps = {
  params: Promise<{ id: string }>;
};

export default async function PrintWorkPlanPage({ params }: PrintPageProps) {
  const resolvedParams = await params;
  return <PrintWorkPlanClient workPlanId={resolvedParams.id} />;
}

