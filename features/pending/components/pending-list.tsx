"use client"

import { cn } from "cn"
import { useRouter, usePathname, useSearchParams } from "next/navigation"
import { Check, ExternalLink, Lock, Plus, Undo } from "pixelarticons/react"
import { useEffect, useState, useTransition } from "react"
import { toast } from "sonner"
import { MemberAvatar } from "@/components/pixel/member-chip"
import { Money } from "@/components/pixel/money"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from "@/components/ui/drawer"
import { CategoryChip } from "@/features/categories/components/category-chip"
import type { CategoryOption } from "@/features/categories/types"
import type { MemberOption } from "@/features/tasks/types"
import { playSound } from "@/lib/sound"
import { setPendingPurchased } from "../actions"
import { KIND_LABEL } from "../schemas"
import type { PendingPurchase } from "../types"
import { PendingForm } from "./pending-form"

export function PendingList({
  items,
  members,
  categories,
  currentUserId,
  defaultCurrency,
  purchasedView,
}: {
  items: PendingPurchase[]
  members: MemberOption[]
  categories: CategoryOption[]
  currentUserId: string
  defaultCurrency: "ARS" | "USD"
  purchasedView: boolean
}) {
  const [editor, setEditor] = useState<{ open: boolean; item: PendingPurchase | null }>({ open: false, item: null })
  const [offer, setOffer] = useState<PendingPurchase | null>(null)
  const membersById = new Map(members.map((m) => [m.user_id, m]))
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    if (searchParams.get("nueva") === "1") {
      setEditor({ open: true, item: null })
      const p = new URLSearchParams(searchParams)
      p.delete("nueva")
      router.replace(p.size ? `${pathname}?${p}` : pathname, { scroll: false })
    }
  }, [searchParams, router, pathname])

  return (
    <>
      {!purchasedView && (
        <Button onClick={() => setEditor({ open: true, item: null })} className="self-start">
          <Plus aria-hidden /> Nueva compra
        </Button>
      )}
      <ul className="flex flex-col gap-5">
        {items.map((p) => (
          <PendingCard
            key={p.id}
            item={p}
            requester={p.requested_by ? membersById.get(p.requested_by) : undefined}
            categories={categories}
            onEdit={() => setEditor({ open: true, item: p })}
            onPurchased={() => setOffer(p)}
          />
        ))}
      </ul>

      <Drawer open={editor.open} onOpenChange={(o) => !o && setEditor((s) => ({ ...s, open: false }))} repositionInputs={false}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>{editor.item ? "Editar compra" : "Nueva compra"}</DrawerTitle>
            <DrawerDescription className="sr-only">Datos de la compra pendiente.</DrawerDescription>
          </DrawerHeader>
          <div className="overflow-y-auto px-5 pt-1 pb-8">
            {editor.open && (
              <PendingForm
                key={editor.item?.id ?? "nueva"}
                item={editor.item}
                members={members}
                categories={categories}
                currentUserId={currentUserId}
                defaultCurrency={defaultCurrency}
                onDone={() => setEditor((s) => ({ ...s, open: false }))}
              />
            )}
          </div>
        </DrawerContent>
      </Drawer>

      <AlertDialog open={!!offer} onOpenChange={(o) => !o && setOffer(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Lo pagaste con tarjeta?</AlertDialogTitle>
            <AlertDialogDescription>
              Podés registrar “{offer?.name}” como gasto de tarjeta, con su categoría.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Ahora no</AlertDialogCancel>
            <AlertDialogAction onClick={() => offer && router.push(`/gastos/tarjetas?nuevo=1&desde=${offer.id}`)}>
              Registrar gasto
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

function PendingCard({
  item,
  requester,
  categories,
  onEdit,
  onPurchased,
}: {
  item: PendingPurchase
  requester?: MemberOption
  categories: CategoryOption[]
  onEdit: () => void
  onPurchased: () => void
}) {
  const [pending, startTransition] = useTransition()
  const purchased = item.status === "purchased"

  return (
    <li
      className={cn(
        "mx-[3px] flex flex-col gap-3 bg-panel p-4 pixel-box",
        item.priority === "high" && !purchased && "[--pixel-outline:var(--ladrillo)]",
      )}
    >
      <div className="flex items-start gap-3">
        <button type="button" onClick={onEdit} className="flex min-w-0 flex-1 flex-col gap-1 text-left">
          <span className={cn("font-semibold", purchased && "text-muted-foreground line-through decoration-2")}>
            {item.priority === "high" && !purchased && (
              <span className="mr-1.5 inline-block bg-ladrillo px-1 font-display leading-tight text-white dark:text-tinta" aria-label="Prioridad alta">
                !
              </span>
            )}
            {item.name}
          </span>
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
            <span>{KIND_LABEL[item.kind as keyof typeof KIND_LABEL]}</span>
            {item.estimated_price !== null && (
              <Money amount={item.estimated_price} currency={item.currency as "ARS" | "USD"} className="text-foreground" />
            )}
            {item.is_private && (
              <span className="inline-flex items-center gap-1">
                <Lock className="size-4" aria-hidden /> Personal
              </span>
            )}
          </span>
          {item.notes && <span className="line-clamp-2 text-sm text-muted-foreground">{item.notes}</span>}
        </button>
        {requester && <MemberAvatar name={requester.name} color={requester.color} size={28} />}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <CategoryChip
          entityType="pending_purchase"
          entityId={item.id}
          categories={categories}
          state={{ ...item, ai_confidence: item.ai_confidence === null ? null : Number(item.ai_confidence) }}
        />
        <div className="flex items-center gap-3">
          {item.url && (
            <Button asChild variant="ghost" size="icon-sm" aria-label="Abrir link">
              <a href={item.url} target="_blank" rel="noopener noreferrer">
                <ExternalLink aria-hidden />
              </a>
            </Button>
          )}
          <Button
            size="sm"
            variant={purchased ? "outline" : "success"}
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const res = await setPendingPurchased(item.id, !purchased)
                if (!res.ok) {
                  toast.error(res.error)
                  return
                }
                if (!purchased) {
                  playSound("check")
                  onPurchased()
                } else toast.success("Volvió a pendientes")
              })
            }
          >
            {purchased ? (
              <>
                <Undo aria-hidden /> Desmarcar
              </>
            ) : (
              <>
                <Check aria-hidden /> Comprado
              </>
            )}
          </Button>
        </div>
      </div>
    </li>
  )
}
