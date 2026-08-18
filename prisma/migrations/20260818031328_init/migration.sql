-- CreateTable
CREATE TABLE "DealerGroup" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Rooftop" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "dealerGroupId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "franchiseType" TEXT NOT NULL,
    "oemBrand" TEXT,
    "region" TEXT NOT NULL,
    "territoryId" TEXT NOT NULL,
    "assignedAssociateId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Rooftop_dealerGroupId_fkey" FOREIGN KEY ("dealerGroupId") REFERENCES "DealerGroup" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Rooftop_territoryId_fkey" FOREIGN KEY ("territoryId") REFERENCES "Territory" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Rooftop_assignedAssociateId_fkey" FOREIGN KEY ("assignedAssociateId") REFERENCES "Associate" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Contact" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "dealerGroupId" TEXT NOT NULL,
    "rooftopId" TEXT,
    "personaType" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Contact_dealerGroupId_fkey" FOREIGN KEY ("dealerGroupId") REFERENCES "DealerGroup" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Contact_rooftopId_fkey" FOREIGN KEY ("rooftopId") REFERENCES "Rooftop" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Territory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Team" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "leaderId" TEXT NOT NULL,
    "territoryId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Team_leaderId_fkey" FOREIGN KEY ("leaderId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Team_territoryId_fkey" FOREIGN KEY ("territoryId") REFERENCES "Territory" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Associate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "hireDate" DATETIME,
    CONSTRAINT "Associate_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Associate_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Interaction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "rooftopId" TEXT NOT NULL,
    "contactId" TEXT,
    "associateId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "notes" TEXT,
    "occurredAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Interaction_rooftopId_fkey" FOREIGN KEY ("rooftopId") REFERENCES "Rooftop" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Interaction_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Interaction_associateId_fkey" FOREIGN KEY ("associateId") REFERENCES "Associate" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Pitch" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "rooftopId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "associateId" TEXT NOT NULL,
    "pitchGoalId" TEXT,
    "productPitched" TEXT NOT NULL,
    "outcome" TEXT NOT NULL,
    "objection" TEXT,
    "occurredAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Pitch_rooftopId_fkey" FOREIGN KEY ("rooftopId") REFERENCES "Rooftop" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Pitch_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Pitch_associateId_fkey" FOREIGN KEY ("associateId") REFERENCES "Associate" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Pitch_pitchGoalId_fkey" FOREIGN KEY ("pitchGoalId") REFERENCES "PitchGoal" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PitchGoal" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ownerType" TEXT NOT NULL,
    "associateId" TEXT,
    "teamId" TEXT,
    "period" DATETIME NOT NULL,
    "targetCount" INTEGER NOT NULL,
    "productFocus" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PitchGoal_associateId_fkey" FOREIGN KEY ("associateId") REFERENCES "Associate" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "PitchGoal_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RoutingRule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "priority" INTEGER NOT NULL,
    "criteria" JSONB NOT NULL,
    "targetAssociateId" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "rooftopId" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "consumerName" TEXT NOT NULL,
    "productInterest" TEXT NOT NULL,
    "routingRuleId" TEXT,
    "routedAssociateId" TEXT,
    "reasonCodes" JSONB,
    "slaDueAt" DATETIME NOT NULL,
    "slaBreachedAt" DATETIME,
    "receivedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "workedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Lead_rooftopId_fkey" FOREIGN KEY ("rooftopId") REFERENCES "Rooftop" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Lead_routingRuleId_fkey" FOREIGN KEY ("routingRuleId") REFERENCES "RoutingRule" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Lead_routedAssociateId_fkey" FOREIGN KEY ("routedAssociateId") REFERENCES "Associate" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DealStage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "defaultProbability" INTEGER NOT NULL,
    "isClosed" BOOLEAN NOT NULL DEFAULT false,
    "isWon" BOOLEAN NOT NULL DEFAULT false
);

