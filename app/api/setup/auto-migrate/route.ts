import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { promises as fs } from 'fs'
import path from 'path'

export const runtime = 'nodejs' // Force Node.js runtime to access filesystem

export async function GET() {
    try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
        const supabaseServiceKey = process.env.SUPABASE_SECRET_KEY

        if (!supabaseUrl || !supabaseServiceKey) {
            return NextResponse.json({ error: 'Supabase not configured' }, { status: 400 })
        }

        const supabase = createClient(supabaseUrl, supabaseServiceKey, {
            auth: { persistSession: false }
        })

        // Check if tables exist
        const { data: tables, error: checkError } = await supabase
            .from('settings')
            .select('key')
            .limit(1)

        // If tables exist, skip migration
        if (!checkError) {
            return NextResponse.json({
                success: true,
                message: 'Database already initialized',
                migrated: false
            })
        }

        // Tables don't exist, run migration
        console.log('Running database migration...')

        const sqlPath = path.join(process.cwd(), 'lib', 'migrations', '0001_initial_schema.sql')
        const sql = await fs.readFile(sqlPath, 'utf-8')

        // Execute migration using Supabase SQL endpoint
        const { error: migrationError } = await supabase.rpc('exec_sql', { sql_query: sql })

        if (migrationError) {
            return NextResponse.json(
                {
                    error: 'Falha ao executar migração via RPC (exec_sql). Rode o SQL manualmente no Supabase SQL Editor.',
                    details: migrationError.message,
                },
                { status: 500 }
            )
        }

        return NextResponse.json({
            success: true,
            message: 'Database migrated successfully',
            migrated: true
        })

    } catch (error) {
        console.error('Auto-migration error:', error)
        return NextResponse.json(
            { error: 'Migration failed', details: error instanceof Error ? error.message : String(error) },
            { status: 500 }
        )
    }
}
