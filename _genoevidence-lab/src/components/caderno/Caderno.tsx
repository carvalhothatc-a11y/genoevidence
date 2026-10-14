"use client";
import { useRef, useState } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Field, Select, TextArea, TextInput } from "@/components/ui/Field";
import { diaDeHoje, diaPorExtenso, MAX_ARQUIVOS, type Registro } from "@/lib/caderno/tipos";

type Projeto = { id: string; titulo: string };

/** “1 arquivo” / “3 arquivos” — nunca “arquivo(s)”. */
const plural = (n: number, um: string, varios: string) => (n === 1 ? um : varios);

/**
 * Caderno de laboratório: um registro por dia de bancada.
 *
 * Duas regras que a interface precisa deixar visíveis, porque são a razão de o caderno existir:
 * editar guarda a versão anterior (e o cartão mostra que houve edição), e excluir leva junto as
 * versões e os arquivos — avisado antes, nomeando o dia.
 */
export function Caderno({ iniciais, projetos }: { iniciais: Registro[]; projetos: Projeto[] }) {
  const [registros, setRegistros] = useState<Registro[]>(iniciais);
  const [escrevendo, setEscrevendo] = useState(false);
  const [editando, setEditando] = useState<Registro | null>(null);

  const guardar = (r: Registro) =>
    setRegistros((lista) => {
      const sem = lista.filter((x) => x.id !== r.id);
      return [...sem, r].sort((a, b) => (a.dia === b.dia ? b.criadoEm.localeCompare(a.criadoEm) : b.dia.localeCompare(a.dia)));
    });

  return (
    <div className="mt-6 grid gap-4" data-testid="caderno">
      {!escrevendo && !editando && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted">
            {registros.length === 0 ? "Nenhum registro ainda." : `${registros.length} ${plural(registros.length, "registro", "registros")} no caderno.`}
          </p>
          <Button onClick={() => setEscrevendo(true)} data-testid="registrar-dia">
            Registrar o dia
          </Button>
        </div>
      )}

      {escrevendo && (
        <Formulario
          projetos={projetos}
          aoCancelar={() => setEscrevendo(false)}
          aoSalvar={(r) => {
            guardar(r);
            setEscrevendo(false);
          }}
        />
      )}

      {editando && (
        <Formulario
          projetos={projetos}
          registro={editando}
          aoCancelar={() => setEditando(null)}
          aoSalvar={(r) => {
            guardar(r);
            setEditando(null);
          }}
        />
      )}

      {registros.length === 0 && !escrevendo ? (
        <Alert tone="info" title="Nenhum registro ainda.">
          O caderno guarda o que aconteceu em cada dia de bancada — inclusive o que deu errado, que é o que costuma sumir.
        </Alert>
      ) : (
        <ul className="grid gap-3">
          {registros.map((r) => (
            <li key={r.id}>
              <Cartao
                registro={r}
                projetos={projetos}
                aoEditar={() => setEditando(r)}
                aoMudar={guardar}
                aoExcluir={() => setRegistros((l) => l.filter((x) => x.id !== r.id))}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Formulario({
  registro,
  projetos,
  aoSalvar,
  aoCancelar,
}: {
  registro?: Registro;
  projetos: Projeto[];
  aoSalvar: (r: Registro) => void;
  aoCancelar: () => void;
}) {
  const [dia, setDia] = useState(registro?.dia ?? diaDeHoje());
  const [texto, setTexto] = useState(registro?.texto ?? "");
  const [projetoId, setProjetoId] = useState(registro?.projetoId ?? "");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const enviar = async () => {
    setSalvando(true);
    setErro(null);
    try {
      const r = await fetch(registro ? `/api/caderno/${registro.id}` : "/api/caderno", {
        method: registro ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dia, texto, projetoId: projetoId || undefined }),
      });
      const d = (await r.json().catch(() => ({}))) as { registro?: Registro; error?: string };
      if (!r.ok || !d.registro) throw new Error(d.error ?? "Não foi possível salvar.");
      aoSalvar(d.registro);
    } catch (e) {
      // O texto continua na tela: nada do que a pessoa escreveu some por causa de uma falha de rede.
      setErro(e instanceof Error ? e.message : "O registro não foi salvo.");
    } finally {
      setSalvando(false);
    }
  };

  return (
    <section className="grid gap-3 rounded-xl border border-line bg-surface p-4" aria-label={registro ? "Editar o registro" : "Registrar o dia"} data-testid="form-caderno">
      {registro && (
        <Alert tone="info">A versão anterior continua guardada. Um caderno que pode ser reescrito em silêncio não serve como registro.</Alert>
      )}
      <Field label="Dia" hint="Pode registrar um dia passado." htmlFor="dia">
        <TextInput id="dia" type="date" value={dia} max={diaDeHoje()} onChange={(e) => setDia(e.target.value)} />
      </Field>
      <Field label="O que você fez" htmlFor="texto">
        <TextArea
          id="texto"
          rows={8}
          value={texto}
          placeholder="Ex.: Repeti a PCR do TP53. O controle negativo deu banda — provavelmente contaminação na master mix."
          onChange={(e) => setTexto(e.target.value)}
        />
      </Field>
      {projetos.length > 0 && (
        <Field label="Ligar a um projeto (opcional)" hint="Você pode registrar agora e ligar depois." htmlFor="projeto">
          <Select id="projeto" value={projetoId} onChange={(e) => setProjetoId(e.target.value)}>
            <option value="">Sem projeto</option>
            {projetos.map((p) => (
              <option key={p.id} value={p.id}>
                {p.titulo}
              </option>
            ))}
          </Select>
        </Field>
      )}
      {erro && (
        <Alert tone="danger" title="O registro não foi salvo.">
          {erro} O que você escreveu continua aqui na tela — tente de novo.
        </Alert>
      )}
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => void enviar()} disabled={salvando || texto.trim().length === 0} data-testid="salvar-caderno">
          {salvando ? "Guardando o registro…" : registro ? "Salvar a edição" : "Salvar no caderno"}
        </Button>
        <Button variant="secondary" onClick={aoCancelar}>
          Cancelar
        </Button>
      </div>
    </section>
  );
}

function Cartao({
  registro,
  projetos,
  aoEditar,
  aoMudar,
  aoExcluir,
}: {
  registro: Registro;
  projetos: Projeto[];
  aoEditar: () => void;
  aoMudar: (r: Registro) => void;
  aoExcluir: () => void;
}) {
  const [aberto, setAberto] = useState(false);
  const [versoes, setVersoes] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const projeto = projetos.find((p) => p.id === registro.projetoId);

  const excluir = async () => {
    const r = await fetch(`/api/caderno/${registro.id}`, { method: "DELETE" });
    if (r.ok) aoExcluir();
  };

  return (
    <article className="rounded-xl border border-line bg-surface p-4" data-dia={registro.dia} data-testid="registro">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-semibold">{diaPorExtenso(registro.dia)}</h2>
        <p className="text-xs text-muted">
          {registro.arquivos.length > 0 && `${registro.arquivos.length} ${plural(registro.arquivos.length, "arquivo", "arquivos")}`}
          {registro.arquivos.length > 0 && registro.versoes.length > 0 && " · "}
          {registro.versoes.length > 0 && (
            <span data-testid="editado">editado {registro.versoes.length === 1 ? "1 vez" : `${registro.versoes.length} vezes`}</span>
          )}
        </p>
      </div>
      <p className={`mt-1 whitespace-pre-wrap text-sm ${aberto ? "" : "line-clamp-2"}`}>{registro.texto}</p>
      {projeto && <p className="mt-2 text-xs text-muted">Projeto: {projeto.titulo}</p>}

      <div className="mt-3 flex flex-wrap gap-2">
        <Button size="sm" variant="secondary" onClick={() => setAberto(!aberto)}>
          {aberto ? "Fechar o dia" : "Ver o dia"}
        </Button>
        {aberto && (
          <>
            <Button size="sm" variant="secondary" onClick={aoEditar}>
              Editar o registro
            </Button>
            {registro.versoes.length > 0 && (
              <Button size="sm" variant="ghost" onClick={() => setVersoes(!versoes)}>
                Ver o que mudou
              </Button>
            )}
            <Button size="sm" variant="danger" onClick={() => setConfirmando(true)}>
              Excluir
            </Button>
          </>
        )}
      </div>

      {aberto && <Arquivos registro={registro} aoMudar={aoMudar} />}

      {aberto && versoes && (
        <ol className="mt-3 grid gap-2 border-t border-line pt-3" data-testid="versoes">
          {[...registro.versoes].reverse().map((v, i) => (
            <li key={`${v.substituidaEm}-${i}`} className="rounded-lg border border-line bg-surface-2 p-3 text-sm">
              <p className="text-xs text-muted">
                Versão anterior {v.dia !== registro.dia && `(registrada como ${diaPorExtenso(v.dia)})`} — substituída em{" "}
                {new Date(v.substituidaEm).toLocaleString("pt-BR")}
              </p>
              <p className="mt-1 whitespace-pre-wrap">{v.texto}</p>
            </li>
          ))}
        </ol>
      )}

      {confirmando && (
        <div className="mt-3 grid gap-2 rounded-lg border border-danger/40 bg-danger-soft p-3" role="alertdialog" aria-label="Confirmar exclusão">
          <p className="text-sm font-semibold">Excluir o registro de {diaPorExtenso(registro.dia)}?</p>
          <p className="text-sm">Some do caderno junto com as versões anteriores e os arquivos do dia. Isso não tem volta.</p>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="danger" onClick={() => void excluir()} data-testid="confirmar-exclusao">
              Excluir o registro
            </Button>
            <Button size="sm" variant="secondary" onClick={() => setConfirmando(false)}>
              Manter
            </Button>
          </div>
        </div>
      )}
    </article>
  );
}

function Arquivos({ registro, aoMudar }: { registro: Registro; aoMudar: (r: Registro) => void }) {
  const entrada = useRef<HTMLInputElement>(null);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const enviar = async (file: File) => {
    setEnviando(true);
    setErro(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const r = await fetch(`/api/caderno/${registro.id}/arquivos`, { method: "POST", body: fd });
      const d = (await r.json().catch(() => ({}))) as { registro?: Registro; error?: string };
      if (!r.ok || !d.registro) throw new Error(d.error ?? "Não foi possível anexar.");
      aoMudar(d.registro);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível anexar.");
    } finally {
      setEnviando(false);
      if (entrada.current) entrada.current.value = "";
    }
  };

  const remover = async (arquivoId: string) => {
    const r = await fetch(`/api/caderno/${registro.id}/arquivos/${arquivoId}`, { method: "DELETE" });
    const d = (await r.json().catch(() => ({}))) as { registro?: Registro };
    if (r.ok && d.registro) aoMudar(d.registro);
  };

  return (
    <div className="mt-3 grid gap-2 border-t border-line pt-3">
      <p className="text-xs font-medium">Fotos, tabelas e relatórios do dia</p>
      {registro.arquivos.length > 0 && (
        <ul className="grid gap-2 sm:grid-cols-2" data-testid="arquivos-do-dia">
          {registro.arquivos.map((a) => (
            <li key={a.id} className="flex items-start gap-2 rounded-lg border border-line bg-surface-2 p-2">
              {a.mime.startsWith("image/") ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={`/api/caderno/${registro.id}/arquivos/${a.id}?modo=visualizar`}
                  alt={a.legenda ?? a.nome}
                  className="h-16 w-16 rounded object-cover"
                  loading="lazy"
                />
              ) : (
                <span aria-hidden="true" className="grid h-16 w-16 place-items-center rounded bg-surface text-xs text-muted">
                  arquivo
                </span>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium">{a.nome}</p>
                <a href={`/api/caderno/${registro.id}/arquivos/${a.id}`} className="text-xs text-accent-ink underline">
                  baixar
                </a>{" "}
                <button type="button" onClick={() => void remover(a.id)} className="text-xs text-danger underline">
                  remover
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <p className="text-xs text-muted">Os arquivos ficam no seu caderno, neste servidor. Não são enviados para fora.</p>
      {erro && <p className="text-xs text-danger" role="alert">{erro}</p>}
      <div>
        {/* O seletor nativo mostra “Choose File” em inglês; escondemos e usamos o rótulo como botão. */}
        <input
          ref={entrada}
          id={`anexo-${registro.id}`}
          type="file"
          accept=".png,.jpg,.jpeg,.webp,.pdf,.docx,.csv,.tsv,.xlsx,.txt,.md"
          className="sr-only"
          disabled={enviando || registro.arquivos.length >= MAX_ARQUIVOS}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void enviar(f);
          }}
        />
        {registro.arquivos.length >= MAX_ARQUIVOS ? (
          <p className="text-xs text-muted">Este dia já tem {MAX_ARQUIVOS} arquivos.</p>
        ) : (
          <label
            htmlFor={`anexo-${registro.id}`}
            className="ge-press inline-flex min-h-9 cursor-pointer items-center rounded-full bg-surface px-3.5 text-[13.5px] font-semibold text-ink shadow-[inset_0_0_0_1px_var(--line)] hover:bg-surface-2"
          >
            {enviando ? "Enviando…" : "Escolher arquivo"}
          </label>
        )}
      </div>
    </div>
  );
}
