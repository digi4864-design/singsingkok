"use server";

import { requireAdmin } from "@/lib/requireAdmin";
import { runImageResyncBatch, type ResyncResult } from "@/lib/imageResync";

export type { ResyncResult };

export async function resyncThumbnailsAction(batchSize = 15): Promise<ResyncResult> {
  await requireAdmin();
  return runImageResyncBatch(batchSize);
}
