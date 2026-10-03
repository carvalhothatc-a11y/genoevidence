import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { PageHeader } from "@/components/ui/Card";
import { Alert } from "@/components/ui/Alert";
import { dataCurta } from "@/lib/datas";
import { contatoPrivacidade, DIAS_BACKUP, LOCAL_DOS_DADOS, MESES_REGISTRO_SEGURANCA, POLITICA_VERSAO } from "@/lib/privacidade";

export const metadata: Metadata = { title: "Política de privacidade" };

function Secao({ id, n, titulo, children }: { id: string; n: number; titulo: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="rounded-xl border border-line bg-surface p-4 sm:p-6">
      <h2 id={id} className="mb-2 text-lg font-semibold">
        <span className="ge-mono mr-2 text-sm text-muted">{String(n).padStart(2, "0")}</span>
        {titulo}
      </h2>
      <div className="grid gap-2 text-sm leading-relaxed">{children}</div>
    </section>
  );
}

/**
 * Política de privacidade (LGPD — Lei nº 13.709/2018). Pública: acessível sem conta, antes do cadastro.
 * Cada afirmação aqui corresponde ao comportamento do código; ao mudar o que é coletado ou para onde
 * vai, atualize este texto e POLITICA_VERSAO (src/lib/privacidade.ts).
 */
