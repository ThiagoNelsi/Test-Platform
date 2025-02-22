"use server"

import { revalidatePath } from "next/cache"
import { getUserId } from "./auth"
import { prisma } from "./prisma"
import { Question, QuestionType } from "@/lib/types"

const levelOptions = ['easy', 'medium', 'hard']

export const getQuestions = async (): Promise<Question[]> => {
    const userId = await getUserId()
    if (!userId) return []

    const postgresData = await prisma.question.findMany({
        where: {
            authorId: userId
        },
        include: {
            tags: true
        }
    })

    return postgresData.map((question) => {
        return {
            ...question,
            type: question.type as QuestionType,
            data: question.content,
        }
    })
}

export const createQuestion = async (formData: FormData) => {
    const userId = await getUserId()
    if (!userId) return null

    const type = formData.get('type') as string
    const level = formData.get('level') as string
    const data = formData.get('data') as string
    const tags = JSON.parse(formData.get('tags') as string) as number[]

    try {
        const question = await prisma.question.create({
            data: {
                type,
                level: levelOptions.indexOf(level),
                authorId: userId,
                content: JSON.parse(data),
                tags: {
                    connect: tags.map((tagId) => ({ id: tagId }))
                }
            }
        });
        revalidatePath('/questions')
        return true
    } catch (err) {
        return false
    }
}

export const updateQuestion = async (questionId: number, formData: FormData) => {
    const userId = await getUserId()
    if (!userId) return null

    const type = formData.get('type') as string
    const level = formData.get('level') as string
    const data = formData.get('data') as string
    const tags = JSON.parse(formData.get('tags') as string) as number[]

    try {
        const questionTags = await prisma.question.findUnique({
            where: {
                id: questionId
            },
            select: {
                tags: {
                    select: {
                        id: true
                    }
                }
            }
        });

        let disconnectTags: { id: number}[] = [];

        if (questionTags) {
            disconnectTags = questionTags.tags.filter(tag => {
                return !tags.includes(tag.id)
            })
        }

        await prisma.question.update({
            where: {
                id: questionId,
                authorId: userId,
            },
            data: {
                type,
                level: levelOptions.indexOf(level),
                tags: {
                    connect: tags.map((tagId) => ({ id: tagId })),
                    disconnect: disconnectTags,
                },
                content: JSON.parse(data),
            }
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

        const { count } = await prisma.question.deleteMany({
            where: {
                id: { in: questionIds },
                authorId: userId,
            },
        })

        if (count === 0) return false;

        revalidatePath('/questions');

        return true;
    } catch (error) {
        console.error("Erro ao deletar questões:", error);
        return false;
    }
};