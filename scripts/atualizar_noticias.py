#!/usr/bin/env python3
"""
Atualiza data/noticias.json com as notícias de ciência do dia e as
publicações científicas mais recentes sobre os temas do GenoEvidence.

Roda sozinho todos os dias pelo GitHub Actions (.github/workflows/noticias.yml)
e também pode ser rodado à mão:  python3 scripts/atualizar_noticias.py

Não usa bibliotecas externas: só Python 3.
"""
import html
import json
import re
import sys
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from datetime import datetime, timedelta, timezone
from email.utils import parsedate_to_datetime
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
SAIDA = RAIZ / "data" / "noticias.json"
AGENTE = "Mozilla/5.0 (GenoEvidence; +https://carvalhothatc-a11y.github.io/genoevidence/)"

# Fontes de notícias. "filtro" = só entram itens com alguma dessas palavras.
FONTES = [
    # em português
    {"nome": "Agência FAPESP", "url": "https://agencia.fapesp.br/rss/", "idioma": "pt", "filtro": None},
    {"nome": "Revista Pesquisa FAPESP", "url": "https://revistapesquisa.fapesp.br/feed/", "idioma": "pt", "filtro": None},
    {"nome": "Agência Fiocruz", "url": "https://agencia.fiocruz.br/rss.xml", "idioma": "pt", "filtro": None},
    {"nome": "Jornal da Unicamp", "url": "https://jornal.unicamp.br/feed/", "idioma": "pt", "filtro": None},
    {"nome": "Jornal da USP", "url": "https://jornal.usp.br/feed/", "idioma": "pt",
     "filtro": ["saúde", "câncer", "gene", "genét", "dna", "célula", "doença", "tumor", "medicina", "biolog",
                "vacina", "hospital", "tratamento", "diagnóstico", "proteína", "paciente", "pesquisa", "cientist",
                "clima", "ambiente", "espécie", "planeta", "física", "química"]},
    # em inglês
    {"nome": "Nature", "url": "https://www.nature.com/nature.rss", "idioma": "en", "filtro": None},
    {"nome": "Nature · Genética", "url": "https://www.nature.com/subjects/genetics.rss", "idioma": "en", "filtro": None},
    {"nome": "New Scientist", "url": "https://www.newscientist.com/feed/home/", "idioma": "en", "filtro": None},
    {"nome": "Scientific American", "url": "https://www.scientificamerican.com/platform/syndication/rss/", "idioma": "en", "filtro": None},
    {"nome": "ScienceDaily", "url": "https://www.sciencedaily.com/rss/top/science.xml", "idioma": "en", "filtro": None},
    {"nome": "ScienceDaily · Saúde", "url": "https://www.sciencedaily.com/rss/top/health.xml", "idioma": "en", "filtro": None},
]

# Publicações científicas recentes (Europe PMC) sobre os temas do app.
# Busca só no título e no resumo, para vir apenas o que é realmente sobre esses temas.
# Temas dos artigos explicados no app: ao adicionar um artigo de outro assunto, acrescente termos aqui.
TERMOS_ARTIGOS = ["Li-Fraumeni", "TP53", "hereditary cancer", "cancer predisposition",
                  "germline variant", "germline variants",
                  "snake venom", "antivenom", "coral snake", "Micrurus"]
BUSCA_ARTIGOS = "(" + " OR ".join(f'TITLE_ABS:"{t}"' for t in TERMOS_ARTIGOS) + ")"

# Temas por palavras inteiras (ou início de palavra), para "gente" não virar "gene".
TEMAS = [
    ("Câncer", r"\b(câncer|cancer|cancers|tumor|tumores|tumour|oncolog\w*|carcinoma\w*|sarcoma\w*|leukemia|leucemia|lymphoma|linfoma|metast\w*)\b"),
    ("Genética", r"\b(genes?|genétic\w*|genetic\w*|genom\w*|dna|rna|mutation\w*|mutaç\w*|mutante\w*|variant\w*|hereditár\w*|hereditary|crispr|chromosom\w*|cromoss\w*|epigenet\w*|epigenét\w*)\b"),
    ("Saúde", r"\b(saúde|health|doenças?|diseases?|hospita\w*|tratamento\w*|treatments?|vacinas?|vaccines?|diagnós\w*|diagnos\w*|pacientes?|patients?|vírus|virus\w*|infec\w*|srag|gripe|dengue|medicin\w*)\b"),
    ("Meio ambiente", r"\b(clima\w*|climate|ambient\w*|environment\w*|biodivers\w*|espécies?|species|florest\w*|forests?|oceanos?|oceans?|seca|drought|el niño|aquecimento|warming|carbon\w*|poluiç\w*|pollution|animais?|animals?|plantas?|plants?|insetos?|insects?|abelhas?|bees?)\b"),
    ("Espaço", r"\b(espaço|space|planet\w*|galáxia\w*|galax\w*|estrelas?|stars?|nasa|astron\w*|universo|universe|lua|moon|marte|mars|telescóp\w*|telescope\w*|cosm\w*|asteroid\w*|buraco negro|black holes?)\b"),
]

NS = {
    "dc": "http://purl.org/dc/elements/1.1/",
    "rss1": "http://purl.org/rss/1.0/",
    "content": "http://purl.org/rss/1.0/modules/content/",
}


def baixar(url, timeout=25):
    req = urllib.request.Request(url, headers={"User-Agent": AGENTE, "Accept": "*/*"})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read()


