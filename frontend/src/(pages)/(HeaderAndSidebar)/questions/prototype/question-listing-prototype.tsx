
import { useEffect, useMemo, useState } from "react";
import {
  ArrowUpRight,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Circle,
  ClipboardCheck,
  CopyPlus,
  Eye,
  Filter,
  Layers3,
  ListFilter,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  SlidersHorizontal,
  Sparkles,
  Target,
  X,
} from "lucide-react";
import { AppLink, useAppSearchParams } from "@/src/components/router-helpers";
import { cn } from "@/lib/utils";

/**
 * PROTOTYPE — three question-listing directions, switchable with ?variant=.
 * This file is deliberately disposable. It uses local demo data and does not
 * call the question API or persist any interaction.
 */

export const PROTOTYPE_VARIANTS = [
  { key: "focus", name: "Mesa de foco" },
  { key: "shelf", name: "Catálogo editorial" },
  { key: "radar", name: "Radar de triagem" },
] as const;

export type PrototypeVariant = (typeof PROTOTYPE_VARIANTS)[number]["key"];
type PrototypeMode = "personal" | "explore";
type Difficulty = 0 | 1 | 2;

type DemoQuestion = {
  id: number;
  subject: string;
  topic: string;
  source: string;
  level: Difficulty;
  statement: string;
  options: string[];
  answer: number;
  tags: string[];
  usage: number;
  updated: string;
  review: string;
};

const DEMO_QUESTIONS: DemoQuestion[] = [
  {
    id: 101,
    subject: "Biologia",
    topic: "Ecologia",
    source: "ENEM 2023",
    level: 2,
    statement:
      "Em uma área de Mata Atlântica, a retirada de uma espécie de árvore alterou a quantidade de luz que chega ao solo e a umidade do ambiente. Qual consequência é mais provável nesse ecossistema?",
    options: [
      "Aumento da diversidade de espécies de sombra.",
      "Redução de organismos adaptados à baixa luminosidade.",
      "Interrupção imediata de todos os ciclos biogeoquímicos.",
      "Aumento da salinidade do solo pela evaporação.",
      "Desaparecimento dos decompositores da serapilheira.",
    ],
    answer: 1,
    tags: ["Ecologia", "Relações ecológicas"],
    usage: 14,
    updated: "há 2 dias",
    review: "Revisar antes da próxima prova",
  },
  {
    id: 102,
    subject: "Matemática",
    topic: "Funções",
    source: "FUVEST 2022",
    level: 1,
    statement:
      "Uma empresa acompanha o número de acessos a uma página por meio da função f(t) = 120 + 40t, em que t representa o número de horas desde o início de uma campanha.",
    options: [
      "40 acessos por hora.",
      "80 acessos por hora.",
      "120 acessos por hora.",
      "160 acessos por hora.",
      "240 acessos por hora.",
    ],
    answer: 0,
    tags: ["Funções", "Leitura de gráfico"],
    usage: 8,
    updated: "há 4 dias",
    review: "Boa para aquecimento",
  },
  {
    id: 103,
    subject: "História",
    topic: "Brasil República",
    source: "ENEM 2021",
    level: 0,
    statement:
      "A Constituição de 1988 ampliou direitos sociais e consolidou novas formas de participação política no Brasil. Esse processo está associado principalmente à",
    options: [
      "centralização do poder executivo.",
      "redemocratização após o regime militar.",
      "substituição do voto direto pelo censitário.",
      "redução da autonomia dos municípios.",
      "criação do Estado Novo.",
    ],
    answer: 1,
    tags: ["Constituição", "Redemocratização"],
    usage: 21,
    updated: "há 1 semana",
    review: "Usada em 3 listas",
  },
  {
    id: 104,
    subject: "Linguagens",
    topic: "Interpretação",
    source: "UNESP 2023",
    level: 1,
    statement:
      "No trecho apresentado, a escolha de palavras coloquiais aproxima o narrador do leitor e produz um efeito de intimidade. A estratégia contribui para",
    options: [
      "negar a subjetividade do relato.",
      "construir uma voz narrativa mais próxima.",
      "transformar o texto em uma notícia.",
      "eliminar a ambiguidade do argumento.",
      "marcar uma linguagem exclusivamente técnica.",
    ],
    answer: 1,
    tags: ["Gêneros textuais", "Efeito de sentido"],
    usage: 5,
    updated: "há 1 semana",
    review: "Adicionar contexto do texto-base",
  },
  {
    id: 105,
    subject: "Física",
    topic: "Energia",
    source: "ENEM 2022",
    level: 2,
    statement:
      "Uma residência substitui lâmpadas incandescentes por lâmpadas LED de mesma luminosidade. Considerando o mesmo tempo de uso, a principal mudança esperada é a",
    options: [
      "redução da energia elétrica consumida.",
      "redução da tensão fornecida pela rede.",
      "elevação da corrente no circuito.",
      "manutenção da potência dissipada.",
      "inversão do sentido da corrente.",
    ],
    answer: 0,
    tags: ["Potência", "Consumo"],
    usage: 12,
    updated: "há 2 semanas",
    review: "Conferir distratores",
  },
  {
    id: 106,
    subject: "Química",
    topic: "Soluções",
    source: "UERJ 2020",
    level: 0,
    statement:
      "Ao dissolver uma pequena quantidade de sal em água, obtém-se uma mistura homogênea. Nessa mistura, a água desempenha o papel de",
    options: ["soluto.", "catalisador.", "solvente.", "precipitado.", "indicador."],
    answer: 2,
    tags: ["Concentração", "Misturas"],
    usage: 18,
    updated: "há 3 semanas",
    review: "Pronta para usar",
  },
  {
    id: 107,
    subject: "Geografia",
    topic: "Urbanização",
    source: "ENEM 2023",
    level: 1,
    statement:
      "A expansão das áreas impermeabilizadas modifica o escoamento da água da chuva e pode agravar alagamentos. Uma política urbana coerente com esse problema é",
    options: [
      "ampliar a pavimentação de áreas verdes.",
      "canalizar todos os cursos d'água.",
      "criar superfícies permeáveis e áreas de retenção.",
      "reduzir a arborização das calçadas.",
      "concentrar a drenagem em um único ponto.",
    ],
    answer: 2,
    tags: ["Cidades", "Meio ambiente"],
    usage: 7,
    updated: "há 1 mês",
    review: "Relacionar com repertório local",
  },
  {
    id: 108,
    subject: "Biologia",
    topic: "Genética",
    source: "UNICAMP 2024",
    level: 0,
    statement:
      "Em uma família, uma característica recessiva manifesta-se apenas quando o indivíduo recebe duas cópias do alelo associado. O casal apresentado é heterozigoto para essa característica.",
    options: [
      "A probabilidade de um filho afetado é de 25%.",
      "Todos os filhos serão afetados.",
      "Nenhum filho poderá ser portador.",
      "A característica é necessariamente ligada ao sexo.",
      "A probabilidade de um filho afetado é de 75%.",
    ],
    answer: 0,
    tags: ["Hereditariedade", "Probabilidade"],
    usage: 10,
    updated: "há 1 mês",
    review: "Pronta para usar",
  },
  {
    id: 109,
    subject: "Matemática",
    topic: "Geometria",
    source: "ENEM 2024",
    level: 2,
    statement:
      "Um jardim retangular terá uma faixa de mesma largura construída ao redor de todo o seu perímetro. Para estimar a quantidade de piso, é necessário comparar as áreas do jardim e da faixa.",
    options: [
      "Apenas o perímetro interno.",
      "As dimensões do jardim e a largura da faixa.",
      "Somente a diagonal do jardim.",
      "A altura média das plantas.",
      "O número de lados do terreno vizinho.",
    ],
    answer: 1,
    tags: ["Área", "Modelagem"],
    usage: 3,
    updated: "há 2 meses",
    review: "Ainda não revisada",
  },
];

