import { prisma } from "@aptis/database";
import type { ApiFeature } from "@aptis/database";
import { calculateCost } from "./client";

interface LogApiUsageParams {
  userId: string | null;
  feature: ApiFeature;
  model: string;
  inputTokens: number;
  outputTokens: number;
  durationMs?: number;
  success?: boolean;
  errorMessage?: string;
}

export async function logApiUsage(params: LogApiUsageParams): Promise<void> {
  try {
    const costUsd = calculateCost(
      params.model,
      params.inputTokens,
      params.outputTokens
    );

    await prisma.apiUsageLog.create({
      data: {
        userId: params.userId,
        feature: params.feature,
        model: params.model,
        inputTokens: params.inputTokens,
        outputTokens: params.outputTokens,
        costUsd,
        durationMs: params.durationMs,
        success: params.success ?? true,
        errorMessage: params.errorMessage,
      },
    });
  } catch (error) {
    // Never let logging failures break the main flow
    console.error("Failed to log API usage:", error);
  }
}
