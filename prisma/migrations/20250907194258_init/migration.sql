/*
  Warnings:

  - A unique constraint covering the columns `[txnId]` on the table `TxnCategory` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "TxnCategory_txnId_key" ON "TxnCategory"("txnId");
