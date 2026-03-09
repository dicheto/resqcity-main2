import { NextRequest, NextResponse } from 'next/server';
import { authMiddleware } from '@/hooks/lib/middleware';
import { prisma } from '@/hooks/lib/prisma';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const authResult = await authMiddleware(request, ['ADMIN', 'MUNICIPAL_COUNCILOR']);

  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const institution = await prisma.institution.findUnique({
      where: { id: params.id },
      include: {
        categoryMappings: {
          include: {
            category: {
              select: {
                id: true,
                name: true,
                nameBg: true,
              },
            },
          },
        },
      },
    });

    if (!institution) {
      return NextResponse.json({ error: 'Institution not found' }, { status: 404 });
    }

    return NextResponse.json({ institution });
  } catch (error) {
    console.error('Institution fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch institution' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const authResult = await authMiddleware(request, ['ADMIN', 'MUNICIPAL_COUNCILOR']);

  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const body = await request.json();
    const { name, email, phone, notes, active, categoryIds, latitude, longitude } = body;

    // Update institution
    const institution = await prisma.institution.update({
      where: { id: params.id },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(email !== undefined && { email: email || null }),
        ...(phone !== undefined && { phone: phone || null }),
        ...(notes !== undefined && { notes: notes || null }),
        ...(active !== undefined && { active }),
        ...(latitude !== undefined && { latitude: latitude != null ? Number(latitude) : null }),
        ...(longitude !== undefined && { longitude: longitude != null ? Number(longitude) : null }),
      },
    });

    // Update category mappings if provided
    if (Array.isArray(categoryIds)) {
      // Remove existing mappings
      await prisma.categoryInstitution.deleteMany({
        where: { institutionId: params.id },
      });

      // Add new mappings
      if (categoryIds.length > 0) {
        await prisma.categoryInstitution.createMany({
          data: categoryIds.map((categoryId) => ({
            categoryId,
            institutionId: params.id,
          })),
          skipDuplicates: true,
        });
      }
    }

    // Fetch updated institution with relations
    const updatedInstitution = await prisma.institution.findUnique({
      where: { id: params.id },
      include: {
        categoryMappings: {
          include: {
            category: {
              select: {
                id: true,
                name: true,
                nameBg: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json({ institution: updatedInstitution });
  } catch (error) {
    console.error('Institution update error:', error);
    return NextResponse.json({ error: 'Failed to update institution' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const authResult = await authMiddleware(request, ['ADMIN', 'MUNICIPAL_COUNCILOR']);

  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    // Check if institution has any reports assigned
    const reportsCount = await prisma.reportRoutingTarget.count({
      where: { institutionId: params.id },
    });

    if (reportsCount > 0) {
      // Soft delete - mark as inactive
      await prisma.institution.update({
        where: { id: params.id },
        data: { active: false },
      });

      return NextResponse.json({
        message: 'Institution has assigned reports. Marked as inactive instead of deleting.',
        softDelete: true,
      });
    }

    // Hard delete if no reports assigned
    await prisma.institution.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ message: 'Institution deleted successfully' });
  } catch (error) {
    console.error('Institution delete error:', error);
    return NextResponse.json({ error: 'Failed to delete institution' }, { status: 500 });
  }
}
