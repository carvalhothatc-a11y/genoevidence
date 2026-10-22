# GenoGame · prepara as poses do Geninho (imagens de Thaisa Carvalho, 1254 × 1254 px, fundo transparente)
# para o jogo: recorta as partes que se mexem, prolonga o que fica escondido sob a manga e o corpo e grava
# as camadas em genogame/img/gp-*.webp. Também grava as versões com EPI (luvas, sapatos, óculos e presilha).
#
# Uso: python3 scripts/genogame/poses.py scripts/genogame/poses genogame/img [pasta-de-conferencia]
#
# Coordenadas sempre na imagem original (1254 px). As articulações usadas pelo genogame/geninho.js estão em POSES
# (no fim deste arquivo, impressas como JSON ao terminar).
import sys, os, json
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ORIG, DEST = sys.argv[1], sys.argv[2]
CONF = sys.argv[3] if len(sys.argv) > 3 else None
ESC = 0.4            # 1254 px → 502 px (o Geninho tem ~190 unidades no jogo; sobra resolução para telas de alta densidade)
N = 1254
ARQ = {
    "frente": "01_Geninho_Frente_Patas_Abaixadas.png",
    "ladoD": "02_Geninho_Tres_Quartos_Direita.png",
    "ladoE": "04_Geninho_Tres_Quartos_Esquerda.png",
    "costas": "07_Geninho_Costas.png",
    "andar": "08_Geninho_Caminhando.png",
    "alcanca": "09_Geninho_Alcancando_Objeto.png",
}
yy, xx = np.mgrid[0:N, 0:N].astype(np.float32)


def carregar(nome):
    A = np.array(Image.open(os.path.join(ORIG, ARQ[nome])).convert("RGBA")).astype(np.float32)
    return A[..., :3].copy(), A[..., 3] / 255.0


def lilas(rgb, a):
    """pelo lilás (inclui as sombras escuras do pelo); o jaleco e a barriga são creme"""
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    lum = (r + g + b) / 3
    return ((((b - g) > 5) & ((r - b) < 28)) | (lum < 85)) & (a > 0.04)


def poligono(pts):
    im = Image.new("L", (N, N), 0)
    ImageDraw.Draw(im).polygon([tuple(p) for p in pts], fill=255)
    return np.array(im).astype(np.float32) / 255.0


def borrar(m, r):
    im = Image.fromarray((np.clip(m, 0, 1) * 255).astype(np.uint8))
    return np.array(im.filter(ImageFilter.GaussianBlur(r))).astype(np.float32) / 255.0


def suave(m, r=1.2):
    """máscara binária → bordas suaves (sem perder o miolo)"""
    return np.maximum(borrar(m, r) * (borrar(m, r) > 0.02), 0) if r else m


def vizinhos_media(rgb, peso):
    """média ponderada dos 8 vizinhos (para preencher buracos e prolongar camadas)"""
    acc = np.zeros_like(rgb); w = np.zeros(peso.shape, np.float32)
    for dy in (-1, 0, 1):
        for dx in (-1, 0, 1):
            if dx == 0 and dy == 0: continue
            p = np.roll(np.roll(peso, dy, 0), dx, 1)
            acc += np.roll(np.roll(rgb, dy, 0), dx, 1) * p[..., None]; w += p
    return acc, w


def prolongar(rgb, alfa, regiao, passos, fonte=None):
    """faz a camada crescer para dentro de 'regiao' (onde ela fica escondida), copiando a cor da borda.
    fonte: só esses pixels servem de cor de partida (ex.: só o pelo, sem o branco da manga)"""
    rgb = rgb.copy(); alfa = alfa.copy()
    base = (alfa > 0.5) if fonte is None else ((alfa > 0.5) & fonte)
    for _ in range(passos):
        cheio = base.astype(np.float32)
        acc, w = vizinhos_media(rgb * cheio[..., None], cheio)
        novo = (w > 0) & (cheio == 0) & (regiao > 0)
        if not novo.any(): break
        rgb[novo] = acc[novo] / w[novo][..., None]; alfa[novo] = 1.0; base = base | novo
    return rgb, alfa


