import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "./ui/button";

interface ListPaginationProps {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  /** What the rows are, for "Showing 1 to 25 of 3,340 receipts" */
  noun?: string;
  disabled?: boolean;
}

/** Previous / Page x of y / Next footer for paged tables (same look as the Members directory). */
export function ListPagination({ page, pageSize, total, onPageChange, noun = "records", disabled }: ListPaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (total <= pageSize) return null;
  const first = (page - 1) * pageSize + 1;
  const last = Math.min(page * pageSize, total);
  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-6">
      <div className="text-sm text-muted-foreground">
        Showing {first.toLocaleString()} to {last.toLocaleString()} of {total.toLocaleString()} {noun}
      </div>
      <div className="flex items-center space-x-2">
        <Button variant="outline" size="sm" onClick={() => onPageChange(page - 1)} disabled={disabled || page <= 1}>
          <ChevronLeft className="h-4 w-4 mr-1" />
          Previous
        </Button>
        <div className="text-sm">
          Page {page} of {totalPages}
        </div>
        <Button variant="outline" size="sm" onClick={() => onPageChange(page + 1)} disabled={disabled || page >= totalPages}>
          Next
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}
