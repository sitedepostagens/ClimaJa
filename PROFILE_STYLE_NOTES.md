Resumo das alterações na área de perfil

O que foi feito
- Removido `.dropdown-menu` do seletor global que afetava todos os menus (antes: `.form-control, .btn, .dropdown-menu`) para evitar sobrescritas indesejadas.
- Adicionadas regras específicas para o dropdown do perfil com alta especificidade: `.main-header .dropdown-menu[aria-labelledby="perfilDropdown"]`.
- Criado `.btn-profile` e convertido o toggle para `<button>` (melhor compatibilidade com Bootstrap 5).
- Substituído placeholder do avatar por um data-URI SVG embutido para evitar dependência de arquivo externo.
- Unificação visual dos botões do site: regras para `.btn`, `.btn-outline-primary`, `.btn-outline-secondary` e `.btn-modern` (padding, border-radius, sombras, peso de fonte).
- Aumentado `z-index` do dropdown do perfil para evitar que seja escondido por outros elementos do header.

Motivação
- Havia conflito entre regras globais (ex.: `.dropdown-menu` no seletor global) e menus específicos (perfil, sugestões de endereço). Isso fazia com que o dropdown do perfil ficasse com estilo inesperado ou recortado.

Verificações realizadas
- Garantido que sugestões de endereço (`#address-suggestions`, `#address-suggestions-motorista`) mantenham classe `dropdown-menu` (funcionalidade de autocomplete preservada).
- Ajustadas regras `:hover` e `border-radius` para o menu do perfil usando seletor com maior especificidade.

Próximos passos recomendados
1. Revisar `styles.css` e `animacao-global.css` para remover duplicidade e mover as regras de tema para um único arquivo (facilita manutenção).
2. Evitar o uso generalizado de `!important` em estilos globais; prefira aumentar especificidade quando necessário.
3. (Opcional) Expor `window.updateProfileArea(user)` no `script.js` para facilitar atualizações da UI a partir de outros módulos.
4. (Opcional) Mover as regras de estilo principais para `styles.css` em vez de `index.html` inline para manter separação de preocupações.

Como testar rapidamente
- No Console do navegador:
  window.currentUser = { displayName: 'Teste', email: 't@t.com', photoURL: null };
  document.dispatchEvent(new CustomEvent('auth-changed', { detail: window.currentUser }));
- Validar abertura do dropdown, posição (não recortado), avatar/nome/email e aparência uniforme dos botões.

Se quiser, eu aplico os próximos passos (mover regras para `styles.css`, expor função de atualização e remover `!important` onde for seguro).