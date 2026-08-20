import { handleAskRequest } from "@/lib/ask-handler";

export async function POST(request: Request) {
  return handleAskRequest(request);
}
