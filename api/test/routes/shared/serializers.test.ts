import { describe, expect, it } from 'vitest';
import {
  toClassroomDto,
  toClassroomWithOwnerDto,
  toIsoDate,
  toQuestionDto,
  toRepositoryQuestionDto,
  toResourceDto,
  toSubmissionDto,
  toSubmissionTestDto,
  toTestDto,
  toTestSummaryDto,
} from '../../../src/routes/shared/serializers';

const createdAt = new Date('2026-01-02T03:04:05.000Z');

describe('API transport serializers', () => {
  it('converts Date values to ISO strings and preserves null dates', () => {
    expect(toIsoDate(createdAt)).toBe('2026-01-02T03:04:05.000Z');
    expect(toIsoDate('2026-01-03T03:04:05.000Z')).toBe(
      '2026-01-03T03:04:05.000Z',
    );
    expect(toIsoDate(null)).toBeNull();

    expect(
      toQuestionDto({
        id: 1,
        createdAt,
        updatedAt: null,
        deletedAt: null,
        type: 'multiple-choice',
        authorId: 7,
        level: 2,
        content: { question: 'What is 2 + 2?' },
        originalQuestionId: null,
        version: 1,
        subjects: ['Math'],
        source: 'MANUAL',
        tags: [],
      }),
    ).toMatchObject({
      createdAt: '2026-01-02T03:04:05.000Z',
      updatedAt: '1970-01-01T00:00:00.000Z',
      deletedAt: null,
    });
  });

  it('serializes question, repository, and classroom records', () => {
    expect(
      toRepositoryQuestionDto({
        id: 2,
        createdAt,
        deletedAt: null,
        type: 'essay',
        level: null,
        content: { question: 'Explain gravity.' },
        subjects: ['Physics'],
        tags: ['science'],
        source: null,
      }),
    ).toMatchObject({
      id: 2,
      createdAt: '2026-01-02T03:04:05.000Z',
      content: { question: 'Explain gravity.' },
    });

    const classroom = {
      id: 3,
      name: 'Class A',
      code: 'CLASS-A',
      ownerId: 7,
      createdAt,
    };

    expect(toClassroomDto(classroom)).toEqual({
      ...classroom,
      createdAt: '2026-01-02T03:04:05.000Z',
    });
    expect(
      toClassroomWithOwnerDto({
        ...classroom,
        owner: { id: 7, name: 'Teacher', email: 'teacher@example.com' },
      }),
    ).toMatchObject({
      id: 3,
      owner: { id: 7, name: 'Teacher', email: 'teacher@example.com' },
    });
  });

  it('serializes tests and their nested classroom/count data', () => {
    const classroom = { id: 3, name: 'Class A', _count: { students: 12 } };

    expect(
      toTestDto({
        id: 4,
        name: 'Midterm',
        classroomId: 3,
        dueDate: createdAt,
        timer: 60,
        value: 10,
        createdAt,
        description: 'First test',
        publishDate: null,
        status: 'published',
        sections: [{ questions: [] }],
        authorId: 7,
        modifiedAt: createdAt,
        deletedAt: null,
        classroom,
        _count: { submissions: 4 },
      }),
    ).toMatchObject({
      dueDate: '2026-01-02T03:04:05.000Z',
      classroom,
      _count: { submissions: 4 },
    });

    expect(
      toTestSummaryDto({
        id: 4,
        name: 'Midterm',
        description: null,
        value: 10,
        dueDate: null,
        publishDate: createdAt,
        status: 'published',
        createdAt,
        modifiedAt: createdAt,
        classroom,
        _count: { submissions: 4 },
      }),
    ).toMatchObject({
      publishDate: '2026-01-02T03:04:05.000Z',
      createdAt: '2026-01-02T03:04:05.000Z',
      modifiedAt: '2026-01-02T03:04:05.000Z',
    });
  });

  it('serializes submissions, submission tests, and resources', () => {
    expect(
      toSubmissionDto({
        id: 5,
        answers: { 'question-1': 'A' },
        finishTime: null,
        score: null,
        startTime: createdAt,
        sections: [{ questions: [] }],
      }),
    ).toEqual({
      id: 5,
      answers: { 'question-1': 'A' },
      finishTime: null,
      score: null,
      startTime: '2026-01-02T03:04:05.000Z',
      sections: [{ questions: [] }],
    });

    expect(
      toSubmissionTestDto({
        id: 4,
        name: 'Midterm',
        description: null,
        value: 10,
        dueDate: createdAt,
        timer: 60,
        classroom: 'Class A',
      }),
    ).toEqual({
      id: 4,
      name: 'Midterm',
      description: null,
      value: 10,
      dueDate: '2026-01-02T03:04:05.000Z',
      timer: 60,
      classroom: 'Class A',
    });

    expect(
      toResourceDto({
        id: 6,
        filename: 'material.pdf',
        fileType: 'application/pdf',
        tags: ['math'],
        objectKey: 'materials/material.pdf',
        jobId: 'job-1',
        status: 'PROCESSED',
        ownerId: 7,
        createdAt,
        processedAt: createdAt,
        deletedAt: null,
      }),
    ).toMatchObject({
      createdAt: '2026-01-02T03:04:05.000Z',
      processedAt: '2026-01-02T03:04:05.000Z',
      deletedAt: null,
    });
  });
});