def tapar(rgb, alfa, buraco, passos=400):
    """preenche um buraco dentro do corpo com as cores ao redor (difusão)"""
    alfa = alfa.copy()
    conhecido = ((alfa > 0.6) & (buraco == 0)).astype(np.float32)
    cor = rgb * conhecido[..., None]          # só para calcular as médias; fora do buraco a cor original fica
    for _ in range(passos):
        acc, w = vizinhos_media(cor, conhecido)
        novo = (w > 0) & (buraco > 0)
        cor[novo] = acc[novo] / w[novo][..., None]
        conhecido = np.maximum(conhecido, novo.astype(np.float32) * 0.999)
        if conhecido[buraco > 0].min() > 0.5: break
    saida = np.where(buraco[..., None] > 0, cor, rgb)
    alfa = np.where(buraco > 0, 1.0, alfa)
    return saida, alfa


def salvar(nome, rgb, a):
    A = np.dstack([np.clip(rgb, 0, 255), np.clip(a, 0, 1) * 255]).astype(np.uint8)
    im = Image.fromarray(A, "RGBA").convert("RGBa").resize((round(N * ESC), round(N * ESC)), Image.LANCZOS).convert("RGBA")
    im.save(os.path.join(DEST, "gp-" + nome + ".webp"), "WEBP", quality=88, method=6)
    return im


conferencia = {}


def conferir(nome, rgb, camadas):
    """imagem de conferência: cada camada tingida de uma cor sobre a pose"""
    if not CONF: return
    cores = [(255, 80, 80), (80, 200, 80), (80, 120, 255), (255, 180, 0), (200, 0, 200), (0, 200, 200), (120, 60, 20), (255, 120, 200), (90, 90, 90)]
    base = Image.new("RGB", (N, N), (235, 235, 235))
    for i, (k, (crgb, ca)) in enumerate(camadas):
        cor = np.array(cores[i % len(cores)], np.float32)
        mix = crgb * 0.55 + cor * 0.45
        lay = Image.fromarray(np.dstack([mix, ca * 255]).astype(np.uint8), "RGBA")
        base.paste(lay, (0, 0), lay)
    base.resize((627, 627)).save(os.path.join(CONF, "conf-" + nome + ".jpg"), quality=85)


# ------------------------------------------------------------------ EPI (luvas, sapatos, óculos, presilha)
AZ = np.array([91, 143, 242], np.float32)     # luva azul (#5B8FF2)
SA = np.array([42, 51, 80], np.float32)        # sapato (#2A3350)


def tingir(rgb, alvo, escuro=0.55):
    """recolore mantendo a luz e a sombra do pelo"""
    lum = (rgb[..., 0] * 0.3 + rgb[..., 1] * 0.59 + rgb[..., 2] * 0.11) / 255.0
    k = np.clip((lum - 0.18) / 0.62, 0, 1)[..., None]
    return alvo * (escuro + (1 - escuro) * k) + 255 * np.clip(k - 0.85, 0, 1) * 0.6


def oculos(desenho, olhos, cor=(42, 51, 80)):
    """desenha os óculos de proteção (aros, lentes, ponte e haste) sobre os olhos, com 4× de antisserrilhado"""
    if not olhos: return
    F = 4
    big = Image.new("RGBA", (N * F, N * F), (0, 0, 0, 0)); d = ImageDraw.Draw(big)
    for (cx, cy, rx, ry, _) in olhos:
        rx2, ry2 = rx * 1.45, ry * 1.4
        box = [(cx - rx2) * F, (cy - ry2) * F, (cx + rx2) * F, (cy + ry2) * F]
        d.rounded_rectangle(box, radius=min(rx2, ry2) * 0.75 * F, fill=(190, 228, 255, 70), outline=cor + (255,), width=int(9 * F))
        d.line([((cx - rx2 * 0.55) * F, (cy - ry2 * 0.45) * F), ((cx - rx2 * 0.05) * F, (cy - ry2 * 0.75) * F)], fill=(255, 255, 255, 210), width=int(6 * F))
    if len(olhos) == 2:
        (a, b) = sorted(olhos, key=lambda o: o[0])
        d.line([((a[0] + a[2] * 1.45) * F, a[1] * F), ((b[0] - b[2] * 1.45) * F, b[1] * F)], fill=cor + (255,), width=int(9 * F))
    sm = big.resize((N, N), Image.LANCZOS)
    desenho.alpha_composite(sm)


# ------------------------------------------------------------------ poses
POSES = {}


def ancora(nome, rgb, a):
    """pés na linha de base; meio do jaleco no centro (para as poses trocarem sem pular)"""
    col = (a > 0.5)
    base = int(np.where(col.any(1))[0].max())
    jaleco = col & ~lilas(rgb, a) & (yy > 480) & (yy < 950)
    cx = float(xx[jaleco].mean())
    return round(cx, 1), base


