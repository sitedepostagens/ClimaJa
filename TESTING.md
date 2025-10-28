TESTE RÁPIDO — Validação manual das mudanças

Objetivo
- Validar a nova experiência do perfil (dropdown no desktop, modal no mobile), copiar e‑mail, logout, e checar que a responsividade do cabeçalho e do cartão de perfil funciona corretamente.

Ambiente recomendado
- Abra a aplicação localmente (ex.: `live-server`, `serve` ou outro servidor estático) e use DevTools para testar diferentes larguras.

Passos principais

1) Preparação
- Abra o site (`index.html`) no browser.
- Abra DevTools (F12) → aba "Console" e "Network".

2) Simular usuário (sem precisar do Firebase)
- No Console cole e execute:

```javascript
localStorage.setItem('user', JSON.stringify({
  displayName: 'alandiegope123@gmail.com',
  email: 'alandiegope123@gmail.com',
  photoURL: 'logo.png'
}));
document.dispatchEvent(new CustomEvent('auth-changed', { detail: JSON.parse(localStorage.getItem('user')) }));
```

- Resultado esperado: o botão de perfil aparece no header (substitui entrar/cadastrar).

3) Desktop (largura grande)
- Clique no botão do perfil — deve abrir o dropdown padrão do desktop.
- No dropdown:
  - Veja o nome (ou e‑mail) legível.
  - Botão "Copiar e‑mail" deve existir e copiar o e‑mail para a área de transferência (veja feedback visual).
  - Clique em "Sair" — deve executar o fluxo de logout (recarregar a página).

4) Mobile (DevTools: toggle device, largura <= 760px)
- Clique no botão do perfil — em vez do dropdown, deve abrir um modal full‑screen (ou quase full‑screen) com slide‑up.
- No modal:
  - Avatar (pode ser escondido em <= 420px), nome + e‑mail legíveis.
  - Botão de cópia do e‑mail (funciona igual ao desktop).
  - Botões: Acessar Perfil, Meus Relatos, Ajuda, Sair — com mesmas ações do dropdown.
  - Ao abrir o modal, o foco deve ir para o primeiro elemento interativo.

5) Clima / Mapa
- Vá para a aba "Clima" e conceda (ou negue) permissão de localização.
- Verifique que o painel de clima exibe temperatura, vento, umidade, chuva e pressão (ou fallbacks) e que não aparecem mensagens de "Não disponível" de forma persistente.
- Vá para a aba "Mapa" e verifique se o mapa carrega e se o botão "Usar Minha Localização" centraliza o mapa.

6) Verificar console
- Olhe a aba Console do DevTools durante os testes e confirme que não há erros JS inesperados.

7) Teste adicional (opcional)
- Abra o site em um dispositivo móvel real e repita os passos do mobile.

Se encontrar bugs
- Copie o erro do console e me envie.
- Indique o dispositivo/tamanho (ex.: iPhone 12 / 390x844) e o passo que causou o problema.


Notas finais
- Se desejar, eu posso gerar screenshots headless em 3 larguras (desktop/tablet/mobile) e anexar como evidência. Não realizei push; todas as mudanças estão em um commit local. Para enviar ao remoto, posso rodar `git push` se você der ok e houver permissões.
