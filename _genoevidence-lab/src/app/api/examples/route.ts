import { handle, json, requireUser } from "@/lib/api";
import { actorOf } from "@/lib/authz";
import { getRepository } from "@/lib/repo";
import { createExampleProject } from "@/lib/examples";

export const POST = handle(async () => {
  const user = await requireUser();
  const project = await createExampleProject(getRepository(), actorOf(user));
  return json({ project: { id: project.id } }, 201);
});
