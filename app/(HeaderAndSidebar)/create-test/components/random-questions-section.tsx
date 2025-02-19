import { RemovableTag } from "@/app/components/removable-tag";
import { TagSelector } from "@/app/components/tag-selector";
import { Input } from "@/app/components/ui/input";
import { Tag } from "@/lib/types";
import { useContext, useState } from "react";
import { TestBuilderContext } from "./test-builder";

export type RandomQuestionsSection = {
    id: string;
    type: "random";
    tag?: Tag;
    numberOfQuestions: number;
}

type RandomQuestionsSectionProps = {
    section: RandomQuestionsSection;
}

export const RandomQuestionsSection = ({ section }: RandomQuestionsSectionProps) => {
    const { tags, updateSection, sections, questionsGroupedByTag } = useContext(TestBuilderContext)

    const setNumberOfQuestions = (numberOfQuestions: number) => {
        updateSection({ ...section, numberOfQuestions })
    }

    const setTag = (tag: Tag | undefined) => {
        updateSection({ ...section, tag })
    }

    // TODO
    const getMaxNumberOfQuestions = (tagId: number) => {
        const questions = questionsGroupedByTag.find(q => q.tagId === tagId)?.questions
    }

    return (
        <div className="flex flex-col gap-2">
            <div className="flex flex-wrap gap-2 items-center">
                <span>Sortear</span>
                <Input value={section.numberOfQuestions} onChange={(e) => setNumberOfQuestions(Number(e.target.value))} className="bg-white w-16" type="number" min={1} />
                <span>questões de</span>
                {section.tag
                    ? <RemovableTag tag={section.tag} onRemove={() => setTag(undefined)} />
                    : <div className="w-45">
                        <TagSelector tags={tags} onSelect={setTag} />
                    </div>
                }
            </div>
            {section.tag && <p className="text-sm my-3">Ao acessar a prova o sistema sorteará <strong>{section.numberOfQuestions} questões</strong> com a tag <strong>{section.tag.name}</strong> para o aluno</p>}
        </div>
    )
}