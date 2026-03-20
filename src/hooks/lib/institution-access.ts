import { prisma } from '@/hooks/lib/prisma';

export async function getUserInstitutionIds(userId: string): Promise<string[]> {
  const links = await prisma.institutionAccount.findMany({
    where: { userId },
    select: { institutionId: true },
  });

  return links.map((link) => link.institutionId);
}

export async function canInstitutionAccessReport(userId: string, reportId: string): Promise<boolean> {
  const institutionIds = await getUserInstitutionIds(userId);

  if (institutionIds.length === 0) {
    return false;
  }

  const target = await prisma.reportRoutingTarget.findFirst({
    where: {
      reportId,
      included: true,
      institutionId: { in: institutionIds },
    },
    select: { id: true },
  });

  return Boolean(target);
}
