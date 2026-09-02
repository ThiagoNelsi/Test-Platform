import type {
  ClassroomDto,
  ClassroomWithOwnerDto,
  JsonValue,
  QuestionDto,
  RepositoryQuestionDto,
  ResourceDto,
  SubmissionDto,
  SubmissionTestDto,
  TagDto,
  TestDto,
  TestSummaryDto,
} from 'api-contracts';

type DateValue = Date | string | null;

type QuestionRecord = {
  id: number;
  createdAt: DateValue;
  updatedAt: DateValue;
  deletedAt: DateValue;
  type: string;
  authorId: number;
  level: number | null;
  content: unknown;
  originalQuestionId: number | null;
  version: number;
  subjects: string[];
  source: string | null;
  tags: Array<Pick<TagDto, 'id' | 'name' | 'color' | 'userId'>>;
};

type RepositoryQuestionRecord = {
  id: number;
  createdAt: DateValue;
  deletedAt: DateValue;
  type: string;
  level: number | null;
  content: unknown;
  subjects: string[];
  tags: string[];
  source: string | null;
};

type ClassroomRecord = {
  id: number;
  name: string;
  code: string;
  ownerId: number;
  createdAt: DateValue;
};

type ClassroomWithOwnerRecord = ClassroomRecord & {
  owner: {
    id: number;
    name: string;
    email: string;
  };
};

type TestRecord = {
  id: number;
  name: string;
  classroomId: number | null;
  dueDate: DateValue;
  timer: number | null;
  value: number;
  createdAt: DateValue;
  description: string | null;
  publishDate: DateValue;
  status: string;
  sections: unknown;
  authorId: number;
  modifiedAt: DateValue;
  deletedAt: DateValue;
  classroom?: {
    id: number;
    name: string;
    _count: {
      students: number;
    };
  } | null;
  _count?: {
    submissions: number;
  };
};

type TestSummaryRecord = {
  id: number;
  name: string;
  description: string | null;
  value: number;
  dueDate: DateValue;
  publishDate: DateValue;
  status: string;
  createdAt: DateValue;
  modifiedAt: DateValue;
  classroom: {
    id: number;
    name: string;
    _count: {
      students: number;
    };
  } | null;
  _count: {
    submissions: number;
  };
};

type SubmissionRecord = {
  id: number;
  answers: unknown;
  finishTime: DateValue;
  score: number | null;
  startTime: DateValue;
  sections: unknown;
};

type ResourceRecord = {
  id: number;
  filename: string;
  fileType: string;
  tags: string[];
  objectKey: string;
  jobId: string | null;
  status: ResourceDto['status'];
  ownerId: number;
  createdAt: DateValue;
  processedAt: DateValue;
  deletedAt: DateValue;
};

export function toIsoDate(value: DateValue): string | null {
  if (value === null) return null;
  return value instanceof Date ? value.toISOString() : value;
}

function toRequiredIsoDate(value: DateValue): string {
  return toIsoDate(value) ?? new Date(0).toISOString();
}

function toOptionalRequiredIsoDate(
  value: DateValue | undefined,
): string | undefined {
  return value === undefined ? undefined : toRequiredIsoDate(value);
}

function toJsonValue(value: unknown): JsonValue {
  return value as JsonValue;
}

export function toQuestionDto(question: QuestionRecord): QuestionDto {
  return {
    id: question.id,
    createdAt: toRequiredIsoDate(question.createdAt),
    updatedAt: toRequiredIsoDate(question.updatedAt),
    deletedAt: toIsoDate(question.deletedAt),
    type: question.type,
    authorId: question.authorId,
    level: question.level,
    content: toJsonValue(question.content),
    originalQuestionId: question.originalQuestionId,
    version: question.version,
    subjects: question.subjects,
    source: question.source,
    tags: question.tags,
  };
}

