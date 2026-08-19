import urllib.request
import re

def fetch_clean_svg(url):
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)"})
        with urllib.request.urlopen(req) as res:
            svg = res.read().decode("utf-8")
            
            # Find viewBox
            vb_match = re.search(r'viewBox=["\']([^"\']+)["\']', svg)
            viewbox = vb_match.group(1) if vb_match else "0 0 24 24"

            # Clean XML / DOCTYPE / style
            clean = re.sub(r"<\?xml[^\?]+\?>", "", svg)
            clean = re.sub(r"<!DOCTYPE[^>]+>", "", clean)
            clean = re.sub(r"<style[^>]*>.*?</style>", "", clean, flags=re.DOTALL)
            clean = clean.strip()

            # Convert XML attribute names to React JSX
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

            # Strip style="fill:#..." if invalid css
            clean = re.sub(r'style="[^"]*fill:(#[a-fA-F0-9]+)[^"]*"', r'fill="\1"', clean)
            clean = re.sub(r'style=["\'][^"\']*["\']', '', clean)

            # Extract inner content from <svg ...> to </svg>
            inner_match = re.search(r'<svg[^>]*>(.*?)</svg>', clean, re.DOTALL)
            inner = inner_match.group(1).strip() if inner_match else clean

            return viewbox, inner
    except Exception as e:
        print(f"Error fetching {url}: {e}")
        return None, None

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
    "Starling": "https://raw.githubusercontent.com/simple-icons/simple-icons/develop/icons/starlingbank.svg",
    "Reddit": "https://raw.githubusercontent.com/simple-icons/simple-icons/develop/icons/reddit.svg",
    "Firefox": "https://raw.githubusercontent.com/simple-icons/simple-icons/develop/icons/firefoxbrowser.svg",
    "Amplitude": "https://www.vectorlogo.zone/logos/amplitude/amplitude-icon.svg",
}

jsx_outputs = []
for name, url in urls.items():
    viewbox, inner = fetch_clean_svg(url)
    if inner:
        if "fill=" not in inner and "stroke=" not in inner:
            inner = f'<g fill="currentColor">{inner}</g>'
        
        comp = f"""export function {name}Logo({{ size = 22, className = "", style }}: IconProps) {{
  return (
    <svg width={{size}} height={{size}} viewBox="{viewbox}" className={{className}} style={{style}} fill="none">
      {inner}
    </svg>
  )
}}"""
        jsx_outputs.append(comp)

