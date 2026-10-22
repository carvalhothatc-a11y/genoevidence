# Caderno de laboratório

Aba `Caderno` (`/caderno`). Um registro por dia de bancada: o que a pessoa fez, no dia em que fez.

É a peça que faltava entre "fazer" (área de trabalho) e "guardar" (projetos). O que se perde num
TCC não costuma ser o resultado bonito — é a anotação do dia em que algo deu errado, que ninguém
escreveu em lugar nenhum.

## Duas regras que valem para tudo aqui

**1. Não exige projeto.** O registro é da pessoa, não de um projeto. Ligar a um projeto é opcional e
pode ser feito depois. Exigir que alguém crie e nomeie um projeto antes de escrever o que fez hoje
é o jeito mais certo de perder o registro.

**2. Nada é reescrito em silêncio.** Toda edição guarda a versão anterior, e o cartão do dia mostra
"editado 2 vezes". Um caderno que pode ser alterado sem deixar rastro não serve como registro — e é
para servir de registro que ele existe. A versão **original** nunca é descartada: quando o limite de
versões estoura, saem as do meio.

## O que cada tela diz

| Momento | Texto |
|---|---|
| Vazio | "Nenhum registro ainda. O caderno guarda o que aconteceu em cada dia de bancada — inclusive o que deu errado, que é o que costuma sumir." |
| Botão | "Registrar o dia" |
| Ao editar | "A versão anterior continua guardada. Um caderno que pode ser reescrito em silêncio não serve como registro." |
| Ao excluir | "Excluir o registro de quinta, 9 de outubro de 2026?" · "Some do caderno junto com as versões anteriores e os arquivos do dia. Isso não tem volta." · botões **Excluir o registro** / **Manter** |
| Falha ao salvar | "O registro não foi salvo. […] O que você escreveu continua aqui na tela — tente de novo." |

O texto digitado **nunca** é descartado por causa de uma falha de rede: o formulário continua
preenchido.

## Arquivos do dia

Fotos, tabelas e relatórios (PNG, JPG, WebP, PDF, DOCX, CSV, TSV, XLSX, TXT, MD), até 12 por dia.

Ficam **no caderno da pessoa, neste servidor**, e não são enviados a nenhum serviço externo. São
servidos por `/api/caderno/[id]/arquivos/[arquivoId]`: imagem abre na página, o resto baixa como
anexo, sempre com `Cache-Control: private, no-store` e `X-Content-Type-Options: nosniff`.

O tipo é conferido pela **extensão e pela assinatura dos bytes** (`checkUpload`), não pelo que o
navegador diz. O nome enviado é só rótulo exibido: no disco o arquivo é um id aleatório.

## Um caderno não enxerga o outro

O identificador do usuário entra no **caminho do arquivo**:
`<LAB_DATA_DIR>/caderno/<userId>/registros/<id>.json`.

Não existe consulta que atravesse contas. O registro de outra pessoa não é "negado" — ele não
existe para esta sessão (404), sem revelar que existe. Identificadores fora do formato esperado são
recusados antes de virar caminho.

Quando a administração exclui uma conta, o caderno vai junto
(`apagarCadernoDaConta`, chamado em `/api/admin/contas/[contaId]`). Sem isso, o caderno ficaria
órfão no disco depois de a conta sumir — e é por isso que o teste de privacidade planta um registro
antes de excluir a conta e confere que ele desapareceu.

## O dia é um dia, não um instante

A data é `YYYY-MM-DD` no calendário **local**, não um instante UTC. Isso evita o erro clássico de
`new Date("2026-10-09")` virar 8 de outubro em fuso negativo: `diaPorExtenso()` monta a data pelos
componentes, sem passar por UTC.

## Verificado de verdade

`scripts/e2e-caderno.mjs` — 25 conferências na instância de demonstração:

- a aba aparece no menu e a página abre; o estado vazio explica para que serve;
- registrar funciona **sem projeto nenhum**, e o registro sobrevive ao recarregamento;
- a foto anexada aparece, carrega e é servida pelo próprio GenoLab;
- editar avisa sobre a versão anterior, o cartão passa a dizer "editado 1 vez" e a versão antiga
  está guardada **por inteiro**;
- a confirmação de exclusão **nomeia o dia**, diz que leva as versões junto, e o botão de recusa diz
  "Manter";
- sem sessão, as rotas não respondem; dia em branco é recusado na tela **e** na API;
- celular sem rolagem horizontal; sem violação de CSP; sem erro no console.

Unidade: `tests/unit/caderno.test.ts` (datas, validação) e `tests/unit/caderno-store.test.ts`
(versões, isolamento entre contas, arquivos).

`scripts/teste-privacidade.mjs` cobre o apagamento do caderno junto com a conta.

## Ditar e enviar por e-mail

Dá para **falar o registro** em vez de digitar, e **mandar o dia para o seu próprio e-mail** ao
terminar. Ver [EMAIL-E-DITADO.md](EMAIL-E-DITADO.md).

## Limites conhecidos

- O caderno é individual: não há caderno compartilhado de equipe, nem comentário de orientador.
- A busca é visual (rolagem pela lista). Não há filtro por texto nem por intervalo de datas.
- O vínculo com experimento existe no modelo de dados, mas a interface só oferece vínculo com
  **projeto** por enquanto.
- Não há exportação (PDF/impressão) do caderno.
