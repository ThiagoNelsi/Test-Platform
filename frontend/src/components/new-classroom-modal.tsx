
import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/src/components/ui/dialog";
import { useNewClassroomModal } from "../context/new-classroom-modal-context";
import { Input } from "@/src/components/ui/input";
import { Button } from "@/src/components/ui/button";
import { type Classroom } from "@/lib/classroomService";
import { Loader } from "lucide-react";
import { FaRegCopy } from "react-icons/fa";
import { useAuth } from "../hooks/useAuth";
import { useCreateClassroomMutation } from "../hooks/use-api-queries";
import { getApiErrorMessage } from "@/lib/backend-api";
import { errorToast } from "@/lib/toasters";

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
  const { user } = useAuth();
  const userId = user?.id;

  const { open, setOpen } = useNewClassroomModal();
  const [createdClassroom, setCreatedClassroom] = useState<Classroom | null>(
    null,
  );
  const createClassroomMutation = useCreateClassroomMutation();

  useEffect(() => {
    if (open) {
      setCreatedClassroom(null);
    }
  }, [open]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreatedClassroom(null);

    const formData = new FormData(event.currentTarget);

    try {
      const classroom = await createClassroomMutation.mutateAsync(formData);
      setCreatedClassroom(classroom);
    } catch (error) {
      const message = getApiErrorMessage(error, "Não foi possível criar a turma");
      errorToast(
        message === "Classroom already exists"
          ? "Já existe uma turma com esse nome"
          : message,
      );
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogTitle>Nova turma</DialogTitle>
        {createdClassroom ? (
          <SuccessMessage createdClassroom={createdClassroom} />
        ) : (
          <form onSubmit={handleSubmit}>
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
              disabled={createClassroomMutation.isPending}
            >
              {createClassroomMutation.isPending ? (
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
