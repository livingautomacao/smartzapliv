import { NextResponse } from 'next/server'
import { contactDb } from '@/lib/supabase-db'
import {
  CreateContactSchema,
  DeleteContactsSchema,
  validateBody,
  formatZodErrors
} from '@/lib/api-validation'

export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * GET /api/contacts
 * Lista todos os contatos do banco (Supabase)
 */
export async function GET() {
  try {
    const contacts = await contactDb.getAll()
    return NextResponse.json(contacts, {
      headers: {
        'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60'
      }
    })
  } catch (error) {
    console.error('Failed to fetch contacts:', error)
    return NextResponse.json(
      { error: 'Falha ao buscar contatos' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/contacts
 * Add a single contact
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()

    // Validate input
    const validation = validateBody(CreateContactSchema, body)
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: formatZodErrors(validation.error) },
        { status: 400 }
      )
    }

    // Normalize null to undefined for optional fields
    const contactData = {
      ...validation.data,
      email: validation.data.email ?? undefined,
    }

    const contact = await contactDb.add(contactData)
    return NextResponse.json(contact, { status: 201 })
  } catch (error: any) {
    console.error('Failed to add contact:', error)
    return NextResponse.json(
      { error: 'Falha ao adicionar contato', details: error.message },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/contacts
 * Delete multiple contacts by IDs
 */
export async function DELETE(request: Request) {
  try {
    const body = await request.json()

    // Validate input
    const validation = validateBody(DeleteContactsSchema, body)
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: formatZodErrors(validation.error) },
        { status: 400 }
      )
    }

    const deleted = await contactDb.deleteMany(validation.data.ids)
    return NextResponse.json({ deleted })
  } catch (error) {
    console.error('Failed to delete contacts:', error)
    return NextResponse.json(
      { error: 'Falha ao deletar contatos' },
      { status: 500 }
    )
  }
}
