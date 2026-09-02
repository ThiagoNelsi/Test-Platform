import type { Classroom } from "@/lib/classroomService";
import { IQuestion, Tag, TestData } from "@/lib/types";
import {
  createContext,
  Dispatch,
  ReactNode,
  SetStateAction,
  useContext,
  useState,
} from "react";

export type Section = {
  id: string;
  shuffle: boolean;
  questions: IQuestion[];
  selectionMode?: "all" | "random";
  randomQuestionCount?: number;
};

type CreateTestContextType = {
  tags: Tag[] | null;
  setTags: Dispatch<SetStateAction<Tag[] | null>>;
  test: TestData | null;
  setTest: Dispatch<SetStateAction<TestData | null>>;
  questions: IQuestion[] | null;
  setQuestions: Dispatch<SetStateAction<IQuestion[]>>;
  addSection: () => void;
  removeSection: (section: Section) => void;
  updateSection: (section: Section) => void;
  moveSection: (section: Section, direction: "up" | "down") => void;
  sections: Section[];
  setSections: Dispatch<SetStateAction<Section[]>>;
  allocatedQuestions: Map<number, string>;
  setAllocatedQuestions: (allocatedQuestion: Map<number, string>) => void;
  addQuestion: (section: Section, question: IQuestion) => void;
  removeQuestion: (section: Section, question: IQuestion) => void;
  moveQuestion: (
    section: Section,
    question: IQuestion,
    direction: "up" | "down",
  ) => void;
  testName: string;
  setTestName: Dispatch<SetStateAction<string>>;
  testValue: number;
  setTestValue: Dispatch<SetStateAction<number>>;
  testDescription: string;
  setTestDescription: Dispatch<SetStateAction<string>>;
  testDueDate: Date | undefined;
  setTestDueDate: Dispatch<SetStateAction<Date | undefined>>;
  testDuration: number;
  setTestDuration: Dispatch<SetStateAction<number>>;
  publishDate: Date | undefined;
  setPublishDate: Dispatch<SetStateAction<Date | undefined>>;
  enablePublishDate: boolean;
  setEnablePublishDate: Dispatch<SetStateAction<boolean>>;
  enableDueDate: boolean;
  setEnableDueDate: Dispatch<SetStateAction<boolean>>;
  classrooms: Classroom[];
  setClassrooms: Dispatch<SetStateAction<Classroom[]>>;
  selectedClassrooms: number[];
  setSelectedClassrooms: Dispatch<SetStateAction<number[]>>;
  autoSaveStatus: "saving" | Date | null;
  setAutoSaveStatus: Dispatch<SetStateAction<"saving" | Date | null>>;
};

type CreateTestProviderProps = {
  children: ReactNode;
};

export const CreateTestContext = createContext<CreateTestContextType>(
  {} as CreateTestContextType,
);

export const CreateTestProvider = ({ children }: CreateTestProviderProps) => {
  const createEmptySection = (): Section => ({
    id: Math.random().toString(),
    shuffle: false,
    questions: [] as IQuestion[],
    selectionMode: "all",
  });

  const [tags, setTags] = useState<Tag[] | null>(null);
  const [questions, setQuestions] = useState<IQuestion[]>([]);
  const [test, setTest] = useState<TestData | null>(null);
  const [testName, setTestName] = useState<string>(test?.name || "");
  const [testValue, setTestValue] = useState<number>(test?.value || 10);
  const [testDescription, setTestDescription] = useState<string>(test?.description || "");
  const [testDueDate, setTestDueDate] = useState<Date | undefined>(test?.dueDate || undefined);
  const [testDuration, setTestDuration] = useState<number>(test?.duration || 0);
  const [publishDate, setPublishDate] = useState<Date | undefined>(test?.publishDate || undefined);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [selectedClassrooms, setSelectedClassrooms] = useState<number[]>([]);
  const [enablePublishDate, setEnablePublishDate] = useState<boolean>(Boolean(test?.publishDate));
  const [enableDueDate, setEnableDueDate] = useState<boolean>(Boolean(test?.dueDate));
  const [autoSaveStatus, setAutoSaveStatus] = useState<"saving" | Date | null>(null);
  const [allocatedQuestions, setAllocatedQuestions] = useState(new Map<number, string>());
  const [sections, setSections] = useState<Section[]>([createEmptySection()]);

  const addSection = () => {
    setSections([...sections, createEmptySection()]);
  };

  const updateSection = (section: Section) => {
    setSections(sections.map((s) => (s.id === section.id ? section : s)));
  };

  const removeSection = (section: Section) => {
    if (sections.length === 1) return;

    section.questions.forEach((q) => {
      allocatedQuestions.delete(q.id);
    });
    setSections(sections.filter((s) => s.id !== section.id));
  };

  const moveSection = (section: Section, direction: "up" | "down") => {
    const s = sections.find((s) => s.id === section.id);
    const index = s ? sections.indexOf(s) : -1;

    const newIndex = direction === "up" ? index - 1 : index + 1;
    const newSections = [...sections];
    newSections.splice(index, 1);
    newSections.splice(newIndex, 0, section);
    setSections(newSections);
  };

  const addQuestion = (section: Section, question: IQuestion) => {
    allocatedQuestions.set(question.id, section.id);
    updateSection({
      ...section,
      questions: [...section.questions, question],
    });
  };

  const removeQuestion = (section: Section, question: IQuestion) => {
    allocatedQuestions.delete(question.id);
    section.questions = section.questions.filter((q) => q.id !== question.id);
    updateSection(section);
  };

  const moveQuestion = (
    section: Section,
    question: IQuestion,
    direction: "up" | "down",
  ) => {
    const index = section.questions.indexOf(question);
    const newIndex = direction === "up" ? index - 1 : index + 1;
    const newQuestions = [...section.questions];
    newQuestions.splice(index, 1);
    newQuestions.splice(newIndex, 0, question);
    updateSection({
      ...section,
      questions: newQuestions,
    });
  };

  const contextValue: CreateTestContextType = {
    tags,
    setTags,
    test,
    setTest,
    allocatedQuestions,
    setAllocatedQuestions,
    sections,
    setSections,
    addSection,
    updateSection,
    removeSection,
    moveSection,
    questions,
    setQuestions,
    moveQuestion,
    addQuestion,
    removeQuestion,
    testName,
    setTestName,
    testValue,
    setTestValue,
    testDescription,
    setTestDescription,
    testDueDate,
    setTestDueDate,
    testDuration,
    setTestDuration,
    publishDate,
    setPublishDate,
    enablePublishDate,
    setEnablePublishDate,
    enableDueDate,
    setEnableDueDate,
    classrooms,
    setClassrooms,
    selectedClassrooms,
    setSelectedClassrooms,
    autoSaveStatus,
    setAutoSaveStatus,
  };

  return (
    <CreateTestContext.Provider value={contextValue}>
      {children}
    </CreateTestContext.Provider>
  );
};

export const useCreateTest = () => {
  return useContext(CreateTestContext);
};
