import { createAwsDocumentProcessor } from "../adapters/aws-adapters";
import { createSqsHandler } from "../events/sqs-handler";

export const handler = createSqsHandler(createAwsDocumentProcessor());
