import { serve } from "@upstash/workflow/nextjs";
import { nanoid } from "nanoid";
import { ensureWorkflow } from "@/lib/builder/mock-workflow-store";
import { getWhatsAppCredentials } from "@/lib/whatsapp-credentials";
import { buildTextMessage } from "@/lib/whatsapp/text";
import { validateWorkflowSchema } from "@/lib/shared/workflow-schema";
import { WhatsAppSendTextRequestSchema } from "@/lib/shared/whatsapp-schema";
import { getSupabaseAdmin } from "@/lib/supabase";

type BuilderWorkflowInput = {
  workflowId: string;
  input?: {
    to?: string;
    message?: string;
    previewUrl?: boolean;
  };
};

const SEND_MESSAGE_ACTIONS = new Set(["Send Message", "whatsapp/send-message"]);
const toBoolean = (value: unknown): boolean | undefined => {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    if (value === "true") return true;
    if (value === "false") return false;
  }
  return undefined;
};

export const { POST } = serve<BuilderWorkflowInput>(async (context) => {
  const { workflowId, input } = context.requestPayload;
  const workflow = ensureWorkflow(workflowId);
  const validation = validateWorkflowSchema(workflow);
  if (!validation.success) {
    return {
      executionId: nanoid(),
      status: "failed",
      error: "Invalid workflow",
      details: validation.errors,
    };
  }

  const triggerNode = workflow.nodes.find((node) => node.data.type === "trigger");
  const triggerType = triggerNode?.data.config?.triggerType as
    | string
    | undefined;
  const inboundMessage = input?.message || "";

  if (triggerType === "Keywords") {
    const keywordListRaw = triggerNode?.data.config?.keywordList as
      | string
      | undefined;
    const keywords = (keywordListRaw || "")
      .split(/\r?\n/)
      .map((entry) => entry.trim())
      .filter(Boolean);
    const normalizedMessage = inboundMessage.toLowerCase();

    if (!normalizedMessage) {
      return {
        executionId: nanoid(),
        status: "skipped",
        output: { reason: "missing_message" },
      };
    }

    const matched = keywords.some((keyword) =>
      normalizedMessage.includes(keyword.toLowerCase())
    );
    if (!matched) {
      return {
        executionId: nanoid(),
        status: "skipped",
        output: { reason: "keyword_not_matched" },
      };
    }
  }

  const actions = workflow.nodes.filter((node) => node.data.type === "action");
  if (actions.length === 0) {
    return {
      executionId: nanoid(),
      status: "success",
      output: { skipped: true, reason: "no_action_nodes" },
    };
  }

  const credentials = await getWhatsAppCredentials();
  if (!credentials) {
    return {
      executionId: nanoid(),
      status: "failed",
      error: "WhatsApp not configured",
    };
  }

  const executionId = nanoid();
  const supabase = getSupabaseAdmin();
  if (supabase) {
    await supabase.from("workflow_builder_executions").insert({
      id: executionId,
      workflow_id: workflowId,
      status: "running",
      input: input ?? {},
      started_at: new Date().toISOString(),
    });
  }
  const results: Array<{ nodeId: string; status: string; result?: unknown }> =
    [];

  for (const node of actions) {
    const actionType = String(node.data.config?.actionType || node.data.label);
    if (!SEND_MESSAGE_ACTIONS.has(actionType)) {
      if (supabase) {
        await supabase.from("workflow_builder_logs").insert({
          execution_id: executionId,
          node_id: node.id,
          node_name: node.data.label,
          node_type: node.data.type,
          status: "skipped",
          input: {},
          started_at: new Date().toISOString(),
          completed_at: new Date().toISOString(),
        });
      }
      results.push({ nodeId: node.id, status: "skipped" });
      continue;
    }

    const textBody =
      (node.data.config?.message as string | undefined) ||
      input?.message ||
      "";
    const to =
      (node.data.config?.to as string | undefined) ||
      input?.to ||
      "";

    if (!to || !textBody) {
      if (supabase) {
        await supabase.from("workflow_builder_logs").insert({
          execution_id: executionId,
          node_id: node.id,
          node_name: node.data.label,
          node_type: node.data.type,
          status: "skipped",
          input: { to, message: textBody },
          output: { reason: "missing_to_or_message" },
          started_at: new Date().toISOString(),
          completed_at: new Date().toISOString(),
        });
      }
      results.push({
        nodeId: node.id,
        status: "skipped",
        result: { reason: "missing_to_or_message" },
      });
      continue;
    }

    const previewUrl =
      toBoolean(node.data.config?.previewUrl) ?? input?.previewUrl;
    const payload = buildTextMessage({
      to,
      text: textBody,
      previewUrl,
    });

    const parsed = WhatsAppSendTextRequestSchema.safeParse(payload);
    if (!parsed.success) {
      if (supabase) {
        await supabase.from("workflow_builder_logs").insert({
          execution_id: executionId,
          node_id: node.id,
          node_name: node.data.label,
          node_type: node.data.type,
          status: "failed",
          input: payload,
          error: "invalid_payload",
          output: parsed.error.flatten(),
          started_at: new Date().toISOString(),
          completed_at: new Date().toISOString(),
        });
      }
      results.push({
        nodeId: node.id,
        status: "failed",
        result: parsed.error.flatten(),
      });
      continue;
    }

    let stepResult: unknown = null;
    let stepError: string | null = null;
    try {
      stepResult = await context.run(`send-message-${node.id}`, async () => {
        const response = await fetch(
          `https://graph.facebook.com/v24.0/${credentials.phoneNumberId}/messages`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${credentials.accessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(parsed.data),
          }
        );

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(errorText || "WhatsApp send failed");
        }

        return response.json();
      });
    } catch (error) {
      stepError = error instanceof Error ? error.message : String(error);
    }

    if (supabase) {
      await supabase.from("workflow_builder_logs").insert({
        execution_id: executionId,
        node_id: node.id,
        node_name: node.data.label,
        node_type: node.data.type,
        status: stepError ? "failed" : "success",
        input: parsed.data,
        output: stepResult,
        error: stepError,
        started_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
      });
    }

    results.push({
      nodeId: node.id,
      status: stepError ? "failed" : "success",
      result: stepError || stepResult,
    });
  }

  if (supabase) {
    await supabase.from("workflow_builder_executions").update({
      status: results.some((r) => r.status === "failed") ? "failed" : "success",
      output: { results },
      finished_at: new Date().toISOString(),
    }).eq("id", executionId);
  }

  return {
    executionId,
    status: results.some((r) => r.status === "failed") ? "failed" : "success",
    output: { results },
  };
});
