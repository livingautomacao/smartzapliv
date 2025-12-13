import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { normalizePhoneNumber, validateAnyPhoneNumber } from '@/lib/phone-formatter'

export const runtime = 'nodejs'

export async function GET() {
    try {
        // STEP 1: Verificar se o banco está inicializado
        const { data: tables, error: checkError } = await supabase
            .from('settings')
            .select('key')
            .limit(1)

        if (checkError && checkError.message.includes('relation "settings" does not exist')) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Banco ainda não inicializado (tabelas ausentes). Execute o SQL de inicialização no Supabase e tente novamente.',
                },
                { status: 400 }
            )
        }

        // STEP 2: Init company
        // Check if we have company info in env vars (set during wizard)
        const companyName = process.env.SETUP_COMPANY_NAME
        const companyAdmin = process.env.SETUP_COMPANY_ADMIN
        const companyEmail = process.env.SETUP_COMPANY_EMAIL
        const companyPhone = process.env.SETUP_COMPANY_PHONE

        if (!companyName || !companyAdmin || !companyEmail || !companyPhone) {
            return NextResponse.json({
                success: false,
                message: 'No company info in environment'
            })
        }

        const phoneValidation = validateAnyPhoneNumber(companyPhone)
        if (!phoneValidation.isValid) {
            return NextResponse.json(
                {
                    success: false,
                    error: phoneValidation.error || 'Telefone inválido',
                },
                { status: 400 }
            )
        }

        const normalizedPhone = normalizePhoneNumber(companyPhone)
        const storedPhone = normalizedPhone.replace(/\D/g, '')

        // Try to save to database
        const now = new Date().toISOString()
        const companyId = crypto.randomUUID()

        // Check if company already exists
        const { data: existingCompany } = await supabase
            .from('settings')
            .select('key, value')
            .in('key', ['company_name', 'company_admin'])

        const existing: Record<string, string> = {}
        if (Array.isArray(existingCompany)) {
            for (const row of existingCompany) existing[row.key] = row.value
        }

        // Se a empresa já existe, garantimos apenas que company_admin exista.
        if (existing.company_name) {
            if (!existing.company_admin) {
                await supabase
                    .from('settings')
                    .upsert({ key: 'company_admin', value: companyAdmin.trim(), updated_at: now }, { onConflict: 'key' })

                return NextResponse.json({
                    success: true,
                    message: 'Company admin initialized successfully',
                })
            }

            return NextResponse.json({
                success: true,
                message: 'Company already initialized'
            })
        }

        // Save company info
        await Promise.all([
            supabase.from('settings').upsert({ key: 'company_id', value: companyId, updated_at: now }, { onConflict: 'key' }),
            supabase.from('settings').upsert({ key: 'company_name', value: companyName, updated_at: now }, { onConflict: 'key' }),
            supabase.from('settings').upsert({ key: 'company_admin', value: companyAdmin.trim(), updated_at: now }, { onConflict: 'key' }),
            supabase.from('settings').upsert({ key: 'company_email', value: companyEmail.toLowerCase(), updated_at: now }, { onConflict: 'key' }),
            supabase.from('settings').upsert({ key: 'company_phone', value: storedPhone, updated_at: now }, { onConflict: 'key' }),
            supabase.from('settings').upsert({ key: 'company_created_at', value: now, updated_at: now }, { onConflict: 'key' }),
        ])

        return NextResponse.json({
            success: true,
            message: 'Company initialized successfully',
            company: {
                id: companyId,
                name: companyName,
                email: companyEmail,
                phone: companyPhone
            }
        })

    } catch (error) {
        console.error('Init company error:', error)
        return NextResponse.json({
            success: false,
            error: 'Failed to initialize company'
        }, { status: 500 })
    }
}