def presilha(im, cabelo):
    if not cabelo: return
    F = 4; big = Image.new("RGBA", (N * F, N * F), (0, 0, 0, 0)); d = ImageDraw.Draw(big)
    (cx, cy, ang) = cabelo
    d.rounded_rectangle([(cx - 34) * F, (cy - 11) * F, (cx + 34) * F, (cy + 11) * F], radius=11 * F, fill=(224, 56, 90, 255))
    d.rounded_rectangle([(cx - 24) * F, (cy - 6) * F, (cx + 2) * F, (cy - 1) * F], radius=3 * F, fill=(255, 255, 255, 150))
    big = big.rotate(-ang, center=(cx * F, cy * F), resample=Image.BICUBIC)
    im.alpha_composite(big.resize((N, N), Image.LANCZOS))


def pose_simples(nome, olhos, maos, pes, cabelo, itens=False):
    rgb, a = carregar(nome)
    salvar(nome, rgb, a)
    # EPI desta pose
    L = lilas(rgb, a)
    epi = np.zeros((N, N, 4), np.float32)
    luva = np.zeros((N, N), np.float32)
    for pts in maos: luva = np.maximum(luva, poligono(pts))
    luva = luva * L * a
    sap = np.zeros((N, N), np.float32)
    for pts in pes: sap = np.maximum(sap, poligono(pts))
    sap = sap * L * a
    t_l, t_s = tingir(rgb, AZ), tingir(rgb, SA, 0.7)
    l_s, s_s = suave(luva, 0.8), suave(sap, 0.8)     # a borda suave também leva a cor da luva/sapato (sem franja escura)
    epi[..., :3] = np.where(l_s[..., None] > 0, t_l, np.where(s_s[..., None] > 0, t_s, 0))
    epi[..., 3] = np.maximum(l_s, s_s) * a * 255
    im = Image.fromarray(epi.astype(np.uint8), "RGBA")
    oculos(im, olhos)
    presilha(im, cabelo)
    cheia = Image.fromarray(np.dstack([rgb, a * 255]).astype(np.uint8), "RGBA"); cheia.alpha_composite(im)
    cheia.convert("RGBa").resize((round(N * ESC), round(N * ESC)), Image.LANCZOS).convert("RGBA").save(os.path.join(DEST, "gp-" + nome + "-epi.webp"), "WEBP", quality=88, method=6)
    if itens:   # uma camada por item, para o painel em que o Geninho se veste aos poucos
        partes = {"luvas": (luva, t_l, None), "sapato": (sap, t_s, None)}
        for k, (m, cor, _) in partes.items():
            arr = np.zeros((N, N, 4), np.float32); arr[..., :3] = cor; arr[..., 3] = suave(m, 0.8) * a * 255
            Image.fromarray(arr.astype(np.uint8), "RGBA").convert("RGBa").resize((round(N * ESC), round(N * ESC)), Image.LANCZOS).convert("RGBA").save(os.path.join(DEST, "gp-" + nome + "-" + k + ".webp"), "WEBP", quality=88, method=6)
        so = Image.new("RGBA", (N, N), (0, 0, 0, 0)); oculos(so, olhos)
        so.convert("RGBa").resize((round(N * ESC), round(N * ESC)), Image.LANCZOS).convert("RGBA").save(os.path.join(DEST, "gp-" + nome + "-oculos.webp"), "WEBP", quality=88, method=6)
        sp = Image.new("RGBA", (N, N), (0, 0, 0, 0)); presilha(sp, cabelo)
        sp.convert("RGBa").resize((round(N * ESC), round(N * ESC)), Image.LANCZOS).convert("RGBA").save(os.path.join(DEST, "gp-" + nome + "-prendedor.webp"), "WEBP", quality=88, method=6)
    if CONF:
        base = Image.fromarray(np.dstack([rgb, a * 255]).astype(np.uint8), "RGBA"); fundo = Image.new("RGBA", (N, N), (225, 238, 225, 255))
        fundo.alpha_composite(base); fundo.alpha_composite(im); fundo.convert("RGB").resize((627, 627)).save(os.path.join(CONF, "epi-" + nome + ".jpg"), quality=85)
    POSES[nome] = {"ancora": ancora(nome, rgb, a), "olhos": olhos}
    return rgb, a


