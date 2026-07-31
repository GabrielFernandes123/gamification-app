# 15 — Mecânicas Futuras

> Ideias **vivas**, não pendências. Cada uma foi analisada, faz sentido, e não
> entra agora por uma razão registrada — quase sempre porque depende de tempo
> passar, não de esforço.
>
> Criado em **2026-08-06**, ao separar "o que falta fazer" (que vive no
> [14 §13](./14-backlog-modulos-e-mecanicas.md)) de "o que faria sentido um dia".
> A distinção importa: pendência cobra, ideia inspira, e misturar as duas faz o
> backlog parecer maior e mais atrasado do que é.

---

## 1. ⑪ Ascensão — o *new game+*

**O que é.** Fechado um ciclo anual completo, "ascender": um reset parcial que
troca progresso acumulado por um bônus **permanente** (por exemplo +20% de HP
máximo, ou um ponto de atributo que não se perde na morte).

**Por que faz sentido.** É a resposta para "e depois?". Um sistema de hábitos
que só sobe fica sem gesto para o segundo ano — e o segundo ano é justamente o
que separa quem usa de quem usou.

**Por que NÃO entra agora.** Não dá para calibrar +20% sem ter passado por 100%
uma vez. Qual o HP de quem jogou um ano inteiro? Quanto ouro circula numa
temporada madura? Sem esses números medidos, o bônus é chute — e um chute aqui
desequilibra tudo que vem depois dele.

**O que destrava.** Um ciclo anual completo com dado real. Não é trabalho, é
tempo.

---

## 2. Módulo Finanças

**O que é.** Gastos e receitas reais como módulo de atividade, com a sinergia
óbvia: o ouro do jogo ao lado do dinheiro de verdade.

**Por que faz sentido.** A arquitetura plugável já o suporta sem retrabalho —
tabelas de domínio + chamada ao `_grant` + linha no `module_registry`
([04 §1](./04-modulos.md)). E é o único domínio grande da vida adulta que o
sistema ainda não toca.

**O cuidado que ele exige.** Dinheiro **não** pode virar dano. O sistema já tem
a regra de que "comer" não bate ([04 §4.14](./04-modulos.md)), e por dinheiro ela
vale em dobro: perder HP por um mês apertado pune quem já está apertado. Ganho
por registrar e por bater meta de poupança; nunca golpe por gastar.

**Por que NÃO entra agora.** É módulo novo inteiro (schema, telas nos dois
clientes, importação de extrato ou registro manual). Cabe quando os quinze atuais
estiverem sendo usados de fato — o liga-desliga
([06 §9.15](./06-dados.md)) existe justamente porque módulo demais compete com
módulo bom.

---

## 3. Cadências de boss arbitrárias

**O que é.** Hoje os tiers são fixos: mensal, trimestral, semestral, anual. Isto
permitiria "um boss a cada 20 dias", ou ciclos que não se alinham.

**Por que faz sentido.** Nem todo compromisso tem forma de mês. Um projeto de 45
dias não cabe em nenhum tier atual sem esticar ou encolher a verdade.

**Por que NÃO entra agora.** Explode em dois lugares ao mesmo tempo:
- A **árvore de bosses** da tela de História assume tiers alinhados — o mensal
  dentro do trimestral, dentro do semestral. Com cadências arbitrárias não há
  árvore, há uma lista de barras sobrepostas.
- A **geração narrativa** encadeia capítulos pela hierarquia dos tiers. Sem
  hierarquia, o narrador perde o fio.

O conjunto pequeno (quinzenal/mensal) cobre quase todo caso real por um custo
muito menor.

---

## 4. Sub-histórias paralelas customizadas

**O que é.** Você desenhar N bosses paralelos, cada um com roteamento próprio de
dano — "este boss só toma dano de leitura; aquele só de treino".

**Por que faz sentido.** É a personalização máxima do arco: transformar a
temporada num mapa que você desenhou.

**Uma versão disso JÁ EXISTE.** Os tiers rodam em paralelo e cada um toma dano da
sua fonte ([05 §3](./05-temporadas-boss.md)). O que falta é o controle explícito
sobre quais e quantos — e é justamente a parte que multiplica a complexidade da
UI e da narrativa sem multiplicar o valor na mesma proporção.

**Por que NÃO entra agora.** Depende do §3 acima (cadências), e porque a versão
automática cobre o caso comum. Personalização que ninguém pediu é complexidade
que todo mundo paga.

---

## 5. A régua para promover uma ideia daqui

Uma mecânica sai deste documento e vira trabalho quando as três forem verdade:

1. **O bloqueio caiu.** O tempo passou, o dado existe, a dependência entrou.
2. **Tem tela.** Mecânica sem lugar para ser vista não existe para quem usa —
   é a lição que o escalonamento de dano ensinou, funcionando em segredo por
   dias ([02 §7.2.1](./02-economia.md)).
3. **Não compete com algo melhor.** O custo real de uma mecânica nova não é
   construí-la: é a atenção que ela tira das que já funcionam.
