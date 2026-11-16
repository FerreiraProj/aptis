export interface SeoFeature {
  icon: string;
  title: string;
  description: string;
}

export interface SeoFaq {
  question: string;
  answer: string;
}

export interface SeoSection {
  heading: string;
  content: string;
}

export interface SeoPageConfig {
  slug: string;
  metaTitle: string;
  metaDescription: string;
  keywords: string[];
  h1: string;
  intro: string;
  sections: SeoSection[];
  features: SeoFeature[];
  faq: SeoFaq[];
  ctaLabel?: string;
}

export const SEO_PAGES: SeoPageConfig[] = [
  // ── DISCIPLINE PAGES ────────────────────────────────────────────────────────

  {
    slug: "estudar-biologia-com-ia",
    metaTitle: "Estudar Biologia com IA — Flashcards e Quizzes Automáticos",
    metaDescription:
      "Transforma os teus PDFs e apontamentos de Biologia em flashcards e quizzes automáticos com IA. Método de repetição espaçada para memorizar células, genética, ecologia e mais.",
    keywords: [
      "estudar biologia com ia",
      "flashcards biologia",
      "quizzes biologia pdf",
      "como estudar biologia",
      "repetição espaçada biologia",
    ],
    h1: "Estudar Biologia com IA — Flashcards, Quizzes e Plano de Estudo",
    intro:
      "A Biologia é uma das disciplinas com maior volume de conteúdo para memorizar: ciclos celulares, genética, metabolismo, ecologia, evolução. Ler o livro uma vez não chega. O Aptis transforma automaticamente os teus PDFs e apontamentos de Biologia em flashcards e quizzes, para estudares com active recall e repetição espaçada — o método que a ciência comprova ser até 3× mais eficaz do que a releitura passiva.",
    sections: [
      {
        heading: "Porque é tão difícil memorizar Biologia?",
        content:
          "O problema não é falta de esforço — é o método. Sublinhar e reler cria uma ilusão de conhecimento: o conteúdo parece familiar no momento, mas desaparece rapidamente. A Biologia exige que consigas reconhecer conceitos fora de contexto, encadear processos complexos (como a respiração celular ou a divisão meiótica) e aplicar o que sabes a novas situações. Isso só se consegue com prática ativa, não com leitura passiva. Além disso, a quantidade de terminologia específica (mitose, meiose, fotossíntese, epigenética, homeostasia) sobrecarrega a memória de trabalho quando tentamos estudar tudo de uma vez.",
      },
      {
        heading: "O método certo: Active Recall e Repetição Espaçada",
        content:
          "Active recall é a prática de te forçares a recuperar informação sem a ver — respondendo a perguntas, fazendo quizzes, tapando as notas e tentando reproduzir os conceitos. Estudos publicados na revista Science mostram que esta técnica aumenta a retenção em até 50% comparado com releitura. A repetição espaçada complementa isto ao apresentar cada flashcard no momento certo — antes de o esqueceres —, usando algoritmos baseados na curva de Ebbinghaus. Combinados, estes dois métodos são a forma mais eficiente de memorizar o enorme volume de conteúdo de Biologia.",
      },
      {
        heading: "Como o Aptis te ajuda a estudar Biologia",
        content:
          "Com o Aptis carregas os teus PDFs de Biologia — manuais, acetatos, apontamentos — e em segundos a IA gera automaticamente flashcards e quizzes adaptados ao conteúdo. Não precisas de criar as perguntas manualmente. O sistema identifica os conceitos-chave (definições, processos, comparações) e transforma-os em perguntas de escolha múltipla, verdadeiro/falso e resposta aberta. Um tutor IA responde às tuas dúvidas sobre qualquer tópico de Biologia, explicando com analogias e exemplos do mundo real.",
      },
    ],
    features: [
      {
        icon: "🧬",
        title: "Flashcards de Biologia automáticos",
        description:
          "Carrega qualquer manual ou apontamento e recebe dezenas de flashcards sobre células, genética, ecologia, evolução e mais.",
      },
      {
        icon: "📝",
        title: "Quizzes adaptativos por tema",
        description:
          "Quizzes gerados a partir do teu conteúdo com perguntas de escolha múltipla, V/F e resposta aberta — com explicações detalhadas.",
      },
      {
        icon: "🗓️",
        title: "Plano de estudo personalizado",
        description:
          "A IA cria um plano semanal adaptado ao teu ritmo, dando prioridade aos temas onde tens mais dificuldade.",
      },
      {
        icon: "🤖",
        title: "Tutor IA especializado",
        description:
          "Faz qualquer pergunta sobre Biologia e recebe explicações claras com exemplos, analogias e ligações entre conceitos.",
      },
    ],
    faq: [
      {
        question: "O Aptis funciona com os manuais de Biologia portugueses?",
        answer:
          "Sim. O Aptis processa PDFs em qualquer idioma, incluindo os manuais adotados em Portugal. Basta carregar o PDF e a IA gera os flashcards e quizzes automaticamente em português.",
      },
      {
        question: "Quantos flashcards posso criar por documento?",
        answer:
          "No plano gratuito podes gerar até 20 flashcards por documento. Os planos pagos permitem até 50 flashcards por documento, ideal para capítulos extensos de Biologia.",
      },
      {
        question: "Os quizzes de Biologia têm explicações das respostas?",
        answer:
          "Sim. Cada pergunta do quiz inclui uma explicação detalhada de por que a resposta é correta, o que reforça a compreensão e evita que memorizes erros.",
      },
      {
        question: "Posso organizar os flashcards por tema de Biologia?",
        answer:
          "Sim. Podes criar disciplinas (ex: Biologia 12.º ano) e organizar todos os documentos e flashcards dentro dessa disciplina, com filtros por tema e dificuldade.",
      },
    ],
  },

  {
    slug: "estudar-direito-com-ia",
    metaTitle: "Estudar Direito com IA — Transforma Apontamentos em Perguntas",
    metaDescription:
      "Estuda Direito de forma mais eficaz com IA. Transforma apontamentos de Direito Constitucional, Civil, Penal e mais em flashcards e quizzes automáticos.",
    keywords: [
      "estudar direito com ia",
      "flashcards direito",
      "quizzes direito pdf",
      "como estudar direito",
      "apontamentos direito",
    ],
    h1: "Estudar Direito com IA — Do Constitucional ao Civil, mais rápido",
    intro:
      "O Direito é uma das áreas de estudo mais exigentes: centenas de artigos de lei, decisões jurisprudenciais, doutrinas e casos práticos. O Aptis usa IA para transformar os teus apontamentos e manuais jurídicos em flashcards e quizzes, permitindo-te praticar a aplicação dos conceitos jurídicos — não apenas a memorização passiva.",
    sections: [
      {
        heading: "O desafio de estudar Direito",
        content:
          "O volume de matéria no Direito é esmagador: o Código Civil português tem mais de 2.000 artigos; o Penal, centenas mais. A par dos artigos, há que dominar a interpretação doutrinária e a jurisprudência dos tribunais. Muitos estudantes caem na armadilha de copiar os apontamentos em fichas, o que é demorado e não garante que consigam aplicar o conhecimento a casos concretos — exatamente o que os exames testam.",
      },
      {
        heading: "Como o active recall ajuda no estudo do Direito",
        content:
          "Em vez de reler passivamente os artigos de lei, o active recall força-te a recuperar o conteúdo: Qual é o requisito do artigo 405.º do Código Civil? O que distingue dolo eventual de negligência consciente? Esta prática repetida fortalece as ligações neuronais e torna a recuperação de informação automática — indispensável num exame oral ou numa resolução de casos práticos.",
      },
      {
        heading: "O Aptis na prática jurídica",
        content:
          "Carrega os teus apontamentos de Direito Constitucional, Civil, Penal, Processual ou qualquer outra área — o Aptis gera perguntas de estudo adaptadas ao contexto jurídico. A IA reconhece termos como \"requisitos de validade\", \"ónus da prova\", \"presunção legal\" e formula questões relevantes. O tutor IA pode também simular um exame oral, pedindo-te para aplicar princípios a casos concretos.",
      },
    ],
    features: [
      { icon: "⚖️", title: "Flashcards de conceitos jurídicos", description: "Definições, requisitos legais, distinções doutrinárias — em cards prontos a revisar." },
      { icon: "📋", title: "Quizzes de casos práticos", description: "Perguntas de aplicação de lei a situações concretas, com correção e explicação." },
      { icon: "🗓️", title: "Plano por cadeira", description: "Organiza o estudo por disciplina (Constitucional, Civil, Penal) com plano automático." },
      { icon: "🤖", title: "Tutor de Direito IA", description: "Coloca questões jurídicas complexas e recebe explicações claras com exemplos práticos." },
    ],
    faq: [
      { question: "O Aptis percebe terminologia jurídica específica?", answer: "Sim. A IA é treinada para reconhecer linguagem jurídica e gerar perguntas relevantes, como distinções entre institutos jurídicos, requisitos legais e aplicação de princípios." },
      { question: "Posso usar o Aptis para preparar exames orais de Direito?", answer: "Sim. O tutor IA pode simular um exame oral, colocando questões sobre os temas que carregaste e pedindo-te para argumentar juridicamente." },
      { question: "Funciona com manuais de Direito em PDF?", answer: "Sim. Basta carregar o PDF do manual ou dos apontamentos digitalizados e o Aptis extrai o conteúdo e gera os materiais de estudo automaticamente." },
      { question: "Posso criar flashcards sobre artigos específicos do Código Civil?", answer: "Sim. Podes carregar secções específicas do código e pedir à IA que crie flashcards focados nesses artigos, incluindo as suas exceções e requisitos." },
    ],
  },

  {
    slug: "estudar-medicina-com-ia",
    metaTitle: "Estudar Medicina com IA — Anatomia, Farmacologia e mais",
    metaDescription:
      "Estuda Medicina de forma mais eficaz. Transforma PDFs de Anatomia, Fisiologia, Farmacologia e Patologia em flashcards e quizzes com IA.",
    keywords: [
      "estudar medicina com ia",
      "flashcards medicina",
      "quizzes anatomia pdf",
      "como estudar medicina",
      "repetição espaçada medicina",
    ],
    h1: "Estudar Medicina com IA — Da Anatomia à Farmacologia",
    intro:
      "O curso de Medicina é um dos mais exigentes do mundo, com volumes imensos de conteúdo a memorizar em cada semestre. O Aptis ajuda estudantes de medicina a transformar os seus materiais de estudo em flashcards e quizzes eficazes, usando os princípios de repetição espaçada e active recall que profissionais da área como o Dr. Anki tornaram populares.",
    sections: [
      {
        heading: "O volume de informação em Medicina",
        content:
          "Um estudante de Medicina em Portugal tem de dominar milhares de estruturas anatómicas, mecanismos fisiológicos, patologias, tratamentos e fármacos — em apenas 6 anos. O volume é tão grande que a maioria dos estudantes recorre a flashcards físicos ou ferramentas como o Anki. O Aptis vai mais longe: cria automaticamente os flashcards a partir dos teus próprios materiais, adaptados à tua faculdade e programa.",
      },
      {
        heading: "Repetição espaçada: o método dos melhores estudantes de Medicina",
        content:
          "A repetição espaçada é amplamente utilizada pelos melhores estudantes de Medicina do mundo. O algoritmo apresenta cada flashcard no momento ótimo — antes de o esqueceres —, maximizando a retenção com o mínimo de tempo. Estudar 30 minutos por dia com repetição espaçada é mais eficaz do que 4 horas de releitura intensa. O Aptis implementa este algoritmo automaticamente.",
      },
      {
        heading: "Aptis para Medicina: casos de uso",
        content:
          "Carrega os slides de Anatomia Humana e recebe flashcards com nomes de estruturas, funções e relações topográficas. Usa quizzes de Farmacologia para praticar mecanismos de ação, indicações e efeitos adversos dos fármacos. Para Patologia, cria flashcards com critérios diagnósticos, apresentações clínicas e tratamentos. O tutor IA pode explicar mecanismos fisiopatológicos com analogias simples.",
      },
    ],
    features: [
      { icon: "🩺", title: "Flashcards médicos especializados", description: "Estruturas anatómicas, fármacos, patologias — gerados automaticamente a partir dos teus PDFs." },
      { icon: "📝", title: "Quizzes clínicos", description: "Questões de escolha múltipla e caso clínico, com explicações detalhadas das respostas." },
      { icon: "🔬", title: "Por disciplina médica", description: "Organiza por Anatomia, Fisiologia, Bioquímica, Farmacologia, Patologia, etc." },
      { icon: "🤖", title: "Tutor clínico IA", description: "Explica mecanismos fisiopatológicos, protocolos de tratamento e diagnóstico diferencial." },
    ],
    faq: [
      { question: "O Aptis funciona com os PDFs das faculdades de Medicina?", answer: "Sim. O Aptis processa qualquer PDF, incluindo slides de aulas, manuais clínicos e guidelines. A IA adapta as perguntas ao conteúdo médico." },
      { question: "É melhor que o Anki para Medicina?", answer: "O Aptis complementa o Anki ao eliminar o trabalho de criar os flashcards manualmente. Enquanto o Anki exige que cries cada card, o Aptis gera-os automaticamente a partir dos teus documentos." },
      { question: "Posso usar o Aptis para preparar o exame de acesso à especialidade?", answer: "Sim. Podes carregar guidelines, livros de especialidade e artigos científicos. O Aptis gera questões no formato das provas de especialidade." },
      { question: "O Aptis suporta imagens de anatomia nos PDFs?", answer: "Atualmente o Aptis processa texto extraído dos PDFs. Imagens e diagramas anatómicos ainda não são processados diretamente, mas podes descrever estruturas em texto e criar flashcards sobre elas." },
    ],
  },

  {
    slug: "estudar-engenharia-com-ia",
    metaTitle: "Estudar Engenharia com IA — Fórmulas, Problemas e Conceitos",
    metaDescription:
      "Transforma apontamentos de Engenharia em flashcards e quizzes com IA. Memoriza fórmulas, conceitos de termodinâmica, eletromagnetismo, cálculo e mais.",
    keywords: [
      "estudar engenharia com ia",
      "flashcards engenharia",
      "como estudar engenharia",
      "quizzes engenharia pdf",
      "fórmulas engenharia flashcards",
    ],
    h1: "Estudar Engenharia com IA — Fórmulas, Conceitos e Resolução de Problemas",
    intro:
      "Engenharia combina a memorização de fórmulas e conceitos teóricos com a aplicação prática na resolução de problemas. O Aptis ajuda-te nas duas frentes: cria flashcards para os conceitos teóricos e usa o tutor IA para te explicar a aplicação das fórmulas a casos concretos.",
    sections: [
      {
        heading: "O desafio de Engenharia: teoria e prática",
        content:
          "Em Engenharia, não basta memorizar a fórmula de Bernoulli ou a lei de Ohm — tens de saber quando e como aplicá-las. Muitos estudantes investem horas a copiar apontamentos mas chegam ao exame sem conseguir resolver problemas novos. O problema é que praticaram reconhecimento (ver a fórmula) e não recuperação (recordar e aplicar).",
      },
      {
        heading: "Como usar active recall em Engenharia",
        content:
          "Para Engenharia, o active recall funciona a dois níveis: flashcards para definições e fórmulas (Qual é a equação de Navier-Stokes? O que é o número de Reynolds?), e resolução de problemas sem consulta de notas para praticar a aplicação. O Aptis cobre o primeiro nível com geração automática de flashcards, enquanto o tutor IA te guia na compreensão dos conceitos subjacentes.",
      },
      {
        heading: "Aptis para Engenharia na prática",
        content:
          "Carrega os slides de Termodinâmica, Eletromagnetismo, Cálculo ou Mecânica dos Fluidos — o Aptis extrai os conceitos-chave e cria flashcards focados nas definições, fórmulas e relações entre variáveis. O tutor IA pode explicar a derivação de uma equação passo a passo ou clarificar quando usar uma lei em detrimento de outra.",
      },
    ],
    features: [
      { icon: "⚙️", title: "Flashcards de fórmulas e conceitos", description: "Fórmulas, leis físicas, definições e relações entre grandezas — em formato de card." },
      { icon: "📐", title: "Quizzes teóricos", description: "Perguntas conceptuais e de aplicação de fórmulas a situações simples." },
      { icon: "🗂️", title: "Organização por cadeira", description: "Termodinâmica, Eletromagnetismo, Cálculo, Estruturas — cada disciplina no seu espaço." },
      { icon: "🤖", title: "Explicação de conceitos IA", description: "O tutor IA explica derivações, analogias físicas e a intuição por detrás das fórmulas." },
    ],
    faq: [
      { question: "O Aptis consegue processar equações matemáticas dos PDFs?", answer: "O Aptis extrai o texto dos PDFs. Equações em formato de imagem não são processadas, mas equações em LaTeX ou texto são lidas e incorporadas nos flashcards." },
      { question: "Posso usar o Aptis para todas as áreas de Engenharia?", answer: "Sim. Engenharia Civil, Mecânica, Eletrotécnica, Informática, Química, Biomédica — o Aptis adapta-se ao conteúdo de qualquer área." },
      { question: "O tutor IA consegue resolver problemas de Engenharia?", answer: "O tutor IA pode explicar conceitos, guiar a resolução de um problema passo a passo e clarificar dúvidas conceptuais. Não substitui a prática de resolução, mas ajuda a perceber onde estás a errar." },
      { question: "Funciona com slides de professores em português?", answer: "Sim. Carrega o PDF dos slides e o Aptis gera flashcards e quizzes em português, com o vocabulário técnico da tua área." },
    ],
  },

  // ── PROBLEM PAGES ────────────────────────────────────────────────────────────

  {
    slug: "gerar-quizzes-a-partir-de-pdf",
    metaTitle: "Gerar Quizzes a partir de PDF — Automático com IA",
    metaDescription:
      "Gera quizzes de estudo automaticamente a partir dos teus PDFs com IA. Perguntas de escolha múltipla, V/F e resposta aberta — em segundos.",
    keywords: [
      "gerar quizzes a partir de pdf",
      "criar quizzes automaticamente",
      "quiz pdf ia",
      "perguntas a partir de pdf",
      "transformar pdf em perguntas",
    ],
    h1: "Gerar Quizzes a partir de PDF — Estudo Ativo em Segundos",
    intro:
      "Criar perguntas de estudo manualmente a partir de um PDF é demorado e cansativo. O Aptis faz isso automaticamente: carregas o PDF — seja um manual, artigo ou apontamento — e a IA gera um quiz completo com perguntas de escolha múltipla, verdadeiro/falso e resposta aberta, com correção e explicações incluídas.",
    sections: [
      {
        heading: "Porque é que estudar com quizzes é mais eficaz",
        content:
          "Quizzes ativam a memória de forma ativa — forçam-te a recuperar informação em vez de simplesmente reconhecê-la. Um estudo clássico de Roediger e Karpicke (2006) mostrou que estudantes que fizeram um teste antes do exame final retiveram 50% mais informação do que os que apenas releram o material. O problema é que criar quizzes manualmente leva tempo — exatamente o que o Aptis resolve.",
      },
      {
        heading: "Como funciona a geração de quizzes a partir de PDF",
        content:
          "O processo é simples: carregas o teu PDF no Aptis, escolhes o número de perguntas (entre 5 e 30) e o tipo de quiz (escolha múltipla, resposta aberta ou misto). Em segundos, a IA analisa o conteúdo, identifica os conceitos-chave e gera um quiz completo com opções realistas e distratores plausíveis. Cada pergunta inclui uma explicação da resposta correta.",
      },
      {
        heading: "Tipos de perguntas que o Aptis gera",
        content:
          "Para escolha múltipla, a IA cria 4 opções (A-D) com distratores plausíveis — erros comuns ou conceitos parecidos. Para resposta aberta, gera perguntas que exigem síntese e compreensão, não apenas memorização. Para verdadeiro/falso, apresenta afirmações que testam distinções subtis entre conceitos próximos. Todas as perguntas têm explicações detalhadas da resposta correta.",
      },
    ],
    features: [
      { icon: "⚡", title: "Quiz em segundos", description: "Carrega o PDF e recebe um quiz completo em menos de 30 segundos." },
      { icon: "🎯", title: "Três tipos de perguntas", description: "Escolha múltipla, verdadeiro/falso e resposta aberta, escolhes o formato." },
      { icon: "💡", title: "Explicações incluídas", description: "Cada resposta vem com uma explicação clara de por que está correta ou errada." },
      { icon: "📊", title: "Resultado e progresso", description: "Vê o teu score, percentagem de acerto e histórico de tentativas." },
    ],
    faq: [
      { question: "Quantas perguntas pode ter um quiz gerado pelo Aptis?", answer: "Entre 5 e 30 perguntas por quiz. Podes gerar vários quizzes do mesmo documento para cobrir todo o conteúdo." },
      { question: "O Aptis gera quizzes em português?", answer: "Sim. O Aptis detecta o idioma do documento e gera o quiz no mesmo idioma. Para PDFs em português, o quiz será completamente em português." },
      { question: "Posso refazer o mesmo quiz?", answer: "Sim. Podes repetir um quiz quantas vezes quiseres para melhorar o teu score. O sistema regista o histórico de tentativas para acompanhares a tua evolução." },
      { question: "O quiz fica guardado para rever depois?", answer: "Sim. Todos os quizzes gerados ficam guardados na tua conta, organizados por documento e disciplina. Podes revisitá-los a qualquer momento." },
    ],
  },

  {
    slug: "transformar-apontamentos-em-flashcards",
    metaTitle: "Transformar Apontamentos em Flashcards — Automático com IA",
    metaDescription:
      "Converte os teus apontamentos em flashcards de estudo automáticos com IA. Repetição espaçada para memorizar mais em menos tempo.",
    keywords: [
      "transformar apontamentos em flashcards",
      "converter apontamentos flashcards",
      "flashcards automáticos ia",
      "criar flashcards a partir de notas",
      "apontamentos flashcards",
    ],
    h1: "Transformar Apontamentos em Flashcards — Automático com IA",
    intro:
      "Criar flashcards manualmente a partir dos teus apontamentos pode demorar tanto como estudar o conteúdo — e depois ainda tens de os estudar. O Aptis elimina essa etapa: carregas os teus apontamentos (PDF, texto digitado, ou slides) e a IA cria automaticamente dezenas de flashcards prontos a revisar com repetição espaçada.",
    sections: [
      {
        heading: "O problema com os apontamentos tradicionais",
        content:
          "Tirar apontamentos é valioso para processar informação na aula. Mas usar os apontamentos como material de estudo principal tem limitações: relê-los é passivo, não testa se realmente sabes a matéria. Além disso, os apontamentos são frequentemente longos e mal estruturados para revisão rápida. Transformá-los em flashcards resolve estes dois problemas: força recuperação ativa e torna a revisão mais eficiente.",
      },
      {
        heading: "Como a IA transforma apontamentos em flashcards",
        content:
          "A IA do Aptis analisa os teus apontamentos e identifica automaticamente: definições de termos, relações entre conceitos, listas de itens, processos passo a passo e comparações entre elementos. Para cada um destes elementos gera um flashcard com uma pergunta clara na frente e a resposta detalhada no verso. Cada card inclui também dificuldade estimada (fácil, médio, difícil) e tags por tema.",
      },
      {
        heading: "Repetição espaçada: estudar menos, reter mais",
        content:
          "Depois de criados, os flashcards entram num sistema de repetição espaçada que apresenta cada card no momento certo — antes de o esqueceres. O algoritmo ajusta-se automaticamente: cards que respondes corretamente aparecem menos vezes; os que erras aparecem com mais frequência. Com 15-20 minutos de revisão diária, consegues manter centenas de flashcards em memória.",
      },
    ],
    features: [
      { icon: "✨", title: "Conversão instantânea", description: "Dos teus apontamentos para flashcards prontos em segundos, sem trabalho manual." },
      { icon: "🔄", title: "Repetição espaçada integrada", description: "Algoritmo inteligente que apresenta cada card no momento ótimo para maximizar retenção." },
      { icon: "🏷️", title: "Organização por tema", description: "Cada flashcard é automaticamente categorizado por tema e dificuldade." },
      { icon: "📱", title: "Revisão em qualquer lugar", description: "Revisa os teus flashcards no computador, tablet ou telemóvel." },
    ],
    faq: [
      { question: "Que formatos de apontamentos o Aptis aceita?", answer: "PDFs, incluindo PDFs com texto digitado, slides exportados e apontamentos digitalizados com texto legível. Documentos Word e texto colado diretamente também são suportados." },
      { question: "Quantos flashcards são gerados por documento?", answer: "Entre 10 e 50 flashcards por documento, dependendo do volume e densidade do conteúdo. Podes ajustar o número antes de gerar." },
      { question: "Posso editar os flashcards gerados pela IA?", answer: "Sim. Podes editar qualquer flashcard depois de gerado — alterar a pergunta, a resposta ou adicionar contexto. Podes também criar flashcards manualmente." },
      { question: "O sistema lembra-se de quais flashcards já sei bem?", answer: "Sim. O sistema de repetição espaçada regista o teu desempenho em cada card e ajusta a frequência de revisão automaticamente." },
    ],
  },

  {
    slug: "estudar-a-partir-de-pdf",
    metaTitle: "Como Estudar a partir de PDFs — Método Ativo com IA",
    metaDescription:
      "Aprende a estudar de forma eficaz a partir de PDFs. Transforma qualquer PDF em flashcards, quizzes e planos de estudo com IA — método comprovado pela ciência.",
    keywords: [
      "estudar a partir de pdf",
      "como estudar pdf",
      "transformar pdf estudo",
      "pdf flashcards automatico",
      "estudar documentos pdf ia",
    ],
    h1: "Como Estudar a partir de PDFs de Forma Eficaz",
    intro:
      "Ler um PDF de forma passiva — rolando a página sem envolvimento ativo — é uma das formas menos eficientes de estudar. A boa notícia é que o PDF em si não é o problema: o problema é o método. O Aptis transforma qualquer PDF numa experiência de estudo ativo, gerando automaticamente flashcards, quizzes e planos de revisão.",
    sections: [
      {
        heading: "Por que reler um PDF não funciona",
        content:
          "Quando relemos um texto, o cérebro entra em modo de \"reconhecimento\": o conteúdo parece familiar porque acabámos de o ver, mas isso não significa que está armazenado em memória de longo prazo. Estudos de psicologia cognitiva mostram que este efeito de familiaridade cria uma ilusão de conhecimento — achamos que sabemos mais do que sabemos. O teste real é: consegues reproduzir o conteúdo sem olhar para o PDF?",
      },
      {
        heading: "O método certo para estudar PDFs",
        content:
          "A abordagem mais eficaz tem três passos: primeiro, faz uma leitura ativa com o objetivo de identificar os conceitos-chave (não de os memorizar). Segundo, converte esses conceitos em perguntas e flashcards. Terceiro, pratica a recuperação respondendo às perguntas sem consultar o PDF. O Aptis automatiza o segundo passo — geração de flashcards e quizzes — para que possas focar-te nos outros dois.",
      },
      {
        heading: "O Aptis como co-piloto de estudo",
        content:
          "Com o Aptis, o teu fluxo de estudo a partir de PDFs fica assim: carregas o PDF, escolhes quantos flashcards e quizzes quer gerar, e o Aptis faz o trabalho pesado. Depois, revisas os flashcards com repetição espaçada durante os dias seguintes e fazes quizzes para testar a tua retenção. O tutor IA está disponível para esclarecer qualquer dúvida sobre o conteúdo do PDF.",
      },
    ],
    features: [
      { icon: "📄", title: "Qualquer PDF", description: "Manuais, artigos científicos, slides, apontamentos digitalizados — qualquer PDF funciona." },
      { icon: "🧠", title: "Estudo ativo automático", description: "Flashcards e quizzes gerados instantaneamente para substituir a leitura passiva." },
      { icon: "📅", title: "Plano de revisão", description: "O sistema cria um plano de revisão espaçada para que não esqueças o que estudaste." },
      { icon: "🤖", title: "Perguntas ao tutor IA", description: "Faz perguntas sobre o conteúdo do PDF e recebe respostas contextualizadas." },
    ],
    faq: [
      { question: "O Aptis funciona com PDFs em qualquer idioma?", answer: "Sim. O Aptis processa PDFs em português, inglês, espanhol, francês, alemão, italiano e mais. Os flashcards e quizzes são gerados no idioma do documento." },
      { question: "Qual é o tamanho máximo de PDF que posso carregar?", answer: "O Aptis suporta PDFs de até 50MB e processa os primeiros 10.000 palavras extraídas do documento para geração de conteúdo." },
      { question: "O Aptis funciona com PDFs digitalizados (scan)?", answer: "Para PDFs digitalizados, o conteúdo precisa de ter texto reconhecível por OCR. PDFs que são apenas imagens sem camada de texto não são processados." },
      { question: "Posso carregar vários capítulos de um manual em PDFs separados?", answer: "Sim. Podes carregar vários PDFs e organizá-los por disciplina. Cada PDF gera os seus próprios flashcards e quizzes, e podes combiná-los para revisão." },
    ],
  },

  {
    slug: "criar-plano-de-estudo-automatico",
    metaTitle: "Criar Plano de Estudo Automático com IA — Personalizado",
    metaDescription:
      "Cria um plano de estudo personalizado automaticamente com IA. A partir dos teus documentos, a IA define o que estudar, quando e como — adaptado ao teu ritmo.",
    keywords: [
      "criar plano de estudo automatico",
      "plano de estudo ia",
      "plano de estudo personalizado",
      "como criar plano de estudo",
      "app plano de estudo",
    ],
    h1: "Criar um Plano de Estudo Automático com IA",
    intro:
      "Criar um plano de estudo eficaz exige saber o que estudar, em que ordem, e quanto tempo dedicar a cada tema. Fazê-lo manualmente é difícil e raramente funciona — tendemos a dedicar mais tempo ao que já sabemos bem e a evitar o que nos dá mais trabalho. O Aptis cria um plano de estudo personalizado automaticamente, baseado nos teus documentos e no teu desempenho nos quizzes e flashcards.",
    sections: [
      {
        heading: "Por que os planos de estudo manuais falham",
        content:
          "A maioria dos estudantes cria planos de estudo que nunca cumpre. As razões são previsíveis: o plano é demasiado ambicioso, não tem em conta o ritmo real de aprendizagem, ou não está integrado com os materiais de estudo. Além disso, os planos estáticos não se adaptam quando atrasas — um dia de atraso pode tornar o plano impraticável e levar ao abandono.",
      },
      {
        heading: "Como a IA cria um plano de estudo eficaz",
        content:
          "O Aptis analisa os teus documentos, identifica os temas a cobrir e distribui o estudo ao longo do tempo disponível antes do teu exame. O plano tem em conta a dificuldade estimada de cada tema (baseada nos teus erros nos quizzes), o volume de conteúdo e os princípios da curva de aprendizagem. À medida que usas a plataforma, o plano adapta-se automaticamente.",
      },
      {
        heading: "O que inclui um plano de estudo do Aptis",
        content:
          "Cada plano inclui: sessões diárias de revisão de flashcards (15-30 minutos), quizzes semanais por tema para avaliar a retenção, alertas para rever conteúdo que estás a esquecer, e um dashboard de progresso que mostra onde estás e o que falta. O plano é visualizado por semana e por dia, com estimativas realistas de tempo.",
      },
    ],
    features: [
      { icon: "🗓️", title: "Plano gerado em segundos", description: "Define o teu exame e os teus documentos — o Aptis cria o plano automaticamente." },
      { icon: "📈", title: "Adapta-se ao teu progresso", description: "O plano ajusta-se com base no teu desempenho nos quizzes e flashcards." },
      { icon: "⏰", title: "Sessões realistas", description: "Sessões de 15-30 minutos por dia, não horas intermináveis." },
      { icon: "🎯", title: "Foco no que interessa", description: "O plano prioriza automaticamente os temas onde tens mais lacunas." },
    ],
    faq: [
      { question: "O plano de estudo funciona com qualquer disciplina?", answer: "Sim. O Aptis adapta o plano ao conteúdo dos teus documentos, seja Biologia, Direito, Engenharia ou qualquer outra área." },
      { question: "Posso definir uma data de exame para o plano?", answer: "Sim. Defines a data do exame e o Aptis distribui o estudo pelos dias disponíveis, com mais intensidade nos temas mais complexos." },
      { question: "O plano mostra quanto tempo vou precisar por dia?", answer: "Sim. Cada sessão do plano tem uma duração estimada, calculada com base no volume de conteúdo a cobrir." },
      { question: "O que acontece se não seguir o plano num dia?", answer: "O sistema reorganiza automaticamente o conteúdo em atraso pelos dias seguintes, ajustando a carga de forma realista." },
    ],
  },

  // ── EXAM PAGES ────────────────────────────────────────────────────────────────

  {
    slug: "como-estudar-biologia-12-ano",
    metaTitle: "Como Estudar Biologia 12.º Ano — Guia para o Exame Nacional",
    metaDescription:
      "Guia completo para estudar Biologia no 12.º ano e preparar o Exame Nacional. Active recall, flashcards e quizzes adaptados ao programa oficial.",
    keywords: [
      "como estudar biologia 12 ano",
      "exame nacional biologia 12",
      "estudar biologia exame",
      "biologia 12 ano flashcards",
      "preparar exame biologia",
    ],
    h1: "Como Estudar Biologia no 12.º Ano para o Exame Nacional",
    intro:
      "O Exame Nacional de Biologia e Geologia do 12.º ano é um dos mais exigentes, cobrindo temas como Reprodução, Hereditariedade, Evolução e Geologia. Este guia explica como organizar o estudo de forma eficaz e como o Aptis te pode ajudar a preparar o exame com active recall e repetição espaçada.",
    sections: [
      {
        heading: "O programa de Biologia e Geologia do 12.º ano",
        content:
          "O programa do 12.º ano abrange: Reprodução (mitose, meiose, gametogénese), Hereditariedade (leis de Mendel, genética molecular), Evolução (teorias, evidências, especiação) e Geologia (dinâmica interna, recursos). É um programa vasto com conceitos interdependentes — é difícil perceber evolução sem perceber genética. Por isso, o plano de estudo deve respeitar esta sequência lógica.",
      },
      {
        heading: "Erros comuns na preparação do Exame Nacional de Biologia",
        content:
          "O erro mais comum é estudar apenas por leitura e sublinhado. O exame nacional testa a aplicação do conhecimento a situações novas — não o reconhecimento de informação familiar. Outro erro é estudar intensivamente na última semana: sem revisões espaçadas, a informação evapora-se rapidamente. E ignorar as questões de exames anteriores é um erro grave — os padrões de pergunta repetem-se muito.",
      },
      {
        heading: "Plano de estudo para o Exame Nacional de Biologia",
        content:
          "Com o Aptis, carregas os teus manuais e apontamentos de Biologia do 12.º ano e a IA gera flashcards para todos os conceitos-chave do programa. Resolves quizzes regularmente para testar a retenção. Nos dias antes do exame, o sistema faz-te revisar apenas os cards que ainda não consolidaste. Complementa com a resolução de exames anteriores — disponíveis no site do IAVE — para te habituares ao formato.",
      },
    ],
    features: [
      { icon: "📚", title: "Conteúdo do programa oficial", description: "Flashcards e quizzes alinhados com o programa de Biologia e Geologia do 12.º ano." },
      { icon: "🎯", title: "Simulação de exame", description: "Quizzes no formato das perguntas do Exame Nacional, com correção detalhada." },
      { icon: "📅", title: "Plano até ao exame", description: "Define a data do exame e recebe um plano de estudo diário personalizado." },
      { icon: "🧠", title: "Repetição espaçada", description: "Algoritmo que garante que não esqueces o que estudaste nas semanas anteriores." },
    ],
    faq: [
      { question: "O Aptis tem conteúdo específico do programa de Biologia do 12.º ano?", answer: "O Aptis gera o conteúdo a partir dos teus próprios documentos. Carregas o teu manual ou apontamentos e a IA cria flashcards e quizzes adaptados ao teu programa." },
      { question: "Quando devo começar a usar o Aptis para o Exame Nacional?", answer: "Idealmente 3-4 meses antes do exame. A repetição espaçada requer tempo para funcionar — estudar durante meses com sessões curtas é muito mais eficaz do que estudar intensivamente na última semana." },
      { question: "Posso usar o Aptis para Biologia e Geologia em simultâneo?", answer: "Sim. Cria uma disciplina para Biologia e outra para Geologia, cada uma com os seus próprios documentos, flashcards e quizzes." },
      { question: "O Aptis cobre Geologia além de Biologia?", answer: "Sim. Podes carregar qualquer material de Geologia (rochas, tectónica de placas, recursos geológicos) e o Aptis gera o conteúdo de estudo automaticamente." },
    ],
  },

  {
    slug: "como-estudar-anatomia",
    metaTitle: "Como Estudar Anatomia — Método Eficaz para Memorizar Estruturas",
    metaDescription:
      "Guia completo para estudar Anatomia Humana com eficácia. Flashcards, repetição espaçada e quizzes para memorizar estruturas, funções e relações topográficas.",
    keywords: [
      "como estudar anatomia",
      "memorizar anatomia",
      "flashcards anatomia",
      "estudar anatomia humana",
      "anatomia repetição espaçada",
    ],
    h1: "Como Estudar Anatomia Humana de Forma Eficaz",
    intro:
      "Anatomia Humana é uma das disciplinas com maior quantidade de terminologia para memorizar: centenas de ossos, músculos, nervos, vasos e órgãos — cada um com nome, função e relações topográficas. O método certo combina flashcards, repetição espaçada e visualização espacial para construir uma memória sólida e duradoura.",
    sections: [
      {
        heading: "O desafio de memorizar Anatomia",
        content:
          "A dificuldade de Anatomia não é falta de inteligência — é volume e especificidade. O corpo humano tem 206 ossos, mais de 600 músculos, 12 pares de nervos cranianos e um sistema vascular complexo. Cada estrutura tem um nome (muitas vezes em latim), uma função, uma localização e relações com estruturas vizinhas. Tentar memorizar tudo de uma vez é uma estratégia condenada ao fracasso.",
      },
      {
        heading: "Flashcards para Anatomia: a abordagem certa",
        content:
          "Para Anatomia, os flashcards mais eficazes testam: nome → função (O que faz o músculo deltoide?), função → localização (Onde está o nervo ciático?), e relações (O que passa pelo canal de Havers?). Ao contrário de tentar memorizar tabelas completas de uma vez, os flashcards dividem a informação em unidades pequenas e geríveis, praticadas individualmente até à automaticidade.",
      },
      {
        heading: "Como usar o Aptis para Anatomia",
        content:
          "Carrega os slides ou PDF do teu atlas de Anatomia ou das aulas teóricas. O Aptis extrai os nomes das estruturas, as suas funções e as relações descritas em texto e cria flashcards automaticamente. O tutor IA pode explicar a lógica por trás dos nomes (muitos são descritivos em latim) e ajudar-te a construir associações mentais que facilitam a memorização.",
      },
    ],
    features: [
      { icon: "🦴", title: "Flashcards de estruturas anatómicas", description: "Nome, função, localização e relações topográficas — em formato de card para cada estrutura." },
      { icon: "🔁", title: "Revisão diária de 20 minutos", description: "Sessões curtas de repetição espaçada para manter centenas de estruturas em memória." },
      { icon: "❓", title: "Quiz de identificação", description: "Testa-te nos nomes e funções das estruturas com quizzes de escolha múltipla." },
      { icon: "🤖", title: "Tutor para dúvidas anatómicas", description: "Esclarece dúvidas sobre relações topográficas, inervação e irrigação de qualquer estrutura." },
    ],
    faq: [
      { question: "O Aptis consegue processar atlas de Anatomia em PDF?", answer: "O Aptis extrai e processa o texto do PDF. Imagens e diagramas anatómicos não são processados diretamente, mas as legendas e descrições em texto são usadas para criar os flashcards." },
      { question: "Quantas estruturas anatómicas posso ter em flashcards?", answer: "Não há limite para o número de flashcards na tua conta. Podes ter centenas de estruturas organizadas por sistema (musculoesquelético, nervoso, cardiovascular, etc.)." },
      { question: "O tutor IA sabe Anatomia Humana?", answer: "Sim. Além de responder com base nos documentos que carregaste, o tutor IA tem conhecimento geral de Anatomia e pode explicar estruturas, funções e relações que não estejam nos teus PDFs." },
      { question: "Posso criar flashcards por sistema anatómico?", answer: "Sim. Podes organizar os flashcards por sistema — esquelético, muscular, nervoso, cardiovascular — e revisar cada sistema separadamente ou em conjunto." },
    ],
  },

  // ── TECHNIQUE PAGES ──────────────────────────────────────────────────────────

  {
    slug: "active-recall-estudo",
    metaTitle: "Active Recall: O Método de Estudo Mais Eficaz | Guia Completo",
    metaDescription:
      "Tudo sobre Active Recall: o que é, porque funciona e como aplicar ao estudo. Com ferramentas de IA para praticar active recall automaticamente.",
    keywords: [
      "active recall estudo",
      "active recall o que é",
      "como usar active recall",
      "active recall flashcards",
      "técnica de estudo active recall",
    ],
    h1: "Active Recall: O Método de Estudo Mais Eficaz (Guia Completo)",
    intro:
      "Active Recall é a técnica de estudo com o suporte científico mais sólido para melhorar a retenção de informação a longo prazo. Em vez de reler passivamente os apontamentos, forces-te a recuperar a informação da memória — através de flashcards, quizzes ou simplesmente fechando o livro e tentando reproduzir o que leste. Este guia explica tudo sobre active recall e como aplicá-lo com ferramentas de IA.",
    sections: [
      {
        heading: "O que é Active Recall e por que funciona",
        content:
          "Active Recall (também chamado Testing Effect ou Retrieval Practice) é a prática de forçar o cérebro a recuperar informação ativamente, em vez de apenas reconhecê-la. Quando tentamos recuperar algo da memória — mesmo que não consigamos —, esse esforço fortalece as ligações neuronais associadas. Um estudo publicado na Science por Roediger e Karpicke (2006) demonstrou que estudantes que fizeram testes antes do exame retiveram 50% mais informação do que os que apenas releram o material, numa avaliação feita uma semana depois.",
      },
      {
        heading: "Como praticar Active Recall no dia a dia",
        content:
          "As formas mais eficazes de praticar active recall são: flashcards (ver a pergunta e tentar responder antes de ver a resposta), quizzes (responder a perguntas sobre o material estudado), self-testing (fechar os apontamentos e escrever tudo o que te lembras), e ensinar (explicar um conceito a outra pessoa força a recuperação e revela lacunas). A chave é resistir à tentação de ver a resposta imediatamente — o esforço de tentar recuperar é onde o aprendizado acontece.",
      },
      {
        heading: "Active Recall com IA: como o Aptis ajuda",
        content:
          "O maior obstáculo ao active recall é o tempo que leva a criar os materiais de prática — flashcards e quizzes. O Aptis elimina este obstáculo: carregas os teus documentos e a IA cria automaticamente centenas de flashcards e quizzes prontos a praticar. Em vez de gastares 2 horas a criar flashcards, gastas esse tempo a praticá-los — que é onde o aprendizado real acontece.",
      },
    ],
    features: [
      { icon: "🧠", title: "Flashcards para Active Recall", description: "Gerados automaticamente a partir dos teus documentos — sem trabalho manual de criação." },
      { icon: "📝", title: "Quizzes de recuperação", description: "Testa-te regularmente com perguntas sobre o que estudaste, com feedback imediato." },
      { icon: "📊", title: "Registo de desempenho", description: "Vê onde estás a errar mais e foca o estudo nas áreas com mais lacunas." },
      { icon: "🔁", title: "Prática consistente", description: "Sistema de lembretes e sessões diárias para manter o hábito de active recall." },
    ],
    faq: [
      { question: "Active Recall é melhor do que sublinhado e releitura?", answer: "Sim, significativamente. Múltiplos estudos mostram que active recall (testes, flashcards, quizzes) supera a releitura passiva em retenção a longo prazo. A releitura cria uma ilusão de conhecimento que não se mantém no exame." },
      { question: "Quanto tempo por dia devo dedicar ao active recall?", answer: "15-30 minutos de active recall diário é suficiente para manter centenas de itens em memória, especialmente combinado com repetição espaçada. É mais eficaz do que 3 horas de releitura passiva no fim de semana." },
      { question: "Posso usar active recall em qualquer disciplina?", answer: "Sim. Active recall funciona em qualquer área que exija memorização e compreensão: Medicina, Direito, Biologia, Engenharia, História, Idiomas e mais. A técnica adapta-se ao tipo de conhecimento." },
      { question: "O Aptis usa active recall nos flashcards?", answer: "Sim. Os flashcards do Aptis são projetados para active recall: vês a pergunta, tentas responder mentalmente, e só depois revelas a resposta. O sistema também usa repetição espaçada para apresentar cada card no momento ótimo." },
    ],
  },

  {
    slug: "repeticao-espacada-estudo",
    metaTitle: "Repetição Espaçada: Como Estudar Menos e Reter Mais",
    metaDescription:
      "Guia completo sobre repetição espaçada (Spaced Repetition). Como funciona, a ciência por detrás e como usar com IA para memorizar qualquer matéria.",
    keywords: [
      "repetição espaçada estudo",
      "spaced repetition português",
      "como funciona repetição espaçada",
      "curva de ebbinghaus",
      "memorizar com repetição espaçada",
    ],
    h1: "Repetição Espaçada: Estuda Menos, Retém Muito Mais",
    intro:
      "Repetição Espaçada (Spaced Repetition) é o método científico mais poderoso para memorização a longo prazo. Em vez de estudar o mesmo conteúdo várias vezes num único dia (massed practice), distribuis as revisões ao longo do tempo, aumentando o intervalo à medida que a memória se consolida. O resultado: gastares menos tempo total a estudar e reteres mais durante mais tempo.",
    sections: [
      {
        heading: "A Curva de Ebbinghaus e o Esquecimento",
        content:
          "Em 1885, o psicólogo Hermann Ebbinghaus descobriu que esquecemos a maior parte do que aprendemos nas primeiras 24 horas, e que este esquecimento segue uma curva previsível. A boa notícia: cada revisão no momento certo \"reseta\" a curva, e a memória deteriora-se mais lentamente após cada revisão. Após 4-5 revisões espaçadas, a informação é transferida para memória de longo prazo e pode durar anos.",
      },
      {
        heading: "Como funciona o algoritmo de repetição espaçada",
        content:
          "Os sistemas modernos de repetição espaçada (como o algoritmo SM-2, usado no Anki) apresentam cada flashcard no momento ótimo antes de o esqueceres. Se respondeste corretamente, o próximo intervalo aumenta (1 dia → 3 dias → 7 dias → 14 dias → 1 mês). Se erraste, o intervalo recomeça. Este sistema maximiza a retenção com o mínimo de tempo de revisão. O Aptis usa um algoritmo semelhante adaptado aos teus padrões de aprendizagem.",
      },
      {
        heading: "Repetição Espaçada vs. Estudo Intensivo (Cramming)",
        content:
          "Estudar intensivamente na véspera do exame (cramming) pode funcionar a curto prazo — para um exame amanhã. Mas a informação desaparece rapidamente depois. A repetição espaçada é mais lenta no início mas muito mais duradoura: após um semestre de repetição espaçada regular, retés a informação indefinidamente, não apenas durante o exame. Para estudantes que precisam de acumular conhecimento ao longo dos anos (Medicina, Direito), a repetição espaçada é indispensável.",
      },
    ],
    features: [
      { icon: "⏱️", title: "Algoritmo de repetição espaçada", description: "Cada flashcard aparece no momento ótimo — automaticamente, sem teres de gerir intervalos." },
      { icon: "📉", title: "Combate a curva de Ebbinghaus", description: "O sistema revisa conteúdo antes de o esqueceres, mantendo a curva de retenção alta." },
      { icon: "📆", title: "Sessões diárias de 15-20 min", description: "Pequenas sessões diárias são mais eficazes do que longas sessões semanais." },
      { icon: "✅", title: "Progresso visível", description: "Vê quais flashcards já dominaste e quais ainda precisam de mais revisão." },
    ],
    faq: [
      { question: "A repetição espaçada funciona para qualquer tipo de conteúdo?", answer: "Funciona melhor para conteúdo factual e conceitual que precisa de ser memorizado: definições, fórmulas, leis, processos, vocabulário. É menos adequada para competências procedimentais (como resolver equações matemáticas), que requerem prática de resolução." },
      { question: "Quanto tempo por dia devo dedicar à repetição espaçada?", answer: "15-20 minutos por dia é suficiente para manter centenas de flashcards em memória. A consistência diária é mais importante do que a duração das sessões." },
      { question: "O Aptis usa repetição espaçada nos flashcards?", answer: "Sim. O sistema de revisão do Aptis usa algoritmos de repetição espaçada. Cada flashcard tem um intervalo calculado com base no teu desempenho, apresentando-o antes de o esqueceres." },
      { question: "Posso começar a usar repetição espaçada na véspera do exame?", answer: "A repetição espaçada requer tempo para funcionar eficazmente — os intervalos precisam de ser respeitados. Para exames próximos, usa active recall intensivo. Para exames futuros, começa agora com repetição espaçada." },
    ],
  },

  // ── GENERIC/COMPARISON PAGES ──────────────────────────────────────────────────

  {
    slug: "app-para-estudar-com-ia",
    metaTitle: "A Melhor App para Estudar com IA em 2025 | Aptis",
    metaDescription:
      "Descobre a melhor app para estudar com IA em 2025. Gera flashcards, quizzes e planos de estudo a partir dos teus documentos. Gratuita para começar.",
    keywords: [
      "app para estudar com ia",
      "melhor app estudo ia",
      "aplicação estudo ia 2025",
      "app flashcards ia",
      "ferramenta ia para estudar",
    ],
    h1: "A Melhor App para Estudar com IA em 2025",
    intro:
      "A inteligência artificial mudou a forma de estudar. Em vez de criar flashcards manualmente ou comprar materiais pré-feitos, hoje podes transformar os teus próprios documentos em materiais de estudo personalizados em segundos. O Aptis é uma app de estudo com IA que gera flashcards, quizzes e planos de estudo a partir dos teus PDFs e apontamentos.",
    sections: [
      {
        heading: "O que procurar numa app de estudo com IA",
        content:
          "Nem todas as apps de IA para estudar são iguais. As melhores devem: processar os teus próprios documentos (não apenas conteúdo pré-feito), gerar materiais de alta qualidade adaptados ao teu conteúdo específico, incluir um sistema de repetição espaçada integrado, e ter um tutor IA que responda dúvidas contextualizadas. Apps que apenas geram texto genérico sem ler os teus documentos têm valor limitado para estudo académico.",
      },
      {
        heading: "O Aptis vs. outras ferramentas",
        content:
          "ChatGPT é uma ferramenta genérica — não lê os teus documentos diretamente e não tem sistema de revisão espaçada. Anki é excelente para repetição espaçada, mas requer que cries todos os flashcards manualmente — demorado. Quizlet tem conteúdo pré-feito, mas não se adapta aos teus materiais específicos. O Aptis combina o melhor dos três: lê os teus documentos, gera os materiais automaticamente, e implementa repetição espaçada.",
      },
      {
        heading: "Quem usa o Aptis?",
        content:
          "O Aptis é usado por estudantes universitários (Medicina, Direito, Engenharia, Ciências), estudantes do secundário a preparar exames nacionais, profissionais a preparar certificações e concursos, e qualquer pessoa que precise de aprender e reter grandes volumes de informação a partir de documentos. A plataforma funciona para qualquer área de estudo e suporta documentos em 6 idiomas.",
      },
    ],
    features: [
      { icon: "📄", title: "Processa os teus documentos", description: "Carrega qualquer PDF e recebe flashcards e quizzes personalizados ao teu conteúdo." },
      { icon: "🔁", title: "Repetição espaçada automática", description: "Sistema integrado de revisão espaçada — não precisas de gerir intervalos manualmente." },
      { icon: "🤖", title: "Tutor IA contextualizado", description: "Faz perguntas e recebe respostas baseadas nos teus próprios documentos." },
      { icon: "🆓", title: "Gratuito para começar", description: "Plano gratuito disponível. Sem cartão de crédito para criar conta." },
    ],
    faq: [
      { question: "O Aptis é gratuito?", answer: "Sim, há um plano gratuito com acesso a flashcards, quizzes e tutor IA. Planos pagos oferecem mais documentos, mais flashcards por documento e funcionalidades avançadas." },
      { question: "O Aptis funciona em português?", answer: "Sim. O Aptis foi desenvolvido com foco no mercado português e lusófono. A interface, os materiais gerados e o suporte estão disponíveis em português." },
      { question: "Preciso de instalar alguma app?", answer: "Não. O Aptis é uma aplicação web que funciona em qualquer browser — Chrome, Firefox, Safari, Edge. Acedes em aptis.study sem instalar nada." },
      { question: "Os meus documentos ficam privados?", answer: "Sim. Os teus documentos são privados e apenas acessíveis à tua conta. Não são partilhados com outros utilizadores nem usados para treinar modelos de IA de terceiros." },
    ],
  },

  {
    slug: "ferramenta-para-criar-quizzes",
    metaTitle: "Ferramenta para Criar Quizzes a partir de PDFs — Automático",
    metaDescription:
      "A melhor ferramenta para criar quizzes de estudo automaticamente a partir de PDFs com IA. Escolha múltipla, V/F e resposta aberta — em segundos.",
    keywords: [
      "ferramenta para criar quizzes",
      "criar quizzes automaticamente",
      "gerador de quizzes pdf",
      "quiz automatico ia",
      "criar perguntas a partir de pdf",
    ],
    h1: "Ferramenta para Criar Quizzes Automáticos a partir de PDFs",
    intro:
      "Criar um quiz de qualidade a partir de um documento leva tempo: tens de identificar os conceitos importantes, formular perguntas claras, criar distratores plausíveis e escrever explicações para cada resposta. O Aptis faz tudo isto automaticamente — em segundos, a partir de qualquer PDF.",
    sections: [
      {
        heading: "Por que quizzes são a forma mais eficaz de estudar",
        content:
          "Quizzes ativam o Testing Effect: o ato de responder a uma pergunta — independentemente de acertares ou errares — fortalece a memória muito mais do que a releitura. Mesmo responder errado é valioso: faz-te tomar consciência das tuas lacunas e cria uma memória do erro que reduz a probabilidade de repetires. Um professor que dá um teste ao início da aula sabe instintivamente o que a ciência confirma: testar antecipa melhor a retenção do que qualquer revisão passiva.",
      },
      {
        heading: "Como o Aptis gera quizzes de alta qualidade",
        content:
          "A IA do Aptis foi treinada para gerar perguntas que vão além da memorização simples — testam compreensão, aplicação e análise. Para escolha múltipla, cria distratores plausíveis baseados em erros comuns e conceitos similares (não apenas respostas óbviamente erradas). Para resposta aberta, formula questões que requerem síntese. Cada pergunta tem uma explicação detalhada que vai além de repetir a resposta.",
      },
      {
        heading: "Casos de uso: quem usa o Aptis para criar quizzes",
        content:
          "Estudantes universitários que transformam os slides das aulas em quizzes de preparação para exames. Professores e formadores que criam avaliações rápidas a partir dos seus materiais. Profissionais que preparam certificações e concursos públicos. Autodidatas que querem testar o seu conhecimento após ler artigos ou livros.",
      },
    ],
    features: [
      { icon: "⚡", title: "Geração em segundos", description: "De um PDF para um quiz completo em menos de 30 segundos." },
      { icon: "🎛️", title: "Configurável", description: "Escolhes o número de perguntas, o tipo (MC/V-F/aberta) e a dificuldade." },
      { icon: "💡", title: "Explicações detalhadas", description: "Cada resposta vem com uma explicação que reforça a compreensão." },
      { icon: "📊", title: "Histórico de resultados", description: "Registo de todas as tentativas para acompanhares a evolução." },
    ],
    faq: [
      { question: "O Aptis cria quizzes em português?", answer: "Sim. O Aptis detecta o idioma do PDF e gera o quiz no mesmo idioma. Para PDFs em português, o quiz será completamente em português." },
      { question: "Posso exportar os quizzes criados?", answer: "Podes partilhar um link do quiz ou imprimir o resultado. A exportação para outros formatos está em desenvolvimento." },
      { question: "O quiz fica guardado depois de gerado?", answer: "Sim. Todos os quizzes ficam guardados na tua conta, organizados por documento. Podes refazê-los ou partilhá-los." },
      { question: "Posso criar quizzes de múltiplos documentos combinados?", answer: "Atualmente cada quiz é gerado a partir de um documento. Para cobrir vários temas, cria um quiz por documento e pratica-os em sequência." },
    ],
  },

  {
    slug: "transformar-documentos-em-flashcards",
    metaTitle: "Transformar Documentos em Flashcards com IA — Automático",
    metaDescription:
      "Transforma qualquer documento ou PDF em flashcards de estudo com IA. Repetição espaçada automática para memorizar mais em menos tempo.",
    keywords: [
      "transformar documentos em flashcards",
      "converter pdf flashcards",
      "flashcards automáticos ia",
      "criar flashcards ia",
      "documento para flashcards",
    ],
    h1: "Transformar Qualquer Documento em Flashcards com IA",
    intro:
      "Qualquer documento de estudo — manual, artigo científico, apontamentos, slides — pode ser transformado em flashcards prontos a revisar com repetição espaçada. O Aptis faz esta conversão automaticamente com IA, poupando horas de trabalho manual e garantindo que os flashcards cobrem os conceitos mais importantes.",
    sections: [
      {
        heading: "O trabalho de criar flashcards manualmente",
        content:
          "Criar flashcards manualmente é uma das tarefas mais demoradas do estudo: precisas de ler o documento, identificar os conceitos-chave, decidir como formular a pergunta, escrever a resposta de forma concisa e repetir para dezenas ou centenas de conceitos. Para um capítulo de 30 páginas, criar flashcards manuais pode levar 2-3 horas — tempo que poderia ser usado para revisar os próprios flashcards.",
      },
      {
        heading: "Como a IA cria flashcards de qualidade",
        content:
          "O Aptis usa modelos de linguagem avançados para analisar o documento e identificar automaticamente: termos e definições, relações causa-efeito, listas de características, processos com passos, e comparações entre conceitos. Para cada elemento identificado, gera uma pergunta clara e uma resposta precisa. A IA também estima a dificuldade de cada card e adiciona tags temáticas.",
      },
      {
        heading: "Do documento ao flashcard: o processo no Aptis",
        content:
          "Carregas o PDF ou texto no Aptis, escolhes o número de flashcards pretendido (entre 10 e 50), e em segundos tens um deck completo pronto a revisar. Podes editar qualquer card depois de gerado. O sistema de repetição espaçada integrado começa imediatamente a apresentar-te os cards nos intervalos ótimos. Com revisões diárias de 15-20 minutos, consolidarás o conteúdo em memória de longo prazo.",
      },
    ],
    features: [
      { icon: "🔄", title: "Conversão automática", description: "Qualquer documento para dezenas de flashcards em segundos." },
      { icon: "✏️", title: "Edição total", description: "Edita, adiciona ou elimina qualquer flashcard após a geração automática." },
      { icon: "📚", title: "Organização por disciplina", description: "Organiza os teus flashcards por disciplina, tema e dificuldade." },
      { icon: "🔁", title: "Revisão espaçada integrada", description: "Algoritmo de repetição espaçada que maximiza a retenção automaticamente." },
    ],
    faq: [
      { question: "Que tipos de documentos o Aptis aceita?", answer: "PDFs (incluindo slides exportados e apontamentos), documentos Word (.docx), apresentações PowerPoint (.pptx), ficheiros de texto, fotografias de apontamentos e vídeos do YouTube com legendas." },
      { question: "Os flashcards gerados são de boa qualidade?", answer: "A qualidade depende da clareza do documento original. Para documentos bem estruturados com texto claro, os flashcards são geralmente muito bons. Podes sempre editar os que precisam de ajuste." },
      { question: "Posso misturar flashcards de vários documentos numa revisão?", answer: "Sim. Podes selecionar flashcards de múltiplos documentos e revisá-los em conjunto, por exemplo todos os flashcards de uma disciplina." },
      { question: "Os flashcards ficam guardados permanentemente?", answer: "Sim. Os teus flashcards ficam guardados na tua conta sem limite de tempo, enquanto a conta estiver ativa." },
    ],
  },
];

export function getSeoPageBySlug(slug: string): SeoPageConfig | undefined {
  return SEO_PAGES.find((p) => p.slug === slug);
}
