import { serve } from '@upstash/workflow/nextjs'
import { campaignDb, templateDb } from '@/lib/supabase-db'
import { supabase } from '@/lib/supabase'
import { CampaignStatus } from '@/types'
import { getUserFriendlyMessage } from '@/lib/whatsapp-errors'

interface Contact {
  phone: string
  name: string
  custom_fields?: Record<string, unknown>
  email?: string
}

interface CampaignWorkflowInput {
  campaignId: string
  templateName: string
  contacts: Contact[]
  templateVariables?: { header: string[], body: string[], buttons?: Record<string, string> }  // Meta API structure
  phoneNumberId: string
  accessToken: string
}

/**
 * Build template body parameters
 * {{1}} = contact name (dynamic per contact)
 * {{2}}, {{3}}, ... = static values from templateVariables
 */
function buildBodyParameters(contactName: string, templateVariables: string[] = []): Array<{ type: string; text: string }> {
  // First parameter is always the contact name
  const parameters = [{ type: 'text', text: contactName || 'Cliente' }]

  // Add static variables for {{2}}, {{3}}, etc.
  for (const value of templateVariables) {
    parameters.push({ type: 'text', text: value || '' })
  }

  return parameters
}

// Atualiza status do contato no banco (Supabase)
async function updateContactStatus(campaignId: string, phone: string, status: 'sent' | 'failed', messageId?: string, error?: string) {
  try {
    await supabase
      .from('campaign_contacts')
      .update({
        status,
        sent_at: new Date().toISOString(),
        message_id: messageId || null,
        error: error || null
      })
      .eq('campaign_id', campaignId)
      .eq('phone', phone)
  } catch (e) {
    console.error(`Failed to update contact status: ${phone}`, e)
  }
}

