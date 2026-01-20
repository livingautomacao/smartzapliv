import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const RequestSchema = z.object({
  accessToken: z.string().min(1, 'Access token é obrigatório'),
});

interface SupabaseOrganization {
  id: string;
  slug: string;
  name: string;
  billing_email: string | null;
  subscription_id?: string;
  plan?: string;
  // Enriquecido pelo preflight
  activeProjectCount?: number;
}

/**
 * Lista organizações Supabase do usuário usando o Personal Access Token.
 *
 * POST /api/installer/supabase/organizations
 * Body: { accessToken: string }
 *
 * Retorna lista de organizações com informações de plano.
 */
export async function POST(request: NextRequest) {
  if (process.env.INSTALLER_ENABLED === 'false') {
    return NextResponse.json({ error: 'Installer desabilitado' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const parsed = RequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Dados inválidos' },
        { status: 400 }
      );
    }

    const { accessToken } = parsed.data;

    // 1. Listar organizações
    const orgsRes = await fetch('https://api.supabase.com/v1/organizations', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!orgsRes.ok) {
      if (orgsRes.status === 401) {
        return NextResponse.json(
          { error: 'Token inválido ou expirado. Gere um novo token em supabase.com/dashboard/account/tokens' },
          { status: 401 }
        );
      }
      return NextResponse.json(
        { error: `Erro ao acessar Supabase API: ${orgsRes.status}` },
        { status: orgsRes.status }
      );
    }

    const orgs: SupabaseOrganization[] = await orgsRes.json();

    // 2. Listar todos os projetos para contar por organização
    const projectsRes = await fetch('https://api.supabase.com/v1/projects', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    let projectCountByOrg: Record<string, number> = {};
    if (projectsRes.ok) {
      const projects = await projectsRes.json();
      // Contar apenas projetos ATIVOS
      projects.forEach((p: { organization_id: string; status: string }) => {
        if (p.status === 'ACTIVE_HEALTHY' || p.status === 'ACTIVE') {
          projectCountByOrg[p.organization_id] = (projectCountByOrg[p.organization_id] || 0) + 1;
        }
      });
    }

    // 3. Enriquecer organizações com contagem e plano
    const enrichedOrgs = orgs.map((org) => ({
      id: org.id,
      slug: org.slug,
      name: org.name,
      plan: org.subscription_id ? 'pro' : 'free', // Simplificado: com subscription = pro
      activeProjectCount: projectCountByOrg[org.id] || 0,
      // Free tier: máximo 2 projetos ativos
      hasSlot: org.subscription_id ? true : (projectCountByOrg[org.id] || 0) < 2,
    }));

    // 4. Ordenar: pagas primeiro, depois free com slot
    enrichedOrgs.sort((a, b) => {
      // Pagas primeiro
      if (a.plan !== 'free' && b.plan === 'free') return -1;
      if (a.plan === 'free' && b.plan !== 'free') return 1;
      // Entre as free, quem tem slot primeiro
      if (a.hasSlot && !b.hasSlot) return -1;
      if (!a.hasSlot && b.hasSlot) return 1;
      return 0;
    });

    return NextResponse.json({
      success: true,
      organizations: enrichedOrgs,
    });
  } catch (error) {
    console.error('[supabase/organizations] Erro:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro interno' },
      { status: 500 }
    );
  }
}
