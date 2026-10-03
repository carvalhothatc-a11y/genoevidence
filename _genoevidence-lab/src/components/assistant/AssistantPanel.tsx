"use client";
export function AssistantPanel({ projectId }: { projectId: string; consent: boolean; context: { kind: string } }) {
  return <p className="text-sm text-muted" data-project={projectId}>Assistente em implementação.</p>;
}
