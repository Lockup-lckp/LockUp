# 🔒 LCKP — Lockup Ecosystem

Repositório central do projeto **Lockup (LCKP)**.

## 🏗️ Estrutura do Projeto

- `/apps/frontend`: Interface web e dashboard da aplicação.
- `/apps/backend`: APIs, regras de negócio e serviços de banco de dados.
- `/.github`: Automações de CI/CD, templates de Pull Request e diretrizes do repositório.

## 🚀 Como Executar Localmente

### Pré-requisitos
- Node.js (v18+)
- Git

### Instalação
1. Clone o repositório:
   ```bash
   git clone [https://github.com/Lockup-lckp/LockUp.git](https://github.com/Lockup-lckp/LockUp.git)
   ```
2. Instale as dependências:
   ```bash
   npm install
   ```

### 3. Como Trabalhar na Branch e Abrir o PR

1. **Atualize a branch base (`develop`):**
   ```bash
   git checkout develop
   git pull origin develop
   ```

2. **Crie uma nova branch de funcionalidade ou correção:**
   ```bash
   git checkout -b feature/nome-da-sua-tarefa
   ```

3. **Desenvolva e faça o commit das suas alterações:**
   ```bash
   git add .
   git commit -m "feat(modulo): descricao clara da alteracao"
   ```

4. **Envie a branch para o GitHub:**
   ```bash
   git push -u origin feature/nome-da-sua-tarefa
   ```

5. **Abra o Pull Request:**
   - Acesse o repositório no GitHub.
   - Clique no botão **Compare & pull request**.
   - Defina a branch de destino (**base**) como `develop`.
   - Preencha a descrição utilizando o modelo padrão de PR e aguarde a revisão da equipe.
