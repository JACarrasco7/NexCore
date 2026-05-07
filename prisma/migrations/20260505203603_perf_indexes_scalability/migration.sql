-- CreateIndex
CREATE INDEX `Athlete_teamId_createdAt_idx` ON `Athlete`(`teamId`, `createdAt`);

-- CreateIndex
CREATE INDEX `Athlete_coachId_createdAt_idx` ON `Athlete`(`coachId`, `createdAt`);

-- CreateIndex
CREATE INDEX `TeamGoal_teamId_order_createdAt_idx` ON `TeamGoal`(`teamId`, `order`, `createdAt`);

-- CreateIndex
CREATE INDEX `TeamPhase_teamId_order_createdAt_idx` ON `TeamPhase`(`teamId`, `order`, `createdAt`);

-- CreateIndex
CREATE INDEX `TeamUserMembership_userId_isActive_role_createdAt_idx` ON `TeamUserMembership`(`userId`, `isActive`, `role`, `createdAt`);

-- CreateIndex
CREATE INDEX `TeamUserMembership_teamId_isActive_role_idx` ON `TeamUserMembership`(`teamId`, `isActive`, `role`);
