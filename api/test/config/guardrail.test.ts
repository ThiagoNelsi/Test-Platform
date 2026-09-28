import { describe, expect, it, vi } from 'vitest';
import { guardrailParameterPaths, loadDeployedGuardrailConfig, loadGuardrailConfig } from '../../src/config/guardrail';

const settings = {
  INPUT_GUARDRAIL_IDENTIFIER: 'guardrail-id', INPUT_GUARDRAIL_VERSION: '2',
};

describe('input guardrail configuration', () => {
  it('requires protection by default, with a published version', () => {
    expect(() => loadGuardrailConfig({})).toThrow('INPUT_GUARDRAIL_IDENTIFIER');
    expect(loadGuardrailConfig(settings)).toEqual({
      enabled: true, identifier: 'guardrail-id', version: '2', region: 'us-east-1', timeoutMs: 10000,
    });
    expect(() => loadGuardrailConfig({ ...settings, INPUT_GUARDRAIL_VERSION: 'DRAFT' })).toThrow('published');
  });

  it('supports explicit disablement and validates flags and timeouts', () => {
    expect(loadGuardrailConfig({ INPUT_GUARDRAIL_ENABLED: 'false' }).enabled).toBe(false);
    expect(() => loadGuardrailConfig({ ...settings, INPUT_GUARDRAIL_ENABLED: 'yes' })).toThrow('true or false');
    for (const value of ['0', '-1', 'abc', '1.5', '']) {
      expect(() => loadGuardrailConfig({ ...settings, INPUT_GUARDRAIL_TIMEOUT_MS: value })).toThrow('positive integer');
    }
  });

  it('loads deployed SSM settings independent of order and preserves environment overrides', async () => {
    const deployed = {
      ...settings, INPUT_GUARDRAIL_ENABLED: 'true', INPUT_GUARDRAIL_REGION: 'us-west-2', INPUT_GUARDRAIL_TIMEOUT_MS: '3000',
    };
    const parameters = Object.entries(guardrailParameterPaths).map(([key, path]) => ({
      Name: `/test-platform/dev/${path}`, Value: deployed[key as keyof typeof deployed],
    }));
    const send = vi.fn().mockResolvedValue({ Parameters: parameters.reverse() });
    const env = { INPUT_GUARDRAIL_TIMEOUT_MS: '4000' };
    await expect(loadDeployedGuardrailConfig({ send }, '/test-platform/dev/', env))
      .resolves.toEqual(loadGuardrailConfig({ ...deployed, ...env }));
    expect(env).toEqual({ INPUT_GUARDRAIL_TIMEOUT_MS: '4000' });
    expect(send.mock.calls[0][0].input.Names).toHaveLength(5);
  });

  it('fails on an older stack instead of implicitly disabling protection', async () => {
    const send = vi.fn().mockResolvedValue({ Parameters: [] });
    await expect(loadDeployedGuardrailConfig({ send }, '/test-platform/dev', {})).rejects.toThrow('INPUT_GUARDRAIL_IDENTIFIER');
  });
});