export function toRepositoryQuestionDto(
  question: RepositoryQuestionRecord,
): RepositoryQuestionDto {
  const createdAt = toOptionalRequiredIsoDate(question.createdAt);

  return {
    id: question.id,
    deletedAt: toIsoDate(question.deletedAt),
    type: question.type,
    level: question.level,
    content: toJsonValue(question.content),
    subjects: question.subjects,
    tags: question.tags,
    source: question.source,
    ...(createdAt === undefined ? {} : { createdAt }),
  } as RepositoryQuestionDto;
}

export function toClassroomDto(classroom: ClassroomRecord): ClassroomDto {
  const createdAt = toOptionalRequiredIsoDate(classroom.createdAt);

  return {
    id: classroom.id,
    name: classroom.name,
    code: classroom.code,
    ownerId: classroom.ownerId,
    ...(createdAt === undefined ? {} : { createdAt }),
  } as ClassroomDto;
}

export function toClassroomWithOwnerDto(
  classroom: ClassroomWithOwnerRecord,
): ClassroomWithOwnerDto {
  return {
    ...toClassroomDto(classroom),
    owner: classroom.owner,
  };
}

export function toTestDto(test: TestRecord): TestDto {
  return {
    id: test.id,
    name: test.name,
    classroomId: test.classroomId,
    dueDate: toIsoDate(test.dueDate),
    timer: test.timer,
    value: test.value,
    createdAt: toRequiredIsoDate(test.createdAt),
    description: test.description,
    publishDate: toIsoDate(test.publishDate),
    status: test.status,
    sections: toJsonValue(test.sections),
    authorId: test.authorId,
    modifiedAt: toRequiredIsoDate(test.modifiedAt),
    deletedAt: toIsoDate(test.deletedAt),
    classroom: test.classroom
      ? {
          id: test.classroom.id,
          name: test.classroom.name,
          _count: test.classroom._count,
        }
      : test.classroom,
    _count: test._count,
  };
}

export function toTestSummaryDto(test: TestSummaryRecord): TestSummaryDto {
  const createdAt = toOptionalRequiredIsoDate(test.createdAt);
  const modifiedAt = toOptionalRequiredIsoDate(test.modifiedAt);

  return {
    id: test.id,
    name: test.name,
    description: test.description,
    value: test.value,
    dueDate: toIsoDate(test.dueDate),
    publishDate: toIsoDate(test.publishDate),
    status: test.status,
    classroom: test.classroom,
    _count: test._count,
    ...(createdAt === undefined ? {} : { createdAt }),
    ...(modifiedAt === undefined ? {} : { modifiedAt }),
  } as TestSummaryDto;
}

export function toSubmissionDto(
  submission: SubmissionRecord,
): SubmissionDto {
  return {
    id: submission.id,
    answers: toJsonValue(submission.answers),
    finishTime: toIsoDate(submission.finishTime),
    score: submission.score,
    startTime: toRequiredIsoDate(submission.startTime),
    sections: submission.sections as SubmissionDto['sections'],
  };
}

export function toSubmissionTestDto(test: {
  id: number;
  name: string;
  description: string | null;
  value: number;
  dueDate: DateValue;
  timer: number | null;
  classroom?: string;
}): SubmissionTestDto {
  return {
    id: test.id,
    name: test.name,
    description: test.description,
    value: test.value,
    dueDate: toIsoDate(test.dueDate),
    timer: test.timer,
    ...(test.classroom ? { classroom: test.classroom } : {}),
  };
}

export function toResourceDto(resource: ResourceRecord): ResourceDto {
  const createdAt = toOptionalRequiredIsoDate(resource.createdAt);

  return {
    id: resource.id,
    filename: resource.filename,
    fileType: resource.fileType,
    tags: resource.tags,
    objectKey: resource.objectKey,
    jobId: resource.jobId,
    status: resource.status,
    ownerId: resource.ownerId,
    processedAt: toIsoDate(resource.processedAt),
    deletedAt: toIsoDate(resource.deletedAt),
    ...(createdAt === undefined ? {} : { createdAt }),
  } as ResourceDto;
}
