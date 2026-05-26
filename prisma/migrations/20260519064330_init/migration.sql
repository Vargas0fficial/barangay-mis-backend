-- CreateTable
CREATE TABLE "Resident" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "age" INTEGER NOT NULL,
    "gender" TEXT NOT NULL,
    "voterStatus" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Blotter" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "complainant" TEXT NOT NULL,
    "respondent" TEXT NOT NULL,
    "incident" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Active',
    "date" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "SystemCounter" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT DEFAULT 1,
    "count" INTEGER NOT NULL DEFAULT 0
);
