# Enviar o dia por e-mail, e ditar em vez de escrever

Duas adições ao [Caderno](CADERNO.md): falar o registro em vez de digitar, e mandar o dia para o
seu próprio e-mail ao terminar.

## Ditar o registro

Botão **“Falar em vez de escrever”** no formulário do dia.

O que a tela diz, **antes** de gravar — porque muda o que você deve falar em voz alta:

- o microfone **só liga quando você clica**, e desliga sozinho em 2 minutos;
- o GenoLab **não guarda áudio**: recebe o texto já reconhecido pelo navegador;
- **no Chrome, quem reconhece a fala é o Google** — o áudio passa por lá.

O texto ditado é **acrescentado** ao que já está escrito, nunca substitui. Dá para digitar um
pedaço, falar o resto, e corrigir no fim.

Navegadores sem reconhecimento de voz (Firefox, Safari) mostram um aviso explicando, em vez de
esconder o botão sem dizer nada.

## Enviar o dia por e-mail

Botão no cartão do dia, junto de **Baixar o registro**.

### O destinatário é sempre você

A rota lê o endereço **da sessão**. Ele nunca vem no pedido. Mandar
`{"para": "outra@pessoa.com"}` não muda nada — um teste garante isso.

Essa decisão não é detalhe: sem ela, o caderno viraria um jeito de disparar mensagem para
terceiros a partir do servidor do GenoLab.

### O que vai no e-mail

O texto do dia **inteiro, sem resumo e sem reescrita**. Um caderno de laboratório vale pelo que foi
escrito na hora; um resumo automático apagaria justamente a hesitação e a ressalva que dão valor ao
registro depois.

Vão junto: a data por extenso, a lista dos arquivos do dia (com o aviso de que **não vão
anexados** — eles ficam no servidor, onde o acesso é conferido) e, se o registro tiver sido
editado, quantas vezes.

O HTML escapa o que você escreveu: nada de injeção pelo caderno.

### Quando o envio não está configurado

O botão **não finge enviar**. Ele abre o seu próprio programa de e-mail com destinatário, assunto e
corpo prontos, para você conferir e apertar enviar. A tela diz qual dos dois está ativo.

É a diferença entre uma integração que existe e um botão que parece existir.

## Como ligar o envio automático

1. Criar conta no [Resend](https://resend.com) **com o e-mail que vai receber os registros**.
2. Gerar uma chave de API (começa com `re_`).
3. Guardar a chave no servidor, em `.env.production`:
   ```
   RESEND_API_KEY=re_...
   ```
4. Reconstruir: `docker compose up -d --build`.

Sem mais nada, o GenoLab envia de `onboarding@resend.dev`, o endereço de teste do Resend, que
funciona **sem configurar DNS**. A restrição: ele **só entrega para o e-mail da conta do Resend**.
Como aqui cada pessoa recebe no próprio endereço, isso basta para quem criou a conta — e falha, com
mensagem explicando, para qualquer outra.

### Para enviar a outras pessoas

Aí é preciso domínio verificado:

1. Adicionar o domínio no Resend e criar no DNS da Hostinger os registros que ele indicar
   (SPF e DKIM).
2. Definir o remetente:
   ```
   EMAIL_REMETENTE=GenoLab <caderno@genoevidence.com>
   ```

> **Por que não enviar direto do servidor.** Conferido em 21/10/2026: o genoevidence.com **não tem
> MX nem SPF**. Mensagem saída da VPS dizendo ser do domínio seria tratada como falsificação — e
> corretamente. Cairia em spam ou seria recusada, e só se descobriria quando o e-mail importante
> não chegasse.

## Limites e proteções

| | |
|---|---|
| Envios por pessoa | 10 por hora |
| Plano gratuito do Resend | 100 por dia, 3.000 por mês |
| Destinatário | sempre o e-mail da sessão |
| Arquivos | **não** são anexados |

## Verificado de verdade

`scripts/e2e-caderno-email.mjs` — 21 conferências, **sem enviar e-mail de verdade**:

- o microfone **não liga** só por abrir o formulário, e liga **só** no clique;
- ao parar, desliga; o ditado é **acrescentado** e o texto anterior permanece;
- os três avisos (não guarda áudio, 2 minutos, Google no Chrome) aparecem **antes** de gravar;
- sem envio configurado, a tela oferece abrir o seu e-mail e **não** mostra um botão que fingiria
  enviar;
- a rota recusa dizendo **a causa real** (`RESEND_API_KEY` ausente), não "falhou";
- endereço de terceiro no pedido **não** vira destinatário;
- registro que não é seu dá 404; sem sessão, nada responde.

O reconhecimento de voz é simulado no teste: o navegador sem interface não traz motor de fala, e o
que precisa ser testado é **o nosso código** — quando o microfone liga, o que aparece na tela, e
que o ditado seja acrescentado.

Unidade: `tests/unit/email.test.ts` (12 casos, serviço simulado — inclusive a mensagem específica do
modo de teste) e `tests/unit/caderno-email.test.ts` (9 casos do corpo da mensagem).

## O que NÃO foi testado

**O envio real com uma chave do Resend.** Não há chave neste ambiente, e eu não crio conta em nome
de ninguém. O formato do pedido e todas as mensagens de falha estão cobertos por teste com o
serviço simulado; a primeira entrega de verdade só acontece quando a chave existir.
