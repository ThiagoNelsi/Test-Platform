"use client";

import Link from "next/link";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { FaCheck, FaTrash } from "react-icons/fa";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/app/components/ui/collapsible";
import { useState } from "react";
import { MdKeyboardArrowDown, MdKeyboardArrowUp } from "react-icons/md";
import { CiLink } from "react-icons/ci";
import { deleteTest, getOwnedTests, publishTest } from "@/lib/test-service";
import { motion } from "framer-motion";
import { errorToast, infoToast, successToast } from "@/lib/toasters";
import { IoIosRocket } from "react-icons/io";
import Confirm from "./ui/confirm";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { BsThreeDotsVertical } from "react-icons/bs";

type Test = NonNullable<Awaited<ReturnType<typeof getOwnedTests>>>[0];

type TestListProps = {
  tests: Test[];
  title: string;
  defaultOpen?: boolean;
};

function PublishTest({ test }: { test: Test }) {
  const handlePublish = async (test: Test) => {
    if (!test.classroom) return;
    const res = await publishTest(test.id, [test.classroom.id]);
    if (res) {
      successToast("Prova publicada com sucesso");
      return location.reload();
    }

    return errorToast("Não foi possível publicar a prova");
  };

  return (
    <Confirm
      title="Tem certeza que deseja publicar a prova agora?"
      description="Os alunos poderão visualizar a prova e começar a responder."
      onConfirm={() => handlePublish(test)}
      confirmText="Publicar"
      confirmBtnStyle="bg-verdigris-400 text-white hover:bg-verdigris-300"
    >
      <Button
        variant="outline"
        className="font-light border-verdigris-500 text-primary hover:bg-verdigris-900"
      >
        <IoIosRocket />
        Publicar agora
      </Button>
    </Confirm>
  );
}

