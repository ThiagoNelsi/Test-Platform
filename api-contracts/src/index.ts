export type JsonPrimitive = string | number | boolean | null;

export type JsonValue =
  | JsonPrimitive
  | JsonValue[]
  | { [key: string]: JsonValue };

export type IsoDateString = string;

export type ApiErrorResponse = {
  error: string;
};

export type ApiOkResponse = {
  ok: true;
};

export type AuthUserDto = {
  id: number;
  name: string;
  email: string;
  image: string | null;
  googleSub: string | null;
};

export type AuthMeResponse = {
  user: AuthUserDto | null;
};

export type LogoutResponse = ApiOkResponse;

export type TagDto = {
  id: number;
  name: string;
  color: number;
  userId: number;
};

export type QuestionDto = {
  id: number;
  createdAt: IsoDateString;
  updatedAt: IsoDateString;
  deletedAt: IsoDateString | null;
  type: string;
  authorId: number;
  level: number | null;
  content: JsonValue;
  originalQuestionId: number | null;
  version: number;
  subjects: string[];
  source: string | null;
  tags: TagDto[];
};

export type QuestionResponse = {
  question: QuestionDto;
};

export type QuestionsResponse = {
  questions: QuestionDto[];
};

export type CreateQuestionRequest = {
  type: string;
  level?: number | string | null;
  content: JsonValue;
  source?: string | null;
  tags?: number[];
};

export type CreateQuestionsBulkRequest = {
  questions: CreateQuestionRequest[];
};

export type UpdateQuestionRequest = {
  type: string;
  level: number | string | null;
  content: JsonValue;
  tags: number[];
};

export type QuestionMutationResponse = {
  ok: true;
  updated: boolean;
};

export type QuestionDeleteResponse = {
  ok: true;
  count: number;
};

export type BulkCreateResponse = {
  count: number;
};

export type RepositoryQuestionDto = {
  id: number;
  createdAt: IsoDateString;
  deletedAt: IsoDateString | null;
  type: string;
  level: number | null;
  content: JsonValue;
  subjects: string[];
  tags: string[];
  source: string | null;
};

export type RepositoryQuestionResponse = {
  question: RepositoryQuestionDto;
};

export type RepositoryQuestionsResponse = {
  questions: RepositoryQuestionDto[];
};

export type CreateRepositoryQuestionRequest = {
  type: string;
  level?: number | null;
  content: JsonValue;
  subjects: string[];
  tags: string[];
  source?: string | null;
};

export type CloneRepositoryQuestionsRequest = {
  questionIds: number[];
};

export type CloneRepositoryQuestionsResponse = BulkCreateResponse;

export type ClassroomSummaryDto = {
  id: number;
  name: string;
  students?: number;
};

export type ClassroomOwnerDto = {
  id: number;
  name: string;
  email: string;
};

export type ClassroomDto = {
  id: number;
  name: string;
  code: string;
  ownerId: number;
  createdAt: IsoDateString;
};

export type ClassroomWithOwnerDto = ClassroomDto & {
  owner: ClassroomOwnerDto;
};

export type ClassroomsResponse = {
  ownedClasses: ClassroomWithOwnerDto[];
  classrooms: ClassroomWithOwnerDto[];
};

export type CreateClassroomRequest = {
  name: string;
};

export type CreateClassroomResponse = {
  classroom: ClassroomDto;
};

export type JoinClassroomRequest = {
  code: string;
};

export type JoinClassroomResponse = ApiOkResponse;

export type TestSectionQuestionRequest = {
  id: number;
  version?: number;
};

export type TestSectionRequest = {
  selectionMode: string;
  shuffle?: boolean;
  questions: TestSectionQuestionRequest[];
  randomQuestionCount?: number;
};

export type TestUpsertRequest = {
  name?: string;
  value?: number;
  dueDate?: IsoDateString | null;
  duration?: number | null;
  description?: string | null;
  publishDate?: IsoDateString | null;
  status?: string;
  classroomIds?: number[];
  sections: TestSectionRequest[];
};

export type TestClassroomDto = {
  id: number;
  name: string;
  _count: {
    students: number;
  };
};

export type TestCountsDto = {
  submissions: number;
};

export type TestDto = {
  id: number;
  name: string;
  classroomId: number | null;
  dueDate: IsoDateString | null;
  timer: number | null;
  value: number;
  createdAt: IsoDateString;
  description: string | null;
  publishDate: IsoDateString | null;
  status: string;
  sections: JsonValue;
  authorId: number;
  modifiedAt: IsoDateString;
  deletedAt: IsoDateString | null;
  classroom?: TestClassroomDto | null;
  _count?: TestCountsDto;
};

