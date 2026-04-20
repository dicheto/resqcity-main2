import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { loadSignalRoutingTaxonomy } from '@/hooks/lib/taxonomy';
export const dynamic = 'force-dynamic';

const prisma = new PrismaClient();

interface RecipientGroup {
  recommendation: 'SITUATION' | 'SUBCATEGORY' | 'CATEGORY' | 'OTHER';
  label: string;
  recipients: Array<{
    id: string;
    name: string;
    email: string;
    phone: string;
    contactPerson?: string;
    isAdHoc: boolean;
  }>;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const reportId = searchParams.get('reportId');

    if (!reportId) {
      return NextResponse.json(
        { error: 'reportId is required' },
        { status: 400 }
      );
    }

    const report = await prisma.report.findUnique({
      where: { id: reportId },
      include: {
        category: true,
      },
    });

    if (!report) {
      return NextResponse.json(
        { error: 'Report not found' },
        { status: 404 }
      );
    }

    // Get all existing routing targets for this report
    const routingTargets = await prisma.reportRoutingTarget.findMany({
      where: { reportId },
      include: {
        institution: true,
        adHocInstitution: true,
      },
    });

    // Load taxonomy to extract institution names at each level
    const taxonomy = await loadSignalRoutingTaxonomy();
    
    // Find the category in taxonomy
    const taxonomyCategory = taxonomy.categories.find(
      (cat) => cat.name === report.category.nameBg
    );

    // Extract institution names per taxonomy level.
    const situationInstitutionNames = new Set<string>();
    const subcategoryInstitutionNames = new Set<string>();
    let taxonomySubcategory:
      | {
          responsible_bodies?: string[];
          situations?: Array<{ name: string; responsible_bodies?: string[] }>;
        }
      | undefined;

    if (taxonomyCategory && report.taxonomySubcategory) {
      taxonomySubcategory = taxonomyCategory.subcategories?.find(
        (sub) => sub.name === report.taxonomySubcategory
      );
    }

    if (taxonomySubcategory?.responsible_bodies) {
      taxonomySubcategory.responsible_bodies.forEach((body) => {
        subcategoryInstitutionNames.add(body);
      });
    }

    if (report.taxonomySituation && taxonomySubcategory?.situations) {
      const situation = taxonomySubcategory.situations.find(
        (sit) => sit.name === report.taxonomySituation
      );
      if (situation?.responsible_bodies) {
        situation.responsible_bodies.forEach((body) => {
          situationInstitutionNames.add(body);
        });
      }
    }

    // Extract institution names from category level
    const categoryInstitutionNames = new Set<string>();
    if (taxonomyCategory?.category_responsible_bodies) {
      taxonomyCategory.category_responsible_bodies.forEach((body) => 
        categoryInstitutionNames.add(body)
      );
    }

    // Get all active institutions
    const allInstitutions = await prisma.institution.findMany({
      where: { active: true },
      select: {
        id: true,
        name: true,
        email: true,
      },
    });

    // Group institutions by priority without duplicates:
    // SITUATION -> SUBCATEGORY -> CATEGORY -> OTHER.
    const situationInstitutions = allInstitutions.filter((inst) =>
      situationInstitutionNames.has(inst.name)
    );

    const subcategoryOnlyInstitutions = allInstitutions.filter(
      (inst) =>
        subcategoryInstitutionNames.has(inst.name) && !situationInstitutionNames.has(inst.name)
    );

    const categoryOnlyInstitutions = allInstitutions.filter(
      (inst) =>
        categoryInstitutionNames.has(inst.name) &&
        !situationInstitutionNames.has(inst.name) &&
        !subcategoryInstitutionNames.has(inst.name)
    );

    const otherInstitutions = allInstitutions.filter(
      (inst) =>
        !situationInstitutionNames.has(inst.name) &&
        !subcategoryInstitutionNames.has(inst.name) &&
        !categoryInstitutionNames.has(inst.name)
    );

    // Get ad-hoc institutions already added for this report
    const existingAdHocInstitutions = await prisma.adHocInstitution.findMany({
      where: { reportId },
    });

    // Get existing customizations
    const customizations = await prisma.reportRecipientCustomization.findMany({
      where: { reportId },
    });

    const groups: RecipientGroup[] = [
      {
        recommendation: 'SITUATION',
        label: 'Институции свързани със сигнала',
        recipients: situationInstitutions.map((i) => ({
          id: i.id,
          name: i.name,
          email: i.email || '',
          phone: '',
          isAdHoc: false,
        })),
      },
      {
        recommendation: 'SUBCATEGORY',
        label: 'Институции, свързани с подкатегорията',
        recipients: subcategoryOnlyInstitutions.map((i) => ({
          id: i.id,
          name: i.name,
          email: i.email || '',
          phone: '',
          isAdHoc: false,
        })),
      },
      {
        recommendation: 'CATEGORY',
        label: 'Институции, свързани с категорията',
        recipients: categoryOnlyInstitutions.map((i) => ({
          id: i.id,
          name: i.name,
          email: i.email || '',
          phone: '',
          isAdHoc: false,
        })),
      },
      {
        recommendation: 'OTHER',
        label: 'Други институции',
        recipients: [
          ...otherInstitutions.map((i) => ({
            id: i.id,
            name: i.name,
            email: i.email || '',
            phone: '',
            isAdHoc: false,
          })),
          ...existingAdHocInstitutions.map((a) => ({
            id: a.id,
            name: a.name,
            email: a.email || '',
            phone: a.phone || '',
            contactPerson: a.contactPerson,
            isAdHoc: true,
          })),
        ],
      },
    ];

    return NextResponse.json({
      groups,
      selected: routingTargets.map((t) => ({
        id: t.id,
        recipientId: t.institutionId || t.adHocInstitutionId,
        isAdHoc: !!t.adHocInstitutionId,
        recommendation: t.recommendation,
      })),
      customizations: customizations.map((c) => ({
        routingTargetId: c.routingTargetId,
        customName: c.customName,
        customEmail: c.customEmail,
        customPhone: c.customPhone,
        customNotes: c.customNotes,
      })),
    });
  } catch (error) {
    console.error('Error fetching grouped recipients:', error);
    return NextResponse.json(
      { error: 'Failed to fetch recipients' },
      { status: 500 }
    );
  }
}
