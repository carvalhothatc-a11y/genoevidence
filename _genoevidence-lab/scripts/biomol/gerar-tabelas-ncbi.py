"""Gera src/lib/biomol/tabelas-ncbi.ts a partir do arquivo oficial do NCBI.

Uso:
    curl -sS -o gc.prt https://ftp.ncbi.nlm.nih.gov/entrez/misc/data/gc.prt
    python3 scripts/biomol/gerar-tabelas-ncbi.py gc.prt src/lib/biomol/tabelas-ncbi.ts
"""
import re, sys, json, hashlib
src = open(sys.argv[1]).read()
blocks = re.findall(r'\{(.*?)\n \}', src, re.S)
tabelas = []
for b in blocks:
    names = re.findall(r'name "([^"]+)"', b.replace('\n', ' '))
    # o nome que vem quebrado em duas linhas
    nm = re.search(r'name\s+"(.*?)"\s*,', b, re.S)
    nome = re.sub(r'\s+', ' ', nm.group(1)).strip()
    i = int(re.search(r'\bid (\d+)', b).group(1))
    aa = re.search(r'ncbieaa\s+"([^"]+)"', b).group(1)
    st = re.search(r'sncbieaa "([^"]+)"', b).group(1)
    assert len(aa) == 64 and len(st) == 64, i
    tabelas.append((i, nome, aa, st))
sha = hashlib.sha256(src.encode()).hexdigest()[:16]
out = []
out.append('/**')
out.append(' * Códigos genéticos do NCBI, GERADOS a partir do arquivo oficial gc.prt (versão 4.6),')
out.append(' * https://ftp.ncbi.nlm.nih.gov/entrez/misc/data/gc.prt — baixado em 2026-10-23, sha256 ' + sha + '….')
out.append(' *')
out.append(' * Não edite à mão. A ordem dos 64 códons é a do NCBI: primeira base TCAG, segunda TCAG, terceira TCAG')
out.append(' * (TTT, TTC, TTA, TTG, TCT, …). `aa` traz o aminoácido de cada códon ("*" = parada); `inicios` marca')
out.append(' * com "M" os códons que a tabela aceita como início (e com "*" as paradas).')
out.append(' */')
out.append('export type TabelaNcbi = { id: number; nome: string; aa: string; inicios: string };')
out.append('')
out.append('export const TABELAS_NCBI: readonly TabelaNcbi[] = [')
for i, n, aa, st in tabelas:
    out.append('  { id: %d, nome: %s, aa: "%s", inicios: "%s" },' % (i, json.dumps(n, ensure_ascii=False), aa, st))
out.append('];')
open(sys.argv[2], 'w').write('\n'.join(out) + '\n')
print(len(tabelas), [t[0] for t in tabelas])
