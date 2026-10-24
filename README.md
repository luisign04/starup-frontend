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

- Visão geral com apresentação e tutoriais; vitrine em uma coluna de publicações completas, com autoria, links de perfil, datas, status, imagens, tags e avaliações reais. Filtros por tipo e tag na API, busca sem acentos nos conteúdos carregados e paginação explícita. Os indicadores representam os conteúdos carregados, não totais globais.
- Login e cadastro por papel: cliente, startup e investidor com leitura privada. Os campos e ações respeitam os contratos do backend.
- Clientes: página própria para criar e editar demandas abertas, com até 8 tags de 30 caracteres e 4 imagens JPEG, PNG ou WebP de até 5 MB. Rascunhos ficam apenas na memória da aba durante a navegação e são limpos ao sair. Também é possível alterar visibilidade, cancelar, aceitar ou rejeitar propostas e confirmar entregas com avaliação.
- Startups: enviar propostas, retirar propostas pendentes, iniciar execução, registrar entrega e editar nome, descrição, site e setor do perfil público. O setor também pode ser escolhido no cadastro.
- Matchmaking: vitrine de tração pública, demandas recomendadas para startups e startups compatíveis por demanda do cliente. O botão **Encontrar startups** em Minhas demandas abre o ranking específico. Recomendações já propostas são removidas imediatamente após o envio. As métricas usam avaliações de clientes e entregas concluídas; impacto econômico é uma estimativa do histórico, sem auditoria independente.
- Investidores: explorar demandas, startups e resultados, abrir perfis públicos de startups e clientes, filtrar seus históricos de demandas públicas e consultar avaliações de 1 a 5 estrelas, sem ações de publicação ou acesso a propostas privadas. Nas páginas de clientes, as notas correspondem às entregas que eles avaliaram.
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

A vitrine prioriza a rede e usa uma cópia pública de até 24 horas quando a conexão falha. Sessão, identidade, propostas, perfis públicos completos e imagens não entram no cache da PWA. As imagens de demandas são consultadas pela API conforme suas permissões; a vitrine salva pode ser lida offline sem suas imagens. Sair ou excluir a conta limpa os dados mantidos pela interface e o cache da vitrine. Nenhuma ação de escrita é enfileirada offline.

Para mudanças no shell, incremente `VERSION` em `service-worker.js` e atualize as referências correspondentes nos testes. Uma nova versão aguarda o usuário confirmar **Atualizar**, preservando formulários em andamento. O identificador de instalação continua `/`; a compatibilidade com caches da marca anterior foi preservada.

## Verificação

Com Node.js disponível:

```bash
node --check app.js
node --check service-worker.js
node --test tests/*.test.cjs
```

A versão atual foi verificada no navegador com API Django, Redis e banco PostgreSQL 16.15 local, separado de qualquer banco de produção: login, criação de demanda, envio e aceite de proposta, início, entrega e avaliação. Os três cadastros, edição do perfil, permissões, visibilidade e cancelamento também foram exercitados pela API. Os testes do cliente cobrem envio de proposta a partir das recomendações, rankings por demanda, escolha de setor, concorrência entre abas e respostas tardias após sair da conta; também cobrem publicações enriquecidas, perfis públicos, multipart, limites de tags e imagens, limpeza de rascunhos e navegação entre páginas. Os testes unitários do worker cobrem privacidade (incluindo endpoints de matchmaking), atualização, expiração e fallback offline. A suíte PostgreSQL do backend não é substituída por essa verificação de interface.

Os créditos originais em `LICENSE` foram preservados.
