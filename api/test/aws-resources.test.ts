import { GetParametersCommand } from '@aws-sdk/client-ssm';
import { describe, expect, it, vi } from 'vitest';
import { loadAwsResources } from '../src/config/aws-resources';

const parameters = [
  { Name: '/test-platform/dev/s3/uploaded-resources-bucket', Value: 'uploads' },
  { Name: '/test-platform/dev/s3/textract-output-bucket', Value: 'textract-output' },
  { Name: '/test-platform/dev/textract/sns-topic-arn', Value: 'topic-arn' },
  { Name: '/test-platform/dev/textract/sns-role-arn', Value: 'role-arn' },
];

describe('AWS resource configuration', () => {
  it('loads all four deployed resource values in one SSM request', async () => {
    const send = vi.fn().mockResolvedValue({ Parameters: [...parameters].reverse() });

    await expect(loadAwsResources({ send }, '/test-platform/dev/')).resolves.toEqual({
      uploadedResourcesBucket: 'uploads',
      textractOutputBucket: 'textract-output',
      textractSnsTopicArn: 'topic-arn',
      textractSnsRoleArn: 'role-arn',
    });

    expect(send).toHaveBeenCalledOnce();
    expect(send.mock.calls[0][0]).toBeInstanceOf(GetParametersCommand);
    expect(send.mock.calls[0][0].input.Names).toEqual(parameters.map(({ Name }) => Name));
  });

  it('fails startup when a required parameter is absent', async () => {
    const send = vi.fn().mockResolvedValue({ Parameters: parameters.slice(0, 3) });

    await expect(loadAwsResources({ send }, '/test-platform/dev')).rejects.toThrow(
      '/test-platform/dev/textract/sns-role-arn',
    );
  });
});
