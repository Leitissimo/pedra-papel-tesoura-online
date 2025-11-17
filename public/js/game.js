// game.js FINAL — com sons, animações, chat e reconexão perfeita

document.addEventListener("DOMContentLoaded", () => {
  const socket = io();

  // === PLAYER ID PERSISTENTE POR ABA ===
  let playerId = sessionStorage.getItem("ppt-player-id");
  if (!playerId) {
    playerId = crypto.randomUUID();
    sessionStorage.setItem("ppt-player-id", playerId);
  }

  function getParam(name) {
    return new URL(window.location.href).searchParams.get(name);
  }

  const room = getParam("room");
  window.room = room;

  // ELEMENTOS DOM
  const roomTag = document.getElementById("room-tag");
  const roomInfo = document.getElementById("room-info");
  const statusEl = document.getElementById("status");
  const opponentEl = document.getElementById("opponent");

  const tesoura = document.getElementById("tesoura");
  const papel = document.getElementById("papel");
  const pedra = document.getElementById("pedra");

  const placarEl = document.getElementById("placar");

  // CHAT
  const chatInput = document.getElementById("chat-input");
  const chatSend = document.getElementById("chat-send");
  const chatMessages = document.getElementById("chat-messages");

  // MODAL
  const modal = document.getElementById("resultado-modal");
  const modalTexto = document.getElementById("resultado-texto");
  const detalheEl = document.getElementById("detalhe");
  const modalOk = document.getElementById("modal-ok");

  // SONS
  const somClick = document.getElementById("som-click");
  const somWin = document.getElementById("som-win");
  const somLose = document.getElementById("som-lose");

  // ESTADO LOCAL
  let jogador = null;
  let vitorias = 0;
  let derrotas = 0;

  // UI INICIAL
  roomTag.textContent = room ? `Sala ${room}` : "Sala —";
  roomInfo.textContent = room ? `Sala: ${room}` : "Sala não especificada";
  statusEl.textContent = "Você: —";
  opponentEl.textContent = "Adversário: —";
  placarEl.textContent = `Vitórias: ${vitorias} | Derrotas: ${derrotas}`;

  // FUNÇÕES DE UI
  function enableButtons(enable) {
    [tesoura, papel, pedra].forEach(btn => btn.disabled = !enable);
  }

  function atualizarPlacar() {
    placarEl.textContent = `Vitórias: ${vitorias} | Derrotas: ${derrotas}`;
  }

  function mostrarModal(texto, detalhe = "") {
    modalTexto.textContent = texto;
    detalheEl.textContent = detalhe;
    modal.classList.remove("modal-oculto");

    const card = modal.querySelector(".modal-card");
    if (card) {
      card.style.animation = "none";
      void card.offsetWidth;
      card.style.animation = "";
    }

    setTimeout(() => modal.classList.add("modal-visivel"), 20);
  }

  modalOk.onclick = () => {
    modal.classList.remove("modal-visivel");
    setTimeout(() => modal.classList.add("modal-oculto"), 200);
  };

  // CHAT
  function enviarMensagem() {
    const text = chatInput.value.trim();
    if (!text) return;
    socket.emit("chat_message", { room, author: jogador, text });
    chatInput.value = "";
  }

  chatSend.onclick = enviarMensagem;
  chatInput.onkeydown = e => { if (e.key === "Enter") enviarMensagem(); };

  socket.on("chat_message", ({ author, text }) => {
    const div = document.createElement("div");
    div.className = "chat-message";
    div.innerHTML = `<span class="author">${author}:</span> ${text}`;
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  });

  // JOGADAS
  function enviarJogada(escolha) {
    if (somClick) { somClick.currentTime = 0; somClick.play().catch(()=>{}); }
    socket.emit("jogada", { room, escolha });
    mostrarModal("Você escolheu " + escolha, "Aguardando o outro jogador...");
  }

  tesoura.onclick = () => enviarJogada("tesoura");
  papel.onclick  = () => enviarJogada("papel");
  pedra.onclick  = () => enviarJogada("pedra");

  // RESULTADO
  socket.on("resultado", e => {
    let texto = "";
    let detalhe = `J1: ${e.j1} — J2: ${e.j2}`;

    if (e.vencedor === "empate") texto = "Empate!";
    else if (e.vencedor === jogador) {
      texto = "Você venceu!";
      if (somWin) { somWin.currentTime = 0; somWin.play().catch(()=>{}); }
      vitorias++;
    } else {
      texto = "Você perdeu!";
      if (somLose) { somLose.currentTime = 0; somLose.play().catch(()=>{}); }
      derrotas++;
    }

    atualizarPlacar();
    mostrarModal(texto, detalhe);
  });

  // ATUALIZAÇÃO DA SALA
  socket.on("room_update", ({ j1, j2 }) => {
    opponentEl.textContent = (j1 && j2) ? "Adversário conectado" : "Aguardando adversário";
    enableButtons(j1 && j2);
    roomInfo.textContent = `J1: ${j1 ? "online" : "offline"} • J2: ${j2 ? "online" : "offline"}`;
  });

  // CONECTAR E ENTRAR NA SALA
  socket.on("connect", () => {
    socket.emit("join_room", { room, playerId }, resp => {
      if (!resp.ok) {
        mostrarModal("Erro", resp.error);
        return;
      }

      jogador = resp.role;
      statusEl.textContent = `Você: ${jogador.toUpperCase()}`;
      roomTag.textContent = `Sala ${room} • ${jogador.toUpperCase()}`;

      mostrarModal("Conectado", `Você é ${jogador.toUpperCase()}`);
    });
  });

  enableButtons(false);
});