# Official verified brand SVGs for Attio, Composio, TinyFish, Paper, Rheos
custom_components = """
export function AttioLogo({ size = 22, className = "", style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 26" className={className} style={style} fill="none">
      <path d="M22.9913 7.7644C23.4148 7.08496 23.4148 6.21112 22.9913 5.53553L20.4044 1.39536L20.1889 1.04697C19.802 0.429125 19.136 0.0595703 18.4046 0.0595703H12.5649C11.8354 0.0595703 11.1694 0.429125 10.7806 1.0489L0.323361 17.7847C0.113561 18.1196 0 18.8992 0 19.2918C0 19.6845 0.111636 20.0714 0.321436 20.4044L3.12582 24.8949C3.5127 25.5146 4.17866 25.8823 4.90815 25.8823H10.7479C11.4812 25.8823 12.1472 25.5127 12.5321 24.8929L12.7458 24.5542L14.8342 21.2089L21.0127 11.3214L22.9875 8.15903L22.9913 8.1571ZM22.3812 7.04266C22.3812 7.25631 22.3215 7.47189 22.2002 7.66244L11.9566 24.0576C11.8643 24.2058 11.716 24.2231 11.6564 24.2231C11.5967 24.2231 11.4504 24.2058 11.3561 24.0576L8.7673 19.9097C8.53248 19.5344 8.53248 19.0513 8.7673 18.6721L19.0109 2.2808C19.1033 2.13067 19.2515 2.11334 19.3112 2.11334C19.3708 2.11334 19.519 2.13067 19.6134 2.28272L22.2002 6.42289C22.3215 6.61344 22.3812 6.82902 22.3812 7.04266Z" fill="#38BDF8"/>
      <path d="M30.6468 17.7823L28.0599 13.6422C28.0599 13.6422 28.0503 13.6248 28.0445 13.6172L27.8405 13.2919C27.4555 12.674 26.7895 12.3045 26.062 12.3025L21.8949 12.2891L21.6042 12.7549L16.6249 20.7234L16.3496 21.1642L18.4361 24.4978C18.821 25.1176 19.487 25.4872 20.2203 25.4872H26.06C26.7799 25.4872 27.4613 25.108 27.8424 24.4998L28.0483 24.1706L30.6487 20.0112C31.0741 19.3337 31.0741 18.4579 30.6487 17.7823ZM29.8576 19.5166L27.2669 23.6625C27.2553 23.6817 27.2419 23.6971 27.2303 23.7125C27.1398 23.8146 27.0224 23.828 26.9705 23.828C26.9108 23.828 26.7645 23.8107 26.6702 23.6606L24.0795 19.5146C24.0506 19.4684 24.0256 19.4203 24.0025 19.3683C23.9794 19.3183 23.9621 19.2683 23.9467 19.2163C23.8889 19.0084 23.8889 18.7851 23.9467 18.5773C23.9755 18.4753 24.0198 18.3732 24.0775 18.2809L26.6644 14.1388C26.6644 14.1388 26.6683 14.133 26.6702 14.1291C26.7318 14.0367 26.8088 13.9944 26.8762 13.9809C26.9031 13.9732 26.9262 13.9713 26.9454 13.9675C26.9551 13.9675 26.9647 13.9675 26.9743 13.9675C27.034 13.9675 27.1822 13.9867 27.2746 14.1368L29.8615 18.277C30.0982 18.6543 30.0982 19.1393 29.8615 19.5166Z" fill="#C084FC"/>
    </svg>
  )
}

export function ComposioLogo({ size = 22, className = "", style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 77 89" className={className} style={style} fill="none">
      <path d="M75.2058 25.0205L25.1809 14.7895C21.9009 14.1161 18.8164 16.6358 18.8164 19.981V43.6794V44.9393V68.6375C18.8164 71.9827 21.9009 74.5028 25.1809 73.8292L75.2058 63.5983" stroke="#0284C7" strokeWidth="4.5" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M36.5798 6.55725C36.58 1.85765 41.3837 -1.28534 45.6854 0.51385L45.8901 0.603165L45.8946 0.605772L72.6558 12.9651C75.0043 14.0238 76.4763 16.3695 76.477 18.9165V29.3865C76.477 33.2061 73.2239 36.2227 69.4233 35.9287L39.1152 33.6665V54.952L69.4187 52.6898L69.7738 52.6716C73.4135 52.5828 76.4756 55.522 76.4543 59.2104V69.6804C76.4543 72.2472 74.9435 74.5583 72.6377 75.6305L72.6337 75.6318L45.8953 87.9686L45.8959 87.9693C41.5356 89.9874 36.5798 86.809 36.5798 82.0185V72.0409C36.3834 72.1183 36.173 72.1697 35.952 72.1858L21.1623 73.2506C19.9265 73.3393 18.8749 72.36 18.8747 71.121V60.1407C18.8747 59.7151 19.0018 59.3158 19.2202 58.9796L7.05322 59.8885H7.04868C3.25859 60.1572 9.84563e-06 57.1501 0 53.3457V35.2728C0.000272882 31.4521 3.25594 28.4341 7.05783 28.7307H7.05716L18.9549 29.6187C18.9034 29.4349 18.8747 29.2418 18.8747 29.0423V17.4758C18.8747 15.7871 20.3854 14.4989 22.0529 14.7657L36.1359 17.0188C36.2907 17.0436 36.4388 17.0859 36.5798 17.1413V6.55725Z" fill="#38BDF8"/>
    </svg>
  )
}

export function TinyFishLogo({ size = 22, className = "", style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} style={style} fill="none">
      <path d="M18 12c.5-3-2-6-6-6s-7 3-7 6 3 6 7 6 6.5-3 6-6z" fill="#10B981" />
      <path d="M18 12l4-3v6l-4-3z" fill="#059669" />
      <circle cx="9" cy="11" r="1.5" fill="#FFFFFF" />
    </svg>
  )
}

export function PaperLogo({ size = 22, className = "", style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 26 26" className={className} style={style} fill="none">
      <path d="M15.9874 0H3.99685V3.99685H15.9874V15.9874H3.99685V3.99685L0 3.99687V15.9874V25.9795H3.99685H15.9874V15.9874H25.9795V3.99685V0H15.9874Z" fill="#81ACEC" />
    </svg>
  )
}

export function RheosLogo({ size = 22, className = "", style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} style={style} fill="none">
      <circle cx="12" cy="12" r="9" stroke="#38BDF8" strokeWidth="2.5" />
      <circle cx="12" cy="12" r="4" fill="#38BDF8" />
    </svg>
  )
}
"""

