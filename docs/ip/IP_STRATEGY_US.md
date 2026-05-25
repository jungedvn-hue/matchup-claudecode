# MatchUp — IP Strategy for US Registration

**Last updated**: 2026-05-24
**Status**: Strategy planning document
**Disclaimer**: This is an internal planning document. Final IP filings should be reviewed by a qualified US IP attorney. Not legal advice.

---

## Context & Goals

**Company**: MatchUp (matchupvn) — pickleball / racquet sports community + tournament + venue platform
**Primary jurisdiction**: Vietnam (current ops)
**Expansion target**: United States (timeline not yet defined)

### Goals (all priorities)
1. **Defensive** — block competitors from cloning core features
2. **Investor pitch** — IP portfolio increases valuation
3. **Licensing revenue** — future potential
4. **Brand protection** — global expansion (US + SEA)

### Funding status
Pre-launch US, budget available (~$15-20k IP allocation reasonable for 12-month roadmap).

---

## Five Protection Layers

### 1. Trademark™ — **Highest ROI, Priority #1**

**Protects**: name, logo, slogan, brand identity.

#### Specific marks for MatchUp

| Mark | Risk | Strategy |
|---|---|---|
| Wordmark "MatchUp" alone | ⚠️ HIGH — Match Group LLC owns "MATCH" family; "match" is generic in sports context | Avoid; require TESS search first |
| Combo mark (chữ "MatchUp" + logo distinctive) | ✅ Medium — much stronger | **Primary filing** |
| Slogan "Where Passion Belongs" | ✅ Distinctive | Secondary filing |
| Backup names | — | Register 1-2 alternates as defense |

#### Recommended Classes (Nice Classification)

- **Class 41** — Sports services, tournament organization, entertainment
- **Class 42** — SaaS, software-as-a-service
- **Class 9** — Downloadable mobile app
- **Class 35** — (Optional) Marketplace, advertising

#### Filing routes

**Option A — Direct US (USPTO TEAS Plus)**
- File Section 1(b) Intent-to-Use (since no current US sales)
- Gov fee: $250/class × 3 = $750
- Attorney: $1,500-2,500
- 36-month grace period to show "use in commerce" (6 extensions × 6 months)
- When converting to Statement of Use: +$100/class

**Option B — Madrid Protocol (recommended if multi-country)**
- File Vietnam first (Cục SHTT), then extend internationally
- Cost: $2,000-3,000 for US + EU + Singapore + AU
- Higher ROI for global expansion
- Single application, multiple territories

**Cost estimate**: $2,500-3,500 total

---

### 2. Patent — **Hard for SaaS, low ROI for V1**

#### Context — Post-*Alice* (2014) reality

Pure software/business methods generally not patentable in US. Must show "specific technical improvement to computer functionality." For SaaS startups, utility patents are usually not worth $10-30k each pre-Series B.

#### IP-able candidates audit (current MatchUp codebase)

| Asset | Patent type | Strength | Recommend |
|---|---|---|---|
| Multi-role unified loyalty system (Player/Host/Court Owner/Referee/Store cùng 1 point system, commission snapshot via DB trigger) | Utility / Method | Medium — business method risk | **PPA #1** |
| Referee verification + rating + invite + earnings closed loop | Utility / Method | Medium-low | Combine with #1 |
| Health Hub × racquet sports performance fusion (wearable data + ELO + injury prevention) | Utility | Medium-high (if specific algorithm) | **PPA #2** (after building feature) |
| Geo-fenced court demand + dynamic pricing AI (PRD Phase 5) | Utility | High *if implemented* | Defer until built |
| Tournament bracket auto-generation | — | ❌ Prior art (Challonge, etc) | Skip |
| ELO simulation | — | ❌ Algorithm from 1960s | Skip |
| QR check-in | — | ❌ Generic | Skip |
| Health Hub UI layout (tab grid + stat tile) | Design | High | **Design patent #1** |
| Referee Hub 4-tab card layout | Design | Medium | Design patent #2 |
| Discover bento 2×2 grid pattern | Design | Medium | Design patent #3 |
| Court Owner venue card + activity strip layout | Design | Medium-low | Skip |

#### Two practical paths