# frente (patas abaixadas): para encarar quem joga, comemorar e no meio das viradas
pose_simples("frente",
             olhos=[(537, 254, 38, 32, 0), (738, 247, 33, 30, 0)],
             maos=[[(325, 730), (445, 730), (450, 940), (320, 940)], [(795, 730), (905, 730), (905, 880), (880, 915), (820, 925), (795, 900)]],
             pes=[[(380, 1110), (560, 1110), (560, 1210), (370, 1210)], [(640, 1110), (820, 1110), (820, 1210), (630, 1210)]],
             cabelo=(600, 95, -30), itens=True)
pose_simples("costas", olhos=[], maos=[[(352, 722), (448, 722), (448, 905), (352, 905)], [(812, 722), (910, 722), (910, 905), (812, 905)]],
             pes=[[(398, 1132), (575, 1132), (575, 1205), (398, 1205)], [(638, 1128), (875, 1128), (875, 1205), (638, 1205)]],
             cabelo=None)
pose_simples("alcanca",
             olhos=[(814, 378, 41, 33, 0), (1002, 420, 30, 30, 0)],
             maos=[[(930, 775), (1060, 770), (1210, 880), (1210, 1010), (1030, 1010), (960, 860)], [(465, 745), (610, 745), (610, 880), (465, 880)]],
             pes=[[(415, 1085), (615, 1085), (615, 1190), (415, 1190)], [(690, 1065), (930, 1065), (930, 1178), (690, 1178)]],
             cabelo=(930, 205, -15))



# ------------------------------------------------------------------ poses com partes que se mexem
def gravar(nome, rgb, a):
    """grava a camada; devolve a imagem reduzida"""
    return salvar(nome, rgb, a)


def gravar_epi(nome, rgb, a, luva=None, sapato=None, olhos=None, cabelo=None):
    r2 = rgb.copy()
    if luva is not None: r2 = np.where(luva[..., None] > 0.5, tingir(rgb, AZ), r2)
    if sapato is not None: r2 = np.where(sapato[..., None] > 0.5, tingir(rgb, SA, 0.7), r2)
    im = Image.fromarray(np.dstack([np.clip(r2, 0, 255), a * 255]).astype(np.uint8), "RGBA")
    if olhos: oculos(im, olhos)
    if cabelo: presilha(im, cabelo)
    im.convert("RGBa").resize((round(N * ESC), round(N * ESC)), Image.LANCZOS).convert("RGBA").save(os.path.join(DEST, "gp-" + nome + "-epi.webp"), "WEBP", quality=88, method=6)


def fechar(m, r):
    """fechamento morfológico (tapa reentrâncias até o raio r)"""
    d = borrar(m, r) > 0.02
    return borrar(d.astype(np.float32), r) > 0.98


