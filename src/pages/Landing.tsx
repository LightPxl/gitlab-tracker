import { motion } from "framer-motion";
import { ArrowRight, BarChart3, Command, GitBranch, ShieldCheck, Sparkles, Zap } from "lucide-react";
import { Link } from "react-router-dom";
import { useCallback } from "react";

const heroStats = [
  { label: "Pipeline success", value: "99.2%" },
  { label: "Deployments tracked", value: "14.8k" },
  { label: "Active engineers", value: "126" },
];

const bentoCards = [
  {
    title: "One command center",
    description: "Monitor projects, pipelines, velocity, and team health from a single operational surface.",
    icon: Command,
    size: "lg:col-span-2",
  },
  {
    title: "Fast incident visibility",
    description: "Spot regressions and blocked releases before they ripple through delivery.",
    icon: ShieldCheck,
    size: "",
  },
  {
    title: "Release rhythm",
    description: "See branch activity, throughput, and CI trends without digging through tabs.",
    icon: GitBranch,
    size: "",
  },
];

const features = [
  {
    title: "Clarity over noise",
    description: "The interface keeps hierarchy obvious, removes visual clutter, and highlights what needs action now.",
    icon: Sparkles,
  },
  {
    title: "Built for speed",
    description: "Keyboard-friendly workflows, focused layouts, and instant scanning make routine checks feel effortless.",
    icon: Zap,
  },
  {
    title: "Decision-ready signals",
    description: "Use delivery metrics, issue distribution, and project health snapshots to guide the next move quickly.",
    icon: BarChart3,
  },
];

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.25 },
  transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] as const },
};


