"use server"

import { Tag } from "@/app/types"
import { prisma } from "./prisma"
import { getUserId } from "./auth"

export const createTag = async (tag: Pick<Tag, 'name' | 'color'>) => {
    const userId = await getUserId()
    if (!userId) return {
        error: 'Usuário não autenticado'
    }

    const existingTag = await prisma.tag.findFirst({
        where: {
            userId,
            name: tag.name,
        }
    })

    if (existingTag) return {
        error: 'Tag já existe'
    }

    const created = await prisma.tag.create({
        data: {
            ...tag,
            userId,
        }
    })

    return {
        success: true,
        tag: created
    }
}

export const getTags = async () => {
    const userId = await getUserId()
    if (!userId) return []

    return prisma.tag.findMany({
        where: {
            userId
        }
    })
}