# ----- caminhando (perfil, olhando para a esquerda; no jogo é espelhada para a direita)
def pose_andar():
    rgb, a = carregar("andar"); L = lilas(rgb, a)
    cam = {}
    # braço de longe (para a frente): pelo à esquerda da borda da manga; fica ATRÁS do corpo
    m_b2 = L & (yy > 690) & (yy < 905) & (xx > 220) & (xx < 360 + (yy - 720) * 0.92 + 3)
    # braço de perto (para trás): pelo abaixo da borda da manga; fica NA FRENTE do corpo, com a manga por cima
    m_b1 = L & (xx > 676) & (xx < 860) & (yy < 910) & (yy > 752 - (xx - 690) * 0.55 - 2)
    manga = poligono([(636, 636), (792, 626), (804, 700), (704, 772), (636, 772)]) * (~L) * (a > 0)
    # pernas e pés (abaixo da linha do quadril)
    # pernas, pés e cauda: recortados pelo contorno (assim as sombras do pelo vão junto)
    O = a > 0.04
    m_p1 = O & (yy > 1042) & (xx > 286) & (xx < 616)
    m_p2 = O & poligono([(616, 1062), (800, 1062), (800, 1106), (872, 1106), (872, 1210), (616, 1210)]).astype(bool) & (yy > 1070)
    pe1, pe2 = m_p1 & (yy > 1118), m_p2 & (yy > 1122)
    m_p1, m_p2 = m_p1 & ~pe1, m_p2 & ~pe2
    # cauda: só a parte de fora; a base continua no corpo
    pata = poligono([(740, 780), (850, 780), (850, 900), (740, 900)]).astype(bool)
    rabo = O & (xx > 790) & (yy > 815) & (yy < 1145) & ~pata & ~((yy > 1100) & (xx < 880))
    k_c = np.clip((xx - 832) / 64, 0, 1) * rabo
    partes = {"braco2": m_b2, "braco": m_b1, "perna": m_p1, "pe": pe1, "perna2": m_p2, "pe2": pe2}
    # corpo: tudo menos as partes; o buraco deixado pelo braço de perto (na frente do jaleco e da cauda) é tapado
    tira = np.zeros((N, N), np.float32)
    for m in partes.values(): tira = np.maximum(tira, m)
    a_corpo = a * (1 - suave(tira, 1.0)) * (1 - k_c)
    buraco = fechar((a_corpo > 0.5).astype(np.float32), 9) & (a_corpo < 0.5) & (m_b1 > 0)
    r_corpo, a_corpo = tapar(rgb, a_corpo, buraco.astype(np.float32))
    # camadas (com prolongamentos escondidos: sob a manga, sob o quadril e sob o corpo)
    def camada(m, sob, passos):
        al = np.maximum(suave(m.astype(np.float32), 0.8), 0) * a
        lum = rgb.mean(2)
        return prolongar(rgb, al, sob * (a > 0.5), passos, fonte=L & (lum > 95) & (a > 0.9))   # só cresce onde fica escondido
    cam["braco2"] = camada(m_b2, poligono([(340, 690), (440, 700), (440, 810), (360, 800)]), 30)
    cam["braco"] = camada(m_b1, poligono([(660, 680), (800, 660), (800, 760), (680, 780)]), 34)
    # pernas: a faixa logo acima do corte vem da própria imagem (é pelo, e fica sob o corpo)
    faixa1 = (yy > 990) & (yy <= 1042) & (xx > 430) & (xx < 616) & (a > 0.5)
    faixa2 = (yy > 1020) & (yy <= 1070) & (xx > 640) & (xx < 800) & (a > 0.5)
    junta1 = O & (yy > 1110) & (yy <= 1126) & (xx > 380) & (xx < 590)      # um pouco do pé fica na perna (o pé gira por cima)
    junta2 = O & (yy > 1114) & (yy <= 1130) & (xx > 680) & (xx < 840)
    cam["perna"] = (rgb, np.clip(m_p1 + faixa1 + junta1, 0, 1).astype(np.float32) * a)
    cam["perna2"] = (rgb, np.clip(m_p2 + faixa2 + junta2, 0, 1).astype(np.float32) * a)
    cam["pe"] = (rgb, (O & (yy > 1104) & (xx > 286) & (xx < 616)).astype(np.float32) * np.clip((yy - 1104) / 12, 0, 1) * a)
    cam["pe2"] = (rgb, (O & (yy > 1108) & (xx > 616) & (xx < 872) & ~((xx > 800) & (yy < 1106))).astype(np.float32) * np.clip((yy - 1108) / 12, 0, 1) * a)
    al_c = rabo.astype(np.float32) * a   # inteira e opaca: a emenda fica coberta pelo corpo
    cam["cauda"] = (rgb, al_c)
    cam["corpo"] = (r_corpo, a_corpo)
    cam["manga"] = (rgb, suave(manga, 0.7) * a)
    for k, (r_, a_) in cam.items():
        gravar("andar-" + k, r_, a_)
    # EPI: luvas nos braços, sapatos nos pés, óculos e presilha no corpo
    olhos = [(446, 277, 32, 33, 0)]
    gravar_epi("andar-braco", *cam["braco"], luva=np.ones((N, N)))
    gravar_epi("andar-braco2", *cam["braco2"], luva=np.ones((N, N)))
    gravar_epi("andar-pe", *cam["pe"], sapato=np.ones((N, N)))
    gravar_epi("andar-pe2", *cam["pe2"], sapato=np.ones((N, N)))
    gravar_epi("andar-corpo", *cam["corpo"], olhos=olhos, cabelo=(400, 95, -20))
    conferir("andar", rgb, [(k, cam[k]) for k in ["cauda", "braco2", "perna2", "pe2", "perna", "pe", "corpo", "braco", "manga"]])
    POSES["andar"] = {"ancora": ancora("andar", rgb, a), "olhos": olhos,
                      "piv": {"braco": (738, 740), "braco2": (396, 746), "perna": (520, 1015), "pe": (478, 1128), "perna2": (734, 1058), "pe2": (768, 1134), "cauda": (868, 1000)},
                      "mao": (800, 884)}


