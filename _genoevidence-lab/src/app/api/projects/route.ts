import { ProjectFields } from "@/lib/domain/schemas";
import { handle, json, readJsonBody, requireUser } from "@/lib/api";
import { actorOf, listVisibleProjects } from "@/lib/authz";
import { getRepository } from "@/lib/repo";

export const GET = handle(async () => {
  const user = await requireUser();
  return json({ projects: await listVisibleProjects(user) });
});

export const POST = handle(async (req: Request) => {
  const user = await requireUser();
  const fields = ProjectFields.parse(await readJsonBody(req));
  const project = await getRepository().createProject(actorOf(user), fields);
  return json({ project: { id: project.id } }, 201);
});
