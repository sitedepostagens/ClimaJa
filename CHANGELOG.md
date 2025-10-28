# CHANGELOG

## Unreleased

### Melhorias
- Melhorias de UI/UX na área de perfil (header/dropdown/modal): cartão de perfil responsivo, tratamento para evitar truncamento de e‑mail, quebra de palavra no dropdown e botão de cópia de e‑mail.
- Dropdown adaptativo no desktop e modal mobile full‑screen em dispositivos pequenos (<= 760px) para melhor usabilidade e acessibilidade.
- Animação slide‑up em mobile e ajustes finos (esconder avatar em telas muito pequenas, compactação de elementos no mobile).
- Lógica sincronizada entre dropdown e modal: os mesmos handlers para "Meus Relatos", "Ajuda" e "Sair".
- Fallbacks e melhorias em JS: posicionamento do feedback de cópia, foco automático no modal mobile, persistência de usuário no localStorage e propagação do evento `auth-changed`.

### Correções
- Ajustes para evitar truncamento e duplicação do nome/e‑mail no header.
- Pequenos hardening no `script.js` para evitar erros quando APIs (Bootstrap/Clipboard) não estiverem disponíveis.

### Observações
- Todas as alterações são client‑side; o backend Firebase não foi alterado.
- Commit local criado. Não foi enviado (push) para o repositório remoto conforme solicitado.