-- CreateTable
CREATE TABLE "Opportunity" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "rooftopId" TEXT NOT NULL,
    "associateId" TEXT NOT NULL,
    "productType" TEXT NOT NULL,
    "dealStageId" TEXT NOT NULL,
    "expectedValue" REAL NOT NULL,
    "closeDate" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Opportunity_rooftopId_fkey" FOREIGN KEY ("rooftopId") REFERENCES "Rooftop" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Opportunity_associateId_fkey" FOREIGN KEY ("associateId") REFERENCES "Associate" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Opportunity_dealStageId_fkey" FOREIGN KEY ("dealStageId") REFERENCES "DealStage" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Application" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "opportunityId" TEXT NOT NULL,
    "rooftopId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'SUBMITTED',
    "submittedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Application_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Application_rooftopId_fkey" FOREIGN KEY ("rooftopId") REFERENCES "Rooftop" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Stip" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "applicationId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OUTSTANDING',
    "ownerId" TEXT NOT NULL,
    "agingSince" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "clearedAt" DATETIME,
    CONSTRAINT "Stip_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Stip_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FundedDeal" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "applicationId" TEXT NOT NULL,
    "fundedAmount" REAL NOT NULL,
    "fundedAt" DATETIME NOT NULL,
    "fundingCycleTimeDays" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FundedDeal_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PricingProgram" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "productType" TEXT NOT NULL,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "RateSheet" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "pricingProgramId" TEXT NOT NULL,
    "effectiveFrom" DATETIME NOT NULL,
    "effectiveTo" DATETIME,
    "rateData" JSONB NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RateSheet_pricingProgramId_fkey" FOREIGN KEY ("pricingProgramId") REFERENCES "PricingProgram" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ExceptionRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "rooftopId" TEXT NOT NULL,
    "contactId" TEXT,
    "associateId" TEXT NOT NULL,
    "requestType" TEXT NOT NULL,
    "currentProgramId" TEXT,
    "rateSheetId" TEXT,
    "requestedTerms" JSONB NOT NULL,
    "rationale" TEXT NOT NULL,
    "dollarAmount" REAL,
    "approvalRequestId" TEXT,
    "convertedFundedDealId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ExceptionRequest_rooftopId_fkey" FOREIGN KEY ("rooftopId") REFERENCES "Rooftop" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ExceptionRequest_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ExceptionRequest_associateId_fkey" FOREIGN KEY ("associateId") REFERENCES "Associate" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ExceptionRequest_currentProgramId_fkey" FOREIGN KEY ("currentProgramId") REFERENCES "PricingProgram" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ExceptionRequest_rateSheetId_fkey" FOREIGN KEY ("rateSheetId") REFERENCES "RateSheet" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ExceptionRequest_approvalRequestId_fkey" FOREIGN KEY ("approvalRequestId") REFERENCES "ApprovalRequest" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ExceptionRequest_convertedFundedDealId_fkey" FOREIGN KEY ("convertedFundedDealId") REFERENCES "FundedDeal" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "LoyaltyTier" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "level" INTEGER NOT NULL,
    "minThreshold" JSONB NOT NULL,
    "description" TEXT
);

