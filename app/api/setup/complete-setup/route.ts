/**
 * Complete Setup API
 * 
 * POST: Save company info to database and mark setup as complete
 * Used when all env vars are already configured (resume mode)
 */

import { NextRequest, NextResponse } from 'next/server'
import { completeSetup } from '@/lib/user-auth'
import { setEnvVars, redeployLatest } from '@/lib/vercel-api'

export const runtime = 'nodejs' // Need Node.js for Supabase

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { companyName, companyAdmin, email, phone } = body as {
            companyName: string
            companyAdmin: string
            email: string
            phone: string
        }

        if (!companyName || !companyAdmin || !email || !phone) {
            return NextResponse.json(
                { error: 'Empresa, responsável, email e telefone são obrigatórios' },
                { status: 400 }
            )
        }

        // Save company info to database
        const result = await completeSetup(companyName, companyAdmin, email, phone)

        if (!result.success) {
            return NextResponse.json(
                { error: result.error },
                { status: 400 }
            )
        }

        // Try to save SETUP_COMPLETE to Vercel using server-side token
        const vercelToken = process.env.VERCEL_TOKEN
        const projectId = process.env.VERCEL_PROJECT_ID

        if (vercelToken && projectId) {
            try {
                await setEnvVars(vercelToken, projectId, [
                    { key: 'SETUP_COMPLETE', value: 'true' }
                ])
                // Trigger redeploy so the new env var takes effect
                await redeployLatest(vercelToken, projectId)
            } catch (err) {
                console.error('Failed to save SETUP_COMPLETE to Vercel:', err)
                // Continue anyway - user can add it manually if needed
            }
        }

        return NextResponse.json({
            success: true,
            company: result.company,
            message: 'Setup concluído! Faça login para continuar.'
        })

    } catch (error) {
        console.error('Complete setup error:', error)
        return NextResponse.json(
            { error: 'Erro ao finalizar setup' },
            { status: 500 }
        )
    }
}

