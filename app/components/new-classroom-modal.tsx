"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/app/components/ui/dialog";
import { useNewClassroomModal } from "../context/new-classroom-modal-context";
import { Input } from "@/app/components/ui/input";
import { Button } from "@/app/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/app/components/ui/tabs";
import { TabsContent } from "@radix-ui/react-tabs";
import { createClassroom, joinClassroom } from "@/lib/classroomService";
import { Loader } from "lucide-react";
import { FaRegCopy } from "react-icons/fa";
import { Classroom } from "@/prisma/generated/postgres";
import { toast } from "sonner";
import { useSession } from "next-auth/react";

const SuccessMessage = ({
  createdClassroom,
}: {
  createdClassroom: Classroom;
}) => {
  const { setOpen } = useNewClassroomModal();
  const [btnText, setBtnText] = useState("Copiar Código");

  const handleCopy = () => {
    navigator.clipboard.writeText(createdClassroom.code);
    setBtnText("Código copiado!");
    setTimeout(() => {
      setBtnText("Copiar Código");
      setOpen(false);
    }, 1000);
  };

  return (
    <div className="flex flex-col gap-2 my-4 p-4 bg-green-100 text-green-800 rounded-md">
      <p>✅ Turma criada com sucesso!</p>
      <p>
        Código: <strong>{createdClassroom.code}</strong>
      </p>
      <Button
        className="w-full bg-verdigris hover:bg-verdigris-400 flex items-center justify-center"
        onClick={handleCopy}
      >
        <FaRegCopy /> {btnText}
      </Button>
    </div>
  );
};

export default function NewClassroomModal() {
  const { data } = useSession();
  const userId = data?.user.id;

  const { open, setOpen } = useNewClassroomModal();
  const [createdClassroom, setCreatedClassroom] = useState<Classroom | null>(
    null,
  );
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setCreatedClassroom(null);
    }
  }, [open]);

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>,
    action: (formData: FormData) => Promise<any>,
  ) {
    event.preventDefault();
    setLoading(true);
    setCreatedClassroom(null);

    const formData = new FormData(event.currentTarget);

    try {
      const result = await action(formData);

      let errorMessage = "";

      if (result?.error === "Classroom already exists") {
        errorMessage = "Já existe uma turma com esse nome";
      }

      if (result?.error === "Classroom not found") {
        errorMessage = "Turma não encontrada";
      }

      if (errorMessage) {
        toast.error(errorMessage, {
          position: "top-center",
          style: {
            background: "#ef4444", // --red-500
            color: "#fff",
            border: 0,
          },
        });
        return;
      }

      if (result) {
        setCreatedClassroom(result);
      } else {
        toast.success("Você entrou na turma!", {
          position: "top-center",
          style: {
            background: "#529979", // ash_gray-300
            color: "#fff",
            border: 0,
          },
        });
        setOpen(false);
      }
    } catch (error) {
      console.error("Erro ao enviar formulário:", error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogTitle>Nova turma</DialogTitle>
        {createdClassroom ? (
          <SuccessMessage createdClassroom={createdClassroom} />
        ) : (
          <form onSubmit={(e) => handleSubmit(e, createClassroom)}>
            <Input
              className="mb-4"
              name="name"
              type="text"
              placeholder="Nome da turma"
              required
            />
            <Input type="hidden" name="userId" value={userId} />
            <Button
              type="submit"
              className="w-full bg-verdigris hover:bg-verdigris-400 flex items-center justify-center"
              disabled={loading}
            >
              {loading ? (
                <Loader className="w-4 h-4 animate-spin" />
              ) : (
                "Criar"
              )}
            </Button>
          </form>
        )}
        {/* <Tabs>
          <TabsList className="w-full justify-between mb-4">
            <TabsTrigger className="w-full" value="join">
              Entrar em uma turma
            </TabsTrigger>
            <TabsTrigger className="w-full" value="create">
              Criar uma turma
            </TabsTrigger>
          </TabsList>
          <TabsContent value="join">
            <form
              onSubmit={(e) => handleSubmit(e, joinClassroom)}
              className="flex gap-2"
            >
              <Input type="text" placeholder="Código" name="code" required />
              <Input type="hidden" name="userId" value={userId} />
              <Button
                type="submit"
                className="w-20 bg-verdigris hover:bg-verdigris-400 flex items-center justify-center"
                disabled={loading}
              >
                {loading ? (
                  <Loader className="w-4 h-4 animate-spin" />
                ) : (
                  "Entrar"
                )}
              </Button>
            </form>
          </TabsContent>
          <TabsContent value="create">
            
          </TabsContent>
        </Tabs> */}
      </DialogContent>
    </Dialog>
  );
}
