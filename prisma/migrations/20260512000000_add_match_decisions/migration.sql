-- CreateTable
CREATE TABLE "MatchDecision" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "seedOfferId" INTEGER NOT NULL,
    "candidateOfferId" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "MatchDecision_seedOfferId_candidateOfferId_key" ON "MatchDecision"("seedOfferId", "candidateOfferId");

-- CreateIndex
CREATE INDEX "MatchDecision_status_idx" ON "MatchDecision"("status");

-- CreateIndex
CREATE INDEX "MatchDecision_seedOfferId_idx" ON "MatchDecision"("seedOfferId");

-- CreateIndex
CREATE INDEX "MatchDecision_candidateOfferId_idx" ON "MatchDecision"("candidateOfferId");
