# Configuração Oficial do Meta App (OAuth 2.0)

Este documento detalha o processo exato e atualizado para configurar seu aplicativo no painel do Meta for Developers para que o **Reels Manager** possa autenticar contas profissionais do Instagram e publicar Reels de forma automatizada usando a **Graph API**.

---

## 1. Criar o Aplicativo

1. Acesse o [Meta for Developers](https://developers.facebook.com/) e faça login.
2. Clique em **Meus Aplicativos** (My Apps) no menu superior direito.
3. Clique em **Criar Aplicativo** (Create App).
4. Na tela "O que você deseja que seu aplicativo faça?", selecione **Outro** (Other) e clique em Avançar.
5. Selecione o tipo de aplicativo **Empresa** (Business).
6. Dê um nome ao seu aplicativo (Ex: *Reels Manager App*) e preencha o e-mail de contato.
7. Clique em **Criar aplicativo** (Create app).

---

## 2. Configurar Produtos

No painel do seu novo aplicativo, você precisará adicionar um produto essencial para o fluxo de autenticação:

1. Na seção **Adicionar um produto** (Add a Product), procure por **Login do Facebook para Empresas** (Facebook Login for Business).
2. Clique em **Configurar** (Set up).
3. No menu lateral esquerdo, vá em **Login do Facebook para Empresas > Configurações** (Settings).
4. Na opção **URIs de redirecionamento do OAuth válidos** (Valid OAuth Redirect URIs), adicione a URL de callback do seu backend.
   - **Para testes locais:** `http://localhost:3000/api/accounts/meta/callback`
   - **Para produção:** `https://sua-api.com/api/accounts/meta/callback`
5. Clique em **Salvar alterações** no rodapé.

---

## 3. Coletar Credenciais (App ID e App Secret)

1. No menu lateral esquerdo, vá em **Configurações > Básico** (Settings > Basic).
2. Aqui você encontrará:
   - **ID do Aplicativo** (App ID) -> Copie e coloque no Reels Manager como `Meta App ID`
   - **Chave Secreta do Aplicativo** (App Secret) -> Clique em Mostrar, copie e coloque no Reels Manager como `Meta App Secret`

> **Nota:** As configurações agora são feitas diretamente na tela de "Configurações" do próprio Reels Manager pelo navegador. Nenhuma edição de `.env` é necessária para as credenciais da Meta!

---

## 4. Permissões Necessárias (Graph API)

O sistema solicitará automaticamente as permissões durante o clique no botão "Conectar com Meta". Para que a automação de Reels em Contas Profissionais funcione, usamos o fluxo suportado atualmente. 

As permissões que o usuário (você) precisará aprovar na tela do Facebook são:
- `instagram_basic` (Para ler o perfil do Instagram)
- `instagram_content_publish` (Para poder enviar o vídeo e publicar o Reel)
- `pages_show_list` (Para listar as páginas do Facebook que você administra)
- `pages_read_engagement` (Para ler qual conta do Instagram está vinculada à sua página)

---

## 5. Mudar para Modo "Ao Vivo" (Opcional para uso Pessoal)

Por padrão, seu aplicativo nasce no **Modo de Desenvolvimento** (Development Mode). 
- **Se você for usar o Reels Manager APENAS com a sua própria conta:** Você NÃO precisa enviar o app para revisão. O modo de desenvolvimento funciona perfeitamente desde que a conta do Instagram pertença a você ou esteja registrada na aba "Funções do aplicativo" (App Roles).
- **Se você for abrir o sistema para clientes (SaaS):** Você precisará ir em **Revisão do aplicativo** (App Review), preencher os detalhes da sua empresa e solicitar a aprovação das permissões citadas acima.

---

## 6. Resolvendo Problemas Comuns

- **"App não configurado: Esta URL não é permitida"**: Ocorre quando a `Redirect URI` inserida no código (no Backend) não corresponde exatamente ao que você cadastrou no passo 2.4.
- **Não encontra a conta do Instagram**: O Instagram **precisa** ser uma conta Profissional (Business ou Creator) e **obrigatoriamente** estar vinculada a uma Página do Facebook que você administra. Este é um requisito oficial da Graph API.
