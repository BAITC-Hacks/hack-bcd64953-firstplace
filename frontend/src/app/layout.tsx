import { ApiNavigation } from "@/components/api-navigation";
import type { Metadata } from "next";
import "@fontsource-variable/manrope";
import "./globals.css";
export const metadata: Metadata = {
  title: {
    default: "AI Sana — идеи становятся проектами",
    template: "%s · AI Sana",
  },
  description: "Платформа реальных бизнес-задач и студенческих команд.",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru">
      <body>
        <ApiNavigation />
        <a className="skip-link" href="#main">
          Перейти к содержимому
        </a>
        {children}
      </body>
    </html>
  );
}
