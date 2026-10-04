import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/Card";
import { Alert } from "@/components/ui/Alert";
import { assistantStatus } from "@/lib/assistant/status";
import { requirePageUser } from "@/lib/projects/server";

export const metadata: Metadata = { title: "Integrações" };

type State = "ativo" | "sob_demanda" | "local" | "nao_configurado" | "nao_implementado" | "indisponivel";

const STATE: Record<State, { label: string; cls: string }> = {
  ativo: { label: "Ativo", cls: "bg-ok-soft text-ok border-ok/30" },
  sob_demanda: { label: "Ativo sob demanda", cls: "bg-ok-soft text-ok border-ok/30" },
  local: { label: "Local, sem rede", cls: "bg-ok-soft text-ok border-ok/30" },
  nao_configurado: { label: "Não configurado", cls: "bg-warn-soft text-warn border-warn/30" },
  nao_implementado: { label: "Não implementado", cls: "bg-surface-2 text-muted border-line" },
  indisponivel: { label: "Indisponível", cls: "bg-surface-2 text-muted border-line" },
};

type Integration = { name: string; state: State; what: string; dataSent: string; verified: string };

export default async function IntegrationsPage() {
  await requirePageUser("/integracoes");
  const assistant = assistantStatus();

  const items: Integration[] = [
    {
      name: "Armazenamento local",
      state: "ativo",
      what: "Projetos, arquivos e contas ficam em arquivos no computador que executa o servidor (pasta definida por LAB_DATA_DIR). Permissões de arquivo restritas ao usuário do processo.",
      dataSent: "Nenhum envio externo.",
      verified: "Verificado nos testes de acesso desta versão. A criptografia em repouso depende do disco do servidor (por exemplo, FileVault); a aplicação não cifra os arquivos por conta própria.",
    },
    {
      name: "Supabase (banco e armazenamento em nuvem)",
      state: "nao_implementado",
      what: "Não há adaptador nem esquema de banco nesta versão. Todo o armazenamento é local.",
      dataSent: "Nenhum.",
      verified: "Não se aplica.",
    },
    {
      name: "RCSB PDB",
      state: "sob_demanda",
      what: "Quando você importa uma estrutura pelo código PDB, o servidor baixa o arquivo mmCIF de files.rcsb.org e guarda o original no projeto.",
      dataSent: "Somente o código PDB solicitado (e o endereço IP do servidor).",
      verified: "Download de 1UBQ testado durante o desenvolvimento.",
    },
    {
      name: "Mol* (visualização molecular)",
      state: "local",
      what: "Biblioteca executada no seu navegador para exibir estruturas do projeto.",
      dataSent: "Nenhum: a estrutura é lida do próprio GenoLab.",
      verified: "Carregamento e verificação de cadeia/resíduo testados com 1UBQ.",
    },
    {
      name: "Geninho — assistente de pesquisa (API do Claude, Anthropic)",
      state: assistant.configured ? "sob_demanda" : "nao_configurado",
      what: assistant.configured
        ? `Responde dúvidas de pesquisa na página Ajuda, pelo servidor (modelo ${assistant.model}). A chave fica só no servidor.`
        : `Disponível na página Ajuda e no laboratório quando a configuração estiver completa. ${assistant.reason ?? ""} Sem isso, nenhuma chamada é feita.`,
      dataSent: "As mensagens digitadas na conversa e, só se você marcar a opção na área de trabalho, a síntese do experimento (etapas, elementos, parâmetros e fontes). Não são enviados arquivos, imagens, nome ou e-mail; a conversa não é gravada no GenoLab. O Geninho não altera dados nem parâmetros.",
      verified: assistant.configured
        ? "Chamada real testada em 02/10/2026: pergunta enviada pela página Ajuda e resposta recebida em fluxo. Uso limitado a 20 perguntas a cada 10 min e 150 por dia por pessoa."
        : "Estado “não configurado” verificado. Chamadas reais à API ainda não foram testadas neste servidor.",
    },
    {
      name: "Extração de relatórios e tabelas (PDF, DOCX, TXT, CSV, XLSX)",
      state: "ativo",
      what: "Na área de trabalho, o servidor do GenoLab lê o texto de relatórios e as colunas de tabelas para a interpretação. Fórmulas de planilha não são recalculadas (vale o último valor salvo); PDFs digitalizados sem camada de texto aparecem como “conteúdo não obtido”.",
      dataSent: "Nenhum envio externo. O arquivo não é guardado na extração; só fica no projeto se você salvar.",
      verified: "Testado em 03/10/2026 com PDF, DOCX, CSV (vírgula decimal e ausentes) e XLSX com duas abas.",
    },
    {
      name: "Identificação de elementos em fotos (API do Claude, Anthropic)",
      state: assistant.configured ? "sob_demanda" : "nao_configurado",
      what: "Opcional, por foto: sugere os equipamentos, recipientes e materiais visíveis, só dentro do vocabulário da biblioteca da cena. As sugestões entram na cena apenas depois de confirmadas por você.",
      dataSent: "Somente a foto escolhida, reduzida no navegador (lado maior até 1568 px), e a legenda, quando houver; e só depois de você marcar a autorização daquele envio. A foto não é guardada nesse envio.",
      verified: assistant.configured ? "Chamada real testada em 03/10/2026 com uma imagem de teste; resposta validada no formato estruturado." : "Sem configuração neste servidor: nenhuma chamada é feita.",
    },
    {
      name: "Blender e modelos 3D externos",
      state: "indisponivel",
      what: "As formas 3D da cena são geradas no próprio código (React Three Fiber). Nenhum modelo foi produzido no Blender nesta versão.",
      dataSent: "Nenhum.",
      verified: "Não se aplica.",
    },
    {
      name: "Visualização gerada da descrição (texto ou voz)",
      state: "local",
      what: "A descrição e os materiais são convertidos, por regras fixas, numa descrição estruturada (ações, elementos, parâmetros, fontes, ausências e conflitos) e numa cena 3D animada composta a partir da biblioteca do GenoLab. Nenhum código é gerado a partir do texto, da fala ou dos arquivos.",
      dataSent: "Texto: nenhum envio. Voz: a transcrição é feita pelo navegador; no Chrome e no Edge o áudio vai para o serviço de reconhecimento do fabricante do navegador. O GenoLab não recebe o áudio.",
      verified: "Interpretação e geração de imagem testadas com descrições de PCR, clonagem, extração e CRISPR.",
    },
    {
      name: "Busca de referências no PubMed (NCBI E-utilities)",
      state: "sob_demanda",
      what: "Opcional, por etapa: o botão “Buscar referências no PubMed” lista até 5 artigos relacionados à ação.",
      dataSent: "Somente termos fixos em inglês da ação (ex.: “DNA ligation vector insert cloning”) e, se houver, o nome do gene. O texto da descrição nunca é enviado.",
      verified: "Conexão testada em 02/10/2026. Os artigos são “encontrados”: conteúdo não lido nem verificado pela plataforma.",
    },
    {
      name: "Fontes tipográficas",
      state: "local",
      what: "Unbounded, IBM Plex Sans e IBM Plex Mono são baixadas na compilação e servidas pelo próprio GenoLab.",
      dataSent: "Nenhum: o navegador não contata serviços de fontes.",
      verified: "Conferido nas requisições de rede da página.",
    },
    {
      name: "Envio de e-mail",
      state: "nao_implementado",
      what: "Não há confirmação de e-mail nem recuperação de senha por e-mail. Novas contas são aprovadas manualmente pela administração.",
      dataSent: "Nenhum.",
      verified: "Não se aplica.",
    },
    {
      name: "Verificação antimalware de arquivos",
      state: "indisponivel",
      what: "A infraestrutura atual não oferece varredura antimalware. Os envios são validados por tipo, tamanho e conteúdo (assinatura do arquivo), guardados fora de pastas públicas e entregues sem execução.",
      dataSent: "Nenhum.",
      verified: "Limitação conhecida: arquivos não passam por antivírus.",
    },
    {
      name: "Site GenoEvidence",
      state: "ativo",
      what: "A página “GenoLab” do site apenas aponta para o endereço do laboratório. O acesso continua exigindo conta autorizada.",
      dataSent: "Nenhum dado é compartilhado entre o site e o laboratório.",
      verified: "Link testado em ambiente local.",
    },
  ];

  return (
    <div className="mx-auto max-w-[1100px] px-4 py-8">
      <PageHeader
        eyebrow="Transparência"
        title="Integrações"
        description="Estado real de cada serviço usado pelo GenoLab, o que é enviado para fora e o que foi verificado. Nada aqui é ativado sem aparecer nesta lista."
      />
      <ul className="grid gap-3">
        {items.map((i) => (
          <li key={i.name} className="rounded-xl border border-line bg-surface p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-semibold">{i.name}</h2>
              <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${STATE[i.state].cls}`}>{STATE[i.state].label}</span>
            </div>
            <p className="mt-1 text-sm">{i.what}</p>
            <dl className="mt-2 grid gap-1 text-xs text-muted sm:grid-cols-2">
              <div>
                <dt className="inline font-semibold text-ink">Dados enviados: </dt>
                <dd className="inline">{i.dataSent}</dd>
              </div>
              <div>
                <dt className="inline font-semibold text-ink">Verificação: </dt>
                <dd className="inline">{i.verified}</dd>
              </div>
            </dl>
          </li>
        ))}
      </ul>
      <Alert tone="info" className="mt-6" title="Nenhum dado de pesquisa é usado para treinar modelos.">
        O GenoLab não envia dados privados a terceiros por padrão. Qualquer integração futura que envie conteúdo de projetos aparecerá aqui, com consentimento explícito por projeto.
      </Alert>
    </div>
  );
}
