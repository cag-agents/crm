---
description: Use when writing the Background panel on a contact or a Creator Sponsorship Brief — the shape, the tone, and structured sections.
---

# Writing a brief

The Background panel is the first thing on a contact's record and the last thing
a rep reads before a call. Two or three sentences, then the structured lines.

## The shape, and it does not vary

> Lewis Carhart is the CEO and co-founder of CAG AI CRM. He previously led growth
> at Fleetio and spent four years at Deloitte in risk advisory.

Current role first, then what they did before. Third person, present tense,
their name at the front. Only what a source states — a job you cannot see on a
profile did not happen, and a date range you are unsure of is left out rather
than approximated.

## Nothing about the person

No "seasoned", no "passionate about", no "well-regarded", no guessing at how
senior or how influential they are. If you find yourself writing an adjective
about somebody rather than a fact about their work, delete the sentence.

The tell: could a rep repeat this sentence to the person on a call without
embarrassment? "You've been at CAG AI CRM two years" is fine. "You're a seasoned
security leader" is not.

## The structured lines

`sections` are scanned, not read. Fill only what you know:

- `currentRole` — `"CEO & Co-founder · CAG AI CRM"`
- `tenure` — `"2 yrs 3 mos"`, from the profile's own dates
- `previousRoles` — one string per role, most recent first
- `seniority` — `"Founder / C-level"`, `"VP"`, `"IC"`
- `function` — `"Executive"`, `"Security"`, `"Finance"`
- `location` — city and country, as the profile writes it

An empty line is better than a guessed one. The panel renders what it has.

## Brand Sponsorship & Collab Briefs

When writing a Creator Sponsorship Brief for a brand partnership inquiry or brand collab deal, format the brief with these four required sections:

1. **Brand Overview**: Company background, target customer alignment, domain, and previous creator collaborations.
2. **Requested Deliverables**: Exact content formats and scope (e.g. 1x Dedicated YouTube Video, 2x Instagram Reels, Telegram community post).
3. **Commercials & Exclusivity (INR)**: Proposed commercial budget in Indian Rupees (`₹`, Lakhs/Crores), benchmark evaluation, payment terms, and category exclusivity period.
4. **Recommended Next Action**: Clear recommendation: accept offer (`APPROVE_READY`), propose structured counter-offer (`COUNTER_OFFER_RECOMMENDED`), or escalate for Human-in-the-Loop Host confirmation (`HIGH_RISK_ESCALATION`).

Structured collab lines in `sections`:
- `brandOverview` — concise summary of the sponsoring brand
- `deliverables` — requested deliverables summary
- `commercialsInr` — financial compensation and exclusivity in INR
- `recommendedAction` — next operational step for the talent team

## When to write nothing

If the only thing you can say is the job title already on the record, write
nothing. An empty panel costs a rep nothing; a paragraph that restates a field
they can already see costs them the time it takes to find that out.

The tool enforces a floor on length for the same reason: at forty characters
there is no room to say nothing at length.
