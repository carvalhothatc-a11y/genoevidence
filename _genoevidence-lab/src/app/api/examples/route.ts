import { handle, json, requireUser } from "@/lib/api";
import { getRepository } from "@/lib/repo";
import { createExampleProject } from "@/lib/examples";

export const POST = handle(async () => {
  const user = await requireUser();
  const project = await createExampleProject(getRepository(), user.id);
  return json({ project }, 201);
});
