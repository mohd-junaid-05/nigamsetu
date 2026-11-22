# NigamSetu

The product decisions behind this build, written before it starts, with the reasoning attached. The reasoning matters more than the decision -- you'll hit forks this doesn't cover, and you'll need to know which way the thinking was leaning.

Read the part you need before you build something. Don't read it all at once, and don't paste it into a prompt.

## What it is

A civic complaint platform where citizens report infrastructure failures -- roads, garbage, sewage, broken school infrastructure -- with a photo and their live location. But the product is not the reporting. The product is what happens after: an AI agent with a defined toolset verifies whether the fix was real, scores complaint severity, clusters duplicates into one weighted ticket, and auto-generates escalation when the system closes a complaint that was never fixed.

A government operator sees a priority-ranked queue on a map dashboard. Citizens see a public map of open, in-progress, and verified-resolved issues. When a resolution is fake -- same pothole, different angle -- the agent flags it, generates the appeal, and tracks the deadline. The citizen doesn't need to know bureaucracy. The agent does.

Then a panel where officials can ask the system a question about their ward -- "show me all open sewage complaints over 14 days old" -- and watch the agent look the answer up from the structured data rather than hallucinate it.

## The problem

India has Swachhata. 2.39 crore complaints, 93.72% "resolved." The number is real and the product works -- for sanitation. For roads, schools, drainage, public health centers, the channels either don't exist or are scattered across CPGRAMS, municipal portals, WhatsApp groups, and physical registers. A parent reporting a broken school toilet has no Swachhata equivalent.

But the deeper problem is not submission. It is trust. CPGRAMS reports citizen satisfaction below 50%. Grievances bounce between central, state, and municipal layers, "recreating the multi-layered bureaucracy the system aimed to eliminate." Complaints get marked resolved without verification. Citizens give up after one meaningless tick-mark because they don't know appeals exist, don't know the format, and have no evidence trail.

The questions that follow are operational. Was this actually fixed? Is this the 40th report of the same pothole? Which complaint kills someone and which is cosmetic? Who is accountable when the SLA breaches? Answering them today means a citizen manually checking the site, remembering deadlines, and writing formal letters -- which stops happening at around one attempt.

## Who it's for

A citizen who sees something broken in public space and wants it fixed without learning government procedure. Most often someone who has reported before and watched the complaint disappear.

They can take a photo fine. What they can't do is verify the fix was real, write an appeal in the correct format, or track a statutory deadline.

And increasingly that isn't one person's problem. A ward with 50 ghost closures and no verification becomes a ward where nothing gets fixed, and the person who moves in next inherits all of it at once. So a verification trail belongs to a locality rather than to whoever happened to report it. A road is reported once and everyone after that starts from the verification.

This description is the test every feature gets measured against. When something tempting comes up -- a civic score, a city ranking, a review panel -- the question is whether the person described above wants it. Usually they don't. They want to know if the fix was real.

## Why this hasn't stuck before

Civic complaint apps are not a new idea and the track record is mixed. Swachhata handles sanitation with real scale. FixMyStreet variants exist in every major city. CPGRAMS covers central grievances. Any plan here has to account for that rather than assume it away.

The most likely explanation: each solves one layer -- submission, routing, or tracking -- and stops. Swachhata submits and routes but does not verify. CPGRAMS tracks but does not auto-escalate. No existing product closes the loop from report to verified fix to enforced accountability. A complaint that enters a system and exits unverified is a ticket closed, not a problem solved.

The current generation of civic tools mostly work as dashboards -- display the data and let humans decide. That is much faster to build, which is why there are many of them, and it is the approach this product is deliberately not taking. The next section is why.

That's the bet. It is a bet, and it should be stated as one.

## The rule everything rests on

**Every verification comes from comparing the evidence, not from trusting the label.**

The AI may score severity, cluster duplicates, draft escalation letters, and answer questions. It may never decide a complaint is resolved because an official marked it so, and it may never skip the before/after comparison when a photo is available.

The reason, bluntly: a resolution status that is ninety percent accurate is worse than no status, because there's no way to tell which ten percent is fake. The moment a model is allowed to trust a checkbox, every resolution becomes a maybe, and the product is a nice-looking map.

Pressure to break this will come from two directions. "Let the official mark it and move on" pulls toward trusting authority. "Just use the status from the municipal API" pulls toward external dependency. Both are refused.

## Scope

- Sign-in with phone OTP or email, for identity only. No government integration required, no token storage.
- Complaint submission: photo, GPS, category, optional voice note. PWA so it works without app-store approval.
- Severity scoring: a vision model classifies the submitted image into severity tiers (cosmetic / significant / critical / emergency) based on visual evidence.
- Duplicate clustering: DBSCAN on geolocation + perceptual image hashing merges multiple reports of the same issue into one ticket with attestations.
- Public map: open, in-progress, and verified-resolved pins. Colour by status and severity.
- Official dashboard: priority queue sorted by severity x attestations x SLA breach risk. Assignment to nearest facility via geospatial KNN.
- Fix verification: before/after image comparison using vision embeddings. Score above threshold auto-confirms; below sends back for re-verification or citizen override.
- Escalation autopilot: SLA breached or verification failed triggers auto-generated appeal letter with correct format, deadline tracking, and evidence trail.
- Voice and regional language: STT for complaint input, TTS for status updates, translation for cross-language visibility.
- Agent chat panel: officials ask questions about their ward data; the agent looks up structured answers rather than recalling them.

## Out of scope, and why