export default function PrivacidadePage() {
  const contato = contatoPrivacidade();
  return (
    <div className="mx-auto max-w-[900px] px-4 py-8">
      <PageHeader
        eyebrow="Privacidade"
        title="Política de privacidade"
        description={
          <>
            Como o GenoLab trata dados pessoais, em linguagem direta. Versão de <span className="ge-mono">{dataCurta(`${POLITICA_VERSAO}T12:00:00Z`)}</span>.
          </>
        }
      />
      <div className="grid gap-4">
        <Alert tone="info" title="Resumo">
          Guardamos só o necessário para sua conta e seus projetos funcionarem. Não há publicidade, rastreadores nem venda de dados. Os dados ficam num servidor nos {LOCAL_DOS_DADOS}. Nada do seu conteúdo sai do servidor, a não ser quando você usa o Geninho ou o ditado por voz.
        </Alert>

        <Secao id="controlador" n={1} titulo="Quem é responsável">
          <p>
            O GenoLab é o laboratório virtual do projeto GenoEvidence, desenvolvido por Thaisa Carvalho, que é a controladora dos dados pessoais tratados aqui, nos termos da Lei Geral de Proteção de
            Dados (LGPD).
          </p>
          {contato ? (
            <p>
              Contato para assuntos de privacidade:{" "}
              <a className="font-semibold underline" href={`mailto:${contato}`}>
                {contato}
              </a>
              .
            </p>
          ) : (
            <p>Pedidos sobre seus dados podem ser feitos à administração do GenoLab, que responde pelo laboratório. Um e-mail exclusivo para privacidade será publicado nesta página.</p>
          )}
        </Secao>

        <Secao id="dados" n={2} titulo="Quais dados tratamos">
          <ul className="list-disc space-y-1.5 pl-5">
            <li>
              <strong>Cadastro:</strong> nome, e-mail e, se você informar, instituição. A senha nunca é guardada: fica só um resumo criptográfico (scrypt) que não permite recuperá-la.
            </li>
            <li>
              <strong>Conteúdo que você cria:</strong> projetos, arquivos enviados, dados de expressão, estruturas, ideias e cenários, referências e o histórico de alterações de cada projeto.
            </li>
            <li>
              <strong>Sessão:</strong> um cookie essencial (<span className="ge-mono">lv_conta</span>) mantém você conectado. No servidor fica apenas um resumo do token. A sessão termina em até 14 dias, ou depois de 12 horas sem uso.
            </li>
            <li>
              <strong>Registro de segurança:</strong> data, tipo de evento (por exemplo, entrada, falha de senha, aprovação de conta), identificador interno da conta e resultado. O e-mail aparece só como resumo
              criptográfico. O registro não guarda conteúdo de pesquisa, senhas, nomes de arquivos ou o texto de conversas.
            </li>
            <li>
              <strong>Endereço IP:</strong> usado apenas na memória do servidor, já transformado em resumo, para limitar tentativas repetidas de entrada e cadastro. Não é gravado.
            </li>
            <li>
              <strong>Preferências no navegador:</strong> algumas escolhas de exibição (pausar animações, qualidade do 3D, dicas) ficam no armazenamento local do seu navegador e não são enviadas ao servidor.
            </li>
          </ul>
        </Secao>

        <Secao id="finalidades" n={3} titulo="Para que usamos e com qual base legal">
          <ul className="list-disc space-y-1.5 pl-5">
            <li>
              <strong>Criar e manter sua conta, aprovar o acesso e guardar seus projetos:</strong> execução do serviço que você solicitou (art. 7º, V, da LGPD).
            </li>
            <li>
              <strong>Proteger contas e o laboratório (registro de segurança, limite de tentativas, backups):</strong> legítimo interesse (art. 7º, IX), limitado ao mínimo necessário.
            </li>
            <li>
              <strong>Geninho e ditado por voz:</strong> seu consentimento, dado a cada uso. Esses recursos só funcionam quando você os aciona.
            </li>
          </ul>
          <p>Não usamos seus dados para publicidade, perfilamento ou decisões automatizadas sobre você.</p>
        </Secao>

        <Secao id="compartilhamento" n={4} titulo="Com quem os dados são compartilhados">
          <ul className="list-disc space-y-1.5 pl-5">
            <li>
              <strong>Hostinger (hospedagem):</strong> o servidor que guarda contas, projetos e backups fica num datacenter da Hostinger nos {LOCAL_DOS_DADOS}.
            </li>
            <li>
              <strong>Anthropic (Geninho), nos Estados Unidos:</strong> recebe somente as mensagens da conversa com o Geninho, quando você pergunta. Seu nome, e-mail e projetos não são enviados. O
              tratamento segue os termos comerciais da Anthropic para a API.
            </li>
            <li>
              <strong>NCBI/PubMed, nos Estados Unidos:</strong> a busca opcional de artigos envia apenas termos técnicos fixos em inglês e, quando houver, um nome de gene. Nunca envia o seu texto nem dados
              pessoais.
            </li>
            <li>
              <strong>Ditado por voz:</strong> o reconhecimento é feito pelo seu navegador. Em alguns navegadores, como o Chrome, o áudio é processado por servidores do fabricante (Google). O GenoLab não grava
              nem guarda o áudio: recebe apenas o texto transcrito, que você revisa antes de enviar.
            </li>
            <li>
              <strong>Outros pesquisadores:</strong> só veem um projeto se você o compartilhar. Contas novas ficam pendentes e não veem nenhum dado até serem aprovadas pela administração.
            </li>
          </ul>
          <p>
            Por isso há <strong>transferência internacional de dados</strong> (art. 33 da LGPD), principalmente para os Estados Unidos. Ao criar a conta, você concorda com o armazenamento nesse país. Ao usar o
            Geninho, você concorda com o envio das mensagens daquela conversa.
          </p>
        </Secao>

        <Secao id="pesquisa" n={5} titulo="Dados de participantes de pesquisa">
          <p>
            O GenoLab não foi feito para guardar dados pessoais de participantes ou pacientes, como dados de saúde ou dados genéticos identificáveis, que são <strong>dados sensíveis</strong> (art. 11 da
            LGPD). Envie apenas dados anonimizados ou fictícios. Não escreva no Geninho informações que identifiquem pessoas.
          </p>
        </Secao>

        <Secao id="retencao" n={6} titulo="Por quanto tempo guardamos">
          <ul className="list-disc space-y-1.5 pl-5">
            <li>Conta e projetos: enquanto a conta existir. Ao excluir a conta, os projetos de que você é dono são apagados junto.</li>
            <li>Backups: cópias diárias guardadas por {DIAS_BACKUP} dias. Um dado excluído pode continuar num backup até esse prazo acabar.</li>
            <li>Registro de segurança: apagado automaticamente depois de {MESES_REGISTRO_SEGURANCA} meses.</li>
            <li>Sessões: expiram em até 14 dias.</li>
          </ul>
        </Secao>

        <Secao id="seguranca" n={7} titulo="Como protegemos">
          <ul className="list-disc space-y-1.5 pl-5">
            <li>Conexão sempre criptografada (HTTPS) e política de segurança de conteúdo no navegador.</li>
            <li>Senhas com resumo criptográfico forte. Cookie de sessão inacessível a scripts da página.</li>
            <li>Acesso por aprovação manual e permissões por projeto, conferidas no servidor a cada requisição.</li>
            <li>Servidor com firewall, atualizações automáticas de segurança e backups diários.</li>
          </ul>
          <p>
            Uma limitação conhecida: os arquivos enviados não passam por antivírus. Nenhum sistema é totalmente imune a falhas. Se houver um incidente de segurança que possa causar risco ou dano relevante, os
            titulares afetados e a ANPD serão comunicados, como exige a LGPD.
          </p>
        </Secao>

        <Secao id="direitos" n={8} titulo="Seus direitos">
          <p>Pela LGPD (art. 18), você pode pedir:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>confirmação de que tratamos seus dados e acesso a eles;</li>
            <li>correção de dados incompletos ou desatualizados;</li>
            <li>anonimização, bloqueio ou eliminação de dados desnecessários;</li>
            <li>portabilidade (uma cópia dos seus dados);</li>
            <li>informação sobre com quem os dados são compartilhados;</li>
            <li>exclusão da conta e revogação do consentimento.</li>
          </ul>
          <p>
            Os pedidos são atendidos em até 15 dias {contato ? <>pelo e-mail {contato}</> : <>pela administração do GenoLab</>}. Você também pode reclamar à Autoridade Nacional de Proteção de Dados (ANPD).
          </p>
        </Secao>

        <Secao id="cookies" n={9} titulo="Cookies">
          <p>O GenoLab usa um único cookie, essencial, para manter a sessão. Não usa cookies de terceiros, de análise ou de publicidade.</p>
        </Secao>

        <Secao id="mudancas" n={10} titulo="Mudanças nesta política">
          <p>
            Quando esta política mudar, a data da versão no topo será atualizada. A versão aceita no cadastro fica registrada na sua conta. O GenoLab é destinado a pesquisadores e estudantes e não é
            direcionado a crianças.
          </p>
        </Secao>

        <p className="text-sm text-muted">
          <Link className="underline" href="/cadastro">
            Criar conta
          </Link>{" "}
          ·{" "}
          <Link className="underline" href="/entrar">
            Entrar
          </Link>
        </p>
      </div>
    </div>
  );
}
