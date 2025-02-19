"use client"

import { Button } from "@/app/components/ui/button";
import { Tag } from "@/lib/types";
import { createContext, useContext, useEffect, useState } from "react";
import { MdAdd } from "react-icons/md";
import { TestSection } from "./test-section";
import { RandomQuestionsSection } from "./random-questions-section";
import { SpecificQuestionsSection } from "./specific-questions-section";
import { Popover, PopoverContent, PopoverTrigger } from "@/app/components/ui/popover";

type Section = RandomQuestionsSection | SpecificQuestionsSection;

type TestBuilderProps = {
    tags: Tag[];
    questionsGroupedByTag: {
        tagId: number;
        questions: number[];
    }[];
}

type SectionRendererProps = {
    section: Section;
}

type TestBuilderContextType = {
    tags: Tag[];
    questionsGroupedByTag: {
        tagId: number;
        questions: number[];
    }[];
    updateSection: (section: Section) => void;
    sections: Section[];
}

export const TestBuilderContext = createContext<TestBuilderContextType>({} as TestBuilderContextType);

const SectionRenderer = ({ section }: SectionRendererProps) => {
    if (section.type === "random") {
        return <RandomQuestionsSection section={section} />
    } else {
        return <SpecificQuestionsSection section={section} />
    }
}

export const TestBuilder = ({ tags, questionsGroupedByTag }: TestBuilderProps) => {
    const [sections, setSections] = useState<Section[]>([])

    const addRandomSection = () => {
        const newSection: RandomQuestionsSection = {
            id: Math.random().toString(),
            type: "random",
            numberOfQuestions: 3,
        }
        setSections([...sections, newSection])
    }

    const addSpecificSection = () => {
        const newSection: SpecificQuestionsSection = {
            id: Math.random().toString(),
            type: "specific",
            shuffle: false,
            questions: []
        }
        setSections([...sections, newSection])
    }

    const updateSection = (section: Section) => {
        setSections(sections.map(s => s.id === section.id ? section : s))
    }

    const contextValue = { sections, tags, questionsGroupedByTag, updateSection }

    return (
        <TestBuilderContext.Provider value={contextValue}>
            <div className="flex flex-col gap-8">
                {sections.map((section, index) => (
                    <TestSection key={index} number={index + 1} removeSection={() => {
                        setSections(sections.filter((_, i) => i !== index))
                    }}>
                        <SectionRenderer section={section} />
                    </TestSection>
                ))}
                <div className="flex flex-col gap-4">
                    <p className="text-sm">Nova seção</p>
                    <div className="flex gap-4">
                        <Button className="bg-blue-500 hover:bg-blue-600" onClick={addSpecificSection}>Escolher questões manualmente</Button>
                        <Button className="bg-blue-500 hover:bg-blue-600" onClick={addRandomSection}>Adicionar seção de questões aleatórias</Button>
                    </div>
                </div>
            </div>
        </TestBuilderContext.Provider>
    )
}