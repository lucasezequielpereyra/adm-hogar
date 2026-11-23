import { TitleScreen } from "@/components/shell/title-screen"

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <TitleScreen>{children}</TitleScreen>
}
