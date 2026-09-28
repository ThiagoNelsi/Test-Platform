import { afterEach, describe, expect, it, vi } from 'vitest';
import { GetParametersCommand } from '@aws-sdk/client-ssm';
import { loadDeployedRetrievalConfig, loadRetrievalConfig, retrievalParameterPaths } from '../../src/config/retrieval';

afterEach(() => vi.restoreAllMocks());

describe('retrieval configuration', () => {
  it('enables Cohere with the agreed defaults', () => {
    expect(loadRetrievalConfig({})).toEqual({
      enabled: true, region: 'us-east-1',
      modelArn: 'arn:aws:bedrock:us-east-1::foundation-model/cohere.rerank-v3-5:0',
      options: { candidateLimit: 40, maxParents: 5, maxContextCharacters: 14000, rerankTimeoutMs: 3000 },
    });
  });
  it('allows disabling reranking and configuring region, model and retrieval limits', () => {
    expect(loadRetrievalConfig({
      RERANK_ENABLED: 'false', AWS_REGION: 'us-west-2', RERANK_REGION: 'us-east-1',
      RERANK_MODEL_ARN: 'custom-model', RETRIEVAL_CANDIDATE_LIMIT: '20', RETRIEVAL_MAX_PARENTS: '3',
      RETRIEVAL_MAX_CONTEXT_CHARACTERS: '5000', RERANK_TIMEOUT_MS: '900',
    })).toEqual({ enabled: false, region: 'us-east-1', modelArn: 'custom-model', options: {
      candidateLimit: 20, maxParents: 3, maxContextCharacters: 5000, rerankTimeoutMs: 900,
    } });
    expect(loadRetrievalConfig({ AWS_REGION: 'us-west-2' }).modelArn).toContain('us-west-2');
  });
  it.each(['0', '-1', 'abc', '1.5', ''])('rejects invalid numeric configuration %s', (value) => {
    expect(() => loadRetrievalConfig({ RERANK_TIMEOUT_MS: value })).toThrow('positive integer');
  });
  it('rejects misspelled enable flags', () => {
    expect(() => loadRetrievalConfig({ RERANK_ENABLED: 'yes' })).toThrow('true or false');
  });
});

describe('retrieval configuration deployed through SAM and SSM', () => {
  const deployed = {
    RERANK_ENABLED: 'false', RERANK_REGION: 'us-west-2',
    RERANK_MODEL_ARN: 'arn:aws:bedrock:us-west-2::foundation-model/cohere.rerank-v3-5:0',
    RERANK_TIMEOUT_MS: '2000', RETRIEVAL_CANDIDATE_LIMIT: '60',
    RETRIEVAL_MAX_PARENTS: '8', RETRIEVAL_MAX_CONTEXT_CHARACTERS: '18000',
  };
  const parameters = Object.entries(retrievalParameterPaths).map(([key, path]) => ({
    Name: `/test-platform/dev/${path}`, Value: deployed[key as keyof typeof deployed],
  }));

  it('loads the seven deployed settings in one request independent of response order', async () => {
    const send = vi.fn().mockResolvedValue({ Parameters: [...parameters].reverse() });
    await expect(loadDeployedRetrievalConfig({ send }, '/test-platform/dev/', {}))
      .resolves.toEqual(loadRetrievalConfig(deployed));
    expect(send).toHaveBeenCalledOnce();
    expect(send.mock.calls[0][0]).toBeInstanceOf(GetParametersCommand);
    expect(send.mock.calls[0][0].input.Names).toEqual(parameters.map(({ Name }) => Name));
    expect(parameters.length).toBeLessThanOrEqual(10);
  });

  it('allows environment overrides without mutating the environment', async () => {
    const send = vi.fn().mockResolvedValue({ Parameters: parameters });
    const env = { RERANK_ENABLED: 'true', RERANK_TIMEOUT_MS: '500', RETRIEVAL_MAX_PARENTS: '2' };
    await expect(loadDeployedRetrievalConfig({ send }, '/test-platform/dev', env))
      .resolves.toEqual(loadRetrievalConfig({ ...deployed, ...env }));
    expect(env).toEqual({ RERANK_ENABLED: 'true', RERANK_TIMEOUT_MS: '500', RETRIEVAL_MAX_PARENTS: '2' });
  });

  it('uses defaults and warns when an older stack has no retrieval parameters', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const send = vi.fn().mockResolvedValue({ InvalidParameters: parameters.map(({ Name }) => Name) });
    await expect(loadDeployedRetrievalConfig({ send }, '/test-platform/dev', {}))
      .resolves.toEqual(loadRetrievalConfig({}));
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('using defaults'), parameters.map(({ Name }) => Name));
  });

  it('does not warn for absent parameters supplied by the environment', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const send = vi.fn().mockResolvedValue({ Parameters: [] });
    await expect(loadDeployedRetrievalConfig({ send }, '/custom/prod', deployed))
      .resolves.toEqual(loadRetrievalConfig(deployed));
    expect(warn).not.toHaveBeenCalled();
    expect(send.mock.calls[0][0].input.Names[0]).toBe('/custom/prod/rerank/enabled');
  });

  it('validates deployed values just like environment values', async () => {
    const send = vi.fn().mockResolvedValue({ Parameters: parameters.map((parameter) => (
      parameter.Name.endsWith('/timeout-ms') ? { ...parameter, Value: '0' } : parameter
    )) });
    await expect(loadDeployedRetrievalConfig({ send }, '/test-platform/dev', {})).rejects.toThrow('positive integer');
  });

  it('propagates SSM access errors instead of silently ignoring the deployed configuration', async () => {
    const error = new Error('AccessDeniedException');
    const send = vi.fn().mockRejectedValue(error);
    await expect(loadDeployedRetrievalConfig({ send }, '/test-platform/dev', {})).rejects.toBe(error);
  });
});
