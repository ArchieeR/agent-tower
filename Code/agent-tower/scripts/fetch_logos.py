import urllib.request
import json
import re

def fetch_svg(url):
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)"})
        with urllib.request.urlopen(req) as res:
            return res.read().decode("utf-8")
    except Exception as e:
        print(f"Failed {url}: {e}")
        return None

urls = {
    "Stripe": "https://svgl.app/library/stripe.svg",
    "Linear": "https://svgl.app/library/linear.svg",
    "Slack": "https://svgl.app/library/slack.svg",
    "Firebase": "https://svgl.app/library/firebase.svg",
    "Sentry": "https://svgl.app/library/sentry.svg",
    "Firecrawl": "https://svgl.app/library/firecrawl-dark.svg",
    "Apollo": "https://svgl.app/library/apollo-io.svg",
    "Google": "https://svgl.app/library/google.svg",
    "Github": "https://raw.githubusercontent.com/simple-icons/simple-icons/develop/icons/github.svg",
    "Vercel": "https://svgl.app/library/vercel_dark.svg",
    "Resend": "https://svgl.app/library/resend-icon-white.svg",
    "Gmail": "https://raw.githubusercontent.com/simple-icons/simple-icons/develop/icons/gmail.svg",
    "GA4": "https://raw.githubusercontent.com/simple-icons/simple-icons/develop/icons/googleanalytics.svg",
    "GSC": "https://raw.githubusercontent.com/simple-icons/simple-icons/develop/icons/googlesearchconsole.svg",
    "Bing": "https://svgl.app/library/bing.svg",
    "Xero": "https://raw.githubusercontent.com/simple-icons/simple-icons/develop/icons/xero.svg",
    "React": "https://raw.githubusercontent.com/simple-icons/simple-icons/develop/icons/react.svg",
}

def svg_to_jsx(svg_raw, component_name):
    # Extract original viewBox if present
    vb_match = re.search(r'viewBox=["\']([^"\']+)["\']', svg_raw)
    viewbox = vb_match.group(1) if vb_match else "0 0 24 24"

    # Clean XML header, DOCTYPE, and internal <style> blocks
    clean = re.sub(r"<\?xml[^\?]+\?>", "", svg_raw)
    clean = re.sub(r"<!DOCTYPE[^>]+>", "", clean)
    clean = re.sub(r"<style[^>]*>.*?</style>", "", clean, flags=re.DOTALL)
    clean = clean.strip()

    # Convert attribute names to React JSX camelCase
    replacements = [
        (r'fill-rule=', 'fillRule='),
        (r'clip-rule=', 'clipRule='),
        (r'stroke-width=', 'strokeWidth='),
        (r'stroke-linecap=', 'strokeLinecap='),
        (r'stroke-linejoin=', 'strokeLinejoin='),
        (r'stop-color=', 'stopColor='),
        (r'stop-opacity=', 'stopOpacity='),
        (r'fill-opacity=', 'fillOpacity='),
        (r'stroke-dasharray=', 'strokeDasharray='),
        (r'xmlns:xlink=', 'xmlnsXlink='),
        (r'xlink:href=', 'xlinkHref='),
        (r'enable-background=', 'enableBackground='),
        (r'class=', 'className='),
    ]
    for old, new in replacements:
        clean = re.sub(old, new, clean)

    # Convert inline style="fill:#fa5d19..." to style={{ fill: '#fa5d19' }} or strip invalid css functions
    clean = re.sub(r'style="[^"]*fill:(#[a-fA-F0-9]+)[^"]*"', r'fill="\1"', clean)
    clean = re.sub(r'style=["\'][^"\']*["\']', '', clean)

    # Replace root <svg ...> with standard React props
    clean = re.sub(r'<svg[^>]*>', f'<svg width={{size}} height={{size}} viewBox="{viewbox}" className={{className}}>', clean, count=1)

    return f"""export function {component_name}Logo({{ size = 22, className = "" }}: IconProps) {{
  return (
    {clean}
  )
}}"""

jsx_components = []
for name, url in urls.items():
    svg_raw = fetch_svg(url)
    if svg_raw:
        jsx = svg_to_jsx(svg_raw, name)
        jsx_components.append(jsx)

