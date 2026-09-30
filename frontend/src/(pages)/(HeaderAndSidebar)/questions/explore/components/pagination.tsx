
import { Button } from "@/src/components/ui/button"
import { ChevronLeft, ChevronRight } from "lucide-react"

interface PaginationProps {
  questionsPerPage: number
  totalQuestions: number
  currentPage: number
  paginate: (pageNumber: number) => void
}

export function Pagination({ questionsPerPage, totalQuestions, currentPage, paginate }: PaginationProps) {
  const pageNumbers = []

  for (let i = 1; i <= Math.ceil(totalQuestions / questionsPerPage); i++) {
    pageNumbers.push(i)
  }

  // Limit the number of page buttons shown
  const maxPageButtons = 5
  let startPage = Math.max(1, currentPage - Math.floor(maxPageButtons / 2))
  const endPage = Math.min(pageNumbers.length, startPage + maxPageButtons - 1)

  // Adjust if we're near the end
  if (endPage - startPage + 1 < maxPageButtons) {
    startPage = Math.max(1, endPage - maxPageButtons + 1)
  }

  return (
    <div className="flex justify-center mt-6">
      <div className="flex items-center space-x-2">
        <Button
          variant="outline"
          size="icon"
          onClick={() => paginate(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
        >
          <ChevronLeft className="h-4 w-4" />
          <span className="sr-only">Página anterior</span>
        </Button>

        {startPage > 1 && (
          <>
            <Button variant={currentPage === 1 ? "default" : "outline"} size="icon" onClick={() => paginate(1)}>
              1
            </Button>
            {startPage > 2 && <span className="text-muted-foreground">...</span>}
          </>
        )}

        {pageNumbers.slice(startPage - 1, endPage).map((number) => (
          <Button
            key={number}
            variant={currentPage === number ? "default" : "outline"}
            size="icon"
            onClick={() => paginate(number)}
          >
            {number}
          </Button>
        ))}

        {endPage < pageNumbers.length && (
          <>
            {endPage < pageNumbers.length - 1 && <span className="text-muted-foreground">...</span>}
            <Button
              variant={currentPage === pageNumbers.length ? "default" : "outline"}
              size="icon"
              onClick={() => paginate(pageNumbers.length)}
            >
              {pageNumbers.length}
            </Button>
          </>
        )}

        <Button
          variant="outline"
          size="icon"
          onClick={() => paginate(Math.min(pageNumbers.length, currentPage + 1))}
          disabled={currentPage === pageNumbers.length}
        >
          <ChevronRight className="h-4 w-4" />
          <span className="sr-only">Próxima página</span>
        </Button>
      </div>
    </div>
  )
}