export type TestSummaryDto = {
  id: number;
  name: string;
  description: string | null;
  value: number;
  dueDate: IsoDateString | null;
  publishDate: IsoDateString | null;
  status: string;
  createdAt: IsoDateString;
  modifiedAt: IsoDateString;
  classroom: TestClassroomDto | null;
  _count: TestCountsDto;
};

export type TestResponse = {
  test: TestDto;
};

export type TestsResponse = {
  tests: TestDto[];
};

export type OwnedTestsResponse = {
  tests: TestSummaryDto[];
};

export type PublishTestsResponse = TestsResponse;
export type ScheduleTestsResponse = TestsResponse;

export type DeleteTestResponse = {
  test?: TestDto;
  ok?: true;
  deleted: 'soft' | 'hard';
};

export type SubmissionQuestionDto = {
  id: number;
  originalQuestionId: number | null;
  content: JsonValue;
  type: string;
  version: number;
};

export type SubmissionSectionDto = {
  shuffle?: boolean;
  count?: number;
  questions: SubmissionQuestionDto[];
};

export type SubmissionDto = {
  id: number;
  answers: JsonValue;
  finishTime: IsoDateString | null;
  score: number | null;
  startTime: IsoDateString;
  sections: SubmissionSectionDto[];
};

export type SubmissionTestDto = {
  id: number;
  name: string;
  description: string | null;
  value: number;
  dueDate: IsoDateString | null;
  timer: number | null;
  classroom?: string;
};

export type CreateSubmissionResponse = {
  test: SubmissionTestDto;
  submission: SubmissionDto;
};

export type CreateSubmissionRequest = {
  testId: number;
};

export type SubmissionAnswers = Record<string, string>;

export type SaveSubmissionRequest = {
  answers: SubmissionAnswers;
};

export type SaveSubmissionResponse = {
  submission: SubmissionDto;
};

export type FinishSubmissionRequest = SaveSubmissionRequest;
export type FinishSubmissionResponse = SaveSubmissionResponse;

export type TagsResponse = {
  tags: TagDto[];
};

export type CreateTagRequest = {
  name: string;
  color: number;
};

export type CreateTagResponse = {
  success: true;
  tag: TagDto;
};

export type QuestionsPerTagResponse = {
  questionsPerTag: Array<{
    tagId: number;
    questions: number[];
  }>;
};

export type ResourceStatus =
  | 'PENDING_UPLOAD'
  | 'UPLOADED'
  | 'PROCESSING'
  | 'PROCESSED'
  | 'FAILED'
  | 'EXPIRED';

export type ResourceDto = {
  id: number;
  documentId: string;
  filename: string;
  fileType: string;
  fileSize: number | null;
  fileHash: string | null;
  tags: string[];
  objectKey: string;
  jobId: string | null;
  status: ResourceStatus;
  ownerId: number;
  createdAt: IsoDateString;
  updatedAt: IsoDateString;
  processedAt: IsoDateString | null;
  deletedAt: IsoDateString | null;
};

export type ResourcesResponse = {
  resources: ResourceDto[];
};

export type CreateResourceRequest = {
  filename: string;
  fileType: string;
  objectKey: string;
  tags?: string[];
};

export type CreateResourceResponse = {
  resource: ResourceDto;
};

export type UploadRequestStatus =
  | 'NEW_UPLOAD'
  | 'RESUME_UPLOAD'
  | 'ALREADY_EXISTS'
  | 'UPLOAD_ALREADY_COMPLETED';

export type PresignedPostResponse = {
  status: 'NEW_UPLOAD' | 'RESUME_UPLOAD';
  documentId: string;
  uploadUrl: string;
  url: string;
  fields: Record<string, string>;
  expiresAt: IsoDateString;
};

export type ExistingUploadResponse = {
  status: 'ALREADY_EXISTS' | 'UPLOAD_ALREADY_COMPLETED';
  document: ResourceDto;
};

export type CreateUploadResponse = PresignedPostResponse | ExistingUploadResponse;

export type UploadObjectDto = {
  Key?: string;
};

export type UploadObjectsResponse = UploadObjectDto[];

export type CreateUploadRequest = {
  filename: string;
  contentType: string;
  fileSize: number;
  fileHash: string;
  tags?: string[];
};