const SUBJECTS = Array.from(new Set(DEMO_QUESTIONS.map((question) => question.subject)));

const LEVELS: { value: Difficulty; label: string; short: string; color: string }[] = [
  { value: 0, label: "Fácil", short: "Fácil", color: "#44725e" },
  { value: 1, label: "Médio", short: "Médio", color: "#b27a3d" },
  { value: 2, label: "Difícil", short: "Difícil", color: "#b25249" },
];

const LETTERS = ["A", "B", "C", "D", "E"];

export function isQuestionPrototypeVariant(
  value: string | null,
): value is PrototypeVariant {
  return PROTOTYPE_VARIANTS.some((variant) => variant.key === value);
}

type SharedVariantProps = {
  mode: PrototypeMode;
  questions: DemoQuestion[];
  selectedIds: number[];
  activeQuestion: DemoQuestion | null;
  query: string;
  subjectFilter: string | null;
  levelFilter: Difficulty | null;
  setQuery: (value: string) => void;
  setSubjectFilter: (value: string | null) => void;
  setLevelFilter: (value: Difficulty | null) => void;
  setActiveQuestionId: (id: number) => void;
  toggleSelected: (id: number) => void;
  clearSelection: () => void;
};

export default function QuestionListingPrototype({
  mode,
  variant: fallbackVariant,
}: {
  mode: PrototypeMode;
  variant: PrototypeVariant;
}) {
  const [params, setSearchParams] = useAppSearchParams();
  const [query, setQuery] = useState("");
  const [subjectFilter, setSubjectFilter] = useState<string | null>(null);
  const [levelFilter, setLevelFilter] = useState<Difficulty | null>(null);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [activeQuestionId, setActiveQuestionId] = useState(DEMO_QUESTIONS[0].id);

  const queryVariant = params.get("variant");
  const variant = isQuestionPrototypeVariant(queryVariant)
    ? queryVariant
    : fallbackVariant;

  const filteredQuestions = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();

    return DEMO_QUESTIONS.filter((question) => {
      const matchesQuery =
        normalizedQuery.length === 0 ||
        [question.statement, question.subject, question.topic, question.source, ...question.tags]
          .join(" ")
          .toLocaleLowerCase()
          .includes(normalizedQuery);
      const matchesSubject = !subjectFilter || question.subject === subjectFilter;
      const matchesLevel = levelFilter === null || question.level === levelFilter;

      return matchesQuery && matchesSubject && matchesLevel;
    });
  }, [levelFilter, query, subjectFilter]);

  const activeQuestion =
    filteredQuestions.find((question) => question.id === activeQuestionId) ??
    filteredQuestions[0] ??
    null;

  useEffect(() => {
    if (filteredQuestions.length > 0 && !filteredQuestions.some((question) => question.id === activeQuestionId)) {
      setActiveQuestionId(filteredQuestions[0].id);
    }
  }, [activeQuestionId, filteredQuestions]);

  const setVariant = (nextVariant: PrototypeVariant) => {
    setSearchParams(
      (previous) => {
        previous.set("variant", nextVariant);
        return previous;
      },
      { replace: true },
    );
  };

  const toggleSelected = (id: number) => {
    setSelectedIds((current) =>
      current.includes(id) ? current.filter((selectedId) => selectedId !== id) : [...current, id],
    );
  };

  const clearSelection = () => setSelectedIds([]);

  const sharedProps: SharedVariantProps = {
    mode,
    questions: filteredQuestions,
    selectedIds,
    activeQuestion,
    query,
    subjectFilter,
    levelFilter,
    setQuery,
    setSubjectFilter,
    setLevelFilter,
    setActiveQuestionId,
    toggleSelected,
    clearSelection,
  };

  return (
    <div className="-mx-10 -mt-4 min-h-[calc(100vh-4.5rem)] overflow-x-hidden">
      {variant === "focus" && <FocusVariant {...sharedProps} />}
      {variant === "shelf" && <ShelfVariant {...sharedProps} />}
      {variant === "radar" && <RadarVariant {...sharedProps} />}
      <PrototypeSwitcher current={variant} onChange={setVariant} />
    </div>
  );
}

