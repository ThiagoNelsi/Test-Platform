"""Local IAM policy quota regression checks (requires PyYAML, also used by SAM)."""
import json
from pathlib import Path
import unittest

import yaml


class TemplateLoader(yaml.SafeLoader):
    pass


def intrinsic(loader, tag, node):
    if isinstance(node, yaml.ScalarNode):
        value = loader.construct_scalar(node)
    elif isinstance(node, yaml.SequenceNode):
        value = loader.construct_sequence(node)
    else:
        value = loader.construct_mapping(node)
    return {tag: value}


TemplateLoader.add_multi_constructor('!', intrinsic)
TEMPLATE = yaml.load((Path(__file__).parents[1] / 'template.yaml').read_text(), Loader=TemplateLoader)
# Representative resolved values, with maximum-length bucket names to avoid
# undercounting the ARN expansion that CloudFormation sends to IAM.
VALUES = {
    **{key: value.get('Default') for key, value in TEMPLATE['Parameters'].items()},
    'AWS::Partition': 'aws', 'AWS::Region': 'us-east-1', 'AWS::AccountId': '123456789012',
    'UploadedResourcesBucket.Arn': 'arn:aws:s3:::' + 'u' * 63,
    'TextractOutputBucket.Arn': 'arn:aws:s3:::' + 't' * 63,
    'PromptAttackGuardrail.GuardrailArn': 'arn:aws:bedrock:us-east-1:123456789012:guardrail/abcdefgh1234',
    'TextractSNSRole.Arn': 'arn:aws:iam::123456789012:role/test-platform-dev-textract-sns',
}


def resolve(value):
    if isinstance(value, list):
        return [resolve(item) for item in value]
    if not isinstance(value, dict):
        return value
    if 'Sub' in value:
        text = value['Sub']
        for key, replacement in VALUES.items():
            text = text.replace('${' + key + '}', str(replacement))
        if '${' in text:
            raise ValueError('Unresolved substitution: ' + text)
        return text
    if 'GetAtt' in value:
        return VALUES[value['GetAtt']]
    if 'Ref' in value:
        return VALUES[value['Ref']]
    return {key: resolve(item) for key, item in value.items()}


def size(document):
    return len(json.dumps(resolve(document), separators=(',', ':'), ensure_ascii=False))


class BackendIamQuotaTest(unittest.TestCase):
    def test_user_inline_policy_aggregate_fits_iam_quota(self):
        policies = TEMPLATE['Resources']['BackendIamUser']['Properties'].get('Policies', [])
        total = sum(size(policy['PolicyDocument']) for policy in policies)
        self.assertLessEqual(total, 2048, f'Aggregate inline policy size: {total} > 2048')

    def test_attached_managed_policies_fit_iam_quotas(self):
        attached = TEMPLATE['Resources']['BackendIamUser']['Properties'].get('ManagedPolicyArns', [])
        self.assertLessEqual(len(attached), 10)
        for reference in attached:
            policy = TEMPLATE['Resources'][reference['Ref']]
            self.assertEqual(policy['Type'], 'AWS::IAM::ManagedPolicy')
            self.assertLessEqual(size(policy['Properties']['PolicyDocument']), 6144)


if __name__ == '__main__':
    unittest.main()
