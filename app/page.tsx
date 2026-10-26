import Link from "next/link";
import { ArrowRight, CalendarCheck, Clock, GraduationCap, MapPinned, Store } from "lucide-react";
import ChatbotWidget from "@/components/ChatbotWidget";
import { Snowflake } from "@/components/IceCream";
import PinEligibilityChecker from "@/components/PinEligibilityChecker";
import ScoopPhoto, { FLAVOUR_PHOTOS, flavour } from "@/components/ScoopPhoto";

const why = [
  { icon: Store, title: "A format that fits", body: "A compact 250–450 sq ft scoop parlour on a ground-floor high street or in a mall food court.", tint: "bg-sprinkle-mint/30 text-emerald-700" },
  { icon: GraduationCap, title: "Training in your language", body: "Learn in Kannada, English or Hindi, whether or not you've run a shop before.", tint: "bg-sprinkle-pink/30 text-pink-700" },
  { icon: CalendarCheck, title: "Open in about 45 days", body: "A guided roadmap covers licences, fit-out, staff training and your first stock.", tint: "bg-sprinkle-lemon/40 text-amber-700" },
  { icon: Snowflake, title: "Cold-chain support", body: "Reefer-truck stock twice a week, freezer SOPs and FSSAI licensing help from day one.", tint: "bg-brand-100 text-brand-700" },
  { icon: Clock, title: "Answers in minutes", body: "Check your pin code, get an instant score and see exactly how to strengthen it.", tint: "bg-brand-100 text-brand-700" },
];


export default function Home() {
  return (
    <div className="space-y-12">
      {/* hero */}
      <section className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-brand-700 via-brand-600 to-brand-500 p-6 text-white shadow-xl shadow-brand-600/20 sm:p-10">
        <div className="grid items-center gap-8 lg:grid-cols-[1.25fr_1fr]">
          <div>
            <p className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-sm font-bold"><MapPinned size={16} /> Now partnering across Karnataka</p>
            <h1 className="text-4xl font-bold leading-tight sm:text-5xl">Partner with South India&apos;s fastest growing <span className="text-sprinkle-lemon">artisan ice cream</span> network.</h1>
            <p className="mt-3 max-w-xl text-lg text-brand-50">Open a SnowFlakes scoop parlour and share <b>Scoops of Joy!</b> in your neighbourhood. Check if your pin code is open in seconds, then apply in minutes.</p>
            <PinEligibilityChecker />
          </div>
          <div className="relative mx-auto hidden h-[22rem] w-full max-w-sm lg:block" aria-hidden="false">
            <div className="absolute inset-0 rounded-[2rem] bg-white/10" />
            <ScoopPhoto f={flavour("Strawberry Swirl")} size={210} label={false} className="absolute left-4 top-6" />
            <ScoopPhoto f={flavour("Pistachio Pop")} size={140} label={false} className="absolute bottom-4 right-3" />
            <ScoopPhoto f={flavour("Mango Magic")} size={120} label={false} className="absolute right-6 top-3" />
            <span className="absolute bottom-6 left-6 rounded-full bg-white px-3 py-1.5 text-sm font-bold text-brand-700 shadow-lg">Scoops of Joy! 🍦</span>
          </div>
        </div>
      </section>

      {/* why */}
      <section>
        <h2 className="text-center text-3xl font-bold text-brand-900">Why partner with SnowFlakes?</h2>
        <p className="mx-auto mt-1 max-w-xl text-center text-slate-600">We make it easy to go from &ldquo;I&apos;d love to&rdquo; to &ldquo;we&apos;re open&rdquo;.</p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {why.map((w) => (
            <div key={w.title} className="card p-5 transition hover:-translate-y-1 hover:shadow-lg">
              <span className={`mb-3 inline-flex rounded-2xl p-3 ${w.tint}`}><w.icon size={22} /></span>
              <h3 className="font-bold text-brand-900">{w.title}</h3>
              <p className="mt-1 text-sm text-slate-600">{w.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* flavours: every scoop photographed and cropped the same way */}
      <section className="rounded-[2rem] bg-white p-6 shadow-sm shadow-brand-600/5 ring-1 ring-ice-200 sm:p-8">
        <h2 className="text-center text-3xl font-bold text-brand-900">Fan-favourite flavours</h2>
        <p className="mx-auto mt-1 max-w-xl text-center text-slate-600">Small-batch scoops your customers will queue for.</p>
        <div className="mt-8 flex flex-wrap justify-center gap-x-5 gap-y-8">
          {FLAVOUR_PHOTOS.map((f) => <ScoopPhoto key={f.name} f={f} size={128} />)}
        </div>
      </section>

      {/* call to action */}
      <section className="rounded-[2rem] border border-brand-100 bg-brand-50 p-8 text-center">
        <h2 className="text-3xl font-bold text-brand-900">Ready to open your own SnowFlakes?</h2>
        <p className="mx-auto mt-1 max-w-xl text-slate-600">A friendly three-step application with a live pin-code check, instant feedback and your personal onboarding plan.</p>
        <Link href="/apply" className="btn mt-5 !px-7 !py-3 text-base">Start my application <ArrowRight size={18} /></Link>
      </section>

      <p className="text-center text-xs text-slate-400">Photography from Unsplash contributors (free to use under the Unsplash License).</p>
      <ChatbotWidget />
    </div>
  );
}
