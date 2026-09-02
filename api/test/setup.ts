// Keep tests independent from developer-specific .env files. The AWS SDK
// validates the region while constructing its client, even when no AWS call
// is made by the test.
process.env.AWS_REGION ??= 'us-east-1';