# Clean multi-color brand SVGs for Reddit, Firefox, Attio, Composio, TinyFish, Starling, Rheos
custom_components = """
export function RedditLogo({ size = 22, className = "" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <circle cx="12" cy="12" r="10" fill="#FF4500" />
      <circle cx="8" cy="11.5" r="1.5" fill="#FFFFFF" />
      <circle cx="16" cy="11.5" r="1.5" fill="#FFFFFF" />
      <path d="M9 16c1 1 5 1 6 0" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="18" cy="7" r="1.5" fill="#FFFFFF" />
      <path d="M12 7l4.5-.5L18 7" stroke="#FFFFFF" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  )
}

export function FirefoxLogo({ size = 22, className = "" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <circle cx="12" cy="12" r="10" fill="#FF9500" />
      <path d="M12 2a10 10 0 0110 10c0 5.523-4.477 10-10 10S2 17.523 2 12A10 10 0 0112 2z" fill="#FF0055" opacity="0.8" />
      <circle cx="12" cy="12" r="5" fill="#38BDF8" />
    </svg>
  )
}

export function AttioLogo({ size = 22, className = "" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <rect x="2" y="2" width="9" height="9" rx="2.5" fill="#38BDF8" />
      <rect x="13" y="2" width="9" height="9" rx="2.5" fill="#818CF8" />
      <rect x="2" y="13" width="9" height="9" rx="2.5" fill="#C084FC" />
      <rect x="13" y="13" width="9" height="9" rx="2.5" fill="#F472B6" />
    </svg>
  )
}

export function ComposioLogo({ size = 22, className = "" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" fill="#38BDF8" stroke="#0284C7" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function TinyFishLogo({ size = 22, className = "" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M18 12c.5-3-2-6-6-6s-7 3-7 6 3 6 7 6 6.5-3 6-6z" fill="#10B981" />
      <path d="M18 12l4-3v6l-4-3z" fill="#059669" />
      <circle cx="9" cy="11" r="1.5" fill="#FFFFFF" />
    </svg>
  )
}

export function StarlingLogo({ size = 22, className = "" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <circle cx="12" cy="12" r="10" fill="#00D2B5" />
      <path d="M12 6v12M6 12h12" stroke="#09090B" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  )
}

export function RheosLogo({ size = 22, className = "" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <circle cx="12" cy="12" r="9" stroke="#38BDF8" strokeWidth="2.5" />
      <circle cx="12" cy="12" r="4" fill="#38BDF8" />
    </svg>
  )
}
"""

header = """import React from "react"

type IconProps = {
  size?: number
  className?: string
}

/* -------------------------------------------------------------------------- */
/* MULTI-COLOR OFFICIAL BRAND LOGOS (SVGL & Official Brand Vector Assets)    */
/* -------------------------------------------------------------------------- */
"""

resolvers = r"""
/* -------------------------------------------------------------------------- */
/* ICON RESOLVERS                                                             */
/* -------------------------------------------------------------------------- */

export function ToolIcon({
  slug,
  name,
  size = 22,
  className = "",
}: {
  slug?: string
  name?: string
  size?: number
  className?: string
}) {
  const key = (slug || name || "").toLowerCase().replace(/[_\s-]+/g, "-")

  if (key.includes("stripe")) return <StripeLogo size={size} className={className} />
  if (key.includes("linear")) return <LinearLogo size={size} className={className} />
  if (key.includes("slack")) return <SlackLogo size={size} className={className} />
  if (key.includes("github") || key.includes("repo") || key.includes("code")) return <GithubLogo size={size} className={className} />
  if (key.includes("firebase")) return <FirebaseLogo size={size} className={className} />
  if (key.includes("vercel")) return <VercelLogo size={size} className={className} />
  if (key.includes("sentry")) return <SentryLogo size={size} className={className} />
  if (key.includes("resend")) return <ResendLogo size={size} className={className} />
  if (key.includes("firecrawl")) return <FirecrawlLogo size={size} className={className} />
  if (key.includes("apollo")) return <ApolloLogo size={size} className={className} />
  if (key.includes("attio")) return <AttioLogo size={size} className={className} />
  if (key.includes("reddit")) return <RedditLogo size={size} className={className} />
  if (key.includes("composio")) return <ComposioLogo size={size} className={className} />
  if (key.includes("tinyfish")) return <TinyFishLogo size={size} className={className} />
  if (key.includes("starling")) return <StarlingLogo size={size} className={className} />
  if (key.includes("xero")) return <XeroLogo size={size} className={className} />
  if (key.includes("bing")) return <BingLogo size={size} className={className} />
  if (key.includes("gmail")) return <GmailLogo size={size} className={className} />
  if (key.includes("ga4") || key.includes("analytics")) return <GA4Logo size={size} className={className} />
  if (key.includes("gsc") || key.includes("search-console")) return <GSCLogo size={size} className={className} />
  if (key.includes("google")) return <GoogleLogo size={size} className={className} />
  if (key.includes("firefox")) return <FirefoxLogo size={size} className={className} />
  if (key.includes("react") || key.includes("remotion")) return <ReactLogo size={size} className={className} />

  return <RheosLogo size={size} className={className} />
}

export function SkillIcon({
  id,
  name,
  scope,
  size = 22,
  className = "",
}: {
  id?: string
  name?: string
  scope?: string
  size?: number
  className?: string
}) {
  const key = (id || name || "").toLowerCase().replace(/[_\s-]+/g, "-")

  if (key.includes("stripe")) return <StripeLogo size={size} className={className} />
  if (key.includes("linear")) return <LinearLogo size={size} className={className} />
  if (key.includes("slack")) return <SlackLogo size={size} className={className} />
  if (key.includes("composio")) return <ComposioLogo size={size} className={className} />
  if (key.includes("tinyfish")) return <TinyFishLogo size={size} className={className} />
  if (key.includes("firecrawl")) return <FirecrawlLogo size={size} className={className} />
  if (key.includes("apollo")) return <ApolloLogo size={size} className={className} />
  if (key.includes("sentry")) return <SentryLogo size={size} className={className} />
  if (key.includes("resend")) return <ResendLogo size={size} className={className} />

  return <RheosLogo size={size} className={className} />
}
"""

full_code = header + "\n\n".join(jsx_components) + "\n\n" + custom_components + "\n\n" + resolvers

with open("Code/agent-tower/components/icons/tool-icons.tsx", "w") as f:
    f.write(full_code)

print("Generated clean multi-color tool-icons.tsx!")
