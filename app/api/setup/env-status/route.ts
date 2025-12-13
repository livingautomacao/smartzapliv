/**
 * API Route: Get Environment Variable Status
 * 
 * Returns which env vars are already configured (without exposing values)
 * Used by the wizard to skip already-configured steps
 */

import { NextResponse } from 'next/server'

export const runtime = 'edge'

export async function GET() {
    // Check which env vars exist (return boolean, not values for security)
    const status = {
        // Password
        masterPassword: !!process.env.MASTER_PASSWORD,

        // Supabase
        supabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        supabaseAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || !!process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY,
        supabaseServiceKey: !!process.env.SUPABASE_SECRET_KEY,

        // QStash (required)
        qstashToken: !!process.env.QSTASH_TOKEN,

        // Upstash Redis (optional / legacy)
        redisUrl: !!process.env.UPSTASH_REDIS_REST_URL,
        redisToken: !!process.env.UPSTASH_REDIS_REST_TOKEN,

        // WhatsApp
        whatsappToken: !!process.env.WHATSAPP_TOKEN,
        whatsappPhoneId: !!process.env.WHATSAPP_PHONE_ID,
        whatsappBusinessId: !!process.env.WHATSAPP_BUSINESS_ACCOUNT_ID,
    }

    // Calculate which steps are complete
    const steps = {
        password: status.masterPassword,
        database: status.supabaseUrl && status.supabaseAnonKey && status.supabaseServiceKey,
        // Backward-compat key name used by the wizard's step routing.
        // Step 3 is QStash-only now (Redis is optional).
        redis: status.qstashToken,
        // New explicit name (optional for clients)
        qstash: status.qstashToken,
        whatsapp: status.whatsappToken && status.whatsappPhoneId && status.whatsappBusinessId,
    }

    // WhatsApp é opcional no onboarding.
    // O mínimo para considerar a infra pronta é: senha + Supabase + QStash.
    const allConfigured = steps.password && steps.database && steps.redis

    // Check if we can use server-side Vercel token for resume operations
    const hasVercelToken = !!process.env.VERCEL_TOKEN

    return NextResponse.json({
        status,
        steps,
        allConfigured,
        hasVercelToken,
        // If infra is configured, user only needs to complete company info
        // (WhatsApp pode ser configurado depois em /settings)
        nextStep: allConfigured ? 5 :
            !steps.password ? 1 :
                !steps.database ? 2 :
                    !steps.redis ? 3 : 5
    })
}
