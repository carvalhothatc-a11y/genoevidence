#!/usr/bin/env python3
"""
Atualiza data/noticias.json com as notícias de ciência do dia e as
publicações científicas mais recentes sobre os temas do GenoEvidence.

Roda sozinho todos os dias pelo GitHub Actions (.github/workflows/noticias.yml)
e também pode ser rodado à mão:  python3 scripts/atualizar_noticias.py

Notícias e publicações em inglês são traduzidas para o português pelo serviço
gratuito MyMemory (api.mymemory.translated.net). As traduções ficam guardadas em
data/traducoes.json, para não traduzir o mesmo texto de novo no dia seguinte.
Se a tradução falhar, o texto fica em inglês e o app mostra a etiqueta "EN".

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
TRADUCOES = RAIZ / "data" / "traducoes.json"
# O MyMemory gratuito permite cerca de 5.000 caracteres por dia; ficamos abaixo disso.
ORCAMENTO_TRADUCAO = 4600
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

# ---------- relevância: o app mostra só as notícias mais importantes do dia ----------
# Pontos por assunto em alta (câncer, vacinas, clima, IA, Nobel, saúde...), por fonte e por ser recente.
INTERESSE = [
    (r"\b(câncer|cancer|cancers|tumor\w*|leucemia|leukemia)\b", 4),
    (r"\b(vacina\w*|vaccin\w*|imuniza\w*)\b", 4),
    (r"\b(nobel)\b", 3),
    (r"\b(covid|pandemi\w*|epidemi\w*|vírus|virus|dengue|gripe|influenza|sarampo|measles|mpox|bactéria\w*|bacteri\w*)\b", 2),
    (r"\b(clima\w*|climate|el niño|la niña|aquecimento|warming|seca|drought|enchente\w*|flood\w*|calor extremo|heatwave\w*)\b", 2),
    (r"\b(inteligência artificial|artificial intelligence|openai|chatgpt|ia|ai)\b", 2),
    (r"\b(genétic\w*|genetic\w*|dna|genes?|genoma|genome|crispr|hereditár\w*)\b", 2),
    (r"\b(alzheimer|demência|dementia|autism\w*|autis\w*|obesidade|obesity|diabetes|ozempic|glp-1|infarto|heart attacks?|avc|stroke|sono|sleep)\b", 2),
    (r"\b(brasil\w*|brazil\w*|sus|amazôn\w*|amazon|fiocruz|butantan)\b", 2),
    (r"\b(saúde|health|doenças?|diseases?|tratamento\w*|treatments?|remédios?|medicamento\w*|drugs?|pacientes?|patients?)\b", 1),
]
EVITAR = r"\b(crossword|quiz|podcast|daily briefing|book review|resenha|obituar\w*|horóscopo|sponsored|patrocinado)\b"
# avisos institucionais (eventos, inscrições, painéis) não são notícia de ciência para o leitor
INSTITUCIONAL = r"\b(participa|inscriç\w*|seminário\w*|congresso\w*|webinar\w*|workshop\w*|palestra\w*|chamada\w*|reunirá|edição impressa|nova edição|ranking\w*|melhores do mundo|folheie|baixe a edição|residência artística|espetáculo\w*|exposição|concerto\w*|linha do tempo|aniversário|comemora\w*|marcas de um instituto|edita(l|is)|painel|eleiç\w*|eleic\w*|posse|homenage\w*|premiaç\w*)\b"
PESO_FONTE = {"pt": 4}
PESO_FONTE_NOME = {"Nature": 1, "New Scientist": 1, "Scientific American": 1}
TOTAL_PT, TOTAL_EN, POR_FONTE_PT, POR_FONTE_EN = 8, 7, 3, 2
MINIMO = 3  # abaixo disso a notícia não entra: melhor mostrar menos do que mostrar notícia fraca


def chave_titulo(n):
    import unicodedata
    t = unicodedata.normalize("NFD", n.get("titulo_original") or n["titulo"]).encode("ascii", "ignore").decode().lower()
    return " ".join(re.findall(r"[a-z0-9]+", t))


def relevancia(n, agora_dt, mostradas=None):
    texto = (n["titulo"] + " " + n.get("resumo", "")).lower()
    pontos = sum(peso for padrao, peso in INTERESSE if re.search(padrao, texto))
    pontos += PESO_FONTE.get(n["idioma"], 0) + PESO_FONTE_NOME.get(n["fonte"], 0)
    try:
        horas = (agora_dt - datetime.fromisoformat(n["data"])).total_seconds() / 3600
    except ValueError:
        horas = 999
    pontos += 3 if horas < 24 else 2 if horas < 48 else 1 if horas < 72 else -3 if horas > 24 * 7 else 0
    if re.search(EVITAR, texto):
        pontos -= 5
    if re.search(INSTITUCIONAL, (n["titulo"] + " " + n.get("resumo", "")[:90]).lower()):
        pontos -= 10  # aviso institucional: fica de fora
    if not n.get("resumo"):
        pontos -= 1
    # notícia que já apareceu em dias anteriores (mesmo republicada por outra fonte) sai do topo
    visto = (mostradas or {}).get(chave_titulo(n))
    if visto:
        try:
            if (agora_dt - datetime.fromisoformat(visto)).total_seconds() > 18 * 3600:
                pontos -= 6
        except ValueError:
            pass
    return pontos


def selecionar(noticias, agora_dt, mostradas=None):
    """Escolhe as mais relevantes: 8 de fontes brasileiras e 7 internacionais, sem repetir muito a mesma fonte."""
    for n in noticias:
        n["relevancia"] = relevancia(n, agora_dt, mostradas)
    ordem = sorted(noticias, key=lambda n: (n["relevancia"], n["data"]), reverse=True)
    escolhidas = []
    palavras = lambda n: set(re.findall(r"[a-zà-ú0-9]{5,}", (n.get("titulo_original", n["titulo"]) + " " + n.get("resumo_original", n.get("resumo", ""))).lower()))
    parecida = lambda n, lista: any(len(palavras(n) & palavras(x)) >= 4 for x in lista)
    for idioma, total, por_fonte in (("pt", TOTAL_PT, POR_FONTE_PT), ("en", TOTAL_EN, POR_FONTE_EN)):
        cont, pegas = {}, []
        for n in ordem:
            if n["idioma"] != idioma or n["relevancia"] < MINIMO or cont.get(n["fonte"], 0) >= por_fonte or parecida(n, pegas):
                continue  # mesmo assunto de outra notícia já escolhida
            cont[n["fonte"]] = cont.get(n["fonte"], 0) + 1
            pegas.append(n)
            if len(pegas) == total:
                break
        escolhidas += pegas
    return sorted(escolhidas, key=lambda n: (n["relevancia"], n["data"]), reverse=True)


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


class Tradutor:
    """Traduz do inglês para o português, com memória e limite diário de caracteres."""

    def __init__(self):
        self.memoria = {}
        if TRADUCOES.exists():
            try:
                self.memoria = json.loads(TRADUCOES.read_text(encoding="utf-8"))
            except ValueError:
                pass
        self.usadas = {}
        self.gasto = 0
        self.parou = False

    def __call__(self, texto):
        texto = (texto or "").strip()
        if not texto:
            return None
        if texto in self.memoria:
            self.usadas[texto] = self.memoria[texto]
            return self.memoria[texto]
        if self.parou or self.gasto + len(texto) > ORCAMENTO_TRADUCAO:
            return None
        url = ("https://api.mymemory.translated.net/get?"
               + urllib.parse.urlencode({"q": texto[:480], "langpair": "en|pt-BR"}))
        try:
            dados = json.loads(baixar(url, timeout=20))
        except Exception as e:
            print(f"  Tradução: ERRO {e}", file=sys.stderr)
            self.parou = True
            return None
        pt = html.unescape((dados.get("responseData") or {}).get("translatedText") or "").strip()
        if dados.get("responseStatus") != 200 or dados.get("quotaFinished") or not pt or "MYMEMORY WARNING" in pt.upper():
            self.parou = True
            return None
        self.gasto += len(texto)
        self.memoria[texto] = self.usadas[texto] = pt
        return pt

    def salvar(self):
        # guarda só o que foi usado hoje, para o arquivo não crescer sem parar
        TRADUCOES.write_text(json.dumps(self.usadas, ensure_ascii=False, indent=0), encoding="utf-8")


def traduzir(noticias, artigos):
    """Títulos primeiro (notícias e publicações), depois os resumos das notícias."""
    t = Tradutor()
    ingles = [n for n in noticias if n.get("idioma") == "en"]
    for n in ingles:
        pt = t(n.get("titulo_original") or n["titulo"])
        if pt:
            n["titulo_original"] = n.get("titulo_original") or n["titulo"]
            n["titulo"], n["traduzido"] = pt, True
    for a in artigos:
        pt = t(a.get("titulo_original") or a["titulo"])
        if pt:
            a["titulo_original"] = a.get("titulo_original") or a["titulo"]
            a["titulo"], a["traduzido"] = pt, True
    for n in ingles:
        if n.get("traduzido") and n.get("resumo"):
            pt = t(n.get("resumo_original") or n["resumo"])
            if pt:
                n["resumo_original"] = n.get("resumo_original") or n["resumo"]
                n["resumo"] = pt
    t.salvar()
    feitos = sum(1 for x in ingles + artigos if x.get("traduzido"))
    print(f"  Tradução: {feitos} de {len(ingles) + len(artigos)} itens em inglês traduzidos ({t.gasto} caracteres novos)")


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
        resumo = re.sub(r"^Nature, Published online: [^;]+; doi:\S+\s*", "", resumo)  # tira o cabeçalho da Nature
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
            # fontes em inglês trazem menos itens, para caber no limite diário de tradução
            noticias.extend(itens[:8] if fonte["idioma"] == "pt" else itens[:5])
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
    # memória das notícias já mostradas (últimos 10 dias), para o topo mudar todo dia
    mostradas = dict(anterior.get("mostradas", {}))
    for n in anterior.get("noticias", []):
        mostradas.setdefault(chave_titulo(n), anterior.get("atualizado_em", agora))
    unicas, artigos = selecionar(unicas, agora_dt, mostradas), artigos[:30]
    for n in unicas:
        mostradas.setdefault(chave_titulo(n), agora)
    limite = (agora_dt - timedelta(days=10)).isoformat()
    mostradas = {k: v for k, v in mostradas.items() if v >= limite}
    traduzir(unicas, artigos)
    # se a lista não mudou desde a última vez, não grava (o robô roda de hora em hora)
    if anterior.get("noticias") and [n["url"] for n in unicas] == [n["url"] for n in anterior["noticias"]] \
            and [a.get("url") for a in artigos] == [a.get("url") for a in anterior.get("artigos", [])]:
        print("Nada novo desde a última atualização; o arquivo fica como está.")
        return
    SAIDA.write_text(json.dumps({
        "atualizado_em": agora,
        "noticias": unicas,
        "artigos": artigos,
        "fontes": [f["nome"] for f in FONTES] + ["Europe PMC"],
        "erros": erros,
        "mostradas": mostradas,
    }, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"Pronto: {len(unicas)} notícias e {len(artigos)} artigos em {SAIDA.relative_to(RAIZ)}")


if __name__ == "__main__":
    main()