-- CreateTable
CREATE TABLE "TierEvaluation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "rooftopId" TEXT NOT NULL,
    "tierId" TEXT NOT NULL,
    "evaluatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reasonCodes" JSONB NOT NULL,
    "thresholdDistance" REAL NOT NULL,
    "downTierRisk" BOOLEAN NOT NULL DEFAULT false,
    "estimatedDollarImpact" REAL,
    "dealerVisibleAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TierEvaluation_rooftopId_fkey" FOREIGN KEY ("rooftopId") REFERENCES "Rooftop" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "TierEvaluation_tierId_fkey" FOREIGN KEY ("tierId") REFERENCES "LoyaltyTier" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CrossSellSignal" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "rooftopId" TEXT NOT NULL,
    "missingProduct" TEXT NOT NULL,
    "confidence" REAL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "identifiedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actionedAt" DATETIME,
    CONSTRAINT "CrossSellSignal_rooftopId_fkey" FOREIGN KEY ("rooftopId") REFERENCES "Rooftop" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ApprovalPolicy" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "triggerType" TEXT NOT NULL,
    "thresholdConditions" JSONB NOT NULL,
    "approverRoleChain" JSONB NOT NULL,
    "slaHours" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ApprovalRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "policyId" TEXT NOT NULL,
    "triggerType" TEXT NOT NULL,
    "triggerEntityId" TEXT NOT NULL,
    "reasonCodes" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "requestedById" TEXT NOT NULL,
    "requestedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decidedAt" DATETIME,
    "decidedById" TEXT,
    "decisionRationale" TEXT,
    CONSTRAINT "ApprovalRequest_policyId_fkey" FOREIGN KEY ("policyId") REFERENCES "ApprovalPolicy" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ApprovalRequest_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ApprovalRequest_decidedById_fkey" FOREIGN KEY ("decidedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ApprovalStep" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "approvalRequestId" TEXT NOT NULL,
    "stepOrder" INTEGER NOT NULL,
    "approverRole" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "decidedAt" DATETIME,
    "decidedById" TEXT,
    "delegatedToId" TEXT,
    "rationale" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ApprovalStep_approvalRequestId_fkey" FOREIGN KEY ("approvalRequestId") REFERENCES "ApprovalRequest" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ApprovalStep_decidedById_fkey" FOREIGN KEY ("decidedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ApprovalStep_delegatedToId_fkey" FOREIGN KEY ("delegatedToId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Entitlement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "role" TEXT NOT NULL,
    "moduleId" TEXT NOT NULL,
    "capability" TEXT NOT NULL,
    "dataScope" TEXT NOT NULL,
    "allowed" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ModuleManifest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "moduleId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "enabledAssociate" BOOLEAN NOT NULL DEFAULT true,
    "enabledLeader" BOOLEAN NOT NULL DEFAULT true,
    "enabledAdmin" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "AuditEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "actorId" TEXT NOT NULL,
    "actorRole" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "before" JSONB,
    "after" JSONB,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "complianceRelevant" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "AuditEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Signal" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "sourceModule" TEXT NOT NULL,
    "entityType" TEXT,
    "entityId" TEXT,
    "emittedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "ContentAsset" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "assetType" TEXT NOT NULL,
    "personaTags" JSONB NOT NULL,
    "productTags" JSONB NOT NULL,
    "programTags" JSONB NOT NULL,
    "body" TEXT NOT NULL,
    "lastVerifiedAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Playbook" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "contactPersona" TEXT NOT NULL,
    "productType" TEXT NOT NULL,
    "steps" JSONB NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Certification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "programId" TEXT,
    "description" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "OnboardingCase" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "rooftopId" TEXT NOT NULL,
    "associateId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "checklist" JSONB NOT NULL,
    "approvalRequestId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "OnboardingCase_rooftopId_fkey" FOREIGN KEY ("rooftopId") REFERENCES "Rooftop" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "OnboardingCase_associateId_fkey" FOREIGN KEY ("associateId") REFERENCES "Associate" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "OnboardingCase_approvalRequestId_fkey" FOREIGN KEY ("approvalRequestId") REFERENCES "ApprovalRequest" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Escalation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "rooftopId" TEXT NOT NULL,
    "raisedById" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "approvalRequestId" TEXT,
    "resolutionNotes" TEXT,
    "resolvedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Escalation_rooftopId_fkey" FOREIGN KEY ("rooftopId") REFERENCES "Rooftop" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Escalation_raisedById_fkey" FOREIGN KEY ("raisedById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Escalation_approvalRequestId_fkey" FOREIGN KEY ("approvalRequestId") REFERENCES "ApprovalRequest" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MetricSnapshot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "metricKey" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "value" REAL NOT NULL,
    "source" TEXT NOT NULL,
    "asOf" DATETIME NOT NULL,
    "freshnessSeconds" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "Rooftop_territoryId_idx" ON "Rooftop"("territoryId");

-- CreateIndex
CREATE INDEX "Rooftop_assignedAssociateId_idx" ON "Rooftop"("assignedAssociateId");

-- CreateIndex
CREATE INDEX "Rooftop_dealerGroupId_idx" ON "Rooftop"("dealerGroupId");

-- CreateIndex
CREATE INDEX "Contact_dealerGroupId_idx" ON "Contact"("dealerGroupId");

-- CreateIndex
CREATE INDEX "Contact_rooftopId_idx" ON "Contact"("rooftopId");

-- CreateIndex
CREATE UNIQUE INDEX "Team_territoryId_key" ON "Team"("territoryId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Associate_userId_key" ON "Associate"("userId");

-- CreateIndex
CREATE INDEX "Associate_teamId_idx" ON "Associate"("teamId");

-- CreateIndex
CREATE INDEX "Interaction_rooftopId_idx" ON "Interaction"("rooftopId");

-- CreateIndex
CREATE INDEX "Interaction_associateId_idx" ON "Interaction"("associateId");

-- CreateIndex
CREATE INDEX "Interaction_occurredAt_idx" ON "Interaction"("occurredAt");

-- CreateIndex
CREATE INDEX "Pitch_rooftopId_idx" ON "Pitch"("rooftopId");

-- CreateIndex
CREATE INDEX "Pitch_associateId_idx" ON "Pitch"("associateId");

-- CreateIndex
CREATE INDEX "Pitch_occurredAt_idx" ON "Pitch"("occurredAt");

-- CreateIndex
CREATE INDEX "PitchGoal_associateId_idx" ON "PitchGoal"("associateId");

-- CreateIndex
CREATE INDEX "PitchGoal_teamId_idx" ON "PitchGoal"("teamId");

-- CreateIndex
CREATE INDEX "PitchGoal_period_idx" ON "PitchGoal"("period");

-- CreateIndex
CREATE INDEX "RoutingRule_active_idx" ON "RoutingRule"("active");

-- CreateIndex
CREATE INDEX "Lead_rooftopId_idx" ON "Lead"("rooftopId");

-- CreateIndex
CREATE INDEX "Lead_routedAssociateId_idx" ON "Lead"("routedAssociateId");

-- CreateIndex
CREATE INDEX "Lead_status_idx" ON "Lead"("status");

-- CreateIndex
CREATE INDEX "Lead_slaDueAt_idx" ON "Lead"("slaDueAt");

-- CreateIndex
CREATE INDEX "Opportunity_rooftopId_idx" ON "Opportunity"("rooftopId");

-- CreateIndex
CREATE INDEX "Opportunity_associateId_idx" ON "Opportunity"("associateId");

-- CreateIndex
CREATE INDEX "Opportunity_dealStageId_idx" ON "Opportunity"("dealStageId");

-- CreateIndex
CREATE INDEX "Application_opportunityId_idx" ON "Application"("opportunityId");

-- CreateIndex
CREATE INDEX "Application_rooftopId_idx" ON "Application"("rooftopId");

-- CreateIndex
CREATE INDEX "Stip_applicationId_idx" ON "Stip"("applicationId");

-- CreateIndex
CREATE INDEX "Stip_status_idx" ON "Stip"("status");

-- CreateIndex
CREATE UNIQUE INDEX "FundedDeal_applicationId_key" ON "FundedDeal"("applicationId");

-- CreateIndex
CREATE INDEX "RateSheet_pricingProgramId_idx" ON "RateSheet"("pricingProgramId");

-- CreateIndex
CREATE INDEX "RateSheet_effectiveFrom_idx" ON "RateSheet"("effectiveFrom");

-- CreateIndex
CREATE UNIQUE INDEX "ExceptionRequest_approvalRequestId_key" ON "ExceptionRequest"("approvalRequestId");

-- CreateIndex
CREATE INDEX "ExceptionRequest_rooftopId_idx" ON "ExceptionRequest"("rooftopId");

-- CreateIndex
CREATE INDEX "ExceptionRequest_associateId_idx" ON "ExceptionRequest"("associateId");

-- CreateIndex
CREATE UNIQUE INDEX "LoyaltyTier_level_key" ON "LoyaltyTier"("level");

-- CreateIndex
CREATE INDEX "TierEvaluation_rooftopId_idx" ON "TierEvaluation"("rooftopId");

-- CreateIndex
CREATE INDEX "TierEvaluation_evaluatedAt_idx" ON "TierEvaluation"("evaluatedAt");

-- CreateIndex
CREATE INDEX "TierEvaluation_downTierRisk_idx" ON "TierEvaluation"("downTierRisk");

-- CreateIndex
CREATE INDEX "CrossSellSignal_rooftopId_idx" ON "CrossSellSignal"("rooftopId");

-- CreateIndex
CREATE INDEX "CrossSellSignal_status_idx" ON "CrossSellSignal"("status");

-- CreateIndex
CREATE INDEX "ApprovalPolicy_triggerType_idx" ON "ApprovalPolicy"("triggerType");

-- CreateIndex
CREATE INDEX "ApprovalPolicy_active_idx" ON "ApprovalPolicy"("active");

-- CreateIndex
CREATE INDEX "ApprovalRequest_policyId_idx" ON "ApprovalRequest"("policyId");

-- CreateIndex
CREATE INDEX "ApprovalRequest_status_idx" ON "ApprovalRequest"("status");

-- CreateIndex
CREATE INDEX "ApprovalRequest_triggerType_triggerEntityId_idx" ON "ApprovalRequest"("triggerType", "triggerEntityId");

-- CreateIndex
CREATE INDEX "ApprovalStep_approvalRequestId_idx" ON "ApprovalStep"("approvalRequestId");

-- CreateIndex
CREATE INDEX "ApprovalStep_status_idx" ON "ApprovalStep"("status");

-- CreateIndex
CREATE INDEX "Entitlement_moduleId_idx" ON "Entitlement"("moduleId");

-- CreateIndex
CREATE UNIQUE INDEX "Entitlement_role_moduleId_capability_key" ON "Entitlement"("role", "moduleId", "capability");

-- CreateIndex
CREATE UNIQUE INDEX "ModuleManifest_moduleId_key" ON "ModuleManifest"("moduleId");

-- CreateIndex
CREATE INDEX "AuditEvent_entityType_entityId_idx" ON "AuditEvent"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "AuditEvent_complianceRelevant_idx" ON "AuditEvent"("complianceRelevant");

-- CreateIndex
CREATE INDEX "AuditEvent_timestamp_idx" ON "AuditEvent"("timestamp");

-- CreateIndex
CREATE INDEX "Signal_type_idx" ON "Signal"("type");

-- CreateIndex
CREATE INDEX "Signal_entityType_entityId_idx" ON "Signal"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "Signal_emittedAt_idx" ON "Signal"("emittedAt");

-- CreateIndex
CREATE INDEX "ContentAsset_lastVerifiedAt_idx" ON "ContentAsset"("lastVerifiedAt");

-- CreateIndex
CREATE UNIQUE INDEX "OnboardingCase_approvalRequestId_key" ON "OnboardingCase"("approvalRequestId");

-- CreateIndex
CREATE INDEX "OnboardingCase_rooftopId_idx" ON "OnboardingCase"("rooftopId");

-- CreateIndex
CREATE INDEX "OnboardingCase_status_idx" ON "OnboardingCase"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Escalation_approvalRequestId_key" ON "Escalation"("approvalRequestId");

-- CreateIndex
CREATE INDEX "Escalation_rooftopId_idx" ON "Escalation"("rooftopId");

-- CreateIndex
CREATE INDEX "Escalation_status_idx" ON "Escalation"("status");

-- CreateIndex
CREATE INDEX "MetricSnapshot_metricKey_entityType_entityId_idx" ON "MetricSnapshot"("metricKey", "entityType", "entityId");

-- CreateIndex
CREATE INDEX "MetricSnapshot_asOf_idx" ON "MetricSnapshot"("asOf");
