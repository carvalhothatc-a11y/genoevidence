import { ProjectFields } from "@/lib/domain/schemas";
import { handle, json, readJsonBody, requireUser } from "@/lib/api";
import { getRepository } from "@/lib/repo";

export const GET = handle(async () => {
  const user = await requireUser();
  return json({ projects: await getRepository().listProjects(user.id) });
});

export const POST = handle(async (req: Request) => {
  const user = await requireUser();
  const fields = ProjectFields.parse(await readJsonBody(req));
  const project = await getRepository().createProject(user.id, fields);
  return json({ project }, 201);
});