# ----- três quartos (parado): o antebraço da frente gira no punho da manga
def pose_lado(nome, regiao, linha, piv, frente_do_corpo, manga_pts, sob_flap, olhos, maos_corpo, pes, cabelo, mao, tapa=()):
    rgb, a = carregar(nome); L = lilas(rgb, a)
    (x0, y0), (x1, y1) = linha
    yl = y0 + (xx - x0) * (y1 - y0) / (x1 - x0)
    m_b = L & poligono(regiao).astype(bool) & (yy > yl - 2)
    al_b = suave(m_b.astype(np.float32), 0.8) * a
    sob_manga = poligono(manga_pts)
    if sob_flap: sob_manga = np.maximum(sob_manga, poligono(sob_flap))
    r_b, al_b = prolongar(rgb, al_b, sob_manga * (a > 0.5), 40, fonte=L & (rgb.mean(2) > 95) & (a > 0.9))
    a_corpo = a * (1 - suave(m_b.astype(np.float32), 1.0))
    r_corpo = rgb
    for pts in tapa:      # o braço estava na frente do jaleco (e da cauda): preenche só o que é jaleco/cauda
        buraco = poligono(pts).astype(bool) & (a_corpo < 0.98) & m_b
        r_corpo, a_corpo = tapar(r_corpo, a_corpo, buraco.astype(np.float32))
    gravar(nome + "-corpo", r_corpo, a_corpo); gravar(nome + "-braco", r_b, al_b)
    cam = [("corpo", (r_corpo, a_corpo)), ("braco", (r_b, al_b))]
    if frente_do_corpo:
        manga = poligono(manga_pts) * (~L) * (a > 0)
        gravar(nome + "-manga", rgb, suave(manga, 0.7) * a); cam.append(("manga", (rgb, suave(manga, 0.7) * a)))
    # EPI
    luva_c = np.zeros((N, N), np.float32)
    for pts in maos_corpo: luva_c = np.maximum(luva_c, poligono(pts))
    sap = np.zeros((N, N), np.float32)
    for pts in pes: sap = np.maximum(sap, poligono(pts))
    gravar_epi(nome + "-corpo", r_corpo, a_corpo, luva=luva_c * L, sapato=sap * L, olhos=olhos, cabelo=cabelo)
    gravar_epi(nome + "-braco", r_b, al_b, luva=np.ones((N, N)))
    conferir(nome, rgb, cam)
    POSES[nome] = {"ancora": ancora(nome, rgb, a), "olhos": olhos, "piv": {"braco": piv}, "mao": mao, "frenteDoCorpo": frente_do_corpo}


pose_andar()
pose_lado("ladoD", regiao=[(696, 700), (858, 690), (850, 902), (826, 946), (696, 946)], linha=((745, 748), (845, 722)), piv=(792, 733), frente_do_corpo=True,
          manga_pts=[(698, 668), (862, 652), (868, 742), (745, 772), (698, 746)], sob_flap=None,
          olhos=[(520, 270, 40, 30, 0), (686, 236, 19, 29, 0)], maos_corpo=[[(300, 700), (450, 700), (450, 950), (300, 950)]],
          pes=[[(380, 1110), (560, 1110), (560, 1210), (370, 1210)], [(600, 1100), (820, 1100), (820, 1215), (600, 1215)]], cabelo=(640, 90, -25), mao=(784, 912),
          tapa=[[(712, 740), (826, 734), (836, 880), (858, 930), (728, 940)], [(780, 912), (874, 900), (874, 950), (780, 950)]])
pose_lado("ladoE", regiao=[(296, 712), (424, 712), (424, 930), (296, 930)], linha=((330, 712), (410, 722)), piv=(368, 715), frente_do_corpo=False,
          manga_pts=[(322, 680), (420, 680), (424, 724), (322, 720)], sob_flap=[(360, 712), (430, 712), (430, 915), (360, 915)],
          olhos=[(414, 251, 22, 31, 0), (585, 251, 42, 31, 0)], maos_corpo=[[(760, 700), (900, 700), (900, 960), (760, 960)]],
          pes=[[(330, 1110), (540, 1110), (540, 1225), (320, 1225)], [(560, 1100), (760, 1100), (760, 1225), (560, 1225)]], cabelo=(470, 75, -20), mao=(345, 905))

print(json.dumps(POSES))
