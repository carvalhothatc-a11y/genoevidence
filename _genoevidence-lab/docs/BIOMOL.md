# BioMol — biologia molecular no GenoLab

A área **Moléculas** (`/moleculas`) reúne as ferramentas de biologia molecular em cinco abas. Todas
seguem a mesma regra: o que é **dado** (estrutura depositada, coordenada medida) é separado do que é
**cálculo** (feito aqui, com método nomeado e testado) e do que é **ilustração** (esquema didático,
sempre com o selo "Ilustração didática").

| Aba | Rota | O que faz | Selo |
|---|---|---|---|
| Estruturas 3D | `/moleculas` | Procura por nome/gene/código PDB (como antes) e abre no visualizador novo; abre `.pdb`/`.cif` do computador | Visualização de dados |
| Sequências | `/moleculas/sequencias` | FASTA, validação, composição, GC, fitas, transcrição, tradução nos 6 quadros, ORFs, alinhamento, exportação | — (cálculo) |
| DNA e RNA | `/moleculas/acidos-nucleicos` | 1BNA e 1EHZ com pares de bases e antiparalelismo **medidos**; esquema 3D da sequência da pessoa | Dados / Ilustração |
| Processos | `/moleculas/processos` | Replicação, transcrição e tradução animadas, sincronizadas com a sequência | Ilustração didática |
| Comparar estruturas | `/moleculas/comparar` | Superposição por alinhamento de sequência, RMSD, desvio por par | Visualização de dados |

## O que sai do navegador

- **Nada**, na análise de sequências, no esquema 3D e nos processos: é tudo calculado no navegador.
  As sequências coladas ficam só na aba (sessionStorage) e saem ao fechar a aba ou sair da conta.
- **Arquivos `.pdb`/`.cif` do computador** são lidos no navegador e não são enviados.
- **Código PDB** (4 caracteres) vai ao RCSB, pelo servidor do GenoLab (`/api/moleculas/estrutura`).
- **Busca de estrutura parecida**: a sequência de aminoácidos vai ao RCSB PDB
  (`/api/moleculas/sequencia`) **só depois de a pessoa confirmar** num aviso que diz para onde vai e
  o que sai. Nome, projeto e DNA não saem.

## Fontes de dados e métodos

| Coisa | De onde vem | Arquivo |
|---|---|---|
| 27 códigos genéticos | NCBI `gc.prt` 4.6, gerado por script | `src/lib/biomol/tabelas-ncbi.ts`, `scripts/biomol/gerar-tabelas-ncbi.py` |
| BLOSUM62 | NCBI `blast/matrices/BLOSUM62`, gerado por script | `src/lib/biomol/blosum62.ts`, `scripts/biomol/gerar-blosum62.py` |
| Alinhamento | Needleman–Wunsch (global) e Smith–Waterman (local), lacunas afins de Gotoh; padrões do EMBOSS needle | `src/lib/biomol/alinhamento.ts` |
| ORFs | Primeiro início depois de uma parada até a parada seguinte; mínimo padrão 75 nt (NCBI ORFfinder) | `src/lib/biomol/sequencias.ts` |
| Superposição | Quatérnio de Horn (equivalente a Kabsch), sem espelhamento | `src/lib/biomol/geometria.ts` |
| Correspondência para RMSD | Alinhamento das sequências das cadeias; Cα (proteína) ou C4' (ácido nucleico) | `src/lib/biomol/comparar.ts` |
| Pares de bases | Bases complementares com N1(purina)–N3(pirimidina) ≤ 3,3 Å | `src/lib/biomol/estrutura.ts` |
| Antiparalelismo | Projeção do sentido 5'→3' de cada fita no eixo local da hélice | `src/lib/biomol/estrutura.ts` |
| Hélice esquemática | Medidas médias da forma B (3,38 Å/par, 10,5 pares/volta) | `src/lib/biomol/helice.ts` |
| Busca por sequência | Serviço de sequência do RCSB (MMseqs2), identidade ≥ 30%, e-value ≤ 0,1, mínimo 10 aa | `src/lib/assistant/ferramentas/moleculas.ts` |
| Visualizador | Mol* 5.12 (Sehnal et al., NAR 2021), unidade assimétrica, modelo 1 | `src/components/biomol/visor/` |

## Como foi validado

Testes de unidade (`npm test`), todos com referência **externa** ao código testado:

- **Sequências** (`tests/unit/biomol-sequencias.test.ts`): exemplos do *Biopython Tutorial* (complemento,
  reverso-complemento, transcrição, tradução nas tabelas 1 e 2, GC = 46,875%); códons de parada e
  início de cada tabela do NCBI; ORFs nas duas fitas; exemplo fictício = Met + crambina (PDB 1CRN).
- **Alinhamento** (`biomol-alinhamento.test.ts`): GCATGCU × GATTACA = 0 (Needleman–Wunsch);
  TGTTACGG × GGTTGACTA = 13 (Smith–Waterman, exemplo clássico); **busca exaustiva**: para milhares de
  pares curtos, a pontuação devolvida é a melhor entre todos os alinhamentos possíveis; a pontuação é
  recalculável a partir do alinhamento; BLOSUM62 idêntica à do Mol*. Erros plantados de propósito no
  algoritmo (custo de lacuna, desempate) são pegos pelos testes.
- **Estrutura e geometria** (`biomol-estrutura.test.ts`), com valores calculados **à parte em numpy**:
  ponte dissulfeto Cys3–Cys40 da 1CRN = 2,004 Å; N–CA–C do resíduo 10 = 111,248°; φ/ψ/ω do resíduo 10
  = −63,19°/−43,30°/−179,81°; RMSD de Cα 1CRN × 1EJG = 0,105598 Å; 1BNA tem os 12 pares A1·B24 … A12·B13
  e fitas antiparalelas (e a medida acusa "paralelas" se a ordem de uma fita for invertida);
  superposição igual à do Mol* aplicando a transformação dele; nunca espelha.
- **Processos** (`biomol-processos.test.ts`): o fim de cada animação é igual ao resultado da aba
  Sequências; a fita líder cresce sem buracos no sentido da forquilha; os fragmentos de Okazaki crescem
  no sentido oposto; a cadeia polipeptídica cresce de um em um e termina igual à tradução.

Testes de ponta a ponta (rodar a partir da pasta da instância de teste, com a conta fictícia):

```
node scripts/e2e-biomol-sequencias.mjs <base> <arquivo-senha> <pasta-capturas>
node scripts/e2e-biomol-visor.mjs      <base> <arquivo-senha> <pasta-capturas>
node scripts/e2e-biomol-3d.mjs         <base> <arquivo-senha> <pasta-capturas>
```

O do visualizador mede pela interface (escolhendo átomos pela lista) a ponte dissulfeto, o ângulo e o
φ da 1CRN e confere com os valores do numpy até a 3ª casa.

## Limitações (escritas também na tela)

- O RMSD vale para os pares usados; com identidade baixa (< 30%) a correspondência pode estar errada,
  e a tela avisa. Não há alinhamento estrutural (TM-align) nem descarte de pares discrepantes.
- Pares de bases não canônicos (G·U, Hoogsteen) não são listados.
- A hélice da sequência digitada é esquema com medidas médias; o RNA aparece esticado, sem dobramento.
- Processos: sem promotor, fatores, topoisomerase, SSB, processamento de RNA ou wobble; tamanhos fora
  de escala. A lista completa está em `SIMPLIFICACOES` (`src/lib/biomol/processos.ts`).
- Arquivos acima de 15 MB abrem no 3D, mas sem lista de resíduos nem cálculos próprios.
