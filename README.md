# StarUP · Frontend

Frontend responsivo em **HTML, CSS e JavaScript puro**, sem React, frameworks ou etapa de build. A identidade visual segue o protótipo do projeto: navegação escura, amarelo nos destaques, superfícies claras e tipografia simples. Não utiliza blur; a única transição é a abertura breve do menu mobile, desativada com `prefers-reduced-motion`.

## Executar

O frontend é servido pelo Django do repositório irmão, na mesma origem da API, para preservar sessão e proteção CSRF. Configure o ambiente conforme `../starup-backend/docs/development.md` e execute no backend:

```bash
.venv/bin/python manage.py migrate
.venv/bin/python manage.py runserver
```

Acesse **http://localhost:8000/**. Em instalações fora da estrutura de repositórios irmãos, a variável `PWA_ROOT` do backend deve apontar para este diretório.

Não abra `index.html` diretamente. Um servidor estático separado precisa de proxy para `/api/v1/` e configuração adequada da mesma origem. O produto não tem login fictício nem dados demonstrativos embutidos; uma API sem publicações mostra estados vazios.

## Recursos

- Visão geral, vitrine pública, busca sem acentos e filtros por tipo nos conteúdos carregados; paginação explícita. Os indicadores representam os conteúdos carregados, não totais globais.
- Login e cadastro por papel: cliente, startup e investidor com leitura privada. Os campos e ações respeitam os contratos do backend.
- Clientes: criar e editar demandas abertas, alterar visibilidade, cancelar, aceitar ou rejeitar propostas e confirmar entregas com avaliação.
- Startups: enviar propostas, retirar propostas pendentes, iniciar execução, registrar entrega e editar nome, descrição e site do perfil público.
- Investidores: explorar demandas, startups e resultados, sem ações de publicação ou acesso a propostas privadas.
- Conta, notificações push opcionais e exclusão com confirmação.
- Navegação por hash, menu mobile, foco de teclado, diálogos nativos, mensagens acessíveis e preferência por movimento reduzido.

A plataforma segue o MVP **demanda → proposta → entrega → avaliação**. Chat, pagamentos, auditorias, editais e recuperação de senha não fazem parte dos endpoints atuais.

## Arquivos

- `index.html`: estrutura semântica, páginas e diálogos.
- `app.css`: identidade visual, componentes e breakpoints responsivos.
- `app.js`: navegação, estado em memória e integração com `/api/v1/`.
- `service-worker.js`: shell offline e cópia pública da vitrine.
- `privacy.html`, `manifest.json` e ícones: privacidade e instalação da PWA.

Não há dependências JavaScript em tempo de execução, fontes externas nem CDN. O backend serve uma lista explícita de arquivos; novos assets ou módulos precisam ser incluídos também em `config/urls.py` e `common/pwa.py` do backend.

## Offline e atualização

A vitrine prioriza a rede e usa uma cópia pública de até 24 horas quando a conexão falha. Sessão, identidade, propostas e entregas não entram no cache da PWA. Sair ou excluir a conta limpa os dados mantidos pela interface e o cache da vitrine. Nenhuma ação de escrita é enfileirada offline.

Para mudanças no shell, incremente `VERSION` em `service-worker.js` e atualize as referências correspondentes nos testes. Uma nova versão aguarda o usuário confirmar **Atualizar**, preservando formulários em andamento. O identificador de instalação continua `/`; a compatibilidade com caches da marca anterior foi preservada.

## Verificação

Com Node.js disponível:

```bash
node --check app.js
node --check service-worker.js
node --test tests/service-worker.test.cjs
```

O redesign foi verificado no navegador com API Django e banco SQLite temporário, separado do banco existente: login, criação de demanda, envio e aceite de proposta, início, entrega e avaliação. Os três cadastros, edição do perfil, permissões, visibilidade e cancelamento também foram exercitados pela API. Os testes unitários do worker cobrem privacidade, atualização, expiração e fallback offline. A suíte PostgreSQL do backend não é substituída por essa verificação de interface.

Os créditos originais em `LICENSE` foram preservados.