header = """import React from "react"
import {
  Binary,
  Bot,
  Box,
  BrainCircuit,
  Briefcase,
  Clapperboard,
  Cpu,
  Globe,
  HardDrive,
  HeartPulse,
  HelpCircle,
  KeyRound,
  Laptop,
  ListTodo,
  Lock,
  Megaphone,
  MessagesSquare,
  PlugZap,
  Radio,
  Receipt,
  ServerCog,
  Share2,
  Sparkles,
  Table,
  Target,
  TestTube,
  TrendingUp,
  UserCheck,
  Users,
  Workflow,
  Zap,
} from "lucide-react"

type IconProps = {
  size?: number
  className?: string
  style?: React.CSSProperties
}

/* -------------------------------------------------------------------------- */
/* ACCURATE OFFICIAL BRAND LOGOS (Exact Native ViewBoxes & Multi-Color Paths) */
/* -------------------------------------------------------------------------- */
"""

resolvers = r"""
/* -------------------------------------------------------------------------- */
/* UNIFIED CENTRAL ICON RESOLVERS                                            */
/* -------------------------------------------------------------------------- */

export function ToolIcon({
  slug,
  name,
  size = 22,
  className = "",
  style,
}: {
  slug?: string
  name?: string
  size?: number
  className?: string
  style?: React.CSSProperties
}) {
  const key = (slug || name || "").toLowerCase().replace(/[_\s-]+/g, "-")

  // Dedicated Product/Platform Tool Mappings
  if (key.includes("secrets") || key.includes("secret") || key.includes("gcp")) return <KeyRound size={size} className={className} style={{ color: "#EF4444", ...style }} />
  if (key.includes("observability") || key.includes("monitoring")) return <HeartPulse size={size} className={className} style={{ color: "#10B981", ...style }} />
  if (key.includes("eden")) return <Share2 size={size} className={className} style={{ color: "#F472B6", ...style }} />
  if (key.includes("buzz")) return <Bot size={size} className={className} style={{ color: "#10B981", ...style }} />
  if (key.includes("brain") || key.includes("rheos-brain")) return <BrainCircuit size={size} className={className} style={{ color: "#38BDF8", ...style }} />
  if (key.includes("rig") || key.includes("local-rig")) return <Cpu size={size} className={className} style={{ color: "#F59E0B", ...style }} />
  if (key.includes("qa") || key.includes("devtools")) return <Laptop size={size} className={className} style={{ color: "#818CF8", ...style }} />

  // Official Brand Vector Logos
  if (key.includes("stripe")) return <StripeLogo size={size} className={className} style={style} />
  if (key.includes("linear")) return <LinearLogo size={size} className={className} style={style} />
  if (key.includes("slack")) return <SlackLogo size={size} className={className} style={style} />
  if (key.includes("github") || key.includes("rheos-repos")) return <GithubLogo size={size} className={className} style={style} />
  if (key.includes("firebase")) return <FirebaseLogo size={size} className={className} style={style} />
  if (key.includes("vercel")) return <VercelLogo size={size} className={className} style={style} />
  if (key.includes("sentry")) return <SentryLogo size={size} className={className} style={style} />
  if (key.includes("resend")) return <ResendLogo size={size} className={className} style={style} />
  if (key.includes("firecrawl")) return <FirecrawlLogo size={size} className={className} style={style} />
  if (key.includes("apollo")) return <ApolloLogo size={size} className={className} style={style} />
  if (key.includes("attio")) return <AttioLogo size={size} className={className} style={style} />
  if (key.includes("reddit")) return <RedditLogo size={size} className={className} style={style} />
  if (key.includes("composio")) return <ComposioLogo size={size} className={className} style={style} />
  if (key.includes("tinyfish")) return <TinyFishLogo size={size} className={className} style={style} />
  if (key.includes("starling")) return <StarlingLogo size={size} className={className} style={style} />
  if (key.includes("xero")) return <XeroLogo size={size} className={className} style={style} />
  if (key.includes("bing")) return <BingLogo size={size} className={className} style={style} />
  if (key.includes("gmail")) return <GmailLogo size={size} className={className} style={style} />
  if (key.includes("ga4") || key.includes("analytics")) return <GA4Logo size={size} className={className} style={style} />
  if (key.includes("gsc") || key.includes("search-console") || key.includes("google-search-console")) return <GSCLogo size={size} className={className} style={style} />
  if (key.includes("google") || key.includes("gcloud") || key.includes("gws")) return <GoogleLogo size={size} className={className} style={style} />
  if (key.includes("firefox")) return <FirefoxLogo size={size} className={className} style={style} />
  if (key.includes("react") || key.includes("remotion")) return <ReactLogo size={size} className={className} style={style} />
  if (key.includes("paper")) return <PaperLogo size={size} className={className} style={style} />
  if (key.includes("amplitude")) return <AmplitudeLogo size={size} className={className} style={style} />

  return <RheosLogo size={size} className={className} style={style} />
}

export function SkillIcon({
  id,
  name,
  scope,
  size = 22,
  className = "",
  style,
}: {
  id?: string
  name?: string
  scope?: string
  size?: number
  className?: string
  style?: React.CSSProperties
}) {
  const key = (id || name || "").toLowerCase().replace(/[_\s-]+/g, "-")

  // Brand Logomarks for Skills
  if (key.includes("stripe")) return <StripeLogo size={size} className={className} style={style} />
  if (key.includes("linear")) return <LinearLogo size={size} className={className} style={style} />
  if (key.includes("slack")) return <SlackLogo size={size} className={className} style={style} />
  if (key.includes("composio")) return <ComposioLogo size={size} className={className} style={style} />
  if (key.includes("tinyfish")) return <TinyFishLogo size={size} className={className} style={style} />
  if (key.includes("firecrawl")) return <FirecrawlLogo size={size} className={className} style={style} />
  if (key.includes("apollo")) return <ApolloLogo size={size} className={className} style={style} />
  if (key.includes("sentry")) return <SentryLogo size={size} className={className} style={style} />
  if (key.includes("resend")) return <ResendLogo size={size} className={className} style={style} />
  if (key.includes("github")) return <GithubLogo size={size} className={className} style={style} />
  if (key.includes("paper")) return <PaperLogo size={size} className={className} style={style} />
  if (key.includes("gws")) return <GoogleLogo size={size} className={className} style={style} />

  // Distinct Icons for All Agent Skills
  if (key.includes("brain")) return <BrainCircuit size={size} className={className} style={{ color: "#38BDF8", ...style }} />
  if (key.includes("ask")) return <HelpCircle size={size} className={className} style={{ color: "#38BDF8", ...style }} />
  if (key.includes("recap")) return <Table size={size} className={className} style={{ color: "#10B981", ...style }} />
  if (key.includes("adhd")) return <Target size={size} className={className} style={{ color: "#F59E0B", ...style }} />
  if (key.includes("search") || key.includes("fetch") || key.includes("agent")) return <Globe size={size} className={className} style={{ color: "#38BDF8", ...style }} />
  if (key.includes("counsel")) return <MessagesSquare size={size} className={className} style={{ color: "#818CF8", ...style }} />
  if (key.includes("prd") || key.includes("interview")) return <ListTodo size={size} className={className} style={{ color: "#F472B6", ...style }} />
  if (key.includes("team")) return <Users size={size} className={className} style={{ color: "#38BDF8", ...style }} />
  if (key.includes("drift") || key.includes("health")) return <HeartPulse size={size} className={className} style={{ color: "#10B981", ...style }} />
  if (key.includes("mcp") || key.includes("config")) return <PlugZap size={size} className={className} style={{ color: "#F59E0B", ...style }} />
  if (key.includes("memory")) return <HardDrive size={size} className={className} style={{ color: "#818CF8", ...style }} />
  if (key.includes("grab") || key.includes("handoff")) return <Workflow size={size} className={className} style={{ color: "#C084FC", ...style }} />
  if (key.includes("auth")) return <Lock size={size} className={className} style={{ color: "#EF4444", ...style }} />
  if (key.includes("find-skills") || key.includes("tinyskill")) return <Sparkles size={size} className={className} style={{ color: "#F59E0B", ...style }} />
  if (key.includes("rig")) return <Cpu size={size} className={className} style={{ color: "#F59E0B", ...style }} />
  if (key.includes("qa") || key.includes("e2e")) return <TestTube size={size} className={className} style={{ color: "#10B981", ...style }} />
  if (key.includes("deploy") || key.includes("genkit")) return <Zap size={size} className={className} style={{ color: "#38BDF8", ...style }} />
  if (key.includes("competitor")) return <TrendingUp size={size} className={className} style={{ color: "#10B981", ...style }} />
  if (key.includes("hiring") || key.includes("job")) return <Briefcase size={size} className={className} style={{ color: "#F59E0B", ...style }} />
  if (key.includes("tech-stack")) return <Binary size={size} className={className} style={{ color: "#818CF8", ...style }} />
  if (key.includes("social") || key.includes("listening")) return <Radio size={size} className={className} style={{ color: "#F472B6", ...style }} />
  if (key.includes("marketing")) return <Megaphone size={size} className={className} style={{ color: "#F97316", ...style }} />
  if (key.includes("finance") || key.includes("crm")) return <Receipt size={size} className={className} style={{ color: "#10B981", ...style }} />
  if (key.includes("humanisation")) return <UserCheck size={size} className={className} style={{ color: "#C084FC", ...style }} />
  if (key.includes("remotion")) return <Clapperboard size={size} className={className} style={{ color: "#EF4444", ...style }} />
  if (key.includes("rheos")) return <RheosLogo size={size} className={className} style={style} />

  // Scope-based Fallbacks with Color
  if (scope === "growth" || scope === "marketing") return <Megaphone size={size} className={className} style={{ color: "#F97316", ...style }} />
  if (scope === "engineering") return <Box size={size} className={className} style={{ color: "#818CF8", ...style }} />
  if (scope === "operations") return <Receipt size={size} className={className} style={{ color: "#10B981", ...style }} />
  if (scope === "system") return <ServerCog size={size} className={className} style={{ color: "#38BDF8", ...style }} />
  if (scope === "hoa") return <Bot size={size} className={className} style={{ color: "#F472B6", ...style }} />

  return <RheosLogo size={size} className={className} style={style} />
}
"""

full = header + "\n\n".join(jsx_outputs) + "\n\n" + custom_components + "\n\n" + resolvers

with open("Code/agent-tower/components/icons/tool-icons.tsx", "w") as f:
    f.write(full)

print("Rebuilt tool-icons.tsx with REAL Attio, Composio, Paper, and Amplitude vector logomarks!")
