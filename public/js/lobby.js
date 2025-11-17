// lobby.js — lida com criar/entrar e redireciona para game.html?room=XXXX
const socket = io();

const btnCreate = document.getElementById("btn-create");
const btnJoin = document.getElementById("btn-join");
const inputJoin = document.getElementById("input-join");
const roomInfo = document.getElementById("room-info");

function showInfo(txt, isError = false) {
  roomInfo.textContent = txt;
  roomInfo.style.color = isError ? "#b45353" : "#374151";
}

// criar sala
btnCreate.addEventListener("click", () => {
  btnCreate.disabled = true;
  showInfo("Criando sala...");
  socket.emit("create_room", (resp) => {
    btnCreate.disabled = false;
    if (resp && resp.ok && resp.room) {
      showInfo(`Sala criada: ${resp.room}. Abrindo jogo...`);
      // redireciona para game.html com o código da sala
      setTimeout(() => {
        window.location.href = `game.html?room=${encodeURIComponent(resp.room)}`;
      }, 350);
    } else {
      showInfo("Erro ao criar sala.", true);
    }
  });
});

// entrar
btnJoin.addEventListener("click", () => {
  const code = (inputJoin.value || "").trim();
  if (!code || code.length !== 4) {
    showInfo("Digite o código de 4 dígitos da sala.", true);
    return;
  }
  btnJoin.disabled = true;
  showInfo(`Tentando entrar na sala ${code}...`);
  // Em vez de tentar entrar via socket aqui, vamos direcionar para game.html?room=code
  // A página game.html fará a conexão e o servidor atribuirá role automaticamente.
  setTimeout(() => {
    window.location.href = `game.html?room=${encodeURIComponent(code)}`;
  }, 200);
});

// permitir Enter key no input
inputJoin.addEventListener("keypress", (e) => {
  if (e.key === "Enter") btnJoin.click();
});