function PrototypeSwitcher({
  current,
  onChange,
}: {
  current: PrototypeVariant;
  onChange: (variant: PrototypeVariant) => void;
}) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target;
      if (target instanceof HTMLElement) {
        const isTyping =
          target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable;
        if (isTyping) return;
      }

      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;

      event.preventDefault();
      const currentIndex = PROTOTYPE_VARIANTS.findIndex((variant) => variant.key === current);
      const offset = event.key === "ArrowRight" ? 1 : -1;
      const nextIndex = (currentIndex + offset + PROTOTYPE_VARIANTS.length) % PROTOTYPE_VARIANTS.length;
      onChange(PROTOTYPE_VARIANTS[nextIndex].key);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [current, onChange]);

  if (import.meta.env.PROD) return null;

  const currentIndex = PROTOTYPE_VARIANTS.findIndex((variant) => variant.key === current);
  const previous = PROTOTYPE_VARIANTS[(currentIndex - 1 + PROTOTYPE_VARIANTS.length) % PROTOTYPE_VARIANTS.length];
  const next = PROTOTYPE_VARIANTS[(currentIndex + 1) % PROTOTYPE_VARIANTS.length];

  return (
    <div className="fixed inset-x-0 bottom-4 z-[80] flex justify-center px-4">
      <div className="flex w-full max-w-[460px] items-center justify-between gap-2 rounded-2xl border border-[#233334] bg-[#18292b] px-2 py-2 text-[#f0eee3] shadow-[0_18px_45px_rgba(24,41,43,0.28)]">
        <button
          type="button"
          aria-label={`Ver ${previous.name}`}
          title={`Anterior: ${previous.name}`}
          onClick={() => onChange(previous.key)}
          className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-[#a6b9af] transition hover:bg-[#274345] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c3d86b]"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div className="min-w-0 text-center">
          <p className="text-[9px] font-semibold uppercase tracking-[0.22em] text-[#aec3b7]">Interface lab · protótipo</p>
          <p className="truncate text-sm font-semibold">
            {current.toUpperCase()} <span className="font-normal text-[#a6b9af]">— {PROTOTYPE_VARIANTS[currentIndex].name}</span>
          </p>
          <p className="mt-0.5 text-[10px] text-[#829b94]">← → para alternar · URL compartilhável</p>
        </div>
        <button
          type="button"
          aria-label={`Ver ${next.name}`}
          title={`Próximo: ${next.name}`}
          onClick={() => onChange(next.key)}
          className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-[#a6b9af] transition hover:bg-[#274345] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c3d86b]"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}

function FocusVariant(props: SharedVariantProps) {
  const { activeQuestion } = props;
  const isExplore = props.mode === "explore";

  return (
    <section className="min-h-[calc(100vh-4.5rem)] bg-[#f3efe6] text-[#213133]">
      <div className="mx-auto max-w-[1480px] px-5 pb-32 pt-7 sm:px-8 lg:px-12">
        <div className="flex flex-col justify-between gap-8 border-b border-[#d8d0c0] pb-7 lg:flex-row lg:items-end">
          <div className="max-w-3xl">
            <div className="mb-4 flex flex-wrap items-center gap-3 text-[10px] font-bold uppercase tracking-[0.2em] text-[#7a8d84]">
              <span className="inline-flex items-center gap-2 rounded-full border border-[#bdc9b9] bg-[#e9eee4] px-3 py-1.5 text-[#3d6452]">
                <Circle className="h-2.5 w-2.5 fill-current" /> Modo foco
              </span>
              <span>{isExplore ? "Banco público · curadoria" : "Seu banco · revisão"}</span>
            </div>
            <h1 className="max-w-2xl font-serif text-4xl leading-[0.98] tracking-[-0.04em] text-[#263a39] sm:text-6xl">
              Uma pergunta por vez.
              <em className="block font-normal text-[#557d6b]">Mais atenção, menos ruído.</em>
            </h1>
            <p className="mt-5 max-w-xl text-sm leading-6 text-[#64756f]">
              Leia, confira as alternativas e decida o destino da questão sem perder o contexto da sua fila.
            </p>
          </div>

          <div className="flex shrink-0 items-end gap-8 border-l border-[#d8d0c0] pl-6 text-right">
            <div>
              <p className="font-serif text-4xl leading-none text-[#263a39]">{props.questions.length.toString().padStart(2, "0")}</p>
              <p className="mt-2 text-[10px] font-bold uppercase tracking-[0.18em] text-[#809088]">na fila</p>
            </div>
            <div>
              <p className="font-serif text-4xl leading-none text-[#557d6b]">{props.selectedIds.length.toString().padStart(2, "0")}</p>
              <p className="mt-2 text-[10px] font-bold uppercase tracking-[0.18em] text-[#809088]">separadas</p>
            </div>
          </div>
        </div>

        <FocusSurfaceNav mode={props.mode} />

        <div className="mt-7 grid gap-5 lg:grid-cols-[minmax(280px,0.42fr)_minmax(0,1fr)]">
          <aside className="flex min-h-[640px] flex-col rounded-[1.35rem] border border-[#d7cfbf] bg-[#fbf9f3] p-3 shadow-[0_12px_35px_rgba(92,75,48,0.06)]">
            <div className="flex items-center justify-between px-3 pb-3 pt-2">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#8a9a92]">Fila de trabalho</p>
                <h2 className="mt-1 font-serif text-2xl text-[#2c403e]">Questões</h2>
              </div>
              <button
                type="button"
                className="grid h-9 w-9 place-items-center rounded-full border border-[#d3d9cc] text-[#6c8378] transition hover:bg-[#eaf0e5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#557d6b]"
                aria-label="Opções da fila"
              >
                <MoreHorizontal className="h-4 w-4" />
              </button>
            </div>

            <div className="relative px-1 pb-3">
              <Search className="pointer-events-none absolute left-4 top-3 h-4 w-4 text-[#94a49c]" />
              <input
                type="search"
                value={props.query}
                onChange={(event) => props.setQuery(event.target.value)}
                placeholder="Buscar na fila..."
                className="h-10 w-full rounded-xl border border-[#dfe3d8] bg-[#f2f3ec] pl-10 pr-3 text-sm text-[#2c403e] outline-none placeholder:text-[#a0aaa2] focus:border-[#84a28f] focus:ring-2 focus:ring-[#dce9d9]"
              />
            </div>

            <div className="flex gap-2 overflow-x-auto px-1 pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <FilterSelect
                value={props.subjectFilter ?? ""}
                onChange={(value) => props.setSubjectFilter(value || null)}
                options={SUBJECTS}
                allLabel="Disciplina"
              />
              <FilterSelect
                value={props.levelFilter === null ? "" : String(props.levelFilter)}
                onChange={(value) => props.setLevelFilter(value === "" ? null : Number(value) as Difficulty)}
                options={LEVELS.map((level) => ({ value: String(level.value), label: level.label }))}
                allLabel="Nível"
              />
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto pr-1">
              {props.questions.map((question, index) => (
                <FocusQueueItem
                  key={question.id}
                  question={question}
                  index={index}
                  active={activeQuestion?.id === question.id}
                  selected={props.selectedIds.includes(question.id)}
                  onSelect={() => props.setActiveQuestionId(question.id)}
                  onToggle={() => props.toggleSelected(question.id)}
                />
              ))}
              {props.questions.length === 0 && <EmptySearchState onClear={() => { props.setQuery(""); props.setSubjectFilter(null); props.setLevelFilter(null); }} />}
            </div>
          </aside>

          <main className="min-w-0 rounded-[1.35rem] border border-[#d7cfbf] bg-[#fbf9f3] shadow-[0_12px_35px_rgba(92,75,48,0.06)]">
            {activeQuestion ? <FocusQuestionDetail {...props} question={activeQuestion} /> : <div className="grid min-h-[640px] place-items-center p-8 text-center text-[#7e8e86]">Escolha uma questão para começar.</div>}
          </main>
        </div>
      </div>
      {props.selectedIds.length > 0 && <FocusSelectionDock {...props} />}
    </section>
  );
}

function FocusSurfaceNav({ mode }: { mode: PrototypeMode }) {
  return (
    <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
      <div className="inline-flex rounded-full border border-[#d7cfbf] bg-[#e9e5da] p-1 text-xs font-semibold text-[#718077]">
        <AppLink
          to="/questoes?variant=focus"
          className={cn("rounded-full px-4 py-2 transition", mode === "personal" ? "bg-[#fbf9f3] text-[#2f5346] shadow-sm" : "hover:text-[#2f5346]")}
        >
          Meu banco
        </AppLink>
        <AppLink
          to="/questoes/explorar?variant=focus"
          className={cn("rounded-full px-4 py-2 transition", mode === "explore" ? "bg-[#fbf9f3] text-[#2f5346] shadow-sm" : "hover:text-[#2f5346]")}
        >
          Explorar
        </AppLink>
      </div>
      <div className="flex items-center gap-2 text-xs text-[#7e8e86]">
        <ClipboardCheck className="h-4 w-4 text-[#557d6b]" />
        <span>Estado local: {mode === "explore" ? "seleção para importar" : "fila de revisão"}</span>
      </div>
    </div>
  );
}

function FocusQueueItem({
  question,
  index,
  active,
  selected,
  onSelect,
  onToggle,
}: {
  question: DemoQuestion;
  index: number;
  active: boolean;
  selected: boolean;
  onSelect: () => void;
  onToggle: () => void;
}) {
  const level = LEVELS[question.level];

  return (
    <div className={cn("group mb-1 flex items-start gap-2 rounded-xl p-2 transition", active ? "bg-[#e8eee5]" : "hover:bg-[#f1f3ec]")}>
      <button
        type="button"
        onClick={onSelect}
        className="flex min-w-0 flex-1 items-start gap-3 rounded-lg p-1 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#557d6b]"
      >
        <span className={cn("mt-0.5 w-7 shrink-0 text-right font-mono text-[11px] font-semibold", active ? "text-[#557d6b]" : "text-[#a7afa4]")}>
          {String(index + 1).padStart(2, "0")}
        </span>
        <span className="min-w-0">
          <span className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.13em] text-[#77897f]">
            <span className="truncate">{question.subject}</span>
            <span className="h-1 w-1 shrink-0 rounded-full" style={{ backgroundColor: level.color }} />
            <span className="shrink-0">{question.source}</span>
          </span>
          <span className={cn("mt-1.5 block text-xs leading-5", active ? "text-[#29403a]" : "text-[#687872] group-hover:text-[#3d524b]")}>{question.statement}</span>
        </span>
      </button>
      <button
        type="button"
        onClick={onToggle}
        aria-label={selected ? "Remover da seleção" : "Selecionar questão"}
        className={cn("mt-1 grid h-7 w-7 shrink-0 place-items-center rounded-full border transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#557d6b]", selected ? "border-[#557d6b] bg-[#557d6b] text-white" : "border-[#cbd5c9] text-transparent hover:border-[#7fa08d] group-hover:text-[#b1c1b4]")}
      >
        <Check className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function FocusQuestionDetail({ question, ...props }: SharedVariantProps & { question: DemoQuestion }) {
  const level = LEVELS[question.level];
  const selected = props.selectedIds.includes(question.id);

  return (
    <div className="flex min-h-[640px] flex-col">
      <div className="flex flex-wrap items-start justify-between gap-5 border-b border-[#e0d9ca] px-6 py-5 sm:px-9">
        <div>
          <div className="flex flex-wrap items-center gap-2 text-[10px] font-bold uppercase tracking-[0.17em] text-[#8b9a91]">
            <span>Questão {question.id}</span>
            <span className="h-1 w-1 rounded-full bg-[#a8b4a9]" />
            <span>{question.source}</span>
          </div>
          <h2 className="mt-2 font-serif text-3xl tracking-[-0.03em] text-[#2b403d] sm:text-4xl">{question.topic}</h2>
        </div>
        <button
          type="button"
          onClick={() => props.toggleSelected(question.id)}
          className={cn("inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#557d6b]", selected ? "border-[#557d6b] bg-[#557d6b] text-white" : "border-[#cbd7c9] text-[#557d6b] hover:bg-[#eaf0e5]")}
        >
          {selected ? <CheckCircle2 className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {selected ? "Na seleção" : props.mode === "explore" ? "Selecionar para importar" : "Separar para prova"}
        </button>
      </div>

      <div className="flex-1 px-6 py-8 sm:px-12 sm:py-12">
        <div className="mb-7 flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-[#e9eee4] px-3 py-1.5 text-[11px] font-bold text-[#47705b]">{question.subject}</span>
          <span className="rounded-full border border-[#d9d8ca] px-3 py-1.5 text-[11px] font-semibold text-[#718078]">{question.topic}</span>
          <span className="inline-flex items-center gap-2 rounded-full border border-[#d9d8ca] px-3 py-1.5 text-[11px] font-semibold text-[#718078]"><span className="h-2 w-2 rounded-full" style={{ backgroundColor: level.color }} />{level.label}</span>
        </div>

        <p className="max-w-3xl text-lg leading-8 text-[#2d403d] sm:text-[1.3rem] sm:leading-9">{question.statement}</p>

        <div className="mt-10 max-w-3xl space-y-2.5">
          {question.options.map((option, index) => (
            <div key={option} className={cn("flex items-start gap-4 rounded-xl border px-4 py-3.5 text-sm leading-6", index === question.answer ? "border-[#b8d0bc] bg-[#edf4ea] text-[#315541]" : "border-[#e4dfd3] bg-[#faf8f2] text-[#65756e]")}>
              <span className={cn("grid h-7 w-7 shrink-0 place-items-center rounded-full border text-[11px] font-bold", index === question.answer ? "border-[#71a181] bg-[#d6e8d3] text-[#376249]" : "border-[#d6d9cf] text-[#829087]")}>{LETTERS[index]}</span>
              <span>{option}</span>
              {index === question.answer && <Check className="ml-auto mt-1 h-4 w-4 shrink-0 text-[#4d8b62]" />}
            </div>
          ))}
        </div>
      </div>

      <footer className="flex flex-wrap items-center justify-between gap-4 border-t border-[#e0d9ca] px-6 py-4 sm:px-9">
        <div className="flex items-center gap-3 text-xs text-[#87938b]">
          <span>Usada em {question.usage} listas</span>
          <span className="h-1 w-1 rounded-full bg-[#b7beb4]" />
          <span>{question.updated}</span>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-[#6c8076] transition hover:bg-[#edf0e7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#557d6b]"><Eye className="h-4 w-4" />Modo aluno</button>
          {!props.mode || props.mode === "personal" ? <button type="button" className="inline-flex items-center gap-2 rounded-lg bg-[#2f5346] px-3 py-2 text-xs font-bold text-white transition hover:bg-[#244338] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#557d6b]"><Pencil className="h-4 w-4" />Editar questão</button> : <button type="button" className="inline-flex items-center gap-2 rounded-lg bg-[#2f5346] px-3 py-2 text-xs font-bold text-white transition hover:bg-[#244338] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#557d6b]"><CopyPlus className="h-4 w-4" />Adicionar ao banco</button>}
        </div>
      </footer>
    </div>
  );
}

function FocusSelectionDock({ selectedIds, mode, clearSelection }: SharedVariantProps) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-[65] flex justify-center border-t border-[#cbd6c8] bg-[#eef3e9]/95 px-5 py-3 backdrop-blur-sm lg:bottom-0">
      <div className="flex w-full max-w-[1480px] flex-wrap items-center justify-between gap-3 text-[#315541]">
        <div className="flex items-center gap-3 text-sm font-semibold"><span className="grid h-8 w-8 place-items-center rounded-full bg-[#557d6b] text-xs text-white">{selectedIds.length}</span>{mode === "explore" ? "questões prontas para importar" : "questões separadas para a prova"}</div>
        <div className="flex items-center gap-2"><button type="button" onClick={clearSelection} className="rounded-lg px-3 py-2 text-xs font-semibold text-[#6a8073] hover:bg-[#dfeade]">Limpar</button><button type="button" className="inline-flex items-center gap-2 rounded-lg bg-[#2f5346] px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-[#244338]"><ArrowUpRight className="h-4 w-4" />Continuar</button></div>
      </div>
    </div>
  );
}

function ShelfVariant(props: SharedVariantProps) {
  const isExplore = props.mode === "explore";

  return (
    <section className="min-h-[calc(100vh-4.5rem)] bg-[#f8f6f0] text-[#252e2d]">
      <div className="border-b border-[#d8d2c7] bg-[#efede5]">
        <div className="mx-auto flex max-w-[1480px] flex-col justify-between gap-8 px-5 pb-7 pt-8 sm:px-8 lg:flex-row lg:items-end lg:px-12">
          <div>
            <div className="mb-4 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-[#a06747]"><span className="h-2 w-2 rounded-full bg-[#bd7952]" /> Catálogo de questões <span className="text-[#aaa399]">/</span> {isExplore ? "curadoria aberta" : "coleção pessoal"}</div>
            <h1 className="max-w-4xl font-serif text-4xl leading-[0.95] tracking-[-0.045em] text-[#303b38] sm:text-6xl">Encontre a pergunta<br /><span className="text-[#aa6348]">certa para agora.</span></h1>
            <p className="mt-5 max-w-xl text-sm leading-6 text-[#727871]">Uma prateleira feita para comparar assunto, origem e dificuldade antes de abrir qualquer questão.</p>
          </div>
          <div className="flex items-center gap-3 self-start lg:self-end">
            <span className="rounded-full border border-[#d0c9bc] bg-[#f8f6f0] px-3 py-2 text-[11px] font-bold uppercase tracking-[0.13em] text-[#8d8177]">{isExplore ? "Banco público" : "Banco pessoal"}</span>
            <AppLink to={isExplore ? "/questoes?variant=shelf" : "/questoes/explorar?variant=shelf"} className="inline-flex items-center gap-2 rounded-full bg-[#303b38] px-4 py-2.5 text-xs font-bold text-[#f8f6f0] transition hover:bg-[#aa6348]">{isExplore ? "Ir para meu banco" : "Explorar questões"}<ArrowUpRight className="h-4 w-4" /></AppLink>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1480px] px-5 pb-32 sm:px-8 lg:px-12">
        <ShelfSurfaceNav mode={props.mode} />
        <div className="mt-6 grid gap-8 lg:grid-cols-[224px_minmax(0,1fr)]">
          <aside className="border-t-2 border-[#303b38] pt-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-[#303b38]">Refinar busca</h2>
              <SlidersHorizontal className="h-4 w-4 text-[#9b9388]" />
            </div>
            <div className="relative mt-5">
              <Search className="pointer-events-none absolute left-0 top-2.5 h-4 w-4 text-[#a28f83]" />
              <input type="search" value={props.query} onChange={(event) => props.setQuery(event.target.value)} placeholder="Palavra-chave" className="h-9 w-full border-0 border-b border-[#cfc9bd] bg-transparent pl-7 pr-1 text-sm text-[#303b38] outline-none placeholder:text-[#a29e95] focus:border-[#aa6348] focus:ring-0" />
            </div>
            <div className="mt-8 space-y-7">
              <ShelfFacet title="Disciplina">
                <ShelfChoice label="Todas" selected={!props.subjectFilter} onClick={() => props.setSubjectFilter(null)} count={DEMO_QUESTIONS.length} />
                {SUBJECTS.map((subject) => <ShelfChoice key={subject} label={subject} selected={props.subjectFilter === subject} onClick={() => props.setSubjectFilter(props.subjectFilter === subject ? null : subject)} count={DEMO_QUESTIONS.filter((question) => question.subject === subject).length} />)}
              </ShelfFacet>
              <ShelfFacet title="Dificuldade">
                <div className="flex flex-wrap gap-2">{LEVELS.map((level) => <button key={level.value} type="button" onClick={() => props.setLevelFilter(props.levelFilter === level.value ? null : level.value)} className={cn("rounded-full border px-3 py-1.5 text-[11px] font-semibold transition", props.levelFilter === level.value ? "border-[#aa6348] bg-[#f2dfd4] text-[#8e4c37]" : "border-[#d4cec1] text-[#827b71] hover:border-[#aa6348] hover:text-[#8e4c37]")}>{level.label}</button>)}</div>
              </ShelfFacet>
              <ShelfFacet title="Origem">
                <p className="text-xs leading-5 text-[#948d84]">Filtre por origem ao combinar com a busca: ENEM, FUVEST, UNESP...</p>
              </ShelfFacet>
            </div>
            {(props.query || props.subjectFilter || props.levelFilter !== null) && <button type="button" onClick={() => { props.setQuery(""); props.setSubjectFilter(null); props.setLevelFilter(null); }} className="mt-8 inline-flex items-center gap-2 text-xs font-bold text-[#aa6348] hover:text-[#8e4c37]"><X className="h-3.5 w-3.5" />Limpar refinamentos</button>}
          </aside>

          <main className="min-w-0">
            <div className="flex flex-wrap items-end justify-between gap-4 border-b-2 border-[#303b38] pb-4">
              <div><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#a28f83]">Resultados encontrados</p><p className="mt-1 font-serif text-3xl tracking-[-0.03em] text-[#303b38]"><span className="text-[#aa6348]">{props.questions.length}</span> questões</p></div>
              <div className="flex items-center gap-2 text-xs text-[#8a857c]"><span>Ordenar por</span><button type="button" className="inline-flex items-center gap-2 border-b border-[#c9c1b5] pb-1 font-semibold text-[#4b5954]">Mais recentes <ChevronDown className="h-3.5 w-3.5" /></button></div>
            </div>
            <div className="mt-2">
              {props.questions.map((question, index) => <ShelfRow key={question.id} question={question} index={index} active={props.activeQuestion?.id === question.id} selected={props.selectedIds.includes(question.id)} mode={props.mode} onSelect={() => props.setActiveQuestionId(question.id)} onToggle={() => props.toggleSelected(question.id)} />)}
              {props.questions.length === 0 && <div className="border-b border-[#d8d2c7] py-16"><EmptySearchState onClear={() => { props.setQuery(""); props.setSubjectFilter(null); props.setLevelFilter(null); }} /></div>}
            </div>
            <div className="mt-7 flex items-center justify-between text-xs text-[#9b958b]"><span>Mostrando uma página de demonstração</span><div className="flex items-center gap-1"><button type="button" disabled className="grid h-8 w-8 place-items-center rounded-full border border-[#d9d3c8] text-[#c0bbb2]"><ChevronLeft className="h-4 w-4" /></button><span className="grid h-8 w-8 place-items-center rounded-full bg-[#303b38] font-bold text-white">1</span><button type="button" className="grid h-8 w-8 place-items-center rounded-full border border-[#d9d3c8] text-[#7d7871] hover:border-[#aa6348] hover:text-[#aa6348]"><ChevronRight className="h-4 w-4" /></button></div></div>
          </main>
        </div>
      </div>
      {props.selectedIds.length > 0 && <ShelfSelectionDock {...props} />}
    </section>
  );
}

function ShelfSurfaceNav({ mode }: { mode: PrototypeMode }) {
  return <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#d8d2c7] py-4"><div className="flex items-center gap-5 text-xs font-bold text-[#8d867d]"><AppLink to="/questoes?variant=shelf" className={cn("border-b-2 pb-1", mode === "personal" ? "border-[#aa6348] text-[#303b38]" : "border-transparent hover:text-[#303b38]")}>Meu banco</AppLink><AppLink to="/questoes/explorar?variant=shelf" className={cn("border-b-2 pb-1", mode === "explore" ? "border-[#aa6348] text-[#303b38]" : "border-transparent hover:text-[#303b38]")}>Explorar</AppLink></div><div className="flex items-center gap-2 text-[11px] text-[#9c968c]"><ListFilter className="h-4 w-4" /> Busca por facetas</div></div>;
}

function ShelfFacet({ title, children }: { title: string; children: React.ReactNode }) {
  return <section><h3 className="mb-3 text-[10px] font-bold uppercase tracking-[0.16em] text-[#a28f83]">{title}</h3><div className="space-y-1">{children}</div></section>;
}

function ShelfChoice({ label, selected, onClick, count }: { label: string; selected: boolean; onClick: () => void; count: number }) {
  return <button type="button" onClick={onClick} className={cn("flex w-full items-center justify-between border-b border-[#ebe7df] py-2 text-left text-xs transition", selected ? "font-bold text-[#aa6348]" : "text-[#6f746e] hover:text-[#303b38]")}><span className="flex items-center gap-2"><span className={cn("h-1.5 w-1.5 rounded-full", selected ? "bg-[#aa6348]" : "bg-[#d5d1c8]")} />{label}</span><span className="font-mono text-[10px] text-[#aaa49b]">{count.toString().padStart(2, "0")}</span></button>;
}

function ShelfRow({
  question,
  index,
  active,
  selected,
  mode,
  onSelect,
  onToggle,
}: {
  question: DemoQuestion;
  index: number;
  active: boolean;
  selected: boolean;
  mode: PrototypeMode;
  onSelect: () => void;
  onToggle: () => void;
}) {
  const level = LEVELS[question.level];

  return (
    <article className={cn("border-b border-[#d8d2c7] py-5 transition", active && "bg-[#f1e7df] px-4 -mx-4")}>
      <div className="grid gap-4 sm:grid-cols-[34px_minmax(0,1fr)_auto] sm:items-start">
        <div className="flex items-center gap-2 sm:block"><span className="font-mono text-xs font-bold text-[#aa6348]">{String(index + 1).padStart(2, "0")}</span><span className="h-1.5 w-1.5 rounded-full sm:mt-3 sm:block" style={{ backgroundColor: level.color }} /></div>
        <button type="button" onClick={onSelect} className="min-w-0 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#aa6348] focus-visible:ring-offset-4"><div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[#9b8f84]"><span className="text-[#5f716a]">{question.subject}</span><span>{question.topic}</span><span>{question.source}</span><span>{level.label}</span></div><h3 className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-[#303b38]">{question.statement}</h3><div className="mt-3 flex flex-wrap gap-1.5">{question.tags.map((tag) => <span key={tag} className="rounded-sm bg-[#ebe5dc] px-2 py-1 text-[10px] text-[#8a8178]">#{tag}</span>)}</div></button>
        <div className="flex items-center gap-2 sm:pt-1"><button type="button" onClick={onSelect} className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-2 text-xs font-semibold text-[#807c74] hover:bg-[#e9e1d8] hover:text-[#aa6348] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#aa6348]"><Eye className="h-3.5 w-3.5" />Abrir</button><button type="button" onClick={onToggle} className={cn("inline-flex items-center gap-1.5 rounded-md border px-2.5 py-2 text-xs font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#aa6348]", selected ? "border-[#aa6348] bg-[#aa6348] text-white" : "border-[#cfc7ba] text-[#6c716b] hover:border-[#aa6348] hover:text-[#aa6348]")} >{selected ? <Check className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}{selected ? "Selecionada" : mode === "explore" ? "Adicionar" : "Separar"}</button></div>
      </div>
      {active && <div className="ml-[50px] mt-5 max-w-3xl border-l-2 border-[#c98763] pl-4 sm:ml-[50px]"><div className="grid gap-2 sm:grid-cols-2">{question.options.map((option, optionIndex) => <div key={option} className={cn("flex items-start gap-2 text-xs leading-5", optionIndex === question.answer ? "font-semibold text-[#456b52]" : "text-[#777d76]")}><span className="font-mono text-[10px]">{LETTERS[optionIndex]}</span><span>{option}</span></div>)}</div><div className="mt-4 flex items-center gap-3 text-[10px] uppercase tracking-[0.13em] text-[#9a9085]"><span>{question.review}</span><span>·</span><span>{question.updated}</span></div></div>}
    </article>
  );
}

function ShelfSelectionDock({ selectedIds, mode, clearSelection }: SharedVariantProps) {
  return <div className="fixed inset-x-0 bottom-0 z-[65] border-t border-[#cfc8bc] bg-[#303b38] px-5 py-3 text-[#f8f6f0] shadow-[0_-8px_24px_rgba(48,59,56,0.12)]"><div className="mx-auto flex max-w-[1480px] flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-3 text-sm font-semibold"><span className="font-mono text-[#e2a381]">{selectedIds.length.toString().padStart(2, "0")}</span>{mode === "explore" ? "selecionadas para seu banco" : "selecionadas para a próxima prova"}</div><div className="flex items-center gap-2"><button type="button" onClick={clearSelection} className="rounded-md px-3 py-2 text-xs font-semibold text-[#b6c1b7] hover:bg-[#41504b]">Limpar</button><button type="button" className="inline-flex items-center gap-2 rounded-md bg-[#e2a381] px-4 py-2 text-xs font-bold text-[#303b38] hover:bg-[#f0b596]"><Plus className="h-4 w-4" />{mode === "explore" ? "Adicionar ao banco" : "Montar prova"}</button></div></div></div>;
}

function RadarVariant(props: SharedVariantProps) {
  const isExplore = props.mode === "explore";
  const activeQuestion = props.activeQuestion;
  const grouped = LEVELS.map((level) => ({ level, questions: props.questions.filter((question) => question.level === level.value) }));

  return (
    <section className="min-h-[calc(100vh-4.5rem)] bg-[#182627] text-[#eef0e6]">
      <div className="mx-auto max-w-[1540px] px-5 pb-32 pt-6 sm:px-8 lg:px-10">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#334544] pb-4 text-[#b6c6b7]">
          <div className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-xl bg-[#c6d96f] text-[#20312d]"><Target className="h-5 w-5" /></span><div><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#809b8d]">Questões / radar</p><p className="text-sm font-semibold text-[#edf0e6]">Triagem rápida</p></div></div>
          <RadarSurfaceNav mode={props.mode} />
          <span className="rounded-full border border-[#39504b] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-[#9bb2a1]">PROTÓTIPO · {isExplore ? "explorar" : "meu banco"}</span>
        </div>

        <div className="flex flex-col justify-between gap-7 py-8 lg:flex-row lg:items-end">
          <div><p className="mb-3 text-[10px] font-bold uppercase tracking-[0.22em] text-[#c6d96f]">Mapa de decisão</p><h1 className="max-w-3xl text-4xl font-semibold leading-[0.95] tracking-[-0.045em] text-[#f1f0e3] sm:text-6xl">Veja o conjunto.<br /><span className="text-[#c6d96f]">Escolha o próximo movimento.</span></h1><p className="mt-5 max-w-xl text-sm leading-6 text-[#afc0b6]">Agrupe por dificuldade para equilibrar uma lista, encontrar lacunas e selecionar em lote.</p></div>
          <div className="grid grid-cols-3 gap-px overflow-hidden rounded-xl border border-[#3c514d] bg-[#3c514d]"><RadarStat value={props.questions.length} label="questões" /><RadarStat value={props.selectedIds.length} label="na seleção" accent /></div>
        </div>

        <div className="grid gap-5 lg:grid-cols-[218px_minmax(0,1fr)]">
          <aside className="rounded-2xl border border-[#354a47] bg-[#203432] p-4">
            <div className="flex items-center justify-between"><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#86a095]">Sinais ativos</p><Filter className="h-4 w-4 text-[#809b8d]" /></div>
            <div className="relative mt-5"><Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-[#789188]" /><input type="search" value={props.query} onChange={(event) => props.setQuery(event.target.value)} placeholder="Buscar questão" className="h-10 w-full rounded-lg border border-[#405752] bg-[#182a29] pl-9 pr-2 text-xs text-[#edf0e6] outline-none placeholder:text-[#789188] focus:border-[#c6d96f] focus:ring-1 focus:ring-[#c6d96f]" /></div>
            <div className="mt-6 space-y-2"><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#789188]">Disciplina</p><RadarFilterButton label="Todas" active={!props.subjectFilter} onClick={() => props.setSubjectFilter(null)} /><div className="max-h-44 space-y-1 overflow-y-auto pr-1">{SUBJECTS.map((subject) => <RadarFilterButton key={subject} label={subject} active={props.subjectFilter === subject} onClick={() => props.setSubjectFilter(props.subjectFilter === subject ? null : subject)} />)}</div></div>
            <div className="mt-7 border-t border-[#38504b] pt-5"><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#789188]">Leitura do radar</p><div className="mt-3 space-y-2.5">{LEVELS.map((level) => { const count = props.questions.filter((question) => question.level === level.value).length; return <div key={level.value} className="flex items-center justify-between text-xs"><span className="flex items-center gap-2 text-[#b8c9b9]"><span className="h-2 w-2 rounded-full" style={{ backgroundColor: level.color }} />{level.label}</span><span className="font-mono text-[#829b8e]">{count.toString().padStart(2, "0")}</span></div>; })}</div></div>
            <button type="button" onClick={() => { props.setQuery(""); props.setSubjectFilter(null); props.setLevelFilter(null); }} className="mt-8 inline-flex items-center gap-2 text-xs font-semibold text-[#c6d96f] hover:text-white"><SlidersHorizontal className="h-3.5 w-3.5" />Resetar radar</button>
          </aside>

          <main className="min-w-0">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3 text-xs text-[#91aa9b]"><span>Arraste mentalmente por prioridade · clique para abrir</span><button type="button" className="inline-flex items-center gap-2 rounded-lg border border-[#3f5852] px-3 py-2 font-semibold text-[#b9cbb9] hover:border-[#c6d96f] hover:text-[#c6d96f]"><Layers3 className="h-4 w-4" />Visualização: dificuldade</button></div>
            <div className="grid gap-3 xl:grid-cols-3">
              {grouped.map(({ level, questions }) => <RadarColumn key={level.value} level={level} questions={questions} selectedIds={props.selectedIds} activeId={activeQuestion?.id ?? null} onSelect={props.setActiveQuestionId} onToggle={props.toggleSelected} />)}
            </div>
            {activeQuestion && <RadarInspector question={activeQuestion} selected={props.selectedIds.includes(activeQuestion.id)} mode={props.mode} onToggle={() => props.toggleSelected(activeQuestion.id)} />}
          </main>
        </div>
      </div>
      {props.selectedIds.length > 0 && <RadarSelectionDock {...props} />}
    </section>
  );
}

function RadarSurfaceNav({ mode }: { mode: PrototypeMode }) {
  return <div className="flex items-center gap-4 text-xs font-semibold text-[#8ba296]"><AppLink to="/questoes?variant=radar" className={cn("transition hover:text-[#edf0e6]", mode === "personal" && "text-[#c6d96f]")}>Meu banco</AppLink><AppLink to="/questoes/explorar?variant=radar" className={cn("transition hover:text-[#edf0e6]", mode === "explore" && "text-[#c6d96f]")}>Explorar</AppLink></div>;
}

function RadarStat({ value, label, accent = false }: { value: number; label: string; accent?: boolean }) {
  return <div className="min-w-[92px] bg-[#203432] px-4 py-3 text-center"><p className={cn("font-mono text-2xl font-bold", accent ? "text-[#c6d96f]" : "text-[#eef0e6]")}>{value.toString().padStart(2, "0")}</p><p className="mt-1 text-[9px] font-bold uppercase tracking-[0.15em] text-[#83a094]">{label}</p></div>;
}

function RadarFilterButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return <button type="button" onClick={onClick} className={cn("flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs transition", active ? "bg-[#c6d96f] font-bold text-[#20312d]" : "text-[#afc0b6] hover:bg-[#29403d] hover:text-white")}><span className={cn("h-1.5 w-1.5 rounded-full", active ? "bg-[#20312d]" : "bg-[#617c70]")} />{label}</button>;
}

function RadarColumn({
  level,
  questions,
  selectedIds,
  activeId,
  onSelect,
  onToggle,
}: {
  level: (typeof LEVELS)[number];
  questions: DemoQuestion[];
  selectedIds: number[];
  activeId: number | null;
  onSelect: (id: number) => void;
  onToggle: (id: number) => void;
}) {
  return <section className="min-w-0 rounded-2xl border border-[#354a47] bg-[#1d302f] p-3"><div className="flex items-center justify-between border-b border-[#354a47] px-2 pb-3"><div className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: level.color }} /><h2 className="text-sm font-bold text-[#e9eee3]">{level.label}</h2></div><span className="rounded-full bg-[#29403d] px-2 py-1 font-mono text-[10px] text-[#9bb2a1]">{questions.length.toString().padStart(2, "0")}</span></div><div className="mt-2 space-y-2">{questions.map((question, index) => <RadarTile key={question.id} question={question} index={index} active={question.id === activeId} selected={selectedIds.includes(question.id)} onSelect={() => onSelect(question.id)} onToggle={() => onToggle(question.id)} />)}{questions.length === 0 && <p className="px-2 py-8 text-center text-xs leading-5 text-[#6f887d]">Nada neste recorte.</p>}</div></section>;
}

function RadarTile({ question, index, active, selected, onSelect, onToggle }: { question: DemoQuestion; index: number; active: boolean; selected: boolean; onSelect: () => void; onToggle: () => void }) {
  return <article className={cn("rounded-xl border bg-[#203432] p-3 transition", active ? "border-[#c6d96f] shadow-[0_0_0_1px_rgba(198,217,111,0.2)]" : "border-[#38504b] hover:border-[#668276]")}><div className="flex items-start justify-between gap-2"><button type="button" onClick={onSelect} className="flex min-w-0 items-center gap-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c6d96f]"><span className="font-mono text-[10px] text-[#809b8d]">{String(index + 1).padStart(2, "0")}</span><span className="truncate text-[10px] font-bold uppercase tracking-[0.14em] text-[#b8c9b9]">{question.subject}</span></button><button type="button" onClick={onToggle} aria-label={selected ? "Remover da seleção" : "Selecionar questão"} className={cn("grid h-6 w-6 shrink-0 place-items-center rounded-md border transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c6d96f]", selected ? "border-[#c6d96f] bg-[#c6d96f] text-[#20312d]" : "border-[#557066] text-transparent hover:text-[#92ab9c]")}><Check className="h-3 w-3" /></button></div><button type="button" onClick={onSelect} className="mt-3 block w-full text-left text-xs leading-5 text-[#d8e1d6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c6d96f]">{question.statement}</button><div className="mt-3 flex items-center justify-between gap-2 text-[10px] text-[#789188]"><span>{question.source}</span><span className="truncate">{question.topic}</span></div></article>;
}

function RadarInspector({ question, selected, mode, onToggle }: { question: DemoQuestion; selected: boolean; mode: PrototypeMode; onToggle: () => void }) {
  return <section className="mt-4 rounded-2xl border border-[#586d5c] bg-[#e6e7d7] p-5 text-[#243b35] shadow-[0_12px_30px_rgba(8,19,18,0.16)]"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#667b6d]">Inspeção rápida · {question.source}</p><h2 className="mt-1 text-lg font-bold">{question.subject} <span className="font-normal text-[#75877a]">/ {question.topic}</span></h2></div><button type="button" onClick={onToggle} className={cn("inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#243b35]", selected ? "bg-[#557d6b] text-white" : "bg-[#243b35] text-[#edf0e6]")}>{selected ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}{selected ? "Selecionada" : mode === "explore" ? "Adicionar ao banco" : "Separar para prova"}</button></div><p className="mt-5 max-w-4xl text-sm leading-6">{question.statement}</p><div className="mt-5 grid gap-x-8 gap-y-2 md:grid-cols-2">{question.options.map((option, index) => <div key={option} className={cn("flex gap-2 text-xs leading-5", index === question.answer && "font-bold text-[#3d7651]")}><span className="font-mono">{LETTERS[index]}.</span><span>{option}</span></div>)}</div></section>;
}

function RadarSelectionDock({ selectedIds, mode, clearSelection }: SharedVariantProps) {
  return <div className="fixed inset-x-0 bottom-0 z-[65] border-t border-[#455d55] bg-[#10201f]/95 px-5 py-3 text-[#edf0e6] backdrop-blur-sm"><div className="mx-auto flex max-w-[1540px] flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-3 text-sm font-semibold"><span className="grid h-8 min-w-8 place-items-center rounded-lg bg-[#c6d96f] px-2 font-mono text-xs text-[#20312d]">{selectedIds.length}</span><span>{mode === "explore" ? "questões selecionadas para importar" : "questões no lote da próxima prova"}</span></div><div className="flex items-center gap-2"><button type="button" onClick={clearSelection} className="rounded-lg px-3 py-2 text-xs font-semibold text-[#9bb2a1] hover:bg-[#243b38]">Limpar lote</button><button type="button" className="inline-flex items-center gap-2 rounded-lg bg-[#c6d96f] px-4 py-2 text-xs font-bold text-[#20312d] hover:bg-[#d8e98b]"><Sparkles className="h-4 w-4" />{mode === "explore" ? "Importar lote" : "Criar com seleção"}</button></div></div></div>;
}

function FilterSelect({
  value,
  onChange,
  options,
  allLabel,
}: {
  value: string;
  onChange: (value: string) => void;
  options: string[] | { value: string; label: string }[];
  allLabel: string;
}) {
  return <label className="relative shrink-0"><span className="sr-only">{allLabel}</span><select value={value} onChange={(event) => onChange(event.target.value)} className="h-8 appearance-none rounded-full border border-[#d5dccf] bg-[#f2f3ec] py-1 pl-3 pr-8 text-[11px] font-semibold text-[#64766c] outline-none focus:border-[#557d6b] focus:ring-2 focus:ring-[#dce9d9]"><option value="">{allLabel}</option>{options.map((option) => typeof option === "string" ? <option key={option} value={option}>{option}</option> : <option key={option.value} value={option.value}>{option.label}</option>)}</select><ChevronDown className="pointer-events-none absolute right-2.5 top-2 h-3.5 w-3.5 text-[#7c8d83]" /></label>;
}

function EmptySearchState({ onClear }: { onClear: () => void }) {
  return <div className="flex flex-col items-center justify-center px-6 py-8 text-center"><Search className="h-7 w-7 text-[#b7c1b4]" /><p className="mt-3 text-sm font-semibold text-[#64746c]">Nenhuma questão nesse recorte.</p><button type="button" onClick={onClear} className="mt-2 text-xs font-bold text-[#557d6b] underline underline-offset-4">Limpar filtros</button></div>;
}
