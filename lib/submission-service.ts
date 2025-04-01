"use server"

import { Test } from "@/prisma/generated/postgres";
import { getUserId } from "./auth";
import { prisma } from "./prisma";
import { Section } from "./section";
import { InputJsonValue } from "@/prisma/generated/postgres/runtime/library";

const generateSections = async (test: Test) => {
  const parsedSections = (test.sections as Array<any>).map((section: any) => Section.fromJSON(section));
  const questionList = parsedSections.flatMap(section => section.questions);
  const questions = await prisma.question.findMany({
    where: {
      OR: questionList.map(({ questionId, version }) => ({
        OR: [
          {
            id: questionId
          },
          {
            originalQuestionId: questionId,
          }
        ],
        version,
      }))
    },
    select: {
      id: true,
      originalQuestionId: true,
      content: true,
      type: true,
      version: true,
    },
  });

  const sections = parsedSections.map((section) => {
    // random questions
    if (section.count != undefined) {
      const selectedQuestions = [];

      for (let i = 0; i < section.count; i++) {
        const randomIndex = Math.floor(Math.random() * section.questions.length);
        const question = section.questions[randomIndex];
        const questionData = questions.find(q => {
          if (q.originalQuestionId) {
            return q.originalQuestionId === question.questionId;
          }
          return q.id === question.questionId;
        });
        selectedQuestions.push(questionData);
      }

      return {
        count: section.count,
        questions: selectedQuestions,
      };
    }

    // shuffle
    if (section.shuffle != undefined) {
      const shuffle = (array: typeof section.questions) => { 
        for (let i = array.length - 1; i > 0; i--) { 
          const j = Math.floor(Math.random() * (i + 1)); 
          [array[i], array[j]] = [array[j], array[i]]; 
        }
        return array;
      };

      const shuffledQuestions = shuffle(section.questions);

      return {
        shuffle: section.shuffle,
        questions: shuffledQuestions.map((q) => {
          return questions.find(question => {
            if (question.originalQuestionId) {
              return question.originalQuestionId === q.questionId;
            }
            return question.id === q.questionId;
          })
        }),
      };
    }
  });

  return sections;
}

export const createSubmission = async (testId: number) => {
  const userId = await getUserId();
  if (!userId) return null;

  // check if submission already exists
  const submissionExists = await prisma.submission.findFirst({
    where: {
      testId,
      userId,
    },
  });

  // get test data
  const test = await prisma.test.findFirst({
    where: {
      id: testId,
      deletedAt: null,
      status: "published"
    },
    include: {
      classroom: {
        select: {
          name: true,
          students: {
            select: {
              id: true,
            }
          },
        }
      },
    }
  });

  if (!test) return null;
  if (test.classroom?.students.find(student => student.id === userId) === undefined) {
    console.log("\n\nUser not allowed to create submission");
    return null;
  }

  if (submissionExists) {
    console.log("\n\nSubmission already exists");
    return {
      test: {
        id: test.id,
        name: test.name,
        description: test.description,
        value: test.value,
        dueDate: test.dueDate,
        timer: test.timer,
        classroom: test.classroom?.name,
      },
      submission: submissionExists,
    };
  }

  if (!test.sections) return null;

  const sections = await generateSections(test);

  if (!sections) return null;

  const submission = await prisma.submission.create({
    data: {
      testId: test.id,
      userId,
      sections: sections as InputJsonValue,
    },
  });

  return {
    test: {
      id: test.id,
      name: test.name,
      description: test.description,
      value: test.value,
      dueDate: test.dueDate,
      timer: test.timer,
      classroom: test.classroom?.name,
    },
    submission,
  };
}

export const saveSubmission = async (submissionId: number, answers: Record<number, string>) => {
  const userId = await getUserId();
  if (!userId) return null;

  const submission = await prisma.submission.findFirst({
    where: {
      id: submissionId,
      userId,
      finishTime: null,
    },
  });

  if (!submission) return null;

  const updatedSubmission = await prisma.submission.update({
    where: {
      id: submission.id,
    },
    data: {
      answers,
    },
  });

  return updatedSubmission;
}

export const finishSubmission = async (submissionId: number, answers: Record<number, string>) => {
  const userId = await getUserId();
  if (!userId) return null;

  const submission = await prisma.submission.findFirst({
    where: {
      id: submissionId,
      userId,
      finishTime: null,
    },
  });

  if (!submission) return null;

  const updatedSubmission = await prisma.submission.update({
    where: {
      id: submission.id,
    },
    data: {
      answers,
      finishTime: new Date(),
    },
  });

  return updatedSubmission;
}