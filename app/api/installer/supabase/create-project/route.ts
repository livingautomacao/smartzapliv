import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const RequestSchema = z.object({
  accessToken: z.string().min(1, 'Access token é obrigatório'),
  organizationId: z.string().min(1, 'Organization ID é obrigatório'),
  name: z.string().min(1, 'Nome do projeto é obrigatório'),
  dbPass: z.string().min(8, 'Senha do banco deve ter no mínimo 8 caracteres'),
  region: z.string().default('us-east-1'),
});

/**
 * Cria um novo projeto Supabase.
 *
 * POST /api/installer/supabase/create-project
 * Body: { accessToken, organizationId, name, dbPass, region }
 *
 * Retorna os dados do projeto criado (id serve como projectRef).
 * Status 409 indica que o nome já existe (tentar outro nome).
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

    const { accessToken, organizationId, name, dbPass, region } = parsed.data;

    // Criar projeto via Supabase Management API
    const createRes = await fetch('https://api.supabase.com/v1/projects', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        organization_id: organizationId,
        name,
        db_pass: dbPass,
        region,
        plan: 'free', // Sempre começa como free
      }),
    });

    if (!createRes.ok) {
      const errorData = await createRes.json().catch(() => ({}));

      // Nome já existe
      if (createRes.status === 409 || errorData.message?.includes('already exists')) {
        return NextResponse.json(
          { error: 'Nome de projeto já existe', code: 'NAME_EXISTS' },
          { status: 409 }
        );
      }

      // Limite de projetos atingido
      if (errorData.message?.includes('limit') || errorData.message?.includes('quota')) {
        return NextResponse.json(
          { error: 'Limite de projetos free atingido. Pause um projeto ou use outra organização.', code: 'LIMIT_REACHED' },
          { status: 403 }
        );
      }

      if (createRes.status === 401) {
        return NextResponse.json(
          { error: 'Token inválido ou expirado' },
          { status: 401 }
        );
      }

      return NextResponse.json(
        { error: errorData.message || `Erro ao criar projeto: ${createRes.status}` },
        { status: createRes.status }
      );
    }

    const project = await createRes.json();

    return NextResponse.json({
      success: true,
      project: {
        id: project.id,           // Este é o projectRef
        name: project.name,
        region: project.region,
        status: project.status,
        organizationId: project.organization_id,
        // URL base do projeto
        url: `https://${project.id}.supabase.co`,
      },
    });
  } catch (error) {
    console.error('[supabase/create-project] Erro:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro interno' },
      { status: 500 }
    );
  }
}
