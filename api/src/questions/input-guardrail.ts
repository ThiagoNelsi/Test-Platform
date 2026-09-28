/** Checks the complete, untrusted user message before generation. */
export interface InputGuardrail {
  assertSafe(text: string): Promise<void>;
}

export class PromptAttackError extends Error {
  constructor() {
    super('O pedido ou os materiais contêm instruções potencialmente maliciosas. Revise o pedido e a seleção de materiais.');
    this.name = 'PromptAttackError';
  }
}

export class InputGuardrailUnavailableError extends Error {
  constructor() {
    super('Não foi possível verificar a segurança do pedido e dos materiais. Tente novamente.');
    this.name = 'InputGuardrailUnavailableError';
  }
}
