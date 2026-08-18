-- CreateTable
CREATE TABLE "ContentShare" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "contentAssetId" TEXT NOT NULL,
    "rooftopId" TEXT NOT NULL,
    "contactId" TEXT,
    "sharedById" TEXT NOT NULL,
    "sharedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ContentShare_contentAssetId_fkey" FOREIGN KEY ("contentAssetId") REFERENCES "ContentAsset" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ContentShare_rooftopId_fkey" FOREIGN KEY ("rooftopId") REFERENCES "Rooftop" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ContentShare_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ContentShare_sharedById_fkey" FOREIGN KEY ("sharedById") REFERENCES "Associate" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "ContentShare_rooftopId_idx" ON "ContentShare"("rooftopId");

-- CreateIndex
CREATE INDEX "ContentShare_contentAssetId_idx" ON "ContentShare"("contentAssetId");
