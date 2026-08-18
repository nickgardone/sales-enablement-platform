import { prisma } from "../lib/prisma";
import { Prisma } from "../lib/generated/prisma/client";
import type { ModuleId } from "../lib/platform/module-ids";
import { createRng } from "./seed/rng";
import {
  REGIONS,
  OEM_BRANDS,
  DEALER_GROUP_SURNAMES,
  DEALER_SUFFIXES,
  CITIES,
  FIRST_NAMES,
  LAST_NAMES,
  CONTENT_ASSET_TOPICS,
} from "./seed/reference-data";

const rng = createRng();

const CONTACT_PERSONAS = [
  "DEALER_PRINCIPAL",
  "GENERAL_MANAGER",
  "SALES_DESK_MANAGER",
  "FI_MANAGER",
  "BDC_MANAGER",
  "INTERNET_MANAGER",
] as const;

type SignalRow = {
  type: string;
  payload: Prisma.InputJsonValue;
  sourceModule: string;
  entityType?: string;
  entityId?: string;
  emittedAt: Date;
};

type AuditRow = {
  actorId: string;
  actorRole: "SALES_ASSOCIATE" | "SALES_LEADER" | "ADMIN";
  action: string;
  entityType: string;
  entityId: string;
  before?: Prisma.InputJsonValue;
  after?: Prisma.InputJsonValue;
  timestamp: Date;
  complianceRelevant: boolean;
};

const signals: SignalRow[] = [];
const auditEvents: AuditRow[] = [];

function emitSignal(row: SignalRow) {
  signals.push(row);
}

function emitAudit(row: AuditRow) {
  auditEvents.push(row);
}

function fullName() {
  return `${rng.pick(FIRST_NAMES)} ${rng.pick(LAST_NAMES)}`;
}

function dealerGroupName(usedNames: Set<string>) {
  // Only 20 surnames x 5 suffixes = 100 base combinations, but we need 152+ unique
  // names, so fall back to a numbered variant once the base pool is exhausted
  // (otherwise this loops forever retrying names that are always already taken).
  const base = `${rng.pick(DEALER_GROUP_SURNAMES)} ${rng.pick(DEALER_SUFFIXES)}`;
  if (!usedNames.has(base)) {
    usedNames.add(base);
    return base;
  }
  let suffix = 2;
  let name = `${base} ${suffix}`;
  while (usedNames.has(name)) {
    suffix++;
    name = `${base} ${suffix}`;
  }
  usedNames.add(name);
  return name;
}

function rooftopName(groupName: string, city: string, brand: string | null) {
  return brand ? `${city} ${brand}` : `${groupName} of ${city}`;
}

async function clearDatabase() {
  // Delete in FK-safe order (children before parents) so `db:seed` is idempotent standalone.
  await prisma.metricSnapshot.deleteMany();
  await prisma.signal.deleteMany();
  await prisma.auditEvent.deleteMany();
  await prisma.crossSellSignal.deleteMany();
  await prisma.tierEvaluation.deleteMany();
  await prisma.stip.deleteMany();
  await prisma.fundedDeal.deleteMany();
  await prisma.application.deleteMany();
  await prisma.opportunity.deleteMany();
  await prisma.pitch.deleteMany();
  await prisma.pitchGoal.deleteMany();
  await prisma.interaction.deleteMany();
  await prisma.lead.deleteMany();
  await prisma.escalation.deleteMany();
  await prisma.onboardingCase.deleteMany();
  await prisma.exceptionRequest.deleteMany();
  await prisma.approvalStep.deleteMany();
  await prisma.approvalRequest.deleteMany();
  await prisma.approvalPolicy.deleteMany();
  await prisma.routingRule.deleteMany();
  await prisma.rateSheet.deleteMany();
  await prisma.pricingProgram.deleteMany();
  await prisma.playbook.deleteMany();
  await prisma.certification.deleteMany();
  await prisma.contentAsset.deleteMany();
  await prisma.contact.deleteMany();
  await prisma.rooftop.deleteMany();
  await prisma.dealerGroup.deleteMany();
  await prisma.loyaltyTier.deleteMany();
  await prisma.dealStage.deleteMany();
  await prisma.entitlement.deleteMany();
  await prisma.moduleManifest.deleteMany();
  await prisma.associate.deleteMany();
  await prisma.team.deleteMany();
  await prisma.territory.deleteMany();
  await prisma.user.deleteMany();
}