export default function TestList({
  tests: t,
  title,
  defaultOpen = false,
}: TestListProps) {
  const [tests, setTests] = useState(t);
  const [open, setOpen] = useState(defaultOpen);

  const handleDelete = async (test: Test) => {
    const res = await deleteTest(test.id, !(test.status === "draft"));
    if (res) {
      setTests(tests.filter((t) => t.id !== test.id));
      return successToast("Prova apagada com sucesso");
    }
    errorToast("Não foi possível apagar a prova");
  };

  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      className="border-t-8 border-opacity-30 flex flex-col bg-neutral-100 rounded px-4 py-0 shadow-md"
    >
      <CollapsibleTrigger className="flex items-center justify-between p-4 text-lg font-semibold ">
        <div className="flex items-center gap-2 text-base">
          {open ? <MdKeyboardArrowUp /> : <MdKeyboardArrowDown />}
          <p>{title}</p>
        </div>
        <span className="text-sm text-neutral-600">{tests.length}</span>
      </CollapsibleTrigger>
      <CollapsibleContent className="pb-4 mt-4">
        <motion.div
          className="flex flex-col gap-2"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: open ? 1 : 0, height: open ? "auto" : 0 }}
          transition={{ duration: 0.3 }}
        >
          <ul className="flex flex-col rounded overflow-hidden">
            {tests.map((test) => (
              <li
                key={test.id}
                className="relative border-l-8 border-verdigris-800 flex gap-2 md:gap-5 text-sm p-4 shadow-sm bg-white border-b"
              >
                <div className="flex flex-col gap-2 w-full ml-1">
                  <div className="flex justify-between">
                    <p className="text-sm font-medium">
                      {test.name}{" "}
                      {test.classroom && " - " + test.classroom.name}
                    </p>
                    {test.dueDate && test.status !== "draft" && (
                      <p className="flex ml-auto items-center gap-1 text-xs text-neutral-900 mr-4">
                        <CalendarIcon className="w-4 h-4" />
                        Entrega{" "}
                        {format(test.dueDate, "dd/MM 'às' HH:mm", {
                          locale: ptBR,
                        })}
                      </p>
                    )}
                    {test.status !== "draft" && (
                      <Popover>
                        <PopoverTrigger>
                          <BsThreeDotsVertical />
                        </PopoverTrigger>
                        <PopoverContent className="w-fit p-2">
                          <Confirm
                            title="Tem certeza que deseja apagar esta prova?"
                            description="Esta ação é irreversível! Não será mais possível acessá-la e todas as respostas serão perdidas."
                            confirmText="Apagar"
                            verificationText={test.name}
                            onConfirm={() => handleDelete(test)}
                            confirmBtnStyle="bg-red-500 text-white hover:bg-red-600"
                          >
                            <Button
                              variant="ghost"
                              className="text-xs md:text-sm text-red-500 hover:text-red-600"
                            >
                              Deletar prova
                            </Button>
                          </Confirm>
                        </PopoverContent>
                      </Popover>
                    )}
                  </div>
                  <p className="text-sm font-light mb-4 text-neutral-700">
                    {test.description?.slice(0, 150)}
                    {test.description &&
                      test.description?.length > 150 &&
                      "..."}
                  </p>
                  <div className="flex gap-6 items-end">
                    {test.status === "draft" ? (
                      <>
                        <Link href={`/provas/criar?test=${test.id}`}>
                          <Button
                            variant="outline"
                            className="text-xs md:text-sm bg-blue-500 text-white border-0 hover:bg-blue-600 hover:text-white"
                          >
                            Voltar a editar
                          </Button>
                        </Link>
                        <Confirm
                          title="Tem certeza que deseja apagar este rascunho?"
                          description="Esta ação é irreversível."
                          confirmText="Apagar"
                          onConfirm={() => handleDelete(test)}
                          confirmBtnStyle="bg-red-500 text-white hover:bg-red-600"
                        >
                          <Button
                            variant="outline"
                            className="text-xs md:text-sm text-neutral-800 border-neutral-500 hover:text-neutral-900"
                          >
                            Apagar rascunho
                          </Button>
                        </Confirm>
                      </>
                    ) : (
                      <Link href={`/provas/criar?test=${test.id}`}>
                        <Button
                          variant="outline"
                          className="text-xs md:text-sm bg-blue-500 text-white border-0 hover:bg-blue-600 hover:text-white"
                        >
                          Editar prova
                        </Button>
                      </Link>
                    )}
                    {test.status === "scheduled" && <PublishTest test={test} />}
                  </div>
                </div>
                <div className="w-[1px] bg-neutral-200" />
                <div className="flex flex-col items-center gap-2">
                  {test.status === "published" && (
                    <>
                      <p className="flex items-center gap-2 text-xs">
                        <FaCheck className="text-green-500" /> Entregues
                      </p>
                      <p className="mb-2">
                        {test._count.submissions} / {test.classroom?._count.students}
                      </p>
                      <Button
                        variant="ghost"
                        className="mt-auto text-xs"
                        onClick={() => {
                          navigator.clipboard.writeText(
                            `${window.location.origin}/prova/${test.id}`,
                          );
                          infoToast(
                            "Link copiado para a área de transferência",
                            {
                              position: "top-right",
                            },
                          );
                        }}
                      >
                        <CiLink />
                        Copiar link
                      </Button>
                    </>
                  )}
                  {test.status === "scheduled" && test.publishDate && (
                    <div className="flex items-center h-full gap-6">
                      <p className="text-xs text-neutral-900 w-28">
                        Agendada para
                        <br />
                        <strong className="font-semibold">
                          {format(test.publishDate, "dd/MM 'às' HH:mm", {
                            locale: ptBR,
                          })}
                        </strong>
                      </p>
                    </div>
                  )}
                  {test.status === "draft" && (
                    <div className="flex items-center h-full gap-6">
                      <p className="text-xs text-neutral-900 w-28 text-center">
                        Última modificação
                        <br />
                        <strong className="font-semibold">
                          {format(test.modifiedAt, "dd/MM 'às' HH:mm", {
                            locale: ptBR,
                          })}
                        </strong>
                      </p>
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </motion.div>
      </CollapsibleContent>
    </Collapsible>
  );
}
