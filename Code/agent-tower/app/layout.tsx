import "@fontsource/barlow-semi-condensed/600.css"
import "@fontsource/barlow-semi-condensed/700.css"
import "@fontsource/ibm-plex-sans/400.css"
import "@fontsource/ibm-plex-sans/500.css"
import "@fontsource/ibm-plex-sans/600.css"
import "@fontsource/ibm-plex-mono/500.css"
import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "Agent Tower",
  description: "Local Buzz organization and capability control surface",
}

const themeScript = `(function(){try{var stored=localStorage.getItem('agent-tower-theme');var theme=stored==='light'||stored==='dark'?stored:(matchMedia('(prefers-color-scheme: light)').matches?'light':'dark');document.documentElement.dataset.theme=theme;document.documentElement.style.colorScheme=theme;localStorage.removeItem('agent-tower-font-preview');}catch(e){document.documentElement.dataset.theme='dark';}})();`

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: themeScript }} /></head>
      <body>{children}</body>
    </html>
  )
}
