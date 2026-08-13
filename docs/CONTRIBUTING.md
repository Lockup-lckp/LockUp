# 🤝 Guia de Contribuicao - LCKP

Bem-vindo(a)! Este guia define as regras e convencoes para trabalhar no
repositorio LockUp de forma organizada.

## 🌳 Branches

- `main`: producao. Deploy automatico (Vercel/Render). **Nunca** commite direto aqui em regime normal.
- `develop`: integracao. Base para as branches de feature.
- `feature/<nome>`: novas funcionalidades.
- `fix/<nome>`: correcoes de bug.
- `chore/<nome>`: tarefas de infra, config, deps.
- `docs/<nome>`: apenas documentacao.

## 📝 Commits (Conventional Commits)

Formato: `tipo(escopo): descricao curta no imperativo`

Tipos comuns: `feat`, `fix`, `chore`, `docs`, `refactor`, `perf`, `test`, `style`.

Exemplos:
- `feat(auth): adiciona login com JWT`
- `fix(armarios): corrige status ao expirar locacao`
- `docs(readme): atualiza instrucoes de setup`

## 🔀 Pull Requests

1. Abra o PR da sua branch contra `develop`.
2. Preencha o template de PR.
3. Aguarde a revisao de pelo menos 1 pessoa (CODEOWNERS sao pedidos automaticamente).
4. Garanta que os checks (Actions) passaram.
5. Faca o merge apenas apos aprovacao.

## 🏷️ Labels sugeridas

Crie estas labels no repo (Issues > Labels) para categorizar issues e PRs:
- `frontend`, `backend`, `infra`, `docs`
- `bug`, `feature`, `enhancement`
- `priority:alta`, `priority:media`, `priority:baixa`

## 🛡️ Regras a aplicar nas configuracoes (feito pelo admin)

Estas configuracoes envolvem controle de acesso e devem ser aplicadas
manualmente por um admin da organizacao:

### Branch protection (Settings > Branches)
Proteja `main` e `develop` com:
- Require a pull request before merging (min. 1 approval).
- Require review from Code Owners.
- Require status checks to pass before merging.
- Require conversation resolution before merging.
- Dismiss stale approvals quando novos commits chegarem.
- Do not allow bypassing the above settings.

### Times (Organizacao > Teams)
- `frontend` e `backend`, com acesso ao repo conforme a area.
- Atualize o `.github/CODEOWNERS` trocando `@coltrox` pelos times.

### Geral (Settings)
- Habilite "Automatically delete head branches" apos o merge.
- Defina `develop` como branch padrao para desenvolvimento (opcional).