async function main() {
  console.log("Clearing database...");
  await clearDatabase();

  // ---------------------------------------------------------------
  // Reference lookups: DealStage, LoyaltyTier
  // ---------------------------------------------------------------
  console.log("Seeding reference lookups...");
  const dealStageDefs = [
    { name: "Prospecting", sortOrder: 1, defaultProbability: 10, isClosed: false, isWon: false },
    { name: "Qualified", sortOrder: 2, defaultProbability: 25, isClosed: false, isWon: false },
    { name: "Proposal", sortOrder: 3, defaultProbability: 45, isClosed: false, isWon: false },
    { name: "Contract Sent", sortOrder: 4, defaultProbability: 70, isClosed: false, isWon: false },
    { name: "Funded", sortOrder: 5, defaultProbability: 100, isClosed: true, isWon: true },
    { name: "Lost", sortOrder: 6, defaultProbability: 0, isClosed: true, isWon: false },
  ];
  const dealStages = await Promise.all(
    dealStageDefs.map((d) => prisma.dealStage.create({ data: d }))
  );
  const openStages = dealStages.filter((s) => !s.isClosed);
  const fundedStage = dealStages.find((s) => s.isWon)!;
  const lostStage = dealStages.find((s) => s.name === "Lost")!;
  const contractSentStage = dealStages.find((s) => s.name === "Contract Sent")!;

  const loyaltyTierDefs = [
    { name: "Bronze", level: 1, minThreshold: { minFundedVolume: 0, minApplications: 0 }, description: "Entry tier — new or low-volume relationship." },
    { name: "Silver", level: 2, minThreshold: { minFundedVolume: 250000, minApplications: 15 }, description: "Established relationship with consistent volume." },
    { name: "Gold", level: 3, minThreshold: { minFundedVolume: 750000, minApplications: 40 }, description: "High-volume, high-loyalty relationship." },
    { name: "Platinum", level: 4, minThreshold: { minFundedVolume: 1500000, minApplications: 80 }, description: "Top-tier strategic partner." },
  ];
  const loyaltyTiers = await Promise.all(
    loyaltyTierDefs.map((t) => prisma.loyaltyTier.create({ data: t }))
  );

  // ---------------------------------------------------------------
  // People: Territory, Team, Users, Associates
  // ---------------------------------------------------------------
  console.log("Seeding people...");
  const territory = await prisma.territory.create({
    data: { name: "Territory 1 — Great Lakes / Northeast", region: "Midwest" },
  });

  const leaderUser = await prisma.user.create({
    data: { name: "Patricia Nguyen", email: "patricia.nguyen@demo-lender.com", role: "SALES_LEADER" },
  });

  const adminUser = await prisma.user.create({
    data: { name: "Sam Okafor", email: "sam.okafor@demo-lender.com", role: "ADMIN" },
  });

  const team = await prisma.team.create({
    data: { name: "Team Nguyen", leaderId: leaderUser.id, territoryId: territory.id },
  });

  const associateNames = [
    "Jordan Ellis",
    "Priya Raman",
    "Marcus Webb",
    "Angela Torres",
    "Derek Shaw",
    "Monica Feldman",
  ];
  const associateUsers = await Promise.all(
    associateNames.map((name) =>
      prisma.user.create({
        data: {
          name,
          email: `${name.toLowerCase().replace(" ", ".")}@demo-lender.com`,
          role: "SALES_ASSOCIATE",
        },
      })
    )
  );
  const associates = await Promise.all(
    associateUsers.map((u) =>
      prisma.associate.create({
        data: { userId: u.id, teamId: team.id, hireDate: rng.daysAgo(1200, 200) },
      })
    )
  );
  const demoAssociate = associates[0];

  // ---------------------------------------------------------------
  // Accounts: DealerGroups, Rooftops, Contacts
  // ---------------------------------------------------------------
  console.log("Seeding dealer groups, rooftops, and contacts...");
  const usedGroupNames = new Set<string>();

  type RooftopRecord = Awaited<ReturnType<typeof prisma.rooftop.create>>;
  const allRooftops: RooftopRecord[] = [];

  // Multi-rooftop groups (at least 2 with 8+ rooftops)
  const multiGroupSizes = [10, 8, 6, 5, 4];
  for (const size of multiGroupSizes) {
    const groupName = dealerGroupName(usedGroupNames);
    const group = await prisma.dealerGroup.create({
      data: { name: groupName, region: rng.pick(REGIONS) },
    });
    // Group-level dealer principal — oversees the whole group, not one rooftop.
    await prisma.contact.create({
      data: {
        dealerGroupId: group.id,
        rooftopId: null,
        personaType: "DEALER_PRINCIPAL",
        firstName: fullName().split(" ")[0],
        lastName: fullName().split(" ")[1],
        email: `principal@${groupName.toLowerCase().replace(/\s+/g, "")}.demo`,
        phone: `555-01${rng.int(10, 99)}`,
      },
    });
    for (let i = 0; i < size; i++) {
      const brand = rng.pick(OEM_BRANDS);
      const city = rng.pick(CITIES);
      const rooftop = await prisma.rooftop.create({
        data: {
          dealerGroupId: group.id,
          name: rooftopName(groupName, city, brand),
          franchiseType: "FRANCHISE",
          oemBrand: brand,
          region: group.region,
          territoryId: territory.id,
        },
      });
      allRooftops.push(rooftop);
    }
  }

  // Single-point groups (147 rooftops, mix of franchise and independent)
  const singleCount = 147;
  for (let i = 0; i < singleCount; i++) {
    const groupName = dealerGroupName(usedGroupNames);
    const group = await prisma.dealerGroup.create({
      data: { name: groupName, region: rng.pick(REGIONS) },
    });
    const isFranchise = rng.bool(0.6);
    const brand = isFranchise ? rng.pick(OEM_BRANDS) : null;
    const city = rng.pick(CITIES);
    const rooftop = await prisma.rooftop.create({
      data: {
        dealerGroupId: group.id,
        name: rooftopName(groupName, city, brand),
        franchiseType: isFranchise ? "FRANCHISE" : "INDEPENDENT",
        oemBrand: brand,
        region: group.region,
        territoryId: territory.id,
      },
    });
    allRooftops.push(rooftop);
  }

  console.log(`Created ${allRooftops.length} rooftops.`);

  // Assign books: demo associate gets 30, remaining 150 split across the other 5.
  const shuffled = rng.pickMany(allRooftops, allRooftops.length);
  const demoBook = shuffled.slice(0, 30);
  const remaining = shuffled.slice(30);
  const otherAssociates = associates.slice(1);
  for (const rooftop of demoBook) {
    await prisma.rooftop.update({
      where: { id: rooftop.id },
      data: { assignedAssociateId: demoAssociate.id },
    });
  }
  await Promise.all(
    remaining.map((rooftop, i) =>
      prisma.rooftop.update({
        where: { id: rooftop.id },
        data: { assignedAssociateId: otherAssociates[i % otherAssociates.length].id },
      })
    )
  );

  // Contacts per rooftop (3-5, persona mix)
  for (const rooftop of allRooftops) {
    const group = await prisma.dealerGroup.findUniqueOrThrow({ where: { id: rooftop.dealerGroupId } });
    const groupContactCount = await prisma.contact.count({ where: { dealerGroupId: group.id, rooftopId: null } });
    const availablePersonas = groupContactCount > 0
      ? CONTACT_PERSONAS.filter((p) => p !== "DEALER_PRINCIPAL")
      : CONTACT_PERSONAS;
    const count = rng.int(3, 5);
    const personas = rng.pickMany(availablePersonas, Math.min(count, availablePersonas.length));
    for (const persona of personas) {
      const first = rng.pick(FIRST_NAMES);
      const last = rng.pick(LAST_NAMES);
      await prisma.contact.create({
        data: {
          dealerGroupId: rooftop.dealerGroupId,
          rooftopId: rooftop.id,
          personaType: persona,
          firstName: first,
          lastName: last,
          email: `${first.toLowerCase()}.${last.toLowerCase()}@dealer.demo`,
          phone: `555-0${rng.int(100, 999)}`,
        },
      });
    }
  }

  const allContacts = await prisma.contact.findMany();
  console.log(`Created ${allContacts.length} contacts.`);

  // ---------------------------------------------------------------
  // Commercial: PricingPrograms, RateSheets
  // ---------------------------------------------------------------
  console.log("Seeding pricing programs...");
  const standardProgram = await prisma.pricingProgram.create({
    data: { name: "Standard Indirect Financing", productType: "FINANCING", description: "Baseline dealer-facing rate program.", active: true },
  });
  const premierProgram = await prisma.pricingProgram.create({
    data: { name: "Premier Tier Financing", productType: "FINANCING", description: "Preferred pricing for Gold/Platinum tier dealers.", active: true },
  });
  const softwareProgram = await prisma.pricingProgram.create({
    data: { name: "Dealer CRM Suite", productType: "SOFTWARE", description: "Deal-structuring and CRM software subscription tiers.", active: true },
  });

  const standardRateSheet = await prisma.rateSheet.create({
    data: {
      pricingProgramId: standardProgram.id,
      effectiveFrom: rng.daysAgo(180, 120),
      rateData: { tiers: [{ term: 36, apr: 6.9 }, { term: 48, apr: 7.4 }, { term: 60, apr: 7.9 }, { term: 72, apr: 8.4 }] },
    },
  });
  const premierRateSheet = await prisma.rateSheet.create({
    data: {
      pricingProgramId: premierProgram.id,
      effectiveFrom: rng.daysAgo(180, 120),
      rateData: { tiers: [{ term: 36, apr: 5.9 }, { term: 48, apr: 6.4 }, { term: 60, apr: 6.9 }, { term: 72, apr: 7.4 }] },
    },
  });
  await prisma.rateSheet.create({
    data: {
      pricingProgramId: softwareProgram.id,
      effectiveFrom: rng.daysAgo(180, 120),
      rateData: { tiers: [{ plan: "Core", monthlyFee: 299 }, { plan: "Pro", monthlyFee: 599 }, { plan: "Enterprise", monthlyFee: 1299 }] },
    },
  });

  // ---------------------------------------------------------------
  // Shared services: ApprovalPolicy
  // ---------------------------------------------------------------
  console.log("Seeding approval policies...");
  const exceptionPolicyLow = await prisma.approvalPolicy.create({
    data: {
      name: "Exception — Under $2,500 (Leader approval)",
      triggerType: "EXCEPTION_REQUEST",
      thresholdConditions: { maxAmount: 2500 },
      approverRoleChain: ["SALES_LEADER"],
      slaHours: 24,
      active: true,
    },
  });
  const exceptionPolicyMid = await prisma.approvalPolicy.create({
    data: {
      name: "Exception — $2,500 to $10,000 (Leader then Admin)",
      triggerType: "EXCEPTION_REQUEST",
      thresholdConditions: { minAmount: 2500, maxAmount: 10000 },
      approverRoleChain: ["SALES_LEADER", "ADMIN"],
      slaHours: 48,
      active: true,
    },
  });
  const exceptionPolicyHigh = await prisma.approvalPolicy.create({
    data: {
      name: "Exception — Over $10,000 (Admin approval)",
      triggerType: "EXCEPTION_REQUEST",
      thresholdConditions: { minAmount: 10000 },
      approverRoleChain: ["ADMIN"],
      slaHours: 72,
      active: true,
    },
  });
  const onboardingPolicy = await prisma.approvalPolicy.create({
    data: {
      name: "New Dealer Onboarding — Leader sign-off",
      triggerType: "ONBOARDING_CASE",
      thresholdConditions: {},
      approverRoleChain: ["SALES_LEADER"],
      slaHours: 72,
      active: true,
    },
  });
  const escalationPolicy = await prisma.approvalPolicy.create({
    data: {
      name: "Escalation — Leader triage",
      triggerType: "ESCALATION",
      thresholdConditions: {},
      approverRoleChain: ["SALES_LEADER"],
      slaHours: 24,
      active: true,
    },
  });
  const tierChangePolicy = await prisma.approvalPolicy.create({
    data: {
      name: "Tier Change — Leader review",
      triggerType: "TIER_CHANGE",
      thresholdConditions: {},
      approverRoleChain: ["SALES_LEADER"],
      slaHours: 48,
      active: true,
    },
  });

  function exceptionPolicyFor(amount: number) {
    if (amount >= 10000) return exceptionPolicyHigh;
    if (amount >= 2500) return exceptionPolicyMid;
    return exceptionPolicyLow;
  }

  console.log(
    `Seeded ${[exceptionPolicyLow, exceptionPolicyMid, exceptionPolicyHigh, onboardingPolicy, escalationPolicy, tierChangePolicy].length} approval policies: ` +
      [exceptionPolicyLow, exceptionPolicyMid, exceptionPolicyHigh, onboardingPolicy, escalationPolicy, tierChangePolicy]
        .map((p) => p.name)
        .join("; ")
  );

  // ---------------------------------------------------------------
  // Shared services: RoutingRule
  // ---------------------------------------------------------------
  console.log("Seeding routing rules...");
  const routingRules = await Promise.all([
    prisma.routingRule.create({
      data: {
        name: "Demo associate territory coverage",
        priority: 1,
        criteria: { territoryId: territory.id, coverage: "PRIMARY" },
        targetAssociateId: demoAssociate.id,
        active: true,
      },
    }),
    ...otherAssociates.map((a, i) =>
      prisma.routingRule.create({
        data: {
          name: `Territory coverage — ${associateNames[i + 1]}`,
          priority: i + 2,
          criteria: { territoryId: territory.id, coverage: "SECONDARY" },
          targetAssociateId: a.id,
          active: true,
        },
      })
    ),
  ]);

  // ---------------------------------------------------------------
  // Activity: Interactions, Pitches, PitchGoals
  // ---------------------------------------------------------------
  console.log("Seeding 90 days of activity...");

  function associateForRooftop(rooftop: RooftopRecord) {
    return associates.find((a) => a.id === rooftop.assignedAssociateId) ?? demoAssociate;
  }

  const rooftopsWithAssociate = await prisma.rooftop.findMany();

  // Pitch goals: 3 months x 6 associates + 3 months team goal
  const pitchGoalByAssociateMonth = new Map<string, string>();
  for (let m = 0; m < 3; m++) {
    const period = new Date();
    period.setDate(1);
    period.setMonth(period.getMonth() - m);
    period.setHours(0, 0, 0, 0);
    for (const associate of associates) {
      const goal = await prisma.pitchGoal.create({
        data: {
          ownerType: "ASSOCIATE",
          associateId: associate.id,
          period,
          targetCount: 20,
          productFocus: rng.bool() ? "FINANCING" : "SOFTWARE",
        },
      });
      pitchGoalByAssociateMonth.set(`${associate.id}:${m}`, goal.id);
    }
    await prisma.pitchGoal.create({
      data: { ownerType: "TEAM", teamId: team.id, period, targetCount: 120 },
    });
  }

  let interactionCount = 0;
  let pitchCount = 0;

  for (const rooftop of rooftopsWithAssociate) {
    const associate = associateForRooftop(rooftop as unknown as RooftopRecord);
    const rooftopContacts = allContacts.filter((c) => c.rooftopId === rooftop.id);
    if (rooftopContacts.length === 0) continue;

    const numInteractions = rng.int(1, 4);
    for (let i = 0; i < numInteractions; i++) {
      const contact = rng.pick(rooftopContacts);
      const occurredAt = rng.daysAgo(90, 0);
      const interaction = await prisma.interaction.create({
        data: {
          rooftopId: rooftop.id,
          contactId: contact.id,
          associateId: associate.id,
          type: rng.pick(["VISIT", "CALL", "EMAIL", "VIRTUAL"] as const),
          notes: rng.bool(0.6) ? "Discussed volume trends and upcoming programs." : null,
          occurredAt,
        },
      });
      interactionCount++;
      emitAudit({
        actorId: associate.userId,
        actorRole: "SALES_ASSOCIATE",
        action: "interaction.logged",
        entityType: "Interaction",
        entityId: interaction.id,
        after: { type: interaction.type, rooftopId: rooftop.id },
        timestamp: occurredAt,
        complianceRelevant: false,
      });

      if (rng.bool(0.45)) {
        const monthsAgo = Math.min(2, Math.floor((Date.now() - occurredAt.getTime()) / (30 * 24 * 3600 * 1000)));
        const goalId = pitchGoalByAssociateMonth.get(`${associate.id}:${monthsAgo}`);
        const pitch = await prisma.pitch.create({
          data: {
            rooftopId: rooftop.id,
            contactId: contact.id,
            associateId: associate.id,
            pitchGoalId: goalId ?? null,
            productPitched: rng.bool() ? "FINANCING" : "SOFTWARE",
            outcome: rng.pick(["POSITIVE", "NEUTRAL", "DECLINED", "FOLLOW_UP_NEEDED"] as const),
            objection: rng.bool(0.3) ? "Rate competitiveness vs. regional credit union." : null,
            occurredAt,
          },
        });
        pitchCount++;
        emitSignal({
          type: "pitch.logged",
          payload: { pitchId: pitch.id, rooftopId: rooftop.id, associateId: associate.id, outcome: pitch.outcome },
          sourceModule: "pitching",
          entityType: "Pitch",
          entityId: pitch.id,
          emittedAt: occurredAt,
        });
        emitAudit({
          actorId: associate.userId,
          actorRole: "SALES_ASSOCIATE",
          action: "pitch.logged",
          entityType: "Pitch",
          entityId: pitch.id,
          after: { outcome: pitch.outcome, productPitched: pitch.productPitched },
          timestamp: occurredAt,
          complianceRelevant: false,
        });
      }
    }
  }
  console.log(`Created ${interactionCount} interactions, ${pitchCount} pitches.`);

  // ---------------------------------------------------------------
  // Leads
  // ---------------------------------------------------------------
  console.log("Seeding leads...");
  let leadCount = 0;
  let breachedCount = 0;
  const leadSourceRooftops = rng.pickMany(rooftopsWithAssociate, 120);
  for (const rooftop of leadSourceRooftops) {
    const associate = associateForRooftop(rooftop as unknown as RooftopRecord);
    const rule = routingRules.find((r) => r.targetAssociateId === associate.id) ?? routingRules[0];
    const receivedAt = rng.daysAgo(90, 0);
    const slaDueAt = new Date(receivedAt.getTime() + 48 * 3600 * 1000);
    const isBreached = slaDueAt < new Date() && rng.bool(0.15);
    const status = isBreached ? rng.pick(["NEW", "ROUTED"] as const) : rng.pick(["NEW", "ROUTED", "IN_PROGRESS", "CONVERTED", "LOST"] as const);
    const lead = await prisma.lead.create({
      data: {
        rooftopId: rooftop.id,
        source: rng.pick(["Web Form", "Call Center", "Dealer Referral", "Partner Network"]),
        status,
        consumerName: fullName(),
        productInterest: rng.bool(0.8) ? "FINANCING" : "SOFTWARE",
        routingRuleId: rule.id,
        routedAssociateId: associate.id,
        reasonCodes: { matchedCriteria: ["territory_match", "coverage_priority"], ruleName: rule.name },
        slaDueAt,
        slaBreachedAt: isBreached ? new Date(slaDueAt.getTime() + rng.int(1, 48) * 3600 * 1000) : null,
        receivedAt,
        workedAt: status === "CONVERTED" || status === "LOST" ? rng.daysAgo(60, 0) : null,
      },
    });
    leadCount++;
    if (isBreached) {
      breachedCount++;
      emitSignal({
        type: "lead.sla.breached",
        payload: { leadId: lead.id, rooftopId: rooftop.id, routedAssociateId: associate.id },
        sourceModule: "lead-routing",
        entityType: "Lead",
        entityId: lead.id,
        emittedAt: lead.slaBreachedAt!,
      });
    }
  }
  console.log(`Created ${leadCount} leads (${breachedCount} breached).`);

  // ---------------------------------------------------------------
  // Opportunities, Applications, Stips, FundedDeals
  // ---------------------------------------------------------------
  console.log("Seeding opportunities and deal pipeline...");
  const oppRooftops = rng.pickMany(rooftopsWithAssociate, 150);
  let fundedCount = 0;
  for (const rooftop of oppRooftops) {
    const associate = associateForRooftop(rooftop as unknown as RooftopRecord);
    const stage = rng.bool(0.25) ? lostStage : rng.bool(0.3) ? fundedStage : rng.pick(openStages);
    const opportunity = await prisma.opportunity.create({
      data: {
        rooftopId: rooftop.id,
        associateId: associate.id,
        productType: rng.bool(0.75) ? "FINANCING" : "SOFTWARE",
        dealStageId: stage.id,
        expectedValue: rng.float(8000, 65000, 0),
        closeDate: rng.daysFromNow(60, -30),
        createdAt: rng.daysAgo(90, 5),
      },
    });
    emitSignal({
      type: "opportunity.stage.changed",
      payload: { opportunityId: opportunity.id, rooftopId: rooftop.id, stage: stage.name },
      sourceModule: "closing-deals",
      entityType: "Opportunity",
      entityId: opportunity.id,
      emittedAt: opportunity.createdAt,
    });

    const stageOrder = dealStages.findIndex((s) => s.id === stage.id);
    const contractSentOrder = dealStages.findIndex((s) => s.id === contractSentStage.id);
    if (stageOrder >= contractSentOrder && stage.id !== lostStage.id) {
      const application = await prisma.application.create({
        data: {
          opportunityId: opportunity.id,
          rooftopId: rooftop.id,
          status: stage.id === fundedStage.id ? "FUNDED" : rng.pick(["SUBMITTED", "IN_UNDERWRITING", "CONDITIONALLY_APPROVED", "APPROVED"] as const),
          submittedAt: rng.daysAgo(45, 2),
        },
      });

      const stipCount = rng.int(0, 3);
      for (let i = 0; i < stipCount; i++) {
        const cleared = rng.bool(0.5);
        await prisma.stip.create({
          data: {
            applicationId: application.id,
            description: rng.pick([
              "Proof of income",
              "Insurance verification",
              "Signed retail installment contract",
              "Dealer invoice",
              "Trade title",
            ]),
            status: cleared ? "CLEARED" : "OUTSTANDING",
            ownerId: associate.userId,
            agingSince: rng.daysAgo(20, 1),
            clearedAt: cleared ? rng.daysAgo(5, 0) : null,
          },
        });
      }

      if (stage.id === fundedStage.id) {
        const fundedAt = rng.daysAgo(30, 0);
        await prisma.fundedDeal.create({
          data: {
            applicationId: application.id,
            fundedAmount: opportunity.expectedValue,
            fundedAt,
            fundingCycleTimeDays: rng.int(3, 21),
          },
        });
        fundedCount++;
      }
    }
  }
  console.log(`Created ${oppRooftops.length} opportunities (${fundedCount} funded).`);

  // ---------------------------------------------------------------
  // Exception Requests + Approvals (every approval state)
  // ---------------------------------------------------------------
  console.log("Seeding exception requests and approval routing...");
  const allFundedDeals = await prisma.fundedDeal.findMany();
  const exceptionRooftops = rng.pickMany(rooftopsWithAssociate, 40);
  let exceptionCount = 0;
  for (const rooftop of exceptionRooftops) {
    const associate = associateForRooftop(rooftop as unknown as RooftopRecord);
    const contact = allContacts.find((c) => c.rooftopId === rooftop.id);
    const amount = rng.float(500, 18000, 0);
    const policy = exceptionPolicyFor(amount);
    const requestType = rng.pick(["RATE_EXCEPTION", "PROGRAM_TIER_CHANGE", "TERM_EXTENSION", "FEE_WAIVER"] as const);
    const submittedAt = rng.daysAgo(60, 0);
    const roleChain = policy.approverRoleChain as string[];

    const approvalRequest = await prisma.approvalRequest.create({
      data: {
        policyId: policy.id,
        triggerType: "EXCEPTION_REQUEST",
        triggerEntityId: "pending",
        reasonCodes: { matchedPolicy: policy.name, amountBand: amount >= 10000 ? "high" : amount >= 2500 ? "mid" : "low" },
        status: "PENDING",
        requestedById: associate.userId,
        requestedAt: submittedAt,
      },
    });

    const overallOutcome = rng.pick(["PENDING", "APPROVED", "REJECTED"] as const);
    let decidedAt: Date | null = null;
    let decidedById: string | null = null;
    let decisionRationale: string | null = null;

    for (let i = 0; i < roleChain.length; i++) {
      const role = roleChain[i];
      const approver = role === "ADMIN" ? adminUser : leaderUser;
      const isLastStep = i === roleChain.length - 1;
      let stepStatus: "PENDING" | "APPROVED" | "REJECTED" | "DELEGATED" = "PENDING";
      if (overallOutcome === "PENDING") {
        stepStatus = i === 0 && rng.bool(0.3) ? "DELEGATED" : "PENDING";
      } else if (overallOutcome === "REJECTED" && isLastStep) {
        stepStatus = "REJECTED";
      } else {
        stepStatus = "APPROVED";
      }
      const stepDecidedAt = stepStatus === "PENDING" ? null : rng.daysAgo(30, 0);
      await prisma.approvalStep.create({
        data: {
          approvalRequestId: approvalRequest.id,
          stepOrder: i + 1,
          approverRole: role as "SALES_LEADER" | "ADMIN",
          status: stepStatus,
          decidedAt: stepDecidedAt,
          decidedById: stepStatus === "APPROVED" || stepStatus === "REJECTED" ? approver.id : null,
          delegatedToId: stepStatus === "DELEGATED" ? adminUser.id : null,
          rationale: stepStatus === "APPROVED" ? "Within program guidelines; dealer volume supports exception." : stepStatus === "REJECTED" ? "Exceeds current tier authority; refer to standard program." : null,
        },
      });
      if (isLastStep && stepStatus !== "PENDING" && stepStatus !== "DELEGATED") {
        decidedAt = stepDecidedAt;
        decidedById = approver.id;
        decisionRationale = stepStatus === "APPROVED" ? "Approved — supports retention of at-risk relationship." : "Rejected — outside policy tolerance.";
      }
    }

    if (overallOutcome !== "PENDING") {
      await prisma.approvalRequest.update({
        where: { id: approvalRequest.id },
        data: { status: overallOutcome, decidedAt, decidedById, decisionRationale },
      });
    }

    const convertedFundedDeal = overallOutcome === "APPROVED" && rng.bool(0.5) && allFundedDeals.length > 0
      ? rng.pick(allFundedDeals)
      : null;

    const onPremierProgram = rng.bool(0.3);
    const exceptionRequest = await prisma.exceptionRequest.create({
      data: {
        rooftopId: rooftop.id,
        contactId: contact?.id ?? null,
        associateId: associate.id,
        requestType,
        currentProgramId: onPremierProgram ? premierProgram.id : standardProgram.id,
        rateSheetId: onPremierProgram ? premierRateSheet.id : standardRateSheet.id,
        requestedTerms: { requestedApr: rng.float(4.9, 6.9), term: rng.pick([48, 60, 72]) },
        rationale: "Competitive rate match to retain volume against regional credit union offer.",
        dollarAmount: amount,
        approvalRequestId: approvalRequest.id,
        convertedFundedDealId: convertedFundedDeal?.id ?? null,
        createdAt: submittedAt,
        updatedAt: decidedAt ?? submittedAt,
      },
    });
    exceptionCount++;

    await prisma.approvalRequest.update({
      where: { id: approvalRequest.id },
      data: { triggerEntityId: exceptionRequest.id },
    });

    emitSignal({
      type: "exception.submitted",
      payload: { exceptionRequestId: exceptionRequest.id, rooftopId: rooftop.id, amount, requestType },
      sourceModule: "pricing-exceptions",
      entityType: "ExceptionRequest",
      entityId: exceptionRequest.id,
      emittedAt: submittedAt,
    });
    emitAudit({
      actorId: associate.userId,
      actorRole: "SALES_ASSOCIATE",
      action: "exception.submitted",
      entityType: "ExceptionRequest",
      entityId: exceptionRequest.id,
      after: { requestType, dollarAmount: amount, policy: policy.name },
      timestamp: submittedAt,
      complianceRelevant: true,
    });
    if (overallOutcome !== "PENDING" && decidedAt) {
      emitSignal({
        type: "exception.decided",
        payload: { exceptionRequestId: exceptionRequest.id, outcome: overallOutcome, rooftopId: rooftop.id },
        sourceModule: "pricing-exceptions",
        entityType: "ExceptionRequest",
        entityId: exceptionRequest.id,
        emittedAt: decidedAt,
      });
      emitAudit({
        actorId: decidedById ?? leaderUser.id,
        actorRole: decidedById === adminUser.id ? "ADMIN" : "SALES_LEADER",
        action: "exception.decided",
        entityType: "ExceptionRequest",
        entityId: exceptionRequest.id,
        before: { status: "PENDING" },
        after: { status: overallOutcome, rationale: decisionRationale },
        timestamp: decidedAt,
        complianceRelevant: true,
      });
    }
  }
  console.log(`Created ${exceptionCount} exception requests with routed approvals.`);

  // ---------------------------------------------------------------
  // Loyalty tiers + down-tier risk (>= 4 rooftops)
  // ---------------------------------------------------------------
  console.log("Seeding loyalty tier evaluations...");
  let downTierRiskCount = 0;
  const tierRiskTargetRooftops = new Set(rng.pickMany(rooftopsWithAssociate, 6).map((r) => r.id));
  for (const rooftop of rooftopsWithAssociate) {
    const evaluationsForRooftop = rng.int(1, 2);
    let lastTier = rng.pick(loyaltyTiers);
    for (let i = 0; i < evaluationsForRooftop; i++) {
      const isLatest = i === evaluationsForRooftop - 1;
      const forceDownTierRisk = isLatest && tierRiskTargetRooftops.has(rooftop.id) && downTierRiskCount < 5;
      const tier = forceDownTierRisk
        ? loyaltyTiers[Math.max(0, loyaltyTiers.findIndex((t) => t.id === lastTier.id) - 1)] ?? lastTier
        : lastTier;
      const evaluatedAt = rng.daysAgo(90 - i * 30, i * 30);
      const evaluation = await prisma.tierEvaluation.create({
        data: {
          rooftopId: rooftop.id,
          tierId: tier.id,
          evaluatedAt,
          reasonCodes: forceDownTierRisk
            ? ["FUNDED_VOLUME_BELOW_THRESHOLD", "APPLICATION_COUNT_TRENDING_DOWN"]
            : ["MEETS_VOLUME_THRESHOLD", "MEETS_APPLICATION_THRESHOLD"],
          thresholdDistance: forceDownTierRisk ? rng.float(-50000, -5000, 0) : rng.float(1000, 80000, 0),
          downTierRisk: forceDownTierRisk,
          estimatedDollarImpact: forceDownTierRisk ? rng.float(15000, 90000, 0) : null,
          dealerVisibleAt: forceDownTierRisk ? rng.daysFromNow(14, 3) : null,
          createdAt: evaluatedAt,
        },
      });
      if (forceDownTierRisk) {
        downTierRiskCount++;
        emitSignal({
          type: "tier.risk.detected",
          payload: {
            rooftopId: rooftop.id,
            tierEvaluationId: evaluation.id,
            estimatedDollarImpact: evaluation.estimatedDollarImpact,
            dealerVisibleAt: evaluation.dealerVisibleAt,
          },
          sourceModule: "loyalty-tier",
          entityType: "TierEvaluation",
          entityId: evaluation.id,
          emittedAt: evaluatedAt,
        });
      }
      lastTier = tier;
    }
  }
  console.log(`${downTierRiskCount} rooftops flagged in active down-tier risk.`);

  // ---------------------------------------------------------------
  // Cross-sell signals
  // ---------------------------------------------------------------
  console.log("Seeding cross-sell signals...");
  const crossSellRooftops = rng.pickMany(rooftopsWithAssociate, 15);
  for (const rooftop of crossSellRooftops) {
    const signal = await prisma.crossSellSignal.create({
      data: {
        rooftopId: rooftop.id,
        missingProduct: rng.bool(0.7) ? "SOFTWARE" : "FINANCING",
        confidence: rng.float(0.4, 0.95),
        status: rng.pick(["OPEN", "OPEN", "DISMISSED", "ACTIONED"] as const),
        identifiedAt: rng.daysAgo(45, 0),
      },
    });
    emitSignal({
      type: "crosssell.identified",
      payload: { crossSellSignalId: signal.id, rooftopId: rooftop.id, missingProduct: signal.missingProduct },
      sourceModule: "cross-sell",
      entityType: "CrossSellSignal",
      entityId: signal.id,
      emittedAt: signal.identifiedAt,
    });
  }

  // ---------------------------------------------------------------
  // Onboarding cases + Escalations
  // ---------------------------------------------------------------
  console.log("Seeding onboarding cases and escalations...");
  const onboardingRooftops = rng.pickMany(rooftopsWithAssociate, 3);
  for (let i = 0; i < onboardingRooftops.length; i++) {
    const rooftop = onboardingRooftops[i];
    const associate = associateForRooftop(rooftop as unknown as RooftopRecord);
    const status = i === 0 ? "BLOCKED" : rng.pick(["OPEN", "IN_PROGRESS", "COMPLETE"] as const);
    let approvalRequestId: string | null = null;
    if (status !== "OPEN") {
      const ar = await prisma.approvalRequest.create({
        data: {
          policyId: onboardingPolicy.id,
          triggerType: "ONBOARDING_CASE",
          triggerEntityId: "pending",
          reasonCodes: { matchedPolicy: onboardingPolicy.name },
          status: status === "COMPLETE" ? "APPROVED" : "PENDING",
          requestedById: associate.userId,
          requestedAt: rng.daysAgo(20, 5),
        },
      });
      approvalRequestId = ar.id;
    }
    const onboardingCase = await prisma.onboardingCase.create({
      data: {
        rooftopId: rooftop.id,
        associateId: associate.id,
        status,
        checklist: {
          items: [
            { label: "Dealer agreement signed", done: true },
            { label: "F&I manager trained", done: status !== "OPEN" },
            { label: "Software account provisioned", done: status === "COMPLETE" },
            { label: "First deal submitted", done: status === "COMPLETE" },
          ],
        },
        approvalRequestId,
      },
    });
    if (approvalRequestId) {
      await prisma.approvalRequest.update({ where: { id: approvalRequestId }, data: { triggerEntityId: onboardingCase.id } });
    }
    if (status === "BLOCKED") {
      emitSignal({
        type: "onboarding.blocked",
        payload: { onboardingCaseId: onboardingCase.id, rooftopId: rooftop.id },
        sourceModule: "onboarding",
        entityType: "OnboardingCase",
        entityId: onboardingCase.id,
        emittedAt: rng.daysAgo(5, 0),
      });
    }
  }

  const escalationRooftops = rng.pickMany(rooftopsWithAssociate, 3);
  for (const rooftop of escalationRooftops) {
    const status = rng.pick(["OPEN", "IN_PROGRESS", "RESOLVED"] as const);
    let escalationApprovalId: string | null = null;
    if (status !== "OPEN") {
      const ar = await prisma.approvalRequest.create({
        data: {
          policyId: escalationPolicy.id,
          triggerType: "ESCALATION",
          triggerEntityId: "pending",
          reasonCodes: { matchedPolicy: escalationPolicy.name },
          status: status === "RESOLVED" ? "APPROVED" : "PENDING",
          requestedById: leaderUser.id,
          requestedAt: rng.daysAgo(15, 3),
        },
      });
      escalationApprovalId = ar.id;
    }
    const escalation = await prisma.escalation.create({
      data: {
        rooftopId: rooftop.id,
        raisedById: leaderUser.id,
        category: rng.pick(["Funding delay", "Rate dispute", "Software access issue", "Contract discrepancy"]),
        description: "Escalated by leader after repeated dealer follow-up without resolution.",
        status,
        approvalRequestId: escalationApprovalId,
        resolutionNotes: status === "RESOLVED" ? "Resolved with ops team; root cause was a stale rate sheet reference." : null,
        resolvedAt: status === "RESOLVED" ? rng.daysAgo(10, 0) : null,
      },
    });
    if (escalationApprovalId) {
      await prisma.approvalRequest.update({ where: { id: escalationApprovalId }, data: { triggerEntityId: escalation.id } });
    }
  }

  // ---------------------------------------------------------------
  // MetricSnapshot history (mixing LIVE and LEGACY_BATCH freshness)
  // ---------------------------------------------------------------
  console.log("Seeding metric snapshot history...");
  const metricKeys = ["applications_submitted", "funded_volume", "funding_cycle_time_days", "look_to_book_rate"];
  const now = new Date();

  for (const rooftop of demoBook) {
    for (const metricKey of metricKeys) {
      for (let week = 12; week >= 0; week--) {
        const asOf = new Date(now);
        asOf.setDate(asOf.getDate() - week * 7);
        const isLatestWeek = week === 0;
        const isStaleMetric = metricKey === "funding_cycle_time_days" || metricKey === "look_to_book_rate";
        const source: "LIVE" | "LEGACY_BATCH" = isLatestWeek && isStaleMetric ? "LEGACY_BATCH" : "LIVE";
        const asOfAdjusted = source === "LEGACY_BATCH" ? new Date(asOf.getTime() - rng.int(4, 20) * 3600 * 1000) : asOf;
        const freshnessSeconds = Math.max(60, Math.round((now.getTime() - asOfAdjusted.getTime()) / 1000));
        const value = metricKey === "applications_submitted" ? rng.float(2, 18, 0)
          : metricKey === "funded_volume" ? rng.float(15000, 180000, 0)
          : metricKey === "funding_cycle_time_days" ? rng.float(3, 14, 1)
          : rng.float(35, 78, 1);
        await prisma.metricSnapshot.create({
          data: { metricKey, entityType: "ROOFTOP", entityId: rooftop.id, value, source, asOf: asOfAdjusted, freshnessSeconds },
        });
      }
    }
  }

  for (const associate of associates) {
    for (const metricKey of ["applications_submitted", "funded_volume"]) {
      for (let week = 12; week >= 0; week--) {
        const asOf = new Date(now);
        asOf.setDate(asOf.getDate() - week * 7);
        await prisma.metricSnapshot.create({
          data: {
            metricKey,
            entityType: "ASSOCIATE",
            entityId: associate.id,
            value: metricKey === "applications_submitted" ? rng.float(20, 90, 0) : rng.float(80000, 650000, 0),
            source: "LIVE",
            asOf,
            freshnessSeconds: Math.max(60, Math.round((now.getTime() - asOf.getTime()) / 1000)),
          },
        });
      }
    }
  }

  for (const metricKey of ["applications_submitted", "funded_volume", "look_to_book_rate"]) {
    for (let week = 12; week >= 0; week--) {
      const asOf = new Date(now);
      asOf.setDate(asOf.getDate() - week * 7);
      const isLatest = week === 0;
      const source: "LIVE" | "LEGACY_BATCH" = isLatest ? "LEGACY_BATCH" : "LIVE";
      const asOfAdjusted = source === "LEGACY_BATCH" ? new Date(asOf.getTime() - rng.int(4, 12) * 3600 * 1000) : asOf;
      await prisma.metricSnapshot.create({
        data: {
          metricKey,
          entityType: "TEAM",
          entityId: team.id,
          value: metricKey === "applications_submitted" ? rng.float(120, 400, 0) : metricKey === "funded_volume" ? rng.float(500000, 3000000, 0) : rng.float(40, 70, 1),
          source,
          asOf: asOfAdjusted,
          freshnessSeconds: Math.max(60, Math.round((now.getTime() - asOfAdjusted.getTime()) / 1000)),
        },
      });
    }
  }

  // ---------------------------------------------------------------
  // Content: ContentAsset, Playbook, Certification
  // ---------------------------------------------------------------
  console.log("Seeding content library...");
  const contentVariants = ["Overview", "Field Guide"];
  let contentCount = 0;
  for (const topic of CONTENT_ASSET_TOPICS) {
    for (const variant of contentVariants) {
      const isStale = contentCount % 5 === 0;
      await prisma.contentAsset.create({
        data: {
          title: `${topic} — ${variant}`,
          assetType: variant === "Overview" ? "ONE_PAGER" : "PLAYBOOK",
          personaTags: rng.pickMany(CONTACT_PERSONAS, rng.int(1, 3)),
          productTags: rng.bool() ? ["FINANCING"] : rng.bool() ? ["SOFTWARE"] : ["FINANCING", "SOFTWARE"],
          programTags: [rng.pick([standardProgram.name, premierProgram.name, softwareProgram.name])],
          body: `Reference content for "${topic}". Synthetic prototype content — not for actual field use.`,
          lastVerifiedAt: isStale ? rng.daysAgo(240, 120) : rng.daysAgo(30, 0),
        },
      });
      contentCount++;
    }
  }
  console.log(`Created ${contentCount} content assets.`);

  for (const persona of CONTACT_PERSONAS) {
    for (const product of ["FINANCING", "SOFTWARE"] as const) {
      await prisma.playbook.create({
        data: {
          title: `${persona.replace(/_/g, " ")} — ${product === "FINANCING" ? "Financing" : "Software"} Playbook`,
          contactPersona: persona,
          productType: product,
          steps: {
            steps: [
              "Open with account context from the last 90 days.",
              "Confirm current priorities for this persona.",
              "Present relevant proof points and content.",
              "Agree on next action and log the pitch.",
            ],
          },
        },
      });
    }
  }

  await Promise.all([
    prisma.certification.create({ data: { name: "Standard Financing Program Certification", programId: standardProgram.id, description: "Required to quote the standard indirect financing program." } }),
    prisma.certification.create({ data: { name: "Premier Tier Certification", programId: premierProgram.id, description: "Required to offer premier tier pricing." } }),
    prisma.certification.create({ data: { name: "Dealer CRM Suite Certification", programId: softwareProgram.id, description: "Required to demo and sell the software product." } }),
    prisma.certification.create({ data: { name: "Platform Fundamentals", programId: null, description: "General onboarding certification for all new associates." } }),
  ]);

  // ---------------------------------------------------------------
  // Platform: Entitlement + ModuleManifest (drives nav + scope filtering)
  // ---------------------------------------------------------------
  console.log("Seeding entitlements and module manifest...");
  // Per-role dataScope for each module's "view" capability — mirrors spec Section 5's
  // persona table: associates see their own book, leaders see their team's territory,
  // and admin only sees modules explicitly scoped GLOBAL (no individual deal detail).
  type Scope = "OWN" | "TEAM" | "GLOBAL" | "NONE";
  const MODULE_SCOPE_MATRIX: Record<ModuleId, { ASSOCIATE: Scope; LEADER: Scope; ADMIN: Scope }> = {
    "dealer-account-360": { ASSOCIATE: "OWN", LEADER: "TEAM", ADMIN: "NONE" },
    "pricing-exceptions": { ASSOCIATE: "OWN", LEADER: "TEAM", ADMIN: "NONE" },
    "pitching": { ASSOCIATE: "OWN", LEADER: "TEAM", ADMIN: "NONE" },
    "closing-deals": { ASSOCIATE: "OWN", LEADER: "TEAM", ADMIN: "NONE" },
    "lead-routing": { ASSOCIATE: "OWN", LEADER: "TEAM", ADMIN: "NONE" },
    "loyalty-tier": { ASSOCIATE: "OWN", LEADER: "TEAM", ADMIN: "NONE" },
    "cross-sell": { ASSOCIATE: "OWN", LEADER: "TEAM", ADMIN: "NONE" },
    "dealer-onboarding": { ASSOCIATE: "OWN", LEADER: "TEAM", ADMIN: "NONE" },
    "escalations-disputes": { ASSOCIATE: "OWN", LEADER: "TEAM", ADMIN: "NONE" },
    "forecasting-pipeline": { ASSOCIATE: "NONE", LEADER: "TEAM", ADMIN: "NONE" },
    "performance-insights": { ASSOCIATE: "OWN", LEADER: "TEAM", ADMIN: "GLOBAL" },
    "enablement-content": { ASSOCIATE: "GLOBAL", LEADER: "GLOBAL", ADMIN: "GLOBAL" },
    "admin-console": { ASSOCIATE: "NONE", LEADER: "NONE", ADMIN: "GLOBAL" },
  };

  for (const [moduleId, scopes] of Object.entries(MODULE_SCOPE_MATRIX)) {
    const moduleName = moduleId
      .split("-")
      .map((w) => w[0].toUpperCase() + w.slice(1))
      .join(" ");
    await prisma.moduleManifest.create({
      data: {
        moduleId,
        name: moduleName,
        enabledAssociate: true,
        enabledLeader: true,
        enabledAdmin: true,
      },
    });
    for (const role of ["SALES_ASSOCIATE", "SALES_LEADER", "ADMIN"] as const) {
      const scopeKey = role === "SALES_ASSOCIATE" ? "ASSOCIATE" : role === "SALES_LEADER" ? "LEADER" : "ADMIN";
      const dataScope = scopes[scopeKey];
      await prisma.entitlement.create({
        data: {
          role,
          moduleId,
          capability: "view",
          dataScope,
          allowed: dataScope !== "NONE",
        },
      });
    }
  }
  console.log(`Seeded entitlements for ${Object.keys(MODULE_SCOPE_MATRIX).length} modules.`);

  // ---------------------------------------------------------------
  // Bulk-insert Signals and AuditEvents
  // ---------------------------------------------------------------
  console.log(`Writing ${signals.length} signals and ${auditEvents.length} audit events...`);
  const BATCH = 200;
  for (let i = 0; i < signals.length; i += BATCH) {
    await prisma.signal.createMany({ data: signals.slice(i, i + BATCH) });
  }
  for (let i = 0; i < auditEvents.length; i += BATCH) {
    await prisma.auditEvent.createMany({ data: auditEvents.slice(i, i + BATCH) });
  }

  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
