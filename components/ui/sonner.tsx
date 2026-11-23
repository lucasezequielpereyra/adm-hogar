"use client"

import { useTheme } from "next-themes"
import { Toaster as Sonner, type ToasterProps } from "sonner"
import { InfoBox, WarningDiamond, Loader } from "pixelarticons/react"
import { MichiFace } from "@/components/pixel/michi"

const Toaster = ({ ...props }: ToasterProps) => {
  const { resolvedTheme = "light" } = useTheme()

  return (
    <Sonner
      theme={resolvedTheme as ToasterProps["theme"]}
      position="top-center"
      offset={72}
      mobileOffset={72}
      className="toaster group"
      icons={{
        success: <MichiFace color="naranja" size={22} />,
        info: <InfoBox className="size-5" />,
        warning: <WarningDiamond className="size-5" />,
        error: <MichiFace color="negro" size={22} />,
        loading: <Loader className="size-5 animate-spin" />,
      }}
      toastOptions={{
        unstyled: true,
        classNames: {
          toast:
            "flex w-[min(356px,calc(100vw-40px))] items-center gap-3 bg-panel px-4 py-3 font-sans text-base text-foreground pixel-box",
          content: "flex min-w-0 flex-1 flex-col gap-0.5",
          title: "font-semibold",
          description: "text-muted-foreground",
          success: "[&_[data-icon]]:text-pasto-ink",
          error: "[&_[data-icon]]:text-ladrillo",
          actionButton:
            "ml-auto shrink-0 bg-moneda px-3 py-1 font-semibold text-tinta pixel-frame",
          cancelButton: "ml-auto shrink-0 px-3 py-1 font-semibold underline",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
