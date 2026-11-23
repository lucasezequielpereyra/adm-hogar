"use client"

import dynamic from "next/dynamic"
import { Skeleton } from "@/components/ui/skeleton"

/** Recharts pesa: se carga solo cuando hace falta el gráfico. */
export const CategoryChartLazy = dynamic(() => import("./category-chart").then((m) => m.CategoryChart), {
  ssr: false,
  loading: () => (
    <div className="flex flex-col gap-4">
      <Skeleton className="h-6 w-1/2" />
      <Skeleton className="h-6 w-3/4" />
      <Skeleton className="h-6 w-2/3" />
    </div>
  ),
})