**A. Provisional Patent Application (PPA)**
- Cost: $300 self-file, $2-5k with attorney
- Lock priority date for 12 months
- "Patent pending" badge for marketing/investor pitch
- Convert to utility patent within 12 months OR abandon
- **Recommended**: 1-2 PPAs for genuinely novel features

**B. Design Patent**
- Cost: $1.5-3k each
- Protects "ornamental appearance" of UI/UX
- 15 years protection, no maintenance fees
- Easier to grant than utility
- **Recommended**: 2-3 design patents for unique UI

**Utility Patent**: $10-30k each, 3-5 years process, low grant rate for SaaS → **NOT recommended for V1**.

**Total Phase 2 patent budget**: ~$10-15k

---

### 3. Copyright © — **Cheap, do it**

Copyright is automatic upon creation, but **registration with US Copyright Office** enables:
- Statutory damages ($150k/work if willful)
- Recoverable attorney fees
- Presumption of validity

#### What to register

| Asset | Type | Cost |
|---|---|---|
| Source code v1.0.0 snapshot | Computer program | $65 |
| UI/UX design collection (screenshots) | Visual works | $65 |
| Marketing materials + slogan | Literary work | $65 |
| Database schema (if creative) | Compilation | $65 |

**Total**: $200-300 self-file via [eCO](https://www.copyright.gov/registration/)
**Timeline**: 6-12 months

---

### 4. Trade Secret — **Free, requires discipline**

No registration needed. Requirements:
- Has economic value because secret
- "Reasonable measures" to maintain secrecy

#### What qualifies for MatchUp

- Recommendation algorithms (ELO + skill matching)
- Customer data, vendor relationships, pricing models
- Commission strategy & growth metrics
- Internal financial metrics
- Roadmap & feature plans

#### Required practices

- [ ] NDA for all employees, contractors, beta testers, vendors
- [ ] Access control (Supabase RLS ✅ already in place)
- [ ] Document confidentiality policy
- [ ] Mark internal docs "CONFIDENTIAL"
- [ ] Exit interview reminder for departing employees
- [ ] Federal protection via Defend Trade Secrets Act (DTSA) 2016

---

### 5. Domain + Defensive Registrations — **Tactical**

| Asset | Status | Annual cost |
|---|---|---|
| matchup.asia | ✅ Owned | — |
| matchupvn.com | TODO | $15 |
| matchup.app | TODO | $20 |
| matchupasia.com | TODO | $15 |
| matchup-app.com | TODO | $15 |
| getmatchup.com | TODO | $15 |
| Social handles (IG/TikTok/X/YouTube/FB) | TODO | $0 |
| App Store / Play Store name reservation | TODO | $0 |

**Total**: ~$100-200/year

---

## Roadmap — 12 months

### 🔵 Phase 0 — Foundation (Week 1-2)
**Must-do before ANY US public disclosure**

- [ ] IP inventory audit (see `IP_INVENTORY.md`)
- [ ] NDA template (EN + VI) for contractors/agency/beta testers
- [ ] Confidentiality policy — mark sensitive docs "CONFIDENTIAL"
- [ ] Access control audit (Supabase RLS, GitHub private, env keys)
- [ ] TESS search "MatchUp" — list conflicts before wordmark decision
- [ ] Defensive domain purchases
- [ ] Social handle registrations

**Budget**: ~$650 | **Time**: 3 days

---

### 🟢 Phase 1 — Quick wins (Month 1-2)

#### A. Vietnam Trademark (file FIRST)
- File via Cục SHTT VN: combo mark in class 41 + 42 + 9
- Cost: $300-500
- Process: 12-18 months
- **Purpose**: anchor for Madrid Protocol extension

#### B. US Trademark — Intent-to-Use (ITU)
- TEAS Plus filing (Section 1(b)) — no need for current US sales
- Gov fee: $750 (3 classes)
- Attorney: $1,500-2,500
- 36-month grace to show use in commerce
- **Alternative**: Madrid Protocol for VN + US + EU + SEA = $2,000-3,000

#### C. Copyright Registrations (self-file)
- Source code, UI designs, marketing materials, database schema
- Total: $200-400

**Budget**: $3,000-4,500

---

### 🟡 Phase 2 — Selective patents (Month 3-6)

- [ ] **PPA #1** — Multi-role unified loyalty system
- [ ] **PPA #2** — Health Hub × racquet sports fusion (after building feature)
- [ ] **Design Patent #1** — Health Hub UI layout
- [ ] **Design Patent #2** — Referee Hub 4-tab card layout
- [ ] **Design Patent #3** — Discover bento 2×2 grid

**Budget**: $10-15k

#### Strategic notes
- **No obligation to convert PPA** after 12 months. Abandon if PMF unclear.
- **Foreign filing license**: VN-originated inventions may require local filing first. Consult attorney on PCT-VN vs PPA-US ordering.
- **Public disclosure clock**: 1-year grace period in US starts upon public disclosure. Europe has NO grace period — must file before launch.

---

### 🟠 Phase 3 — Pre-US launch hardening (Month 6-12)

| Trigger | Action | Cost |
|---|---|---|
| MVP US-ready | Convert PPA → Utility patent (or abandon) | $10-20k each |
| TM grant | File "Statement of Use" | $100/class |
| Competitor copy detected | Cease & desist letter | $500-2k |
| Series A pitch | Update IP portfolio summary | — |
| Launch EU | Madrid extension or EUIPO direct | $1-2k |

---

## Budget Summary

| Phase | Budget | Cumulative |
|---|---|---|
| 0 — Foundation | $650 | $650 |
| 1 — TM + Copyright | $3,000-4,500 | $3,650-5,150 |
| 2 — PPA + Design patents | $10-15k | $13,650-20,150 |
| 3 — Convert + maintenance | $10-20k (only if needed) | $23,650-40,150 |
| **Realistic 12-month** | | **$15-20k** |

→ Aligns with 5% Series A rule for ~$400k seed/Series A pre-money.

---

## Traps & Critical Reminders

### ❌ Don't
1. File expensive utility patent before PMF is clear → use PPA
2. Public demo before filing PPA on novel features
3. Register US TM before VN TM → loses priority date
4. Use bare wordmark "MatchUp" → high conflict risk with Match Group
5. Skip foreign filing license check for VN inventors

### ✅ Do
1. Document every invention date (Git history = evidence)
2. Track inventorship integrity (who did what — US is first-inventor-to-file)
3. Have 1-2 backup brand names registered
4. Update IP portfolio summary quarterly for investor materials
5. Foreign Filing License consultation if any inventor is in VN at time of invention

---

## Key Strategic Considerations for VN Startup

1. **First-to-file** (US since 2013) → don't disclose ideas before filing PPA
2. **Public disclosure** (demo, blog, app store launch) starts **1-year grace period** in US. Must file within 1 year or lose rights.
3. **Foreign filing license**: VN inventors may need local filing first. Some jurisdictions require this.
4. **PCT route**: Patent Cooperation Treaty filing via VIPRI preserves 30-month priority worldwide. Expensive but reduces multi-country risk.
5. **Madrid Protocol**: leverages single application for multiple TM territories — much cheaper than direct national filings.

---

## Action Items

### This week
- [ ] Confirm budget allocation ($15-20k for 12 months)
- [ ] Build `IP_INVENTORY.md` — detailed asset list with protection recommendation per item
- [ ] Search & shortlist 2-3 US IP attorneys specializing in SaaS startups
- [ ] Check VN trademark status (Cục SHTT) — file if not yet

### Next 30 days
- [ ] Complete Phase 0 (foundation items)
- [ ] First IP attorney consultation (1-2h, $500)
- [ ] File Vietnam TM
- [ ] File US TM Intent-to-Use OR Madrid Protocol

### Next 90 days
- [ ] Complete Phase 1
- [ ] Identify which features warrant PPA filings
- [ ] Begin Phase 2 PPA + design patent drafting

---

## References

- USPTO TESS search: https://tmsearch.uspto.gov/
- US Copyright eCO: https://www.copyright.gov/registration/
- Madrid Protocol: https://www.wipo.int/madrid/en/
- Cục SHTT Vietnam: https://www.ipvietnam.gov.vn/
- USPTO Patent Center: https://patentcenter.uspto.gov/
- Defend Trade Secrets Act (DTSA): 18 U.S.C. § 1836

## Recommended IP Attorney Firms (US SaaS startup focus)

- Cooley LLP
- Wilson Sonsini Goodrich & Rosati
- Gunderson Dettmer
- Fenwick & West
- Latham & Watkins (large firm, premium)

(Get warm intro through VC/accelerator network when possible)
