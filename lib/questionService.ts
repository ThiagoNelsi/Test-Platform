"use server"

import { revalidatePath } from "next/cache"
import { getUserId } from "./auth"
import { prisma, prismaMongo } from "./prisma"
import { QuestionType } from "@/app/types"

const levelOptions = ['easy', 'medium', 'hard']

export const getQuestions = async (userId: number) => {
    const postgresData = await prisma.question.findMany({
        where: {
            authorId: userId
        }
    })

    const questionIds = postgresData.map((question) => question.id)

    const mongoData = await prismaMongo.questionData.findMany({
        where: {
            questionId: {
                in: questionIds
            }
        }
    });

    const questions = postgresData.map((question) => {
        const { data } = mongoData.find((data) => data.questionId === question.id) || {}

        const parsed = typeof data === 'string' ? JSON.parse(data) : data

        return {
            ...question,
            type: question.type as QuestionType,
            data: parsed
        }
    })

    return questions
}

export const createQuestion = async (formData: FormData) => {
    const userId = await getUserId()
    if (!userId) return null

    const type = formData.get('type') as string
    const level = formData.get('level') as string
    const data = formData.get('data') as string

    let question

    try {
        question = await prisma.question.create({
            data: {
                type,
                level: levelOptions.indexOf(level),
                authorId: userId,
            }
        });
    } catch (err) {
        return false
    }

    try {
        await prismaMongo.questionData.create({
            data: {
                questionId: question.id,
                data,
                type,
            }
        });

        revalidatePath('/questions')

        return true
    } catch (err) {
        await prisma.question.delete({
            where: {
                id: question.id
            }
        })
        return false
    }
}

export const updateQuestion = async (questionId: number, formData: FormData) => {
    const userId = await getUserId()
    if (!userId) return null

    const type = formData.get('type') as string
    const level = formData.get('level') as string
    const data = formData.get('data') as string

    try {
        await prisma.question.update({
            where: {
                id: questionId,
                authorId: userId,
            },
            data: {
                type,
                level: levelOptions.indexOf(level),
            }
        });
    } catch (err) {
        return false
    }

    try {
        const questionData = await prismaMongo.questionData.findFirst({
            where: {
                questionId,
            },
            select: {
                id: true,
            },
        });

        if (!questionData) {
            return false;
        }

        await prismaMongo.questionData.update({
            where: {
                id: questionData.id,
            },
            data: {
                data,
                type,
            },
        });

        revalidatePath("/questions");

        return true;
    } catch (err) {
        return false
    }
}

export const deleteQuestion = async (questionIds: number[]) => {
    try {
        const userId = await getUserId();
        if (!userId) return false;

        const [deletedQuestions] = await prisma.$transaction([
            prisma.question.deleteMany({
                where: {
                    id: { in: questionIds },
                    authorId: userId,
                },
            }),
            prismaMongo.questionData.deleteMany({
                where: { questionId: { in: questionIds } },
            }),
        ]);

        if (deletedQuestions.count === 0) return false;

        revalidatePath('/questions');

        return true;
    } catch (error) {
        console.error("Erro ao deletar questões:", error);
        return false;
    }
};