function ProductPreview() {
  return (
    <div className="relative overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.03] p-3 shadow-[0_30px_120px_rgba(0,0,0,0.45)] backdrop-blur-xl">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />
      <div className="rounded-[22px] border border-white/10 bg-[#0f1017]/95 p-4 sm:p-5">
        <div className="mb-4 flex items-center justify-between border-b border-white/5 pb-4">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-white/45">Overview</p>
            <h3 className="mt-2 text-lg font-semibold text-white">Delivery performance</h3>
          </div>
          <div className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-white/70">
            Live sync
          </div>
        </div>
        <div className="grid gap-3 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-3">
            <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-xs text-white/45">Deployment trend</p>
                  <p className="mt-1 text-2xl font-semibold text-white">+18.4%</p>
                </div>
                <div className="rounded-full bg-[linear-gradient(135deg,rgba(110,86,255,0.25),rgba(55,138,255,0.25))] px-3 py-1 text-xs text-[#c8d3ff]">
                  This month
                </div>
              </div>
              <div className="flex h-32 items-end gap-2">
                {[46, 52, 49, 64, 70, 66, 78, 91, 88, 104, 112, 126].map((height, index) => (
                  <div
                    key={index}
                    className="flex-1 rounded-t-full bg-[linear-gradient(180deg,rgba(125,92,255,0.95),rgba(69,144,255,0.25))]"
                    style={{ height: `${height}px` }}
                  />
                ))}
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              {heroStats.map((stat) => (
                <div key={stat.label} className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                  <p className="text-xs text-white/45">{stat.label}</p>
                  <p className="mt-2 text-2xl font-semibold text-white">{stat.value}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="space-y-3">
            <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-white/45">Project health</p>
                  <p className="mt-1 text-sm font-medium text-white">Critical focus areas</p>
                </div>
                <div className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_20px_rgba(74,222,128,0.9)]" />
              </div>
              <div className="mt-4 space-y-3">
                {[
                  ["Platform API", "92", "Stable"],
                  ["Customer Web", "78", "Watch"],
                  ["Release Ops", "64", "Review"],
                ].map(([name, score, status]) => (
                  <div key={name} className="rounded-xl border border-white/8 bg-black/20 p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-white/88">{name}</span>
                      <span className="text-sm text-white">{score}%</span>
                    </div>
                    <div className="mt-3 h-1.5 rounded-full bg-white/5">
                      <div
                        className="h-1.5 rounded-full bg-[linear-gradient(90deg,#7c5cff,#418dff)]"
                        style={{ width: `${score}%` }}
                      />
                    </div>
                    <p className="mt-2 text-xs text-white/45">{status}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
              <p className="text-xs text-white/45">Recent activity</p>
              <div className="mt-4 space-y-3">
                {[
                  "Release pipeline completed in 4m 12s",
                  "2 merge requests waiting on review",
                  "Incident queue down 31% this week",
                ].map((item) => (
                  <div key={item} className="flex items-center gap-3 rounded-xl border border-white/6 bg-black/20 px-3 py-3">
                    <div className="h-2 w-2 rounded-full bg-[#7c5cff]" />
                    <span className="text-sm text-white/78">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
export default function Landing() {
  // Smooth scroll handler for header links
  const handleScroll = useCallback((e: React.MouseEvent<HTMLAnchorElement>, sectionId: string) => {
    e.preventDefault();
    // Only update the hash, do not navigate to a route
    window.location.hash = `#${sectionId}`;
    const el = document.getElementById(sectionId);
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  }, []);

  return (
    <div className="linear-grid relative min-h-screen overflow-hidden bg-background text-foreground">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(110,86,255,0.16),transparent_32%),radial-gradient(circle_at_80%_20%,rgba(56,139,253,0.16),transparent_24%),linear-gradient(180deg,rgba(255,255,255,0.02),transparent_28%)]" />
      <div className="pointer-events-none absolute left-1/2 top-0 h-[36rem] w-[36rem] -translate-x-1/2 rounded-full bg-[#6c4cff]/15 blur-[160px]" />
      <div className="pointer-events-none absolute right-[-10%] top-[12rem] h-[24rem] w-[24rem] rounded-full bg-[#3485ff]/12 blur-[150px]" />

      <div className="relative mx-auto flex min-h-screen w-full max-w-7xl flex-col px-5 sm:px-6 lg:px-8">
        <motion.header
          initial={{ opacity: 0, y: -18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="sticky top-0 z-20 mb-10 pt-5"
        >
          <div className="linear-surface flex items-center justify-between rounded-full px-4 py-3">
            <Link to="/landing" className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-white shadow-[0_0_30px_rgba(111,91,255,0.15)] overflow-hidden">
                <img src="/logo.jpg" alt="Logo" className="h-8 w-8 object-contain" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">LightPxl</p>
                <p className="text-xs text-white/40">GitLab Tracker</p>
              </div>
            </Link>

            <div className="hidden items-center gap-8 text-sm text-white/58 md:flex">
              <a href="#product" className="transition-colors hover:text-white" onClick={e => handleScroll(e, "product")}>Product</a>
              <a href="#features" className="transition-colors hover:text-white" onClick={e => handleScroll(e, "features")}>Features</a>
              <a href="#overview" className="transition-colors hover:text-white" onClick={e => handleScroll(e, "overview")}>Overview</a>
            </div>

            <div className="flex items-center gap-3">
              <Link
                to="/settings"
                className="rounded-full border border-white/10 px-4 py-2 text-sm text-white/75 transition-all hover:border-white/20 hover:bg-white/[0.04] hover:text-white"
              >
                Configure
              </Link>
              <Link
                to="/dashboard"
                className="inline-flex items-center gap-2 rounded-full bg-[linear-gradient(135deg,#6f5bff,#378aff)] px-4 py-2 text-sm font-medium text-white shadow-[0_8px_30px_rgba(74,92,255,0.35)] transition-all hover:-translate-y-0.5 hover:shadow-[0_16px_40px_rgba(74,92,255,0.4)]"
              >
                Open dashboard
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </motion.header>

        <main className="pb-20">
          <section className="grid items-center gap-14 pb-20 pt-8 lg:grid-cols-[0.92fr_1.08fr] lg:pt-10">
            <motion.div
              initial={{ opacity: 0, y: 22 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.1 }}
              className="max-w-2xl"
            >
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-white/60 shadow-[0_10px_30px_rgba(0,0,0,0.2)] backdrop-blur-xl">
                <span className="h-2 w-2 rounded-full bg-[#7c5cff] shadow-[0_0_18px_rgba(124,92,255,0.9)]" />
                Linear-style operational clarity for GitLab teams
              </div>

              <h1 className="max-w-3xl text-4xl font-semibold leading-[1.02] tracking-[-0.05em] text-white sm:text-5xl lg:text-7xl">
                Track delivery with a calmer, faster, more focused dark interface.
              </h1>

              <p className="mt-6 max-w-xl text-base leading-7 text-white/58 sm:text-lg">
                LightPxl turns GitLab activity into a clean command center with elegant hierarchy, sharp metrics, and product-grade visibility.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  to="/dashboard"
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-[linear-gradient(135deg,#735cff,#378bff)] px-5 py-3 text-sm font-medium text-white shadow-[0_14px_40px_rgba(84,93,255,0.36)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_20px_55px_rgba(84,93,255,0.46)]"
                >
                  Launch dashboard
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  to="/settings"
                  className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/[0.03] px-5 py-3 text-sm font-medium text-white/80 transition-all duration-300 hover:border-white/20 hover:bg-white/[0.05] hover:text-white"
                >
                  Connect GitLab
                </Link>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.98, y: 24 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.18 }}
              className="relative"
            >
              <ProductPreview />
            </motion.div>
          </section>

          <motion.section
            id="product"
            {...fadeUp}
            className="border-y border-white/6 py-16"
          >
            <div className="mb-10 max-w-2xl">
              <p className="text-sm text-white/45">Product surfaces</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-white sm:text-4xl">
                A compact bento layout that explains the product in one scan.
              </h2>
            </div>

            <div className="grid gap-4 lg:grid-cols-4">
              {bentoCards.map((card, index) => (
                <motion.div
                  key={card.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.25 }}
                  transition={{ duration: 0.45, delay: index * 0.08 }}
                  className={`linear-surface linear-card-hover rounded-[28px] p-6 ${card.size}`}
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04]">
                    <card.icon className="h-5 w-5 text-[#b9c5ff]" />
                  </div>
                  <h3 className="mt-6 text-xl font-semibold text-white">{card.title}</h3>
                  <p className="mt-3 max-w-md text-sm leading-6 text-white/58">{card.description}</p>

                  <div className="mt-8 rounded-[22px] border border-white/8 bg-black/20 p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <div className="h-2 w-20 rounded-full bg-white/10" />
                      <div className="h-2 w-8 rounded-full bg-[#6f5bff]/70" />
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-2xl border border-white/6 bg-white/[0.03] p-3">
                        <div className="h-2 w-14 rounded-full bg-white/10" />
                        <div className="mt-4 h-16 rounded-2xl bg-[linear-gradient(180deg,rgba(111,91,255,0.35),rgba(255,255,255,0.03))]" />
                      </div>
                      <div className="rounded-2xl border border-white/6 bg-white/[0.03] p-3">
                        <div className="space-y-2">
                          <div className="h-2 w-full rounded-full bg-white/10" />
                          <div className="h-2 w-4/5 rounded-full bg-white/10" />
                          <div className="h-2 w-3/5 rounded-full bg-white/10" />
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.section>

          <motion.section
            id="features"
            {...fadeUp}
            className="py-16"
          >
            <div className="mb-10 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-2xl">
                <p className="text-sm text-white/45">Features</p>
                <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-white sm:text-4xl">
                  Minimal cards, careful spacing, and signals that are easy to trust.
                </h2>
              </div>
              <p className="max-w-md text-sm leading-6 text-white/52">
                The interface borrows the quiet confidence of Linear: restrained surfaces, subtle motion, and crisp hierarchy.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {features.map((feature, index) => (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.25 }}
                  transition={{ duration: 0.45, delay: index * 0.08 }}
                  className="linear-surface linear-card-hover rounded-[28px] p-6"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04]">
                    <feature.icon className="h-5 w-5 text-[#b9c5ff]" />
                  </div>
                  <h3 className="mt-6 text-lg font-semibold text-white">{feature.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-white/58">{feature.description}</p>
                </motion.div>
              ))}
            </div>
          </motion.section>

          <motion.section
            id="overview"
            {...fadeUp}
            className="pb-4 pt-8"
          >
            <div className="linear-surface overflow-hidden rounded-[32px] p-8 sm:p-10">
              <div className="grid gap-10 lg:grid-cols-[1fr_auto] lg:items-center">
                <div className="max-w-2xl">
                  <p className="text-sm text-white/45">Ready to ship</p>
                  <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-white sm:text-4xl">
                    A production-ready dark landing experience with a cleaner dashboard path.
                  </h2>
                  <p className="mt-4 text-sm leading-6 text-white/58 sm:text-base">
                    Start at the landing page, connect your workspace, and move directly into the dashboard without losing the polished dark visual system.
                  </p>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <Link
                    to="/dashboard"
                    className="inline-flex items-center justify-center gap-2 rounded-full bg-[linear-gradient(135deg,#735cff,#378bff)] px-5 py-3 text-sm font-medium text-white shadow-[0_14px_40px_rgba(84,93,255,0.36)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_20px_55px_rgba(84,93,255,0.46)]"
                  >
                    Enter dashboard
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                  <Link
                    to="/settings"
                    className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/[0.03] px-5 py-3 text-sm font-medium text-white/80 transition-all duration-300 hover:border-white/20 hover:bg-white/[0.05] hover:text-white"
                  >
                    Review settings
                  </Link>
                </div>
              </div>
            </div>
          </motion.section>
        </main>
      </div>
    </div>
  );
}
