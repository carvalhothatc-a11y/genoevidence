import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/ui/Card";
import { Alert } from "@/components/ui/Alert";
import { VisualKindBadge } from "@/components/ui/Badges";
import { requirePageUser } from "@/lib/projects/server";
import { assistantStatus } from "@/lib/assistant/status";
import { Geninho } from "@/components/assistant/Geninho";
import { InstalarApp } from "@/components/layout/InstalarApp";

export const metadata: Metadata = { title: "Ajuda" };

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={id} className="rounded-xl border border-line bg-surface p-4 sm:p-6">
      <h2 id={id} className="mb-2 text-lg font-semibold">
        {title}
      </h2>
      <div className="grid gap-2 text-sm">{children}</div>
    </section>
  );
}

export default async function HelpPage() {
  const user = await requirePageUser("/ajuda");
  const assistant = assistantStatus();
  return (
    <div className="mx-auto max-w-[900px] px-4 py-8">
      <PageHeader eyebrow="Ajuda" title="Dúvidas de pesquisa e de uso" description="Pergunte ao Geninho ou consulte o guia rápido do laboratório, dos projetos e das regras de acesso." />
      <div className="grid gap-4">
        <Geninho configured={assistant.configured} isAdmin={user.role === "admin"} motivo={assistant.reason} />
        <h2 className="ge-display mt-4 text-2xl">Guia rápido</h2>
        <Section id="comecar" title="Por onde começar">
          <ol className="list-decimal space-y-1 pl-5">
            <li>
              Em <Link className="underline" href="/projetos">Projetos</Link>, crie um projeto ou use “Criar projeto de exemplo” (dados fictícios, identificados como sintéticos).
            </li>
            <li>No projeto, envie arquivos: CSV de expressão gênica, estruturas (PDB/mmCIF), imagens de gel, PDFs e textos.</li>
            <li>
              Abra o <Link className="underline" href="/laboratorio">Laboratório</Link> a partir do projeto para ver a bancada com os seus dados ligados aos equipamentos.
            </li>
            <li>
              Siga o <Link className="underline" href="/modulos/pcr">módulo de PCR</Link> no modo guiado ou explore livremente os parâmetros.
            </li>
          </ol>
        </Section>

        <Section id="laboratorio" title="Usar a área de trabalho">
          <ol className="list-decimal space-y-1 pl-5">
            <li>
              Em <Link className="underline" href="/laboratorio">Área de trabalho</Link>, explique o que você quer fazer: escreva ou grave um áudio (o microfone só liga quando você clica; revise a transcrição antes de usar). Pode ser um procedimento inteiro ou uma única ação.
            </li>
            <li>Se quiser, adicione fotos, tabelas (CSV, XLSX), relatórios (PDF, DOCX, TXT) e referências (DOI, link ou citação). Na tabela, confira o papel de cada coluna; na foto, marque ou confirme os elementos visíveis.</li>
            <li>Confira os valores e unidades reconhecidos e clique em “Criar visualização”. A cena mostra só as ações descritas: nenhum protocolo é acrescentado.</li>
            <li>Na cena, clique nos rótulos para ver nome, função, relação com a ação, parâmetros e de onde veio cada informação. Use reproduzir, pausar, reiniciar, velocidade, aproximar e reiniciar visão.</li>
            <li>Em “Como entendemos”, corrija ações, nomes, valores e conflitos; nada muda até você clicar em “Atualizar visualização”. Cada atualização vira uma versão nova, e a anterior é preservada.</li>
            <li>Os resultados ficam separados em processo ilustrado, resultado observado (seus dados), esperado (com fonte) e previsto (só com modelo aplicável). Sem modelo validado, nenhuma porcentagem é mostrada.</li>
            <li>Use “Salvar” para guardar descrição, materiais, arquivos originais e versões num projeto (novo ou existente); reabra pelo projeto quando quiser.</li>
            <li>
              A <Link className="underline" href="/laboratorio/bancada">Bancada 3D</Link> e as <Link className="underline" href="/modulos">técnicas educativas</Link> continuam disponíveis para explorar uma técnica completa. Na bancada: arraste para girar, role para aproximar; Tab percorre os rótulos e Enter seleciona.
            </li>
          </ol>
        </Section>

        <Section id="selos" title="O que cada selo significa">
          <p className="flex flex-wrap items-center gap-2">
            <VisualKindBadge kind="dados" /> resultados enviados por você ou pela equipe.
          </p>
          <p className="flex flex-wrap items-center gap-2">
            <VisualKindBadge kind="ilustracao" /> representação simplificada de um processo; não comprova mecanismo nem gera resultado.
          </p>
          <p className="flex flex-wrap items-center gap-2">
            <VisualKindBadge kind="simulacao" /> calculado por um modelo identificado, com parâmetros, pressupostos e limitações.
          </p>
          <p>Dados fictícios recebem o selo “sintético” e nunca são misturados aos seus dados.</p>
        </Section>

        <Section id="instalar" title="Instalar o GenoLab no computador ou no celular">
          <p>O GenoLab pode ser instalado como um aplicativo: ganha ícone próprio, abre numa janela só dele e fica no Dock, no menu Iniciar ou na tela inicial. Ele continua usando o servidor, então seus projetos ficam protegidos e sincronizados entre os dispositivos; sem internet, aparece um aviso.</p>
          <InstalarApp variante="pagina" />
        </Section>
        <Section id="acesso" title="Contas e acesso">
          <ul className="list-disc space-y-1 pl-5">
            <li>Novas contas ficam pendentes até a administração aprovar. Contas pendentes ou suspensas não veem nenhum dado.</li>
            <li>Cada projeto é privado. Só o dono e quem recebeu compartilhamento explícito conseguem abri-lo.</li>
            <li>Papéis no projeto: leitor (ver), editor (ver, enviar, editar e baixar), gestor (também compartilhar e exportar) e dono (também excluir o projeto).</li>
            <li>As sessões expiram após 12 horas sem uso ou 14 dias no total. Use “Sair” em computadores compartilhados.</li>
            <li>
              O que é coletado, onde fica guardado e como pedir cópia ou exclusão dos seus dados: veja a{" "}
              <Link className="underline" href="/privacidade">
                Política de privacidade
              </Link>
              .
            </li>
          </ul>
        </Section>

        <Section id="limites" title="Limites científicos">
          <Alert tone="warn" title="As simulações são educativas e servem para planejamento.">
            Elas não substituem validação experimental, protocolos institucionais nem normas de biossegurança.
          </Alert>
          <p>
            Explicações mostram a referência de origem. Quando não houver fonte cadastrada, o conteúdo é marcado como “sem fonte”. Veja também o estado de cada serviço em{" "}
            <Link className="underline" href="/integracoes">Integrações</Link>.
          </p>
        </Section>
      </div>
    </div>
  );
}