// Upstash Workflow - Durable background processing
// Each step is a separate HTTP request, bypasses Vercel 10s timeout
export const { POST } = serve<CampaignWorkflowInput>(
  async (context) => {
    const { campaignId, templateName, contacts, templateVariables, phoneNumberId, accessToken } = context.requestPayload

    // Step 1: Mark campaign as SENDING in Supabase
    await context.run('init-campaign', async () => {
      await campaignDb.updateStatus(campaignId, {
        status: CampaignStatus.SENDING,
        startedAt: new Date().toISOString()
      })

      console.log(`📊 Campaign ${campaignId} started with ${contacts.length} contacts`)
      console.log(`📝 Template variables: ${JSON.stringify(templateVariables || [])}`)
    })

    // Step 2: Process contacts in batches of 40
    // Each batch is a separate step = separate HTTP request = bypasses 10s limit
    const BATCH_SIZE = 40
    const batches: Contact[][] = []

    for (let i = 0; i < contacts.length; i += BATCH_SIZE) {
      batches.push(contacts.slice(i, i + BATCH_SIZE))
    }

    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex]

      await context.run(`send-batch-${batchIndex}`, async () => {
        let sentCount = 0
        let failedCount = 0

        for (const contact of batch) {
          try {
            // Check if campaign is paused (via Supabase)
            const { data: campaignStatus } = await supabase
              .from('campaigns')
              .select('status')
              .eq('id', campaignId)
              .single()

            if (campaignStatus?.status === CampaignStatus.PAUSED) {
              console.log(`⏸️ Campaign ${campaignId} is paused, skipping remaining`)
              break
            }

            // Send message via WhatsApp Cloud API
            // Fetch Template Definition (Smart Parsing)
            const template = await templateDb.getByName(templateName)
            if (!template) {
              console.warn(`[Workflow] Template ${templateName} not found in DB. Using legacy parsing.`)
            }

            const headerVars: string[] = []
            const bodyVars: string[] = []
            const buttonVars: string[] = []

            // Helper to resolve value (handles dynamic tokens like {{nome}}, {{telefone}}, {{email}}, and custom fields)
            // Supports both Portuguese (primary) and English (backward compat) formats
            const resolveValue = (key: string, explicitValue: string | undefined) => {
              let val = explicitValue || '';

              // Token replacement - Portuguese is primary, English for backward compat
              // {{nome}}, {{name}}, {{contact.name}} -> contact name
              if (val === '{{nome}}' || val === '{{name}}' || val === '{{contact.name}}') {
                return contact.name || 'Cliente';
              }
              // {{telefone}}, {{phone}}, {{contact.phone}} -> contact phone
              if (val === '{{telefone}}' || val === '{{phone}}' || val === '{{contact.phone}}') {
                return contact.phone;
              }
              // {{email}}, {{contact.email}} -> contact email
              if (val === '{{email}}' || val === '{{contact.email}}') {
                return (contact as any).email || (contact as any).custom_fields?.email || '';
              }

              // Check for custom field tokens like {{campo_personalizado}}
              const customFieldMatch = val.match(/^\{\{(\w+)\}\}$/);
              if (customFieldMatch) {
                const fieldName = customFieldMatch[1];
                const customFields = (contact as any).custom_fields || {};
                if (customFields[fieldName] !== undefined) {
                  return String(customFields[fieldName]);
                }
                // If custom field not found, return empty string to avoid sending literal {{field}}
                console.warn(`[Dispatch] Custom field "${fieldName}" not found for contact ${contact.phone}`);
                return '';
              }

              return val;
            };

            // [MODERNIZED] Structured Variable Parsing
            // The frontend now sends: { header: ["val1"], body: ["val1", "val2"], buttons: { "button_0_0": "param" } }
            if (template && Array.isArray(template.content)) {

              // 1. HEADER
              const headerComponent = template.content.find((c: any) => c.type === 'HEADER' && c.format === 'TEXT')
              if (headerComponent && headerComponent.text) {
                // MATCH: {{1}} OR {{variable_name}}
                const matches = headerComponent.text.match(/\{\{([\w\d_]+)\}\}/g) || [];
                matches.forEach((m: string, idx: number) => {
                  const clean = m.replace(/[{}]/g, '');

                  // New structure: templateVariables.header is an array
                  // templateVariables.header[0] corresponds to {{1}} in the header
                  let foundValue = undefined;

                  const tvars = templateVariables as { header?: string[], body?: string[], buttons?: Record<string, string> } | undefined;
                  if (tvars?.header && tvars.header[idx] !== undefined) {
                    foundValue = tvars.header[idx];
                  }

                  headerVars.push(resolveValue(clean, foundValue));
                });
              }

              // 2. BODY (deduplicate - same variable may appear multiple times in text)
              const bodyComponent = template.content.find((c: any) => c.type === 'BODY')
              if (bodyComponent && bodyComponent.text) {
                const matches = bodyComponent.text.match(/\{\{([\w\d_]+)\}\}/g) || [];
                const seenKeys = new Set<string>();
                matches.forEach((m: string) => {
                  const clean = m.replace(/[{}]/g, '');

                  // Skip if we've already processed this variable
                  if (seenKeys.has(clean)) return;
                  seenKeys.add(clean);

                  const idx = seenKeys.size - 1; // Use unique index based on Set size

                  // New structure: templateVariables.body is an array
                  // templateVariables.body[0] corresponds to {{1}} in the body
                  let foundValue = undefined;

                  const tvars = templateVariables as { header?: string[], body?: string[], buttons?: Record<string, string> } | undefined;
                  if (tvars?.body && tvars.body[idx] !== undefined) {
                    foundValue = tvars.body[idx];
                  }

                  bodyVars.push(resolveValue(clean, foundValue));
                });
              }

              // 3. BUTTONS
              const buttons = template.content.filter((c: any) => c.type === 'BUTTONS')
              buttons.forEach((btnComp: any) => {
                const btns = btnComp.buttons || []
                btns.forEach((btn: any, btnIndex: number) => {
                  if (btn.type === 'URL' && btn.url && btn.url.includes('{{')) {
                    const matches = btn.url.match(/\{\{\d+\}\}/g) || []
                    matches.forEach(() => {
                      // New structure: templateVariables.buttons is a Record<string, string>
                      // Key format: button_${btnIndex}_0
                      let rawValue = undefined;

                      const tvars = templateVariables as { header?: string[], body?: string[], buttons?: Record<string, string> } | undefined;
                      if (tvars?.buttons) {
                        rawValue = tvars.buttons[`button_${btnIndex}_0`];
                      }

                      buttonVars.push(resolveValue(`button`, rawValue));
                    });
                  }
                })
              })
            } else {
              // Fallback for when template is NOT in DB (Legacy / Race Condition)
              console.warn('[Workflow] Legacy Parsing Fallback')

              // Add contact name as first parameter
              const resolvedName = contact.name || 'Cliente';
              bodyVars.push(resolvedName);

              if (templateVariables) {
                const vars = Array.isArray(templateVariables)
                  ? templateVariables
                  : Object.values(templateVariables);

                // Apply token resolution to each value and skip duplicates
                vars.forEach(val => {
                  const resolved = resolveValue('legacy', val);
                  // Skip if it resolves to the same as contact.name (already added)
                  // This prevents sending {{contact.name}} twice
                  if (resolved !== resolvedName) {
                    bodyVars.push(resolved);
                  }
                });
              }
            }

            const whatsappPayload: any = {
              messaging_product: 'whatsapp',
              to: contact.phone,
              type: 'template',
              template: {
                name: templateName,
                language: { code: 'pt_BR' },
                components: [],
              },
            }

            // Assemble Components
            if (headerVars.length > 0) {
              whatsappPayload.template.components.push({
                type: 'header',
                parameters: headerVars.map(text => ({ type: 'text', text }))
              })
            }

            if (bodyVars.length > 0) {
              whatsappPayload.template.components.push({
                type: 'body',
                parameters: bodyVars.map(text => ({ type: 'text', text }))
              })
            }

            if (buttonVars.length > 0) {
              whatsappPayload.template.components.push({
                type: 'button',
                sub_type: 'url',
                index: 0,
                parameters: buttonVars.map(text => ({ type: 'text', text }))
              })
            }

            console.log('--- META API PAYLOAD (SMART) ---', JSON.stringify(whatsappPayload, null, 2))

            const response = await fetch(
              `https://graph.facebook.com/v24.0/${phoneNumberId}/messages`,
              {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${accessToken}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify(whatsappPayload),
              }
            )

            const data = await response.json()

            if (response.ok && data.messages?.[0]?.id) {
              const messageId = data.messages[0].id

              // Update contact status in Supabase (stores message_id for webhook lookup)
              await updateContactStatus(campaignId, contact.phone, 'sent', messageId)

              sentCount++
              console.log(`✅ Sent to ${contact.phone}`)
            } else {
              // Extract error code and translate to Portuguese
              const errorCode = data.error?.code || 0
              const originalError = data.error?.message || 'Unknown error'
              const translatedError = getUserFriendlyMessage(errorCode) || originalError
              const errorWithCode = `(#${errorCode}) ${translatedError}`

              // Update contact status in Supabase
              await updateContactStatus(campaignId, contact.phone, 'failed', undefined, errorWithCode)

              failedCount++
              console.log(`❌ Failed ${contact.phone}: ${errorWithCode}`)
            }

            // Small delay between messages (15ms ~ 66 msgs/sec)
            await new Promise(resolve => setTimeout(resolve, 15))

          } catch (error) {
            // Update contact status in Supabase
            const errorMsg = error instanceof Error ? error.message : 'Erro desconhecido'
            await updateContactStatus(campaignId, contact.phone, 'failed', undefined, errorMsg)
            failedCount++
            console.error(`❌ Error sending to ${contact.phone}:`, error)
          }
        }

        // Update stats in Supabase (source of truth)
        // Supabase Realtime will propagate changes to frontend
        const campaign = await campaignDb.getById(campaignId)
        if (campaign) {
          await campaignDb.updateStatus(campaignId, {
            sent: campaign.sent + sentCount,
            failed: campaign.failed + failedCount
          })
        }

        console.log(`📦 Batch ${batchIndex + 1}/${batches.length}: ${sentCount} sent, ${failedCount} failed`)
      })
    }

    // Step 3: Mark campaign as completed
    await context.run('complete-campaign', async () => {
      const campaign = await campaignDb.getById(campaignId)

      let finalStatus = CampaignStatus.COMPLETED
      if (campaign && campaign.failed === campaign.recipients && campaign.recipients > 0) {
        finalStatus = CampaignStatus.FAILED
      }

      await campaignDb.updateStatus(campaignId, {
        status: finalStatus,
        completedAt: new Date().toISOString()
      })

      console.log(`🎉 Campaign ${campaignId} completed!`)
    })
  },
  {
    baseUrl: process.env.NEXT_PUBLIC_APP_URL?.trim()
      || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL.trim()}` : undefined)
      || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL.trim()}` : undefined),
    retries: 3,
  }
)
