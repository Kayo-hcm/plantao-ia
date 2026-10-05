# Plantão IA — 30 dias para decidir melhor

Jogo cooperativo, para **2 a 5 pessoas**, em que a equipe assume o programa de Inteligência Artificial de um hospital por **30 dias de plantão**: escolhe e prepara o modelo da urgência, decide quando ligá-lo, **testa o modelo num caso real por dia**, enfrenta um **incidente inesperado** no meio do mês (epidemia de dengue, surto de diarreia e leptospirose, SRAG, ataque hacker, superbactéria na UTI ou acidente com múltiplas vítimas) e, a cada 7 dias, se reúne para revisar a semana e planejar a próxima. No caminho: limiares, LGPD, infraestrutura, painel da gestão, previsão de compras e do bloco, alertas da farmácia e transplantes.

Toda decisão pede uma justificativa — **sem tamanho mínimo**: curta ou longa, do jeito de cada um. As justificativas aparecem para a equipe no Mural e são gravadas, junto com as falas nas reuniões e os comentários, em uma **planilha Google** — o banco de dados do jogo.

*Conteúdo complementar da disciplina **Fundamentos de Machine Learning**, por Prof. Kayo Henrique · Especialização em Ciência de Dados e Inteligência Artificial Aplicadas à Saúde · [CDIA.Saúde](https://cdiasaude.upecaruaru.com.br/) · UPE Caruaru · Instagram [@cdia.saude](https://www.instagram.com/cdia.saude/).*

> “Um modelo preditivo só é bom quando alguém decide melhor por causa dele.”

---

## O mês de plantão

| Semana | Dias | O que acontece |
|---|---|---|
| 1 · Entender e escolher | 1–7 | Critério de sucesso, candidatos, escolha do modelo, limiar, contrato, infraestrutura, LGPD, ferramenta de painel. **Reunião semanal** no dia 7. |
| 2 · O modelo entra no plantão | 8–14 | A Clínica decide **como ligar o modelo** (dia 8). A partir do dia 9, **um caso da urgência por dia**. O fluxo do alerta, uma crise do sistema e um imprevisto. **Reunião** no dia 14 — e os primeiros **sinais** do que vem por aí. |
| 3 · O incidente | 15–21 | O incidente da história do grupo começa no dia 15 ou 16: decisões de cada função e casos clínicos do incidente. **Reunião** no dia 21. |
| 4 · Ajustar e prestar contas | 22–28 | O modelo **fica, troca ou sai?** Viés por grupo, painel da diretoria, deriva, um paciente sem alerta, outro imprevisto. **Reunião** no dia 28. |
| Fechamento | 29–30 | Último caso e reunião do conselho. Relatório final. |

**Ritmo.** O dia avança quando a equipe termina as tarefas do dia — até **3 dias de jogo por dia do calendário** (configurável). Assim, os 30 dias levam pelo menos 10 dias corridos e sobra tempo para ler, comentar e pensar.

**Seis histórias.** Ao iniciar o plantão, cada grupo recebe uma história (sorteio equilibrado: sai a menos usada pela turma). O dia do incidente, os 2 imprevistos do mês e a ordem dos casos também variam de grupo para grupo — duas equipes nunca vivem a mesma jornada.

**O médico testa o modelo.** Em cada caso, a Clínica vê a ficha do paciente e o que o modelo indicou (escore, alerta e, se o modelo explica, o motivo), decide se **aceita ou não** e diz por quê. Depois descobre o que aconteceu com o paciente e o que os outros modelos da bancada teriam dito.

## O hospital cresce com a equipe

O porte do hospital é definido automaticamente quando o jogo começa, pelo número de jogadores:

| Equipe | Hospital | Funções | Decisões | Reuniões |
|---|---|---|---|---|
| **2 ou 3** | **Essencial** — 120 leitos: urgência, radiologia e almoxarifado | Gestão · Clínica · TI | ≈ 26 + 21 casos | 7 |
| **4** | **Regional** — 250 leitos: + bloco cirúrgico com 8 salas e farmácia | Gestão · Clínica · Operações (bloco e farmácia) · TI | ≈ 36 + 21 casos | 9 |
| **5** | **Alta Complexidade** — 450 leitos: especialidades (cardiologia, oftalmologia, mamografia, dermatologia, escriba digital), bloco com 12 salas, **transplantes**, farmácia e compras | Gestão · Clínica · Cirurgia e Transplantes · Farmácia e Compras · TI | ≈ 45 + 21 casos | 10 |

Com 2–3 pessoas as decisões são menos numerosas e têm menos alternativas, mas cobrem os mesmos conceitos básicos: critério de sucesso, acurácia × sensibilidade, explicabilidade, limiar, humano no circuito, viés, LGPD, infraestrutura, painel e visualização de dados, previsão de compras.

**Para quem é da saúde.** A linguagem foi escrita para profissionais de saúde que estão conhecendo agora ciência de dados e IA. Cada decisão traz uma caixa **“Na vida real”** com um caso verídico (sepse da Epic e TREWS, retinopatia do Google na Tailândia, MASAI na mamografia, MELD e iBox nos transplantes, alertas de interação ignorados, WannaCry, Google Flu Trends, Florence Nightingale…), e a aba **Casos reais** reúne todos eles.

---

## Para quem vai jogar

1. Uma pessoa abre o site, clica em **Fundar um hospital**, dá um nome e compartilha o **código de 5 letras** (ou o link).
2. Os colegas clicam em **Entrar em um hospital** e digitam o código.
3. Na sala de espera, cada pessoa assume uma ou mais funções e diz por quê. **Gestão e Clínica precisam ser pessoas diferentes.**
4. Em seguida, cada um passa no **vestiário**: monta o próprio avatar (tom de pele, penteado e cor do cabelo, estilo e cor da roupa, óculos, barba e acessórios como estetoscópio, touca cirúrgica ou headset) e **retira o crachá** na recepção — com foto, nome, função e o código do hospital. O crachá pode ser baixado como imagem (PNG). **O plantão só começa quando todos que têm função pegaram o crachá.**
5. O dia avança quando todas as tarefas do dia terminam (até 3 dias de jogo por dia do calendário). Muitas tarefas só abrem depois de outras (o modelo só chega ao plantão depois que a gestão escolhe e apresenta os candidatos; as prioridades da semana só depois da reunião semanal).
6. A partir do dia 9, quem está na **Clínica** recebe um caso da urgência por dia.
7. No fim do dia 30, o **relatório final** mostra o que cada decisão causou, como o modelo se saiu nos casos, a boa prática de referência e o conceito por trás de cada escolha — e quantas **conquistas** a equipe desbloqueou.

**A interface** tem visual de jogo atual: o hospital aparece como uma **planta isométrica** com luz, volume e sombras suaves, cada setor como uma sala mobiliada (camas, monitores, servidores, prateleiras, mesa cirúrgica…) e cada jogador como o **avatar que montou no vestiário**, com o cordão do crachá na cor da função. Os avatares respiram, piscam e **caminham** até a sala onde têm tarefa (ou até a sala de reuniões). Balões mostram as últimas falas da equipe, e um **!** amarelo indica que é a sua vez.

- **No alto**: nome do hospital, a semana e o dia (com a barra dos 30 dias e as reuniões marcadas), a “carteira” com os seis indicadores (orçamento, segurança, eficiência, confiança, ética/LGPD e dados) e o seu crachá (clique para baixar ou trocar o visual).
- **Na barra de baixo**: Hospital, Tarefas, Mural, Equipe (o quadro de crachás da equipe), Indicadores, Casos reais, Glossário e Relatório.
- **Decisões interativas**: cartas dos modelos com “letras miúdas” no verso (arrastar 3 para a mesa do corpo clínico), laboratório do limiar com 300 pacientes, cartas de especialidades e de ferramentas de dashboard (com avaliações e depoimentos), e um **montador de painel** em que a TI escolhe 4 de 8 gráficos para a tela da diretoria.
- **Reuniões em cena**: os participantes em volta da mesa, com as falas em balões.
- **Caso do dia**: ficha do paciente com sinais vitais (alterados em vermelho) e o painel “O que o modelo diz”, com escore, ponto de corte, alerta e explicação.
- **Reunião semanal** com o balanço da semana (indicadores, decisões, eventos e casos testados) e as prioridades da semana seguinte.
- **Jornal do hospital** a cada manhã, com os eventos disparados pelas decisões, os sinais do incidente e os imprevistos; sirene nas crises; confete no fim.

Para voltar a um jogo (outro dia, outro aparelho), entre com o mesmo código e o **mesmo nome**. Textos que você começou a escrever e ainda não enviou ficam guardados no navegador.

---

## Para o professor: como publicar (≈ 15 minutos)

### Passo 1 — Planilha e Apps Script

1. Crie uma planilha nova no Google Drive (ex.: *Plantão IA — Banco*).
2. Na planilha, abra **Extensões → Apps Script**.
3. Apague o conteúdo do arquivo `Code.gs` e cole o conteúdo de [`apps-script/Code.gs`](apps-script/Code.gs).
4. Na primeira linha útil, troque `troque-esta-chave` por uma senha sua — é a senha do painel do professor:
   ```js
   const CHAVE_PROFESSOR = 'minha-senha-secreta';
   ```
5. Salve (ícone de disquete). No menu de funções, escolha **configurarPlanilha** e clique em **▶ Executar**. Autorize o acesso quando o Google pedir (*Avançado → Acessar projeto*). A planilha ganha as abas `Hospitais`, `Jogadores`, `Decisoes`, `Casos`, `Reunioes`, `Comentarios`, `Indicadores`, `Log`, `Rubrica` e `Resumo`.
6. **Backup (recomendado, o jogo dura semanas):** escolha a função **instalarBackupDiario** e clique em **▶ Executar** (o Google pede acesso ao Drive). Toda madrugada uma cópia da planilha vai para a pasta *Plantão IA — backups* do seu Drive; ficam as 14 mais recentes. **fazerBackupAgora** faz uma cópia na hora. Os dois comandos também ficam no menu **Plantão IA** da planilha.
7. Clique em **Implantar → Nova implantação**. Em *Selecionar tipo*, escolha **App da Web** e configure:
   - **Executar como:** Eu
   - **Quem pode acessar:** **Qualquer pessoa** *(importante: “Qualquer pessoa com conta do Google” não funciona)*
8. Clique em **Implantar** e copie a **URL do app da Web** (termina em `/exec`).

### Passo 2 — Colar a URL no site

Abra `js/config.js` e substitua `COLE_AQUI_A_URL_DO_APPS_SCRIPT` pela URL copiada:

```js
API_URL: 'https://script.google.com/macros/s/AKfy.../exec',
```

No mesmo arquivo: `DIAS_POR_DIA_REAL: 3` (dias de jogo por dia do calendário; `0` = sem limite) e `JUSTIFICATIVA_OBRIGATORIA`.

Enquanto a URL não estiver colada, o jogo roda em **modo demonstração** (os dados ficam só no navegador; dá para testar abrindo várias abas).

### Passo 3 — GitHub Pages

1. Em [github.com](https://github.com), crie um repositório **público** (ex.: `plantao-ia`).
2. Clique em **Add file → Upload files** (ou no link *uploading an existing file*) e arraste **todo o conteúdo desta pasta** (`index.html`, `professor.html`, `.nojekyll`, `README.md` e as pastas `css`, `js`, `img`, `apps-script`). Clique em **Commit changes**. Se o `.nojekyll` (arquivo oculto) não subir, crie-o pelo GitHub com *Add file → Create new file*, conteúdo vazio.
3. Vá em **Settings → Pages**. Em *Build and deployment*, escolha **Deploy from a branch**, branch **main**, pasta **/ (root)**, e salve.
4. Em 1 a 2 minutos o jogo estará em `https://SEU-USUARIO.github.io/plantao-ia/`.
5. O painel do professor fica em `https://SEU-USUARIO.github.io/plantao-ia/professor.html`. Nele você vê história, dia, decisões, casos e índice de cada grupo, abre o relatório completo durante o jogo, **fixa a história** de um grupo antes de ele iniciar e **libera dias extras** para quem precisar avançar mais rápido.

### Passo 4 — Testar

Abra o site em dois navegadores (ou um navegador normal e uma janela anônima), crie um hospital em um e entre com o código no outro. Confira se as linhas aparecem na planilha.

### Se alterar o `Code.gs` depois

Use **Implantar → Gerenciar implantações → ✏️ Editar → Versão: Nova versão → Implantar**. Assim a URL continua a mesma. (Criar uma *nova implantação* gera outra URL, e aí é preciso atualizar o `config.js`.)

---

## A planilha

| Aba | Uma linha por… | Colunas principais |
|---|---|---|
| `Hospitais` | grupo | código, nome, status, dia atual (de 30), índice de maturidade final, **porte**, nº de jogadores, **historia** e **bonus_dias** (dias liberados pelo professor) |
| `Jogadores` | jogador | nome, funções, entrada, último acesso, **avatar** (escolhas do vestiário) e data do crachá |
| `Decisoes` | decisão (e escolha de função) | dia, tarefa, função, jogador, opção escolhida, **justificativa**, nº de palavras, referência do gabarito, **nota_professor**, **comentario_professor** |
| `Casos` | caso da urgência avaliado pelo médico | dia, paciente, modelo, escore, limiar, alerta do modelo, **decisão do médico** (aceitou/recusou), **justificativa**, desfecho real, médico acertou, modelo acertou, nota, comentário |
| `Reunioes` | fala em reunião (inclui as reuniões semanais) | reunião, função, jogador, **contribuição**, nº de palavras, nota, comentário |
| `Comentarios` | comentário no Mural | alvo, autor, comentário |
| `Indicadores` | dia avançado por um grupo | os seis indicadores, índice, qualidade, saúde, casos testados |
| `Log` | evento do sistema | criação, entrada, início, história, dia, dias liberados, backup, fim |
| `Rubrica` | — | rubrica sugerida para as justificativas |
| `Resumo` | — | tabelas dinâmicas por hospital e por função |

As colunas `nota_professor` e `comentario_professor` ficam vazias para você preencher.

---

## Estrutura dos arquivos

```
index.html                    o jogo
professor.html                painel do professor (lista de grupos, porte e relatório completo)
css/style.css                 base, painéis, HUD, barra de baixo e telas (paleta CDIA.Saúde, fontes Fredoka e Nunito)
css/visual.css                hospital isométrico, avatares, cenas, cartas, limiar, painel, vestiário, crachá, animações
img/                          logos e favicon da CDIA.Saúde
video/                        vídeo de apresentação (MP4, 1min26s, com narração e legenda), capa e legenda em .vtt
js/config.js                  URL do Apps Script, justificativa obrigatória (sem mínimo) e atualização
js/conteudo/base.js           portes do hospital, funções, setores, indicadores, os 30 dias, sorteio e os 5 modelos da urgência
js/conteudo/tarefas-gestao.js Diretoria e Compras (G1–G6, F1, F3, F5)
js/conteudo/tarefas-clinico.js Urgência e Especialidades (M1–M5, E1, E2, E5)
js/conteudo/tarefas-ti.js     TI, Dados e BI (T1–T6, TM) — dashboard e visualização
js/conteudo/tarefas-operacoes.js Bloco cirúrgico, Transplantes e Farmácia (C2–C6, TX1, TX2, F2, F4, F6)
js/conteudo/reunioes.js       reuniões (R1, R2, RP, RT, R4, RB, R5)
js/conteudo/eventos.js        eventos do jornal diário, disparados pelas decisões
js/conteudo/casos.js          casos diários da urgência: banco de pacientes, o que cada modelo responde, consequências
js/conteudo/calendario.js     dia de cada tarefa e evento, reuniões semanais (S1–S4), prioridades (P1–P3), M6, M7, imprevistos
js/conteudo/historias.js      as 6 histórias: sinais, incidente, decisões I1–I5, casos do incidente e desfecho
js/conteudo/glossario.js      glossário com exemplos do hospital
js/conteudo/conquistas.js     conquistas reveladas no fim
js/engine.js                  motor: recalcula o hospital a partir das decisões gravadas (porte, história, semente, limite de dias)
js/api.js                     comunicação com o Apps Script (e servidor local do modo demonstração)
js/arte.js                    arte vetorial: ícones, avatares personalizáveis, crachá e primitivas isométricas (tudo em SVG)
js/visual.js                  hospital isométrico, cenas, cartas, limiar, painel, caminhada dos avatares, transições
js/ui.js, js/app.js           telas e interação
apps-script/Code.gs           backend que grava tudo na planilha
```

Para mudar textos, custos ou efeitos, edite os arquivos de `js/conteudo/`. Cada tarefa tem `setor` (a função responsável vem do porte), `portes` (em quais hospitais aparece) e `caso` (o caso real). Os efeitos de cada opção estão em `fx`, os custos em `custo` (R$ mil, ajustados pelo porte) e a referência em `q` (2 = boa prática, 1 = aceitável, 0 = risco, `null` = sem resposta única). O orçamento de cada porte fica em `G.PORTES` (`base.js`).

**Justificativas.** Não há tamanho mínimo. Por padrão o campo não pode ficar vazio; para torná-lo opcional, use `JUSTIFICATIVA_OBRIGATORIA: false` em `js/config.js` e `MIN_CARACTERES = 0` no `Code.gs`.

---

## Problemas comuns

- **“Sem conexão com o servidor”** — confira a URL em `js/config.js` (deve terminar em `/exec`) e se a implantação está com acesso **Qualquer pessoa**.
- **Mudei o `Code.gs` e nada mudou** — é preciso publicar uma *nova versão* da implantação (veja acima).
- **“Chave do professor incorreta”** — a chave é a do `Code.gs` *implantado*; depois de trocá-la, publique uma nova versão.
- **Limites do Google** — contas gratuitas suportam com folga uma turma inteira (cada aparelho consulta a planilha a cada 8 segundos com a aba aberta e a cada 60 com a aba escondida, com cache no servidor). Se ficar lento, aumente `POLL_MS` em `js/config.js`.
- **“O jogo travou”** — o grupo provavelmente terminou os dias liberados de hoje; a tela mostra quando o próximo dia abre. Para acelerar, use **Liberar +3 dias** no painel do professor.

Os hospitais, números, modelos, ferramentas e depoimentos do jogo são **fictícios**, criados para ensino. Os casos da caixa “Na vida real” são verídicos e trazem a fonte.

- **Atualizei de uma versão anterior** — cole o novo `Code.gs`, rode `configurarPlanilha` (cria `Casos` e `Indicadores` e acrescenta as colunas novas — como `historia` e `bonus_dias` — sem apagar nada) e publique uma *nova versão* da implantação. Para a versão 5, o ideal é começar uma turma nova: jogos da versão 4 (7 dias) não se convertem para 30 dias.
- **“Falta pegar o crachá”** — alguém com função ainda não passou no vestiário. Cada pessoa resolve na própria tela (botão *Ir ao vestiário* na sala de espera).