Each of these is something a model or stakeholder will propose, because each of them sounds like an improvement. The reason matters more than the refusal.

- **Scores, grades, city rankings, "three issues found."** This product fixes infrastructure; it does not rank cities. Once there's a number, people optimize for the number instead of the fix.
- **Letting the agent decide routing.** It has a starting point and a direction; the same geospatial query that draws the map does the assignment. If the model does the routing, invented proximity comes straight back in.
- **Direct government portal integration.** Requires API access that does not exist at the municipality level in most Indian cities. Not in v1. Escalation letters are generated offline and submitted by the citizen or NGO.
- **Approximate verification.** If before/after photos can't be aligned by GPS and timestamp, show nothing. A wrong verification is the same failure as a trusted checkbox.
- **Queues, containers, workers.** One deployable Next.js application on Vercel. If a ward has too many complaints to process in a request, that is a limit to state honestly, not an architecture to build around.
- **Categories beyond physical infrastructure.** Education and health center complaints are in scope because no Swachhata equivalent exists. Tax, passport, and central services are not -- CPGRAMS covers them.

## How it works

No folder names here -- the structure is yours to choose. These are constraints on behaviour.

**The AI agent is standalone.** It takes a complaint record and returns a severity score, a duplicate cluster, a verification result, or an escalation draft. It does not know the web framework exists, does not know the database exists, and must run from a plain script with nothing else running. If it can't run standalone, the layering is wrong.

**Agent knowledge is tools, not memory.** Knowing that a before/after comparison requires GPS proximity and timestamp proximity is tool logic. An `if (looks similar)` inside agent reasoning means the tool interface built to prevent exactly that has failed.

**Verification calculations are pure functions** over a pair of images and their metadata. No model call inside them, nothing to mock in order to check them.

**Identity is a token, and the token carries the ward/role claim.** Sign-in comes from Clerk. Everything after that decides what someone may see by reading the role claim off that token. Nothing in the application asks the identity provider a question at runtime.

**The database is Postgres on Supabase**, and access to it is row-level security rather than a check the application remembers to perform. Complaints belong to a ward, the policy reads the ward off the token, and that is the whole authorization layer. The distinction matters: an official from Ward A signing in should see Ward B's rows are not hidden by the interface but absent from the query.

**Row-level security is on by default, not per table.** An agent is writing these migrations, and the two failure modes are not symmetrical. A table with security enabled and no policy yet returns nothing, which is visible. A table where someone forgot to enable it returns everything, silently. The second one must be impossible rather than unlikely.

**Every AI call is traced**, with the trace stored so an auditor can see what the agent saw, what tools it called, and what it returned. That's what makes the agent verifiable rather than a black box.

## The interface

A tool for citizens and officials, not a social network. Large touch targets for the citizen side, dense information for the official side. Someone using the dashboard is scanning a lot of pins and queues at once, and the layout should assume that rather than fighting it.

**Colour carries meaning or it isn't there.** Three things earn colour. Status: red for open, amber for in-progress, green for verified-resolved. Severity: a heat gradient from cool (cosmetic) to hot (emergency). Direction: incoming complaints and outgoing resolutions are different visual weights. Everything else -- surfaces, borders, body text -- is greyscale.

**The palette starts at four decisions.** One blue as the accent, for selection and anything interactive. Green for verified, amber for in-progress, red for open/escalated. Surfaces near white in light mode, near black in dark. Everything else derives from those -- pick sensible values, keep them consistent, and don't ask about each one.

**Dark and light, and the user's choice wins.** Three states: follow the system, force light, force dark. The choice survives a reload. Both palettes are real palettes rather than one of them inverted.

**Nothing moves on its own.** Motion happens because something was clicked. No ambient animation, no pulsing pins, no drifting heatmap.

**Anything derivable from the data is instant.** If an answer is arithmetic over data the browser already holds, it appears immediately -- no spinner, no network request. Putting a spinner in front of a calculation teaches people to distrust the fast paths, which are most of them.

**The shell gets built once.** Where the panels sit, and what each one is for, is settled in an early phase. Later phases add to those panels; they don't rearrange them. Specific placement lives in the phase specs.

## Where this is likely to go wrong

**Image alignment for verification.** Two photos of the same pothole from different angles, different lighting, different phones. The threshold for "same scene" has to be solved for rather than guessed. Expect at least one wrong answer here before a right one.

**Duplicate clustering at different scales.** A damaged road segment reported by 40 people at 40 points along 200 meters. DBSCAN parameters that merge them into one ticket or split them into forty are both wrong in different ways. This is the one place loud reporting wins over a tidy interface.

**Measuring whether the agent output is any good.** Reading a few verification scores and judging them fine is not measurement. The requirement is that accuracy becomes a number; the method for producing that number is genuinely open at the time of writing, and it is the least settled part of this plan.

**The escalation letter format.** RTI formats and municipal appeal structures vary by state. A letter that is correct in Maharashtra may be wrong in Karnataka. The v1 scope is one state, one format, with the adapter pattern ready for others.

## What has to be true before this ships

Not "it looks right". Specifics:

- Pointed at a known set of test complaints, five before/after pairs checked by hand match what the agent claims about verification.
- Coverage states what was skipped and why, and the number is believable.
- Signed in as an official from Ward A, Ward B's complaints do not come back from the query at all.
- Every table in the schema has row-level security enabled. Not most of them.
- An escalation letter never cites a complaint absent from the database, and that is demonstrated by a check rather than asserted.
- The chat panel shows what it looked up before it answers. An answer arriving with no lookups behind it is the exact failure this product exists to prevent.