def limpar(texto, limite=240):
    texto = html.unescape(re.sub(r"<[^>]+>", " ", texto or ""))
    texto = re.sub(r"\s+", " ", texto).strip()
    if len(texto) > limite:
        texto = texto[:limite].rsplit(" ", 1)[0].rstrip(",.;:") + "…"
    return texto


def data_iso(bruta, padrao):
    if not bruta:
        return padrao
    bruta = bruta.strip()
    try:
        return parsedate_to_datetime(bruta).astimezone(timezone.utc).isoformat()
    except (TypeError, ValueError):
        pass
    try:
        return datetime.fromisoformat(bruta.replace("Z", "+00:00")).astimezone(timezone.utc).isoformat()
    except ValueError:
        return padrao


def classificar(texto):
    t = texto.lower()
    for tema, padrao in TEMAS:
        if re.search(padrao, t):
            return tema
    return "Ciência"


def ler_feed(fonte, agora):
    raiz = ET.fromstring(baixar(fonte["url"]))
    itens = raiz.findall(".//item") or raiz.findall(".//rss1:item", NS)
    saida = []
    for it in itens:
        def campo(*nomes):
            for n in nomes:
                v = it.findtext(n, namespaces=NS)
                if v and v.strip():
                    return v.strip()
            return ""
        titulo = limpar(campo("title", "rss1:title"), 200)
        link = campo("link", "rss1:link")
        resumo = limpar(campo("description", "rss1:description", "content:encoded"))
        if not titulo or not link:
            continue
        if fonte["filtro"] and not any(p in (titulo + " " + resumo).lower() for p in fonte["filtro"]):
            continue
        saida.append({
            "tipo": "noticia",
            "titulo": titulo,
            "resumo": resumo,
            "url": link,
            "fonte": fonte["nome"],
            "idioma": fonte["idioma"],
            "data": data_iso(campo("pubDate", "dc:date"), agora),
            "tema": classificar(titulo + " " + resumo),
        })
    return saida


def ler_artigos(agora_dt):
    inicio = (agora_dt - timedelta(days=21)).strftime("%Y-%m-%d")
    fim = agora_dt.strftime("%Y-%m-%d")
    consulta = f"{BUSCA_ARTIGOS} AND FIRST_PDATE:[{inicio} TO {fim}] sort_date:y"
    url = ("https://www.ebi.ac.uk/europepmc/webservices/rest/search?"
           + urllib.parse.urlencode({"query": consulta, "format": "json", "pageSize": "40",
                                     "resultType": "lite"}))
    dados = json.loads(baixar(url))
    saida = []
    for r in dados.get("resultList", {}).get("result", []):
        titulo = limpar(r.get("title", ""), 220)
        revista = (r.get("journalTitle") or "").strip()
        if not titulo or not revista:
            continue
        doi = r.get("doi")
        link = f"https://doi.org/{doi}" if doi else f"https://europepmc.org/article/{r.get('source', 'MED')}/{r.get('id')}"
        autores = limpar(r.get("authorString", ""), 120)
        saida.append({
            "tipo": "artigo",
            "titulo": titulo,
            "autores": autores,
            "revista": revista,
            "data": data_iso(r.get("firstPublicationDate"), agora_dt.isoformat()),
            "doi": doi,
            "url": link,
            "acesso_aberto": r.get("isOpenAccess") == "Y",
            "tema": classificar(titulo),
        })
    return saida


def main():
    agora_dt = datetime.now(timezone.utc)
    agora = agora_dt.isoformat()
    anterior = {}
    if SAIDA.exists():
        try:
            anterior = json.loads(SAIDA.read_text(encoding="utf-8"))
        except ValueError:
            pass
    ja_vistas = {n["url"]: n["data"] for n in anterior.get("noticias", [])}
    noticias, erros = [], []
    for fonte in FONTES:
        try:
            itens = ler_feed(fonte, agora)
            for n in itens:  # fontes sem data (ex.: FAPESP) guardam o dia em que a notícia apareceu
                if n["url"] in ja_vistas and n["data"] == agora:
                    n["data"] = ja_vistas[n["url"]]
            noticias.extend(itens[:8])
            print(f"  {fonte['nome']}: {len(itens)} itens")
        except Exception as e:  # uma fonte fora do ar não derruba as outras
            erros.append(f"{fonte['nome']}: {e}")
            print(f"  {fonte['nome']}: ERRO {e}", file=sys.stderr)
    vistos, unicas = set(), []
    for n in sorted(noticias, key=lambda n: n["data"], reverse=True):
        chave = n["titulo"].lower()
        if chave not in vistos:
            vistos.add(chave)
            unicas.append(n)
    try:
        artigos = ler_artigos(agora_dt)
        print(f"  Europe PMC: {len(artigos)} artigos")
    except Exception as e:
        artigos = []
        erros.append(f"Europe PMC: {e}")
        print(f"  Europe PMC: ERRO {e}", file=sys.stderr)

    # se tudo falhar, mantém o conteúdo de ontem em vez de esvaziar a página
    if not unicas and anterior.get("noticias"):
        unicas = anterior["noticias"]
    if not artigos and anterior.get("artigos"):
        artigos = anterior["artigos"]

    SAIDA.parent.mkdir(parents=True, exist_ok=True)
    SAIDA.write_text(json.dumps({
        "atualizado_em": agora,
        "noticias": unicas[:60],
        "artigos": artigos[:30],
        "fontes": [f["nome"] for f in FONTES] + ["Europe PMC"],
        "erros": erros,
    }, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"Pronto: {len(unicas[:60])} notícias e {len(artigos[:30])} artigos em {SAIDA.relative_to(RAIZ)}")


if __name__ == "__main__":
    main()
