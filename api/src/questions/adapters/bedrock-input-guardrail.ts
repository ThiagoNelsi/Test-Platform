import { ApplyGuardrailCommand, type ApplyGuardrailCommandOutput } from '@aws-sdk/client-bedrock-runtime';
import { InputGuardrailUnavailableError, PromptAttackError, type InputGuardrail } from '../input-guardrail';

type GuardrailClient = {
  send(command: ApplyGuardrailCommand, options: { abortSignal: AbortSignal }): Promise<ApplyGuardrailCommandOutput>;
};

export type InputGuardrailMetrics = {
  action: string | undefined;
  characters: number;
  contentPolicyUnits: number | undefined;
  latencyMs: number | undefined;
};

export function createBedrockInputGuardrail(
  client: GuardrailClient,
  config: { identifier: string; version: string; timeoutMs: number },
  onEvaluation?: (metrics: InputGuardrailMetrics) => void,
): InputGuardrail {
  return {
    async assertSafe(text) {
      const controller = new AbortController();
      let timer: ReturnType<typeof setTimeout> | undefined;
      try {
        // Race as well as abort so a stalled client cannot leave generation pending.
        const response = await Promise.race([
          client.send(new ApplyGuardrailCommand({
            guardrailIdentifier: config.identifier,
            guardrailVersion: config.version,
            source: 'INPUT',
            outputScope: 'FULL',
            // Plain text deliberately has no query/grounding_source qualifiers:
            // those exclude RAG content from prompt-attack evaluation.
            content: [{ text: { text } }],
          }), { abortSignal: controller.signal }),
          new Promise<never>((_, reject) => {
            timer = setTimeout(() => {
              controller.abort();
              reject(new InputGuardrailUnavailableError());
            }, config.timeoutMs);
          }),
        ]);

        const attacks = response.assessments?.flatMap((assessment) => (
          assessment.contentPolicy?.filters?.filter((filter) => filter.type === 'PROMPT_ATTACK') ?? []
        )) ?? [];
        onEvaluation?.({
          action: response.action,
          characters: text.length,
          contentPolicyUnits: response.usage?.contentPolicyUnits,
          latencyMs: response.assessments?.[0]?.invocationMetrics?.guardrailProcessingLatency,
        });
        if (response.action === 'GUARDRAIL_INTERVENED'
          || attacks.some((filter) => filter.detected === true || filter.action === 'BLOCKED')) {
          throw new PromptAttackError();
        }
        const coverage = response.guardrailCoverage?.textCharacters;
        // A successful HTTP request with an inactive/wrong policy is not approval.
        if (response.action !== 'NONE' || attacks.length === 0
          || attacks.some((filter) => !filter.filterStrength || filter.filterStrength === 'NONE')
          || !coverage?.total || coverage.guarded !== coverage.total) {
          throw new InputGuardrailUnavailableError();
        }
      } catch (error) {
        if (error instanceof PromptAttackError) throw error;
        // Do not forward AWS diagnostics or echoed untrusted content to the UI.
        throw new InputGuardrailUnavailableError();
      } finally {
        if (timer !== undefined) clearTimeout(timer);
      }
    },
  };
}
