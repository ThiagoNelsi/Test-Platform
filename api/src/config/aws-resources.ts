import { GetParametersCommand, type GetParametersCommandOutput } from '@aws-sdk/client-ssm';

export type AwsResources = {
  uploadedResourcesBucket: string;
  textractOutputBucket: string;
  textractSnsTopicArn: string;
  textractSnsRoleArn: string;
};

const parameterPaths = {
  uploadedResourcesBucket: 's3/uploaded-resources-bucket',
  textractOutputBucket: 's3/textract-output-bucket',
  textractSnsTopicArn: 'textract/sns-topic-arn',
  textractSnsRoleArn: 'textract/sns-role-arn',
} as const;

export async function loadAwsResources(
  ssm: { send: (command: GetParametersCommand) => Promise<GetParametersCommandOutput> },
  parameterPath: string,
): Promise<AwsResources> {
  const basePath = parameterPath.replace(/\/$/, '');
  const names = Object.values(parameterPaths).map((path) => `${basePath}/${path}`);
  const result = await ssm.send(new GetParametersCommand({ Names: names }));
  const values = new Map(result.Parameters?.map(({ Name, Value }) => [Name, Value]));

  const missing = names.filter((name) => !values.get(name));
  if (missing.length > 0) {
    throw new Error(`Missing SSM parameters: ${missing.join(', ')}`);
  }

  return {
    uploadedResourcesBucket: values.get(names[0])!,
    textractOutputBucket: values.get(names[1])!,
    textractSnsTopicArn: values.get(names[2])!,
    textractSnsRoleArn: values.get(names[3])!,
  };
}
