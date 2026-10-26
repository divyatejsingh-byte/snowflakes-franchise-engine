import type { Result } from "./types";

/** Candidate-facing wording: friendly, never uses internal terms like "cannibalised" or "rejected". */
export function candidateStatus(r: Result): { label: string; tone: "good" | "info" | "neutral" } {
  switch (r.status) {
    case "ACCEPTED": return { label: "Shortlisted", tone: "good" };
    case "WAITLISTED": return { label: "On our waitlist", tone: "info" };
    case "ON_HOLD": return { label: "Under review", tone: "neutral" };
    case "REJECTED": return { label: "Let's find another pin code", tone: "neutral" };
  }
}

export const showCandidateScore = (r: Result) => r.status === "ACCEPTED" || r.status === "WAITLISTED";

export function candidateNarrative(r: Result): string {
  const a = r.app;
  const first = a.name.split(" ")[0] || "there";
  const city = r.prefix?.city || r.territory?.city || a.city || "your area";
  const alt = r.openPinsInTerritory.length ? ` Pin codes currently open in ${city}: ${r.openPinsInTerritory.slice(0, 5).join(", ")}.` : "";
  switch (r.label) {
    case "ACCEPTED (Selected)":
      return `Congratulations ${first}, and welcome to the SnowFlakes family! You're shortlisted for pin code ${a.pin} in ${city}. Our expansion team will be in touch shortly with the next steps.`;
    case "WAITLISTED (Pin Code Contention)":
      return `Thank you, ${first}. We keep a single store per pin code, and another strong application for ${a.pin} is a little ahead of yours right now. We've placed you on our waitlist and will reach out if it opens up. A nearby pin code could also be a great fit.${alt}`;
    case "WAITLISTED (Territory Capacity)":
      return `Thank you, ${first}. We've had a lot of interest in ${city} and the available openings are taken for now. You're on our waitlist, and we'll contact you as soon as a spot frees up.`;
    case "REJECTED (Cannibalisation)":
      return `Thank you for your interest, ${first}. We already have a store serving pin code ${a.pin}, and we keep one store per pin code so every partner has a strong customer base. We'd love to help you find another location nearby.${alt}`;
    case "ON_HOLD (Out-of-Scope Pin Code)":
      return `Thank you for your interest, ${first}. We're currently opening stores in selected Karnataka cities, and pin code ${a.pin} isn't part of our current plan. If you have a location starting with 560, 570, 572, 575, 577, 580 or 590, we'd be glad to take a look.`;
    case "ON_HOLD (Unmapped Territory)":
      return `Thank you, ${first}. ${city} is one of our focus cities, and we're still finalising which areas we open there. We've kept your application under review and will update you once pin code ${a.pin} is confirmed.`;
    case "ON_HOLD (No Space Identified)":
      return `Thank you, ${first}. Your profile looks promising! Once you've lined up a shop space (ideally 250–450 sq ft on the ground floor or in a mall food court), share it with us and we'll move your application forward.`;
    case "ON_HOLD (Upper Floor Blocker)":
      return `Thank you, ${first}. Ice cream is a walk-in, impulse treat, and upper-floor shops see far fewer walk-ins. Your application stays under review — if you can find a ground-floor shop on a busy street, or a unit inside a mall, we'd be delighted to move forward.`;
    case "ON_HOLD (Capital Below Threshold)":
      return `Thank you, ${first}. For a store in ${city}, we usually look for a slightly higher starting investment than the one you've shared. If you're able to increase it, we'd be happy to take another look.`;
    case "ON_HOLD (Incomplete or Unidentifiable Data)":
      return `Thank you, ${first}. We couldn't read some of the details on your application, so we haven't made a decision yet. Could you re-send the missing or unclear information? We won't fill in anything on your behalf.`;
    default:
      return `Thank you, ${first}. We've received your application and our team is reviewing it.`;
  }
}

/** Friendly tips for strengthening the application (the "fix" half of each internal bottleneck). */
export function candidateTips(r: Result): string[] {
  return r.bottlenecks.map((b) => b.fix.replace(/\s*Open pins in [^.]*\./, "").trim()).filter(Boolean);
}
