import { useState, useMemo } from "react";
import { Search, Plus, Edit, Trash2, ChevronLeft, ChevronRight, ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export interface Column<T> {
  key: keyof T | string;
  header: string;
  render?: (item: T) => React.ReactNode;
  className?: string;
}

interface TablaGestionProps<T extends { id: string | number }> {
  data: T[];
  columns: Column<T>[];
  onAdd: () => void;
  onEdit: (item: T) => void;
  onDelete: (item: T) => void;
  searchPlaceholder?: string;
  addButtonLabel?: string;
  title?: string;
  subtitle?: string;
  extraActions?: (item: T) => React.ReactNode;
}

const TablaGestion = <T extends { id: string | number }>({
  data,
  columns,
  onAdd,
  onEdit,
  onDelete,
  searchPlaceholder = "Buscar...",
  addButtonLabel = "Añadir Nuevo",
  title,
  subtitle,
  extraActions,
}: TablaGestionProps<T>) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [sortKey, setSortKey] = useState<string>("");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [filterKey, setFilterKey] = useState<string>("");
  const [filterValue, setFilterValue] = useState<string>("");
  const itemsPerPage = 10;

  const handleHeaderClick = (key: string) => {
    if (sortKey === key) {
      if (sortOrder === "asc") {
        setSortOrder("desc");
      } else {
        setSortKey("");
      }
    } else {
      setSortKey(key);
      setSortOrder("asc");
    }
    setCurrentPage(1);
  };

  const getValue = (item: T, key: keyof T | string): unknown => {
    if (typeof key === 'string' && key.includes('.')) {
      const keys = key.split('.');
      let value: unknown = item;
      for (const k of keys) {
        value = (value as Record<string, unknown>)?.[k];
      }
      return value;
    }
    return item[key as keyof T];
  };

  // Discover filterable columns dynamically (those with 2 to 15 unique values)
  const filterableColumns = useMemo(() => {
    return columns.filter(col => {
      const keyStr = String(col.key).toLowerCase();
      // Exclude primary ID, description, email, names
      if (
        keyStr === 'id' || 
        keyStr === 'email' || 
        keyStr === 'descripcion' || 
        keyStr === 'nombrecompleto' || 
        keyStr === 'nombre' ||
        keyStr === 'ultimofichaje' ||
        keyStr === 'ultima_lectura'
      ) {
        return false;
      }
      const uniqueValues = new Set(data.map(item => String(getValue(item, col.key) ?? '')));
      return uniqueValues.size > 1 && uniqueValues.size <= 15;
    });
  }, [columns, data]);

  // Dynamic sort options based on columns
  const sortOptions = useMemo(() => {
    return columns.flatMap(col => {
      const label = col.header;
      const keyStr = String(col.key);
      const isDate = keyStr.toLowerCase().includes('fecha') || 
                     keyStr.toLowerCase().includes('ultimo') || 
                     keyStr.toLowerCase().includes('fichaje') || 
                     keyStr.toLowerCase().includes('lectura') || 
                     keyStr.toLowerCase().includes('instalacion');
      
      return [
        {
          value: `${keyStr}-asc`,
          label: isDate ? `${label} (Más antiguo a más nuevo)` : `${label} (A-Z / Menor a Mayor)`
        },
        {
          value: `${keyStr}-desc`,
          label: isDate ? `${label} (Más nuevo a más viejo)` : `${label} (Z-A / Mayor a Menor)`
        }
      ];
    });
  }, [columns]);

  // Unique values for the selected filter column
  const filterUniqueValues = useMemo(() => {
    if (!filterKey) return [];
    const values = data.map(item => String(getValue(item, filterKey) ?? ""));
    return Array.from(new Set(values))
      .filter(v => v.trim() !== "")
      .sort((a, b) => a.localeCompare(b));
  }, [filterKey, data]);

  // Search, filter, and sort data
  const processedData = useMemo(() => {
    let result = [...data];

    // 1. Search Query
    if (searchQuery) {
      result = result.filter((item) =>
        Object.values(item).some((value) =>
          String(value).toLowerCase().includes(searchQuery.toLowerCase())
        )
      );
    }

    // 2. Filter by Column Value
    if (filterKey && filterValue && filterValue !== "all") {
      result = result.filter((item) => {
        const val = String(getValue(item, filterKey) ?? "");
        return val === filterValue;
      });
    }

    // 3. Sorting
    if (sortKey) {
      result.sort((a, b) => {
        const valA = getValue(a, sortKey);
        const valB = getValue(b, sortKey);

        // Handle nulls
        if (valA === null || valA === undefined) return sortOrder === "asc" ? 1 : -1;
        if (valB === null || valB === undefined) return sortOrder === "asc" ? -1 : 1;

        // Check if values look like dates
        const isDateStr = (val: any) => typeof val === "string" && (
          /^\d{4}-\d{2}-\d{2}/.test(val) || 
          /^\d{2}\/\d{2}\/\d{4}/.test(val) ||
          !isNaN(Date.parse(val))
        );

        if (isDateStr(valA) && isDateStr(valB)) {
          const timeA = new Date(valA as string).getTime();
          const timeB = new Date(valB as string).getTime();
          if (!isNaN(timeA) && !isNaN(timeB)) {
            return sortOrder === "asc" ? timeA - timeB : timeB - timeA;
          }
        }

        // Numerical comparison
        const numA = Number(valA);
        const numB = Number(valB);
        if (!isNaN(numA) && !isNaN(numB)) {
          return sortOrder === "asc" ? numA - numB : numB - numA;
        }

        // Alphabetical comparison
        const strA = String(valA).toLowerCase();
        const strB = String(valB).toLowerCase();

        if (strA < strB) return sortOrder === "asc" ? -1 : 1;
        if (strA > strB) return sortOrder === "asc" ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [data, searchQuery, filterKey, filterValue, sortKey, sortOrder]);

  // Pagination
  const totalPages = Math.ceil(processedData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedData = processedData.slice(startIndex, startIndex + itemsPerPage);

  return (
    <div className="space-y-4">
      {/* Header */}
      {(title || subtitle) && (
        <div className="mb-6">
          {title && <h2 className="text-2xl font-semibold text-foreground">{title}</h2>}
          {subtitle && <p className="text-muted-foreground mt-1">{subtitle}</p>}
        </div>
      )}

      {/* Controls */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
        <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto flex-wrap items-center">
          <div className="relative w-full sm:w-60">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={searchPlaceholder}
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-10 bg-input border-border"
            />
          </div>

          {/* Filter Column Selection */}
          {filterableColumns.length > 0 && (
            <div className="w-full sm:w-40">
              <Select
                value={filterKey || "none"}
                onValueChange={(value) => {
                  if (value === "none") {
                    setFilterKey("");
                    setFilterValue("");
                  } else {
                    setFilterKey(value);
                    setFilterValue("all");
                  }
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="bg-input border-border">
                  <SelectValue placeholder="Filtrar por..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin filtro</SelectItem>
                  {filterableColumns.map((col) => (
                    <SelectItem key={String(col.key)} value={String(col.key)}>
                      {col.header}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Filter Value Selection */}
          {filterKey && (
            <div className="w-full sm:w-40">
              <Select
                value={filterValue}
                onValueChange={(value) => {
                  setFilterValue(value);
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="bg-input border-border">
                  <SelectValue placeholder="Seleccionar..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {filterUniqueValues.map((val) => {
                    let displayVal = val;
                    if (val === "true" || val === "true") displayVal = "Sí";
                    else if (val === "false") displayVal = "No";
                    return (
                      <SelectItem key={val} value={val}>
                        {displayVal}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
        
        <Button onClick={onAdd} className="gap-2 bg-primary hover:bg-primary/90">
          <Plus className="h-4 w-4" />
          {addButtonLabel}
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border overflow-hidden bg-card">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              {columns.map((column) => (
                <TableHead
                  key={String(column.key)}
                  className={cn(
                    "text-muted-foreground font-medium cursor-pointer select-none hover:text-foreground transition-colors",
                    column.className
                  )}
                  onClick={() => handleHeaderClick(String(column.key))}
                >
                  <div className="flex items-center gap-1">
                    <span>{column.header}</span>
                    {sortKey === String(column.key) ? (
                      sortOrder === "asc" ? (
                        <ArrowUp className="h-3.5 w-3.5 text-primary" />
                      ) : (
                        <ArrowDown className="h-3.5 w-3.5 text-primary" />
                      )
                    ) : (
                      <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground/30 hover:text-muted-foreground/80 transition-colors" />
                    )}
                  </div>
                </TableHead>
              ))}
              <TableHead className="text-muted-foreground font-medium w-28 text-center">
                Acciones
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedData.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length + 1}
                  className="h-32 text-center text-muted-foreground"
                >
                  No se encontraron resultados
                </TableCell>
              </TableRow>
            ) : (
              paginatedData.map((item) => (
                <TableRow
                  key={item.id}
                  className="border-border hover:bg-muted/30 transition-colors"
                >
                  {columns.map((column) => (
                    <TableCell key={String(column.key)} className={column.className}>
                      {column.render
                        ? column.render(item)
                        : String(getValue(item, column.key) ?? "")}
                    </TableCell>
                  ))}
                  <TableCell>
                    <div className="flex items-center justify-center gap-1">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onEdit(item)}
                            className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Editar</TooltipContent>
                      </Tooltip>
                      
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onDelete(item)}
                            className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Eliminar</TooltipContent>
                      </Tooltip>

                      {extraActions && extraActions(item)}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-2">
          <p className="text-sm text-muted-foreground">
            Mostrando {startIndex + 1} - {Math.min(startIndex + itemsPerPage, processedData.length)} de{" "}
            {processedData.length} registros
          </p>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="h-8 w-8"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            
            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((page) => {
                  if (totalPages <= 5) return true;
                  if (page === 1 || page === totalPages) return true;
                  if (Math.abs(page - currentPage) <= 1) return true;
                  return false;
                })
                .map((page, index, array) => {
                  const showEllipsis = index > 0 && array[index - 1] !== page - 1;
                  return (
                    <div key={page} className="flex items-center">
                      {showEllipsis && (
                        <span className="px-2 text-muted-foreground">...</span>
                      )}
                      <Button
                        variant={currentPage === page ? "default" : "outline"}
                        size="icon"
                        onClick={() => setCurrentPage(page)}
                        className={cn(
                          "h-8 w-8",
                          currentPage === page && "bg-primary text-primary-foreground"
                        )}
                      >
                        {page}
                      </Button>
                    </div>
                  );
                })}
            </div>
            
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="h-8 w-8"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TablaGestion;
